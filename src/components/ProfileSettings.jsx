import { useRef, useState } from 'react';
import { Camera, Loader2, Save, Trash2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { removeAvatar, updateProfileName, uploadAvatar } from '../services/profileService';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const storedName = profile?.full_name || user?.user_metadata?.full_name || '';
  const [fullName, setFullName] = useState(storedName);
  const [prevStoredName, setPrevStoredName] = useState(storedName);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isImageUploaded, setIsImageUploaded] = useState(false);
  const [isImageRemoved, setIsImageRemoved] = useState(false);

  if (storedName !== prevStoredName) {
    setPrevStoredName(storedName);
    setFullName(storedName);
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const initial = displayName.charAt(0).toUpperCase();
  const hasNameChanged = fullName.trim() !== storedName;
  const hasImageChanged = isImageUploaded || isImageRemoved;

  const clearPendingImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setIsImageUploaded(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (hasNameChanged) {
      if (!trimmed) {
        toastError('Full name cannot be empty.');
        return;
      }
      setSavingName(true);
      try {
        await updateProfileName(trimmed);
        setFullName(trimmed);
      } catch (error) {
        toastError(`Could not update name: ${error.message}`);
        setSavingName(false);
        return;
      }
    }
    if (isImageUploaded) {
      setUploading(true);
      try {
        await uploadAvatar(pendingFile, avatarUrl);
      } catch (error) {
        toastError(`Upload failed: ${error.message}`);
        setSavingName(false);
        setUploading(false);
        return;
      }
    } else if (isImageRemoved) {
      setUploading(true);
      try {
        await removeAvatar(avatarUrl);
      } catch (error) {
        toastError(`Could not remove avatar: ${error.message}`);
        setSavingName(false);
        setUploading(false);
        return;
      }
    }
    await refreshProfile();
    clearPendingImage();
    const nameChanged = hasNameChanged;
    const imageUploaded = isImageUploaded;
    const imageRemoved = isImageRemoved;
    setIsImageRemoved(false);
    setSavingName(false);
    setUploading(false);
    if (nameChanged) {
      toastSuccess('Changes saved.');
    } else if (imageUploaded) {
      toastSuccess('Image updated.');
    } else if (imageRemoved) {
      toastSuccess('Image removed.');
    } else {
      toastError('No changes to save.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toastError('Please choose a PNG, JPEG, WebP or GIF image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError('Avatar must be 2 MB or smaller.');
      return;
    }
    clearPendingImage();
    setIsImageRemoved(false);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsImageUploaded(true);
  };

  const handleRemoveAvatar = async () => {
    if (isImageUploaded) {
      clearPendingImage();
      setIsImageRemoved(true);
      return;
    }
    if (!avatarUrl || typeof avatarUrl !== 'string') return;
    setUploading(true);
    try {
      await removeAvatar(avatarUrl);
      await refreshProfile();
      clearPendingImage();
      setIsImageRemoved(true);
      toastSuccess('Image removed.');
    } catch (error) {
      toastError(`Could not remove avatar: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const displayedAvatar = previewUrl || avatarUrl;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500" />
      <div className="space-y-8 p-6 sm:p-8">
        <section aria-label="Profile photo">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            Profile Photo
          </h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative">
              {uploading ? (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-600 dark:text-violet-400" />
                </span>
              ) : displayedAvatar ? (
                <img
                  src={displayedAvatar}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-violet-500/40"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-2xl font-extrabold text-white ring-2 ring-violet-500/40">
                  {initial || <User className="h-8 w-8" />}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileChange}
                className="hidden"
                aria-label="Choose avatar image"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600/15 px-4 py-2 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-600/25 disabled:opacity-50 dark:text-violet-300"
              >
                <Camera className="h-4 w-4" />
                {uploading ? 'Uploading…' : isImageUploaded ? 'Photo Selected' : 'Change Photo'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PNG, JPEG, WebP or GIF — 2 MB max.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Account details" className="border-t border-slate-200 pt-8 dark:border-slate-800">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            Account Details
          </h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4" noValidate>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full name</span>
              <input
                type="text"
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
              <input
                type="email"
                name="email"
                value={user?.email ?? ''}
                readOnly
                disabled
                className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              />
            </label>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingName || uploading || (!hasNameChanged && !hasImageChanged)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-600/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingName || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}