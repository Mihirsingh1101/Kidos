# --- START OF FILE lecture_analysis_router.py ---
import os
import re
import json
import numpy as np
import pandas as pd
from datetime import timedelta
from fastapi import APIRouter, UploadFile, File, HTTPException
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import yake

# Assuming models.py is in the same directory
from .models import LectureAnalysisResponse, FlaggedChunk 

router = APIRouter(
    prefix="/teacher",
    tags=["Lecture Analysis"],
)

# --- CONFIGURATION & GLOBALS ---
SENTENCE_MODEL = None
DOUBT_TRANSCRIPT_PATH = "Backend/doubt_transcripts.json" # Path to student doubts
THRESHOLD_DOUBT_COUNT = 2 # Flag if a chunk has 2 or more mapped doubts
THRESHOLD_AVG_SIMILARITY = 0.65 # Flag if average similarity is > 65%

def load_sentence_model():
    """Loads the sentence transformer model once."""
    global SENTENCE_MODEL
    if SENTENCE_MODEL is None:
        try:
            SENTENCE_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"FAILED to load SentenceTransformer in lecture_analysis: {e}")
            raise
    return SENTENCE_MODEL

# ======================
# CORE ANALYSIS FUNCTIONS (Adapted from teacher_side.py)
# ======================

def timestamp_to_seconds(ts):
    """Convert hh:mm:ss string to total seconds"""
    h, m, s = map(int, ts.split(':'))
    return h * 3600 + m * 60 + s

def parse_transcript_lines(file_content: str):
    """Parse transcript text with timestamps and combine text."""
    pattern = re.compile(r"\[(\d{2}:\d{2}:\d{2})\]\s*(.*)")
    data = []

    for line in file_content.splitlines():
        m = pattern.match(line.strip())
        if m:
            ts, text = m.groups()
            data.append((timestamp_to_seconds(ts), text))
    
    if not data:
        raise ValueError("No valid timestamps found in lecture transcript.")
    return data

def determine_chunk_size(data):
    """Dynamically determine chunk size based on total lecture length."""
    total_duration = data[-1][0] - data[0][0]
    total_minutes = total_duration / 60
    
    if total_minutes <= 30: chunk_size = 2 * 60  # 2 minutes
    elif total_minutes <= 60: chunk_size = 4 * 60  # 4 minutes
    elif total_minutes <= 90: chunk_size = 5 * 60  # 5 minutes
    else: chunk_size = 6 * 60  # for very long lectures
    
    return chunk_size

def chunk_transcript(data, chunk_size):
    """Group transcript by dynamic chunk size."""
    chunks = []
    current_chunk = []
    start_time = data[0][0] # Start at the first timestamp
    chunk_index = 1

    for t, text in data:
        if t < start_time + chunk_size:
            current_chunk.append(text)
        else:
            chunks.append({
                "chunk_id": chunk_index,
                "start_time": str(timedelta(seconds=start_time)),
                "end_time": str(timedelta(seconds=start_time + chunk_size)),
                "text": " ".join(current_chunk)
            })
            chunk_index += 1
            start_time += chunk_size
            current_chunk = [text]

    # Save last chunk
    if current_chunk:
        chunks.append({
            "chunk_id": chunk_index,
            "start_time": str(timedelta(seconds=start_time)),
            "end_time": str(timedelta(seconds=start_time + chunk_size)),
            "text": " ".join(current_chunk)
        })
    return chunks

def extract_keywords(chunks, top_n=10):
    """Extract keywords using YAKE and add them to the chunk dictionary."""
    kw_extractor = yake.KeywordExtractor(top=top_n, stopwords=None)
    for chunk in chunks:
        keywords = kw_extractor.extract_keywords(chunk["text"])
        chunk["keywords"] = [kw for kw, score in keywords]
    return chunks

