import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Genera un PDF de un artículo o investigación
 * @param {Object} content - Objeto con la información del contenido
 * @param {string} content.title - Título del artículo/investigación
 * @param {string} content.content - Contenido HTML del artículo
 * @param {string} content.author - Nombre del autor
 * @param {string} content.date - Fecha de publicación
 * @param {string} content.description - Descripción
 * @param {Array} content.tags - Tags del artículo
 * @param {string} type - Tipo de contenido ('article' o 'research')
 */
export const generatePDF = async (content, type = 'article') => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Función para agregar nueva página si es necesario
    const checkPageBreak = (requiredHeight) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        // Agregar encabezado en nueva página
        addHeader();
      }
    };

    // Función para agregar encabezado
    const addHeader = () => {
      doc.setFillColor(59, 130, 246); // Blue-600
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Powered by Artix Hub', pageWidth - margin, 10, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      yPosition = 20;
    };

    // Agregar primera página con encabezado
    addHeader();

    // Título
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(content.title || 'Sin título', contentWidth);
    titleLines.forEach((line) => {
      checkPageBreak(10);
      doc.text(line, margin, yPosition);
      yPosition += 8;
    });

    yPosition += 5;

    // Información del autor y fecha
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const authorInfo = [];
    if (content.author) authorInfo.push(`Autor: ${content.author}`);
    if (content.date) authorInfo.push(`Fecha: ${new Date(content.date).toLocaleDateString()}`);
    
    if (authorInfo.length > 0) {
      checkPageBreak(8);
      doc.text(authorInfo.join(' | '), margin, yPosition);
      yPosition += 8;
    }

    yPosition += 5;

    // Descripción
    if (content.description) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(60, 60, 60);
      
      const descLines = doc.splitTextToSize(content.description, contentWidth);
      descLines.forEach((line) => {
        checkPageBreak(8);
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
    }

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    checkPageBreak(5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Contenido (convertir HTML a texto plano)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.content || '';
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const contentLines = doc.splitTextToSize(plainText, contentWidth);
    contentLines.forEach((line) => {
      checkPageBreak(7);
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    // Tags
    if (content.tags && content.tags.length > 0) {
      yPosition += 10;
      checkPageBreak(15);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Tags:', margin, yPosition);
      yPosition += 6;
      
      doc.setFont('helvetica', 'normal');
      const tagsText = content.tags.map(tag => `#${tag}`).join(' ');
      const tagsLines = doc.splitTextToSize(tagsText, contentWidth);
      tagsLines.forEach((line) => {
        checkPageBreak(6);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
    }

    // Pie de página en todas las páginas
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Descargar PDF
    const fileName = `${type}_${content.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document'}.pdf`;
    doc.save(fileName);

    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Genera PDF usando html2canvas (método alternativo que preserva mejor el formato)
 */
export const generatePDFFromHTML = async (elementId, title, type = 'article') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const pdfWidth = pageWidth - 40; // Margen
    const pdfHeight = pdfWidth / ratio;

    let heightLeft = pdfHeight;
    let position = 0;

    // Agregar encabezado en primera página
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Powered by Artix Hub', pageWidth - 20, 10, { align: 'right' });

    pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
    heightLeft -= pageHeight - 40;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      
      // Agregar encabezado en páginas siguientes
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Powered by Artix Hub', pageWidth - 20, 10, { align: 'right' });
      
      pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
      heightLeft -= pageHeight - 40;
    }

    const fileName = `${type}_${title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'document'}.pdf`;
    pdf.save(fileName);

    return { success: true };
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    return { success: false, error: error.message };
  }
};




