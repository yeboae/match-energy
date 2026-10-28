'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const W = 3.6;
const H = 3.2;
const L = 32;
const FRAME_W = 1.05;
const FRAME_H = 0.78;
const IMG_W   = 0.88;
const IMG_H   = 0.60;

function mesh(geo, mat) { return new THREE.Mesh(geo, mat); }
function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

function buildCorridor(scene) {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.95 });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x0e0b08, roughness: 0.9 });
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x28201a, roughness: 0.88, metalness: 0.02 });
  const baseMat  = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.7 });
  const moldMat  = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.65 });

  const floor = mesh(new THREE.BoxGeometry(W, 0.12, L), floorMat);
  floor.position.set(0, -0.06, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(at(mesh(new THREE.BoxGeometry(W, 0.15, L), ceilMat), 0, H + 0.075, 0));

  const leftWall = mesh(new THREE.BoxGeometry(0.12, H, L), wallMat);
  leftWall.position.set(-W / 2, H / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = mesh(new THREE.BoxGeometry(0.12, H, L), wallMat);
  rightWall.position.set(W / 2, H / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  scene.add(at(mesh(new THREE.BoxGeometry(W, H, 0.12), wallMat), 0, H / 2, -L / 2));

  const baseGeo = new THREE.BoxGeometry(0.055, 0.20, L);
  scene.add(at(mesh(baseGeo, baseMat), -W / 2 + 0.088, 0.10, 0));
  scene.add(at(mesh(baseGeo, baseMat),  W / 2 - 0.088, 0.10, 0));

  const moldGeo = new THREE.BoxGeometry(0.04, 0.12, L);
  scene.add(at(mesh(moldGeo, moldMat), -W / 2 + 0.08, H - 0.06, 0));
  scene.add(at(mesh(moldGeo, moldMat),  W / 2 - 0.08, H - 0.06, 0));

  const pendantLights = [];
  const fixtures = [];
  const pendantCount = Math.floor(L / 4.5);
  for (let i = 0; i < pendantCount; i++) {
    const z = L / 2 - 2.2 - i * 4.5;
    const pl = new THREE.PointLight(0xffd08a, 1.5, 8);
    pl.position.set(0, H - 0.08, z);
    pl.castShadow = true;
    scene.add(pl);
    pendantLights.push(pl);

    const fixMat = new THREE.MeshStandardMaterial({
      color: 0x807858, metalness: 0.72, roughness: 0.28,
      emissive: 0xffd08a, emissiveIntensity: 0.55,
    });
    const fix = mesh(new THREE.CylinderGeometry(0.038, 0.055, 0.11, 8), fixMat);
    fix.position.set(0, H - 0.055, z);
    scene.add(fix);
    fixtures.push(fix);

    scene.add(at(
      mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.28, 4),
        new THREE.MeshStandardMaterial({ color: 0x222222 })),
      0, H + 0.14, z
    ));
  }

  return { pendantLights, fixtures };
}

