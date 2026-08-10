import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Download, Trash2, CloudUpload, Loader2, Inbox, Calendar, HardDrive, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
import { listDocuments, downloadDocument, deleteDocument } from '../services/documentService';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function Dashboard() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

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

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
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

  return (
    <div className="relative w-full max-w-5xl mx-auto px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl"
      />

      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
            My <span className="gradient-text">Documents</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, {user?.user_metadata?.full_name || user?.email}. Your saved PDFs live here.
          </p>
        </div>
        <Link
          to="/tools/merge"
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-violet-600/30 hover:shadow-xl hover:shadow-violet-600/40 hover:-translate-y-0.5"
        >
          <CloudUpload className="w-4 h-4" /> New Merge
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/60 overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500" />
        <div className="px-6 py-4 border-b border-slate-800 hidden sm:grid grid-cols-12 gap-4 text-[11px] uppercase tracking-wider font-bold text-slate-500">
          <div className="col-span-5">File</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-3">Created</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-800">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-6 py-5 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-500/15 to-indigo-500/15 text-violet-400 rounded-full flex items-center justify-center mb-4 ring-1 ring-violet-500/30 shadow-[0_0_28px_-6px_rgba(139,92,246,0.5)]">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">No documents yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Merge or sign a PDF and use “Save to My Documents” to see it here.
            </p>
            <Link
              to="/tools/merge"
              className="mt-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-violet-600/30"
            >
              Merge your first PDF
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center hover:bg-violet-500/5 transition-colors">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-400 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-violet-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{doc.file_name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 sm:hidden">
                      <HardDrive className="w-3 h-3" /> {formatBytes(doc.file_size)}
                    </p>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-slate-400 hidden sm:block">{formatBytes(doc.file_size)}</div>
                <div className="col-span-3 text-sm text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDate(doc.created_at)}
                </div>
                <div className="col-span-2 flex items-center justify-start sm:justify-end gap-2">
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-violet-600/20 text-slate-300 hover:text-violet-300 hover:shadow-[0_0_16px_-4px_rgba(139,92,246,0.5)] disabled:opacity-50 transition-all"
                    title="Download"
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 disabled:opacity-50 transition-colors"
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
    </div>
  );
}