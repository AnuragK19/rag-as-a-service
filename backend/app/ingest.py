"""
PDF Ingestion Module
Extracts text blocks with bounding boxes from PDF files using PyMuPDF.
"""
import fitz  # PyMuPDF
from dataclasses import dataclass
from typing import List, Dict, Tuple


@dataclass
class DataBlock:
    """Represents a text block extracted from a PDF with its location."""
    text: str
    page: int
    bbox: Tuple[float, float, float, float]  # (x0, y0, x1, y1)


@dataclass
class PageDimensions:
    """Stores the dimensions of a PDF page."""
    width: float
    height: float


def extract_text_blocks(pdf_path: str) -> Tuple[List[DataBlock], Dict[int, PageDimensions]]:
    """
    Extract text blocks with bounding box coordinates from a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Tuple containing:
        - List of DataBlock objects with text, page number, and bounding box
        - Dictionary mapping page numbers to PageDimensions
    """
    blocks: List[DataBlock] = []
    page_dimensions: Dict[int, PageDimensions] = {}
    
    doc = fitz.open(pdf_path)
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Store page dimensions (in PDF points, 72 DPI)
        rect = page.rect
        page_dimensions[page_num + 1] = PageDimensions(
            width=rect.width,
            height=rect.height
        )
        
        # Extract text blocks with position information
        page_dict = page.get_text("dict")
        
        for block in page_dict.get("blocks", []):
            # Only process text blocks (type 0), skip images (type 1)
            if block.get("type") == 0:
                # Combine all lines and spans into a single text
                text_content = ""
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text_content += span.get("text", "")
                    text_content += " "
                
                text_content = text_content.strip()
                
                # Skip empty blocks
                if not text_content:
                    continue
                
                # Get bounding box (x0, y0, x1, y1)
                bbox = block.get("bbox", (0, 0, 0, 0))
                
                blocks.append(DataBlock(
                    text=text_content,
                    page=page_num + 1,  # 1-indexed for frontend
                    bbox=tuple(bbox)
                ))
    
    doc.close()
    
    return blocks, page_dimensions


def chunk_text_blocks(
    blocks: List[DataBlock], 
    max_chars: int = 500,
    overlap_chars: int = 50
) -> List[DataBlock]:
    """
    Optionally chunk large text blocks into smaller pieces for better retrieval.
    Preserves the original bounding box for citation purposes.
    
    Args:
        blocks: List of DataBlock objects
        max_chars: Maximum characters per chunk
        overlap_chars: Overlap between chunks for context
        
    Returns:
        List of DataBlock objects, potentially with more items than input
    """
    chunked_blocks: List[DataBlock] = []
    
    for block in blocks:
        if len(block.text) <= max_chars:
            chunked_blocks.append(block)
        else:
            # Split long text into chunks with overlap
            text = block.text
            start = 0
            while start < len(text):
                end = min(start + max_chars, len(text))
                chunk_text = text[start:end]
                
                chunked_blocks.append(DataBlock(
                    text=chunk_text,
                    page=block.page,
                    bbox=block.bbox  # Keep original bbox for citation
                ))
                
                start = end - overlap_chars if end < len(text) else end
    
    return chunked_blocks