function buildFrame(exhibit, idx, scene) {
  const isLeft = idx % 2 === 0;
  const wx = isLeft ? -W / 2 + 0.14 : W / 2 - 0.14;
  const fz = L / 2 - 3.5 - idx * 4.5;
  const fy = 1.72;

  const fW = idx >= 4 ? FRAME_W * 1.25 : FRAME_W;
  const iW = idx >= 4 ? IMG_W   * 1.25 : IMG_W;

  const group = new THREE.Group();
  group.position.set(wx, fy, fz);
  group.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
  group.userData.exhibitId = exhibit.id;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c1e10, roughness: 0.58, metalness: 0.08 });
  group.add(at(mesh(new THREE.BoxGeometry(fW + 0.12, 0.058, 0.052), frameMat), 0,  FRAME_H / 2 + 0.029, 0));
  group.add(at(mesh(new THREE.BoxGeometry(fW + 0.12, 0.058, 0.052), frameMat), 0, -FRAME_H / 2 - 0.029, 0));
  group.add(at(mesh(new THREE.BoxGeometry(0.058, FRAME_H + 0.12, 0.052), frameMat), -fW / 2 - 0.029, 0, 0));
  group.add(at(mesh(new THREE.BoxGeometry(0.058, FRAME_H + 0.12, 0.052), frameMat),  fW / 2 + 0.029, 0, 0));

  group.add(mesh(
    new THREE.BoxGeometry(fW, FRAME_H, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.7 })
  ));

  const imgMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const imgPlane = mesh(new THREE.PlaneGeometry(iW, IMG_H), imgMat);
  imgPlane.position.z = 0.008;
  group.add(imgPlane);

  let videoEl = null;
  if (exhibit.videoUrl) {
    const vid = document.createElement('video');
    vid.src = exhibit.videoUrl;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.crossOrigin = 'anonymous';
    vid.addEventListener('canplay', () => { vid.play().catch(() => {}); }, { once: true });
    const tex = new THREE.VideoTexture(vid);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    imgMat.map = tex;
    imgMat.needsUpdate = true;
    videoEl = vid;
  } else {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      exhibit.imageUrl,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; imgMat.map = tex; imgMat.needsUpdate = true; },
      undefined,
      () => { imgMat.color.set(0x1a1410); }
    );
  }

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffd080, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
  });
  const glowPlane = mesh(new THREE.PlaneGeometry(fW + 0.5, FRAME_H + 0.5), glowMat);
  glowPlane.position.z = -0.015;
  glowPlane.userData.isGlow = true;
  group.add(glowPlane);

  const accent = new THREE.PointLight(0xfff4d0, 0.6, 2.2);
  accent.position.set(0, FRAME_H / 2 + 0.5, 0.4);
  group.add(accent);

  scene.add(group);

  const labelWorldPos = new THREE.Vector3(wx, fy - FRAME_H / 2 - 0.18, fz);
  // Face-on camera position: 1.4 units off the wall in the frame's outward direction
  const camOffset = isLeft ? (idx >= 4 ? 1.9 : 1.4) : (idx >= 4 ? -1.9 : -1.4);
  const viewPos = new THREE.Vector3(wx + camOffset, fy, fz);
  const lookAt  = new THREE.Vector3(wx, fy, fz);

  return { group, glow: glowPlane, exhibit, labelWorldPos, hovered: false, viewPos, lookAt, videoEl };
}

