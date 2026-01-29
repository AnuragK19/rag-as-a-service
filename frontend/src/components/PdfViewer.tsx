import { useRef, useEffect, useState, useCallback } from 'react';
import { usePdfRenderer } from '../hooks/usePdfRenderer';
import type { Citation, PageDimension } from '../types';

interface PdfViewerProps {
    pdfUrl: string | null;
    pageDimensions: PageDimension[];
    activeCitation: Citation | null;
}

// CSS styles as a string to inject
const highlightStyles = `
  @keyframes highlightPulse {
    0%, 100% { 
      background-color: rgba(255, 226, 143, 0.5);
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }
    50% { 
      background-color: rgba(255, 226, 143, 0.7);
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.6);
    }
  }
`;

export function PdfViewer({ pdfUrl, pageDimensions, activeCitation }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const [renderedPageInfo, setRenderedPageInfo] = useState<{ width: number; height: number } | null>(null);

    const { numPages, renderPage, isLoading, error } = usePdfRenderer(pdfUrl);

    // Render current page when it changes
    useEffect(() => {
        if (!canvasRef.current || numPages === 0) return;

        const render = async () => {
            const pageInfo = await renderPage(currentPage, canvasRef.current!, scale);
            if (pageInfo) {
                setRenderedPageInfo({ width: pageInfo.width, height: pageInfo.height });
            }
        };

        render();
    }, [currentPage, scale, numPages, renderPage]);

    // Navigate to citation page when active citation changes
    useEffect(() => {
        if (activeCitation && activeCitation.page !== currentPage) {
            setCurrentPage(activeCitation.page);
        }
    }, [activeCitation]);

    // Calculate highlight position based on PDF coordinates
    const getHighlightStyle = useCallback(() => {
        if (!activeCitation || !renderedPageInfo || activeCitation.page !== currentPage) {
            return null;
        }

        // Get the original page dimensions from backend
        const originalPageDim = pageDimensions.find(p => p.page === activeCitation.page);
        if (!originalPageDim) return null;

        const [x0, y0, x1, y1] = activeCitation.bbox;

        // Calculate scale factor: how much the canvas is scaled from original PDF points
        const scaleX = renderedPageInfo.width / originalPageDim.width;
        const scaleY = renderedPageInfo.height / originalPageDim.height;

        // Convert PDF point coordinates to canvas pixel coordinates
        const left = x0 * scaleX;
        const top = y0 * scaleY;
        const width = (x1 - x0) * scaleX;
        const height = (y1 - y0) * scaleY;

        return {
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
        };
    }, [activeCitation, renderedPageInfo, currentPage, pageDimensions]);

    const highlightStyle = getHighlightStyle();

    // Scroll to highlight when it appears
    useEffect(() => {
        if (highlightStyle && containerRef.current) {
            const highlightEl = containerRef.current.querySelector('.pdf-highlight');
            if (highlightEl) {
                highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightStyle]);

    if (!pdfUrl) {
        return (
            <div className="flex items-center justify-center h-full"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
                    <svg className="w-20 h-20 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg">Upload a PDF to view it here</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-current border-t-transparent rounded-full animate-spin" />
                    <p>Loading PDF...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-center text-red-500">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="h-full overflow-auto relative"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
            {/* Inject highlight animation styles */}
            <style>{highlightStyles}</style>

            {/* Toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b"
                style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)'
                }}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
                        title="Zoom out"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                    <span className="text-sm min-w-[4rem] text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={() => setScale(s => Math.min(3, s + 0.25))}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
                        title="Zoom in"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Page {currentPage} of {numPages || '?'}</span>
                </div>
            </div>

            {/* PDF Canvas Container */}
            <div className="flex justify-center p-4">
                <div className="relative shadow-xl bg-white">
                    {/* The PDF Canvas */}
                    <canvas
                        ref={canvasRef}
                        className="block"
                    />

                    {/* Highlight Overlay - positioned absolutely over the canvas */}
                    {highlightStyle && (
                        <div
                            className="pdf-highlight absolute pointer-events-none"
                            style={{
                                ...highlightStyle,
                                backgroundColor: 'rgba(255, 226, 143, 0.5)',
                                border: '2px solid #f59e0b',
                                animation: 'highlightPulse 1.5s ease-in-out infinite',
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Page Navigation */}
            <div className="sticky bottom-4 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 rounded-full hover:bg-[var(--color-bg-secondary)] disabled:opacity-30 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <input
                        type="number"
                        min={1}
                        max={numPages}
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Math.max(1, Math.min(numPages, parseInt(e.target.value) || 1)))}
                        className="w-12 text-center text-sm rounded border outline-none"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                        }}
                    />

                    <button
                        onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                        disabled={currentPage >= numPages}
                        className="p-1 rounded-full hover:bg-[var(--color-bg-secondary)] disabled:opacity-30 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
