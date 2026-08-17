import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import {
  UploadCloud, Download, Loader2, AlertCircle, CloudUpload, CheckCircle2,
  Shuffle, ArrowRight, RotateCcw, GripVertical,
} from 'lucide-react';
import { renderThumbnails, reorderPdf } from '../services/pdfEngine';
import { callWorker } from '../services/workerClient';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../services/documentService';

export default function Reorder() {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [order, setOrder] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const paywall = usePaywall('reorder', 'reorders');
  const { user } = useAuth();

  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  const processFile = async (pdfFile) => {
    if (pdfFile.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are allowed.');
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
        thumbs = await renderThumbnails(await pdfFile.arrayBuffer(), 180);
      }
      setFile(pdfFile);
      setThumbnails(thumbs);
      setOrder(thumbs.map((_, i) => i));
      setStep('select');
    } catch (error) {
      console.error('Failed to read PDF:', error);
      setErrorMsg('Could not read this PDF. It may be corrupted or password-protected.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleDrop = (targetIndex) => {
    const dragged = dragItem.current;
    dragItem.current = null;
    if (targetIndex === null || targetIndex === undefined) return;
    if (dragged === null || dragged === undefined || dragged === targetIndex) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragged, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const resetOrder = () => {
    setOrder(thumbnails.map((_, i) => i));
  };

  const handleApply = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const bytes = await file.arrayBuffer();
      let outBytes;
      try {
        outBytes = await callWorker('reorder', { data: bytes, options: { order } }, [bytes]);
      } catch {
        outBytes = await reorderPdf(await file.arrayBuffer(), order);
      }
      setResultBytes(outBytes);
      setResultName(`reordered-${file.name}`);
      setStep('done');
      paywall.afterSuccess();
    } catch (error) {
      console.error('Reorder failed:', error);
      setErrorMsg('Failed to reorder PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (isSaving || isSaved || !resultBytes) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const uploadFile = new File([resultBytes], resultName, { type: 'application/pdf' });
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
    setOrder([]);
    setResultBytes(null);
    setIsSaved(false);
    setSaveError('');
    setErrorMsg('');
    setStep('upload');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="max-w-3xl w-full bg-white border border-slate-200 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6 dark:bg-slate-900 dark:border-slate-800">

        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Shuffle className="w-8 h-8 text-purple-500" /> Reorder Pages
            </h2>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-purple-600 border border-purple-500/30 dark:bg-slate-800 dark:text-purple-400">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-1 w-full text-left dark:text-slate-400">
            {step === 'upload' && 'Drag pages into the order you want, then download the rearranged PDF.'}
            {step === 'select' && 'Drag thumbnails to rearrange. The order numbers update live.'}
            {step === 'done' && 'Your pages were reordered successfully.'}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-4 rounded-lg text-sm font-medium bg-red-500/10 text-red-600 border border-red-500/20 flex items-start gap-2 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
          </div>
        )}

        {step === 'upload' && (
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={onDrop}
            className={`w-full border-2 border-dashed transition-all duration-200 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer ${
              isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-200 hover:border-purple-500 bg-slate-100/60 dark:border-slate-700 dark:bg-slate-950/50'
            }`}
          >
            <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {isDragging ? 'Drop PDF here...' : 'Drag & drop a PDF here, or click to browse'}
            </span>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" /> Reading pages...
          </div>
        )}

        {step === 'select' && !isLoading && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{order.length} pages</span>
              <button
                type="button"
                onClick={resetOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:border-purple-500 hover:text-purple-600 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Order
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {order.map((srcIndex, pos) => (
                <div
                  key={srcIndex}
                  draggable
                  onDragStart={() => { dragItem.current = pos; }}
                  onDragEnter={() => { dragOverItem.current = pos; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => handleDrop(dragOverItem.current)}
                  onDrop={(e) => { e.preventDefault(); handleDrop(pos); }}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-white p-3 cursor-grab active:cursor-grabbing transition-colors border-slate-200 hover:border-purple-500 dark:bg-slate-950/60 dark:border-slate-800"
                >
                  <div className="w-full rounded-lg overflow-hidden bg-white aspect-[1/1.414] flex items-center justify-center">
                    <img src={thumbnails[srcIndex].url} alt={`Page ${srcIndex + 1}`} className="max-w-full max-h-full object-contain" draggable={false} />
                  </div>
                  <div className="flex items-center justify-between w-full gap-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <GripVertical className="w-3 h-3 text-slate-500" />
                      <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        pos === srcIndex ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-purple-600 text-white'
                      }`}>
                        {pos + 1}
                      </span>
                      P{srcIndex + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={paywall.isLocked ? paywall.openModal : handleApply}
              disabled={isProcessing}
              className={`w-full text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all ${
                paywall.isLocked
                  ? 'bg-slate-200 text-purple-600 cursor-not-allowed dark:bg-slate-800 dark:text-purple-400'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-600/20'
              }`}
            >
              {paywall.isLocked ? (
                'Paused - Upgrade to continue'
              ) : isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Reordering pages...</>
              ) : (
                <>Apply New Order & Download <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </button>
          </div>
        )}

        {step === 'done' && resultBytes && (
          <div className="w-full flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mb-2 dark:text-green-400">
              <Download className="w-10 h-10" />
            </div>
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
                    ? 'bg-slate-200 text-green-600 border border-green-500/30 cursor-default dark:bg-slate-800 dark:text-green-400'
                    : 'bg-slate-100 hover:bg-purple-600/15 text-slate-800 border border-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-purple-600/20 dark:text-white dark:border-slate-700'
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
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-purple-600 py-2 transition-colors dark:text-slate-400 dark:hover:text-purple-300">
                Log in to save to your documents
              </Link>
            )}
            {saveError && (
              <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full text-center dark:text-red-400">{saveError}</p>
            )}

            <button onClick={resetFlow} className="text-sm font-medium text-slate-600 hover:text-slate-900 mt-2 transition-colors dark:text-slate-400 dark:hover:text-white">
              Reorder Another PDF
            </button>
          </div>
        )}
      </div>
      {paywall.premiumModal}
      </div>
    </PageTransition>
  );
}