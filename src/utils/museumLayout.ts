import { FramePlacement, MuseumItem, MuseumLayout, RoomLayoutType, WallSegment } from '../types/museum';

/**
 * Procedurally generates a museum room layout based on the number of items.
 */
export function generateMuseumLayout(items: MuseumItem[]): MuseumLayout {
  const count = items.length;
  let roomType: RoomLayoutType = 'single';

  if (count <= 8) {
    roomType = 'single';
    return generateSingleRoomLayout(items);
  } else if (count <= 16) {
    roomType = 'hall';
    return generateHallLayout(items);
  } else {
    roomType = 'l_shaped';
    return generateLShapedLayout(items);
  }
}

/**
 * Calculates optimal width and height for a frame maintaining exact aspect ratio.
 */
function calculateFrameDimensions(aspectRatio: number): { width: number; height: number } {
  const baseArea = 1.8; // Target visual area in meters squared
  let height = Math.sqrt(baseArea / aspectRatio);
  let width = height * aspectRatio;

  // Clamp within museum scale
  if (width > 2.4) {
    width = 2.4;
    height = width / aspectRatio;
  }
  if (height > 2.0) {
    height = 2.0;
    width = height * aspectRatio;
  }
  if (height < 0.8) {
    height = 0.8;
    width = height * aspectRatio;
  }
  if (width < 0.8) {
    width = 0.8;
    height = width / aspectRatio;
  }

  return { width, height };
}

/**
 * Single rectangular room (<= 8 items)
 */
function generateSingleRoomLayout(items: MuseumItem[]): MuseumLayout {
  const roomWidth = 10;
  const roomLength = 10;
  const roomHeight = 3.8;
  const halfW = roomWidth / 2;
  const halfL = roomLength / 2;
  const wallOffset = 0.08; // slight offset from wall to avoid z-fighting

  const frames: FramePlacement[] = [];
  const count = items.length;

  // Determine wall slots:
  // Back wall (facing +Z, rotation 0): Z = -halfL + offset
  // Left wall (facing +X, rotation Math.PI/2): X = -halfW + offset
  // Right wall (facing -X, rotation -Math.PI/2): X = halfW - offset
  // Front wall (facing -Z, rotation Math.PI): Z = halfL - offset

  type Slot = {
    pos: [number, number, number];
    rot: [number, number, number];
    normal: [number, number, number];
  };

  const slots: Slot[] = [];

  if (count === 1) {
    // Single centerpiece on back wall
    slots.push({
      pos: [0, 1.8, -halfL + wallOffset],
      rot: [0, 0, 0],
      normal: [0, 0, 1],
    });
  } else if (count === 2) {
    slots.push({
      pos: [-1.8, 1.8, -halfL + wallOffset],
      rot: [0, 0, 0],
      normal: [0, 0, 1],
    });
    slots.push({
      pos: [1.8, 1.8, -halfL + wallOffset],
      rot: [0, 0, 0],
      normal: [0, 0, 1],
    });
  } else if (count === 3) {
    slots.push({
      pos: [0, 1.8, -halfL + wallOffset],
      rot: [0, 0, 0],
      normal: [0, 0, 1],
    });
    slots.push({
      pos: [-halfW + wallOffset, 1.8, 0],
      rot: [0, Math.PI / 2, 0],
      normal: [1, 0, 0],
    });
    slots.push({
      pos: [halfW - wallOffset, 1.8, 0],
      rot: [0, -Math.PI / 2, 0],
      normal: [-1, 0, 0],
    });
  } else if (count === 4) {
    slots.push({
      pos: [0, 1.8, -halfL + wallOffset],
      rot: [0, 0, 0],
      normal: [0, 0, 1],
    });
    slots.push({
      pos: [-halfW + wallOffset, 1.8, 0],
      rot: [0, Math.PI / 2, 0],
      normal: [1, 0, 0],
    });
    slots.push({
      pos: [halfW - wallOffset, 1.8, 0],
      rot: [0, -Math.PI / 2, 0],
      normal: [-1, 0, 0],
    });
    slots.push({
      pos: [0, 1.8, halfL - wallOffset],
      rot: [0, Math.PI, 0],
      normal: [0, 0, -1],
    });
  } else {
    // 5 to 8 items: 2 on back, 2 on left, 2 on right, 1-2 on front
    slots.push(
      { pos: [-2, 1.8, -halfL + wallOffset], rot: [0, 0, 0], normal: [0, 0, 1] },
      { pos: [2, 1.8, -halfL + wallOffset], rot: [0, 0, 0], normal: [0, 0, 1] },
      { pos: [-halfW + wallOffset, 1.8, -1.8], rot: [0, Math.PI / 2, 0], normal: [1, 0, 0] },
      { pos: [-halfW + wallOffset, 1.8, 1.8], rot: [0, Math.PI / 2, 0], normal: [1, 0, 0] },
      { pos: [halfW - wallOffset, 1.8, -1.8], rot: [0, -Math.PI / 2, 0], normal: [-1, 0, 0] },
      { pos: [halfW - wallOffset, 1.8, 1.8], rot: [0, -Math.PI / 2, 0], normal: [-1, 0, 0] },
      { pos: [-2, 1.8, halfL - wallOffset], rot: [0, Math.PI, 0], normal: [0, 0, -1] },
      { pos: [2, 1.8, halfL - wallOffset], rot: [0, Math.PI, 0], normal: [0, 0, -1] }
    );
  }

  items.forEach((item, index) => {
    const slot = slots[index % slots.length];
    const { width, height } = calculateFrameDimensions(item.aspectRatio);
    frames.push({
      id: item.id,
      item,
      position: slot.pos,
      rotation: slot.rot,
      width,
      height,
      wallNormal: slot.normal,
    });
  });

  const walls: WallSegment[] = [
    { start: [-halfW, -halfL], end: [halfW, -halfL] }, // Back
    { start: [halfW, -halfL], end: [halfW, halfL] },   // Right
    { start: [halfW, halfL], end: [-halfW, halfL] },   // Front
    { start: [-halfW, halfL], end: [-halfW, -halfL] }, // Left
  ];

  return {
    type: 'single',
    dimensions: {
      width: roomWidth,
      length: roomLength,
      height: roomHeight,
    },
    frames,
    walls,
    spawnPoint: [0, 1.7, 3.2],
    spawnRotation: 0,
  };
}

