import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Download, FileText, HardDrive, Loader2, Play, Trash2, UploadCloud, X,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import PageTransition from '../components/PageTransition';
import { supabase } from '../services/supabaseClient';
import { listDocuments, downloadDocument, deleteDocument } from '../services/documentService';
import { TOOLS } from '../data/tools';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function Workspace() {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isActionModalOpen && !isDeleteModalOpen) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setIsActionModalOpen(false);
      setIsDeleteModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActionModalOpen, isDeleteModalOpen]);

  const loadDocuments = () =>
    listDocuments()
      .then(setDocuments)
      .catch((error) => toastError(`Failed to load documents: ${error.message}`))
      .finally(() => setIsLoading(false));

  useEffect(() => {
    let cancelled = false;
    listDocuments()
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((error) => {
        if (!cancelled) toastError(`Failed to load documents: ${error.message}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  const handleUpload = async (file) => {
    if (!file || isUploading) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toastError('Only PDF files can be saved to your workspace.');
      return;
    }
    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to save documents.');

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('user_documents')
        .insert({ user_id: user.id, file_name: file.name, file_url: filePath, file_size: file.size });
      if (insertError) throw insertError;

      console.log('Upload successful:', filePath);
      toastSuccess(`"${file.name}" saved to your workspace.`);
      await loadDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      toastError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDownload = async (doc) => {
    if (downloadingId) return;
    setDownloadingId(doc.id);
    try {
      await downloadDocument(doc);
    } catch (error) {
      toastError(`Download failed: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRequestDelete = (doc) => {
    setFileToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    const doc = fileToDelete;
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      toastError(`Delete failed: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenActionModal = (doc) => {
    setActiveFile(doc);
    setIsActionModalOpen(true);
  };

  const handleSelectTool = (tool) => {
    console.log('Processing file:', activeFile?.file_name, 'with tool:', tool.slug);
    setIsActionModalOpen(false);
    navigate(tool.path);
  };

  return (
    <PageTransition>
      <div className="relative w-full max-w-6xl mx-auto px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-24 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl animate-drift-a"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-32 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl animate-drift-b"
      />

      <div className="relative mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600 dark:text-violet-400">
            Private Workspace
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Your documents. <span className="gradient-text text-glow">Always in reach.</span>
          </h1>
        </div>
      </div>

      <section className="relative" aria-label="Upload a document">
        <label
          htmlFor="pdf-upload"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center backdrop-blur-md transition-colors duration-300 sm:p-10 ${
            isDragging
              ? 'border-purple-400/60 bg-purple-500/10 shadow-[0_0_48px_-12px_rgba(168,85,247,0.65)] scale-[1.01]'
              : 'border-purple-500/25 bg-white/70 hover:border-purple-500/40 hover:bg-purple-500/5 dark:border-white/20 dark:bg-white/5 dark:hover:border-purple-500/40 dark:hover:bg-white/[0.02]'
          }`}
        >
          <input
            id="pdf-upload"
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = '';
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100 dark:bg-violet-400/20"
          />
          <span
            className={`relative flex items-center justify-center rounded-full bg-purple-500/10 p-5 text-violet-600 shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] dark:text-purple-400 ${
              isDragging ? 'scale-110 shadow-[0_0_40px_rgba(168,85,247,0.3)]' : ''
            }`}
          >
            <UploadCloud aria-hidden className="h-9 w-9" />
          </span>
          <div className="relative">
            {isUploading ? (
              <p className="flex items-center justify-center gap-2 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                <Loader2 aria-hidden className="h-5 w-5 animate-spin text-violet-600 dark:text-violet-400" />
                Uploading…
              </p>
            ) : (
              <p className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Drop your PDF here
              </p>
            )}
          </div>
          <p className="relative mt-2 max-w-md text-sm text-gray-400">
            Unlock all 8 local processing tools instantly. Your file stays secure on your device.
          </p>
        </label>
      </section>

      <section className="relative mt-10" aria-label="Recent files">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
          Recent Documents
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-slate-200 hidden sm:grid grid-cols-12 gap-4 text-xs uppercase tracking-wider font-semibold text-gray-400 dark:border-white/10">
            <div className="col-span-5">File</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-5 py-14 text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-slate-600">
                <FileText aria-hidden className="h-7 w-7" />
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl shadow-[0_0_24px_-6px_rgba(139,92,246,0.35)]"
                />
              </span>
              <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">
                No recent files found. Upload a document to begin processing.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="px-5 py-3 flex flex-col sm:grid sm:grid-cols-12 gap-3 items-start sm:items-center hover:bg-violet-500/5 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-600 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-violet-500/20 dark:text-violet-400">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-200">{doc.file_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 sm:hidden">
                        <HardDrive className="w-3 h-3" /> {formatBytes(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600 hidden sm:block dark:text-slate-400">{formatBytes(doc.file_size)}</div>
                  <div className="col-span-3 text-sm text-slate-600 flex items-center gap-1.5 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDate(doc.created_at)}
                  </div>
                  <div className="col-span-2 flex items-center justify-start sm:justify-end gap-2">
                    <button
                      onClick={() => handleOpenActionModal(doc)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg hover:shadow-violet-600/40"
                      title="Process this file"
                    >
                      <Play aria-hidden className="h-3.5 w-3.5" />
                      Process File
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-violet-600/15 text-slate-700 hover:text-violet-600 hover:shadow-[0_0_16px_-4px_rgba(139,92,246,0.5)] disabled:opacity-50 transition-all dark:bg-slate-800/80 dark:hover:bg-violet-600/20 dark:text-slate-300 dark:hover:text-violet-300"
                      title="Download"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRequestDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-red-500/15 text-slate-700 hover:text-red-500 disabled:opacity-50 transition-colors dark:bg-slate-800/80 dark:hover:bg-red-500/20 dark:text-slate-300 dark:hover:text-red-400"
                      title="Delete"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {isActionModalOpen && activeFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select a tool"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsActionModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsActionModalOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors duration-300 hover:bg-white/5 hover:text-white"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl font-bold tracking-tight text-white">
              Select a Tool
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              What would you like to do with {activeFile.file_name}?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {TOOLS.map((tool) => (
                <button
                  key={tool.slug}
                  onClick={() => handleSelectTool(tool)}
                  className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-white/5 p-4 transition-all duration-300 hover:border-violet-500/50 hover:bg-white/5 hover:shadow-[0_0_24px_-8px_rgba(139,92,246,0.6)]"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.gradient} text-white shadow-md shadow-violet-600/25 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <tool.icon aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-gray-300">{tool.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && fileToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm deletion"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold tracking-tight text-white">
              Delete File?
            </h3>
            <p className="mt-1.5 text-sm text-gray-400">
              Are you sure you want to delete {fileToDelete.file_name}? This action cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === fileToDelete.id}
                className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 transition-all duration-300 hover:bg-red-500/30 disabled:opacity-50"
              >
                {deletingId === fileToDelete.id ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
}