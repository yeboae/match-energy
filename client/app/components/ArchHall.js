'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SPHERE_R    = 5.2;
const SLOT        = 0.70;   // wider spacing → ~800 tiles total
const TILE        = 0.55;   // background tile size
const TILE_PORTAL   = 0.65;              // portal tile height
const TILE_PORTAL_W = TILE_PORTAL * (16 / 9); // portal tile width — matches landscape renders

/* ── Build every tile's position + inward-facing quaternion ── */
function buildSphereTransforms(radius, slotSize) {
  const tiles = [];
  const nBands = Math.round(Math.PI * radius / slotSize);
  const ZUP = new THREE.Vector3(0, 0, 1);

  for (let b = 0; b < nBands; b++) {
    const phi  = (b + 0.5) * Math.PI / nBands;
    const y    = Math.cos(phi) * radius;
    const rR   = Math.sin(phi) * radius;
    const nT   = Math.max(1, Math.round(2 * Math.PI * rR / slotSize));

    for (let t = 0; t < nT; t++) {
      const theta = (t / nT) * Math.PI * 2;
      const pos = new THREE.Vector3(rR * Math.cos(theta), y, rR * Math.sin(theta));

      // Inward-facing: +Z of tile points toward sphere centre
      const inward = pos.clone().normalize().negate();
      const q = new THREE.Quaternion().setFromUnitVectors(ZUP, inward);

      // ±2° imperfection so each tile catches light differently
      const ax = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).normalize();
      q.multiply(new THREE.Quaternion().setFromAxisAngle(ax, (Math.random() - 0.5) * 0.07));

      tiles.push({ pos, q });
    }
  }
  return tiles;
}

/* ── Scatter points on sphere shells (for star field) ── */
function makeStarPositions(count, rMin, rMax) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = rMin + Math.random() * (rMax - rMin);
    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return pos;
}

/* ── Portal target directions (front hemisphere so mouse can reach them) ── */
const PORTAL_DIRS = [
  new THREE.Vector3( 0.30,  0.55, -0.78).normalize(),
  new THREE.Vector3(-0.72,  0.45, -0.53).normalize(),
  new THREE.Vector3( 0.82,  0.05, -0.57).normalize(),
  new THREE.Vector3(-0.60, -0.35, -0.72).normalize(),
  new THREE.Vector3( 0.15, -0.65, -0.75).normalize(),
  new THREE.Vector3(-0.10,  0.10, -0.99).normalize(),
];

function pickPortalIndices(tiles, n) {
  const used = new Set();
  return PORTAL_DIRS.slice(0, n).map(dir => {
    let best = -1, bestDot = -Infinity;
    tiles.forEach(({ pos }, i) => {
      if (used.has(i)) return;
      const d = pos.clone().normalize().dot(dir);
      if (d > bestDot) { bestDot = d; best = i; }
    });
    used.add(best);
    return best;
  });
}

