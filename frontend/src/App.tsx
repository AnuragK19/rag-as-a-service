import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { UploadDropzone } from './components/UploadDropzone';
import { ChatPanel } from './components/ChatPanel';
import { PdfViewer } from './components/PdfViewer';
import type { UploadResponse, Citation, PageDimension } from './types';
import './index.css';

// Create QueryClient instance outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AppContent() {
  const { theme, toggle } = useTheme();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'pdf'>('chat');

  const handleUploadSuccess = useCallback((response: UploadResponse, file: File) => {
    setSessionId(response.session_id);
    setPageDimensions(response.page_dimensions);

    // Create blob URL for PDF viewing
    const blobUrl = URL.createObjectURL(file);
    setPdfUrl(blobUrl);
    setActiveTab('chat');
  }, []);

  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    setActiveTab('pdf');

    // Clear the highlight after animation
    setTimeout(() => {
      setActiveCitation(prev => prev?.id === citation.id ? null : prev);
    }, 3000);
  }, []);

  const handleNewSession = useCallback(() => {
    // Cleanup current session
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setSessionId(null);
    setPdfUrl(null);
    setPageDimensions([]);
    setActiveCitation(null);
    setActiveTab('chat');
  }, [pdfUrl]);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              Resume Analyst
            </h1>
            <p className="text-xs truncate hidden sm:block" style={{ color: 'var(--color-text-secondary)' }}>
              POC: RAG with Verifiable Citations &amp; Bounding Box Highlights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {sessionId && (
            <button
              onClick={handleNewSession}
              className="text-sm px-3 py-1.5 rounded-lg border transition-colors
                       hover:bg-[var(--color-bg-secondary)]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <span className="hidden sm:inline">New Session</span>
              <span className="sm:hidden">New</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-secondary)]"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar - Only visible when session is active on mobile */}
      {sessionId && (
        <div className="md:hidden flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)]'
              }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pdf'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)]'
              }`}
          >
            PDF Viewer
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Chat/Upload Panel */}
        <div
          className={`
            flex flex-col h-full w-full md:w-1/2 md:border-r transition-transform duration-300 absolute md:relative
            ${!sessionId ? 'z-10 bg-[var(--color-bg)]' : ''}
            ${activeTab === 'chat' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)' }}
        >
          {!sessionId ? (
            <UploadDropzone onUploadSuccess={handleUploadSuccess} />
          ) : (
            <ChatPanel sessionId={sessionId} onCitationClick={handleCitationClick} />
          )}
        </div>

        {/* PDF Viewer Panel */}
        <div
          className={`
            h-full w-full md:w-1/2 transition-transform duration-300 absolute md:relative top-0 left-0 md:left-auto
            ${activeTab === 'pdf' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          <PdfViewer
            pdfUrl={pdfUrl}
            pageDimensions={pageDimensions}
            activeCitation={activeCitation}
          />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

