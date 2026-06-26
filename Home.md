<div align="center">
  <img src="https://raw.githubusercontent.com/iamp1000/music-ml-dashboard/main/frontend/public/favicon.ico" width="100" />
  <h1>Welcome to the music-ml-dashboard wiki!</h1>
  <p><strong>Advanced ML-powered analytics for your listening history.</strong></p>
</div>

---

Wikis provide a place in your repository to lay out the roadmap of your project, show the current status, and document software better, together.

## 🌟 Overview

The **Music ML Dashboard** is a full-stack application that transforms your Spotify listening history into deep, actionable insights. By leveraging heavy ML models locally (PyTorch, Madmom, Librosa) and a fast Next.js React frontend, it provides unprecedented analysis of your musical tastes, moods, and rhythmic preferences over time.

### 🚀 Roadmap
- [x] **Phase 1:** Core ML Pipeline (Genre, Mood, BPM Extraction)
- [x] **Phase 2:** Local Worker & Polling Architecture
- [x] **Phase 3:** React Dashboard with Custom Visualizations (D3.js & Recharts)
- [x] **Phase 4:** 3D Mood Analytics & Advanced Timeline
- [ ] **Phase 5:** Cloud Deployment & CI/CD
- [ ] **Phase 6:** Multi-user Support & Authentication

## 📊 Current Status

The project is currently in **Beta (Phase 4 completed)**. 

### Recent Achievements:
- Transitioned to an asynchronous batch-processing architecture capable of analyzing 30 songs concurrently.
- Integrated robust fallback mechanisms (SoundCloud parsing) for audio extraction.
- Developed the `EmotionalScatterPlot` (Valence vs Arousal) and grouped Activity Timelines.

## 🛠️ Software Documentation

### Machine Learning Engine (`/ml_engine`)
A Python-based asynchronous worker that handles heavy inference.
- **Beat & Rhythm:** Uses `madmom` for precise onset detection and BPM calculation.
- **Mood Analysis:** A custom PyTorch Mel-Spectrogram classifier scoring tracks on Valence and Arousal.
- **Genre Classification:** Built with `librosa` and `scikit-learn`.

### Full-Stack Dashboard (`/frontend` & `/backend`)
- **Frontend:** Next.js with Tailwind CSS and customized Recharts + D3.js data visualizations.
- **Backend API:** FastAPI application providing streaming updates, ML job polling, and data aggregation.

---

> _"Document software better, together."_
