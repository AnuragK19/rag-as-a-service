import { useMutation, useQuery } from '@tanstack/react-query';
import { uploadPdf, sendChatMessage, checkSession } from '../api';
import type { UploadResponse, ChatResponse } from '../types';

// Upload mutation hook
export function useUploadPdf(options?: {
    onSuccess?: (data: UploadResponse, file: File) => void;
    onError?: (error: Error) => void;
}) {
    return useMutation({
        mutationFn: (file: File) => uploadPdf(file),
        onSuccess: (data, file) => options?.onSuccess?.(data, file),
        onError: (error) => options?.onError?.(error as Error),
    });
}

// Chat mutation hook
export function useSendMessage(options?: {
    onSuccess?: (data: ChatResponse) => void;
    onError?: (error: Error) => void;
}) {
    return useMutation({
        mutationFn: ({ sessionId, query }: { sessionId: string; query: string }) =>
            sendChatMessage(sessionId, query),
        onSuccess: (data) => options?.onSuccess?.(data),
        onError: (error) => options?.onError?.(error as Error),
    });
}

// Session check query hook
export function useCheckSession(sessionId: string | null) {
    return useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => checkSession(sessionId!),
        enabled: !!sessionId,
        retry: false,
        staleTime: 30000, // 30 seconds
    });
}
