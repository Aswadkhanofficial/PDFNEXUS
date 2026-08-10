import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mergePdfs } from '../services/pdfEngine';
import { callWorker } from '../services/workerClient';
import { usePaywall } from '../hooks/usePaywall.jsx';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { saveDocument } from '../services/documentService';
import { UploadCloud, FileText, Download, Loader2, GripVertical, X, ArrowRight, AlertCircle, CloudUpload, CheckCircle2 } from 'lucide-react';

export default function Merge() {
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState('upload'); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mergedPdfBytes, setMergedPdfBytes] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Initialize the paywall for the 'merge' feature
  const paywall = usePaywall('merge', 'merges');
  const { user } = useAuth();
  const { error: toastError } = useToast();

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const processNewFiles = (newFileList) => {
    const pdfFiles = Array.from(newFileList).filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== newFileList.length) alert("Only PDF files are allowed.");
    setFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleFileChange = (e) => {
    if (e.target.files) processNewFiles(e.target.files);
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    if (updatedFiles.length === 0) setStep('upload');
  };

  const onDragOverUpload = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeaveUpload = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDropUpload = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processNewFiles(e.dataTransfer.files);
  };

  const handleSort = () => {
    let _files = [...files];
    const draggedItemContent = _files.splice(dragItem.current, 1)[0];
    _files.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setFiles(_files);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    try {
      const bufs = await Promise.all(files.map((f) => f.arrayBuffer()));
      let mergedPdfBytes;
      try {
        mergedPdfBytes = await callWorker('merge', { data: bufs }, bufs);
      } catch {
        mergedPdfBytes = await mergePdfs(files);
      }
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfBytes(mergedPdfBytes);
      setDownloadUrl(url);
      setStep('done');
      // Track usage only when merge is successful
      paywall.afterSuccess();
    } catch (error) {
      console.error("Merge Failed:", error);
      toastError("Error merging PDFs. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (isSaving || isSaved || !mergedPdfBytes) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const file = new File([mergedPdfBytes], 'PDFNexus_Merged.pdf', { type: 'application/pdf' });
      await saveDocument(file, 'PDFNexus_Merged.pdf');
      setIsSaved(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetFlow = () => {
    setFiles([]);
    setDownloadUrl(null);
    setMergedPdfBytes(null);
    setIsSaved(false);
    setSaveError('');
    setStep('upload');
  };

  // Guest users who exhaust the anonymous limit get the full lock screen
  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6">
        
        <div className="text-center w-full flex flex-col items-center">
          <div className="flex justify-between w-full items-start mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Merge PDFs</h2>
            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-purple-400 border border-purple-500/30">
              {paywall.isPremium ? 'Unlimited' : `${paywall.remaining} free ${paywall.isPremium ? '' : paywall.remaining === 1 ? 'use' : 'uses'} left`}
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-1 w-full text-left">
            {step === 'upload' && "Upload files to combine."}
            {step === 'organize' && "Drag to reorder. The top file will appear first."}
            {step === 'done' && "Your files have been successfully merged."}
          </p>
        </div>

        {step === 'upload' && (
          <div className="w-full flex flex-col gap-4">
            <label 
              onDragOver={onDragOverUpload}
              onDragLeave={onDragLeaveUpload}
              onDrop={onDropUpload}
              className={`w-full border-2 border-dashed transition-all duration-200 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer ${
                isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500 bg-slate-950/50'
              }`}
            >
              <UploadCloud className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className="font-medium text-slate-200">
                {isDragging ? "Drop PDFs here..." : "Drag & drop PDFs here, or click to browse"}
              </span>
              <input type="file" multiple accept="application/pdf" className="hidden" onChange={handleFileChange} />
            </label>

            {files.length > 0 && (
              <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                <span className="text-sm font-medium">{files.length} file(s) selected</span>
                <button 
                  onClick={() => setStep('organize')}
                  disabled={files.length < 2}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold py-2 px-4 rounded flex items-center transition-colors"
                >
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
            
            {files.length === 1 && (
              <div className="w-full flex items-center gap-2 text-amber-400 bg-amber-400/10 p-3 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Add at least one more PDF to merge.</span>
              </div>
            )}
          </div>
        )}

        {step === 'organize' && (
          <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-full flex flex-col gap-2">
              {files.map((file, idx) => (
                <div 
                  key={idx}
                  draggable
                  onDragStart={() => (dragItem.current = idx)}
                  onDragEnter={() => (dragOverItem.current = idx)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700 cursor-move hover:border-purple-500 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <GripVertical className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs font-bold text-slate-300 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className="text-sm truncate text-slate-200 select-none">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1 z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setStep('upload')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3.5 rounded-lg transition-colors"
              >
                Add More
              </button>
              <button 
                onClick={paywall.isLocked ? paywall.openModal : handleMerge}
                disabled={isProcessing || files.length < 2}
                className={`flex-[2] text-white font-bold py-3.5 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-purple-600/20 ${
                  paywall.isLocked
                    ? 'bg-slate-800 text-purple-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50'
                }`}
              >
                {paywall.isLocked
                  ? "Paused - Upgrade to continue"
                  : isProcessing
                    ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                    : "Merge in this order"}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && downloadUrl && (
          <div className="w-full flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2">
              <Download className="w-10 h-10" />
            </div>
            <a 
              href={downloadUrl} 
              download="PDFNexus_Merged.pdf"
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
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-purple-300 py-2 transition-colors"
              >
                <CloudUpload className="w-4 h-4" /> Log in to save to your documents
              </Link>
            )}

            {saveError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 w-full text-center">
                {saveError}
              </p>
            )}

            <button onClick={resetFlow} className="text-sm font-medium text-slate-400 hover:text-white mt-2 transition-colors">
              Merge More Files
            </button>
          </div>
        )}

      </div>
      {paywall.premiumModal}
    </div>
  );
}