import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPdf(
  element: HTMLElement,
  filename = "tailored-resume.pdf",
): Promise<void> {
  const originalBoxShadow = element.style.boxShadow;
  element.style.boxShadow = "none";

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5, // High-DPI resolution for crisp text & line rendering
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    } else {
      let position = 0;
      let remainingHeight = pdfHeight;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
        position -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
        }
      }
    }

    pdf.save(filename);
  } finally {
    element.style.boxShadow = originalBoxShadow;
  }
}

export async function elementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const originalBoxShadow = element.style.boxShadow;
  element.style.boxShadow = "none";

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    } else {
      let position = 0;
      let remainingHeight = pdfHeight;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
        position -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
        }
      }
    }

    return pdf.output("blob");
  } finally {
    element.style.boxShadow = originalBoxShadow;
  }
}

