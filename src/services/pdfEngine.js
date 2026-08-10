import { PDFDocument } from 'pdf-lib';

/**
 * Merges multiple PDF file arrays into a single PDF document.
 * @param {File[]} files - Array of PDF files from the input.
 * @returns {Promise<Uint8Array>} - The merged PDF as a byte array.
 */
export async function mergePdfs(files) {
  if (!files || files.length === 0) throw new Error("No files provided.");

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  return await mergedPdf.save();
}

/**
 * Extracts the given 1-based page numbers from a PDF into a new document.
 * @param {ArrayBuffer|Uint8Array} bytes - The source PDF bytes.
 * @param {number[]} pageNumbers - 1-based page numbers to keep.
 * @returns {Promise<Uint8Array>} - The extracted PDF as a byte array.
 */
export async function splitPdf(bytes, pageNumbers) {
  const srcPdf = await PDFDocument.load(bytes);
  const totalPages = srcPdf.getPageCount();
  const indexes = pageNumbers
    .filter((p) => p >= 1 && p <= totalPages)
    .map((p) => p - 1);

  if (indexes.length === 0) throw new Error('No valid pages selected.');

  const outPdf = await PDFDocument.create();
  const copiedPages = await outPdf.copyPages(srcPdf, indexes);
  copiedPages.forEach((page) => outPdf.addPage(page));

  return await outPdf.save();
}

/**
 * Converts multiple JPG/PNG image files into a single PDF (one page per image).
 * @param {File[]} files - The image files (image/jpeg or image/png).
 * @returns {Promise<Uint8Array>} - The generated PDF as a byte array.
 */
export async function imagesToPdf(files) {
  if (!files || files.length === 0) throw new Error('No images provided.');

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.name}`);
    }
    const bytes = await file.arrayBuffer();
    const image = file.type === 'image/png'
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }

  return await pdfDoc.save();
}

/**
 * Removes a specific page from a PDF.
 * @param {File} file - The original PDF file.
 * @param {number} pageIndex - The 0-based index of the page to remove.
 * @returns {Promise<Uint8Array>} - The modified PDF as a byte array.
 */
export async function deletePdfPage(file, pageIndex) {
  if (!file) throw new Error("No file provided.");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  const totalPages = pdf.getPageCount();
  if (pageIndex < 0 || pageIndex >= totalPages) {
    throw new Error("Invalid page index.");
  }

  pdf.removePage(pageIndex);
  return await pdf.save();
}