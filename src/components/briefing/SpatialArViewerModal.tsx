import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Box, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react';
import type { ArModelPreset } from '../../data/unifiedSsotData';
import { useStack } from '../../store/StackContext';

type FinishId = 'matte' | 'titanium' | 'emerald';

const FINISH_PRESETS: Record<
  FinishId,
  { label: string; primary: number; secondary: number; accent: number; metalness: number; roughness: number }
> = {
  matte: {
    label: 'Sovereign Navy',
    primary: 0x1f3863,
    secondary: 0x334155,
    accent: 0x1c6e46,
    metalness: 0.35,
    roughness: 0.55,
  },
  titanium: {
    label: 'Brushed Titanium',
    primary: 0x94a3b8,
    secondary: 0x475569,
    accent: 0x8fa6e8,
    metalness: 0.88,
    roughness: 0.2,
  },
  emerald: {
    label: 'Enclave Emerald',
    primary: 0x1c6e46,
    secondary: 0x16213a,
    accent: 0x6fcb9f,
    metalness: 0.55,
    roughness: 0.32,
  },
};

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

interface ExplodablePart {
  mesh: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

function buildProceduralModel(
  preset: ArModelPreset,
  finish: (typeof FINISH_PRESETS)[FinishId],
  disposables: Array<{ dispose: () => void }>,
): { group: THREE.Group; parts: ExplodablePart[] } {
  const group = new THREE.Group();
  const parts: ExplodablePart[] = [];

  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: finish.primary,
    metalness: finish.metalness,
    roughness: finish.roughness,
    clearcoat: 0.4,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: finish.secondary,
    metalness: Math.min(0.95, finish.metalness + 0.15),
    roughness: Math.max(0.15, finish.roughness - 0.1),
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: finish.accent,
    emissive: finish.accent,
    emissiveIntensity: 0.25,
    metalness: 0.4,
    roughness: 0.25,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    metalness: 0.05,
    roughness: 0.1,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  disposables.push(primaryMat, secondaryMat, accentMat, glassMat);

  const registerPart = (mesh: THREE.Object3D, explodeOffset: THREE.Vector3) => {
    group.add(mesh);
    parts.push({
      mesh,
      basePos: mesh.position.clone(),
      explodeOffset,
    });
  };

  if (preset === 'xr-glasses') {
    // 6-part Spatial XR Smart Glasses composite assembly
    const bridgeGeo = new THREE.BoxGeometry(0.45, 0.12, 0.12);
    const frameGeo = new THREE.TorusGeometry(0.44, 0.055, 16, 36);
    const lensGeo = new THREE.CircleGeometry(0.4, 32);
    const armGeo = new THREE.BoxGeometry(0.1, 0.11, 1.85);
    const sensorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16);
    disposables.push(bridgeGeo, frameGeo, lensGeo, armGeo, sensorGeo);

    const bridge = new THREE.Mesh(bridgeGeo, secondaryMat);
    bridge.position.set(0, 0.08, 0.4);
    registerPart(bridge, new THREE.Vector3(0, 0.45, 0.2));

    [-0.56, 0.56].forEach((x) => {
      const frame = new THREE.Mesh(frameGeo, primaryMat);
      frame.position.set(x, 0, 0.4);
      registerPart(frame, new THREE.Vector3(x * 0.45, 0, 0.55));

      const lens = new THREE.Mesh(lensGeo, glassMat);
      lens.position.set(x, 0, 0.42);
      registerPart(lens, new THREE.Vector3(x * 0.45, 0, 0.95));

      const arm = new THREE.Mesh(armGeo, secondaryMat);
      arm.position.set(x > 0 ? 1.02 : -1.02, 0.04, -0.45);
      registerPart(arm, new THREE.Vector3(x > 0 ? 0.65 : -0.65, 0, -0.4));
    });

    const sensor = new THREE.Mesh(sensorGeo, accentMat);
    sensor.rotation.x = Math.PI / 2;
    sensor.position.set(0.95, 0.16, 0.48);
    registerPart(sensor, new THREE.Vector3(0.55, 0.45, 0.6));
  } else if (preset === 'server-enclave') {
    // 6-part Air-Gapped Tier 3–4 On-Prem GPU Enclave Stack
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.34, 1.5);
    const bezelGeo = new THREE.BoxGeometry(1.9, 0.08, 0.06);
    const coreGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.55, 24);
    disposables.push(chassisGeo, bezelGeo, coreGeo);

    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Group();
      const body = new THREE.Mesh(chassisGeo, i % 2 === 0 ? primaryMat : secondaryMat);
      const trim = new THREE.Mesh(bezelGeo, accentMat);
      trim.position.set(0, 0, 0.76);
      blade.add(body, trim);
      const y = -0.66 + i * 0.44;
      blade.position.set(0, y, 0);
      registerPart(blade, new THREE.Vector3(0, (i - 1.5) * 0.45, 0));
    }

    const bus = new THREE.Mesh(coreGeo, glassMat);
    bus.position.set(0, 0, 0);
    registerPart(bus, new THREE.Vector3(0, 0, 0.9));
  } else if (preset === 'cleanroom-twin') {
    // 6-part Biopharma / Hospital Cleanroom Digital Twin Bay
    const floorGeo = new THREE.BoxGeometry(2.6, 0.12, 2.2);
    const podGeo = new THREE.CylinderGeometry(0.45, 0.5, 1.15, 24);
    const domeGeo = new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const gantryGeo = new THREE.TorusGeometry(0.92, 0.05, 12, 48);
    const wallGeo = new THREE.BoxGeometry(2.4, 1.1, 0.06);
    disposables.push(floorGeo, podGeo, domeGeo, gantryGeo, wallGeo);

    const floor = new THREE.Mesh(floorGeo, secondaryMat);
    floor.position.set(0, -0.75, 0);
    registerPart(floor, new THREE.Vector3(0, -0.55, 0));

    const pod = new THREE.Mesh(podGeo, primaryMat);
    pod.position.set(0, -0.1, 0);
    registerPart(pod, new THREE.Vector3(0, 0.15, 0));

    const dome = new THREE.Mesh(domeGeo, glassMat);
    dome.position.set(0, 0.48, 0);
    registerPart(dome, new THREE.Vector3(0, 0.85, 0));

    const gantry = new THREE.Mesh(gantryGeo, accentMat);
    gantry.rotation.x = Math.PI / 2;
    gantry.position.set(0, 0.72, 0);
    registerPart(gantry, new THREE.Vector3(0, 1.1, 0));

    const wall = new THREE.Mesh(wallGeo, glassMat);
    wall.position.set(0, -0.1, -0.95);
    registerPart(wall, new THREE.Vector3(0, 0, -0.65));
  } else {
    // Financial Waterfall 5-Year Trajectory & SAFE Bars (6-part sculptural chart)
    const baseGeo = new THREE.BoxGeometry(2.7, 0.12, 1.2);
    const barGeo = new THREE.BoxGeometry(0.32, 1, 0.42);
    disposables.push(baseGeo, barGeo);

    const base = new THREE.Mesh(baseGeo, secondaryMat);
    base.position.set(0, -0.82, 0);
    registerPart(base, new THREE.Vector3(0, -0.45, 0));

    const heights = [0.45, 0.72, 1.05, 1.48, 1.95];
    heights.forEach((h, idx) => {
      const bar = new THREE.Mesh(barGeo, idx === 4 ? accentMat : primaryMat);
      bar.scale.y = h;
      bar.position.set(-0.96 + idx * 0.48, -0.76 + h / 2, 0);
      registerPart(bar, new THREE.Vector3((idx - 2) * 0.25, h * 0.25, 0));
    });
  }

  return { group, parts };
}

