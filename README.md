# RAG-as-a-Service: The Verifiable Resume Analyst

A split-screen web application for uploading and chatting with PDF resumes. Features **interactive citations** - clicking a citation scrolls the PDF viewer and highlights the exact source location.

![Resume Analyst](https://img.shields.io/badge/RAG-as--a--Service-6366f1?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)
![ARM64](https://img.shields.io/badge/ARM64-Compatible-green?style=for-the-badge)

## ✨ Features

- **📄 PDF Upload & Parsing** - Extract text with bounding box coordinates using PyMuPDF
- **🔍 Semantic Search** - Local embeddings with SentenceTransformer (all-MiniLM-L6-v2)
- **💬 Chat Interface** - Ask questions about the resume with citation markers
- **📍 Verifiable Citations** - Click citations to highlight exact source in PDF
- **🌙 Dark/Light Mode** - Theme toggle with system preference detection
- **🧹 Auto Cleanup** - Sessions expire after 30 minutes to save resources

## 🏗️ Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   React + Vite   │────▶│  Caddy (Reverse   │────▶│    FastAPI      │
│   TailwindCSS    │     │     Proxy)        │     │    Backend      │
└──────────────────┘     └───────────────────┘     └─────────────────┘
                                                           │
                                           ┌───────────────┼───────────────┐
                                           ▼               ▼               ▼
                                    ┌───────────┐  ┌────────────┐  ┌────────────┐
                                    │  ChromaDB │  │ Sentence   │  │   PyMuPDF  │
                                    │  Vectors  │  │ Transformer│  │   (fitz)   │
                                    └───────────┘  └────────────┘  └────────────┘
```

## 🚀 Quick Start

### Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Access at http://localhost
```

### Production (Oracle Cloud)

1. Update `Caddyfile` with your domain
2. Set up DNS to point to your instance
3. Run `docker-compose up -d`

## 📁 Project Structure

```
rag-as-a-service/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI endpoints
│   │   ├── ingest.py        # PDF text + bbox extraction
│   │   ├── embeddings.py    # SentenceTransformer wrapper
│   │   ├── vector_store.py  # ChromaDB operations
│   │   └── cleanup.py       # Session cleanup cron
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── UploadDropzone.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── PdfViewer.tsx
│   │   ├── App.tsx
│   │   └── types/index.ts
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── Caddyfile
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/upload` | POST | Upload PDF, returns session_id |
| `/api/chat` | POST | Query with citations |
| `/api/session/{id}` | GET | Check session status |

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_EXPIRY_MINUTES` | 30 | Session expiration time |
| `CHROMA_DB_PATH` | /app/chroma_db | Vector database path |

## 📝 License

MIT
