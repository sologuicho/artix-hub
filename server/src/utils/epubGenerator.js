const JSZip = require('jszip');

function escapeXml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toXhtml(html) {
  return (html || '')
    .replace(/<br\s*>/gi, '<br/>')
    .replace(/<hr\s*>/gi, '<hr/>')
    .replace(/<img([^>]*[^/])>/gi, '<img$1/>')
    .replace(/<input([^>]*[^/])>/gi, '<input$1/>')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

async function generateEpub({ title, author, content, description, date }) {
  const zip = new JSZip();
  const uid = `artix-${Date.now()}`;
  const pubDate = date ? new Date(date).toISOString() : new Date().toISOString();
  const pubDateFormatted = new Date(pubDate).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.folder('META-INF').file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder('OEBPS');

  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>es</dc:language>
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:date>${pubDate}</dc:date>
    ${description ? `<dc:description>${escapeXml(description)}</dc:description>` : ''}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="chapter"/>
  </spine>
</package>`);

  oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${escapeXml(title)}</title></head>
<body>
<nav epub:type="toc"><h1>Contenido</h1>
<ol><li><a href="chapter.xhtml">${escapeXml(title)}</a></li></ol>
</nav>
</body>
</html>`);

  oebps.file('chapter.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1 class="doc-title">${escapeXml(title)}</h1>
    ${author ? `<p class="doc-author">Por ${escapeXml(author)}</p>` : ''}
    ${pubDateFormatted ? `<p class="doc-date">${pubDateFormatted}</p>` : ''}
    <hr class="doc-divider"/>
    ${description ? `<blockquote class="doc-desc">${escapeXml(description)}</blockquote>` : ''}
    <div class="doc-body">${toXhtml(content)}</div>
    <hr class="doc-divider"/>
    <p class="doc-footer">Artix Hub · artixhub.com</p>
  </div>
</body>
</html>`);

  oebps.file('style.css', `
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.75;
  color: #1a1a1a;
  margin: 1.5em;
}
.doc-title {
  font-size: 1.85em;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 0.4em;
}
.doc-author {
  color: #555;
  font-size: 0.95em;
  margin-bottom: 0.2em;
}
.doc-date {
  color: #888;
  font-size: 0.82em;
  margin-bottom: 0.5em;
}
.doc-divider {
  border: none;
  border-top: 1px solid #ccc;
  margin: 1.25em 0;
}
.doc-desc {
  border-left: 3px solid #C4451A;
  padding-left: 1em;
  font-style: italic;
  color: #444;
  margin: 1em 0 1.5em 0;
}
.doc-body p { margin-bottom: 1.2em; }
.doc-body h2 { font-size: 1.3em; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }
.doc-body h3 { font-size: 1.1em; margin-top: 1.25em; margin-bottom: 0.4em; font-weight: bold; }
.doc-body blockquote {
  border-left: 3px solid #C4451A;
  padding-left: 1em;
  font-style: italic;
  color: #444;
  margin: 1em 0;
}
.doc-body code {
  font-family: monospace;
  font-size: 0.88em;
  background: #f4f4f4;
  padding: 0.1em 0.3em;
}
.doc-body pre {
  font-family: monospace;
  font-size: 0.85em;
  background: #f4f4f4;
  padding: 0.75em;
  overflow-x: auto;
}
.doc-body ul, .doc-body ol { padding-left: 1.5em; margin-bottom: 1.2em; }
.doc-body li { margin-bottom: 0.3em; }
.doc-body img { max-width: 100%; margin: 1em 0; }
.doc-footer {
  font-size: 0.75em;
  color: #aaa;
  text-align: center;
  margin-top: 2em;
}
`);

  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

module.exports = { generateEpub };