def load_doubts(path):
    """Load student doubts from the collected JSON file."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return []
        
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        # Assuming the data is an array of objects with a 'text' key
        doubts = [d["text"] for d in data if isinstance(d, dict) and "text" in d]
        return doubts

def map_and_summarize(chunks, doubts):
    """Map doubts to chunks, summarize, and apply flagging thresholds."""
    if not doubts or len(doubts) < 2:
        return [] # Not enough data to map/summarize

    model = load_sentence_model()

    chunk_texts = [" ".join(c["keywords"]) for c in chunks] # Compare doubt against keywords
    
    # Preprocessing for doubts (simple cleanup)
    def preprocess_doubt(text):
        return re.sub(r'[^a-zA-Z0-9\s]', '', text.lower())

    doubts_clean = [preprocess_doubt(d) for d in doubts]
    
    chunk_embeddings = model.encode(chunk_texts, show_progress_bar=False)
    doubt_embeddings = model.encode(doubts_clean, show_progress_bar=False)

    # Calculate Cosine Similarity
    similarity_matrix = cosine_similarity(doubt_embeddings, chunk_embeddings)

    # Summarization
    summary = {}
    
    # Initialize summary structure with all chunks
    for chunk in chunks:
        summary[chunk["chunk_id"]] = {
            "chunk_id": chunk["chunk_id"],
            "start_time": chunk["start_time"],
            "end_time": chunk["end_time"],
            "keywords": chunk["keywords"],
            "num_doubts": 0,
            "total_similarity": 0.0,
            "avg_similarity": 0.0
        }
    
    # Map each doubt to the best chunk and aggregate scores
    for i, doubt in enumerate(doubts):
        sims = similarity_matrix[i]
        best_idx = sims.argmax()
        best_sim = sims[best_idx]
        best_chunk_id = chunks[best_idx]["chunk_id"]

        summary[best_chunk_id]["num_doubts"] += 1
        summary[best_chunk_id]["total_similarity"] += best_sim

    # Final calculation and flagging
    flagged_chunks = []
    for item in summary.values():
        if item["num_doubts"] > 0:
            item["avg_similarity"] = item["total_similarity"] / item["num_doubts"]
        
        # --- THRESHOLD LOGIC ---
        if (item["num_doubts"] >= THRESHOLD_DOUBT_COUNT and item["avg_similarity"] >= THRESHOLD_AVG_SIMILARITY):
            flagged_chunks.append(FlaggedChunk(
                chunk_id=item["chunk_id"],
                start_time=item["start_time"],
                end_time=item["end_time"],
                num_doubts=item["num_doubts"],
                avg_similarity=round(item["avg_similarity"], 4),
                keywords=item["keywords"]
            ))

    return flagged_chunks


# ======================
# API ROUTE
# ======================
@router.post("/analyze_lecture", response_model=LectureAnalysisResponse)
async def analyze_lecture(lecture_transcript_file: UploadFile = File(..., description="Full lecture transcript with timestamps [HH:MM:SS]")):
    """
    Analyzes the lecture transcript against all collected student doubts to find and flag 
    the most confusing time segments.
    """
    try:
        # 1. Read and parse lecture transcript
        lecture_content = (await lecture_transcript_file.read()).decode('utf-8')
        transcript_data = parse_transcript_lines(lecture_content)

        # 2. Dynamic Chunking
        chunk_size = determine_chunk_size(transcript_data)
        chunks = chunk_transcript(transcript_data, chunk_size)

        # 3. Keyword Extraction (YAKE)
        chunks_with_keywords = extract_keywords(chunks)
        
        # 4. Load Student Doubts
        doubts = load_doubts(DOUBT_TRANSCRIPT_PATH)
        if not doubts or len(doubts) < 2:
            raise HTTPException(status_code=400, detail="Not enough unique student doubts collected for robust analysis. Need at least 2.")

        # 5. Mapping, Summarization, and Flagging
        flagged_chunks = map_and_summarize(chunks_with_keywords, doubts)

        # 6. Final Response
        total_duration = str(timedelta(seconds=transcript_data[-1][0] - transcript_data[0][0]))
        
        return LectureAnalysisResponse(
            total_lecture_duration=total_duration,
            flagged_chunks=flagged_chunks
        )

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Transcript Parsing Error: {ve}")
    except Exception as e:
        print(f"FATAL Lecture Analysis Error: {e}")
        raise HTTPException(status_code=500, detail="Internal analysis failure. Check server logs.")
# --- END OF FILE lecture_analysis_router.py ---