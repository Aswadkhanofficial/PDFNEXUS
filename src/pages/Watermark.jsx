import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Download, Loader2, AlertCircle, CloudUpload, CheckCircle2,
  Stamp, ArrowRight, RotateCcw,
} from 'lucide-react';
import { watermarkPdf } from '../services/pdfEngine';
import { callWorker } from '../services/workerClient';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../services/documentService';

export default function Watermark() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(25);
  const [fontSizePct, setFontSizePct] = useState(8);
  const [color, setColor] = useState('#000000');
  const [diagonal, setDiagonal] = useState(true);
  const [step, setStep] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const paywall = usePaywall('watermark', 'watermarks');
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
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  const handleApply = async () => {
    if (!file) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setErrorMsg('Enter the watermark text first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const bytes = await file.arrayBuffer();
      const options = {
        text: trimmed,
        fontSizePct: Number(fontSizePct),
        opacity: opacity / 100,
        color,
        diagonal,
      };
      let outBytes;
      try {
        outBytes = await callWorker('watermark', { data: bytes, options }, [bytes]);
      } catch {
        outBytes = await watermarkPdf(await file.arrayBuffer(), options);
      }
      setResultBytes(outBytes);
      setResultName(`watermarked-${file.name}`);
      setStep('done');
      paywall.afterSuccess();
    } catch (error) {
      console.error('Watermark failed:', error);
      setErrorMsg('Failed to apply watermark. Please try again.');
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6">

        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Stamp className="w-8 h-8 text-purple-500" /> Add Watermark
            </h2>
            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 border border-purple-500/30">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1 w-full text-left">
            {step === 'upload' && 'Overlay custom text with adjustable opacity across every page.'}
            {step === 'done' && 'Your watermark was applied successfully.'}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full p-4 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 flex items-start gap-2">
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
                isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 bg-slate-950/50'
              }`}
            >
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className="font-medium text-slate-200">
                {isDragging ? 'Drop PDF here...' : 'Drag & drop a PDF here, or click to browse'}
              </span>
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
            </label>

            {file && (
              <>
                <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Stamp className="w-4 h-4 text-purple-400" /> {file.name}
                  </span>
                </div>

                <div className="flex flex-col gap-4 bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-400">Watermark text</span>
                    <input
                      type="text"
                      value={text}
                      maxLength={40}
                      onChange={(e) => setText(e.target.value)}
                      className="mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-400 flex justify-between">
                        <span>Opacity</span>
                        <span className="tabular-nums text-purple-400">{opacity}%</span>
                      </span>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="mt-2 w-full accent-purple-500 cursor-pointer"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-400 flex justify-between">
                        <span>Size</span>
                        <span className="tabular-nums text-purple-400">{fontSizePct}% of width</span>
                      </span>
                      <input
                        type="range"
                        min={3}
                        max={14}
                        step={0.5}
                        value={fontSizePct}
                        onChange={(e) => setFontSizePct(Number(e.target.value))}
                        className="mt-2 w-full accent-purple-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 cursor-pointer">
                      <span>Color</span>
                      <span className="relative inline-flex w-8 h-8 rounded-lg border border-slate-700 overflow-hidden">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          aria-label="Watermark color"
                        />
                        <span className="w-full h-full" style={{ backgroundColor: color }} />
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setDiagonal((d) => !d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        diagonal
                          ? 'border-purple-500 bg-purple-600/20 text-purple-200'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {diagonal ? 'Diagonal' : 'Horizontal'}
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-white p-6 flex items-center justify-center overflow-hidden">
                    <span
                      className="font-bold select-none whitespace-nowrap"
                      style={{
                        color,
                        opacity: opacity / 100,
                        fontSize: `${Math.max(12, Math.round(280 * (fontSizePct / 100)))}px`,
                        transform: diagonal ? 'rotate(-45deg)' : 'none',
                      }}
                    >
                      {text.trim() || 'CONFIDENTIAL'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={paywall.isLocked ? paywall.openModal : handleApply}
                  disabled={isProcessing}
                  className={`w-full text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all ${
                    paywall.isLocked
                      ? 'bg-slate-800 text-purple-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-600/20'
                  }`}
                >
                  {paywall.isLocked ? (
                    'Paused - Upgrade to continue'
                  ) : isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Applying watermark...</>
                  ) : (
                    <>Apply Watermark & Download <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {step === 'done' && resultBytes && (
          <div className="w-full flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2">
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

            <button onClick={resetFlow} className="text-sm font-medium text-slate-400 hover:text-white mt-2 transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Watermark Another PDF
            </button>
          </div>
        )}
      </div>
      {paywall.premiumModal}
    </div>
  );
}