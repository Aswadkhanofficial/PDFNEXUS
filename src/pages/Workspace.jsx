import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, Download, FileText, HardDrive, Inbox, Loader2, Trash2,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import Skeleton from '../components/Skeleton';
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
    <div className="relative w-full max-w-6xl mx-auto px-6 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-24 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl animate-drift-a"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-32 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl animate-drift-b"
      />

      <div className="relative mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            Action Workspace
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pick a tool. <span className="gradient-text text-glow">Get it done.</span>
          </h1>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {TOOLS.map((tool, i) => (
          <Link
            key={tool.slug}
            to={tool.path}
            className="group glass card-glow rounded-2xl p-5 animate-rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <ArrowRight
              aria-hidden
              className="absolute right-4 top-4 h-4 w-4 -translate-x-1 text-violet-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
            />
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.gradient} text-white shadow-lg shadow-violet-600/25 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110`}
            >
              <tool.icon aria-hidden className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-sm sm:text-base font-bold text-slate-200 dark:text-slate-100">
              {tool.name}
            </h2>
            <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
              {tool.blurb}
            </p>
          </Link>
        ))}
      </div>

      <section className="relative mt-8" aria-label="Recent files">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Recent Files
        </h2>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500" />
          <div className="px-5 py-3 border-b border-slate-800 hidden sm:grid grid-cols-12 gap-4 text-[11px] uppercase tracking-wider font-bold text-slate-500">
            <div className="col-span-5">File</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-3">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-slate-800">
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
            <div className="flex items-center justify-center gap-3 px-5 py-8 text-center">
              <Inbox aria-hidden className="h-5 w-5 text-violet-400" />
              <p className="text-sm text-slate-500">
                No files yet. Use a tool above and hit “Save to My Documents” — it will show up here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="px-5 py-3 flex flex-col sm:grid sm:grid-cols-12 gap-3 items-start sm:items-center hover:bg-violet-500/5 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-400 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-violet-500/20">
                      <FileText className="w-4.5 h-4.5" />
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
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-violet-600/20 text-slate-300 hover:text-violet-300 hover:shadow-[0_0_16px_-4px_rgba(139,92,246,0.5)] disabled:opacity-50 transition-all"
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
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-300 hover:text-red-400 disabled:opacity-50 transition-colors"
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
    </div>
  );
}