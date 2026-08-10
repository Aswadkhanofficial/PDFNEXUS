import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Download, Loader2, X, AlertCircle, CloudUpload, CheckCircle2,
  Image as ImageIcon, Images, ArrowRight,
} from 'lucide-react';
import { imagesToPdf } from '../services/pdfEngine';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { saveDocument } from '../services/documentService';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

export default function Convert() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState('upload');

  const paywall = usePaywall('convert', 'image conversions');
  const { user } = useAuth();

  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  const processNewFiles = (fileList) => {
    const images = Array.from(fileList).filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (images.length !== fileList.length) alert('Only JPG and PNG images are allowed.');
    if (images.length === 0) return;
    setFiles((prev) => [...prev, ...images]);
    setPreviews((prev) => [
      ...prev,
      ...images.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    ]);
    setErrorMsg('');
  };

  const handleFileChange = (e) => {
    if (e.target.files) processNewFiles(e.target.files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processNewFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const outBytes = await imagesToPdf(files);
      setResultBytes(outBytes);
      setResultName(files.length === 1 ? 'PDFNexus_Image.pdf' : 'PDFNexus_Images.pdf');
      setStep('done');
      paywall.afterSuccess();
    } catch (error) {
      console.error('Convert failed:', error);
      setErrorMsg(error.message || 'Failed to convert images. Please try again.');
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
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles([]);
    setPreviews([]);
    setResultBytes(null);
    setIsSaved(false);
    setSaveError('');
    setStep('upload');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6">

        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Images className="w-8 h-8 text-purple-500" /> Image to PDF
            </h2>
            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 border border-purple-500/30">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free uses left`}
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1 w-full text-left">
            {step === 'upload' && 'Combine JPG/PNG images into one PDF — one page per image.'}
            {step === 'done' && 'Your images were converted successfully.'}
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
                {isDragging ? 'Drop images here...' : 'Drag & drop JPG/PNG images, or click to browse'}
              </span>
              <input type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
            </label>

            {previews.length > 0 && (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {previews.map((p, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={p.url} alt={p.name} className="w-full aspect-square object-cover" />
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/80 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-400" /> {files.length} image(s) selected
                  </span>
                  <button
                    onClick={paywall.isLocked ? paywall.openModal : handleConvert}
                    disabled={isProcessing || (paywall.isLocked ? false : files.length === 0)}
                    className={`text-white text-sm font-bold py-2 px-4 rounded flex items-center transition-colors ${
                      paywall.isLocked
                        ? 'bg-slate-800 text-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
                    }`}
                  >
                    {paywall.isLocked ? (
                      'Upgrade to continue'
                    ) : isProcessing ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Converting...</>
                    ) : (
                      <>Convert to PDF <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
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
              Convert More Images
            </button>
          </div>
        )}

      </div>
      {paywall.premiumModal}
    </div>
  );
}