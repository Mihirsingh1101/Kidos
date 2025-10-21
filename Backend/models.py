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
# --- END OF FILE models.py ---