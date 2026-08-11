import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Download, Loader2, CloudUpload, CheckCircle2,
  RotateCw, RotateCcw, FileText, ArrowRight, RotateCcw as ResetIcon,
} from 'lucide-react';
import { renderThumbnails, rotatePdf } from '../services/pdfEngine';
import { callWorker } from '../services/workerClient';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../services/documentService';

export default function Rotate() {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [rotations, setRotations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const paywall = usePaywall('rotate', 'rotations');
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
      setRotations(Array(thumbs.length).fill(0));
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

  const rotatePage = (index, delta) => {
    setRotations((prev) => prev.map((deg, i) => (i === index ? (deg + delta + 360) % 360 : deg)));
  };

  const rotateAll = (delta) => {
    setRotations((prev) => prev.map((deg) => (deg + delta + 360) % 360));
  };

  const resetRotations = () => {
    setRotations(Array(thumbnails.length).fill(0));
  };

  const buildRotationMap = () =>
    Object.fromEntries(rotations.map((deg, i) => (deg % 360 === 0 ? [i, 0] : [i, deg])));

  const handleApply = async () => {
    if (rotations.every((deg) => deg % 360 === 0)) {
      setErrorMsg('Rotate at least one page first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const bytes = await file.arrayBuffer();
      let outBytes;
      try {
        outBytes = await callWorker('rotate', { data: bytes, options: { rotations: buildRotationMap() } }, [bytes]);
      } catch {
        outBytes = await rotatePdf(await file.arrayBuffer(), buildRotationMap());
      }
      setResultBytes(outBytes);
      setResultName(`rotated-${file.name}`);
      setStep('done');
      paywall.afterSuccess();
    } catch (error) {
      console.error('Rotate failed:', error);
      setErrorMsg('Failed to rotate PDF. Please try again.');
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
    setRotations([]);
    setResultBytes(null);
    setIsSaved(false);
    setSaveError('');
    setErrorMsg('');
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="max-w-3xl w-full bg-white border border-slate-200 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6 dark:bg-slate-900 dark:border-slate-800">

        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <RotateCw className="w-8 h-8 text-purple-500" /> Rotate PDF
            </h2>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-purple-600 border border-purple-500/30 dark:bg-slate-800 dark:text-purple-400">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-1 w-full text-left dark:text-slate-400">
            {errorMsg && <span className="text-red-600 block mb-1 dark:text-red-400">{errorMsg}</span>}
            {step === 'upload' && 'Rotate individual pages or the whole document by 90, 180 or 270 degrees.'}
            {step === 'select' && 'Use the buttons below each page to rotate it. Preview updates instantly.'}
            {step === 'done' && 'Your pages were rotated successfully.'}
          </p>
        </div>

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
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{thumbnails.length} page(s)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => rotateAll(90)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:border-purple-500 hover:text-purple-600 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                  <RotateCw className="w-3.5 h-3.5" /> All +90°
                </button>
                <button
                  type="button"
                  onClick={resetRotations}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:border-purple-500 hover:text-purple-600 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                  <ResetIcon className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {thumbnails.map((thumb, idx) => (
                <div key={thumb.page} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="w-full">
                    <div className={`w-full flex items-center justify-center overflow-hidden rounded-lg bg-white ${
                      rotations[idx] % 180 === 0 ? 'aspect-[1/1.414]' : 'aspect-[1.414/1]'
                    }`}>
                      <img
                        src={thumb.url}
                        alt={`Page ${idx + 1}`}
                        className="max-w-full max-h-full object-contain"
                        style={{ transform: `rotate(${rotations[idx]}deg)` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full gap-1">
                    <span className="text-[11px] text-slate-500 font-semibold">P{idx + 1} · {rotations[idx]}°</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => rotatePage(idx, -90)}
                        title="Rotate counter-clockwise"
                        className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:text-purple-300"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(idx, 90)}
                        title="Rotate clockwise"
                        className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-600 transition-colors dark:border-slate-700 dark:text-slate-400 dark:hover:text-purple-300"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Applying rotations...</>
              ) : (
                <>Apply Rotations & Download <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </button>
          </div>
        )}

        {step === 'done' && resultBytes && (
          <div className="w-full flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mb-2 dark:text-green-400">
              <FileText className="w-10 h-10" />
            </div>
            <a
              href={URL.createObjectURL(new Blob([resultBytes], { type: 'application/pdf' }))}
              download={resultName}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-green-600/20"
            >
              <Download className="w-5 h-5 mr-2" /> Download PDF
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
              Rotate Another PDF
            </button>
          </div>
        )}
      </div>
      {paywall.premiumModal}
    </div>
  );
}