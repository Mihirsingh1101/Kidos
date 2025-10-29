# --- START OF FILE main.py (Final Clean Hub) ---
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- Import ALL Routers and Loaders ---
from .fer_router import router as fer_router, load_fer_models
from .asr_router import router as asr_router, load_asr_model
from .topic_analysis import router as topic_router, load_sentence_model 
from .lecture_analysis_router import router as lecture_router 

# ---------------- Lifespan Event Handler ---------------- #
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Simultaneously loads all required models during startup.
    """
    print("--- STARTUP: Loading Multimodal Models ---")
    
    # Load all models concurrently (or sequentially, if resources are tight)
    load_fer_models()       # Load Facial Engagement Model (PyTorch)
    load_asr_model()        # Load ASR/Translation Model (Whisper/HuggingFace)
    load_sentence_model()   # Load Topic Analysis Embedder (SentenceTransformer)
    
    print("--- STARTUP COMPLETE ---")
    
    yield # Application starts serving requests

    print("Application shutting down...")


# ---------------- App Instantiation ---------------- #
app = FastAPI(title="Multimodal Classroom Monitor", lifespan=lifespan)

# --- Mount ALL Routers ---
app.include_router(fer_router)       # Routes: /predict/{model_name}
app.include_router(asr_router)      # Routes: /asr/transcribe
app.include_router(topic_router)    # Routes: /analyze/topics
app.include_router(lecture_router)

# CORS configuration
origins = [ "http://localhost:3000", "http://127.0.0.1:3000" ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Routes (Health Check) ---------------- #
@app.get("/health")
def health():
    return {
        "status": "ok",
        "message": "All routers loaded.",
        "routes": ["/predict/{model_name}", "/asr/transcribe", "/analyze/topics"]
    }
# --- END OF FILE main.py (Final Clean Hub) ---