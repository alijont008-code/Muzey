import React, { useRef, useState } from 'react';
import { Sparkles, Image as ImageIcon, Compass, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { processFileList } from '../utils/compression';
import { MuseumItem } from '../types/museum';

interface HomeProps {
  onMuseumCreated: (items: MuseumItem[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({
  onMuseumCreated,
  isLoading,
  setIsLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenPicker = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setErrorMessage("Hech narsa tanlanmadi. Iltimos, kamida bitta rasm tanlang.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const items = await processFileList(files);
      onMuseumCreated(items);
    } catch (err: unknown) {
      console.error('File processing error:', err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Bu fayl turi qo'llab-quvvatlanmaydi.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col justify-between p-5 sm:p-8 max-w-lg mx-auto animate-in fade-in duration-500">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Brand / Logo */}
      <header className="pt-6 sm:pt-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-rose-400 text-white shadow-lg shadow-rose-200 mb-4 animate-heart-float">
          <span className="text-3xl">🏛️</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900 mb-3 font-serif">
          Muzeycha
        </h1>
        <p className="text-base sm:text-lg text-stone-600 leading-relaxed px-2">
          Rasm va videolaringizdan kichkina 3D muzey yasaydi. Ichida yurib, suratlarni devordagi ramkalarda tomosha qilasiz.
        </p>
      </header>

      {/* Three Numbered Step Cards */}
      <div className="my-8 space-y-3.5">
        {/* Card 1 */}
        <div className="flex items-start gap-4 p-4 rounded-3xl bg-white border border-rose-100/80 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center font-black text-lg shrink-0">
            1️⃣
          </div>
          <div className="flex-1 pt-1">
            <p className="text-stone-800 font-bold text-sm sm:text-base leading-snug">
              «Muzey yaratish»ni bosing va rasmlarni tanlang
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex items-start gap-4 p-4 rounded-3xl bg-white border border-rose-100/80 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center font-black text-lg shrink-0">
            2️⃣
          </div>
          <div className="flex-1 pt-1">
            <p className="text-stone-800 font-bold text-sm sm:text-base leading-snug">
              Muzey shu zahoti ochiladi — aylanib ko'ring
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex items-start gap-4 p-4 rounded-3xl bg-white border border-rose-100/80 shadow-sm hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center font-black text-lg shrink-0">
            3️⃣
          </div>
          <div className="flex-1 pt-1">
            <p className="text-stone-800 font-bold text-sm sm:text-base leading-snug">
              Yoqsa, yaqiningizga havola yoki yurakcha QR qilib yuboring 💝
            </p>
          </div>
        </div>
      </div>

      {/* Error message if user picked nothing or unsupported file */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* Loading overlay / status */}
      {isLoading ? (
        <div className="py-5 px-6 rounded-3xl bg-rose-50 border border-rose-200/80 text-center flex flex-col items-center justify-center gap-2 shadow-sm">
          <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
          <p className="text-base font-bold text-rose-700">Muzey tayyorlanmoqda...</p>
        </div>
      ) : (
        /* Big Primary Button: "Muzey yaratish" */
        <div className="pb-4">
          <button
            onClick={handleOpenPicker}
            className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-rose-500 via-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-[0.98] text-white font-extrabold text-lg sm:text-xl shadow-lg shadow-rose-300/50 flex items-center justify-center gap-3 transition cursor-pointer"
          >
            <Sparkles className="w-6 h-6" />
            <span>Muzey yaratish</span>
          </button>
          <p className="text-center text-xs text-stone-400 mt-3 font-medium">
            30 tagacha rasm yoki video tanlashingiz mumkin
          </p>
        </div>
      )}
    </div>
  );
};
