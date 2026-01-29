import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PageInfo {
    pageNumber: number;
    width: number;
    height: number;
    scale: number;
}

interface UsePdfRendererResult {
    numPages: number;
    pageInfos: PageInfo[];
    renderPage: (pageNumber: number, canvas: HTMLCanvasElement, scale: number) => Promise<PageInfo | null>;
    isLoading: boolean;
    error: string | null;
}

export function usePdfRenderer(pdfUrl: string | null): UsePdfRendererResult {
    const [numPages, setNumPages] = useState(0);
    const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

    // Load PDF document
    useEffect(() => {
        if (!pdfUrl) {
            setNumPages(0);
            setPageInfos([]);
            pdfDocRef.current = null;
            return;
        }

        setIsLoading(true);
        setError(null);

        const loadPdf = async () => {
            try {
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                const pdfDoc = await loadingTask.promise;
                pdfDocRef.current = pdfDoc;
                setNumPages(pdfDoc.numPages);

                // Get page dimensions for all pages
                const infos: PageInfo[] = [];
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 1 });
                    infos.push({
                        pageNumber: i,
                        width: viewport.width,
                        height: viewport.height,
                        scale: 1,
                    });
                }
                setPageInfos(infos);
            } catch (err) {
                console.error('Failed to load PDF:', err);
                setError('Failed to load PDF');
            } finally {
                setIsLoading(false);
            }
        };

        loadPdf();

        return () => {
            if (pdfDocRef.current) {
                pdfDocRef.current.destroy();
                pdfDocRef.current = null;
            }
        };
    }, [pdfUrl]);

    // Render a specific page to canvas
    const renderPage = useCallback(async (
        pageNumber: number,
        canvas: HTMLCanvasElement,
        scale: number
    ): Promise<PageInfo | null> => {
        if (!pdfDocRef.current || pageNumber < 1 || pageNumber > numPages) {
            return null;
        }

        try {
            const page = await pdfDocRef.current.getPage(pageNumber);
            const viewport = page.getViewport({ scale });

            // Set canvas dimensions
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const context = canvas.getContext('2d');
            if (!context) return null;

            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Render page
            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas,
            }).promise;

            return {
                pageNumber,
                width: viewport.width,
                height: viewport.height,
                scale,
            };
        } catch (err) {
            console.error(`Failed to render page ${pageNumber}:`, err);
            return null;
        }
    }, [numPages]);

    return {
        numPages,
        pageInfos,
        renderPage,
        isLoading,
        error,
    };
}
