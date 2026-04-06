
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import CircularProgress from './CircularProgress';
import { useAuth } from '../../context/AuthContext';

const PaginatedReader = ({ content, title, contentId, contentType, initialProgress }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [ready, setReady] = useState(false);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const { user } = useAuth();

    // Initialize state from props if available
    useEffect(() => {
        if (initialProgress) {
            setCurrentPage(initialProgress.lastPage || 1);
        }
    }, [initialProgress]);

    // Calculate pages based on content height and column layout
    const calculatePages = useCallback(() => {
        if (!contentRef.current || !containerRef.current) return;

        const containerWidth = containerRef.current.clientWidth;
        const contentScrollWidth = contentRef.current.scrollWidth;
        const gap = 40; // column-gap

        // Total pages is roughly the scroll width divided by (container width + gap)
        // We add a small buffer/rounding
        const pages = Math.ceil((contentScrollWidth + gap) / (containerWidth + gap));
        setTotalPages(Math.max(1, pages));
        setReady(true);
    }, []);

    // Recalculate on resize
    useEffect(() => {
        const handleResize = () => {
            // Debounce could be added here
            calculatePages();
        };

        window.addEventListener('resize', handleResize);
        // Initial calculation after a short delay to ensure DOM is rendered
        const timer = setTimeout(calculatePages, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, [content, calculatePages]);

    // Sync progress to backend
    useEffect(() => {
        if (!ready || !user) return;

        const syncProgress = async () => {
            try {
                const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));

                const payload = {
                    [contentType === 'article' ? 'articleId' : contentType === 'research' ? 'researchId' : 'postId']: contentId,
                    percentage,
                    lastPage: currentPage,
                    totalPages
                };

                const getCsrfToken = () => {
                    const cookies = document.cookie.split(';');
                    for (const cookie of cookies) {
                        const [name, value] = cookie.trim().split('=');
                        if (name === 'csrf') return value;
                    }
                    return null;
                };
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
                const token = localStorage.getItem('token');
                await fetch(`${backendUrl}/api/reading-progress`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': getCsrfToken() || '',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
            } catch (error) {
                console.error('Error syncing progress:', error);
            }
        };

        // Debounce sync
        const timer = setTimeout(syncProgress, 1000);
        return () => clearTimeout(timer);
    }, [currentPage, totalPages, contentId, contentType, ready, user]);

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(p => p + 1);
        }
    };

    const handlePrev = () => {
        if (currentPage > 1) {
            setCurrentPage(p => p - 1);
        }
    };

    const percentage = Math.round((currentPage / totalPages) * 100);

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] min-h-[600px] bg-white dark:bg-[#0a0a0c] rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Header / Progress Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-black/40 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-10">
                <div className="flex items-center gap-4">
                    <CircularProgress percentage={percentage} size={48} />
                    <div>
                        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progreso de Lectura</h2>
                        <p className="text-xs text-gray-400">Página {currentPage} de {totalPages}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400">
                        <Bookmark className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Reader Area */}
            <div className="flex-1 relative overflow-hidden px-8 md:px-16 py-8" ref={containerRef}>
                <div
                    className="h-full transition-transform duration-500 cubic-bezier(0.25, 1, 0.5, 1)"
                    style={{
                        transform: `translateX(-${(currentPage - 1) * (containerRef.current ? containerRef.current.clientWidth + 40 : 0)}px)`
                    }}
                >
                    <div
                        ref={contentRef}
                        className="prose prose-lg dark:prose-invert max-w-none h-full text-justify"
                        style={{
                            columnWidth: containerRef.current ? `${containerRef.current.clientWidth}px` : 'auto',
                            columnGap: '40px',
                            columnFill: 'auto',
                            height: '100%',
                            widows: 3,
                            orphans: 3
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800">
                <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${currentPage === 1
                            ? 'opacity-50 cursor-not-allowed text-gray-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                >
                    <ChevronLeft className="w-5 h-5" />
                    Anterior
                </button>

                <div className="h-1.5 w-64 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden hidden md:block">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${currentPage === totalPages
                            ? 'opacity-50 cursor-not-allowed text-gray-400'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                        }`}
                >
                    Siguiente
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <style>{`
        /* Hide scrollbars for the reader implementation */
        .prose p {
            margin-bottom: 1.5em;
            line-height: 1.8;
        }
        .prose h1, .prose h2, .prose h3 {
            margin-top: 0;
            break-after: avoid;
        }
        /* Improve typography for reading */
        .prose {
             font-size: 1.125rem;
        }
      `}</style>
        </div>
    );
};

export default PaginatedReader;
