
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CircularProgress from './CircularProgress';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config/client';

const PaginatedReader = ({ content, title, contentId, contentType, initialProgress }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [ready, setReady] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (initialProgress) setCurrentPage(initialProgress.lastPage || 1);
  }, [initialProgress]);

  const calculatePages = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const contentScrollWidth = contentRef.current.scrollWidth;
    const gap = 32;
    const pages = Math.ceil((contentScrollWidth + gap) / (containerWidth + gap));
    setTotalPages(Math.max(1, pages));
    setReady(true);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', calculatePages);
    const timer = setTimeout(calculatePages, 150);
    return () => {
      window.removeEventListener('resize', calculatePages);
      clearTimeout(timer);
    };
  }, [content, calculatePages]);

  useEffect(() => {
    if (!ready || !user) return;
    const syncProgress = async () => {
      try {
        const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));
        const payload = {
          [contentType === 'article' ? 'articleId' : contentType === 'research' ? 'researchId' : 'postId']: contentId,
          percentage,
          lastPage: currentPage,
          totalPages,
        };
        const getCsrfToken = () => {
          for (const c of document.cookie.split(';')) {
            const [n, v] = c.trim().split('=');
            if (n === 'csrf') return v;
          }
          return null;
        };
        await fetch(`${BACKEND_URL}/api/reading-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } catch (_) {}
    };
    const timer = setTimeout(syncProgress, 1000);
    return () => clearTimeout(timer);
  }, [currentPage, totalPages, contentId, contentType, ready, user]);

  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
  const handlePrev = () => { if (currentPage > 1) setCurrentPage(p => p - 1); };

  const percentage = Math.round((currentPage / totalPages) * 100);
  const offset = containerRef.current ? (currentPage - 1) * (containerRef.current.clientWidth + 32) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'clamp(480px, 65vh, 700px)',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <CircularProgress percentage={percentage} size={40} />
          <div style={{ minWidth: 0 }}>
            <p
              className="font-sans"
              style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.1rem' }}
            >
              Progreso de lectura
            </p>
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text)' }}>
              Página {currentPage} de {totalPages}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            flex: 1,
            maxWidth: '160px',
            height: '3px',
            backgroundColor: 'var(--border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: 'var(--accent)',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Content area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(0.75rem, 3vw, 2rem)',
        }}
      >
        {currentPage === 1 && title && (
          <div style={{ marginBottom: '1rem' }}>
            <h1
              className="font-display"
              style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', lineHeight: 1.2, color: 'var(--text)' }}
            >
              {title}
            </h1>
            <div style={{ marginTop: '0.5rem', height: '2px', width: '2rem', backgroundColor: 'var(--accent)' }} />
          </div>
        )}

        <div
          style={{
            transform: `translateX(-${offset}px)`,
            transition: 'transform 400ms cubic-bezier(0.25, 1, 0.5, 1)',
            height: currentPage === 1 && title ? 'calc(100% - 3.5rem)' : '100%',
          }}
        >
          <div
            ref={contentRef}
            className="prose prose-sm md:prose-base dark:prose-invert"
            style={{
              columnWidth: containerRef.current ? `${containerRef.current.clientWidth}px` : 'auto',
              columnGap: '32px',
              columnFill: 'auto',
              height: '100%',
              widows: 3,
              orphans: 3,
              color: 'var(--text)',
              fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
              lineHeight: 1.8,
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 1rem',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          gap: '0.5rem',
        }}
      >
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="flex items-center gap-1 font-sans"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            padding: '0.4rem 0.875rem',
            fontSize: '0.8125rem',
            color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
            transition: 'all 0.15s',
          }}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 font-sans"
          style={{
            border: 'none',
            padding: '0.4rem 0.875rem',
            fontSize: '0.8125rem',
            backgroundColor: currentPage === totalPages ? 'var(--border)' : 'var(--accent)',
            color: currentPage === totalPages ? 'var(--muted)' : '#fff',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.4 : 1,
            transition: 'all 0.15s',
          }}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <style>{`
        .prose p { margin-bottom: 1.4em; line-height: 1.8; }
        .prose h1, .prose h2, .prose h3 { margin-top: 0; break-after: avoid; }
        .prose img { max-width: 100%; break-inside: avoid; }
      `}</style>
    </div>
  );
};

export default PaginatedReader;
