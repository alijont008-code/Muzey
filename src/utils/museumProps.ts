import * as THREE from 'three';

/**
 * Creates a procedural 3D museum bench (composite model with wooden slats and metal legs).
 */
export function createMuseumBench(): THREE.Group {
  const bench = new THREE.Group();

  // Metal frame material
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x2A2724,
    metalness: 0.8,
    roughness: 0.3,
  });

  // Wood slats material
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x9B6D43,
    roughness: 0.45,
    metalness: 0.1,
  });

  // Bench legs (2 U-shaped or rectangular leg frames)
  const legGeo = new THREE.BoxGeometry(0.06, 0.45, 0.65);
  const leftLeg = new THREE.Mesh(legGeo, metalMat);
  leftLeg.position.set(-0.8, 0.225, 0);
  leftLeg.castShadow = true;
  bench.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, metalMat);
  rightLeg.position.set(0.8, 0.225, 0);
  rightLeg.castShadow = true;
  bench.add(rightLeg);

  // Stretcher beam underneath
  const beamGeo = new THREE.BoxGeometry(1.6, 0.04, 0.04);
  const beam = new THREE.Mesh(beamGeo, metalMat);
  beam.position.set(0, 0.15, 0);
  bench.add(beam);

  // 4 Wooden slats for seat
  const slatGeo = new THREE.BoxGeometry(1.9, 0.04, 0.14);
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(slatGeo, woodMat);
    slat.position.set(0, 0.46, -0.24 + i * 0.16);
    slat.castShadow = true;
    slat.receiveShadow = true;
    bench.add(slat);
  }

  // Soft contact shadow under the bench
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(30, 20, 10, 0.35)');
  grad.addColorStop(1, 'rgba(30, 20, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(2.1, 0.9);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.6,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  bench.add(shadowMesh);

  return bench;
}

/**
 * Creates a procedural potted museum plant (ceramic pot + stems + lush broad leaves).
 */
export function createPottedPlant(): THREE.Group {
  const plant = new THREE.Group();

  // White ceramic pot
  const potGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.6, 24);
  const potMat = new THREE.MeshStandardMaterial({
    color: 0xFDFBF7,
    roughness: 0.25,
    metalness: 0.1,
  });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.3;
  pot.castShadow = true;
  pot.receiveShadow = true;
  plant.add(pot);

  // Dark soil
  const soilGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20);
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x2A1C15,
    roughness: 0.9,
  });
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.position.y = 0.58;
  plant.add(soil);

  // Stems and green leaves
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2D6A4F,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });

  const leafCount = 9;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2 + Math.random() * 0.3;
    const height = 0.6 + (i % 3) * 0.25;
    const leafGroup = new THREE.Group();
    leafGroup.position.set(0, 0.58, 0);
    leafGroup.rotation.y = angle;

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.018, height, 8);
    const stem = new THREE.Mesh(stemGeo, leafMat);
    stem.position.set(0.08, height / 2, 0.08);
    stem.rotation.z = -0.3;
    leafGroup.add(stem);

    // Leaf blade (smooth curved ellipse)
    const bladeGeo = new THREE.SphereGeometry(0.22, 12, 12);
    bladeGeo.scale(0.8, 1.4, 0.1);
    const blade = new THREE.Mesh(bladeGeo, leafMat);
    blade.position.set(0.24, height + 0.1, 0.24);
    blade.rotation.x = 0.4;
    blade.rotation.z = -0.4;
    blade.castShadow = true;
    leafGroup.add(blade);

    plant.add(leafGroup);
  }

  // Soft contact shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(25, 20, 15, 0.4)');
  grad.addColorStop(1, 'rgba(25, 20, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(0.8, 0.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  plant.add(shadowMesh);

  return plant;
}
