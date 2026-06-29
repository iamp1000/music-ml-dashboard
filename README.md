<div align="center">
  <img src="assets/hero_banner.png" alt="Affective Music Intelligence Dashboard" width="100%" style="border-radius:15px; margin-bottom:20px;"/>

  <h1>🎵 Affective Music Intelligence</h1>
  
  <p>
    <strong>A high-performance, full-stack application that analyzes your music listening history using offline PyTorch Machine Learning and the Gemini API to visualize your auditory emotional journey.</strong>
  </p>

  <p>
    <a href="#-features"><strong>Features</strong></a> ·
    <a href="#-tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#-quick-start"><strong>Quick Start</strong></a> ·
    <a href="#-contributing"><strong>Contributing</strong></a>
  </p>

  <p>
    <strong>Live Demo:</strong> <a href="https://iamp1000.github.io/music-ml-dashboard/">https://iamp1000.github.io/music-ml-dashboard/</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next JS"/>
    <img src="https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white" alt="PyTorch"/>
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
    <img src="https://img.shields.io/badge/TiDB-%23351C75.svg?style=for-the-badge&logo=tidb&logoColor=white" alt="TiDB"/>
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  </p>
</div>

---

## 🎯 Our Goal (And How We Built It For $0)

The ultimate goal of this project is to create an enterprise-grade music analytics platform that feels like magic—all without spending a dime (yet). We managed to make it live with **0 cost for now** by utilizing a creative hybrid architecture:

- 🗄️ **Free-Tier Database**: Leveraging TiDB Serverless for zero-cost distributed SQL.
- ☁️ **Free-Tier Backend**: Hosting the FastAPI backend on free cloud tiers (like Render).
- 💻 **Local Heavy Lifting**: Offloading the insanely expensive GPU inference (PyTorch Mel-Spectrograms, Madmom) completely to local hardware via our custom ML Worker.

**The Future 🔮**: In the future, once we secure funding, we aim to migrate the ML engine to the cloud for real-time, zero-configuration processing.

## 😅 A Note from the Creator

As a newer developer, this project serves as a sandbox for learning full-stack development, ML, and production deployment. Please feel free to call out mistakes, submit issues, or laugh at stray `console.log` statements. Your feedback and contributions are highly valued!

---

## ✨ Features

- 🧠 **Offline ML Audio Analysis**: Extracts **Mel-Spectrograms**, **BPM**, and **Rhythm Regularity** locally using `PyTorch` and `Madmom` RNNs.
- ⚡ **Multi-Threaded Worker**: Utilizes `asyncio` and custom ThreadPools to maximize CPU/GPU throughput for batch analysis.
- 🤖 **Gemini API Integration**: Analyzes deep semantic themes, musical valence, and arousal via `google-genai` to score mood.
- 📊 **Cinematic Dashboard**: A premium Next.js frontend built with TailwindCSS, featuring glassmorphism, Recharts graphs, and custom typography to visualize your mood trends.
- 🗄️ **Distributed Database**: Powered by TiDB (Cloud MySQL) with Prisma ORM for high-availability synchronization.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| ------ | ------------ |
| **Frontend** | React, Next.js (App Router), TailwindCSS, Recharts, Framer Motion |
| **Backend** | Python, FastAPI, SQLAlchemy, Uvicorn |
| **ML Engine** | PyTorch, Torchaudio, Librosa, Madmom, yt-dlp, Google GenAI |
| **Database** | TiDB Cloud, MySQL, Prisma ORM |

---

## 🚀 Quick Start

Due to the full-stack nature of this application, running it locally requires initializing three separate environments.

### Prerequisites

Ensure you have the following installed:
- Node.js (v18+)
- Python (v3.10+)
- [uv](https://github.com/astral-sh/uv) for fast Python dependency resolution

### 1. Database & Backend (FastAPI)

Navigate to the `backend` directory and set up your Python environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> **Note:** Create a `.env` file in the `backend` directory containing your TiDB credentials (`DATABASE_URL`).

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

### 2. Machine Learning Engine

In a new terminal, navigate to the `ml_engine` directory. We use `uv` for fast dependency resolution due to large ML binaries:

```bash
cd ml_engine
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

> **Note:** Create a `.env` file here with your `GEMINI_API_KEY` and `CLOUD_API_URL`.

Start the background ML worker:

```bash
uv run local_worker.py
```

### 3. Frontend (Next.js)

In a third terminal, start the UI:

```bash
cd frontend
npm install
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to view the dashboard!

---

## 📂 Project Structure

```text
.
├── backend/            # FastAPI backend, Prisma/SQLAlchemy models, routes
├── frontend/           # Next.js application, React components, Tailwind styles
├── ml_engine/          # Offline PyTorch & Madmom workers, audio processing
└── assets/             # Images, documentation resources
```

---

## 🤝 Contributing

We are currently looking for open-source contributors! Whether you are a Junior Developer looking for your first PR, or a Senior ML Engineer, there is a place for you here.

Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on how to get started.

<div align="center">
  <br/>
  <i>Built with ❤️ for Music & Data Lovers</i>
</div>
