import { useState, useCallback } from 'react';
import type { Highlight, Citation, PageDimension } from '../types';

export function useHighlights(pageDimensions: PageDimension[]) {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

    const citationToHighlight = useCallback((citation: Citation): Highlight | null => {
        const pageDim = pageDimensions.find(p => p.page === citation.page);
        if (!pageDim) return null;

        const [x0, y0, x1, y1] = citation.bbox;

        // Convert PDF points to percentages
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
    }, [pageDimensions]);

    const scrollToCitation = useCallback((citation: Citation) => {
        setActiveCitation(citation);

        const highlight = citationToHighlight(citation);
        if (highlight) {
            setHighlights([highlight]);
        }
    }, [citationToHighlight]);

    const clearHighlights = useCallback(() => {
        setHighlights([]);
        setActiveCitation(null);
    }, []);

    return {
        highlights,
        activeCitation,
        scrollToCitation,
        clearHighlights,
    };
}
