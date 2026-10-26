import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MuseumData, MuseumItem } from '../types/museum';
import { generateMuseumLayout } from '../utils/museumLayout';
import { createWoodFloorTexture, createWallTexture, createMatTexture } from '../utils/proceduralTextures';
import { createMuseumBench, createPottedPlant } from '../utils/museumProps';
import { createMuseumFrame, FrameObjectInfo } from './MuseumFrame';
import { Joystick } from './Joystick';
import { Volume2, VolumeX, ArrowLeft, Share2, Sparkles } from 'lucide-react';

interface MuseumSceneProps {
  museum: MuseumData;
  onNewMuseum: () => void;
  onOpenShare: () => void;
  isViewOnly?: boolean;
}

export const MuseumScene: React.FC<MuseumSceneProps> = ({
  museum,
  onNewMuseum,
  onOpenShare,
  isViewOnly = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [zoomedItem, setZoomedItem] = useState<MuseumItem | null>(null);
  const [zoomedMuted, setZoomedMuted] = useState<boolean>(true);
  const [showHint, setShowHint] = useState<boolean>(true);

  // Active frame refs
  const frameObjectsRef = useRef<FrameObjectInfo[]>([]);
  const activeZoomFrameRef = useRef<FrameObjectInfo | null>(null);

  // Joystick vector ref
  const moveVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera & Interaction states
  const cameraStateRef = useRef({
    x: 0,
    y: 1.7,
    z: 5,
    yaw: 0, // rotation around Y (radians)
    pitch: 0, // rotation around X (radians)
    targetYaw: 0,
    targetPitch: 0,
    isZooming: false,
    zoomTargetPos: new THREE.Vector3(),
    zoomTargetLookAt: new THREE.Vector3(),
    introProgress: 0, // 0 to 1 for initial fly-in
  });

  // Touch drag tracking for looking around
  const touchLookRef = useRef<{
    lastX: number;
    lastY: number;
    activeTouchId: number | null;
    isDragging: boolean;
  }>({
    lastX: 0,
    lastY: 0,
    activeTouchId: null,
    isDragging: false,
  });

  // Keyboard keys tracking
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Hint timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFBF8F2);
    scene.fog = new THREE.FogExp2(0xFBF8F2, 0.025);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Layout generation
    const layout = generateMuseumLayout(museum.items);

    // Spawn camera position
    const [spawnX, spawnY, spawnZ] = layout.spawnPoint;
    cameraStateRef.current.x = spawnX;
    cameraStateRef.current.y = spawnY;
    cameraStateRef.current.z = spawnZ + 2.5; // start slightly back for fly-in
    cameraStateRef.current.yaw = layout.spawnRotation;
    cameraStateRef.current.targetYaw = layout.spawnRotation;
    cameraStateRef.current.pitch = 0.05;
    cameraStateRef.current.targetPitch = 0.0;
    cameraStateRef.current.introProgress = 0;

    // Lighting: Warm museum studio rig
    const hemiLight = new THREE.HemisphereLight(0xFFF9F0, 0xDECAB4, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xFFF4E0, 1.8);
    keyLight.position.set(5, 12, 5);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 40;
      keyLight.shadow.camera.left = -15;
      keyLight.shadow.camera.right = 15;
      keyLight.shadow.camera.top = 15;
      keyLight.shadow.camera.bottom = -15;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0xEAE0D5, 0.8);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);

    // Procedural textures
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const woodFloorTexture = createWoodFloorTexture(maxAnisotropy);
    const wallTexture = createWallTexture(maxAnisotropy);
    const matTexture = createMatTexture();

    // Floor Material
    const floorMat = new THREE.MeshStandardMaterial({
      map: woodFloorTexture,
      roughness: 0.35,
      metalness: 0.05,
    });

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.9,
      metalness: 0.02,
    });

    // Ceiling Material
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xFDFBF7,
      roughness: 0.95,
    });

    // Baseboard / Skirting board Material
    const skirtingMat = new THREE.MeshStandardMaterial({
      color: 0x4A3728, // Dark walnut skirting
      roughness: 0.4,
    });

    // Build Room Geometry
    const roomHeight = layout.dimensions.height;

    if (layout.type === 'single' || layout.type === 'hall') {
      const rw = layout.dimensions.width;
      const rl = layout.dimensions.length;

      // Floor
      const floorGeo = new THREE.PlaneGeometry(rw, rl);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = !isSoftwareGl;
      scene.add(floorMesh);

      // Ceiling
      const ceilingGeo = new THREE.PlaneGeometry(rw, rl);
      const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceilingMesh.rotation.x = Math.PI / 2;
      ceilingMesh.position.y = roomHeight;
      scene.add(ceilingMesh);

      // 4 Walls
      // Back wall (Z = -rl/2)
      const backGeo = new THREE.PlaneGeometry(rw, roomHeight);
      const backWall = new THREE.Mesh(backGeo, wallMat);
      backWall.position.set(0, roomHeight / 2, -rl / 2);
      backWall.receiveShadow = true;
      scene.add(backWall);

      // Front wall (Z = rl/2)
      const frontWall = new THREE.Mesh(backGeo, wallMat);
      frontWall.position.set(0, roomHeight / 2, rl / 2);
      frontWall.rotation.y = Math.PI;
      frontWall.receiveShadow = true;
      scene.add(frontWall);

      // Left wall (X = -rw/2)
      const sideGeo = new THREE.PlaneGeometry(rl, roomHeight);
      const leftWall = new THREE.Mesh(sideGeo, wallMat);
      leftWall.position.set(-rw / 2, roomHeight / 2, 0);
      leftWall.rotation.y = Math.PI / 2;
      leftWall.receiveShadow = true;
      scene.add(leftWall);

      // Right wall (X = rw/2)
      const rightWall = new THREE.Mesh(sideGeo, wallMat);
      rightWall.position.set(rw / 2, roomHeight / 2, 0);
      rightWall.rotation.y = -Math.PI / 2;
      rightWall.receiveShadow = true;
      scene.add(rightWall);

      // Skirting boards along the base of the walls
      const skirtingH = 0.12;
      const skirtingThick = 0.02;

      // Back & Front skirting
      const skirtEWGeo = new THREE.BoxGeometry(rw, skirtingH, skirtingThick);
      const skirtBack = new THREE.Mesh(skirtEWGeo, skirtingMat);
      skirtBack.position.set(0, skirtingH / 2, -rl / 2 + skirtingThick / 2);
      scene.add(skirtBack);

      const skirtFront = new THREE.Mesh(skirtEWGeo, skirtingMat);
      skirtFront.position.set(0, skirtingH / 2, rl / 2 - skirtingThick / 2);
      scene.add(skirtFront);

      // Left & Right skirting
      const skirtNSGeo = new THREE.BoxGeometry(skirtingThick, skirtingH, rl);
      const skirtLeft = new THREE.Mesh(skirtNSGeo, skirtingMat);
      skirtLeft.position.set(-rw / 2 + skirtingThick / 2, skirtingH / 2, 0);
      scene.add(skirtLeft);

      const skirtRight = new THREE.Mesh(skirtNSGeo, skirtingMat);
      skirtRight.position.set(rw / 2 - skirtingThick / 2, skirtingH / 2, 0);
      scene.add(skirtRight);

      // Decorative center benches & corner potted plants
      if (layout.type === 'single') {
        const bench = createMuseumBench();
        bench.position.set(0, 0, 0);
        scene.add(bench);

        const plant1 = createPottedPlant();
        plant1.position.set(-rw / 2 + 0.8, 0, -rl / 2 + 0.8);
        scene.add(plant1);

        const plant2 = createPottedPlant();
        plant2.position.set(rw / 2 - 0.8, 0, -rl / 2 + 0.8);
        scene.add(plant2);
      } else {
        // Hall layout benches and plants
        const bench1 = createMuseumBench();
        bench1.position.set(0, 0, -3.5);
        scene.add(bench1);

        const bench2 = createMuseumBench();
        bench2.position.set(0, 0, 3.5);
        scene.add(bench2);

        const plant1 = createPottedPlant();
        plant1.position.set(-rw / 2 + 0.8, 0, -rl / 2 + 0.8);
        scene.add(plant1);

        const plant2 = createPottedPlant();
        plant2.position.set(rw / 2 - 0.8, 0, -rl / 2 + 0.8);
        scene.add(plant2);

        const plant3 = createPottedPlant();
        plant3.position.set(-rw / 2 + 0.8, 0, rl / 2 - 0.8);
        scene.add(plant3);

        const plant4 = createPottedPlant();
        plant4.position.set(rw / 2 - 0.8, 0, rl / 2 - 0.8);
        scene.add(plant4);
      }
    } else {
      // L-shaped layout: Two wings
      const floorA = new THREE.Mesh(new THREE.PlaneGeometry(8, 18), floorMat);
      floorA.rotation.x = -Math.PI / 2;
      floorA.position.set(0, 0, -3);
      scene.add(floorA);

      const floorB = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), floorMat);
      floorB.rotation.x = -Math.PI / 2;
      floorB.position.set(11, 0, 0);
      scene.add(floorB);

      // Ceilings
      const ceilA = new THREE.Mesh(new THREE.PlaneGeometry(8, 18), ceilingMat);
      ceilA.rotation.x = Math.PI / 2;
      ceilA.position.set(0, roomHeight, -3);
      scene.add(ceilA);

      const ceilB = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), ceilingMat);
      ceilB.rotation.x = Math.PI / 2;
      ceilB.position.set(11, roomHeight, 0);
      scene.add(ceilB);

      // Build wall meshes from layout.walls
      layout.walls.forEach((seg) => {
        const dx = seg.end[0] - seg.start[0];
        const dz = seg.end[1] - seg.start[1];
        const len = Math.hypot(dx, dz);
        const midX = (seg.start[0] + seg.end[0]) / 2;
        const midZ = (seg.start[1] + seg.end[1]) / 2;
        const angle = Math.atan2(dx, dz);

        const wallGeo = new THREE.PlaneGeometry(len, roomHeight);
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(midX, roomHeight / 2, midZ);
        wallMesh.rotation.y = angle - Math.PI / 2;
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);
      });

      // Benches & plants
      const benchA = createMuseumBench();
      benchA.position.set(0, 0, -3);
      scene.add(benchA);

      const benchB = createMuseumBench();
      benchB.position.set(11, 0, 0);
      benchB.rotation.y = Math.PI / 2;
      scene.add(benchB);

      const plantA = createPottedPlant();
      plantA.position.set(-3.2, 0, -11.2);
      scene.add(plantA);

      const plantB = createPottedPlant();
      plantB.position.set(17.2, 0, 3.2);
      scene.add(plantB);
    }

    // Load and build frames
    const textureLoader = new THREE.TextureLoader();
    const frameObjects: FrameObjectInfo[] = [];

    layout.frames.forEach((placement) => {
      const frameObj = createMuseumFrame(placement, matTexture, textureLoader);
      scene.add(frameObj.group);
      frameObjects.push(frameObj);
    });

    frameObjectsRef.current = frameObjects;

    // Collision Helper: Check distance to line segments
    const playerRadius = 0.55;
    const canMoveTo = (newX: number, newZ: number): boolean => {
      // Check wall segments
      for (const wall of layout.walls) {
        const [x1, z1] = wall.start;
        const [x2, z2] = wall.end;

        const lineLenSq = (x2 - x1) ** 2 + (z2 - z1) ** 2;
        let t = 0;
        if (lineLenSq > 0) {
          t = Math.max(0, Math.min(1, ((newX - x1) * (x2 - x1) + (newZ - z1) * (z2 - z1)) / lineLenSq));
        }
        const projX = x1 + t * (x2 - x1);
        const projZ = z1 + t * (z2 - z1);

        const distSq = (newX - projX) ** 2 + (newZ - projZ) ** 2;
        if (distSq < playerRadius * playerRadius) {
          return false;
        }
      }
      return true;
    };

    // Raycaster for clicking / tapping frames
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerUp = (e: MouseEvent | Touch) => {
      if (cameraStateRef.current.isZooming) {
        // Tap anywhere while zoomed to return!
        cameraStateRef.current.isZooming = false;
        setZoomedItem(null);
        activeZoomFrameRef.current = null;
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const interactiveMeshes = frameObjects.map((f) => f.mesh);
      const intersects = raycaster.intersectObjects(interactiveMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const frameInfo = frameObjects.find((f) => f.mesh === hit.object);

        if (frameInfo) {
          // If tapping a video and close enough, toggle audio as well
          const distToFrame = camera.position.distanceTo(frameInfo.group.position);

          if (frameInfo.item.type === 'video' && frameInfo.toggleAudio) {
            const isMutedNow = frameInfo.toggleAudio();
            setZoomedMuted(isMutedNow);
          }

          // Smoothly zoom in
          const { position, wallNormal, width: fw, height: fh } = frameInfo.placement;
          const frameCenter = new THREE.Vector3(...position);
          const normalVec = new THREE.Vector3(...wallNormal).normalize();

          // Calculate ideal viewing distance
          const optimalDist = Math.max(fw, fh) * 1.1 + 0.35;
          const targetPos = frameCenter.clone().add(normalVec.clone().multiplyScalar(optimalDist));

          cameraStateRef.current.isZooming = true;
          cameraStateRef.current.zoomTargetPos.copy(targetPos);
          cameraStateRef.current.zoomTargetLookAt.copy(frameCenter);

          activeZoomFrameRef.current = frameInfo;
          setZoomedItem(frameInfo.item);
          setZoomedMuted(frameInfo.item.isMuted ?? true);
        }
      }
    };

    // Desktop Click Handler
    const onCanvasClick = (e: MouseEvent) => {
      // Ignore if user was dragging to look around
      if (touchLookRef.current.isDragging) {
        touchLookRef.current.isDragging = false;
        return;
      }
      handlePointerUp(e);
    };

    renderer.domElement.addEventListener('click', onCanvasClick);

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape' && cameraStateRef.current.isZooming) {
        cameraStateRef.current.isZooming = false;
        setZoomedItem(null);
        activeZoomFrameRef.current = null;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Window resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation & Render Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const _camDir = new THREE.Vector3();
    const _camSide = new THREE.Vector3();
    const _targetLook = new THREE.Vector3();

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      const state = cameraStateRef.current;

      // Initial Fly-In Animation
      if (state.introProgress < 1) {
        state.introProgress = Math.min(1, state.introProgress + delta * 0.9);
        const ease = 1 - Math.pow(1 - state.introProgress, 3);
        const curSpawnZ = spawnZ + (1 - ease) * 2.2;
        state.z = THREE.MathUtils.damp(state.z, curSpawnZ, 6, delta);
      }

      if (state.isZooming) {
        // Smooth zoom interpolation to target position and lookAt
        camera.position.x = THREE.MathUtils.damp(camera.position.x, state.zoomTargetPos.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, state.zoomTargetPos.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, state.zoomTargetPos.z, 8, delta);

        // Keep camera looking directly at artwork center
        _targetLook.x = THREE.MathUtils.damp(_targetLook.x, state.zoomTargetLookAt.x, 10, delta);
        _targetLook.y = THREE.MathUtils.damp(_targetLook.y, state.zoomTargetLookAt.y, 10, delta);
        _targetLook.z = THREE.MathUtils.damp(_targetLook.z, state.zoomTargetLookAt.z, 10, delta);
        camera.lookAt(_targetLook);

        // Update player coordinates so when unzoomed, player resumes from good spot
        state.x = camera.position.x;
        state.z = camera.position.z;
      } else {
        // Walking controls
        // Gather input from keyboard & virtual joystick
        const keys = keysPressedRef.current;
        let moveX = moveVectorRef.current.x; // strafe (-1 left, +1 right)
        let moveZ = moveVectorRef.current.y; // forward (+1 forward, -1 backward)

        if (keys['w'] || keys['arrowup']) moveZ += 1;
        if (keys['s'] || keys['arrowdown']) moveZ -= 1;
        if (keys['a'] || keys['arrowleft']) moveX -= 1;
        if (keys['d'] || keys['arrowright']) moveX += 1;

        // Clamp combined vector length to 1
        const inputLen = Math.hypot(moveX, moveZ);
        if (inputLen > 1) {
          moveX /= inputLen;
          moveZ /= inputLen;
        }

        // Apply movement relative to current yaw
        if (inputLen > 0.01) {
          const walkSpeed = 3.2; // meters/sec
          const forwardX = -Math.sin(state.yaw);
          const forwardZ = -Math.cos(state.yaw);
          const rightX = Math.cos(state.yaw);
          const rightZ = -Math.sin(state.yaw);

          const stepX = (forwardX * moveZ + rightX * moveX) * walkSpeed * delta;
          const stepZ = (forwardZ * moveZ + rightZ * moveX) * walkSpeed * delta;

          // Attempt movement with wall collision slide
          if (canMoveTo(state.x + stepX, state.z)) {
            state.x += stepX;
          }
          if (canMoveTo(state.x, state.z + stepZ)) {
            state.z += stepZ;
          }
        }

        // Smooth yaw and pitch damping
        state.yaw = THREE.MathUtils.damp(state.yaw, state.targetYaw, 14, delta);
        state.pitch = THREE.MathUtils.damp(state.pitch, state.targetPitch, 14, delta);

        // Update camera position
        camera.position.set(state.x, state.y, state.z);

        // Compute camera forward vector from yaw & pitch
        _camDir.set(
          -Math.sin(state.yaw) * Math.cos(state.pitch),
          Math.sin(state.pitch),
          -Math.cos(state.yaw) * Math.cos(state.pitch)
        );

        _targetLook.copy(camera.position).add(_camDir);
        camera.lookAt(_targetLook);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('click', onCanvasClick);

      // Dispose textures, geometries, and video elements
      frameObjects.forEach((f) => {
        if (f.videoElement) {
          f.videoElement.pause();
          f.videoElement.src = '';
          f.videoElement.load();
        }
      });

      woodFloorTexture.dispose();
      wallTexture.dispose();
      matTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [museum]);

  // Touch Drag for Look Around (Outside Joystick)
  const onTouchStartDrag = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchLookRef.current.lastX = touch.clientX;
      touchLookRef.current.lastY = touch.clientY;
      touchLookRef.current.activeTouchId = touch.identifier;
      touchLookRef.current.isDragging = false;
    }
  };

  const onTouchMoveDrag = (e: React.TouchEvent) => {
    if (touchLookRef.current.activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchLookRef.current.activeTouchId) {
        const deltaX = touch.clientX - touchLookRef.current.lastX;
        const deltaY = touch.clientY - touchLookRef.current.lastY;

        if (Math.hypot(deltaX, deltaY) > 4) {
          touchLookRef.current.isDragging = true;
        }

        const sensitivity = 0.0035;
        cameraStateRef.current.targetYaw -= deltaX * sensitivity;
        // Clamp pitch between -1.1 and 1.1 rad (~ ±60 deg)
        cameraStateRef.current.targetPitch = Math.max(
          -1.1,
          Math.min(1.1, cameraStateRef.current.targetPitch + deltaY * sensitivity)
        );

        touchLookRef.current.lastX = touch.clientX;
        touchLookRef.current.lastY = touch.clientY;
        break;
      }
    }
  };

  const onTouchEndDrag = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchLookRef.current.activeTouchId) {
        touchLookRef.current.activeTouchId = null;
        break;
      }
    }
  };

  // Mouse drag for desktop look around
  const isMouseDownRef = useRef(false);
  const mouseLastPosRef = useRef({ x: 0, y: 0 });

  const onMouseDownDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isMouseDownRef.current = true;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMoveDrag = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const deltaX = e.clientX - mouseLastPosRef.current.x;
    const deltaY = e.clientY - mouseLastPosRef.current.y;

    if (Math.hypot(deltaX, deltaY) > 3) {
      touchLookRef.current.isDragging = true;
    }

    const sensitivity = 0.0028;
    cameraStateRef.current.targetYaw -= deltaX * sensitivity;
    cameraStateRef.current.targetPitch = Math.max(
      -1.1,
      Math.min(1.1, cameraStateRef.current.targetPitch + deltaY * sensitivity)
    );

    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUpDrag = () => {
    isMouseDownRef.current = false;
  };

  // Audio toggle for zoomed item
  const toggleZoomedAudio = () => {
    if (activeZoomFrameRef.current?.toggleAudio) {
      const isMutedNow = activeZoomFrameRef.current.toggleAudio();
      setZoomedMuted(isMutedNow);
    }
  };

  const handleReturnFromZoom = () => {
    cameraStateRef.current.isZooming = false;
    setZoomedItem(null);
    activeZoomFrameRef.current = null;
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none touch-none bg-[#FAF7F2]"
      onTouchStart={onTouchStartDrag}
      onTouchMove={onTouchMoveDrag}
      onTouchEnd={onTouchEndDrag}
      onMouseDown={onMouseDownDrag}
      onMouseMove={onMouseMoveDrag}
      onMouseUp={onMouseUpDrag}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Bar Navigation */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 sm:p-5 flex items-center justify-between pointer-events-none">
        {/* Button: "Yangi muzey" */}
        <button
          onClick={onNewMuseum}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/85 hover:bg-white text-stone-800 font-bold text-sm shadow-md border border-rose-100/70 backdrop-blur-md active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4 text-rose-500" />
          <span>Yangi muzey</span>
        </button>

        {/* Button: "Ulashish" (hidden in view-only mode) */}
        {!isViewOnly && (
          <button
            onClick={onOpenShare}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-sm shadow-md shadow-rose-300/40 active:scale-95 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>Ulashish</span>
          </button>
        )}
      </div>

      {/* 5-second initial hint */}
      {showHint && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 max-w-[90vw] px-4 py-2.5 rounded-2xl bg-stone-900/80 text-white text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md text-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-300 shrink-0" />
            <span>Yurish uchun joystikdan foydalaning, atrofga qarash uchun ekranni suring.</span>
          </div>
        </div>
      )}

      {/* Zoomed Inspection Bar / Controls */}
      {zoomedItem && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-rose-100">
          {/* Button: "Orqaga" */}
          <button
            onClick={handleReturnFromZoom}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-sm active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Orqaga</span>
          </button>

          {/* Sound toggle if video */}
          {zoomedItem.type === 'video' && (
            <button
              onClick={toggleZoomedAudio}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
                zoomedMuted
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {zoomedMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{zoomedMuted ? "Ovozni yoqish" : "Ovoz o'chiq"}</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile Virtual Joystick */}
      {!zoomedItem && (
        <div className="absolute bottom-6 left-6 z-30 pointer-events-auto">
          <Joystick
            onMove={(vec) => {
              moveVectorRef.current = vec;
            }}
          />
        </div>
      )}
    </div>
  );
};
