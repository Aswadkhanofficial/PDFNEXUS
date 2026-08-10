import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import Draggable from 'react-draggable';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import SignaturePad from '../components/SignaturePad';
import { FileUp, Download, Eraser, ShieldCheck, PenTool, Image as ImageIcon, CloudUpload, Loader2, CheckCircle2, Lock, Move, RotateCcw, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { callWorker } from '../services/workerClient';
import { useAuth } from '../context/AuthContext';
import { usePaywall } from '../hooks/usePaywall';
import { useToast } from '../components/Toast';
import { saveDocument } from '../services/documentService';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const PAGE_PREVIEW_WIDTH = 640;

export default function Sign() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const [sigImageFile, setSigImageFile] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null); // { width, height, pageCount } in PDF points
  const [sigPos, setSigPos] = useState(null); // { x, y } px inside preview wrapper
  const [sigSize, setSigSize] = useState(null); // { w, h } px display size
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signedPdfBytes, setSignedPdfBytes] = useState(null);
  const [signedFileName, setSignedFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const sigPadRef = useRef(null);
  const sigRef = useRef(null);
  const wrapperRef = useRef(null);
  const placementRef = useRef(false);
  const { user } = useAuth();
  const paywall = usePaywall('sign', 'signatures');
  const { error: toastError } = useToast();

  useEffect(() => {
    if (!signatureDataUrl || !pdfMeta) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const displayH = (PAGE_PREVIEW_WIDTH * pdfMeta.height) / pdfMeta.width;
      const w = Math.min(180, Math.round(PAGE_PREVIEW_WIDTH * 0.28));
      const h = Math.round(w * (img.naturalHeight / Math.max(img.naturalWidth, 1)));
      setSigSize({ w, h });
      if (!placementRef.current) {
        placementRef.current = true;
        setSigPos({
          x: Math.round(PAGE_PREVIEW_WIDTH * 0.045),
          y: Math.round(displayH * 0.55),
        });
      }
    };
    img.src = signatureDataUrl;
    return () => {
      cancelled = true;
    };
  }, [signatureDataUrl, pdfMeta]);

  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  const loadPdfMeta = async (file) => {
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const { width, height } = doc.getPage(0).getSize();
      setPdfMeta({ width, height, pageCount: doc.getPageCount() });
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      toastError('Could not read this PDF. It may be corrupted or password-protected.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSignatureDataUrl(null);
      setSigPos(null);
      setSigSize(null);
      setPageReady(false);
      setPdfMeta(null);
      placementRef.current = false;
      setSignedPdfBytes(null);
      setIsSaved(false);
      setSaveError('');
      loadPdfMeta(file);
    }
  };

  const handleSigImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        toastError('Please upload a PNG or JPG signature image.');
        return;
      }
      setSigImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setSignatureDataUrl(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleClearPad = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setSignatureDataUrl(null);
    }
  };

  const captureDrawnSignature = () => {
    if (!sigPadRef.current) return;
    if (sigPadRef.current.isEmpty()) {
      setSignatureDataUrl(null);
      return;
    }
    setSignatureDataUrl(sigPadRef.current.getSignatureData().pngDataUrl);
  };

  const resetSigPosition = () => {
    if (!pdfMeta) return;
    const displayH = (PAGE_PREVIEW_WIDTH * pdfMeta.height) / pdfMeta.width;
    setSigPos({
      x: Math.round(PAGE_PREVIEW_WIDTH * 0.045),
      y: Math.round(displayH * 0.55),
    });
  };

  const handleApplySignature = async () => {
    if (!selectedFile) {
      toastError('Please upload a PDF document first.');
      return;
    }
    if (!signatureDataUrl) {
      toastError('Please create or upload your signature first.');
      return;
    }
    if (!pageReady || sigPos === null) {
      toastError('Please wait for the document preview to finish loading.');
      return;
    }

    setIsSigning(true);
    try {
      const existingPdfBytes = await selectedFile.arrayBuffer();
      const imgBytes = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
      const isJpeg = signatureDataUrl.includes('image/jpeg') || signatureDataUrl.includes('image/jpg');

      const { width: pageW, height: pageH } = pdfMeta;
      const wrapperEl = wrapperRef.current;
      const sigEl = sigRef.current;
      if (!wrapperEl || !sigEl || wrapperEl.getBoundingClientRect().width === 0) {
        throw new Error('Document preview is not rendered yet.');
      }
      const wrapperRect = wrapperEl.getBoundingClientRect();
      const sigRect = sigEl.getBoundingClientRect();
      const scaleX = pageW / wrapperRect.width; // DOM px -> PDF points (horizontal)
      const scaleY = pageH / wrapperRect.height; // DOM px -> PDF points (vertical)
      const x = (sigRect.left - wrapperRect.left) * scaleX;
      const width = sigRect.width * scaleX;
      const height = sigRect.height * scaleY;
      const y = pageH - (sigRect.top - wrapperRect.top) * scaleY - height; // PDF origin is bottom-left

      let pdfBytes;
      try {
        pdfBytes = await callWorker(
          'sign',
          { data: existingPdfBytes, options: { img: imgBytes, x, y, width, height, isJpeg } },
          [existingPdfBytes, imgBytes],
        );
      } catch {
        const pdfDoc = await PDFDocument.load(await selectedFile.arrayBuffer());
        const firstPage = pdfDoc.getPages()[0]; // Placing signature on the first page
        const freshImg = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
        const embeddedImage = isJpeg ? await pdfDoc.embedJpg(freshImg) : await pdfDoc.embedPng(freshImg);
        firstPage.drawImage(embeddedImage, { x, y, width, height });
        pdfBytes = await pdfDoc.save();
      }

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `signed-${selectedFile.name}`;
      link.click();
      setSignedPdfBytes(pdfBytes);
      setSignedFileName(`signed-${selectedFile.name}`);
      paywall.afterSuccess();
    } catch (error) {
      console.error('Error signing PDF:', error);
      toastError('Failed to sign PDF. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (isSaving || isSaved || !signedPdfBytes) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const file = new File([signedPdfBytes], signedFileName, { type: 'application/pdf' });
      await saveDocument(file, signedFileName);
      setIsSaved(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-500/20 p-3 rounded-xl text-purple-400">
            <PenTool className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white">E-Signature Workspace</h1>
              <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 border border-purple-500/30">
                {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
              </div>
            </div>
            <p className="text-sm text-slate-400">Upload your document, drag your signature into place, and download the signed PDF.</p>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">1. Select PDF Document</label>
          <div className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-5 text-center transition-colors cursor-pointer relative bg-slate-950/50">
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
            <FileUp className="w-7 h-7 text-purple-400 mx-auto mb-2" />
            {selectedFile ? (
              <p className="text-sm text-purple-300 font-semibold">{selectedFile.name}</p>
            ) : (
              <>
                <p className="text-sm text-slate-300">Click to upload target PDF</p>
                <p className="text-xs text-slate-500 mt-1">PDF files up to 50MB</p>
              </>
            )}
          </div>
        </div>

        {/* Signature Input Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">2. Choose Signature Source</label>
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'draw' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool className="w-4 h-4" /> Draw Signature
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upload' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Upload Image
            </button>
          </div>
        </div>

        {/* Conditional Signature Input UI */}
        <div className="mb-6">
          {activeTab === 'draw' ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400">Draw inside the box below - it will appear on the document instantly</span>
                <button onClick={handleClearPad} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors">
                  <Eraser className="w-3.5 h-3.5" /> Clear Pad
                </button>
              </div>
              <SignaturePad ref={sigPadRef} onChange={captureDrawnSignature} />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-400 mb-2">Upload transparent PNG or JPG signature image</label>
              <div className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-6 text-center transition-colors cursor-pointer relative bg-slate-950/50">
                <input type="file" accept="image/png, image/jpeg" onChange={handleSigImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <ImageIcon className="w-7 h-7 text-purple-400 mx-auto mb-2" />
                {sigImageFile ? (
                  <p className="text-sm text-purple-300 font-semibold">{sigImageFile.name}</p>
                ) : (
                  <p className="text-sm text-slate-300">Click to upload signature image</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Visual Placement Section */}
        {selectedFile && signatureDataUrl && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">3. Position Signature on the Document</label>
              {pdfMeta && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 border border-slate-700 rounded-full px-2.5 py-1">
                  <FileText className="w-3.5 h-3.5 text-purple-400" /> Page 1 of {pdfMeta.pageCount}
                </span>
              )}
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 shadow-inner">
              <div className="overflow-auto max-h-[70vh] rounded-xl">
                <div ref={wrapperRef} className="relative mx-auto w-fit">
                  <Document
                    file={selectedFile}
                    onLoadError={() => toastError('Failed to render document preview.')}
                    loading={
                      <div className="w-[640px] aspect-[1/1.414] rounded-xl animate-pulse bg-slate-900 border border-slate-800" />
                    }
                    error={
                      <div className="w-[640px] aspect-[1/1.414] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-8 text-center text-sm text-slate-400">
                        Could not render this PDF. It may be corrupted or password-protected.
                      </div>
                    }
                  >
                    <Page
                      pageNumber={1}
                      width={PAGE_PREVIEW_WIDTH}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={() => setPageReady(true)}
                      className="rounded-xl shadow-2xl"
                      loading={
                        <div className="w-[640px] aspect-[1/1.414] rounded-xl animate-pulse bg-slate-900 border border-slate-800" />
                      }
                    />
                  </Document>
                  {sigPos && sigSize && (
                    <Draggable
                      nodeRef={sigRef}
                      bounds="parent"
                      position={sigPos}
                      disabled={isSigning}
                      onStart={() => setIsDraggingSig(true)}
                      onDrag={(_, data) => setSigPos({ x: data.x, y: data.y })}
                      onStop={() => setIsDraggingSig(false)}
                    >
                      <div
                        ref={sigRef}
                        className={`absolute left-0 top-0 z-10 touch-none ${
                          isDraggingSig ? 'cursor-grabbing ring-4 ring-purple-500/40 rounded-sm' : 'cursor-move'
                        }`}
                      >
                        <img
                          src={signatureDataUrl}
                          alt="Your signature"
                          draggable={false}
                          style={{ width: sigSize.w, height: sigSize.h }}
                          className="max-w-none drop-shadow-lg"
                        />
                      </div>
                    </Draggable>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2.5 px-1">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-purple-400" /> Drag the signature to your desired spot
                </p>
                <button
                  type="button"
                  onClick={resetSigPosition}
                  className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Position
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={paywall.isLocked ? paywall.openModal : handleApplySignature}
          disabled={isSigning}
          className={`w-full disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
            paywall.isLocked
              ? 'bg-slate-800 text-purple-400 cursor-not-allowed shadow-none border border-slate-700'
              : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20'
          }`}
        >
          {paywall.isLocked ? (
            <><Lock className="w-4 h-4" /> Paused - Upgrade to continue</>
          ) : isSigning ? (
            "Processing Signature..."
          ) : (
            <>Apply Signature & Download <Download className="w-4 h-4" /></>
          )}
        </button>

        {signedPdfBytes && (
          <div className="mt-4 space-y-3">
            {user ? (
              <button
                onClick={handleSaveToCloud}
                disabled={isSaving || isSaved}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition-all ${
                  isSaved
                    ? 'bg-slate-800 text-green-400 border border-green-500/30 cursor-default'
                    : 'bg-slate-800 hover:bg-purple-600/20 text-white border border-slate-700 disabled:opacity-50'
                }`}
              >
                {isSaving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                ) : isSaved ? (
                  <><CheckCircle2 className="w-5 h-5" /> Saved to My Documents</>
                ) : (
                  <><CloudUpload className="w-5 h-5" /> Save to My Documents</>
                )}
              </button>
            ) : (
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-purple-300 py-2 transition-colors"
              >
                <CloudUpload className="w-4 h-4" /> Log in to save to your documents
              </Link>
            )}
            {saveError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                {saveError}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-green-400" /> Secure client-side processing. Your files never leave your device.
        </div>
      </div>
      {paywall.premiumModal}
    </div>
  );
}