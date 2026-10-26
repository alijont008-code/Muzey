/**
 * Muzeycha - 3D Virtual Museum
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Home } from './components/Home';
import { MuseumScene } from './components/MuseumScene';
import { ShareDialog } from './components/ShareDialog';
import { MuseumData, MuseumItem } from './types/museum';
import { getMuseumById, ensureAnonymousAuth } from './firebase';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentMuseum, setCurrentMuseum] = useState<MuseumData | null>(null);
  const [isViewOnly, setIsViewOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to extract museum ID from hash: #/m/<id>
  const getMuseumIdFromHash = (): string | null => {
    const hash = window.location.hash || '';
    const match = hash.match(/^#\/?m\/([a-zA-Z0-9]+)/);
    if (match) return match[1];

    // Fallback: check query param ?m=<id> or path /m/<id>
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('m');
    if (q && /^[a-zA-Z0-9]+$/.test(q)) return q;

    const pathMatch = window.location.pathname.match(/\/m\/([a-zA-Z0-9]+)/);
    if (pathMatch) return pathMatch[1];

    return null;
  };

  // Load a shared museum by ID from Firestore
  const loadSharedMuseum = useCallback(async (museumId: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Ensure anonymous auth for security/connection
      await ensureAnonymousAuth();

      const data = await getMuseumById(museumId);
      if (data && data.items && data.items.length > 0) {
        setCurrentMuseum(data);
        setIsViewOnly(true);
      } else {
        // Required exact text when museum does not exist
        setErrorMessage("Bunday muzey topilmadi.");
        setCurrentMuseum(null);
      }
    } catch (err) {
      console.error('Failed to load shared museum:', err);
      if (!navigator.onLine) {
        setErrorMessage("Ulashish uchun internetga ulanish kerak.");
      } else {
        setErrorMessage("Bunday muzey topilmadi.");
      }
      setCurrentMuseum(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hash route listener
  useEffect(() => {
    const checkHash = () => {
      const id = getMuseumIdFromHash();
      if (id) {
        loadSharedMuseum(id);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [loadSharedMuseum]);

  // When files are selected and processed from Home screen
  const handleMuseumCreated = useCallback((items: MuseumItem[]) => {
    const newMuseum: MuseumData = {
      id: '', // Will be assigned an 8-character ID when user uploads
      title: 'Muzeycha',
      createdAt: new Date().toISOString(),
      roomType: items.length <= 8 ? 'single' : items.length <= 16 ? 'hall' : 'l_shaped',
      items,
    };
    setCurrentMuseum(newMuseum);
    setIsViewOnly(false);
    setIsLoading(false);
  }, []);

  // Button: "Yangi muzey"
  const handleNewMuseum = useCallback(() => {
    // Reset URL hash to root
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
    setCurrentMuseum(null);
    setIsViewOnly(false);
    setIsShareOpen(false);
    setErrorMessage(null);
  }, []);

  // When museum is successfully uploaded via ShareDialog
  const handleMuseumUpdated = useCallback((updatedMuseum: MuseumData) => {
    setCurrentMuseum(updatedMuseum);
    // Update hash silently so refreshing keeps the user on their museum
    if (updatedMuseum.id) {
      window.history.replaceState(null, '', `#/m/${updatedMuseum.id}`);
    }
  }, []);

  // Loading Screen (Muzey tayyorlanmoqda...)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 shadow-sm">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Muzey tayyorlanmoqda...</h2>
        <p className="text-sm text-stone-500 max-w-xs">
          Rasm va videolaringiz 3D galereyaga joylashtirilmoqda
        </p>
      </div>
    );
  }

  // Error Screen (e.g. "Bunday muzey topilmadi.")
  if (errorMessage && !currentMuseum) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">{errorMessage}</h2>
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleNewMuseum}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-base shadow-md shadow-rose-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Yangi muzey</span>
          </button>
        </div>
      </div>
    );
  }

  // 3D Museum View
  if (currentMuseum) {
    return (
      <main className="relative w-full h-screen overflow-hidden">
        <MuseumScene
          museum={currentMuseum}
          onNewMuseum={handleNewMuseum}
          onOpenShare={() => setIsShareOpen(true)}
          isViewOnly={isViewOnly}
        />

        {/* Share Dialog only available in creator mode */}
        {!isViewOnly && (
          <ShareDialog
            museum={currentMuseum}
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            onMuseumUpdated={handleMuseumUpdated}
          />
        )}
      </main>
    );
  }

  // Home Screen
  return (
    <Home
      onMuseumCreated={handleMuseumCreated}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
    />
  );
}
