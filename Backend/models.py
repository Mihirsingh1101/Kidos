# --- START OF FILE models.py ---
from pydantic import BaseModel
from typing import List, Dict

# Model for Facial Engagement Prediction
class Prediction(BaseModel):
    probs: List[float]
    label: str
    confidence: float
    timestamp: float

# Model for Topic Analysis Response
class TopicAnalysisResponse(BaseModel):
    total_doubts: int
    topics: Dict[str, str]
    flagged_topics: List[str]

# Model for ASR/Transcription Response (The output of the speech router)
class ASRResponse(BaseModel):
    language: str = "English"
    transcript: str
    is_translation: bool = True

# Model for the Teacher-Side Lecture Analysis Output
class FlaggedChunk(BaseModel):
    chunk_id: int
    start_time: str
    end_time: str
    num_doubts: int
    avg_similarity: float
    keywords: List[str] # The keywords from the lecture chunk

class LectureAnalysisResponse(BaseModel):
    total_lecture_duration: str
    flagged_chunks: List[FlaggedChunk]
# --- END OF FILE models.py ---