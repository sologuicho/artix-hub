export const generatePDF = (content, type = 'article') => {
  const title = content.title || 'Documento';
  const author = content.author || '';
  const date = content.date
    ? new Date(content.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const tags = (content.tags || []).map(t => `#${t}`).join('  ');
  const body = content.content || '';
  const description = content.description || '';
  const typeLabel = type === 'research' ? 'Investigación' : 'Artículo';

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Permite las ventanas emergentes para descargar el PDF.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escHtml(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11.5pt;
    line-height: 1.75;
    color: #1a1a1a;
    background: #fff;
  }

  @media screen {
    .page { max-width: 720px; margin: 0 auto; padding: 52px 40px 64px; }
    .save-btn {
      position: fixed; top: 16px; right: 16px;
      background: #C4451A; color: #fff;
      border: none; padding: 10px 22px;
      font-size: 13px; font-family: Arial, sans-serif;
      letter-spacing: 0.04em; cursor: pointer;
      z-index: 99;
    }
    .save-btn:hover { background: #a33916; }
  }

  @page { margin: 20mm 18mm 22mm; }

  @media print {
    .save-btn { display: none; }
    .page { padding: 0; }
  }

  /* ── Document header ── */
  .doc-brand {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #C4451A;
    margin-bottom: 1.5rem;
  }
  .doc-title {
    font-size: 2.1rem;
    font-weight: 700;
    line-height: 1.15;
    margin-bottom: 0.875rem;
  }
  .doc-meta {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.875rem;
    color: #555;
    margin-bottom: 0;
  }
  .doc-meta span + span::before { content: " · "; }
  .doc-rule {
    border: none;
    border-top: 2px solid #1a1a1a;
    margin: 1.5rem 0;
  }
  .doc-desc {
    font-style: italic;
    color: #444;
    border-left: 3px solid #C4451A;
    padding: 0.35em 0 0.35em 1em;
    margin-bottom: 1.75rem;
    line-height: 1.65;
  }

  /* ── Body typography ── */
  .doc-body p { margin-bottom: 1.2em; }
  .doc-body h1 { font-size: 1.65em; margin-top: 2em; margin-bottom: 0.6em; line-height: 1.2; page-break-after: avoid; }
  .doc-body h2 { font-size: 1.35em; margin-top: 1.75em; margin-bottom: 0.55em; line-height: 1.2; page-break-after: avoid; }
  .doc-body h3 { font-size: 1.15em; margin-top: 1.5em; margin-bottom: 0.45em; page-break-after: avoid; }
  .doc-body h4 { font-size: 1em; margin-top: 1.25em; margin-bottom: 0.4em; font-weight: bold; page-break-after: avoid; }
  .doc-body blockquote {
    border-left: 3px solid #C4451A;
    padding: 0.3em 0 0.3em 1em;
    margin: 1.5em 0;
    color: #444;
    font-style: italic;
  }
  .doc-body code {
    font-family: "Courier New", Courier, monospace;
    font-size: 0.9em;
    background: #f5f5f5;
    padding: 0.15em 0.4em;
  }
  .doc-body pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 0.88em;
    background: #f5f5f5;
    padding: 1em;
    overflow-x: auto;
    white-space: pre-wrap;
    page-break-inside: avoid;
    margin-bottom: 1.2em;
  }
  .doc-body pre code { background: none; padding: 0; }
  .doc-body img {
    max-width: 100%;
    margin: 1.25em 0;
    page-break-inside: avoid;
  }
  .doc-body ul, .doc-body ol { padding-left: 1.5em; margin-bottom: 1.2em; }
  .doc-body li { margin-bottom: 0.3em; }
  .doc-body a { color: #C4451A; }
  .doc-body hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  .doc-body table {
    width: 100%; border-collapse: collapse; margin-bottom: 1.5em;
    font-size: 0.9em; page-break-inside: avoid;
  }
  .doc-body th, .doc-body td { border: 1px solid #ddd; padding: 0.5em 0.75em; text-align: left; }
  .doc-body th { background: #f9f9f9; font-weight: bold; }

  /* ── Footer ── */
  .doc-tags {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.8rem;
    color: #666;
  }
  .doc-footer {
    margin-top: 2rem;
    padding-top: 0.875rem;
    border-top: 2px solid #1a1a1a;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 0.7rem;
    color: #aaa;
    text-align: center;
  }
</style>
</head>
<body>
  <button class="save-btn" onclick="window.print()">Guardar como PDF</button>
  <div class="page">
    <p class="doc-brand">Artix Hub &nbsp;·&nbsp; ${escHtml(typeLabel)}</p>
    <h1 class="doc-title">${escHtml(title)}</h1>
    <p class="doc-meta">
      ${author ? `<span>${escHtml(author)}</span>` : ''}
      ${date ? `<span>${escHtml(date)}</span>` : ''}
    </p>
    <hr class="doc-rule"/>
    ${description ? `<p class="doc-desc">${escHtml(description)}</p>` : ''}
    <div class="doc-body">${body}</div>
    ${tags ? `<div class="doc-tags"><strong>Tags:</strong>&nbsp; ${escHtml(tags)}</div>` : ''}
    <div class="doc-footer">Generado con Artix Hub &nbsp;·&nbsp; ${new Date().getFullYear()}</div>
  </div>
</body>
</html>`);

  win.document.close();
  win.focus();
};

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
