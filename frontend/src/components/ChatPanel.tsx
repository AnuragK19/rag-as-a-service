import { useState, useRef, useEffect } from 'react';
import { useSendMessage } from '../hooks/useApi';
import type { Message, Citation } from '../types';

interface ChatPanelProps {
    sessionId: string;
    onCitationClick: (citation: Citation) => void;
}

export function ChatPanel({ sessionId, onCitationClick }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chatMutation = useSendMessage({
        onSuccess: (data) => {
            const assistantMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.answer,
                citations: data.citations,
            };
            setMessages(prev => [...prev, assistantMessage]);
        },
        onError: () => {
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            };
            setMessages(prev => [...prev, errorMessage]);
        },
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const query = input.trim();
        if (!query || chatMutation.isPending) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        // Send chat request
        chatMutation.mutate({ sessionId, query });
    };

    const renderMessageContent = (message: Message) => {
        if (!message.citations || message.citations.length === 0) {
            return <p className="whitespace-pre-wrap">{message.content}</p>;
        }

        // Replace [n] with clickable citations
        const parts = message.content.split(/(\[\d+\])/g);
        return (
            <p className="whitespace-pre-wrap">
                {parts.map((part, index) => {
                    const match = part.match(/\[(\d+)\]/);
                    if (match) {
                        const citationId = parseInt(match[1]);
                        const citation = message.citations?.find(c => c.id === citationId);
                        if (citation) {
                            return (
                                <button
                                    key={index}
                                    onClick={() => onCitationClick(citation)}
                                    className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-medium rounded
                           bg-[var(--color-primary)]/10 text-[var(--color-primary)] 
                           hover:bg-[var(--color-primary)]/20 transition-colors cursor-pointer"
                                    title={`Go to page ${citation.page}`}
                                >
                                    [{citationId}]
                                </button>
                            );
                        }
                    }
                    return <span key={index}>{part}</span>;
                })}
            </p>
        );
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">Start chatting with your resume</p>
                        <p className="text-sm max-w-xs">
                            Ask questions like "What programming languages are mentioned?" or "Summarize the work experience"
                        </p>
                    </div>
                )}

                {messages.map(message => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-xl ${message.role === 'user'
                                    ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                                    : 'rounded-bl-sm'
                                }`}
                            style={message.role === 'assistant' ? {
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text)'
                            } : {}}
                        >
                            {renderMessageContent(message)}
                        </div>
                    </div>
                ))}

                {chatMutation.isPending && (
                    <div className="flex justify-start">
                        <div className="p-3 rounded-xl rounded-bl-sm"
                            style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this resume..."
                        disabled={chatMutation.isPending}
                        className="flex-1 px-4 py-2.5 rounded-lg border outline-none transition-colors
                     focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20
                     disabled:opacity-50"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={chatMutation.isPending || !input.trim()}
                        className="px-6 py-2.5 rounded-lg font-medium transition-colors
                     bg-[var(--color-primary)] text-white
                     hover:bg-[var(--color-primary-hover)]
                     disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