/**
 * Long Grand Hall (9 - 16 items)
 */
function generateHallLayout(items: MuseumItem[]): MuseumLayout {
  const roomWidth = 8;
  const roomLength = 22;
  const roomHeight = 4.2;
  const halfW = roomWidth / 2;
  const halfL = roomLength / 2;
  const wallOffset = 0.08;

  const frames: FramePlacement[] = [];
  const count = items.length;

  // Left wall slots and Right wall slots
  const leftSlots: number[] = [];
  const rightSlots: number[] = [];

  const perSide = Math.ceil((count - 1) / 2);
  const startZ = -halfL + 2.5;
  const endZ = halfL - 2.5;
  const step = (endZ - startZ) / Math.max(perSide - 1, 1);

  for (let i = 0; i < perSide; i++) {
    const z = startZ + i * step;
    leftSlots.push(z);
    rightSlots.push(z);
  }

  // 1 item on far back wall centerpiece
  const backItem = items[0];
  const { width: bw, height: bh } = calculateFrameDimensions(backItem.aspectRatio);
  frames.push({
    id: backItem.id,
    item: backItem,
    position: [0, 1.8, -halfL + wallOffset],
    rotation: [0, 0, 0],
    width: Math.min(bw * 1.2, 2.6),
    height: Math.min(bh * 1.2, 2.2),
    wallNormal: [0, 0, 1],
  });

  // Remaining items split between left and right walls
  let leftIdx = 0;
  let rightIdx = 0;

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const { width, height } = calculateFrameDimensions(item.aspectRatio);

    if (i % 2 === 1 && leftIdx < leftSlots.length) {
      const z = leftSlots[leftIdx++];
      frames.push({
        id: item.id,
        item,
        position: [-halfW + wallOffset, 1.8, z],
        rotation: [0, Math.PI / 2, 0],
        width,
        height,
        wallNormal: [1, 0, 0],
      });
    } else if (rightIdx < rightSlots.length) {
      const z = rightSlots[rightIdx++];
      frames.push({
        id: item.id,
        item,
        position: [halfW - wallOffset, 1.8, z],
        rotation: [0, -Math.PI / 2, 0],
        width,
        height,
        wallNormal: [-1, 0, 0],
      });
    }
  }

  const walls: WallSegment[] = [
    { start: [-halfW, -halfL], end: [halfW, -halfL] },
    { start: [halfW, -halfL], end: [halfW, halfL] },
    { start: [halfW, halfL], end: [-halfW, halfL] },
    { start: [-halfW, halfL], end: [-halfW, -halfL] },
  ];

  return {
    type: 'hall',
    dimensions: {
      width: roomWidth,
      length: roomLength,
      height: roomHeight,
    },
    frames,
    walls,
    spawnPoint: [0, 1.7, halfL - 3.5],
    spawnRotation: 0,
  };
}

/**
 * L-shaped gallery (> 16 items, up to 30)
 */
