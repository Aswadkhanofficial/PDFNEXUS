import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import SignaturePad from '../components/SignaturePad';
import { FileUp, Download, Eraser, ShieldCheck, PenTool, Image as ImageIcon, Copy, Check, CloudUpload, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useAuth } from '../context/AuthContext';
import { usePaywall } from '../hooks/usePaywall';
import { useToast } from '../components/Toast';
import { saveDocument } from '../services/documentService';

export default function Sign() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const [sigImageFile, setSigImageFile] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [capturedSignature, setCapturedSignature] = useState(null);
  const [copied, setCopied] = useState(false);
  const [signedPdfBytes, setSignedPdfBytes] = useState(null);
  const [signedFileName, setSignedFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const sigPadRef = useRef(null);
  const { user } = useAuth();
  const paywall = usePaywall('sign', 'signatures');
  const { error: toastError } = useToast();

  if (paywall.lockedByUser) {
    return paywall.guestLockScreen;
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSigImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSigImageFile(e.target.files[0]);
    }
  };

  const clearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
  };

  const copySvgPath = async () => {
    if (!capturedSignature) return;
    try {
      await navigator.clipboard.writeText(capturedSignature.svgPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('Failed to copy to clipboard.');
    }
  };

  const handleSaveAndSign = async () => {
    if (!selectedFile) {
      alert('Please upload a PDF document first.');
      return;
    }

    let signatureDataUrl;

    if (activeTab === 'draw') {
      if (sigPadRef.current.isEmpty()) {
        alert('Please draw your signature first.');
        return;
      }
      const captured = sigPadRef.current.getSignatureData();
      signatureDataUrl = captured.pngDataUrl;
      setCapturedSignature(captured);
    } else {
      if (!sigImageFile) {
        alert('Please upload your signature image file.');
        return;
      }
      // Convert uploaded signature image to Data URL
      signatureDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(sigImageFile);
      });
    }

    setIsSigning(true);
    try {
      const existingPdfBytes = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Placing signature on the first page

      // Embed signature image into PDF
      const imgBytes = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
      
      let embeddedImage;
      if (signatureDataUrl.includes('image/jpeg') || signatureDataUrl.includes('image/jpg')) {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      } else {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      }

      const dims = embeddedImage.scale(0.35);

      // Draw signature on the page (Coordinates: x, y)
      firstPage.drawImage(embeddedImage, {
        x: 50,
        y: 50,
        width: dims.width,
        height: dims.height,
      });

      const pdfBytes = await pdfDoc.save();

      // Trigger download
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
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
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
            <p className="text-sm text-slate-400">Upload your document and apply a legally binding signature.</p>
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
                <span className="text-xs text-slate-400">Draw inside the box below</span>
                <button onClick={clearSignature} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors">
                  <Eraser className="w-3.5 h-3.5" /> Clear Pad
                </button>
              </div>
              <SignaturePad ref={sigPadRef} />
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

        {/* Action Button */}
        <button 
          onClick={paywall.isLocked ? paywall.openModal : handleSaveAndSign}
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

        {capturedSignature && (
          <div className="mt-6 border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Captured Signature Data</h2>
              <span className="text-xs text-slate-500">
                {capturedSignature.width} x {capturedSignature.height} px
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-1.5">SVG Preview</p>
                <div className="bg-white rounded-lg p-3 border border-slate-800 flex items-center justify-center min-h-[72px]">
                  {capturedSignature.svgString ? (
                    <img
                      src={`data:image/svg+xml;base64,${btoa(capturedSignature.svgString)}`}
                      alt="SVG preview"
                      className="max-h-14 max-w-full"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">SVG unavailable after resize</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1.5">PNG Preview</p>
                <div className="bg-white rounded-lg p-3 border border-slate-800 flex items-center justify-center min-h-[72px]">
                  <img src={capturedSignature.pngDataUrl} alt="PNG preview" className="max-h-14 max-w-full" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-slate-400">SVG Path Data</p>
                <button
                  type="button"
                  onClick={copySvgPath}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied!' : 'Copy Path'}
                </button>
              </div>
              <textarea
                readOnly
                value={capturedSignature.svgPath}
                rows={3}
                className="w-full font-mono text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-2.5 resize-y"
              />
            </div>
          </div>
        )}
      </div>
      {paywall.premiumModal}
    </div>
  );
}