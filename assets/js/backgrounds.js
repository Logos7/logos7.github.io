(() => {
  const canvas = document.createElement("canvas");
  const shade = document.createElement("div");
  const root = document.createElement("div");
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    return;
  }

  root.className = "ambient-background";
  root.setAttribute("aria-hidden", "true");
  shade.className = "ambient-background-shade";
  root.append(canvas, shade);
  document.body.prepend(root);

  const sceneNames = (document.body.dataset.backgrounds || "nebula,constellation,orbit")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const randomIndex = length => {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] % length;
    }

    return Math.floor(Math.random() * length);
  };

  const sceneName = sceneNames[randomIndex(sceneNames.length)] || "nebula";
  root.dataset.scene = sceneName;

  const palettes = {
    home: [[126, 224, 175], [163, 145, 255], [240, 198, 111]],
    projects: [[127, 216, 255], [163, 145, 255], [240, 198, 111]],
    yantra: [[126, 224, 175], [127, 216, 255], [240, 198, 111]],
    adi: [[127, 216, 255], [163, 145, 255], [126, 224, 175]],
    pieceborne: [[240, 198, 111], [196, 104, 70], [163, 145, 255]]
  };

  const paletteName = document.body.dataset.backgroundPalette || "home";
  const palette = palettes[paletteName] || palettes.home;
  root.style.setProperty("--background-primary", palette[0].join(", "));
  root.style.setProperty("--background-secondary", palette[1].join(", "));
  root.style.setProperty("--background-accent", palette[2].join(", "));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const motionScale = coarsePointer ? .5 : 1;
  const pointer = { targetX: 0, targetY: 0, x: 0, y: 0 };
  const state = { width: 0, height: 0, ratio: 1, particles: [], strands: [], rings: [], last: 0 };
  let animationFrame = 0;

  const rgba = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  const mix = (a, b, amount) => a + (b - a) * amount;
  const random = (min, max) => min + Math.random() * (max - min);

  const createParticles = count => Array.from({ length: count }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    depth: random(.3, 1),
    size: random(.7, 2.4),
    speed: random(.015, .055),
    phase: random(0, Math.PI * 2),
    color: palette[index % palette.length]
  }));

  const createStrands = count => Array.from({ length: count }, (_, index) => ({
    offset: random(-.22, 1.2),
    amplitude: random(.035, .13),
    speed: random(.08, .2),
    phase: random(0, Math.PI * 2),
    width: random(.7, 1.9),
    color: palette[index % palette.length]
  }));

  const createRings = count => Array.from({ length: count }, (_, index) => ({
    radius: .13 + index * random(.065, .095),
    tilt: random(.34, .72),
    speed: random(.04, .12) * (index % 2 ? -1 : 1),
    phase: random(0, Math.PI * 2),
    width: random(.55, 1.35),
    color: palette[index % palette.length]
  }));

  const resize = () => {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(state.width * state.ratio);
    canvas.height = Math.round(state.height * state.ratio);
    context.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
    const density = Math.max(20, Math.min(58, Math.round((state.width * state.height) / 28000)));
    state.particles = createParticles(coarsePointer ? Math.round(density * .65) : density);
    state.strands = createStrands(coarsePointer ? 5 : 8);
    state.rings = createRings(coarsePointer ? 5 : 8);
  };

  const clear = () => {
    context.clearRect(0, 0, state.width, state.height);
    context.globalCompositeOperation = "source-over";
  };

  const drawParticles = (time, connectionDistance = 0, drift = 1) => {
    const positions = [];

    for (const particle of state.particles) {
      const x = particle.x * state.width + pointer.x * particle.depth * 32 * motionScale;
      const y = ((particle.y + time * particle.speed * .008 * drift) % 1.12 - .06) * state.height + pointer.y * particle.depth * 22 * motionScale;
      const pulse = .55 + Math.sin(time * .0012 + particle.phase) * .3;
      positions.push({ x, y, particle });
      context.beginPath();
      context.fillStyle = rgba(particle.color, .18 + pulse * .32);
      context.arc(x, y, particle.size * (.8 + pulse * .45), 0, Math.PI * 2);
      context.fill();
    }

    if (!connectionDistance) {
      return;
    }

    context.lineWidth = .65;

    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const distance = Math.hypot(dx, dy);

        if (distance >= connectionDistance) {
          continue;
        }

        context.beginPath();
        context.strokeStyle = rgba(positions[i].particle.color, (1 - distance / connectionDistance) * .14);
        context.moveTo(positions[i].x, positions[i].y);
        context.lineTo(positions[j].x, positions[j].y);
        context.stroke();
      }
    }
  };

  const drawNebula = time => {
    context.globalCompositeOperation = "lighter";

    for (let index = 0; index < state.strands.length; index += 1) {
      const strand = state.strands[index];
      const baseY = strand.offset * state.height;
      const parallaxX = pointer.x * (18 + index * 3) * motionScale;
      const parallaxY = pointer.y * (10 + index * 2) * motionScale;
      const gradient = context.createLinearGradient(0, baseY, state.width, baseY);
      gradient.addColorStop(0, rgba(strand.color, 0));
      gradient.addColorStop(.22, rgba(strand.color, .12));
      gradient.addColorStop(.52, rgba(strand.color, .28));
      gradient.addColorStop(.82, rgba(strand.color, .1));
      gradient.addColorStop(1, rgba(strand.color, 0));
      context.beginPath();
      context.strokeStyle = gradient;
      context.lineWidth = strand.width;

      for (let x = -80; x <= state.width + 80; x += 18) {
        const normalized = x / state.width;
        const wave = Math.sin(normalized * Math.PI * 2.1 + time * .00018 * strand.speed + strand.phase);
        const secondWave = Math.sin(normalized * Math.PI * 4.4 - time * .00011 + strand.phase * .7);
        const y = baseY + (wave + secondWave * .38) * state.height * strand.amplitude + parallaxY;
        const pointX = x + parallaxX;

        if (x === -80) {
          context.moveTo(pointX, y);
        } else {
          context.lineTo(pointX, y);
        }
      }

      context.stroke();
    }

    drawParticles(time, 0, .52);
  };

  const drawConstellation = time => {
    context.globalCompositeOperation = "lighter";
    drawParticles(time, Math.min(170, state.width * .18), .36);

    const focusX = state.width * (.5 + pointer.x * .055 * motionScale);
    const focusY = state.height * (.45 + pointer.y * .045 * motionScale);
    const glow = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, Math.min(state.width, state.height) * .34);
    glow.addColorStop(0, rgba(palette[1], .12));
    glow.addColorStop(.45, rgba(palette[0], .045));
    glow.addColorStop(1, rgba(palette[0], 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, state.width, state.height);
  };

  const drawOrbit = time => {
    context.globalCompositeOperation = "lighter";
    const centerX = state.width * .52 + pointer.x * 46 * motionScale;
    const centerY = state.height * .45 + pointer.y * 32 * motionScale;
    const base = Math.min(state.width, state.height);

    for (const ring of state.rings) {
      context.save();
      context.translate(centerX, centerY);
      context.rotate(time * .0001 * ring.speed + ring.phase);
      context.scale(1, ring.tilt);
      context.beginPath();
      context.strokeStyle = rgba(ring.color, .11);
      context.lineWidth = ring.width;
      context.setLineDash([base * .08, base * .035, base * .018, base * .05]);
      context.lineDashOffset = -time * .008 * ring.speed;
      context.arc(0, 0, base * ring.radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    context.setLineDash([]);
    const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, base * .26);
    glow.addColorStop(0, rgba(palette[2], .13));
    glow.addColorStop(.28, rgba(palette[1], .06));
    glow.addColorStop(1, rgba(palette[0], 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, state.width, state.height);
    drawParticles(time, 0, .22);
  };

  const drawLattice = time => {
    context.globalCompositeOperation = "lighter";
    const spacing = Math.max(70, Math.min(126, state.width / 10));
    const offsetX = (time * .004 + pointer.x * 24 * motionScale) % spacing;
    const offsetY = (time * .0025 + pointer.y * 18 * motionScale) % spacing;
    context.lineWidth = .65;

    for (let x = -spacing; x < state.width + spacing; x += spacing) {
      const gradient = context.createLinearGradient(0, 0, 0, state.height);
      gradient.addColorStop(0, rgba(palette[0], 0));
      gradient.addColorStop(.35, rgba(palette[0], .105));
      gradient.addColorStop(.68, rgba(palette[1], .075));
      gradient.addColorStop(1, rgba(palette[1], 0));
      context.beginPath();
      context.strokeStyle = gradient;
      context.moveTo(x + offsetX, -spacing);
      context.lineTo(x - state.height * .28 + offsetX, state.height + spacing);
      context.stroke();
    }

    for (let y = -spacing; y < state.height + spacing; y += spacing) {
      context.beginPath();
      context.strokeStyle = rgba(palette[2], .055);
      context.moveTo(-spacing, y + offsetY);
      context.lineTo(state.width + spacing, y + state.width * .08 + offsetY);
      context.stroke();
    }

    drawParticles(time, 112, .18);
  };

  const drawEmbers = time => {
    context.globalCompositeOperation = "lighter";

    for (const particle of state.particles) {
      const rise = (particle.y - time * particle.speed * .000018 + 2) % 1;
      const x = particle.x * state.width + Math.sin(time * .00045 + particle.phase) * 24 + pointer.x * particle.depth * 18 * motionScale;
      const y = rise * state.height + pointer.y * particle.depth * 12 * motionScale;
      const alpha = .12 + particle.depth * .34;
      context.beginPath();
      context.fillStyle = rgba(particle.color, alpha);
      context.arc(x, y, particle.size * (1 + particle.depth * .5), 0, Math.PI * 2);
      context.fill();
    }

    const glowX = state.width * .5 + pointer.x * 38 * motionScale;
    const glowY = state.height * .94 + pointer.y * 20 * motionScale;
    const glow = context.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.min(state.width, state.height) * .62);
    glow.addColorStop(0, rgba(palette[0], .2));
    glow.addColorStop(.32, rgba(palette[1], .075));
    glow.addColorStop(1, rgba(palette[1], 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, state.width, state.height);
  };

  const scenes = {
    nebula: drawNebula,
    constellation: drawConstellation,
    orbit: drawOrbit,
    lattice: drawLattice,
    embers: drawEmbers
  };

  const scheduleRender = () => {
    if (!reducedMotion && document.visibilityState === "visible" && !animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const render = time => {
    animationFrame = 0;
    const elapsed = Math.min(34, time - state.last || 16.7);
    state.last = time;
    const smoothing = 1 - Math.pow(.955, elapsed / 16.7);
    pointer.x = mix(pointer.x, pointer.targetX, smoothing);
    pointer.y = mix(pointer.y, pointer.targetY, smoothing);
    root.style.setProperty("--background-x", `${pointer.x * 34 * motionScale}px`);
    root.style.setProperty("--background-y", `${pointer.y * 24 * motionScale}px`);
    root.style.setProperty("--background-x-reverse", `${pointer.x * -18 * motionScale}px`);
    root.style.setProperty("--background-y-reverse", `${pointer.y * -13 * motionScale}px`);
    clear();
    (scenes[sceneName] || drawNebula)(time);

    scheduleRender();
  };

  window.addEventListener("pointermove", event => {
    pointer.targetX = event.clientX / Math.max(state.width, 1) * 2 - 1;
    pointer.targetY = event.clientY / Math.max(state.height, 1) * 2 - 1;
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  });

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      return;
    }

    state.last = performance.now();
    scheduleRender();
  });
  resize();
  render(0);
})();
