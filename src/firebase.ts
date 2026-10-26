/*
================================================================================
FIRESTORE SECURITY RULES (firestore.rules)
Copy and paste into Firebase Console -> Firestore Database -> Rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 32 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function incoming() {
      return request.resource.data;
    }

    function isValidMuseum(data) {
      return data.keys().hasAll(['id', 'createdAt', 'roomType', 'itemCount', 'items'])
        && data.keys().hasOnly(['id', 'createdAt', 'roomType', 'itemCount', 'items'])
        && data.id is string && data.id.size() <= 32
        && data.createdAt is string && data.createdAt.size() <= 64
        && data.roomType in ['single', 'hall', 'l_shaped']
        && data.itemCount is number && data.itemCount >= 1 && data.itemCount <= 30
        && data.items is list && data.items.size() >= 1 && data.items.size() <= 30;
    }

    match /museums/{museumId} {
      // Public read: anyone can view a museum via shared link
      allow get: if isValidId(museumId);
      allow list: if false;
      // Creation allowed with strict schema verification
      allow create: if isValidId(museumId) && incoming().id == museumId && isValidMuseum(incoming());
      // No update or delete allowed
      allow update, delete: if false;
    }
  }
}
================================================================================
*/

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { MuseumData, MuseumItem } from './types/museum';
import { withTimeout, uploadToCloudinary } from './utils/cloudinaryUpload';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Generates an 8-character unique alphanumeric ID (letters and digits).
 */
export function generateShortId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Ensures anonymous authentication with a 15-second timeout.
 * Never throws or blocks if Anonymous Auth is disabled on the project.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    const cred = await withTimeout(
      signInAnonymously(auth),
      15000,
      'Firebase Autentifikatsiyasi'
    );
    console.log('[Muzeycha] Anonim auth muvaffaqiyatli:', cred.user.uid);
    return cred.user;
  } catch (error: unknown) {
    console.warn(
      '[Muzeycha] Anonim auth o\'tkazib yuborildi (mehmon rejimida davom etilmoqda):',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Tests connection to Firestore with a 15-second timeout.
 */
export async function checkOnlineAndConfigured(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }
  try {
    await withTimeout(
      getDocFromServer(doc(db, 'test', 'connection')),
      15000,
      'Tarmoq tekshiruvi'
    );
    return true;
  } catch (error) {
    console.warn('[Muzeycha] Firestore connection probe status:', error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return false;
    }
    // As long as browser is online, return true
    return navigator.onLine;
  }
}

/**
 * Saves museum to Cloudinary (for media) and Firestore (for document layout).
 * 15-second timeout per operation, live progress updates per file, and verbose logging.
 */
export async function saveMuseumToFirebase(
  museum: MuseumData,
  onProgress: (percent: number) => void
): Promise<{ id: string; updatedItems: MuseumItem[] }> {
  console.log('[Muzeycha] === Muzeyni saqlash jarayoni boshlandi ===');
  console.log(`[Muzeycha] Jami fayllar soni: ${museum.items.length}`);

  // 1. Initial Step: 10%
  onProgress(10);
  await ensureAnonymousAuth();
  console.log('[Muzeycha] 1. Autentifikatsiya bosqichi tugadi.');

  // 2. Short 8-character ID
  const museumId =
    museum.id && museum.id.length === 8 && /^[a-zA-Z0-9]+$/.test(museum.id)
      ? museum.id
      : generateShortId();

  console.log(`[Muzeycha] Muzey ID: ${museumId}`);

  // 3. Upload items one by one and update progress realistically
  const totalItems = museum.items.length;
  const updatedItems: MuseumItem[] = [];

  for (let i = 0; i < totalItems; i++) {
    const item = museum.items[i];
    console.log(
      `[Muzeycha] 2. Fayl yuklash boshlandi (${i + 1}/${totalItems}): "${item.name}" (Turi: ${item.type})`
    );

    let remoteUrl = item.url;

    if (item.file) {
      // Upload via Cloudinary with 15s timeout
      remoteUrl = await withTimeout(
        uploadToCloudinary(item.file, item.name),
        15000,
        `Faylni yuklash ("${item.name}")`
      );
    } else {
      console.log(`[Muzeycha] Fayl allaqachon URL ko'rinishida: "${item.name}"`);
    }

    updatedItems.push({
      id: item.id,
      type: item.type,
      url: remoteUrl,
      aspectRatio: Number(item.aspectRatio.toFixed(4)),
      originalWidth: item.originalWidth,
      originalHeight: item.originalHeight,
      name: item.name,
      file: undefined, // Cleared after upload
    });

    // Real progress update after each file: from 10% up to 90%
    const currentPercent = 10 + Math.round(((i + 1) / totalItems) * 80);
    onProgress(Math.min(currentPercent, 90));
    console.log(
      `[Muzeycha] 3. Fayl yuklandi (${i + 1}/${totalItems}) -> Progress: ${currentPercent}%`
    );
  }

  // 4. Firestore Save: 92%
  onProgress(92);
  console.log(`[Muzeycha] 4. Firestore'ga hujjat yozilmoqda: museums/${museumId}...`);

  const docData = {
    id: museumId,
    title: museum.title || 'Muzeycha',
    createdAt: museum.createdAt || new Date().toISOString(),
    roomType: museum.roomType,
    itemCount: updatedItems.length,
    items: updatedItems.map((it) => ({
      id: it.id,
      type: it.type,
      url: it.url,
      aspectRatio: it.aspectRatio,
      originalWidth: it.originalWidth,
      originalHeight: it.originalHeight,
      name: it.name,
    })),
  };

  await withTimeout(
    setDoc(doc(db, 'museums', museumId), docData),
    15000,
    "Firestore'ga saqlash"
  );

  console.log(`[Muzeycha] 5. Firestore'da muzey muvaffaqiyatli saqlandi! ID: ${museumId}`);
  onProgress(100);

  return { id: museumId, updatedItems };
}

/**
 * Loads a shared museum from Firestore by id with a 15-second timeout.
 */
export async function getMuseumById(museumId: string): Promise<MuseumData | null> {
  console.log(`[Muzeycha] Firestore'dan muzey yuklanmoqda: ${museumId}...`);

  const docRef = doc(db, 'museums', museumId);
  const snap = await withTimeout(
    getDoc(docRef),
    15000,
    "Muzeyni yuklab olish"
  );

  if (!snap.exists()) {
    console.warn(`[Muzeycha] Muzey topilmadi: ${museumId}`);
    return null;
  }

  const data = snap.data();
  console.log(`[Muzeycha] Muzey muvaffaqiyatli yuklandi: ${museumId}`);

  return {
    id: data.id || museumId,
    title: data.title || 'Muzeycha',
    createdAt: data.createdAt || new Date().toISOString(),
    roomType: data.roomType || 'single',
    items: (data.items || []).map((it: MuseumItem) => ({
      id: it.id,
      type: it.type || 'image',
      url: it.url,
      aspectRatio: it.aspectRatio || 1.33,
      originalWidth: it.originalWidth || 800,
      originalHeight: it.originalHeight || 600,
      name: it.name || '',
    })),
  };
}
