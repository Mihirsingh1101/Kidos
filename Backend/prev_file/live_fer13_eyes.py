#!/usr/bin/env python3
# live_fer13_eyes.py
# Live FER-2013 binary engagement + MediaPipe eye-closure override

import argparse, os, sys, time
import cv2, numpy as np, torch, torch.nn as nn
from torchvision import transforms
from torchvision.models import mobilenet_v2
from collections import deque

# ---------------- Model ----------------
class TinyImgClassifier(nn.Module):
    def __init__(self, num_classes=2, embed_dim=1280, pretrained=True):
        super().__init__()
        try: base = mobilenet_v2(weights="IMAGENET1K_V1" if pretrained else None)
        except TypeError: base = mobilenet_v2(pretrained=pretrained)
        self.backbone = base.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.head = nn.Sequential(nn.Dropout(0.2), nn.Linear(embed_dim, num_classes))
    def forward(self, x):
        f = self.backbone(x); f = self.pool(f).flatten(1); return self.head(f)

# -------------- Transforms --------------
def build_tfs(size=224):
    return transforms.Compose([
        transforms.ToPILImage(),
        transforms.Grayscale(num_output_channels=3),   # FER is grayscale
        transforms.Resize((size,size)),
        transforms.ToTensor(),
        transforms.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5]),
    ])

def softmax_np(z, temp=1.0):
    z = z/max(temp,1e-6); z -= np.max(z); e = np.exp(z); return e/e.sum()

def ema(prev, cur, a=0.9): return cur if prev is None else a*cur + (1-a)*prev

# -------------- Face crop (optional) --------------
def try_haar():
    try: return cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    except Exception: return None

def face_crop(bgr, face, pad=0.15):
    if face is None: return bgr
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    faces = face.detectMultiScale(gray,1.1,3,minSize=(60,60))
    if len(faces)==0: return bgr
    x,y,w,h = max(faces, key=lambda b:b[2]*b[3])
    p=int(pad*max(w,h)); x0,y0=max(0,x-p),max(0,y-p)
    x1,y1=min(bgr.shape[1],x+w+p),min(bgr.shape[0],y+h+p)
    return bgr[y0:y1,x0:x1]

# -------------- MediaPipe Eye Openness --------------
class EyeOpenness:
    """
    Uses MediaPipe Face Mesh to compute a simple eye "open ratio".
    If both eyes' ratios < threshold for N consecutive frames => "eyes_closed" True.
    """
    def __init__(self, eye_open_thresh=0.22, consec_needed=3):
        import mediapipe as mp
        self.mp = mp
        self.mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1, refine_landmarks=True,
            min_detection_confidence=0.5, min_tracking_confidence=0.5
        )
        self.eye_open_thresh = eye_open_thresh
        self.consec_needed = consec_needed
        self.closed_count = 0

    # indices: [outer, upper, inner, lower, upper2, lower2]
    L = [33, 159, 133, 145, 158, 153]
    R = [263, 386, 362, 374, 385, 380]

    def _eye_ratio(self, lms, idxs):
        pts = np.array([(lms[i].x, lms[i].y) for i in idxs], dtype=np.float32)
        v = (np.linalg.norm(pts[1]-pts[3]) + np.linalg.norm(pts[4]-pts[5]))/2.0  # vertical avg
        h = np.linalg.norm(pts[0]-pts[2]) + 1e-6                                 # horizontal
        return float(v/h)

    def check(self, bgr):
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        res = self.mesh.process(rgb)
        if not res.multi_face_landmarks:
            # no face: decay counter slowly, don't force closed
            self.closed_count = max(0, self.closed_count-1)
            return False, 0.0, 0.0, False

        lms = res.multi_face_landmarks[0].landmark
        le = self._eye_ratio(lms, self.L)
        re = self._eye_ratio(lms, self.R)
        both_closed = (le < self.eye_open_thresh) and (re < self.eye_open_thresh)

        if both_closed:
            self.closed_count += 1
        else:
            self.closed_count = max(0, self.closed_count-1)

        override = self.closed_count >= self.consec_needed
        return override, le, re, True

