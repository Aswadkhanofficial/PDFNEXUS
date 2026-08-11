import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Download, Loader2, AlertCircle, CloudUpload, CheckCircle2,
  FileArchive, ArrowRight, RotateCcw,
} from 'lucide-react';
import { compressPdf } from '../services/pdfEngine';
import { callWorker } from '../services/workerClient';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../services/documentService';

const PRESETS = {
  slight: { scale: 1, quality: 0.82, label: 'Slight', desc: 'Minimal quality loss' },
  balanced: { scale: 0.75, quality: 0.7, label: 'Balanced', desc: 'Good quality / size trade-off' },
  strong: { scale: 0.5, quality: 0.5, label: 'Strong', desc: 'Smallest file size' },
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function Compress() {
  const [file, setFile] = useState(null);
  const [preset, setPreset] = useState('balanced');
  const [step, setStep] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const paywall = usePaywall('compress', 'compressions');
  const { user } = useAuth();

  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const pdfFile = e.target.files[0];
      if (pdfFile.type !== 'application/pdf') {
        setErrorMsg('Only PDF files are allowed.');
        return;
      }
      setFile(pdfFile);
      setErrorMsg('');
      setStep('upload');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const pdfFile = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!pdfFile) return;
    if (pdfFile.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are allowed.');
      return;
    }
    setFile(pdfFile);
    setErrorMsg('');
    setStep('upload');
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const config = PRESETS[preset];
      const bytes = await file.arrayBuffer();
      let outBytes;
      try {
        outBytes = await callWorker('compress', { data: bytes, options: config }, [bytes]);
      } catch {
        outBytes = await compressPdf(await file.arrayBuffer(), config);
      }
      setResultBytes(outBytes);
      setResultName(`compressed-${file.name}`);
      setStep('done');
      paywall.afterSuccess();
    } catch (error) {
      console.error('Compress failed:', error);
      setErrorMsg('Failed to compress PDF. Please try again.');
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
    setResultBytes(null);
    setIsSaved(false);
    setSaveError('');
    setErrorMsg('');
    setStep('upload');
  };

  const reductionPct = file && resultBytes
    ? Math.round((1 - resultBytes.length / file.size) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6 dark:bg-slate-900 dark:border-slate-800">

        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <FileArchive className="w-8 h-8 text-purple-500" /> Compress PDF
            </h2>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-purple-600 border border-purple-500/30 dark:bg-slate-800 dark:text-purple-400">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-1 w-full text-left dark:text-slate-400">
            {step === 'upload' && 'Reduce PDF file size by re-encoding pages as optimized images.'}
            {step === 'done' && 'Your PDF was compressed successfully.'}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-4 rounded-lg text-sm font-medium bg-red-500/10 text-red-600 border border-red-500/20 flex items-start gap-2 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
          </div>
        )}

        {step === 'upload' && (
          <div className="w-full flex flex-col gap-4">
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

            {file && (
              <>
                <div className="bg-slate-100/80 p-4 rounded-lg flex items-center justify-between border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileArchive className="w-4 h-4 text-purple-600 dark:text-purple-400" /> {file.name}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums dark:text-slate-400">{formatBytes(file.size)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreset(key)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        preset === key
                          ? 'border-purple-500 bg-purple-600/20 text-purple-700 dark:text-purple-200'
                          : 'border-slate-200 bg-slate-100/80 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <span className="block text-sm font-bold">{p.label}</span>
                      <span className="block text-[11px] text-slate-600 mt-0.5 dark:text-slate-400">{p.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-500">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 dark:text-amber-400" />
                  <span>Compression re-encodes every page as an image — text will no longer be selectable in the output.</span>
                </div>

                {isProcessing && (
                  <div className="w-full space-y-2">
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-800">
                      <div className="h-full w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 animate-pulse" />
                    </div>
                    <p className="text-center text-xs text-slate-600 dark:text-slate-500">
                      Processing in a background worker — the page stays responsive.
                    </p>
                  </div>
                )}

                <button
                  onClick={paywall.isLocked ? paywall.openModal : handleCompress}
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
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Compressing...</>
                  ) : (
                    <>Compress PDF <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {step === 'done' && resultBytes && (
          <div className="w-full flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mb-2 dark:text-green-400">
              <Download className="w-10 h-10" />
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-slate-800 tabular-nums dark:text-slate-300">{formatBytes(file.size)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-500">before</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">{formatBytes(resultBytes.length)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-500">after</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                reductionPct > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
              }`}>
                {reductionPct > 0 ? `-${reductionPct}%` : `${-reductionPct}% larger`}
              </div>
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

            <button onClick={resetFlow} className="text-sm font-medium text-slate-600 hover:text-slate-900 mt-2 transition-colors flex items-center gap-1.5 dark:text-slate-400 dark:hover:text-white">
              <RotateCcw className="w-3.5 h-3.5" /> Compress Another PDF
            </button>
          </div>
        )}
      </div>
      {paywall.premiumModal}
    </div>
  );
}