function generateLShapedLayout(items: MuseumItem[]): MuseumLayout {
  // Wing A: X: -4 to 4, Z: -12 to 6 (length 18, width 8)
  // Wing B: X: 4 to 18, Z: -4 to 4 (length 14, width 8), connected at junction X: [4, 4], Z: [-4, 4]
  const roomHeight = 4.0;
  const wallOffset = 0.08;
  const frames: FramePlacement[] = [];

  // Divide items: approx 55% in Wing A, 45% in Wing B
  const splitIndex = Math.ceil(items.length * 0.55);
  const itemsA = items.slice(0, splitIndex);
  const itemsB = items.slice(splitIndex);

  // Wing A frames
  // Far end wall at Z = -12
  const centerA = itemsA[0];
  const { width: cw, height: ch } = calculateFrameDimensions(centerA.aspectRatio);
  frames.push({
    id: centerA.id,
    item: centerA,
    position: [0, 1.8, -12 + wallOffset],
    rotation: [0, 0, 0],
    width: Math.min(cw * 1.1, 2.5),
    height: Math.min(ch * 1.1, 2.0),
    wallNormal: [0, 0, 1],
  });

  // Left wall of Wing A (X = -4, Z from -10 to 4)
  const leftCount = Math.ceil((itemsA.length - 1) / 2);
  const stepLeft = 14 / Math.max(leftCount, 1);
  for (let i = 1; i <= leftCount && i < itemsA.length; i++) {
    const item = itemsA[i];
    const z = -10 + (i - 0.5) * stepLeft;
    const { width, height } = calculateFrameDimensions(item.aspectRatio);
    frames.push({
      id: item.id,
      item,
      position: [-4 + wallOffset, 1.8, z],
      rotation: [0, Math.PI / 2, 0],
      width,
      height,
      wallNormal: [1, 0, 0],
    });
  }

  // Right wall of Wing A (X = 4, Z from -10 to -5)
  for (let i = leftCount + 1; i < itemsA.length; i++) {
    const item = itemsA[i];
    const z = -11 + (i - leftCount) * 1.6;
    if (z > -4.5) break;
    const { width, height } = calculateFrameDimensions(item.aspectRatio);
    frames.push({
      id: item.id,
      item,
      position: [4 - wallOffset, 1.8, z],
      rotation: [0, -Math.PI / 2, 0],
      width,
      height,
      wallNormal: [-1, 0, 0],
    });
  }

  // Wing B frames
  // Far right wall of Wing B (X = 18, Z: -3.5 to 3.5)
  if (itemsB.length > 0) {
    const centerB = itemsB[0];
    const { width: bw, height: bh } = calculateFrameDimensions(centerB.aspectRatio);
    frames.push({
      id: centerB.id,
      item: centerB,
      position: [18 - wallOffset, 1.8, 0],
      rotation: [0, -Math.PI / 2, 0],
      width: Math.min(bw * 1.1, 2.4),
      height: Math.min(bh * 1.1, 2.0),
      wallNormal: [-1, 0, 0],
    });
  }

  // North wall of Wing B (Z = -4, X from 5 to 16)
  // South wall of Wing B (Z = 4, X from 5 to 16)
  const remainingB = itemsB.slice(1);
  const halfB = Math.ceil(remainingB.length / 2);
  const stepB = 10 / Math.max(halfB, 1);

  remainingB.forEach((item, idx) => {
    const { width, height } = calculateFrameDimensions(item.aspectRatio);
    if (idx < halfB) {
      const x = 5.5 + idx * stepB;
      frames.push({
        id: item.id,
        item,
        position: [x, 1.8, -4 + wallOffset],
        rotation: [0, 0, 0],
        width,
        height,
        wallNormal: [0, 0, 1],
      });
    } else {
      const x = 5.5 + (idx - halfB) * stepB;
      frames.push({
        id: item.id,
        item,
        position: [x, 1.8, 4 - wallOffset],
        rotation: [0, Math.PI, 0],
        width,
        height,
        wallNormal: [0, 0, -1],
      });
    }
  });

  const walls: WallSegment[] = [
    // Wing A perimeter
    { start: [-4, -12], end: [4, -12] },
    { start: [4, -12], end: [4, -4] },
    { start: [4, -4], end: [18, -4] },
    { start: [18, -4], end: [18, 4] },
    { start: [18, 4], end: [4, 4] },
    { start: [4, 4], end: [4, 6] },
    { start: [4, 6], end: [-4, 6] },
    { start: [-4, 6], end: [-4, -12] },
  ];

  return {
    type: 'l_shaped',
    dimensions: {
      width: 8,
      length: 18,
      height: roomHeight,
      roomB: {
        x: 4,
        z: -4,
        width: 14,
        length: 8,
      },
    },
    frames,
    walls,
    spawnPoint: [0, 1.7, 4.5],
    spawnRotation: 0,
  };
}
