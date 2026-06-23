
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CircularProgress from './CircularProgress';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config/client';

const WORDS_PER_PAGE = 270;

function wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function buildPages(html) {
  if (!html) return [['<p></p>']];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const children = Array.from(doc.body.children);

  if (children.length === 0) {
    return [[html]];
  }

  const blocks = children.map(el => ({
    html: el.outerHTML,
    words: wordCount(el.textContent || ''),
    isHeading: /^H[1-6]$/.test(el.tagName),
  }));

  const pages = [];
  let page = [];
  let pageWords = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (page.length > 0 && pageWords + block.words > WORDS_PER_PAGE) {
      pages.push(page);
      page = [];
      pageWords = 0;
    }

    page.push(block.html);
    pageWords += block.words;
  }

  if (page.length > 0) pages.push(page);

  // Anti-orphan: if last block of a page is a heading, move it to next page
  for (let i = 0; i < pages.length - 1; i++) {
    const last = pages[i][pages[i].length - 1];
    if (/^<h[1-6][\s>]/i.test(last) && pages[i].length > 1) {
      pages[i].pop();
      pages[i + 1].unshift(last);
    }
  }

  return pages.length > 0 ? pages : [[html]];
}

const PaginatedReader = ({ content, title, contentId, contentType, initialProgress }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fading, setFading] = useState(false);
  const { user } = useAuth();

  const pages = useMemo(() => buildPages(content), [content]);
  const totalPages = pages.length;

  useEffect(() => {
    if (initialProgress?.lastPage) {
      setCurrentPage(Math.min(initialProgress.lastPage, totalPages));
    }
  }, [initialProgress, totalPages]);

  // Sync reading progress
  useEffect(() => {
    if (!user || !contentId) return;
    const timer = setTimeout(async () => {
      try {
        const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));
        const getCsrfToken = () => {
          for (const c of document.cookie.split(';')) {
            const [n, v] = c.trim().split('=');
            if (n === 'csrf') return v;
          }
          return null;
        };
        const key = contentType === 'article' ? 'articleId'
          : contentType === 'research' ? 'researchId'
          : 'postId';
        await fetch(`${BACKEND_URL}/api/reading-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
          credentials: 'include',
          body: JSON.stringify({ [key]: contentId, percentage, lastPage: currentPage, totalPages }),
        });
      } catch (_) {}
    }, 1200);
    return () => clearTimeout(timer);
  }, [currentPage, totalPages, contentId, contentType, user]);

  const changePage = (next) => {
    if (next < 1 || next > totalPages || fading) return;
    setFading(true);
    setTimeout(() => {
      setCurrentPage(next);
      setFading(false);
    }, 180);
  };

  const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));
  const pageHtml = (pages[currentPage - 1] || []).join('');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'clamp(520px, 68vh, 720px)',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CircularProgress percentage={percentage} size={40} />
          <div>
            <p
              style={{
                fontSize: '0.625rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                margin: 0,
                marginBottom: '0.1rem',
              }}
            >
              Progreso de lectura
            </p>
            <p className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text)', margin: 0 }}>
              Página {currentPage} de {totalPages}
            </p>
          </div>
        </div>

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
              transition: 'width 0.4s',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      >
        {currentPage === 1 && title && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(1.375rem, 3.5vw, 2rem)',
                lineHeight: 1.2,
                color: 'var(--text)',
                margin: 0,
              }}
            >
              {title}
            </h1>
            <div
              style={{
                marginTop: '0.625rem',
                height: '2px',
                width: '2.5rem',
                backgroundColor: 'var(--accent)',
              }}
            />
          </div>
        )}

        <div
          className="prose prose-base dark:prose-invert max-w-none"
          style={{ color: 'var(--text)', fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)', lineHeight: 1.85 }}
          dangerouslySetInnerHTML={{ __html: pageHtml }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          gap: '0.5rem',
        }}
      >
        <button
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            padding: '0.4rem 0.875rem',
            fontSize: '0.8125rem',
            color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1"
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
    </div>
  );
};

export default PaginatedReader;
