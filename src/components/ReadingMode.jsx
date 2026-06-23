import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';

const THEMES = {
  day:     { label: 'Día',    bg: '#ffffff', text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb', swatch: '#ffffff' },
  sepia:   { label: 'Sepia',  bg: '#f8f1e3', text: '#5c4527', muted: '#9a7d5a', border: '#e0cfa8', swatch: '#f8f1e3' },
  evening: { label: 'Noche',  bg: '#1e1b2e', text: '#d4c5f9', muted: '#8b7fc7', border: '#352d54', swatch: '#1e1b2e' },
  night:   { label: 'Oscuro', bg: '#111111', text: '#e0e0e0', muted: '#888888', border: '#2a2a2a', swatch: '#111111' },
};

const FONTS = {
  serif: { label: 'Serif', css: "'Georgia', 'Times New Roman', serif" },
  sans:  { label: 'Sans',  css: "'Inter', system-ui, sans-serif" },
  mono:  { label: 'Mono',  css: "'JetBrains Mono', 'Courier New', monospace" },
};

const SIZES = ['0.9375rem', '1.0625rem', '1.1875rem', '1.3125rem'];
const LEADING = [1.6, 1.85, 2.1];
const LS_KEY = 'artix_reading_prefs';

const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
};

const ReadingMode = ({ isOpen, onClose, content, title, author, date }) => {
  const saved = loadPrefs();
  const [theme, setTheme] = useState(saved.theme || 'day');
  const [fontKey, setFontKey] = useState(saved.fontKey || 'serif');
  const [sizeIdx, setSizeIdx] = useState(saved.sizeIdx ?? 1);
  const [lhIdx, setLhIdx] = useState(saved.lhIdx ?? 1);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ theme, fontKey, sizeIdx, lhIdx }));
  }, [theme, fontKey, sizeIdx, lhIdx]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const t = THEMES[theme];
  const font = FONTS[fontKey].css;
  const fontSize = SIZES[sizeIdx];
  const lineHeight = LEADING[lhIdx];
  const formattedDate = date
    ? new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const Btn = ({ children, active, onClick, disabled, title: btnTitle, style: s }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={btnTitle}
      style={{
        background: active ? '#C4451A' : 'none',
        border: `1px solid ${active ? '#C4451A' : t.border}`,
        color: active ? '#fff' : t.text,
        padding: '0.2rem 0.5rem',
        fontSize: '0.7rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        ...s,
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: t.bg,
        overflowY: 'auto',
        transition: 'background-color 0.2s',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 10,
          backgroundColor: t.bg,
          borderBottom: `1px solid ${t.border}`,
          padding: '0.625rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          transition: 'background-color 0.2s, border-color 0.2s',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <BookOpen size={14} style={{ color: t.muted }} />
          <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, whiteSpace: 'nowrap' }}>
            Modo lectura
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Theme swatches */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {Object.entries(THEMES).map(([key, th]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                title={th.label}
                style={{
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: th.swatch,
                  border: `2px solid ${theme === key ? '#C4451A' : t.border}`,
                  cursor: 'pointer',
                  outline: theme === key ? '1px solid #C4451A' : 'none',
                  outlineOffset: '1px',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          <div style={{ width: 1, height: 18, backgroundColor: t.border, flexShrink: 0 }} />

          {/* Font size */}
          <div style={{ display: 'flex', gap: '0.125rem' }}>
            <Btn
              onClick={() => setSizeIdx(i => Math.max(0, i - 1))}
              disabled={sizeIdx === 0}
              title="Reducir texto"
              s={{ fontFamily: 'Georgia, serif', fontSize: '0.65rem' }}
            >
              A−
            </Btn>
            <Btn
              onClick={() => setSizeIdx(i => Math.min(SIZES.length - 1, i + 1))}
              disabled={sizeIdx === SIZES.length - 1}
              title="Aumentar texto"
              s={{ fontFamily: 'Georgia, serif', fontSize: '0.8rem' }}
            >
              A+
            </Btn>
          </div>

          <div style={{ width: 1, height: 18, backgroundColor: t.border, flexShrink: 0 }} />

          {/* Font family */}
          <div style={{ display: 'flex', gap: '0.125rem' }}>
            {Object.entries(FONTS).map(([key, f]) => (
              <Btn key={key} active={fontKey === key} onClick={() => setFontKey(key)} s={{ fontFamily: f.css }}>
                {f.label}
              </Btn>
            ))}
          </div>

          <div style={{ width: 1, height: 18, backgroundColor: t.border, flexShrink: 0 }} />

          {/* Line height */}
          <div style={{ display: 'flex', gap: '0.125rem' }}>
            {['Compacto', 'Normal', 'Espacioso'].map((label, i) => (
              <Btn
                key={i}
                active={lhIdx === i}
                onClick={() => setLhIdx(i)}
                title={label}
                s={{ fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
              >
                {i === 0 ? '≡' : i === 1 ? '☰' : '⋱'}
              </Btn>
            ))}
          </div>

          <div style={{ width: 1, height: 18, backgroundColor: t.border, flexShrink: 0 }} />

          {/* Close */}
          <button
            onClick={onClose}
            title="Cerrar (Esc)"
            style={{
              background: 'none', border: `1px solid ${t.border}`,
              color: t.text, padding: '0.3rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: 'clamp(2.5rem, 7vw, 5rem) clamp(1.25rem, 5vw, 2.5rem)',
          fontFamily: font,
          color: t.text,
        }}
      >
        {/* Article header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              fontFamily: font,
              color: t.text,
              margin: 0,
              marginBottom: '0.875rem',
            }}
          >
            {title}
          </h1>
          {(author || formattedDate) && (
            <div style={{ fontSize: '0.875rem', color: t.muted, display: 'flex', gap: '0.5rem' }}>
              {author && <span>{author}</span>}
              {author && formattedDate && <span>·</span>}
              {formattedDate && <span>{formattedDate}</span>}
            </div>
          )}
          <div style={{ height: 2, width: 40, backgroundColor: '#C4451A', marginTop: '1.25rem' }} />
        </div>

        {/* Body */}
        <div
          className="reading-body"
          style={{ fontFamily: font, fontSize, lineHeight, color: t.text }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <style>{`
        .reading-body p { margin-bottom: 1.35em; }
        .reading-body h1, .reading-body h2, .reading-body h3, .reading-body h4 {
          margin-top: 2em; margin-bottom: 0.65em; font-weight: 700; line-height: 1.2;
        }
        .reading-body h2 { font-size: 1.4em; }
        .reading-body h3 { font-size: 1.2em; }
        .reading-body h4 { font-size: 1.05em; }
        .reading-body blockquote {
          border-left: 3px solid #C4451A;
          margin: 1.5em 0;
          padding: 0.4em 1.25em;
          font-style: italic;
          opacity: 0.82;
        }
        .reading-body code {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.875em;
          background: rgba(127,127,127,0.12);
          padding: 0.15em 0.4em;
        }
        .reading-body pre {
          background: rgba(127,127,127,0.1);
          padding: 1em;
          overflow-x: auto;
          font-size: 0.875em;
        }
        .reading-body pre code { background: none; padding: 0; }
        .reading-body img { max-width: 100%; margin: 1.5em 0; }
        .reading-body a { color: #C4451A; text-decoration: underline; }
        .reading-body ul, .reading-body ol { padding-left: 1.5em; margin-bottom: 1.35em; }
        .reading-body li { margin-bottom: 0.35em; }
        .reading-body hr { border: none; border-top: 1px solid rgba(127,127,127,0.25); margin: 2em 0; }
        .reading-body table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
        .reading-body td, .reading-body th { border: 1px solid rgba(127,127,127,0.25); padding: 0.5em 0.75em; }
      `}</style>
    </div>
  );
};

export default ReadingMode;
