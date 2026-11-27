import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Layers, Pause, Play, RotateCcw } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { CoreLayerId } from '../../../store/StackContext';

type FinishPresetId = 'sovereign' | 'titanium' | 'cyan';

const FINISH_MAP: Record<
  FinishPresetId,
  { label: string; shell: number; frame: number; core: number; accent: number }
> = {
  sovereign: {
    label: 'Obsidian Cobalt',
    shell: 0x1f3863,
    frame: 0x334155,
    core: 0x1c6e46,
    accent: 0x22d3ee,
  },
  titanium: {
    label: 'Aerospace Alloy',
    shell: 0x64748b,
    frame: 0x334155,
    core: 0x8fa6e8,
    accent: 0x6fcb9f,
  },
  cyan: {
    label: 'Telemetry Cyan',
    shell: 0x0f172a,
    frame: 0x1e293b,
    core: 0x0891b2,
    accent: 0x67e8f9,
  },
};

const LAYER_LABELS: Array<{ id: CoreLayerId; name: string; y: number }> = [
  { id: 'L6', name: 'UI & Command Surface', y: 1.05 },
  { id: 'L5', name: 'OPA 0.88 HITL Gate', y: 0.63 },
  { id: 'L4', name: 'Spatial XR Twin Engine', y: 0.21 },
  { id: 'L3', name: 'PrimeOCR & Voice ERP', y: -0.21 },
  { id: 'L2', name: 'TEE Quantized Inference', y: -0.63 },
  { id: 'L1', name: 'IoT & Optical Ingest', y: -1.05 },
];

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = String(
      gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    );
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return true;
  }
}

interface Spatial3DCanvasProps {
  activeLayer: CoreLayerId;
  onSelectLayer?: (layer: CoreLayerId) => void;
}

