import * as THREE from 'three';

/**
 * Creates a procedural realistic warm wooden parquet floor texture.
 */
export function createWoodFloorTexture(anisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base warm honey/oak wood color
  ctx.fillStyle = '#C89D6B';
  ctx.fillRect(0, 0, 1024, 1024);

  // Draw parquet herringbone / plank layout
  const plankWidth = 256;
  const plankHeight = 64;

  const rows = 1024 / plankHeight;
  const cols = 1024 / plankWidth;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols + 1; c++) {
      const offsetX = (r % 2) * (plankWidth / 2);
      const x = c * plankWidth - offsetX;
      const y = r * plankHeight;

      // Slight plank color variation
      const toneVariation = Math.sin(r * 12.3 + c * 33.7) * 14;
      const rVal = Math.floor(205 + toneVariation);
      const gVal = Math.floor(160 + toneVariation * 0.9);
      const bVal = Math.floor(115 + toneVariation * 0.7);

      ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
      ctx.fillRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2);

      // Fine wood grain lines
      ctx.fillStyle = `rgba(130, 90, 50, 0.12)`;
      for (let g = 0; g < 6; g++) {
        const grainY = y + 4 + g * 9 + (Math.sin(x + g) * 3);
        ctx.fillRect(x + 2, grainY, plankWidth - 4, 1.5);
      }

      // Plank bevel / groove line
      ctx.strokeStyle = 'rgba(75, 45, 20, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, plankWidth - 2, plankHeight - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Creates a procedural warm light plaster wall texture.
 */
export function createWallTexture(anisotropy: number = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm cream / museum eggshell base
  ctx.fillStyle = '#F8F5EE';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle stipple / plaster noise
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.04;
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark ? `rgba(160, 150, 135, ${alpha})` : `rgba(255, 255, 255, ${alpha * 1.5})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Creates a subtle canvas texture for museum artwork placeholders / frames.
 */
export function createMatTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FCFBF8';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#ECE5D8';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, 248, 248);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
