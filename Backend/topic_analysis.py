# --- START OF FILE topic_analysis.py ---
import json
import re
from collections import defaultdict
from fastapi import APIRouter, HTTPException
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer

# Assuming models.py is in the same directory
from .models import TopicAnalysisResponse 

# --- Router Setup ---
router = APIRouter(
    prefix="/analyze",
    tags=["Topic Analysis"],
)

# --- GLOBAL/CACHE for the model ---
SENTENCE_MODEL = None
TRANSCRIPT_FILENAME = "Backend/doubt_transcripts.json"

def load_sentence_model():
    """Loads the sentence transformer model once."""
    global SENTENCE_MODEL
    if SENTENCE_MODEL is None:
        print("Loading SentenceTransformer for Topic Analysis...")
        # NOTE: Consider using a lighter model for faster loading if necessary
        SENTENCE_MODEL = SentenceTransformer('all-MiniLM-L6-v2') 
        print("SentenceTransformer loaded.")
    return SENTENCE_MODEL

def analyze_transcripts():
    """Reads transcripts, clusters, and extracts topics. (The core logic from file.py)"""
    # -----------------------
    # Load JSON data
    # -----------------------
    try:
        with open(TRANSCRIPT_FILENAME, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Assuming the file is a JSON array of strings
            raw_texts = [d.get("text", "") if isinstance(d, dict) else d for d in data if d]
            if not raw_texts:
                return {"total_doubts": 0, "topics": {}, "flagged_topics": ["No valid transcripts found."]}
    except Exception:
        return {"total_doubts": 0, "topics": {}, "flagged_topics": [f"Could not read/parse {TRANSCRIPT_FILENAME}."]}

    # -----------------------
    # Preprocessing functions
    # -----------------------
    def preprocess(text):
        text = text.lower()
        text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def remove_single_char_patterns(text):
        return re.sub(r'\([A-Za-z]\)', '', text).strip()

    # -----------------------
    # Clean and Filter
    # -----------------------
    cleaned_texts = [preprocess(remove_single_char_patterns(d)) for d in raw_texts]
    cleaned_texts = [text for text in cleaned_texts if len(text.split()) > 1] # Filter out single-word entries

    if len(cleaned_texts) < 2:
        return {"total_doubts": len(raw_texts), "topics": {}, "flagged_topics": ["Not enough distinct, cleaned data for clustering."]}


    # -----------------------
    # Analysis & Clustering
    # -----------------------
    model = load_sentence_model()
    embeddings = model.encode(cleaned_texts)
    
    n_clusters = min(len(cleaned_texts) // 2 + 1, 5) 
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    labels = kmeans.fit_predict(embeddings)

    cluster_texts = defaultdict(list)
    for idx, label in enumerate(labels):
        cluster_texts[label].append(cleaned_texts[idx])

    # -----------------------
    # TF-IDF for Topic Extraction
    # -----------------------
    key_topics = {}
    vectorizer = TfidfVectorizer(stop_words='english')
    largest_cluster_label = max(cluster_texts, key=lambda k: len(cluster_texts[k]))
    
    for label, texts in cluster_texts.items():
        size = len(texts)
        if not texts or size == 0: continue
        
        X = vectorizer.fit_transform(texts)
        if len(vectorizer.get_feature_names_out()) == 0:
            top_keywords = ["general doubt area"]
        else:
            tfidf_scores = dict(zip(vectorizer.get_feature_names_out(), X.sum(axis=0).A1))
            top_keywords = sorted(tfidf_scores, key=tfidf_scores.get, reverse=True)[:3]
        
        key_topics[f"Cluster {label} ({size} doubts)"] = ", ".join(top_keywords)
    
    # -----------------------
    # Final Output
    # -----------------------
    largest_topic_key = f"Cluster {largest_cluster_label} ({len(cluster_texts[largest_cluster_label])} doubts)"
    
    output = {
        "total_doubts": len(raw_texts),
        "topics": key_topics,
        "flagged_topics": [key_topics.get(largest_topic_key, "N/A")]
    }
    return output

# --- New FastAPI Route ---
@router.post("/topics", response_model=TopicAnalysisResponse)
def get_topic_analysis():
    """
    Triggers the analysis of recorded student doubt transcripts, 
    clusters them, and returns the key focus areas.
    """
    result = analyze_transcripts()
    
    # Check if the error came from file/data issues
    if result.get("total_doubts") == 0 and "not enough" not in result.get("flagged_topics", [""])[0].lower():
         raise HTTPException(status_code=400, detail=result["flagged_topics"][0])

    return result
# --- END OF FILE topic_analysis.py ---