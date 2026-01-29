"""
Embeddings Module
Provides local CPU-based embeddings using SentenceTransformer.
"""
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

# Global model instance - loaded once at module import
_model: SentenceTransformer = None


def get_model() -> SentenceTransformer:
    """
    Get or initialize the SentenceTransformer model.
    Uses lazy loading to avoid loading during import.
    """
    global _model
    if _model is None:
        # Using all-MiniLM-L6-v2 for fast CPU inference
        # 384-dimensional embeddings, good balance of speed and quality
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of texts.
    
    Args:
        texts: List of text strings to embed
        
    Returns:
        List of embedding vectors (each is a list of floats)
    """
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for a single text string.
    
    Args:
        text: Text string to embed
        
    Returns:
        Embedding vector as a list of floats
    """
    model = get_model()
    embedding = model.encode([text], convert_to_numpy=True)[0]
    return embedding.tolist()


def compute_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Compute cosine similarity between two embeddings.
    
    Args:
        embedding1: First embedding vector
        embedding2: Second embedding vector
        
    Returns:
        Cosine similarity score (0 to 1)
    """
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(dot_product / (norm1 * norm2))
