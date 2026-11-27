import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Globe2, Pause, Play, RotateCcw } from 'lucide-react';
import { DUAL_SHORE_HUBS, DualShoreHubSpec } from '../../data/unifiedSsotData';
import { useStack } from '../../store/StackContext';

function latLonToVector3(lat: number, lon: number, radius: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
  return out;
}

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

export function DualShoreGlobe() {
  const { theme, arPreviewTarget, openContactModal } = useStack();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<DualShoreHubSpec['id']>('dhaka');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockOpen, setDockOpen] = useState<boolean>(true);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  const selectedHubRef = useRef<DualShoreHubSpec['id']>(selectedHubId);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const pausedByModalRef = useRef<boolean>(Boolean(arPreviewTarget));

  useEffect(() => {
    selectedHubRef.current = selectedHubId;
  }, [selectedHubId]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    pausedByModalRef.current = Boolean(arPreviewTarget);
  }, [arPreviewTarget]);

  const activeHub = DUAL_SHORE_HUBS.find((h) => h.id === selectedHubId) ?? DUAL_SHORE_HUBS[2];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    scene.fog = new THREE.FogExp2(bgHex, 0.045);

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 6.25);
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
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio environment reflection for metallic orbital rings & hub beacons
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    // Warm key + cool hemisphere fill + rim light
    const hemiLight = new THREE.HemisphereLight(isDark ? 0x8fa6e8 : 0xdbeafe, isDark ? 0x0b1020 : 0xe4dfd6, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.45);
    keyLight.position.set(5, 6, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(isDark ? 0x6fcb9f : 0x1f3863, 0.85);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // Composite Globe Assembly (core sphere + latitude/longitude wire cage + equatorial telemetry ring + hub beacons + corridor arcs)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeRadius = 1.72;
    const coreGeo = new THREE.SphereGeometry(globeRadius, 48, 36);
    const coreMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x141a32 : 0x1f3863,
      roughness: 0.62,
      metalness: 0.28,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    const wireGeo = new THREE.IcosahedronGeometry(globeRadius * 1.008, 3);
    const wireMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x3b4d82 : 0x5c76a8,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.28 : 0.22,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wireMesh);

    // Equatorial titanium orbital ring
    const ringGeo = new THREE.TorusGeometry(globeRadius * 1.24, 0.016, 12, 96);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x8fa6e8 : 0x1f3863,
      roughness: 0.22,
      metalness: 0.88,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI * 0.44;
    globeGroup.add(ringMesh);

    // Polar meridian frame ring
    const meridianGeo = new THREE.TorusGeometry(globeRadius * 1.16, 0.01, 10, 96);
    const meridianMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x6fcb9f : 0x1c6e46,
      roughness: 0.3,
      metalness: 0.78,
    });
    const meridianMesh = new THREE.Mesh(meridianGeo, meridianMat);
    meridianMesh.rotation.y = Math.PI * 0.25;
    globeGroup.add(meridianMesh);

    // Hub markers & dual-shore corridor arcs
    const hubVectors: Record<string, THREE.Vector3> = {};
    const markerGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.14, 16);
    const capGeo = new THREE.SphereGeometry(0.068, 16, 16);
    const disposables: Array<{ dispose: () => void }> = [
      coreGeo,
      coreMat,
      wireGeo,
      wireMat,
      ringGeo,
      ringMat,
      meridianGeo,
      meridianMat,
      markerGeo,
      capGeo,
      envTarget,
    ];

    const tmpPos = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);

    DUAL_SHORE_HUBS.forEach((hub) => {
      const v = latLonToVector3(hub.lat, hub.lon, globeRadius, new THREE.Vector3());
      hubVectors[hub.id] = v.clone();

      const hubNode = new THREE.Group();
      hubNode.position.copy(v);
      const normal = v.clone().normalize();
      hubNode.quaternion.setFromUnitVectors(upAxis, normal);

      const isDhaka = hub.id === 'dhaka';
      const stemMat = new THREE.MeshStandardMaterial({
        color: isDhaka ? 0x1c6e46 : 0xe11d48,
        roughness: 0.25,
        metalness: 0.75,
      });
      const capMat = new THREE.MeshStandardMaterial({
        color: isDhaka ? 0x6fcb9f : 0xfb7185,
        emissive: isDhaka ? 0x1c6e46 : 0xbe123c,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.4,
      });
      disposables.push(stemMat, capMat);

      const stem = new THREE.Mesh(markerGeo, stemMat);
      stem.position.y = 0.07;
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.15;
      hubNode.add(stem, cap);
      globeGroup.add(hubNode);
    });

    // Corridor Arcs: San Jose <-> Dhaka & Sydney <-> Dhaka
    const buildCorridorArc = (from: THREE.Vector3, to: THREE.Vector3, colorHex: number) => {
      const mid = from
        .clone()
        .add(to)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(globeRadius * 1.48);
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const tubeGeo = new THREE.TubeGeometry(curve, 44, 0.018, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.32,
        roughness: 0.3,
        metalness: 0.5,
      });
      disposables.push(tubeGeo, tubeMat);
      const arcMesh = new THREE.Mesh(tubeGeo, tubeMat);
      globeGroup.add(arcMesh);
      return curve;
    };

    const sjCurve = buildCorridorArc(hubVectors['san-jose'], hubVectors['dhaka'], isDark ? 0x8fa6e8 : 0x3b82f6);
    const sydCurve = buildCorridorArc(hubVectors['sydney'], hubVectors['dhaka'], isDark ? 0x6fcb9f : 0x1c6e46);

    // Moving data-packet pulses along corridors (reusable single meshes)
    const packetGeo = new THREE.SphereGeometry(0.042, 12, 12);
    const packetMatA = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const packetMatB = new THREE.MeshBasicMaterial({ color: 0x6fcb9f });
    disposables.push(packetGeo, packetMatA, packetMatB);
    const packetA = new THREE.Mesh(packetGeo, packetMatA);
    const packetB = new THREE.Mesh(packetGeo, packetMatB);
    globeGroup.add(packetA, packetB);

    // Subtle grounded contact shadow beneath globe
    const shadowGeo = new THREE.CircleGeometry(1.45, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: isDark ? 0.3 : 0.14,
      depthWrite: false,
    });
    disposables.push(shadowGeo, shadowMat);
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -globeRadius - 0.35;
    scene.add(shadowPlane);

    // Interactive pointer drag
    let isDragging = false;
    let lastX = 0;
    let targetRotY = -2.25;
    let targetRotX = 0.25;
    let manualOverride = false;

    const hubTargetAngles: Record<DualShoreHubSpec['id'], { x: number; y: number }> = {
      dhaka: { x: 0.28, y: -3.12 },
      sydney: { x: -0.35, y: -4.18 },
      'san-jose': { x: 0.42, y: -0.58 },
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      manualOverride = true;
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      targetRotY += dx * 0.008;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    domEl.addEventListener('webglcontextlost', onContextLost);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let prevTime = performance.now();
    let packetPhase = 0;

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

      if (!pausedByModalRef.current) {
        if (!manualOverride) {
          const desired = hubTargetAngles[selectedHubRef.current];
          if (autoRotateRef.current && !prefersReducedMotion) {
            targetRotY += dt * 0.24;
          } else {
            targetRotY = THREE.MathUtils.damp(targetRotY, desired.y, 4.5, dt);
          }
          targetRotX = THREE.MathUtils.damp(targetRotX, desired.x, 4.5, dt);
        }

        globeGroup.rotation.y = THREE.MathUtils.damp(globeGroup.rotation.y, targetRotY, 6, dt);
        globeGroup.rotation.x = THREE.MathUtils.damp(globeGroup.rotation.x, targetRotX, 6, dt);

        if (!prefersReducedMotion) {
          packetPhase = (packetPhase + dt * 0.35) % 1;
        }
        sjCurve.getPoint(packetPhase, tmpPos);
        packetA.position.copy(tmpPos);
        sydCurve.getPoint((packetPhase + 0.5) % 1, tmpPos);
        packetB.position.copy(tmpPos);

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('resize', handleResize);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [theme]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* 3D Viewport + Collapsible Bottom Dock */}
      <div className="lg:col-span-7 relative rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-[#F2EFE9] dark:bg-[#0B1020] overflow-hidden min-h-[380px] sm:min-h-[430px] flex flex-col">
        {/* Minimal Top-Left Label */}
        <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-[#FAF8F4]/95 dark:bg-[#141A32]/95 border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-mono text-[#16213A] dark:text-[#E7EBF5] pointer-events-none">
          Dual-Shore Sync · {activeHub.name}
        </div>

        {webglUnavailable ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <Globe2 className="w-10 h-10 text-[#1F3863] dark:text-[#8FA6E8]" strokeWidth={1.5} />
            <div className="text-sm font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              Dual-Shore Delivery Network (2D Fallback)
            </div>
            <p className="text-xs text-[#5F6576] dark:text-[#8E96B0] max-w-md">
              San Jose, CA (218ms) and Sydney/Melbourne (132ms) front-office architecture synchronized directly with Spenta’s 20-FTE Dhaka R&amp;D Hub.
            </p>
          </div>
        ) : (
          <div ref={mountRef} className="w-full flex-1 min-h-[380px] sm:min-h-[430px] cursor-grab active:cursor-grabbing" />
        )}

        {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion, No backdrop-filter over WebGL) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-xl flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            className="mb-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F4]/95 dark:bg-[#141A32]/95 border border-[#E4DFD6] dark:border-[#232B4A] text-[11px] font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer"
          >
            {dockOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            <span>{dockOpen ? 'Hide Controls' : 'Show Controls'}</span>
          </button>

          {dockOpen && (
            <div className="w-full px-3 py-2 rounded-xl bg-[#FAF8F4]/95 dark:bg-[#141A32]/95 border border-[#E4DFD6] dark:border-[#232B4A] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {DUAL_SHORE_HUBS.map((hub) => {
                  const active = hub.id === selectedHubId;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => {
                        setSelectedHubId(hub.id);
                        setAutoRotate(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#1F3863] text-white dark:bg-[#8FA6E8] dark:text-[#0B1020]'
                          : 'text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5]'
                      }`}
                    >
                      {hub.name.split(',')[0]}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoRotate((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] text-xs font-medium text-[#16213A] dark:text-[#E7EBF5] cursor-pointer whitespace-nowrap"
                >
                  {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{autoRotate ? 'Pause Orbit' : 'Orbit'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHubId('dhaka');
                    setAutoRotate(true);
                  }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#E4DFD6] dark:border-[#232B4A] text-[#5F6576] dark:text-[#8E96B0] hover:text-[#16213A] dark:hover:text-[#E7EBF5] cursor-pointer"
                  aria-label="Reset globe view"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Hub Telemetry & Economics Dossier */}
      <div className="lg:col-span-5 rounded-2xl border border-[#E4DFD6] dark:border-[#232B4A] bg-white dark:bg-[#141A32] p-5 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#5F6576] dark:text-[#8E96B0]">
              {activeHub.region} ·{' '}
              {activeHub.latencyToDhakaMs === 0
                ? 'Core Delivery Enclave'
                : `${activeHub.latencyToDhakaMs}ms sync to Dhaka`}
            </div>
            <h3 className="text-lg font-bold text-[#16213A] dark:text-[#E7EBF5]">
              {activeHub.name}
            </h3>
            <p className="text-xs font-medium text-[#1F3863] dark:text-[#8FA6E8]">
              {activeHub.role}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F4] dark:bg-[#0F1529] border border-[#E4DFD6] dark:border-[#232B4A] space-y-1">
            <div className="text-[11px] font-mono text-[#5F6576] dark:text-[#8E96B0]">
              {activeHub.headcountLabel}
            </div>
            <div className="text-xs font-semibold text-[#1C6E46] dark:text-[#6FCB9F]">
              {activeHub.costHighlight}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#16213A] dark:text-[#E7EBF5]">
              Core Operational Mandate
            </div>
            <ul className="space-y-1.5 text-xs text-[#5F6576] dark:text-[#8E96B0]">
              {activeHub.responsibilities.map((item) => (
                <li key={item} className="leading-relaxed">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E4DFD6] dark:border-[#232B4A] flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono tabular-nums text-[#5F6576] dark:text-[#8E96B0]">
            Loaded Hub Rate: $12.98/hr
          </div>
          <button
            type="button"
            onClick={() => openContactModal(`Dual-Shore Delivery Briefing (${activeHub.name})`)}
            className="px-3.5 py-2 rounded-lg bg-[#1F3863] hover:bg-[#162848] dark:bg-[#8FA6E8] dark:hover:bg-[#A6B9F0] text-white dark:text-[#0B1020] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Schedule Hub Walkthrough
          </button>
        </div>
      </div>
    </div>
  );
}
