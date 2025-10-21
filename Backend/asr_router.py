# --- START OF FILE asr_router.py (UPDATED with JSON APPEND) ---
import os
import tempfile
import torch
import json # NEW IMPORT
from datetime import datetime # NEW IMPORT
from fastapi import APIRouter, UploadFile, File, HTTPException
from transformers import pipeline

from .models import ASRResponse 

router = APIRouter(
    prefix="/asr",
    tags=["Speech Recognition"],
)

# --- GLOBAL/CACHE and Configuration ---
ASR_MODEL = None
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "openai/whisper-base"
TRANSCRIPT_FILENAME = "Backend/doubt_transcripts.json" # Use the corrected path

def load_asr_model():
    # ... (Keep load_asr_model function as is)
    global ASR_MODEL
    if ASR_MODEL is None:
        print("Loading Whisper ASR Pipeline...")
        try:
            ASR_MODEL = pipeline(
                "automatic-speech-recognition",
                model=MODEL_NAME,
                device=DEVICE
            )
            print("Whisper ASR loaded successfully.")
        except Exception as e:
            print(f"FAILED to load Whisper ASR: {e}")
    return ASR_MODEL

# --- NEW HELPER FUNCTION TO APPEND TO JSON FILE ---
def append_transcript_to_json(transcript_text: str):
    """
    Safely reads the JSON file, appends the new transcript object, and writes back.
    This function handles the file-locking and parsing required for web backends.
    """
    try:
        # 1. Read existing data (or initialize to empty list if file is empty/non-existent)
        if os.path.exists(TRANSCRIPT_FILENAME) and os.path.getsize(TRANSCRIPT_FILENAME) > 0:
            with open(TRANSCRIPT_FILENAME, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = []

        # Ensure data is a list (to prevent crashing if file was corrupted)
        if not isinstance(data, list):
            print(f"WARN: {TRANSCRIPT_FILENAME} content was not a list. Resetting file.")
            data = []

        # 2. Append the new entry
        new_entry = {
            "text": transcript_text,
            "timestamp": datetime.now().isoformat(),
        }
        data.append(new_entry)

        # 3. Write back the full list
        with open(TRANSCRIPT_FILENAME, 'w', encoding='utf-8') as f:
            # Use indent for readability
            json.dump(data, f, indent=4, ensure_ascii=False) 
        
        print(f"✅ Transcript appended to {TRANSCRIPT_FILENAME}")

    except Exception as e:
        print(f"FATAL ERROR: Could not append transcript to JSON file: {e}")
# --- END NEW HELPER FUNCTION ---


@router.post("/transcribe", response_model=ASRResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes and translates an uploaded audio file (e.g., from browser mic)."""
    asr_pipeline = load_asr_model()
    if asr_pipeline is None:
        raise HTTPException(status_code=503, detail="ASR Model not loaded or failed initialization.")
    
    # Read and save the uploaded file to a temporary location
    try:
        audio_data = await file.read()
        # Ensure we use a unique temporary filename
        with tempfile.NamedTemporaryFile(suffix=f".wav", delete=False) as temp_file: 
            temp_file.write(audio_data)
            temp_filename = temp_file.name
        
        # Use the pipeline to transcribe and translate
        result = asr_pipeline(
            temp_filename, 
            generate_kwargs={"task": "translate", "language": "english"}
        )
        
        transcript = result.get("text", "").strip()
        os.remove(temp_filename) # Clean up the temporary file
        
        if not transcript:
             raise HTTPException(status_code=400, detail="Could not detect speech or failed translation.")

        # --- CRITICAL: Append transcript to file ---
        append_transcript_to_json(transcript)
        # ------------------------------------------

        return ASRResponse(transcript=transcript)

    except Exception as e:
        print(f"ASR Error: {e}")
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
# --- END OF FILE asr_router.py (UPDATED) ---