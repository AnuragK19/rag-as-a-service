import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadPdf } from '../hooks/useApi';
import type { UploadResponse } from '../types';

// Constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB in bytes

interface UploadDropzoneProps {
    onUploadSuccess: (response: UploadResponse, file: File) => void;
}

export function UploadDropzone({ onUploadSuccess }: UploadDropzoneProps) {
    const uploadMutation = useUploadPdf({
        onSuccess: onUploadSuccess,
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            uploadMutation.reset();
            return;
        }

        // Validate file size (1MB max)
        if (file.size > MAX_FILE_SIZE) {
            return;
        }

        uploadMutation.mutate(file);
    }, [uploadMutation]);

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        maxSize: MAX_FILE_SIZE,
        disabled: uploadMutation.isPending,
    });

    // Determine error message
    const getErrorMessage = () => {
        if (uploadMutation.error) {
            return uploadMutation.error.message;
        }
        if (fileRejections.length > 0) {
            const rejection = fileRejections[0];
            if (rejection?.errors[0]?.code === 'file-too-large') {
                return 'File too large. Maximum size is 1MB';
            } else if (rejection?.errors[0]?.code === 'file-invalid-type') {
                return 'Only PDF files are accepted';
            }
            return rejection?.errors[0]?.message || 'File rejected';
        }
        return null;
    };

    const errorMessage = getErrorMessage();

    return (
        <div className="flex flex-col items-center justify-center h-full p-8">
            {/* Disclaimer Banner */}
            <div className="w-full max-w-md mb-6 p-4 rounded-lg border-l-4"
                style={{
                    backgroundColor: 'var(--color-warning-bg)',
                    borderColor: 'var(--color-warning-border)',
                    color: 'var(--color-warning-text)'
                }}>
                <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="text-sm">
                        Your session data (PDF & chat) will be automatically deleted after{' '}
                        <strong>30 minutes</strong> of inactivity to keep our servers lean.
                        <br />
                        <span className="opacity-75">Maximum file size: 1MB</span>
                    </p>
                </div>
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
                    w-full max-w-md p-12 rounded-xl border-2 border-dashed cursor-pointer
                    transition-all duration-200 text-center
                    ${isDragActive ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}
                    ${uploadMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-secondary)]'}
                `}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-4">
                    {/* Upload Icon */}
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        {uploadMutation.isPending ? (
                            <div className="spinner" />
                        ) : (
                            <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                    </div>

                    {/* Text */}
                    <div>
                        <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                            {uploadMutation.isPending ? 'Processing your resume...' :
                                isDragActive ? 'Drop your PDF here' : 'Drop your resume PDF here'}
                        </p>
                        {!uploadMutation.isPending && (
                            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                or click to browse (max 1MB)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                    {errorMessage}
                </div>
            )}

            {/* Feature Highlights */}
            <div className="mt-8 flex gap-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Local Processing</span>
                </div>
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Verifiable Citations</span>
                </div>
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>No Data Stored</span>
                </div>
            </div>
        </div>
    );
}
