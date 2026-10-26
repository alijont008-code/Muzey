import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  QrCode,
  Download,
  Send,
  Share2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { MuseumData, MuseumItem } from '../types/museum';
import { saveMuseumToFirebase, checkOnlineAndConfigured } from '../firebase';
import { generateHeartQrCode, downloadHeartQr } from '../utils/heartQr';
import confetti from 'canvas-confetti';

interface ShareDialogProps {
  museum: MuseumData;
  isOpen: boolean;
  onClose: () => void;
  onMuseumUpdated: (updatedMuseum: MuseumData) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  museum,
  isOpen,
  onClose,
  onMuseumUpdated,
}) => {
  // Upload & Save state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Link & QR states
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [heartQrDataUrl, setHeartQrDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState<boolean>(false);

  // Input ref for manual select/copy
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to build the exact hash-based shared link
  const buildShareUrl = useCallback((museumId: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/m\/[^/]+$/, '');
    const cleanPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${origin}${cleanPath}#/m/${museumId}`;
  }, []);

  // Upload runner
  const startUpload = useCallback(async () => {
    // 1. Check offline status
    const online = await checkOnlineAndConfigured();
    if (!online) {
      setIsOffline(true);
      setUploadError('Ulashish uchun internetga ulanish kerak.');
      setIsUploading(false);
      return;
    }

    setIsOffline(false);
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const { id, updatedItems } = await saveMuseumToFirebase(museum, (percent) => {
        setUploadProgress(percent);
      });

      const updatedMuseum: MuseumData = {
        ...museum,
        id,
        items: updatedItems,
      };

      onMuseumUpdated(updatedMuseum);

      const url = buildShareUrl(id);
      setShareUrl(url);

      // Confetti celebration
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FB7185', '#F43F5E', '#FDA4AF', '#FCD34D'],
      });

      // Prepare QR
      setQrGenerating(true);
      generateHeartQrCode(url)
        .then((qrImage) => setHeartQrDataUrl(qrImage))
        .catch((err) => console.error('QR generation failed:', err))
        .finally(() => setQrGenerating(false));
    } catch (error) {
      console.error('[Muzeycha] Yuklashda xatolik yuz berdi:', error);
      const exactMsg = error instanceof Error ? error.message : String(error);
      if (!navigator.onLine) {
        setIsOffline(true);
        setUploadError('Ulashish uchun internetga ulanish kerak.');
      } else {
        setUploadError(exactMsg);
      }
    } finally {
      setIsUploading(false);
    }
  }, [museum, onMuseumUpdated, buildShareUrl]);

  // Effect when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setQrModalOpen(false);
      return;
    }

    // Check if already uploaded (items have no local File objects and id is valid)
    const isAlreadyUploaded =
      Boolean(museum.id) &&
      !museum.items.some((it) => it.file !== undefined && it.file !== null);

    if (isAlreadyUploaded && museum.id) {
      const url = buildShareUrl(museum.id);
      setShareUrl(url);
      setIsUploading(false);
      setUploadError(null);

      // Generate QR if not generated yet
      setQrGenerating(true);
      generateHeartQrCode(url)
        .then((qr) => setHeartQrDataUrl(qr))
        .catch((e) => console.error(e))
        .finally(() => setQrGenerating(false));
      return;
    }

    // Otherwise, upload only once
    startUpload();
  }, [isOpen, museum.id, museum.items, buildShareUrl, startUpload]);

  // Option A: Havolani nusxalash
  const handleCopyLink = async () => {
    if (!shareUrl) return;

    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch {
      success = false;
    }

    // Fallback if writeText failed or inside iframe
    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn('Fallback copy error:', e);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else {
      // Highlight the read-only input so user can manual copy
      inputRef.current?.select();
    }
  };

  // Option C: Telegram orqali yuborish
  const handleTelegramShare = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent('Sizga kichkina muzey tayyorladim 💝');
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
    window.open(tgUrl, '_blank');
  };

  // Option C: Boshqa ilovalar (Web Share API)
  const handleNativeShare = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Muzeycha',
        text: 'Sizga kichkina muzey tayyorladim 💝',
        url: shareUrl,
      });
    } catch {
      // User cancelled, safely ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl p-6 shadow-2xl border border-rose-100/90 overflow-hidden text-stone-800">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
          aria-label="Yopish"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mb-3 shadow-inner">
            <span className="text-2xl">💝</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Muzeyni yaqiningizga yuboring
          </h2>
        </div>

        {/* Uploading Progress State */}
        {isUploading && (
          <div className="my-6 p-5 rounded-2xl bg-rose-50/80 border border-rose-100 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
            <p className="text-base font-bold text-rose-800 mb-3">
              Muzey yuklanmoqda... {uploadProgress}%
            </p>
            {/* Smooth progress bar */}
            <div className="w-full bg-rose-200/60 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, uploadProgress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Error / Retry state */}
        {!isUploading && uploadError && (
          <div className="my-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-snug">{uploadError}</p>
            </div>
            {!isOffline && (
              <button
                onClick={startUpload}
                className="self-end flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Qayta urinish</span>
              </button>
            )}
          </div>
        )}

        {/* Share Section (when ready) */}
        {!isUploading && !uploadError && shareUrl && (
          <div className="space-y-4">
            {/* Read-only input field so the user can copy it manually */}
            <div>
              <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 focus-within:border-rose-400 transition">
                <input
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-transparent text-xs sm:text-sm text-stone-700 outline-none truncate font-mono select-all"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Option A: Havolani nusxalash */}
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-bold text-base transition shadow-sm cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                    : 'bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white shadow-rose-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>Havola nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Havolani nusxalash</span>
                  </>
                )}
              </button>

              {/* Option B: Yurakcha QR */}
              <button
                onClick={() => setQrModalOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-bold text-base bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-[0.98] transition border border-rose-200/60 cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-rose-500" />
                <span>Yurakcha QR</span>
              </button>

              {/* Option C: Telegram orqali yuborish */}
              <button
                onClick={handleTelegramShare}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-bold text-base bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#0088cc] active:scale-[0.98] transition border border-[#229ED9]/20 cursor-pointer"
              >
                <Send className="w-5 h-5 text-[#0088cc]" />
                <span>Telegram orqali yuborish</span>
              </button>

              {/* Native Web Share API (Boshqa ilovalar) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-semibold text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 active:scale-[0.98] transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-stone-500" />
                  <span>Boshqa ilovalar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Heart QR Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#FFFDF9] rounded-3xl p-6 shadow-2xl border border-rose-200 flex flex-col items-center">
            {/* Close */}
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-stone-800 mb-4 text-center">
              Muzeycha 💝
            </h3>

            {/* Scannable Heart QR code image container */}
            <div className="w-72 h-72 rounded-3xl overflow-hidden bg-rose-50 flex items-center justify-center shadow-lg border-2 border-rose-100 mb-3">
              {heartQrDataUrl && !qrGenerating ? (
                <img
                  src={heartQrDataUrl}
                  alt="Yurakcha QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-rose-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-semibold">QR tayyorlanmoqda...</span>
                </div>
              )}
            </div>

            {/* Required text below QR */}
            <p className="text-sm font-semibold text-rose-600 mb-5 text-center">
              Skanerlang va muzeyga kiring 💝
            </p>

            {/* Button: "QR'ni yuklab olish" (saves muzeycha-qr.png) */}
            <button
              onClick={() => {
                if (heartQrDataUrl) {
                  downloadHeartQr(heartQrDataUrl, 'muzeycha-qr.png');
                }
              }}
              disabled={!heartQrDataUrl || qrGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-bold text-base bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white shadow-md shadow-rose-200 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>QR'ni yuklab olish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
