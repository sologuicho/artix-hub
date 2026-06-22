import { useRef, useEffect } from 'react';

const PARTICLE_COUNT = 120;
const CONNECTION_DIST = 150;
const REPULSION_DIST = 180;
const REPULSION_FORCE = 0.14;
const SPEED = 0.35;
const PARTICLE_RADIUS = 2.6;

// Dark accent: #E8572A → rgb(232, 87, 42)
// Light accent: #C4451A → rgb(196, 69, 26)
const COLOR_DARK  = '232, 87, 42';
const COLOR_LIGHT = '196, 69, 26';

function createParticle(w, h) {
  const angle = Math.random() * Math.PI * 2;
  const speed = (Math.random() * 0.5 + 0.15) * SPEED;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    // base opacity stored per particle; multiplied by theme factor at draw time
    opacity: Math.random() * 0.2 + 0.7,
  };
}

export default function ParticleCanvas({ isDark }) {
  const canvasRef  = useRef(null);
  const isDarkRef  = useRef(isDark);
  const stateRef   = useRef({ particles: [], mouse: { x: -9999, y: -9999 }, animId: null });

  // Keep isDarkRef in sync without restarting the animation loop
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // Single long-lived animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;

    function resize() {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width  = width;
      canvas.height = height;
      state.particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(width, height)
      );
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
    }
    function onMouseLeave() {
      state.mouse.x = -9999;
      state.mouse.y = -9999;
    }
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Read theme on every frame — instant response to toggle
      const dark       = isDarkRef.current;
      const color      = dark ? COLOR_DARK : COLOR_LIGHT;
      const maxLineAlpha = dark ? 0.35 : 0.25;
      // Light mode: boost base opacity slightly for contrast on light bg
      const opacityMul = dark ? 1 : 1.1;

      const { particles, mouse } = state;

      for (const p of particles) {
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPULSION_DIST && dist > 0) {
          const force = (REPULSION_DIST - dist) / REPULSION_DIST;
          p.vx += (dx / dist) * force * REPULSION_FORCE;
          p.vy += (dy / dist) * force * REPULSION_FORCE;
        }

        const speed    = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpeed = SPEED * 3.5;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        p.vx += (Math.random() - 0.5) * 0.008;
        p.vy += (Math.random() - 0.5) * 0.008;
        p.vx *= 0.995;
        p.vy *= 0.995;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= PARTICLE_RADIUS)     { p.x = PARTICLE_RADIUS;     p.vx =  Math.abs(p.vx); }
        if (p.x >= w - PARTICLE_RADIUS) { p.x = w - PARTICLE_RADIUS; p.vx = -Math.abs(p.vx); }
        if (p.y <= PARTICLE_RADIUS)     { p.y = PARTICLE_RADIUS;     p.vy =  Math.abs(p.vy); }
        if (p.y >= h - PARTICLE_RADIUS) { p.y = h - PARTICLE_RADIUS; p.vy = -Math.abs(p.vy); }
      }

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DIST) {
            const alpha = (1 - d / CONNECTION_DIST) * maxLineAlpha;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.lineWidth   = 1;
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        const op = Math.min(1, p.opacity * opacityMul);
        ctx.beginPath();
        ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${op})`;
        ctx.fill();
      }

      state.animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(state.animId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []); // loop never reinicia — isDark se lee por ref

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width:  '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
      }}
    />
  );
}
