# Multimodal Classroom Engagement Monitor

This project is an intelligent classroom assistant designed to provide teachers with real-time feedback on student engagement (via facial analysis) and identify complex topics students are struggling with (via speech analysis and clustering). The system leverages a robust, scalable architecture using FastAPI for the machine learning backend and React for the live, interactive frontend.

## 🌟 Features

| Feature | Technology | Functionality |
| :--- | :--- | :--- |
| **Facial Engagement (FER)** | PyTorch, MobileNetV2 | Real-time analysis of facial expressions to predict student engagement levels (Engaged/Not Engaged). |
| **Speech-to-Topic (ASR)** | HuggingFace Whisper, FFmpeg | Transcribes and translates recorded student doubts (including Hinglish) into English text. |
| **Doubt Topic Analysis** | Sentence-Transformers, K-Means, TF-IDF | Clusters collected student transcripts to identify 3-5 primary areas of struggle and flags the single most common topic. |
| **Concurrent Operation** | FastAPI `lifespan` | All models are loaded into memory simultaneously at startup, ensuring low-latency responses for all real-time API calls. |

## 🏗️ Architecture

The project is structured as a decoupled application to ensure scalability and maintainability.

| Layer | Technology | Key Components |
| :--- | :--- | :--- |
| **Frontend** | React, Axios | `App.js` (State Hub), `CameraCard.jsx`, `SpeechAnalysis.jsx`, `TopicCard.jsx`. |
| **Backend/API** | FastAPI, Uvicorn | `main.py` (App Init/Startup), `models.py` (Pydantic Schemas). |
| **ML/Logic** | PyTorch, HuggingFace, Scikit-learn | **Routers:** `fer_router.py`, `asr_router.py`, `topic_analysis.py`. |

## ⚙️ Prerequisites

Before starting, ensure you have the following installed and configured:

1.  **Python 3.10+** (Recommended)
2.  **Node.js & npm** (for the React frontend)
3.  **FFmpeg:** **[CRUCIAL]** FFmpeg must be installed and the path to its executable added to your system's **PATH environment variable** for the ASR model to process audio files.
4.  **Model Weights:** The PyTorch weights file must be placed in the correct location: `Backend/fer13_mnetv2_binary.pt`.

## 🚀 Installation & Setup

Navigate to the project's root directory (`/kidos`).

### 1. Backend Setup (Python)

1.  Navigate into the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Install all Python dependencies:
    ```bash
    pip install fastapi uvicorn[standard] python-multipart torch torchvision numpy pillow transformers sentence-transformers scikit-learn pydub scipy
    ```
3.  **Create Data File:** Ensure the data file exists inside the `Backend` folder, even if empty:
    ```bash
    echo [] > doubt_transcripts.json
    ```
4.  Return to the project root for the final run command:
    ```bash
    cd ..
    ```

### 2. Frontend Setup (React)

1.  Navigate to your React application directory (usually the project root).
2.  Install dependencies:
    ```bash
    npm install
    ```

## ▶️ Usage

Open **two separate terminal windows** from the project's root directory (`/kidos`).

### 1. Start the Backend Server (ML/API)

Run this command from the project root (`/kidos`) to correctly load the package structure and all models:

```bash
uvicorn Backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the React app

Run this command from the project root (`/kidos`) to correctly load the package structure and all models:

```bash
npm start
```

## you can check the model on the frontend
