import * as THREE from 'three';
import { FramePlacement, MuseumItem } from '../types/museum';
import { createMatTexture } from '../utils/proceduralTextures';

export interface FrameObjectInfo {
  group: THREE.Group;
  mesh: THREE.Mesh;
  item: MuseumItem;
  placement: FramePlacement;
  videoElement?: HTMLVideoElement;
  toggleAudio?: () => boolean; // returns new muted state
  spotlight?: THREE.SpotLight;
}

/**
 * Creates a complete framed artwork for the 3D museum.
 */
export function createMuseumFrame(
  placement: FramePlacement,
  matTexture: THREE.CanvasTexture,
  textureLoader: THREE.TextureLoader
): FrameObjectInfo {
  const { width, height, position, rotation, item } = placement;
  const frameGroup = new THREE.Group();
  frameGroup.position.set(...position);
  frameGroup.rotation.set(...rotation);

  const frameDepth = 0.08;
  const frameBorder = 0.12;
  const matBorder = 0.08;

  // Outer Wood/Bronze Frame Material
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3D2C1E, // Warm dark walnut wood with subtle gloss
    roughness: 0.35,
    metalness: 0.25,
  });

  // Passe-partout (mat) Material
  const matMat = new THREE.MeshStandardMaterial({
    map: matTexture,
    roughness: 0.85,
    metalness: 0.0,
  });

  // 1. Outer Frame Molding (Box)
  const outerWidth = width + (frameBorder + matBorder) * 2;
  const outerHeight = height + (frameBorder + matBorder) * 2;
  const outerGeo = new THREE.BoxGeometry(outerWidth, outerHeight, frameDepth);
  const outerMesh = new THREE.Mesh(outerGeo, frameMat);
  outerMesh.position.z = frameDepth / 2;
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;
  frameGroup.add(outerMesh);

  // 2. Inner Mat (Passe-partout)
  const innerMatWidth = width + matBorder * 2;
  const innerMatHeight = height + matBorder * 2;
  const matGeo = new THREE.PlaneGeometry(innerMatWidth, innerMatHeight);
  const matMesh = new THREE.Mesh(matGeo, matMat);
  matMesh.position.z = frameDepth + 0.002;
  frameGroup.add(matMesh);

  // 3. Inner Gold Accent Trim
  const goldTrimGeo = new THREE.RingGeometry(0.001, 0.01, 4);
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xD4AF37,
    roughness: 0.2,
    metalness: 0.8,
  });

  // 4. Artwork Canvas Quad
  const artGeo = new THREE.PlaneGeometry(width, height);
  let artMat: THREE.MeshBasicMaterial;
  let videoEl: HTMLVideoElement | undefined;
  let toggleAudio: (() => boolean) | undefined;

  if (item.type === 'video') {
    // Create HTML5 Video Element for texture
    videoEl = document.createElement('video');
    videoEl.src = item.url;
    videoEl.crossOrigin = 'anonymous';
    videoEl.loop = true;
    videoEl.muted = true; // muted initially as requested
    videoEl.playsInline = true;
    videoEl.autoplay = true;

    // Play safely
    videoEl.play().catch((err) => {
      console.warn('Auto-play blocked, will resume on interaction:', err);
    });

    const videoTexture = new THREE.VideoTexture(videoEl);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    artMat = new THREE.MeshBasicMaterial({
      map: videoTexture,
      toneMapped: true,
    });

    item.videoElement = videoEl;
    item.isMuted = true;

    toggleAudio = () => {
      if (!videoEl) return true;
      videoEl.muted = !videoEl.muted;
      item.isMuted = videoEl.muted;
      return videoEl.muted;
    };
  } else {
    // Photo texture
    const texture = textureLoader.load(item.url, (loadedTex) => {
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      loadedTex.needsUpdate = true;
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    artMat = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: true,
    });
  }

  const artMesh = new THREE.Mesh(artGeo, artMat);
  artMesh.position.z = frameDepth + 0.005;
  // Mark for raycasting and interaction
  artMesh.userData = {
    type: 'frame',
    frameId: placement.id,
    item,
    placement,
  };
  frameGroup.add(artMesh);

  // 5. Brass / Gallery Plaque under the frame
  const plaqueWidth = Math.min(width * 0.6, 0.45);
  const plaqueHeight = 0.06;
  const plaqueGeo = new THREE.PlaneGeometry(plaqueWidth, plaqueHeight);
  const plaqueMat = new THREE.MeshStandardMaterial({
    color: 0xC5A059, // Warm brushed brass
    metalness: 0.85,
    roughness: 0.25,
  });
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.position.set(0, -outerHeight / 2 - 0.06, 0.01);
  frameGroup.add(plaqueMesh);

  // 6. Ceiling Spotlight Rig above the frame
  // Fixture placed 0.8m above frame pointing gently down
  const spotY = outerHeight / 2 + 0.45;
  const spotZ = 0.65;

  const spotlight = new THREE.SpotLight(0xFFF3E0, 4.5);
  spotlight.position.set(0, spotY, spotZ);
  spotlight.target = artMesh;
  spotlight.angle = Math.PI / 4.5;
  spotlight.penumbra = 0.6;
  spotlight.distance = 4.0;
  spotlight.decay = 1.8;
  spotlight.castShadow = false; // keep draw calls fast on mid-range phones
  frameGroup.add(spotlight);

  // Spotlight cylinder fixture
  const fixtureGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 12);
  const fixtureMat = new THREE.MeshStandardMaterial({
    color: 0x1E1E1E,
    metalness: 0.8,
    roughness: 0.2,
  });
  const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
  fixtureMesh.position.set(0, spotY, spotZ);
  fixtureMesh.rotation.x = Math.PI / 4;
  frameGroup.add(fixtureMesh);

  return {
    group: frameGroup,
    mesh: artMesh,
    item,
    placement,
    videoElement: videoEl,
    toggleAudio,
    spotlight,
  };
}
