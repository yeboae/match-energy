'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ── Wood grain shader ─────────────────────────── */
const WOOD_VERT = `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const WOOD_FRAG = `
varying vec2 vUv;
float rand(vec2 n){return fract(sin(dot(n,vec2(12.9898,4.1414)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),u=fract(p); u=u*u*(3.0-2.0*u);
  return mix(mix(rand(i),rand(i+vec2(1,0)),u.x),mix(rand(i+vec2(0,1)),rand(i+vec2(1,1)),u.x),u.y);
}
void main(){
  vec2 uv=vUv*vec2(9.0,5.0);
  float g=noise(uv*2.5)*0.28+noise(uv*6.0)*0.07;
  float r=sin(length(uv-vec2(4.5,2.5))*3.2+g*9.0)*0.06;
  vec3 d=vec3(0.088,0.055,0.030),l=vec3(0.175,0.108,0.060);
  gl_FragColor=vec4(mix(d,l,clamp(g+r+0.32,0.0,1.0)),1.0);
}
`;

/* ── Geometry factories ────────────────────────── */
function makeTable() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 4),
    new THREE.ShaderMaterial({ vertexShader: WOOD_VERT, fragmentShader: WOOD_FRAG })
  );
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  g.add(top);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.1, 4),
    new THREE.MeshStandardMaterial({ color: 0x130c06, roughness: 0.92 })
  );
  edge.position.y = -0.05;
  g.add(edge);
  return g;
}

function makeNeedle() {
  const g = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xb8c4cc, metalness: 0.93, roughness: 0.11 });
  const thread = new THREE.MeshStandardMaterial({ color: 0x7a1f4d, roughness: 0.8 });
  const spool = new THREE.Group();
  spool.position.set(0.09, 0, 0.03);
  spool.rotation.set(Math.PI / 2, 0, 0.25);
  spool.add(mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.060, 16), new THREE.MeshStandardMaterial({ color: 0xc9a26b, roughness: 0.55 })));
  for (const y of [-0.037, 0.037]) spool.add(at(mesh(new THREE.CylinderGeometry(0.060, 0.060, 0.009, 16), new THREE.MeshStandardMaterial({ color: 0xb08040, roughness: 0.5 })), 0, y, 0));
  for (const y of [-0.024, -0.008, 0.008, 0.024]) spool.add(at(mesh(new THREE.TorusGeometry(0.047, 0.0072, 6, 20), thread), 0, y, 0));
  g.add(spool);
  const needle = new THREE.Group();
  needle.position.set(-0.065, 0.022, -0.02);
  needle.rotation.set(0, 0.08, Math.PI * 0.065);
  needle.add(at(mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.355, 8), silver), 0, 0.188, 0));
  needle.add(at(mesh(new THREE.ConeGeometry(0.0042, 0.020, 8), new THREE.MeshStandardMaterial({ color: 0xccd8e0, metalness: 0.96, roughness: 0.07 })), 0, 0.005, 0));
  needle.add(at(mesh(new THREE.TorusGeometry(0.0088, 0.0028, 6, 12), silver), 0, 0.360, 0));
  const threadEye = at(mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.055, 4), thread), 0, 0.360, 0);
  threadEye.rotation.x = Math.PI / 2;
  needle.add(threadEye);
  g.add(needle);
  return g;
}

function makeArchTools() {
  const g = new THREE.Group();
  const ruler = new THREE.Group();
  ruler.rotation.y = -0.10;
  ruler.add(mesh(new THREE.BoxGeometry(0.68, 0.007, 0.035), new THREE.MeshStandardMaterial({ color: 0xefe4c8, roughness: 0.44, metalness: 0.03 })));
  const markMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.9 });
  for (let i = 0; i < 13; i++) ruler.add(at(mesh(new THREE.BoxGeometry(0.0011, 0.003, 0.016), markMat), -0.30 + i * 0.05, 0.006, 0));
  ruler.add(at(mesh(new THREE.BoxGeometry(0.68, 0.006, 0.003), new THREE.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.3 })), 0, -0.002, 0.019));
  g.add(ruler);
  const pencil = new THREE.Group();
  pencil.position.set(0.05, 0.016, 0.09);
  pencil.rotation.y = 0.22;
  pencil.add(mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.39, 6), new THREE.MeshStandardMaterial({ color: 0xd2d2d2, roughness: 0.32, metalness: 0.52 })));
  pencil.add(at(mesh(new THREE.CylinderGeometry(0.0086, 0.0086, 0.072, 16), new THREE.MeshStandardMaterial({ color: 0xa8a8a8, roughness: 0.94 })), 0, -0.150, 0));
  pencil.add(at(mesh(new THREE.CylinderGeometry(0.0075, 0.003, 0.026, 8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.42, roughness: 0.28 })), 0, -0.208, 0));
  const lead = at(mesh(new THREE.ConeGeometry(0.0017, 0.011, 5), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.18 })), 0, -0.225, 0);
  lead.rotation.x = Math.PI;
  pencil.add(lead);
  pencil.add(at(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 8), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.62, roughness: 0.3 })), 0, 0.207, 0));
  pencil.add(at(mesh(new THREE.BoxGeometry(0.002, 0.095, 0.004), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.65, roughness: 0.3 })), 0.0092, 0.17, 0));
  g.add(pencil);
  return g;
}

function makeCompass() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.TorusGeometry(0.080, 0.013, 8, 36), new THREE.MeshStandardMaterial({ color: 0xb5882a, metalness: 0.78, roughness: 0.32 })), 0, 0.006, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.010, 32), new THREE.MeshStandardMaterial({ color: 0xc8a038, metalness: 0.62, roughness: 0.38 })), 0, 0, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.003, 32), new THREE.MeshStandardMaterial({ color: 0xf5ecd8, roughness: 0.6 })), 0, 0.006, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0x9bbfcc, transparent: true, opacity: 0.22, roughness: 0, metalness: 0.12 })), 0, 0.010, 0));
  const tickMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    g.add(at(mesh(new THREE.BoxGeometry(0.005, 0.004, 0.011), tickMat), Math.sin(a) * 0.055, 0.008, Math.cos(a) * 0.055));
  }
  const needle = new THREE.Group();
  needle.position.set(0, 0.013, 0);
  const north = at(mesh(new THREE.ConeGeometry(0.0058, 0.050, 4), new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.38 })), 0.028, 0, 0);
  north.rotation.z = -Math.PI / 2;
  needle.add(north);
  const south = at(mesh(new THREE.ConeGeometry(0.0058, 0.050, 4), new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.38 })), -0.028, 0, 0);
  south.rotation.z = Math.PI / 2;
  needle.add(south);
  needle.add(mesh(new THREE.SphereGeometry(0.006, 8, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.82, roughness: 0.2 })));
  g.add(needle);
  g.userData.needle = needle;
  return g;
}

function makeDustMotes() {
  const count = 20;
  const pos = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 4.5;
    pos[i * 3 + 1] = Math.random() * 1.4 + 0.05;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
    speeds[i] = 0.00025 + Math.random() * 0.00015;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe8a0, size: 0.006, transparent: true, opacity: 0.45, sizeAttenuation: true }));
  pts.userData.speeds = speeds;
  return pts;
}

function mesh(geo, mat) { return new THREE.Mesh(geo, mat); }
function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

function makeGlow(radius = 0.24) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.076;
  return m;
}

/* ── Portal zoom targets (world space) ────────── */
const ZOOM_TARGETS = {
  needle:  new THREE.Vector3(-1.185, 0.46,  -0.02),
  arch:    new THREE.Vector3( 0.02,  0.46,   0.09),
  compass: new THREE.Vector3( 1.10,  0.43,  -0.04),
};

/* ── Main component ────────────────────────────── */
export default function WorkbenchScene({ onSelect, onPortal }) {
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, label: '', x: 0, y: 0, gold: false });
  const [hint, setHint] = useState(null); // 'select' | 'enter' | null

  // Keep callbacks stable inside the effect closure
  const onSelectRef = useRef(onSelect);
  const onPortalRef = useRef(onPortal);
  onSelectRef.current = onSelect;
  onPortalRef.current = onPortal;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080503);
    scene.fog = new THREE.Fog(0x080503, 3.5, 9);

    const camera = new THREE.PerspectiveCamera(36, mount.clientWidth / mount.clientHeight, 0.01, 20);
    camera.position.set(0, 1.15, 2.10);
    camera.lookAt(0, 0.1, 0);

    scene.add(new THREE.AmbientLight(0xffd888, 0.30));
    const lamp = new THREE.PointLight(0xffbb66, 2.2, 12);
    lamp.position.set(-0.8, 2.8, 0.6);
    lamp.castShadow = true;
    scene.add(lamp);
    const fill = new THREE.PointLight(0xa8c8ff, 0.38, 10);
    fill.position.set(2.2, 1.4, -0.8);
    scene.add(fill);
    const rim = new THREE.PointLight(0xff9944, 0.18, 8);
    rim.position.set(0, 0.4, -2);
    scene.add(rim);

    scene.add(makeTable());
    const dust = makeDustMotes();
    scene.add(dust);

    const ITEMS = [
      { id: 'needle',  label: 'Craft',   group: makeNeedle(),    px: -1.12, pz:  0,     glowR: 0.22 },
      { id: 'arch',    label: 'Design',  group: makeArchTools(), px:  0.02, pz:  0.04,  glowR: 0.30 },
      { id: 'compass', label: 'Explore', group: makeCompass(),   px:  1.10, pz: -0.04,  glowR: 0.20 },
    ];
    for (const item of ITEMS) {
      item.group.position.set(item.px, 0.08, item.pz);
      item.glow = makeGlow(item.glowR);
      item.group.add(item.glow);
      item.group.traverse(c => { if (c.isMesh) c.userData.itemId = item.id; });
      scene.add(item.group);
    }

    /* Interaction state */
    let hovered = null;
    let selected = null;
    const mouse = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();

    /* Zoom state */
    let zoomActive = false;
    let zoomProgress = 0;
    let zoomItemId = null;
    const zoomStart = new THREE.Vector3();
    const zoomTarget = new THREE.Vector3();

    const onMouseMove = (e) => {
      if (zoomActive) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = () => {
      if (zoomActive || !hovered) return;
      if (hovered === selected) {
        // Second click on selected item → portal zoom
        zoomActive = true;
        zoomProgress = 0;
        zoomItemId = hovered;
        zoomStart.copy(camera.position);
        zoomTarget.copy(ZOOM_TARGETS[hovered]);
        setHint(null);
      } else {
        selected = hovered;
        onSelectRef.current?.(selected);
        setHint('enter');
      }
    };

    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('click', onClick);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    let rafId;
    const clock = new THREE.Clock();
    let elapsed = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      elapsed += dt;
      const t = elapsed;

      /* Portal zoom animation */
      if (zoomActive) {
        zoomProgress = Math.min(zoomProgress + dt * 0.55, 1);
        const ease = 1 - Math.pow(1 - zoomProgress, 3.5);
        camera.position.lerpVectors(zoomStart, zoomTarget, ease);
        camera.fov = 36 - ease * 26;
        camera.updateProjectionMatrix();
        camera.lookAt(zoomTarget);
        renderer.domElement.style.filter = `blur(${ease * 20}px)`;
        if (zoomProgress >= 1) {
          zoomActive = false;
          renderer.domElement.style.filter = '';
          onPortalRef.current?.(zoomItemId);
        }
        renderer.render(scene, camera);
        return;
      }

      /* Raycast hover */
      raycaster.setFromCamera(mouse, camera);
      const meshes = [];
      scene.traverse(c => { if (c.isMesh && c.userData.itemId) meshes.push(c); });
      const hits = raycaster.intersectObjects(meshes);
      const newHover = hits.length > 0 ? hits[0].object.userData.itemId : null;
      if (newHover !== hovered) {
        hovered = newHover;
        mount.style.cursor = hovered ? 'pointer' : 'default';
        if (!hovered && !selected) setHint(null);
        if (hovered && !selected) setHint('select');
        if (!hovered && selected) setHint('enter');
      }

      /* Item animations + tooltip */
      let tooltipData = { visible: false, label: '', x: 0, y: 0, gold: false };
      for (const item of ITEMS) {
        const isHov = hovered === item.id;
        const isSel = selected === item.id;
        const targetY = isHov || isSel ? 0.16 : 0.08;
        item.group.position.y += (targetY - item.group.position.y) * 0.1;
        if (isSel) item.group.rotation.y += 0.45 * dt;
        const targetOpacity = isSel ? 0.38 + Math.sin(t * 3.2) * 0.13 : isHov ? 0.18 : 0;
        item.glow.material.opacity += (targetOpacity - item.glow.material.opacity) * 0.12;
        if (item.id === 'compass' && item.group.userData.needle && !isSel) {
          item.group.userData.needle.rotation.y = Math.sin(t * 0.28) * 0.09;
        }
        if (isHov || isSel) {
          const wp = new THREE.Vector3(item.group.position.x, item.group.position.y + 0.26, item.group.position.z);
          wp.project(camera);
          const rect = mount.getBoundingClientRect();
          tooltipData = {
            visible: true,
            label: isSel ? `${item.label} — click to enter` : item.label,
            x: ((wp.x + 1) / 2) * rect.width + rect.left,
            y: ((-wp.y + 1) / 2) * rect.height + rect.top,
            gold: isSel,
          };
        }
      }
      setTooltip(tooltipData);

      /* Dust */
      const posArr = dust.geometry.attributes.position.array;
      const speeds = dust.userData.speeds;
      for (let i = 0; i < 20; i++) {
        posArr[i * 3 + 1] += speeds[i] + Math.sin(t * 0.2 + i) * 0.00018;
        if (posArr[i * 3 + 1] > 1.5) posArr[i * 3 + 1] = 0.05;
      }
      dust.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('click', onClick);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#080503' }}>
      {tooltip.visible && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y,
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
          color: tooltip.gold ? '#d4af37' : '#e8dcc8',
          fontSize: '11px', letterSpacing: '0.26em', textTransform: 'uppercase',
          fontFamily: 'Georgia, serif', textShadow: '0 0 8px rgba(0,0,0,0.9)',
          transition: 'color 0.2s', whiteSpace: 'nowrap',
        }}>
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
