import { useRef, useEffect, useState } from 'react';
import type { Highlight, Citation, PageDimension } from '../types';

interface PdfViewerProps {
    pdfUrl: string | null;
    pageDimensions: PageDimension[];
    activeCitation: Citation | null;
}

export function PdfViewer({ pdfUrl, pageDimensions, activeCitation }: PdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1);

    // Convert citation bbox to highlight format
    const citationToHighlight = (citation: Citation): Highlight | null => {
        const pageDim = pageDimensions.find(p => p.page === citation.page);
        if (!pageDim) return null;

        const [x0, y0, x1, y1] = citation.bbox;

        // Convert PDF points to percentages for positioning
        const rect = {
            x1: (x0 / pageDim.width) * 100,
            y1: (y0 / pageDim.height) * 100,
            x2: (x1 / pageDim.width) * 100,
            y2: (y1 / pageDim.height) * 100,
            width: pageDim.width,
            height: pageDim.height,
        };

        return {
            id: `citation-${citation.id}`,
            position: {
                pageNumber: citation.page,
                boundingRect: rect,
                rects: [rect],
            },
            content: {
                text: citation.text,
            },
        };
    };

    // Update highlights when active citation changes
    useEffect(() => {
        if (activeCitation) {
            const highlight = citationToHighlight(activeCitation);
            if (highlight) {
                setHighlights([highlight]);
                setCurrentPage(activeCitation.page);

                // Scroll to the highlighted area
                setTimeout(() => {
                    const highlightEl = document.querySelector('.highlight-layer');
                    highlightEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [activeCitation, pageDimensions]);

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

    return (
        <div
            ref={containerRef}
            className="h-full overflow-auto relative"
            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
            {/* Toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b"
                style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)'
                }}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
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
                        onClick={() => setScale(s => Math.min(2, s + 0.1))}
                        className="p-1.5 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
                        title="Zoom in"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Page {currentPage} of {pageDimensions.length || '?'}</span>
                </div>
            </div>

            {/* PDF Container with iframe */}
            <div className="flex justify-center p-4">
                <div className="relative shadow-xl" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                    <iframe
                        src={`${pdfUrl}#page=${currentPage}`}
                        className="bg-white"
                        style={{
                            width: '612px', // Standard letter width in points
                            height: '792px', // Standard letter height in points
                            border: 'none',
                        }}
                        title="PDF Viewer"
                    />

                    {/* Highlight Overlay */}
                    {highlights.map(highlight => {
                        const { boundingRect } = highlight.position;
                        if (highlight.position.pageNumber !== currentPage) return null;

                        return (
                            <div
                                key={highlight.id}
                                className="highlight-layer absolute pointer-events-none"
                                style={{
                                    left: `${boundingRect.x1}%`,
                                    top: `${boundingRect.y1}%`,
                                    width: `${boundingRect.x2 - boundingRect.x1}%`,
                                    height: `${boundingRect.y2 - boundingRect.y1}%`,
                                    backgroundColor: 'rgba(255, 226, 143, 0.5)',
                                    border: '2px solid #f59e0b',
                                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                }}
                            />
                        );
                    })}
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
                        max={pageDimensions.length}
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Math.max(1, Math.min(pageDimensions.length, parseInt(e.target.value) || 1)))}
                        className="w-12 text-center text-sm rounded border outline-none"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                        }}
                    />

                    <button
                        onClick={() => setCurrentPage(p => Math.min(pageDimensions.length, p + 1))}
                        disabled={currentPage >= pageDimensions.length}
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
