import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

async function renderPdfFromElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc) => {
      const styleTags = clonedDoc.getElementsByTagName('style');
      for (const tag of styleTags) {
        if (tag.innerHTML) {
          tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#666');
        }
      }

      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.boxShadow = 'none';
        clonedElement.style.border = '1px solid #e5e7eb';
        clonedElement.style.margin = '0';
        clonedElement.style.width = '1000px';
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= usableHeight;
  }

  return pdf;
}

/**
 * Captures a DOM element and exports it as a high-quality PDF
 * @param {string} elementId - The ID of the HTML element to capture
 * @param {string} filename - The name of the resulting PDF file
 * @returns {Promise<void>}
 */
export const downloadPDF = async (elementId, filename = 'ticket.pdf') => {
  try {
    console.log('Generating pixel-perfect PDF for:', elementId);
    const pdf = await renderPdfFromElement(elementId);
    pdf.save(filename);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    // If it still fails with oklch, try the most aggressive fallback: simple print
    if (error.message && error.message.includes('oklch')) {
      alert('Your browser is using modern CSS colors (oklch) that are not yet supported for PDF download. Please use the "Print" button and select "Save as PDF" for a perfect result.');
    } else {
      alert(`Failed to generate PDF. Technical details: ${error.message || 'Unknown error'}`);
    }
  }
};

export const generatePDFBlob = async (elementId) => {
  const pdf = await renderPdfFromElement(elementId);
  return pdf.output('blob');
};

