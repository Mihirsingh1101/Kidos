# --- START OF FILE fer_router.py ---
import io
import time
import torch
import torch.nn as nn
from fastapi import APIRouter, UploadFile, File, HTTPException
from torchvision import transforms
from torchvision.models import mobilenet_v2
from PIL import Image

from .models import Prediction 

router = APIRouter(
    prefix="/predict",
    tags=["Facial Engagement"],
)

# --- GLOBALS (Model Definition and State) ---
MODELS = {} 
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATHS = { "face_emotion": "Backend/fer13_mnetv2_binary.pt" }

# Model Definition (Kept here for module self-containment)
class TinyImgClassifier(nn.Module):
    def __init__(self, num_classes=2, embed_dim=1280, pretrained=True):
        # ... (Same as before)
        super().__init__()
        try: base = mobilenet_v2(weights="IMAGENET1K_V1" if pretrained else None)
        except TypeError: base = mobilenet_v2(pretrained=pretrained)
        self.backbone = base.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.head = nn.Sequential(nn.Dropout(0.2), nn.Linear(embed_dim, num_classes))
    def forward(self, x):
        f = self.backbone(x); f = self.pool(f).flatten(1); return self.head(f)

TRANSFORM = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),   
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
])

def load_fer_models():
    """Loads FER models during application startup."""
    for name, path in MODEL_PATHS.items():
        try:
            model = TinyImgClassifier(num_classes=2, pretrained=False) 
            state_dict = torch.load(path, map_location=DEVICE) 
            model.load_state_dict(state_dict)
            model.to(DEVICE)
            model.eval()
            MODELS[name] = model
            print(f"✅ FER Router: Loaded model '{name}' on {DEVICE}")
        except Exception as e:
            print(f"❌ FER Router: Failed to load {name}: {e}")
            MODELS[name] = None 

# --- Prediction Route ---
@router.post("/{model_name}", response_model=Prediction)
async def predict(model_name: str, file: UploadFile = File(...)):
    if model_name not in MODELS or MODELS[model_name] is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found or failed to load.")

    model = MODELS[model_name]

    try:
        image_bytes = await file.read()
        image_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_t = TRANSFORM(image_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            output = model(img_t)
            probs = torch.softmax(output, dim=1).cpu().numpy()[0]

        label = "engaged" if probs[1] >= 0.5 else "not_engaged"
        confidence_score = float(probs[1]) 

        return Prediction(
            probs=probs.tolist(),
            label=label,
            confidence=confidence_score,
            timestamp=time.time(),
        )
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed due to an internal error: {e}")
# --- END OF FILE fer_router.py ---