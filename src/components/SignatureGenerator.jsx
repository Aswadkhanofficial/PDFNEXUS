import { useEffect, useState } from 'react';
import { Heart, Loader2, LogIn, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { deleteFavoriteSignature, fetchFavoriteSignatures, saveFavoriteSignature } from '../services/signatureFavorites';

const SIGNATURE_FONTS = [
  { id: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { id: 'dancing-script', label: 'Dancing Script', family: "'Dancing Script', cursive" },
  { id: 'sacramento', label: 'Sacramento', family: "'Sacramento', cursive" },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive" },
];

const RENDER_PX = 64;

async function renderSignaturePng(text, fontFamily) {
  const font = `${RENDER_PX}px ${fontFamily}`;
  try {
    await document.fonts.load(font);
    await document.fonts.ready;
  } catch {
    /* fall back to the browser default cursive rendering */
  }
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const textWidth = measure.measureText(text).width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(textWidth) + 64;
  canvas.height = Math.ceil(RENDER_PX * 1.35) + 56;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = '#0f172a';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, 32, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

export default function SignatureGenerator({ view, onUseSignature }) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [usingId, setUsingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const favs = await fetchFavoriteSignatures();
        if (!cancelled) setFavorites(favs);
      } catch {
        if (!cancelled) toast.error('Could not load your saved signatures.');
      } finally {
        if (!cancelled) setLoadingFavs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const handleUseGenerated = async (text, font) => {
    if (!text.trim()) return;
    setUsingId(font.id);
    try {
      const dataUrl = await renderSignaturePng(text.trim(), font.family);
      onUseSignature(dataUrl);
      toast.success(`Added "${font.label}" signature to the document`);
    } catch {
      toast.error('Could not render this signature style.');
    } finally {
      setUsingId(null);
    }
  };

  const handleSaveGenerated = async (text, font) => {
    if (!text.trim()) return;
    if (!user) {
      toast.error('Please log in to save favorite signatures.');
      return;
    }
    setSavingId(font.id);
    try {
      const imageBase64 = await renderSignaturePng(text.trim(), font.family);
      const saved = await saveFavoriteSignature({
        text: text.trim(),
        style: font.family,
        imageBase64,
      });
      setFavorites((prev) => [saved, ...prev]);
      toast.success('Signature saved to favorites.');
    } catch (error) {
      toast.error(error.message || 'Could not save favorite.');
    } finally {
      setSavingId(null);
    }
  };

  const handleUseSaved = async (fav) => {
    setUsingId(fav.id);
    try {
      const dataUrl = fav.image_base64 || (await renderSignaturePng(fav.text, fav.style));
      onUseSignature(dataUrl);
      toast.success('Saved signature added to the document');
    } catch {
      toast.error('Could not render this saved signature.');
    } finally {
      setUsingId(null);
    }
  };

  const handleDeleteSaved = async (fav) => {
    setDeletingId(fav.id);
    try {
      await deleteFavoriteSignature(fav.id);
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
      toast.success('Removed from favorites.');
    } catch {
      toast.error('Could not remove favorite.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {view === 'generate' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Type your name to generate 4 signature styles. Click one to drop it on the document.
            </span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="relative">
            <PenLine className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name e.g. John A. Smith"
              maxLength={40}
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm dark:bg-slate-950 dark:border-slate-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SIGNATURE_FONTS.map((font) => (
              <div
                key={font.id}
                className="relative group border border-slate-200 rounded-xl bg-slate-100/60 overflow-hidden transition-colors hover:border-purple-500/60 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <button
                  type="button"
                  onClick={() => handleUseGenerated(name, font)}
                  disabled={!name.trim() || usingId === font.id}
                  className="w-full h-28 flex items-center justify-center px-4 py-3 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Use ${font.label} signature`}
                >
                  <span
                    className="max-w-full truncate leading-none text-slate-900 text-2xl select-none dark:text-white"
                    style={{ fontFamily: font.family }}
                  >
                    {usingId === font.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500 inline-block" />
                    ) : (
                      name.trim() || font.label
                    )}
                  </span>
                </button>
                <div className="flex items-center justify-between px-3 py-2 bg-white/70 border-t border-slate-200/80 dark:bg-slate-900/70 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{font.label}</span>
                  <button
                    type="button"
                    onClick={() => handleSaveGenerated(name, font)}
                    disabled={!name.trim() || savingId === font.id}
                    aria-label={`Save ${font.label} signature to favorites`}
                    className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingId === font.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'saved' && (
        <div>
          {!user ? (
            <div className="border border-slate-200 rounded-xl p-6 text-center bg-slate-100/60 dark:border-slate-800 dark:bg-slate-950/50">
              <Heart className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Log in to save and reuse your signature styles.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-600/30"
              >
                <LogIn className="w-4 h-4" /> Log in
              </Link>
            </div>
          ) : loadingFavs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-6 text-center bg-slate-100/60 dark:border-slate-800 dark:bg-slate-950/50">
              <Heart className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No saved signatures yet. Generate one and tap the heart to keep it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="group border border-slate-200 rounded-xl bg-slate-100/60 overflow-hidden transition-colors hover:border-purple-500/60 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <button
                    type="button"
                    onClick={() => handleUseSaved(fav)}
                    disabled={usingId === fav.id}
                    className="w-full h-28 flex items-center justify-center px-4 py-3 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={`Use saved signature for ${fav.text}`}
                  >
                    {usingId === fav.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    ) : (
                      <img
                        src={fav.image_base64}
                        alt={fav.text}
                        draggable={false}
                        className="max-w-full max-h-full object-contain select-none pointer-events-none"
                      />
                    )}
                  </button>
                  <div className="flex items-center justify-between px-3 py-2 bg-white/70 border-t border-slate-200/80 dark:bg-slate-900/70 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-600 truncate dark:text-slate-400">{fav.text}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(fav)}
                      disabled={deletingId === fav.id}
                      aria-label={`Delete saved signature for ${fav.text}`}
                      className="p-1.5 rounded-full text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === fav.id ? (
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
      )}
    </div>
  );
}
