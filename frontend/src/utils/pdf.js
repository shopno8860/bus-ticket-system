import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures a DOM element and exports it as a high-quality PDF
 * @param {string} elementId - The ID of the HTML element to capture
 * @param {string} filename - The name of the resulting PDF file
 * @returns {Promise<void>}
 */
export const downloadPDF = async (elementId, filename = 'ticket.pdf') => {
  const element = document.getElementById(elementId);
  
  if (!element) {
    const errorMsg = `Error: Element with id "${elementId}" not found.`;
    console.error(errorMsg);
    alert(errorMsg);
    return;
  }

  try {
    console.log('Generating pixel-perfect PDF for:', elementId);
    
    const canvas = await html2canvas(element, {
      scale: 2, 
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // 1. Find all style tags and replace oklch with a fallback hex/rgb
        // html2canvas crashes on oklch, so we must strip it from the CSS
        const styleTags = clonedDoc.getElementsByTagName('style');
        for (const tag of styleTags) {
          if (tag.innerHTML) {
            // This regex finds oklch(any values) and replaces it with a generic gray
            // or we could try to be smarter, but a generic fallback is safer for stability
            tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#666');
          }
        }

        // 2. Ensure the ticket itself is perfectly styled
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.border = '1px solid #e5e7eb';
          clonedElement.style.margin = '0';
          clonedElement.style.width = '1000px'; // Consistent width for capture
        }
      }
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

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

