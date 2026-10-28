'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const WorkbenchScene = dynamic(() => import('../components/WorkbenchScene'), { ssr: false });
const MuseumHall     = dynamic(() => import('../components/MuseumHall'),     { ssr: false });
const ArchHall       = dynamic(() => import('../components/ArchHall'),       { ssr: false });

/* ─────────────────────────────────────────────────
   Gallery data — swap imageUrl entries in each
   array to update what appears on the museum walls.
───────────────────────────────────────────────── */
const GALLERIES = {
  needle: [
    { id: 1, title: 'Look 01',           description: 'Hand-spun wool on reclaimed loom',        imageUrl: 'https://placehold.co/600x400/3d2b1f/c9a26b?text=Look+01' },
    { id: 2, title: 'Look 02',           description: 'Natural dye experiments, 2024',            imageUrl: 'https://placehold.co/600x400/1f2b3d/6ba2c9?text=Look+02' },
    { id: 3, title: 'Look 03',           description: 'Visible mending on inherited linen',       imageUrl: 'https://placehold.co/600x400/2b1f3d/c96ba2?text=Look+03' },
    { id: 4, title: 'Look 04',           description: 'Structure studies in cotton thread',       imageUrl: 'https://placehold.co/600x400/3d2b1f/d4af37?text=Look+04' },
    { id: 5, title: 'Spring/Summer 2024', description: 'Pattern cutting on bias grain',           videoUrl: '/videos/Floray_Runway.mp4' },
    { id: 6, title: 'BSA Interview',     description: 'Stitch gauge archive — twelve samples',   videoUrl: '/videos/Oli_Interview.mp4' },
  ],
  arch: [
    { id: 1, title: 'Cafe Render',         description: '', imageUrl: '/images/cafe-render.png' },
    { id: 2, title: 'Deliverable Render',  description: '', imageUrl: '/images/deliverable-render-1.png' },
    { id: 3, title: 'DigCon Black Render', description: '', imageUrl: '/images/digcon-black-render-1.png' },
    { id: 4, title: 'DigCon Render',       description: '', imageUrl: '/images/digcon-render.png' },
    { id: 5, title: 'Imaeda Render',       description: '', imageUrl: '/images/render-1-imaeda.png' },
    { id: 6, title: 'Box 2 Program',       description: '', imageUrl: '/images/box-2-program.png' },
  ],
  compass: [
    { id: 1, title: 'Route 47',         description: 'Traverse log — coastal path, March',       imageUrl: 'https://placehold.co/600x400/0f1a24/6a9ab8?text=Route+47' },
    { id: 2, title: 'Bearing Study',    description: 'Magnetic declination field notes',         imageUrl: 'https://placehold.co/600x400/1a240f/7ab86a?text=Bearing+Study' },
    { id: 3, title: 'Threshold',        description: 'Crossing points, documented series',       imageUrl: 'https://placehold.co/600x400/241a0f/b88a6a?text=Threshold' },
    { id: 4, title: 'Dead Reckoning',   description: 'Navigation without instruments',           imageUrl: 'https://placehold.co/600x400/0f1524/6a78b8?text=Dead+Reckoning' },
    { id: 5, title: 'Landmark No. 3',   description: 'Fixed reference survey, autumn',           imageUrl: 'https://placehold.co/600x400/1f1a10/c8a850?text=Landmark+No.+3' },
    { id: 6, title: 'True North',       description: 'Polar alignment experiments',              imageUrl: 'https://placehold.co/600x400/0e0f18/8890d8?text=True+North' },
  ],
};

const CATEGORY_NAMES = { needle: 'Craft', arch: 'Design', compass: 'Explore' };

/* ── Fade overlay ──────────────────────────────── */
function FadeOverlay({ visible }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000', zIndex: 20,
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.55s ease',
    }} />
  );
}

export default function WorkbenchPage() {
  // phase: 'workbench' | 'fading-out' | 'museum' | 'fading-in'
  const [phase, setPhase]     = useState('workbench');
  const [fading, setFading]   = useState(false);       // black overlay visible?
  const [selected, setSelected] = useState(null);
  const [galleryId, setGalleryId] = useState(null);

  const handleSelect = useCallback((id) => setSelected(id), []);

  const handlePortal = useCallback((itemId) => {
    setGalleryId(itemId);
    setFading(true);                       // fade to black
    setTimeout(() => {
      setPhase('museum');                  // swap scenes while black
      setTimeout(() => setFading(false), 80); // fade back in
    }, 580);
  }, []);

  const handleBack = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setPhase('workbench');
      setSelected(null);
      setGalleryId(null);
      setTimeout(() => setFading(false), 80);
    }, 580);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#080503', position: 'relative' }}>

      {/* Scenes */}
      {phase === 'workbench' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <WorkbenchScene onSelect={handleSelect} onPortal={handlePortal} />
        </div>
      )}
      {phase === 'museum' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {galleryId === 'arch'
            ? <ArchHall   exhibits={GALLERIES[galleryId] ?? []} onBack={handleBack} />
            : <MuseumHall exhibits={GALLERIES[galleryId] ?? []} onBack={handleBack} />
          }
        </div>
      )}

      {/* Fade overlay */}
      <FadeOverlay visible={fading} />

      {/* Workbench UI overlay */}
      {phase === 'workbench' && (
        <>
          {/* Title */}
          <div style={{
            position: 'absolute', top: 32, left: 32, pointerEvents: 'none', userSelect: 'none', zIndex: 5,
          }}>
            <p style={{ fontSize: 10, letterSpacing: '0.38em', color: '#5a4830', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Georgia, serif' }}>
              The Annex
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 300, color: '#e8d8b8', letterSpacing: '0.07em', fontFamily: 'Georgia, serif' }}>
              Workbench
            </h1>
          </div>

          {/* Bottom hint */}
          {!selected && (
            <p style={{
              position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, letterSpacing: '0.30em', color: '#3a2c1a', textTransform: 'uppercase',
              pointerEvents: 'none', userSelect: 'none', zIndex: 5, fontFamily: 'Georgia, serif',
              animation: 'pulse 3s ease-in-out infinite',
            }}>
              Select an object
            </p>
          )}
          {selected && (
            <p style={{
              position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, letterSpacing: '0.30em', color: '#7a5820', textTransform: 'uppercase',
              pointerEvents: 'none', userSelect: 'none', zIndex: 5, fontFamily: 'Georgia, serif',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              Click again to enter the {CATEGORY_NAMES[selected]} gallery
            </p>
          )}
        </>
      )}

      {/* Museum UI: category banner */}
      {phase === 'museum' && galleryId && (
        <div style={{
          position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'none', userSelect: 'none', zIndex: 5, textAlign: 'center',
        }}>
          <p style={{ fontSize: 10, letterSpacing: '0.38em', color: '#4a3820', textTransform: 'uppercase', fontFamily: 'Georgia, serif', marginBottom: 2 }}>
            Gallery
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#c8a870', letterSpacing: '0.12em', fontFamily: 'Georgia, serif' }}>
            {CATEGORY_NAMES[galleryId]}
          </h2>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.8} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
