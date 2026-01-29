"""
Vector Store Module
ChromaDB operations for storing and querying document embeddings.
"""
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
from pathlib import Path

from .ingest import DataBlock

# ChromaDB client - persistent storage
_client: chromadb.PersistentClient = None

# Default storage path
CHROMA_DB_PATH = "/app/chroma_db"


def get_client(persist_directory: str = None) -> chromadb.PersistentClient:
    """
    Get or initialize the ChromaDB client with persistent storage.
    
    Args:
        persist_directory: Optional custom path for database storage
        
    Returns:
        ChromaDB PersistentClient instance
    """
    global _client
    if _client is None:
        db_path = persist_directory or CHROMA_DB_PATH
        Path(db_path).mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(anonymized_telemetry=False)
        )
    return _client


def create_collection(session_id: str) -> chromadb.Collection:
    """
    Create a new collection for a session.
    Uses session_id as collection name for user isolation.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        ChromaDB Collection instance
    """
    client = get_client()
    collection_name = f"session_{session_id}"
    
    # Delete if exists (for re-uploads)
    try:
        client.delete_collection(collection_name)
    except ValueError:
        pass
    
    return client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}  # Use cosine similarity
    )


def get_collection(session_id: str) -> Optional[chromadb.Collection]:
    """
    Get an existing collection for a session.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        ChromaDB Collection instance or None if not found
    """
    client = get_client()
    collection_name = f"session_{session_id}"
    
    try:
        return client.get_collection(collection_name)
    except ValueError:
        return None


def add_documents(
    session_id: str,
    blocks: List[DataBlock],
    embeddings: List[List[float]]
) -> None:
    """
    Add documents with embeddings to a session's collection.
    
    Args:
        session_id: Unique session identifier
        blocks: List of DataBlock objects containing text and metadata
        embeddings: List of embedding vectors corresponding to blocks
    """
    collection = get_collection(session_id)
    if collection is None:
        collection = create_collection(session_id)
    
    # Prepare data for ChromaDB
    ids = [f"block_{i}" for i in range(len(blocks))]
    documents = [block.text for block in blocks]
    metadatas = [
        {
            "page": block.page,
            "bbox_x0": block.bbox[0],
            "bbox_y0": block.bbox[1],
            "bbox_x1": block.bbox[2],
            "bbox_y1": block.bbox[3],
            "text": block.text[:500]  # Store truncated text in metadata
        }
        for block in blocks
    ]
    
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )


def query(
    session_id: str,
    query_embedding: List[float],
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Query the collection for similar documents.
    
    Args:
        session_id: Unique session identifier
        query_embedding: Embedding vector for the query
        top_k: Number of results to return
        
    Returns:
        List of dictionaries containing matched documents with metadata
    """
    collection = get_collection(session_id)
    if collection is None:
        return []
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    # Format results
    formatted_results = []
    if results and results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            formatted_results.append({
                "id": i + 1,  # 1-indexed for citations
                "text": results["documents"][0][i] if results["documents"] else "",
                "page": metadata.get("page", 1),
                "bbox": [
                    metadata.get("bbox_x0", 0),
                    metadata.get("bbox_y0", 0),
                    metadata.get("bbox_x1", 0),
                    metadata.get("bbox_y1", 0)
                ],
                "distance": results["distances"][0][i] if results["distances"] else 0
            })
    
    return formatted_results


def delete_collection(session_id: str) -> bool:
    """
    Delete a session's collection.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        True if deleted successfully, False otherwise
    """
    client = get_client()
    collection_name = f"session_{session_id}"
    
    try:
        client.delete_collection(collection_name)
        return True
    except ValueError:
        return False


def list_collections() -> List[str]:
    """
    List all session collections.
    
    Returns:
        List of collection names (session IDs)
    """
    client = get_client()
    collections = client.list_collections()
    return [col.name for col in collections]
