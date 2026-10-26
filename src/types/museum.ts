/**
 * Types for Muzeycha - 3D Virtual Museum
 */

export interface MuseumItem {
  id: string;
  type: 'image' | 'video';
  url: string; // Object URL or remote Cloud URL
  aspectRatio: number; // width / height
  originalWidth: number;
  originalHeight: number;
  name: string;
  file?: File; // Temporary local file reference for uploading to Firebase
  videoElement?: HTMLVideoElement; // For video textures
  isMuted?: boolean;
}

export type RoomLayoutType = 'single' | 'hall' | 'l_shaped';

export interface FramePlacement {
  id: string;
  item: MuseumItem;
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number]; // Euler angles (radians)
  width: number;
  height: number;
  wallNormal: [number, number, number];
}

export interface WallSegment {
  start: [number, number]; // x, z
  end: [number, number];   // x, z
}

export interface MuseumLayout {
  type: RoomLayoutType;
  dimensions: {
    width: number;
    length: number;
    height: number;
    roomB?: {
      x: number;
      z: number;
      width: number;
      length: number;
    };
  };
  frames: FramePlacement[];
  walls: WallSegment[];
  spawnPoint: [number, number, number];
  spawnRotation: number;
}

export interface MuseumData {
  id: string;
  title: string;
  createdAt: string;
  roomType: RoomLayoutType;
  items: MuseumItem[];
}
