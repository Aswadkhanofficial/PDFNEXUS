import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  UploadCloud, FileText, Download, Loader2, AlertCircle, CloudUpload,
  CheckCircle2, Scissors, CheckSquare, Square, ArrowRight,
} from 'lucide-react';
import { splitPdf } from '../services/pdfEngine';
import { callWorker } from '../services/workerClient';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../services/documentService';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const renderThumbnails = async (bytes) => {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
  const items = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1, 180 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    items.push({ page: i, url: canvas.toDataURL('image/jpeg', 0.7) });
    page.cleanup();
  }
  await pdf.destroy();
  return items;
};

export default function Split() {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const paywall = usePaywall('split', 'splits');
  const { user } = useAuth();

  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  const processFile = async (pdfFile) => {
    if (pdfFile.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    setStep('upload');
    try {
      const bytes = await pdfFile.arrayBuffer();
      let thumbs;
      try {
        const blobs = await callWorker('thumbs', { data: bytes, options: { width: 180 } }, [bytes]);
        thumbs = blobs.map((blob, i) => ({ page: i + 1, url: URL.createObjectURL(blob) }));
      } catch {
        thumbs = await renderThumbnails(await pdfFile.arrayBuffer());
      }
      setFile(pdfFile);
      setThumbnails(thumbs);
      setSelectedPages([]);
      setStep('select');
    } catch (error) {
      console.error('Failed to read PDF:', error);
      setErrorMsg('Could not read this PDF. It may be corrupted or password-protected.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const togglePage = (page) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const handleExtract = async () => {
    if (selectedPages.length === 0) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const bytes = await file.arrayBuffer();
      let outBytes;
      try {
        outBytes = await callWorker('split', { data: bytes, options: { pages: selectedPages } }, [bytes]);
      } catch {
        outBytes = await splitPdf(await file.arrayBuffer(), selectedPages);
      }
      const pagesLabel = selectedPages.map((p) => `p${p}`).join('-');
      setResultName(`PDFNexus_Split_${pagesLabel}.pdf`);
      setResultBytes(outBytes);
      setStep('done');
      paywall.afterSuccess();
    } catch (error) {
      console.error('Split failed:', error);
      setErrorMsg('Failed to extract pages. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (isSaving || isSaved || !resultBytes) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const blob = new Blob([resultBytes], { type: 'application/pdf' });
      const uploadFile = new File([blob], resultName, { type: 'application/pdf' });
      await saveDocument(uploadFile, resultName);
      setIsSaved(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetFlow = () => {
    setFile(null);
    setThumbnails([]);
    setSelectedPages([]);
    setResultBytes(null);
    setIsSaved(false);
    setSaveError('');
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6">

        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Scissors className="w-8 h-8 text-purple-500" /> Split PDF
            </h2>
            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 border border-purple-500/30">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1 w-full text-left">
            {step === 'upload' && 'Upload a PDF to preview its pages.'}
            {step === 'select' && `Click the pages you want to keep (${selectedPages.length} selected).`}
            {step === 'done' && 'Your selected pages were extracted successfully.'}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-4 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
          </div>
        )}

        {step === 'select' && thumbnails.length > 0 && (
          <div className="w-full animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {file.name} · {thumbnails.length} page{thumbnails.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSelectedPages([])}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/60 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  onClick={() => setSelectedPages(thumbnails.map((t) => t.page))}
                  className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg bg-slate-800/60 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
              {thumbnails.map((t) => {
                const isSelected = selectedPages.includes(t.page);
                return (
                  <button
                    key={t.page}
                    onClick={() => togglePage(t.page)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/40'
                        : 'border-slate-700 hover:border-purple-500/50'
                    }`}
                  >
                    <img src={t.url} alt={`Page ${t.page}`} className="w-full bg-white" />
                    <span
                      className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${
                        isSelected ? 'bg-purple-600 text-white' : 'bg-slate-950/80 text-slate-300'
                      }`}
                    >
                      {t.page}
                    </span>
                    {isSelected && (
                      <span className="absolute inset-0 bg-purple-600/20 pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={paywall.isLocked ? paywall.openModal : handleExtract}
              disabled={isProcessing || (paywall.isLocked ? false : selectedPages.length === 0)}
              className={`w-full text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-purple-600/20 ${
                paywall.isLocked
                  ? 'bg-slate-800 text-purple-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
              }`}
            >
              {paywall.isLocked ? (
                'Paused - Upgrade to continue'
              ) : isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Extracting...</>
              ) : (
                <>Extract Selected Pages <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </button>
          </div>
        )}

        {step === 'upload' && (
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={onDrop}
            className={`w-full border-2 border-dashed transition-all duration-200 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer ${
              isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 bg-slate-950/50'
            }`}
          >
            {isLoading ? (
              <><Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" /><span className="font-medium text-slate-300">Generating page previews...</span></>
            ) : (
              <>
                <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className="font-medium text-slate-200">
                  {isDragging ? 'Drop your PDF here...' : 'Drag & drop a PDF here, or click to browse'}
                </span>
                <span className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Page thumbnails render in your browser
                </span>
              </>
            )}
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={isLoading} />
          </label>
        )}

        {step === 'done' && resultBytes && (
          <div className="w-full flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2">
              <Download className="w-10 h-10" />
            </div>
            <span className="text-sm text-slate-400 -mt-2">{resultName}</span>
            <a
              href={URL.createObjectURL(new Blob([resultBytes], { type: 'application/pdf' }))}
              download={resultName}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-green-600/20"
            >
              Download PDF
            </a>

            {user ? (
              <button
                onClick={handleSaveToCloud}
                disabled={isSaving || isSaved}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-lg transition-all ${
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
              <Link to="/login" className="text-sm font-semibold text-slate-400 hover:text-purple-300 py-2 transition-colors">
                Log in to save to your documents
              </Link>
            )}
            {saveError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full text-center">{saveError}</p>
            )}

            <button onClick={resetFlow} className="text-sm font-medium text-slate-400 hover:text-white mt-2 transition-colors">
              Split Another PDF
            </button>
          </div>
        )}

      </div>
      {paywall.premiumModal}
    </div>
  );
}