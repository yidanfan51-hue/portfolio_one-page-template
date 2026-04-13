(() => {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  // Respect reduced motion
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const hero = canvas.closest('.hero-landing') || document.body;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Simple capability-based scaling
  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let w = 0, h = 0;
  let rafId = 0;
  let running = true;

  const pointer = {
    x: 0, y: 0,
    active: false
  };

  function resize() {
    const rect = hero.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  // Particle system
  let particles = [];
  function initParticles() {
    // Density tuned for performance: fewer on mobile
    const base = isCoarsePointer ? 32 : 64;
    const areaFactor = Math.min(1.25, Math.max(0.75, (w * h) / (1200 * 800)));
    const count = Math.max(24, Math.floor(base * areaFactor));

    particles = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      r: rand(1.0, 2.2)
    }));
  }

  function step() {
    if (!running) return;

    ctx.clearRect(0, 0, w, h);

    // Visual params
    const linkDist = isCoarsePointer ? 110 : 140;
    const linkDist2 = linkDist * linkDist;

    // Update particles
    for (const p of particles) {
      // Gentle drift
      p.x += p.vx;
      p.y += p.vy;

      // Bounds
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > w) { p.x = w; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > h) { p.y = h; p.vy *= -1; }

      // Pointer interaction (skip on coarse pointer for stability)
      if (pointer.active && !isCoarsePointer) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx*dx + dy*dy;
        const influence = 180;
        if (d2 < influence * influence) {
          const d = Math.sqrt(d2) || 1;
          const force = (influence - d) / influence; // 0..1
          // Repel slightly
          p.vx += (dx / d) * force * 0.02;
          p.vy += (dy / d) * force * 0.02;
        }
      }

      // Damp velocity (keeps it calm / emotional)
      p.vx *= 0.985;
      p.vy *= 0.985;

      // Limit speed
      p.vx = Math.max(-0.8, Math.min(0.8, p.vx));
      p.vy = Math.max(-0.8, Math.min(0.8, p.vy));
    }

    // Draw links
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < linkDist2) {
          const alpha = 0.18 * (1 - d2 / linkDist2);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (const p of particles) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = window.requestAnimationFrame(step);
  }

  // Pointer events attached to hero (canvas ignores pointer)
  function onMove(ev) {
    const rect = hero.getBoundingClientRect();
    pointer.x = ev.clientX - rect.left;
    pointer.y = ev.clientY - rect.top;
    pointer.active = true;
  }
  function onLeave() { pointer.active = false; }

  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerdown', onMove, { passive: true });
  hero.addEventListener('pointerleave', onLeave);

  // Pause when page hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(step);
      }
    }
  });

  // Resize handling
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      initParticles();
    }, 120);
  });

  // Boot
  resize();
  initParticles();
  rafId = requestAnimationFrame(step);
})();