# ----------------- Main -----------------
def main():
    ap = argparse.ArgumentParser("Live FER-2013 Engagement + Eye override")
    ap.add_argument("--weights", default="fer13_mnetv2_binary.pt")
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--size", type=int, default=224)
    ap.add_argument("--ema", type=float, default=0.9)
    ap.add_argument("--temp", type=float, default=1.0)
    ap.add_argument("--on_thresh", type=float, default=0.65)
    ap.add_argument("--off_thresh", type=float, default=0.45)
    ap.add_argument("--min_hold", type=float, default=0.8)
    ap.add_argument("--no_face", action="store_true")
    # MediaPipe eyes
    ap.add_argument("--eye_thresh", type=float, default=0.22, help="Lower => stricter closed detection")
    ap.add_argument("--eye_consec", type=int, default=3, help="Frames of closed eyes required")
    ap.add_argument("--title", default="Live Engagement (FER-2013 + Eyes)")
    ap.add_argument("--show_fps", action="store_true")
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = TinyImgClassifier(num_classes=2, pretrained=True).to(device)

    have = False
    if os.path.isfile(args.weights):
        try:
            model.load_state_dict(torch.load(args.weights, map_location=device)); have=True
            print(f"[OK] loaded {args.weights}")
        except Exception as e:
            print(f"[WARN] failed to load weights ({e}); using dummy outputs.")
    else:
        print(f"[WARN] weights not found: {args.weights}; using dummy outputs.")

    model.eval()
    tfs = build_tfs(args.size)
    face = None if args.no_face else try_haar()

    # MediaPipe eyes
    try:
        eye = EyeOpenness(eye_open_thresh=args.eye_thresh, consec_needed=args.eye_consec)
        eye_ok = True
    except Exception as e:
        print(f"[WARN] MediaPipe not available ({e}). Eye override disabled.")
        eye_ok = False
        eye = None

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened(): print("[ERR] camera unavailable"); sys.exit(1)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,640); cap.set(cv2.CAP_PROP_FRAME_HEIGHT,480)

    probs_ema=None; prev_time=time.time(); fps=0.0
    state=0  # 0=NOT ENGAGED, 1=ENGAGED
    last_switch=time.time()

    print("[INFO] ESC to quit.")
    while True:
        ok, frame = cap.read()
        if not ok: break
        now=time.time(); dt=now-prev_time; prev_time=now
        fps = 0.9*fps + 0.1*(1.0/dt) if dt>0 else fps

        # optional face crop for the classifier (eye detector uses full frame)
        roi = frame if face is None else face_crop(frame, face)
        rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
        x = tfs(rgb).unsqueeze(0).to(device)

        # classifier
        with torch.no_grad():
            if have:
                logits = model(x).detach().cpu().numpy()[0]
                p = softmax_np(logits, temp=args.temp)  # [p_not, p_eng]
            else:
                r=np.random.rand(2).astype(np.float32); p=r/r.sum()

        probs_ema = ema(probs_ema, p, a=args.ema)
        p_show = probs_ema if probs_ema is not None else p
        p_eng = float(p_show[1])

        # MediaPipe eye-closure override
        eyes_closed = False
        le = re = 0.0
        if eye_ok:
            eyes_closed, le, re, face_found = eye.check(frame)
            if eyes_closed:
                # hard override: force not engaged
                p_eng = 0.02
                p_show = np.array([0.98, 0.02], dtype=np.float32)

        # Hysteresis (use possibly overridden p_eng)
        if state==0 and p_eng>=args.on_thresh and (now-last_switch)>=args.min_hold:
            state=1; last_switch=now
        elif state==1 and p_eng<=args.off_thresh and (now-last_switch)>=args.min_hold:
            state=0; last_switch=now

        # ---- UI ----
        txt = f"{'ENGAGED' if state==1 else 'NOT ENGAGED'}  (p_eng={p_eng:.2f})"
        col = (0,200,0) if state==1 else (0,0,255)
        cv2.putText(frame, txt, (20,40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, col, 2, cv2.LINE_AA)

        # Probability bars
        names=["not engaged","engaged"]; bar_w,bar_h,gap=220,16,8; x0,y0=20,70
        for i,name in enumerate(names):
            w=int(bar_w*float(p_show[i]))
            cv2.rectangle(frame,(x0,y0+i*(bar_h+gap)),(x0+bar_w,y0+bar_h+i*(bar_h+gap)),(70,70,70),1)
            cv2.rectangle(frame,(x0,y0+i*(bar_h+gap)),(x0+w,y0+bar_h+i*(bar_h+gap)),
                          (80,220,80) if i==1 else (80,150,240),-1)
            cv2.putText(frame,f"{name:12s} {p_show[i]:.2f}",
                        (x0+bar_w+12,y0+bar_h-2+i*(bar_h+gap)),
                        cv2.FONT_HERSHEY_PLAIN,1.1,(220,220,220),1,cv2.LINE_AA)

        # Eye diagnostics (top-right)
        if eye_ok:
            cv2.putText(frame, f"eye L:{le:.2f} R:{re:.2f} {'CLOSED' if eyes_closed else ''}",
                        (frame.shape[1]-320, 28), cv2.FONT_HERSHEY_PLAIN, 1.1, (180,180,180), 1, cv2.LINE_AA)

        if args.show_fps:
            cv2.putText(frame, f"FPS {fps:.1f}", (frame.shape[1]-120, 52),
                        cv2.FONT_HERSHEY_PLAIN, 1.2, (200,200,0), 2, cv2.LINE_AA)

        cv2.imshow(args.title, frame)
        if (cv2.waitKey(1)&0xFF)==27: break

    cap.release(); cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
