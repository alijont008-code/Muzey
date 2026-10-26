import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { MuseumItem } from '../types/museum';
import { processFileList } from '../utils/compression';

interface UploaderProps {
  onFilesProcessed: (items: MuseumItem[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  className?: string;
  triggerButton?: React.ReactNode;
}

export const Uploader: React.FC<UploaderProps> = ({
  onFilesProcessed,
  isLoading,
  setIsLoading,
  className = '',
  triggerButton,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = () => {
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
      onFilesProcessed(items);
    } catch (err: unknown) {
      console.error('Upload processing error:', err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Bu fayl turi qo'llab-quvvatlanmaydi.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {triggerButton ? (
        <div onClick={handleClick}>{triggerButton}</div>
      ) : (
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="w-full py-4 px-6 rounded-3xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-lg shadow-lg shadow-rose-200 flex items-center justify-center gap-3 transition"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Muzey tayyorlanmoqda...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-6 h-6" />
              <span>Muzey yaratish</span>
            </>
          )}
        </button>
      )}

      {errorMessage && (
        <div className="mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
