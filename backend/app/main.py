"""
FastAPI Main Application
RAG-as-a-Service API for resume analysis with citation support.
"""
import os
import uuid
import shutil
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .ingest import extract_text_blocks, chunk_text_blocks, DataBlock, PageDimensions
from .embeddings import get_embeddings, get_embedding
from .vector_store import create_collection, add_documents, query, get_collection
from .cleanup import start_scheduler, stop_scheduler, register_session, update_session_access

# Paths
TEMP_PDF_PATH = Path("temp_pdfs")


# Pydantic models
class PageDimensionResponse(BaseModel):
    """Page dimension for frontend coordinate mapping."""
    page: int
    width: float
    height: float


class UploadResponse(BaseModel):
    """Response from /upload endpoint."""
    session_id: str
    message: str
    page_count: int
    block_count: int
    page_dimensions: List[PageDimensionResponse]


class Citation(BaseModel):
    """Citation with location metadata for PDF highlighting."""
    id: int
    text: str
    page: int
    bbox: List[float]  # [x0, y0, x1, y1]


class ChatRequest(BaseModel):
    """Request body for /chat endpoint."""
    session_id: str
    query: str


class ChatResponse(BaseModel):
    """Response from /chat endpoint."""
    answer: str
    citations: List[Citation]


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    TEMP_PDF_PATH.mkdir(parents=True, exist_ok=True)
    start_scheduler()
    print("[Startup] RAG-as-a-Service started")
    
    yield
    
    # Shutdown
    stop_scheduler()
    print("[Shutdown] RAG-as-a-Service stopped")


# Create FastAPI app
app = FastAPI(
    title="RAG-as-a-Service",
    description="Resume Analysis with Verifiable Citations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "rag-as-a-service"}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF for analysis.
    
    - Extracts text blocks with bounding boxes
    - Generates embeddings using SentenceTransformer
    - Stores vectors in ChromaDB
    
    Returns session_id and page dimensions for frontend.
    
    Constraints:
    - Only PDF files accepted
    - Maximum file size: 1MB
    """
    # Constants
    MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB in bytes
    
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    # Validate content type
    if file.content_type and file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    # Read file content to check size
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size is 1MB. Your file is {file_size / (1024*1024):.2f}MB"
        )
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Save PDF temporarily
    pdf_path = TEMP_PDF_PATH / f"{session_id}.pdf"
    try:
        with open(pdf_path, "wb") as buffer:
            buffer.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save PDF: {str(e)}")
    
    try:
        # Extract text blocks with bounding boxes
        blocks, page_dims = extract_text_blocks(str(pdf_path))
        
        if not blocks:
            raise HTTPException(status_code=400, detail="No text content found in PDF")
        
        # Optionally chunk large blocks
        blocks = chunk_text_blocks(blocks)
        
        # Generate embeddings
        texts = [block.text for block in blocks]
        embeddings = get_embeddings(texts)
        
        # Create collection and store vectors
        create_collection(session_id)
        add_documents(session_id, blocks, embeddings)
        
        # Register session for cleanup tracking
        register_session(session_id, file.filename)
        
        # Format page dimensions for response
        page_dimensions = [
            PageDimensionResponse(page=page_num, width=dims.width, height=dims.height)
            for page_num, dims in sorted(page_dims.items())
        ]
        
        return UploadResponse(
            session_id=session_id,
            message="PDF processed successfully",
            page_count=len(page_dims),
            block_count=len(blocks),
            page_dimensions=page_dimensions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Cleanup on error
        if pdf_path.exists():
            pdf_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with an uploaded resume.
    
    - Retrieves relevant text chunks based on query
    - Returns answer with citation metadata for highlighting
    """
    session_id = request.session_id
    query_text = request.query.strip()
    
    if not query_text:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # Check if session exists
    collection = get_collection(session_id)
    if collection is None:
        raise HTTPException(
            status_code=404, 
            detail="Session not found. Please upload a PDF first."
        )
    
    # Update session access time
    update_session_access(session_id)
    
    # Generate query embedding
    query_embedding = get_embedding(query_text)
    
    # Retrieve relevant chunks
    results = query(session_id, query_embedding, top_k=3)
    
    if not results:
        return ChatResponse(
            answer="I couldn't find any relevant information in the resume for your query.",
            citations=[]
        )
    
    # Build answer from retrieved chunks
    # For POC: formatted summary of retrieved chunks
    # Full LLM integration can be added later
    answer_parts = []
    citations = []
    
    for i, result in enumerate(results):
        citation_id = i + 1
        text_snippet = result["text"][:200] + "..." if len(result["text"]) > 200 else result["text"]
        
        answer_parts.append(f"[{citation_id}] {text_snippet}")
        
        citations.append(Citation(
            id=citation_id,
            text=result["text"],
            page=result["page"],
            bbox=result["bbox"]
        ))
    
    # Compose answer
    answer = f"Based on the resume, I found the following relevant information:\n\n"
    answer += "\n\n".join(answer_parts)
    
    return ChatResponse(answer=answer, citations=citations)


@app.get("/api/session/{session_id}")
async def get_session_status(session_id: str):
    """Check if a session is still valid."""
    collection = get_collection(session_id)
    if collection is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    update_session_access(session_id)
    return {"session_id": session_id, "status": "active"}