export default function ArchHall({ exhibits = [], onBack }) {
  const mountRef     = useRef(null);
  const onBackRef    = useRef(onBack);
  const exitFocusRef = useRef(null);
  onBackRef.current  = onBack;

  const [focusedExhibit, setFocusedExhibit] = useState(null);
  const [descExpanded,   setDescExpanded]   = useState(false);
  const [hoveredTitle,   setHoveredTitle]   = useState(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    mount.appendChild(renderer.domElement);

    /* ── Scene ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00000a);

    /* ── Camera (seated at origin, looks around) ── */
    const camera = new THREE.PerspectiveCamera(78, mount.clientWidth / mount.clientHeight, 0.05, 20);
    camera.position.set(0, 0, 0);
    camera.rotation.order = 'YXZ';

    scene.add(new THREE.AmbientLight(0x0d1128, 0.5));

    /* ── Orbiting point lights — cool white/silver for crisp specular flashes ── */
    const LIGHT_CFG = [
      { r: 2.8, speed:  0.44, phase: 0.0,  yOff:  0.6, color: 0xddeeff, power: 6 },
      { r: 2.4, speed: -0.31, phase: 2.2,  yOff: -0.7, color: 0xeef4ff, power: 5 },
      { r: 3.1, speed:  0.19, phase: 4.3,  yOff:  1.3, color: 0xffffff, power: 5 },
      { r: 2.7, speed:  0.57, phase: 1.1,  yOff: -0.2, color: 0xddeeff, power: 6 },
      { r: 2.5, speed: -0.22, phase: 3.6,  yOff:  0.0, color: 0xeef8ff, power: 4 },
      { r: 3.3, speed:  0.35, phase: 5.1,  yOff: -1.1, color: 0xffffff, power: 4 },
    ];
    const orbitLights = LIGHT_CFG.map(c => {
      const pl = new THREE.PointLight(c.color, c.power, 11, 1.6);
      scene.add(pl);
      return { light: pl, cfg: c };
    });

    /* ── Star field ── */
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(makeStarPositions(700, 4.0, 5.05), 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.016, sizeAttenuation: true });
    const stars   = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Faint blue-violet haze — distant galaxy smear
    const hazeGeo = new THREE.BufferGeometry();
    hazeGeo.setAttribute('position', new THREE.BufferAttribute(makeStarPositions(140, 4.2, 4.95), 3));
    const hazeMat = new THREE.PointsMaterial({
      color: 0x7799ee, size: 0.05, sizeAttenuation: true,
      transparent: true, opacity: 0.30,
    });
    const haze = new THREE.Points(hazeGeo, hazeMat);
    scene.add(haze);

    /* ── Generate all tile transforms ── */
    const allTiles     = buildSphereTransforms(SPHERE_R, SLOT);
    const portalIdx    = pickPortalIndices(allTiles, exhibits.length);
    const portalSet    = new Set(portalIdx);
    const bgTransforms = allTiles.filter((_, i) => !portalSet.has(i));

    /* ── Background mirror tiles — dark glossy, 1 draw call ── */
    const bgMat = new THREE.MeshStandardMaterial({
      color: 0x080812,
      metalness: 0.97,
      roughness: 0.02,
    });
    const bgMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(TILE, TILE),
      bgMat,
      bgTransforms.length
    );
    const dummy = new THREE.Object3D();
    bgTransforms.forEach(({ pos, q }, i) => {
      dummy.position.copy(pos);
      dummy.quaternion.copy(q);
      dummy.updateMatrix();
      bgMesh.setMatrixAt(i, dummy.matrix);
    });
    bgMesh.instanceMatrix.needsUpdate = true;
    scene.add(bgMesh);

    /* ── Portal tiles (individual meshes, 1 per exhibit) ── */
    const portals = portalIdx.map((tIdx, eIdx) => {
      const ex = exhibits[eIdx];
      if (!ex) return null;
      const { pos } = allTiles[tIdx];

      // Portal tiles get a clean (un-tilted) quaternion so they face straight in
      const _ZUP   = new THREE.Vector3(0, 0, 1);
      const cleanQ = new THREE.Quaternion().setFromUnitVectors(_ZUP, pos.clone().normalize().negate());
      // Tile's world-space up — used to align camera roll when zooming in
      const tileUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cleanQ);

      const mat = new THREE.MeshStandardMaterial({
        color: 0x080812,
        metalness: 0.97,
        roughness: 0.02,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(TILE_PORTAL_W, TILE_PORTAL), mat);
      // Shift portal tile slightly toward camera centre so it renders in front of neighbours
      const inward = pos.clone().normalize().negate();
      m.position.copy(pos).addScaledVector(inward, 0.15);
      m.quaternion.copy(cleanQ);

      // Edge glow (activates on hover)
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x4499ff, transparent: true, opacity: 0 });
      const edgeLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(TILE_PORTAL_W + 0.012, TILE_PORTAL + 0.012)),
        edgeMat
      );
      edgeLines.position.z = 0.002;
      m.add(edgeLines);

      // Beacon cone beam — always visible, pulsing
      const BEAM_LEN = 2.0;
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 0.088, BEAM_LEN, 10, 1, true),
        beamMat
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = BEAM_LEN / 2;
      m.add(beam);

      // Soft point light to tint nearby tiles
      const pLight = new THREE.PointLight(0x4466ff, 3.5, 3.0);
      pLight.position.copy(pos).multiplyScalar(0.91);
      scene.add(pLight);

      scene.add(m);

      const data = {
        mesh: m, mat, edgeMat, beamMat,
        portalLight: pLight,
        exhibit: ex,
        dir: pos.clone().normalize(),
        tileUp,
        beamPhase: eIdx * 1.15,
        hoverProg: 0,
        hovered: false,
        texture: null,
      };

      if (ex.videoUrl) {
        const vid = document.createElement('video');
        vid.src = ex.videoUrl; vid.loop = true; vid.muted = true;
        vid.playsInline = true; vid.crossOrigin = 'anonymous';
        vid.addEventListener('canplay', () => { vid.play().catch(() => {}); }, { once: true });
        const tex = new THREE.VideoTexture(vid);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter  = THREE.LinearFilter;
        tex.generateMipmaps = false;
        data.texture = tex;
        data.videoEl = vid;
      } else if (ex.imageUrl) {
        new THREE.TextureLoader().load(ex.imageUrl, t => {
          t.colorSpace = THREE.SRGBColorSpace;
          // Contain: show full image, letterbox if aspect differs from tile
          const tileAspect = TILE_PORTAL_W / TILE_PORTAL; // 16/9
          const imgAspect  = t.image.width / t.image.height;
          const rel = imgAspect / tileAspect;
          if (rel > 1.01) {
            // Image wider than tile: bars top/bottom
            t.repeat.set(1, rel);
            t.offset.set(0, -(rel - 1) / 2);
          } else if (rel < 0.99) {
            // Image narrower than tile: bars left/right
            t.repeat.set(1 / rel, 1);
            t.offset.set(-(1 / rel - 1) / 2, 0);
          }
          data.texture = t;
        });
      }

      return data;
    }).filter(Boolean);

    /* ── Mouse look (cursor position → camera direction) ── */
    let targetYaw = 0, targetPitch = 0, yaw = 0, pitch = 0;
    const mouse2D = new THREE.Vector2(-999, -999);

    const onMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top)  / rect.height;
      targetYaw   = (nx - 0.5) * -Math.PI * 1.55;
      targetPitch = (ny - 0.5) * -Math.PI * 0.72;
      targetPitch = Math.max(-1.22, Math.min(1.22, targetPitch));
      mouse2D.x = nx * 2 - 1;
      mouse2D.y = -(ny * 2 - 1);
    };
    mount.addEventListener('mousemove', onMouseMove);

    /* ── Focus state ── */
    let focusMode     = 'free';
    let focusProgress = 0;
    let activePortal  = null;
    const focusCamStart = new THREE.Vector3();
    const focusCamEnd   = new THREE.Vector3();
    const focusLookPt   = new THREE.Vector3();
    let retYaw = 0, retPitch = 0, zoomOutY = 0, zoomOutX = 0;

    const exitFocus = () => {
      if (focusMode !== 'focused') return;
      zoomOutY = camera.rotation.y; zoomOutX = camera.rotation.x;
      focusMode = 'zooming-out'; focusProgress = 0;
      if (activePortal?.videoEl) { activePortal.videoEl.muted = true; }
      setFocusedExhibit(null); setDescExpanded(false);
    };
    exitFocusRef.current = exitFocus;

    const raycaster = new THREE.Raycaster();

    const onClick = () => {
      if (focusMode !== 'free') return;
      raycaster.setFromCamera(mouse2D, camera);
      const hits = raycaster.intersectObjects(portals.map(p => p.mesh), false);
      if (!hits.length) return;
      const portal = portals.find(p => p.mesh === hits[0].object);
      if (!portal) return;
      activePortal = portal;

      // Instantly reveal image and hide beam — no white flash during zoom
      portal.hoverProg = 1;
      portal.mat.metalness = 0.03;
      portal.mat.roughness = 0.09;
      portal.mat.emissive.setScalar(0);
      if (portal.texture && !portal.mat.map) {
        portal.mat.map = portal.texture;
        portal.mat.color.setHex(0xffffff);
        portal.mat.needsUpdate = true;
      }
      portal.beamMat.opacity = 0;
      portal.portalLight.intensity = 0;
      bgMesh.visible = false;

      focusCamStart.copy(camera.position);
      focusCamEnd.copy(portal.dir).multiplyScalar(SPHERE_R * 0.50);
      focusLookPt.copy(portal.dir).multiplyScalar(SPHERE_R);
      retYaw = yaw; retPitch = pitch;
      if (portal.videoEl) portal.videoEl.muted = false;
      focusMode = 'zooming-in'; focusProgress = 0;
    };
    mount.addEventListener('click', onClick);

    /* ── Resize ── */
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    /* ── Animation loop ── */
    let rafId;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t  = clock.getElapsedTime();

      /* Update orbiting lights */
      for (const { light, cfg } of orbitLights) {
        const a = cfg.phase + t * cfg.speed;
        light.position.set(cfg.r * Math.cos(a), cfg.yOff, cfg.r * Math.sin(a));
      }

      /* Zoom in */
      if (focusMode === 'zooming-in') {
        focusProgress = Math.min(focusProgress + dt * 1.0, 1);
        const ease = 1 - Math.pow(1 - focusProgress, 3);
        camera.position.lerpVectors(focusCamStart, focusCamEnd, ease);
        camera.fov = 78 - ease * 64;
        camera.updateProjectionMatrix();
        camera.up.copy(activePortal.tileUp);
        camera.lookAt(focusLookPt);
        if (focusProgress >= 1) { focusMode = 'focused'; setFocusedExhibit(activePortal.exhibit); }
        renderer.render(scene, camera);
        return;
      }

      /* Zoom out */
      if (focusMode === 'zooming-out') {
        focusProgress = Math.min(focusProgress + dt * 1.1, 1);
        const ease = 1 - Math.pow(1 - focusProgress, 3);
        camera.position.lerpVectors(focusCamEnd, focusCamStart, ease);
        camera.fov = 14 + ease * 64;
        camera.updateProjectionMatrix();
        yaw   = zoomOutY + (retYaw   - zoomOutY) * ease;
        pitch = zoomOutX + (retPitch - zoomOutX) * ease;
        camera.rotation.y = yaw; camera.rotation.x = pitch;
        if (focusProgress >= 1) {
          focusMode = 'free'; camera.fov = 78; camera.up.set(0, 1, 0); camera.updateProjectionMatrix();
          if (activePortal) activePortal.portalLight.intensity = 3.5;
          bgMesh.visible = true;
        }
        renderer.render(scene, camera);
        return;
      }

      /* Focused — static frame */
      if (focusMode === 'focused') {
        camera.position.copy(focusCamEnd);
        camera.up.copy(activePortal.tileUp);
        camera.lookAt(focusLookPt);
        renderer.render(scene, camera);
        return;
      }

      /* Free look */
      yaw   += (targetYaw   - yaw)   * 0.055;
      pitch += (targetPitch - pitch) * 0.055;
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      /* Portal hover */
      raycaster.setFromCamera(mouse2D, camera);
      const hits = raycaster.intersectObjects(portals.map(p => p.mesh), false);
      const hitMesh = hits.length ? hits[0].object : null;
      let anyHovered = false;
      let newTitle   = null;

      for (const p of portals) {
        p.hovered = p.mesh === hitMesh;
        if (p.hovered) { anyHovered = true; newTitle = p.exhibit.title; }

        p.hoverProg = p.hovered
          ? Math.min(p.hoverProg + dt * 1.9, 1)
          : Math.max(p.hoverProg - dt * 2.4, 0);

        const prog      = p.hoverProg;
        const flashPeak = 0.22;

        // Sharp light-beam flash — base idle glow so tile is always faintly lit
        const idleGlow = 0.04 + Math.sin(t * 1.3 + p.beamPhase) * 0.015;
        const flash = prog < flashPeak
          ? prog / flashPeak
          : 1 - (prog - flashPeak) / (1 - flashPeak);
        p.mat.emissive.setScalar(idleGlow + flash * 2.8);
        p.mat.emissiveIntensity = 1;

        // Dark mirror → image reveal
        const reveal = prog < flashPeak ? 0 : (prog - flashPeak) / (1 - flashPeak);
        p.mat.metalness = 1.0 - reveal * 0.97;
        p.mat.roughness = reveal * 0.09;

        if (reveal > 0.06 && p.texture && !p.mat.map) {
          p.mat.map = p.texture;
          p.mat.color.setHex(0xffffff);
          p.mat.needsUpdate = true;
        }
        if (reveal <= 0.01 && p.mat.map) {
          p.mat.map = null;
          p.mat.color.setHex(0x080812);
          p.mat.metalness = 0.97; p.mat.roughness = 0.02;
          p.mat.needsUpdate = true;
        }

        p.edgeMat.opacity = reveal * 0.88;

        // Beacon beam: clearly visible idle pulse + brightens on hover
        const pulse = 0.18 + Math.sin(t * 1.3 + p.beamPhase) * 0.07;
        p.beamMat.opacity = pulse + p.hoverProg * 0.35;
      }

      mount.style.cursor = anyHovered ? 'pointer' : 'default';
      setHoveredTitle(newTitle);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('click', onClick);
      for (const p of portals) {
        if (p.videoEl) { p.videoEl.pause(); p.videoEl.src = ''; }
        scene.remove(p.portalLight);
      }
      scene.remove(stars); starGeo.dispose(); starMat.dispose();
      scene.remove(haze);  hazeGeo.dispose(); hazeMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [exhibits]);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#00000a', position: 'relative' }}>

      {/* Back */}
      <button
        onClick={() => onBackRef.current?.()}
        style={{
          position: 'absolute', top: 28, left: 28, zIndex: 10,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#2a3a5c', fontSize: '11px', letterSpacing: '0.28em',
          textTransform: 'uppercase', fontFamily: "'Courier New', monospace",
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.target.style.color = '#6688cc'}
        onMouseLeave={e => e.target.style.color = '#2a3a5c'}
      >
        ← Workbench
      </button>

      {/* Hover label */}
      {hoveredTitle && !focusedExhibit && (
        <div
          key={hoveredTitle}
          style={{
            position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'none', textAlign: 'center',
            animation: 'fadeUp 0.2s ease forwards',
          }}
        >
          <p style={{ fontSize: 9, letterSpacing: '0.44em', color: '#2a3a58', textTransform: 'uppercase', fontFamily: "'Courier New', monospace", marginBottom: 5 }}>
            Design Gallery
          </p>
          <p style={{ fontSize: 14, letterSpacing: '0.10em', color: '#5577bb', fontFamily: "'Courier New', monospace" }}>
            {hoveredTitle}
          </p>
          <p style={{ fontSize: 9, letterSpacing: '0.26em', color: '#223348', fontFamily: "'Courier New', monospace", marginTop: 6 }}>
            click to view
          </p>
        </div>
      )}

      {/* Explore hint */}
      {!hoveredTitle && !focusedExhibit && (
        <p style={{
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, letterSpacing: '0.32em', color: '#1a2438',
          textTransform: 'uppercase', fontFamily: "'Courier New', monospace",
          pointerEvents: 'none', userSelect: 'none', zIndex: 5,
          animation: 'pulse 3s ease-in-out infinite',
        }}>
          Move mouse to explore · {exhibits.length} works hidden in the mirrors
        </p>
      )}

      {/* Focused exhibit placard */}
      {focusedExhibit && (
        <>
          <div
            onClick={() => exitFocusRef.current?.()}
            style={{ position: 'absolute', inset: 0, zIndex: 9, cursor: 'pointer' }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', right: 52, top: '50%',
              transform: 'translateY(-50%)', zIndex: 11,
              animation: 'placardIn 0.45s ease forwards',
            }}
          >
            <div
              onClick={() => setDescExpanded(v => !v)}
              style={{
                background: 'linear-gradient(160deg, #06090f 0%, #040710 100%)',
                border: '1px solid #1a2840',
                borderRadius: 2,
                padding: '20px 24px 18px',
                width: 210,
                cursor: 'pointer',
                boxShadow: '0 8px 40px rgba(0,0,0,0.95), inset 0 1px 0 rgba(80,120,200,0.08)',
                userSelect: 'none',
                position: 'relative',
              }}
            >
              {/* Corner marks */}
              {[[-1,1],[1,1],[-1,-1],[1,-1]].map(([sx,sy],i) => (
                <div key={i} style={{
                  position: 'absolute',
                  [sy > 0 ? 'top' : 'bottom']: 7,
                  [sx < 0 ? 'left' : 'right']: 7,
                  width: 9, height: 9,
                  borderTop:    sy > 0 ? '1px solid #1e3050' : 'none',
                  borderBottom: sy < 0 ? '1px solid #1e3050' : 'none',
                  borderLeft:   sx < 0 ? '1px solid #1e3050' : 'none',
                  borderRight:  sx > 0 ? '1px solid #1e3050' : 'none',
                }} />
              ))}
              <p style={{ fontSize: 8, letterSpacing: '0.44em', color: '#1e3050', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'Courier New', monospace" }}>
                Design
              </p>
              <h3 style={{ fontSize: 14, fontWeight: 400, color: '#5577cc', letterSpacing: '0.06em', fontFamily: "'Courier New', monospace", marginBottom: 10 }}>
                {focusedExhibit.title}
              </h3>
              <div style={{ width: 28, height: 1, background: '#1e3050', marginBottom: 12 }} />
              {!descExpanded
                ? <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#1e3050', fontFamily: "'Courier New', monospace", fontStyle: 'italic' }}>
                    Touch to read →
                  </p>
                : <p style={{ fontSize: 11, color: '#4466aa', lineHeight: 1.78, fontFamily: "'Courier New', monospace", letterSpacing: '0.03em', animation: 'fadeIn 0.3s ease' }}>
                    {focusedExhibit.description}
                  </p>
              }
            </div>

            {/* Placard stand */}
            <div style={{ position: 'absolute', left: '50%', bottom: -68, transform: 'translateX(-50%)', width: 2, height: 68, background: 'linear-gradient(to bottom, #1a2840, #060810)' }} />
            <div style={{ position: 'absolute', left: '50%', bottom: -76, transform: 'translateX(-50%)', width: 44, height: 7, background: '#060c18', borderRadius: '0 0 2px 2px' }} />
          </div>

          <p style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            fontSize: 9, letterSpacing: '0.30em', color: '#1a2840',
            textTransform: 'uppercase', fontFamily: "'Courier New', monospace",
            zIndex: 10, pointerEvents: 'none', userSelect: 'none',
          }}>
            Click anywhere to step back
          </p>
        </>
      )}

      <style>{`
        @keyframes placardIn {
          from { opacity: 0; transform: translate(14px, -50%); }
          to   { opacity: 1; transform: translate(0,    -50%); }
        }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes pulse   { 0%,100%{opacity:.2} 50%{opacity:.55} }
      `}</style>
    </div>
  );
}
