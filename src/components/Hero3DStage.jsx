'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Hero3DStage as StageClass } from '../hero-3d-stage.js';

export default function Hero3DStage() {
  const containerRef = useRef(null);
  const stageInstanceRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !stageInstanceRef.current) {
      try {
        stageInstanceRef.current = new StageClass(containerRef.current);
      } catch (e) {
        console.warn('3D Stage canvas init warning:', e);
      }
    }
  }, []);

  const handleExplode = () => {
    if (stageInstanceRef.current) stageInstanceRef.current.toggleExplosion();
  };

  const handleSpin = () => {
    if (stageInstanceRef.current) stageInstanceRef.current.toggleAutoSpin();
  };

  return (
    <div className="hero-3d-stage-wrapper">
      <div className="hero-3d-badge">⚡ REAL-TIME 3D GPU WEBGL INTERACTIVE VAULT</div>
      <div ref={containerRef} className="hero-3d-canvas-container" id="hero3DStageContainer"></div>
      <div className="hero-3d-controls">
        <button type="button" className="btn-3d-ctrl" onClick={handleExplode}>
          💥 EXPLODE 3D COVER &amp; SLAB
        </button>
        <button type="button" className="btn-3d-ctrl" onClick={handleSpin}>
          🔄 360° SPIN
        </button>
      </div>
    </div>
  );
}