export default function MuseumHall({ exhibits = [], onBack }) {
  const mountRef    = useRef(null);
  const onBackRef   = useRef(onBack);
  const exitFocusRef = useRef(null);
  onBackRef.current = onBack;

  const [focusedExhibit, setFocusedExhibit] = useState(null);
  const [descExpanded,   setDescExpanded]   = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    mount.appendChild(renderer.domElement);

    /* ── Scene ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0906);
    scene.fog = new THREE.FogExp2(0x0c0906, 0.042);

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / mount.clientHeight, 0.01, 60);
    camera.position.set(0, 1.35, L / 2 - 0.5);
    camera.rotation.order = 'YXZ';

    const ambientLight = new THREE.AmbientLight(0xffe8c8, 0.55);
    scene.add(ambientLight);

    const { pendantLights, fixtures } = buildCorridor(scene);
    const frames = exhibits.map((ex, i) => buildFrame(ex, i, scene));

    /* ── DOM label overlay ── */
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
    mount.appendChild(labelContainer);

    const labelEls = frames.map(fm => {
      const div = document.createElement('div');
      div.style.cssText = [
        'position:absolute', 'text-align:center', 'pointer-events:none',
        'transform:translateX(-50%)', 'opacity:0', 'transition:opacity 0.3s',
      ].join(';');
      div.innerHTML = `
        <div style="font-family:Georgia,serif;font-size:13px;color:#e8d8c0;letter-spacing:.12em;margin-bottom:3px">${fm.exhibit.title}</div>
        <div style="font-size:10px;color:#6a5840;letter-spacing:.08em;max-width:130px;line-height:1.4">${fm.exhibit.description}</div>
      `;
      labelContainer.appendChild(div);
      return div;
    });

    /* ── Mouse look ── */
    let targetYaw = 0, targetPitch = 0, currentYaw = 0, currentPitch = 0;
    const onMouseMove = (e) => {
      if (focusMode !== 'free') return;
      const rect = mount.getBoundingClientRect();
      targetYaw   = ((e.clientX - rect.left) / rect.width  - 0.5) * -1.05;
      targetPitch = ((e.clientY - rect.top)  / rect.height - 0.5) *  0.52;
    };
    mount.addEventListener('mousemove', onMouseMove);

    /* ── Auto walk ── */
    let walkZ = camera.position.z;
    const WALK_END = -L / 2 + 2.5;

    /* ── Raycaster ── */
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2(-999, -999);
    const onMouseMove2 = (e) => {
      const rect = mount.getBoundingClientRect();
      mouse2D.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse2D.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    mount.addEventListener('mousemove', onMouseMove2);

    /* ── Focus state ── */
    // focusMode: 'free' | 'zooming-in' | 'focused' | 'zooming-out'
    let focusMode = 'free';
    let focusProgress = 0;
    const focusCamPos   = new THREE.Vector3();
    const focusCamStart = new THREE.Vector3();
    const focusLookAt   = new THREE.Vector3();
    let focusReturnYaw = 0, focusReturnPitch = 0;
    let zoomOutRotY = 0,    zoomOutRotX = 0;
    let pendingExhibit = null;
    let focusedVideoEl = null;

    const exitFocus = () => {
      if (focusMode !== 'focused') return;
      zoomOutRotY   = camera.rotation.y;
      zoomOutRotX   = camera.rotation.x;
      focusMode     = 'zooming-out';
      focusProgress = 0;
      if (focusedVideoEl) { focusedVideoEl.muted = true; focusedVideoEl = null; }
      setFocusedExhibit(null);
      setDescExpanded(false);
    };
    exitFocusRef.current = exitFocus;

    const onClick = () => {
      if (focusMode !== 'free') return;
      raycaster.setFromCamera(mouse2D, camera);
      const allMeshes = [];
      frames.forEach(f => f.group.traverse(c => { if (c.isMesh) allMeshes.push(c); }));
      const hits = raycaster.intersectObjects(allMeshes, false);
      if (!hits.length) return;
      const hitObj = hits[0].object;
      for (const f of frames) {
        let found = false;
        f.group.traverse(c => { if (c === hitObj) found = true; });
        if (!found) continue;
        focusCamStart.copy(camera.position);
        focusCamPos.copy(f.viewPos);
        focusLookAt.copy(f.lookAt);
        focusReturnYaw   = currentYaw;
        focusReturnPitch = currentPitch;
        pendingExhibit   = f.exhibit;
        focusedVideoEl   = f.videoEl || null;
        if (focusedVideoEl) focusedVideoEl.muted = false;
        focusMode     = 'zooming-in';
        focusProgress = 0;
        break;
      }
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

      /* ── Zoom-in ── */
      if (focusMode === 'zooming-in') {
        focusProgress = Math.min(focusProgress + dt * 1.2, 1);
        const ease = 1 - Math.pow(1 - focusProgress, 3);
        camera.position.lerpVectors(focusCamStart, focusCamPos, ease);
        camera.fov = 68 - ease * 24; // → 44
        camera.updateProjectionMatrix();
        camera.lookAt(focusLookAt);
        if (focusProgress >= 1) {
          focusMode = 'focused';
          setFocusedExhibit(pendingExhibit);
        }
        renderer.render(scene, camera);
        return;
      }

      /* ── Zoom-out ── */
      if (focusMode === 'zooming-out') {
        focusProgress = Math.min(focusProgress + dt * 1.2, 1);
        const ease = 1 - Math.pow(1 - focusProgress, 3);
        camera.position.lerpVectors(focusCamPos, focusCamStart, ease);
        camera.fov = 44 + ease * 24; // → 68
        camera.updateProjectionMatrix();
        currentYaw   = zoomOutRotY   + (focusReturnYaw   - zoomOutRotY)   * ease;
        currentPitch = zoomOutRotX   + (focusReturnPitch - zoomOutRotX)   * ease;
        camera.rotation.y = currentYaw;
        camera.rotation.x = currentPitch;
        if (focusProgress >= 1) {
          focusMode = 'free';
          camera.fov = 68;
          camera.updateProjectionMatrix();
        }
        renderer.render(scene, camera);
        return;
      }

      /* ── Focused (static) ── */
      if (focusMode === 'focused') {
        camera.position.copy(focusCamPos);
        camera.lookAt(focusLookAt);
        for (const lbl of labelEls) lbl.style.opacity = '0';
        renderer.render(scene, camera);
        return;
      }

      /* ── Free walk ── */
      currentYaw   += (targetYaw   - currentYaw)   * 0.06;
      currentPitch += (targetPitch - currentPitch)  * 0.06;
      currentPitch  = Math.max(-0.30, Math.min(0.30, currentPitch));
      camera.rotation.y = currentYaw;
      camera.rotation.x = currentPitch;

      walkZ -= 1.3 * dt;
      if (walkZ < WALK_END) walkZ = L / 2 - 0.5;
      camera.position.z = walkZ;

      /* Frame glow + hover */
      raycaster.setFromCamera(mouse2D, camera);
      const allMeshes = frames.flatMap(f => {
        const ms = [];
        f.group.traverse(c => { if (c.isMesh) ms.push(c); });
        return ms;
      });
      const hits = raycaster.intersectObjects(allMeshes, false);
      const hitIds = new Set();
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        for (const f of frames) {
          let found = false;
          f.group.traverse(c => { if (c === hitObj) found = true; });
          if (found) { hitIds.add(f.exhibit.id); break; }
        }
      }
      for (const fm of frames) {
        fm.hovered = hitIds.has(fm.exhibit.id);
        const base = 0.035 + Math.sin(t * 1.4 + fm.exhibit.id * 1.7) * 0.015;
        const tgt  = fm.hovered ? 0.14 + Math.sin(t * 2.8) * 0.05 : base;
        fm.glow.material.opacity += (tgt - fm.glow.material.opacity) * 0.08;
      }
      mount.style.cursor = hitIds.size > 0 ? 'pointer' : 'default';

      /* Labels */
      const rect = mount.getBoundingClientRect();
      for (let i = 0; i < frames.length; i++) {
        const fm  = frames[i];
        const lbl = labelEls[i];
        const wp  = fm.labelWorldPos.clone();
        wp.project(camera);
        const sx = ((wp.x + 1) / 2) * rect.width;
        const sy = ((-wp.y + 1) / 2) * rect.height;
        const inView = wp.z < 1 && sx > 0 && sx < rect.width && sy > 0 && sy < rect.height;
        lbl.style.left    = `${sx}px`;
        lbl.style.top     = `${sy}px`;
        lbl.style.opacity = inView ? (fm.hovered ? '1' : '0.45') : '0';
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('mousemove', onMouseMove2);
      mount.removeEventListener('click', onClick);
      for (const f of frames) {
        if (f.videoEl) { f.videoEl.pause(); f.videoEl.src = ''; }
      }
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(labelContainer))      mount.removeChild(labelContainer);
      renderer.dispose();
    };
  }, [exhibits]);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#0c0906', position: 'relative' }}>

      {/* Back button */}
      <button
        onClick={() => onBackRef.current?.()}
        style={{
          position: 'absolute', top: 28, left: 28, zIndex: 10,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#5a4830', fontSize: '11px', letterSpacing: '0.28em',
          textTransform: 'uppercase', fontFamily: 'Georgia, serif',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.target.style.color = '#c8a870'}
        onMouseLeave={e => e.target.style.color = '#5a4830'}
      >
        ← Workbench
      </button>

      {focusedExhibit && (
        <>
          {/* Full-screen click-to-exit layer (behind placard) */}
          <div
            onClick={() => exitFocusRef.current?.()}
            style={{ position: 'absolute', inset: 0, zIndex: 9, cursor: 'pointer' }}
          />

          {/* Museum placard */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', right: 56, top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 11,
              animation: 'placardIn 0.45s ease forwards',
            }}
          >
            {/* Card */}
            <div
              onClick={() => setDescExpanded(v => !v)}
              style={{
                background: 'linear-gradient(160deg, #f7f0e0 0%, #e8d9bc 100%)',
                border: '1px solid #c8aa70',
                borderRadius: 3,
                padding: '20px 24px 18px',
                width: 216,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.4)',
                userSelect: 'none',
                position: 'relative',
              }}
            >
              <p style={{
                fontSize: 8, letterSpacing: '0.44em', color: '#9a7840',
                textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Georgia, serif',
              }}>
                Gallery
              </p>
              <h3 style={{
                fontSize: 15, fontWeight: 400, color: '#1e1408',
                letterSpacing: '0.06em', fontFamily: 'Georgia, serif', marginBottom: 10,
              }}>
                {focusedExhibit.title}
              </h3>
              <div style={{ width: 28, height: 1, background: '#c8aa70', marginBottom: 12 }} />
              {!descExpanded
                ? <p style={{ fontSize: 9, letterSpacing: '0.18em', color: '#9a7840', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    Touch to read →
                  </p>
                : <p style={{
                    fontSize: 11, color: '#2e2010', lineHeight: 1.78,
                    fontFamily: 'Georgia, serif', letterSpacing: '0.03em',
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    {focusedExhibit.description}
                  </p>
              }
            </div>

            {/* Stand post */}
            <div style={{
              position: 'absolute', left: '50%', bottom: -70,
              transform: 'translateX(-50%)',
              width: 3, height: 70,
              background: 'linear-gradient(to bottom, #9a7a4a, #6a5030)',
            }} />
            {/* Stand base */}
            <div style={{
              position: 'absolute', left: '50%', bottom: -78,
              transform: 'translateX(-50%)',
              width: 54, height: 8,
              background: '#5a4020', borderRadius: '0 0 3px 3px',
            }} />
          </div>

          <p style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            fontSize: 9, letterSpacing: '0.30em', color: '#3a2c18',
            textTransform: 'uppercase', fontFamily: 'Georgia, serif',
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