export function SpatialArViewerModal() {
  const { arPreviewTarget, closeArPreview, theme } = useStack();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [finishId, setFinishId] = useState<FinishId>('matte');
  const [cameraView, setCameraView] = useState<'iso' | 'front' | 'top'>('iso');
  const [dockOpen, setDockOpen] = useState<boolean>(true);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  const explodeRef = useRef<number>(explodeAmount);
  const cameraViewRef = useRef<'iso' | 'front' | 'top'>(cameraView);

  useEffect(() => {
    explodeRef.current = explodeAmount;
  }, [explodeAmount]);

  useEffect(() => {
    cameraViewRef.current = cameraView;
  }, [cameraView]);

  useEffect(() => {
    if (!arPreviewTarget) return;
    setExplodeAmount(0);
    setCameraView('iso');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeArPreview();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [arPreviewTarget, closeArPreview]);

  useEffect(() => {
    if (!arPreviewTarget || !mountRef.current) return;
    const container = mountRef.current;

    const probeCanvas = document.createElement('canvas');
    const glProbe = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!glProbe) {
      setWebglUnavailable(true);
      return;
    }
    glProbe.getExtension('WEBGL_lose_context')?.loseContext();

    const isSoftwareGl = detectSoftwareWebGL();
    const isDark = theme === 'dark';

    const scene = new THREE.Scene();
    const bgHex = isDark ? 0x0b1020 : 0xf2efe9;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.05);

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(2.9, 1.9, 3.6);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xeef2ff, isDark ? 0x0b1020 : 0xd6d3d1, 0.85);
    const key = new THREE.DirectionalLight(0xfff4e0, 1.5);
    key.position.set(4, 6, 4);
    const rim = new THREE.DirectionalLight(0x8fa6e8, 0.9);
    rim.position.set(-4, 2, -4);
    scene.add(hemi, key, rim);

    const disposables: Array<{ dispose: () => void }> = [envTarget];
    const { group, parts } = buildProceduralModel(
      arPreviewTarget.preset,
      FINISH_PRESETS[finishId],
      disposables,
    );
    scene.add(group);

    // Grounded contact shadow disc
    const shadowGeo = new THREE.CircleGeometry(1.7, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: isDark ? 0.35 : 0.14,
      depthWrite: false,
    });
    disposables.push(shadowGeo, shadowMat);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.05;
    scene.add(shadow);

    let isDragging = false;
    let lastX = 0;
    let dragRotY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      dragRotY += (e.clientX - lastX) * 0.01;
      lastX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 760;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) renderer.compile(scene, camera);

    const camTargets: Record<'iso' | 'front' | 'top', THREE.Vector3> = {
      iso: new THREE.Vector3(2.9, 1.9, 3.6),
      front: new THREE.Vector3(0, 0.25, 4.4),
      top: new THREE.Vector3(0, 4.4, 1.4),
    };
    const currentExplode = { value: 0 };
    const tmpVec = new THREE.Vector3();

    let frameId = 0;
    let disposed = false;
    let prevTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;

      if (!isDragging) {
        dragRotY += dt * 0.28;
      }
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, dragRotY, 7, dt);

      currentExplode.value = THREE.MathUtils.damp(currentExplode.value, explodeRef.current, 6, dt);
      for (const part of parts) {
        tmpVec
          .copy(part.basePos)
          .addScaledVector(part.explodeOffset, currentExplode.value);
        part.mesh.position.copy(tmpVec);
      }

      const desiredCam = camTargets[cameraViewRef.current];
      camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCam.x, 5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCam.y, 5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCam.z, 5, dt);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [arPreviewTarget, finishId, theme]);

  if (!arPreviewTarget) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spenta-ar-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B1020]/75 no-print"
      onClick={closeArPreview}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="spenta-ar-viewer-title"
              className="text-base font-bold text-[#16213A] dark:text-[#E7EBF5] truncate"
            >
              {arPreviewTarget.title}
            </h2>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] truncate">
              {arPreviewTarget.subtitle} · Drag to inspect 360°
            </p>
          </div>
          <button
            type="button"
            onClick={closeArPreview}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#5F6576] dark:text-[#8E96B0] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2747] cursor-pointer"
            aria-label="Close Spatial 3D Viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative h-[420px] sm:h-[480px] bg-[#F2EFE9] dark:bg-[#0B1020]">
          {webglUnavailable ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
              <Box className="w-10 h-10 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.5} />
              <div className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
                3D Spatial Preview Unavailable
              </div>
              <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] max-w-md">
                WebGL rendering is unavailable in this browser context. Hardware specifications and architecture diagrams remain accessible across Spenta Core.
              </p>
            </div>
          ) : (
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          )}

          {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-2xl flex flex-col items-center">
            <button
              type="button"
              onClick={() => setDockOpen((v) => !v)}
              className="mb-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F4]/95 dark:bg-[#141A32]/95 border border-[#E4DFD6] dark:border-[#232B4A] text-[11px] font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
            >
              {dockOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              <span>{dockOpen ? 'Hide Controls' : 'Show Controls'}</span>
            </button>

            {dockOpen && (
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F4]/95 dark:bg-[#141A32]/95 border border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-[#16213A] dark:text-[#E7EBF5]">
                  <span className="font-medium whitespace-nowrap">Explode</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={explodeAmount}
                    onChange={(e) => setExplodeAmount(Number(e.target.value))}
                    className="w-24 accent-[#1F3863] dark:accent-[#8FA6E8]"
                  />
                </label>

                <div className="flex items-center gap-1">
                  {(Object.keys(FINISH_PRESETS) as FinishId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFinishId(id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                        finishId === id
                          ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                          : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                      }`}
                    >
                      {FINISH_PRESETS[id].label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  {(['iso', 'front', 'top'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setCameraView(view)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                        cameraView === view
                          ? 'bg-[#1C6E46] text-white dark:bg-[#6FCB9F] dark:text-[#0B1020]'
                          : 'text-[#5F6576] dark:text-[#8E96B0]'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setExplodeAmount(0);
                      setCameraView('iso');
                    }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0] cursor-pointer"
                    aria-label="Reset 3D view"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