export function Spatial3DCanvas({ activeLayer, onSelectLayer }: Spatial3DCanvasProps) {
  const { theme } = useTheme();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodeTarget, setExplodeTarget] = useState<number>(0.25);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [finishId, setFinishId] = useState<FinishPresetId>('sovereign');
  const [dockExpanded, setDockExpanded] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [webglUnsupported, setWebglUnsupported] = useState<boolean>(false);

  const explodeTargetRef = useRef(explodeTarget);
  const autoRotateRef = useRef(autoRotate);
  const activeLayerRef = useRef(activeLayer);
  const resetViewFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeTarget;
  }, [explodeTarget]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = Math.max(container.clientWidth || 420, 260);
    const height = Math.max(container.clientHeight || 340, 260);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(3.8, 2.35, 4.4);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.8;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.target.set(0, 0, 0);

    // Three-point studio lighting
    const keyLight = new THREE.DirectionalLight(0xfff6eb, 1.85);
    keyLight.position.set(4.5, 6.2, 4.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbfe3ff, 0.85);
    fillLight.position.set(-4.5, 2.5, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.15);
    rimLight.position.set(0, 3.5, -5.0);
    scene.add(rimLight);

    scene.add(new THREE.AmbientLight(0x94a3b8, 0.45));

    // Composite 8-part Sovereign L1-L6 Fusion Architecture Assembly
    const palette = FINISH_MAP[finishId];
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const disposables: Array<{ dispose: () => void }> = [];

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: palette.shell,
      metalness: 0.45,
      roughness: 0.34,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
    });
    const activeMat = new THREE.MeshPhysicalMaterial({
      color: palette.core,
      emissive: palette.accent,
      emissiveIntensity: 0.35,
      metalness: 0.5,
      roughness: 0.25,
      clearcoat: 0.7,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: palette.frame,
      metalness: 0.78,
      roughness: 0.28,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.08,
      roughness: 0.12,
      transmission: 0.45,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: palette.accent,
      emissive: palette.accent,
      emissiveIntensity: 0.65,
      metalness: 0.35,
      roughness: 0.2,
    });
    disposables.push(shellMat, activeMat, frameMat, glassMat, nodeMat);

    const plateGeo = new THREE.CylinderGeometry(1.18, 1.24, 0.14, 6);
    const ringGeo = new THREE.TorusGeometry(1.32, 0.032, 12, 48);
    const coreGeo = new THREE.OctahedronGeometry(0.42, 0);
    const spineGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.55, 20);
    const nodeGeo = new THREE.SphereGeometry(0.065, 16, 16);
    disposables.push(plateGeo, ringGeo, coreGeo, spineGeo, nodeGeo);

    // Part 1: Central TEE Quantum/Encrypted Spine
    const spine = new THREE.Mesh(spineGeo, glassMat);
    rootGroup.add(spine);

    // Part 2: Quantized Sovereign Core Nucleus
    const nucleus = new THREE.Mesh(coreGeo, activeMat);
    rootGroup.add(nucleus);

    // Parts 3-8: L1-L6 Composable Hexagonal Compute Plates + Telemetry Nodes
    const layerEntries: Array<{
      id: CoreLayerId;
      group: THREE.Group;
      plate: THREE.Mesh;
      ring: THREE.Mesh;
      baseY: number;
    }> = [];

    LAYER_LABELS.forEach((layerDef, idx) => {
      const layerGroup = new THREE.Group();
      layerGroup.position.y = layerDef.y;

      const plate = new THREE.Mesh(plateGeo, shellMat);
      plate.userData.layerId = layerDef.id;
      layerGroup.add(plate);

      const ring = new THREE.Mesh(ringGeo, frameMat);
      ring.rotation.x = Math.PI / 2;
      layerGroup.add(ring);

      for (let n = 0; n < 3; n += 1) {
        const angle = (n * Math.PI * 2) / 3 + idx * 0.45;
        const sensor = new THREE.Mesh(nodeGeo, nodeMat);
        sensor.position.set(Math.cos(angle) * 1.32, 0, Math.sin(angle) * 1.32);
        layerGroup.add(sensor);
      }

      rootGroup.add(layerGroup);
      layerEntries.push({
        id: layerDef.id,
        group: layerGroup,
        plate,
        ring,
        baseY: layerDef.y,
      });
    });

    // Subtle ground containment ring
    const baseHaloGeo = new THREE.RingGeometry(1.45, 1.54, 48);
    const baseHaloMat = new THREE.MeshBasicMaterial({
      color: palette.accent,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    disposables.push(baseHaloGeo, baseHaloMat);
    const baseHalo = new THREE.Mesh(baseHaloGeo, baseHaloMat);
    baseHalo.rotation.x = -Math.PI / 2;
    baseHalo.position.y = -1.45;
    rootGroup.add(baseHalo);

    resetViewFnRef.current = () => {
      camera.position.set(3.8, 2.35, 4.4);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    // Click picking on layer plates
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        layerEntries.map((l) => l.plate),
        false,
      );
      if (hits.length > 0) {
        const hitLayer = hits[0].object.userData.layerId as CoreLayerId | undefined;
        if (hitLayer && onSelectLayer) {
          onSelectLayer(hitLayer);
        }
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width < 10 || box.height < 10) return;
      camera.aspect = box.width / box.height;
      camera.updateProjectionMatrix();
      renderer.setSize(box.width, box.height);
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let currentExplode = explodeTargetRef.current;
    let rafId = 0;
    let disposed = false;

    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      currentExplode = THREE.MathUtils.damp(currentExplode, explodeTargetRef.current, 6, dt || 0.016);

      if (autoRotateRef.current) {
        rootGroup.rotation.y += dt * 0.28;
      }

      nucleus.rotation.y = elapsed * 0.7;
      nucleus.rotation.x = Math.sin(elapsed * 0.55) * 0.25;

      const selectedId = activeLayerRef.current;
      layerEntries.forEach((entry, index) => {
        const offsetFromCenter = (2.5 - index) * 0.34 * currentExplode;
        entry.group.position.y = entry.baseY + offsetFromCenter;
        const isActive = entry.id === selectedId;
        entry.plate.material = isActive ? activeMat : shellMat;
        const targetScale = isActive ? 1.07 : 1.0;
        entry.group.scale.x = THREE.MathUtils.damp(entry.group.scale.x, targetScale, 8, dt || 0.016);
        entry.group.scale.z = THREE.MathUtils.damp(entry.group.scale.z, targetScale, 8, dt || 0.016);
      });

      controls.update();
      renderer.render(scene, camera);
    };

    // Draw first frame immediately (important for software WebGL / headless environments)
    renderFrame();

    const animate = () => {
      if (disposed) return;
      rafId = window.requestAnimationFrame(animate);
      renderFrame();
    };
    rafId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      resetViewFnRef.current = null;
    };
  }, [finishId, onSelectLayer]);

  const activeLayerMeta = LAYER_LABELS.find((l) => l.id === activeLayer) ?? LAYER_LABELS[0];

  return (
    <div className="relative h-[330px] sm:h-[370px] w-full rounded-2xl overflow-hidden border border-[#E4DFD6] dark:border-[#232B4A] bg-[#0B1020] text-[#E7EBF5] hud-corner">
      {/* Subtle ambient background grid inside canvas viewport */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 42%, rgba(34, 211, 238, 0.22), transparent 68%)',
        }}
      />

      {webglUnsupported || contextLost ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[#0B1020]">
          <Layers className="w-8 h-8 text-[#22D3EE]" />
          <div className="text-sm font-semibold">
            {contextLost ? 'WebGL Context Paused' : 'Spatial 3D Preview Unavailable'}
          </div>
          <p className="text-xs text-[#8E96B0] max-w-xs">
            Interactive 6-Layer Sovereign Fusion stack controls remain active across the summary table and deep-dive inspector below.
          </p>
        </div>
      ) : (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      )}

      {/* Semantic HUD Top Strip */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
        <div className="px-2.5 py-1.5 rounded-lg bg-[#0B1020]/88 border border-white/15 pointer-events-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#22D3EE]">
            SPATIAL L1–L6 ENCLAVE · {theme === 'dark' ? 'NOCTURNAL' : 'STUDIO'}
          </div>
          <div className="text-xs font-semibold text-white">
            {activeLayerMeta.id} · {activeLayerMeta.name}
          </div>
        </div>
        <div className="px-2 py-1 rounded-md bg-[#0B1020]/85 border border-white/10 text-[10px] font-mono text-[#C8D0E4]">
          Drag to Orbit · Click Layer
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col items-center pointer-events-none">
        <div className="w-full max-w-md rounded-xl bg-[#0B1020]/94 border border-white/15 px-3 py-2 pointer-events-auto shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 text-[11px] font-mono text-white cursor-pointer"
                title="Toggle auto-orbit rotation"
              >
                {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{autoRotate ? 'Pause' : 'Orbit'}</span>
              </button>
              <button
                type="button"
                onClick={() => resetViewFnRef.current?.()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 text-[11px] font-mono text-white cursor-pointer"
                title="Reset camera angle"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDockExpanded((v) => !v)}
              aria-expanded={dockExpanded}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[11px] font-mono text-[#67E8F9] cursor-pointer"
            >
              <span>{dockExpanded ? 'Hide Controls' : 'Stack Controls'}</span>
              {dockExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {dockExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="ssot-explode-slider"
                  className="text-[11px] font-mono text-[#C8D0E4] whitespace-nowrap"
                >
                  Layer Separation ({Math.round(explodeTarget * 100)}%)
                </label>
                <input
                  id="ssot-explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodeTarget}
                  onChange={(e) => setExplodeTarget(Number(e.target.value))}
                  className="spenta-slider w-40"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-[11px] font-mono text-[#C8D0E4]">Chassis Finish</span>
                <div className="inline-flex items-center gap-1">
                  {(Object.keys(FINISH_MAP) as FinishPresetId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFinishId(id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                        finishId === id
                          ? 'bg-[#22D3EE] text-[#0B1020] font-semibold'
                          : 'bg-white/8 text-[#C8D0E4] hover:bg-white/15'
                      }`}
                    >
                      {FINISH_MAP[id].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
