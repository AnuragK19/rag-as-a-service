// Types for the RAG-as-a-Service frontend

export interface PageDimension {
    page: number;
    width: number;
    height: number;
}

export interface Citation {
    id: number;
    text: string;
    page: number;
    bbox: [number, number, number, number]; // [x0, y0, x1, y1]
}

export interface UploadResponse {
    session_id: string;
    message: string;
    page_count: number;
    block_count: number;
    page_dimensions: PageDimension[];
}

export interface ChatResponse {
    answer: string;
    citations: Citation[];
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
}

export interface Highlight {
    id: string;
    position: {
        pageNumber: number;
        boundingRect: {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            width: number;
            height: number;
        };
        rects: Array<{
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            width: number;
            height: number;
        }>;
    };
    content: {
        text: string;
    };
    comment?: {
        text: string;
    };
}

export interface ThemeContextType {
    theme: 'light' | 'dark';
    toggle: () => void;
}
