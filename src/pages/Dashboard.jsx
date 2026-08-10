import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Download, Trash2, CloudUpload, Loader2, Inbox, Calendar, HardDrive,
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
    <div className="w-full max-w-5xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Documents</h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, {user?.user_metadata?.full_name || user?.email}. Your saved PDFs live here.
          </p>
        </div>
        <Link
          to="/merge"
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-5 py-3 rounded-lg transition-colors shadow-lg shadow-purple-600/20"
        >
          <CloudUpload className="w-4 h-4" /> New Merge
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
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
            <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">No documents yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Merge or sign a PDF and use “Save to My Documents” to see it here.
            </p>
            <Link
              to="/merge"
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
            >
              Merge your first PDF
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center hover:bg-slate-800/40 transition-colors">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    className="p-2.5 rounded-lg bg-slate-800 hover:bg-purple-600/20 text-slate-300 hover:text-purple-400 disabled:opacity-50 transition-colors"
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
                    className="p-2.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 disabled:opacity-50 transition-colors"
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