import type { UploadResponse, ChatResponse } from '../types';

const API_BASE = '/api';

// API functions
export async function uploadPdf(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Upload failed');
    }

    return response.json();
}

export async function sendChatMessage(sessionId: string, query: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, query }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Chat request failed');
    }

    return response.json();
}

export async function checkSession(sessionId: string): Promise<{ session_id: string; status: string }> {
    const response = await fetch(`${API_BASE}/session/${sessionId}`);

    if (!response.ok) {
        throw new Error('Session not found or expired');
    }

    return response.json();
}
