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

  const allSceneNames = ["constellation", "orbit", "pulsefield", "swarm", "ribbons"];
  const configuredSceneNames = (document.body.dataset.backgrounds || allSceneNames.join(","))
    .split(",")
    .map(value => value.trim())
    .filter(value => allSceneNames.includes(value));
  const sceneNames = configuredSceneNames.length ? configuredSceneNames : allSceneNames;
  const sceneIndexKey = "logos7.background.sceneIndex";
  const scenePathKey = "logos7.background.path";

  const readSession = key => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeSession = (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
    }
  };

  const storedIndex = Number.parseInt(readSession(sceneIndexKey) || "0", 10);
  const previousPath = readSession(scenePathKey);
  let sceneIndex = Number.isFinite(storedIndex) ? storedIndex % sceneNames.length : 0;

  if (previousPath && previousPath !== window.location.pathname) {
    sceneIndex = (sceneIndex + 1) % sceneNames.length;
  }

  let sceneName = sceneNames[sceneIndex];
  root.dataset.scene = sceneName;
  writeSession(sceneIndexKey, String(sceneIndex));
  writeSession(scenePathKey, window.location.pathname);

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
  const motionScale = coarsePointer ? 0.65 : 1.24;
  const pointer = { targetX: 0, targetY: 0, x: 0, y: 0 };
  const state = {
    width: 0,
    height: 0,
    ratio: 1,
    particles: [],
    rings: [],
    swarm: [],
    anchors: [],
    last: 0
  };
  let animationFrame = 0;

  const rgba = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  const mix = (a, b, amount) => a + (b - a) * amount;
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getPointerPixel = () => ({
    x: state.width * (0.5 + pointer.x * 0.5),
    y: state.height * (0.5 + pointer.y * 0.5)
  });

  const createParticles = count => Array.from({ length: count }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    depth: random(0.3, 1),
    size: random(0.7, 2.5),
    speed: random(0.015, 0.055),
    phase: random(0, Math.PI * 2),
    color: palette[index % palette.length]
  }));


  const createRings = count => Array.from({ length: count }, (_, index) => ({
    radius: 0.13 + index * random(0.065, 0.095),
    tilt: random(0.34, 0.72),
    speed: random(0.04, 0.12) * (index % 2 ? -1 : 1),
    phase: random(0, Math.PI * 2),
    width: random(0.55, 1.35),
    color: palette[index % palette.length]
  }));

  const createSwarm = count => Array.from({ length: count }, (_, index) => ({
    orbit: random(0.1, 0.48),
    speed: random(0.25, 1.15),
    phase: random(0, Math.PI * 2),
    drift: random(20, 90),
    size: random(1.1, 3.4),
    depth: random(0.5, 1.15),
    color: palette[index % palette.length]
  }));

  const createAnchors = count => Array.from({ length: count }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    driftX: random(-0.045, 0.045),
    driftY: random(-0.045, 0.045),
    phase: random(0, Math.PI * 2),
    color: palette[index % palette.length]
  }));

  const resize = () => {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(state.width * state.ratio);
    canvas.height = Math.round(state.height * state.ratio);
    context.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
    const density = Math.max(24, Math.min(70, Math.round((state.width * state.height) / 25500)));
    state.particles = createParticles(coarsePointer ? Math.round(density * 0.58) : density);
    state.rings = createRings(coarsePointer ? 6 : 10);
    state.swarm = createSwarm(coarsePointer ? 18 : 30);
    state.anchors = createAnchors(coarsePointer ? 8 : 14);
  };

  const clear = () => {
    context.clearRect(0, 0, state.width, state.height);
    context.globalCompositeOperation = "source-over";
  };

  const drawParticles = (time, connectionDistance = 0, drift = 1, proximityBoost = 0) => {
    const positions = [];
    const cursor = getPointerPixel();

    for (const particle of state.particles) {
      const baseX = particle.x * state.width + pointer.x * particle.depth * 42 * motionScale;
      const baseY = ((particle.y + time * particle.speed * 0.008 * drift) % 1.12 - 0.06) * state.height + pointer.y * particle.depth * 28 * motionScale;
      const dx = baseX - cursor.x;
      const dy = baseY - cursor.y;
      const distance = Math.hypot(dx, dy);
      const proximity = clamp(1 - distance / Math.max(180, Math.min(state.width, state.height) * 0.32), 0, 1);
      const pull = proximityBoost * proximity * proximity;
      const x = baseX + dx * pull * 0.22;
      const y = baseY + dy * pull * 0.16;
      const pulse = 0.55 + Math.sin(time * 0.0012 + particle.phase) * 0.3;
      positions.push({ x, y, particle, proximity });
      context.beginPath();
      context.fillStyle = rgba(particle.color, 0.16 + pulse * 0.28 + proximity * 0.16);
      context.arc(x, y, particle.size * (0.8 + pulse * 0.45 + proximity * 0.7), 0, Math.PI * 2);
      context.fill();
    }

    if (!connectionDistance) {
      return positions;
    }

    context.lineWidth = 0.65;

    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const distance = Math.hypot(dx, dy);

        if (distance >= connectionDistance) {
          continue;
        }

        const intensity = (1 - distance / connectionDistance) * (0.12 + (positions[i].proximity + positions[j].proximity) * 0.08);
        context.beginPath();
        context.strokeStyle = rgba(positions[i].particle.color, intensity);
        context.moveTo(positions[i].x, positions[i].y);
        context.lineTo(positions[j].x, positions[j].y);
        context.stroke();
      }
    }

    return positions;
  };

  const drawConstellation = time => {
    context.globalCompositeOperation = "lighter";
    const positions = drawParticles(time, Math.min(190, state.width * 0.2), 0.36, 0.65);
    const cursor = getPointerPixel();
    const radius = Math.min(state.width, state.height) * 0.18;

    context.lineWidth = 1.2;
    for (const point of positions) {
      const dx = point.x - cursor.x;
      const dy = point.y - cursor.y;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        continue;
      }
      context.beginPath();
      context.strokeStyle = rgba(point.particle.color, (1 - distance / radius) * 0.22);
      context.moveTo(cursor.x, cursor.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }

    const focusX = state.width * (0.5 + pointer.x * 0.08 * motionScale);
    const focusY = state.height * (0.45 + pointer.y * 0.065 * motionScale);
    const glow = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, Math.min(state.width, state.height) * 0.34);
    glow.addColorStop(0, rgba(palette[1], 0.14));
    glow.addColorStop(0.45, rgba(palette[0], 0.05));
    glow.addColorStop(1, rgba(palette[0], 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, state.width, state.height);
  };

  const drawOrbit = time => {
    context.globalCompositeOperation = "lighter";
    const centerX = state.width * 0.52 + pointer.x * 64 * motionScale;
    const centerY = state.height * 0.45 + pointer.y * 44 * motionScale;
    const base = Math.min(state.width, state.height);
    const pulseRadius = base * (0.11 + (Math.abs(pointer.x) + Math.abs(pointer.y)) * 0.035);

    for (const ring of state.rings) {
      context.save();
      context.translate(centerX, centerY);
      context.rotate(time * 0.0001 * ring.speed + ring.phase + pointer.x * 0.1);
      context.scale(1 + Math.abs(pointer.x) * 0.045, ring.tilt + Math.abs(pointer.y) * 0.07);
      context.beginPath();
      context.strokeStyle = rgba(ring.color, 0.11 + Math.abs(pointer.x) * 0.05);
      context.lineWidth = ring.width;
      context.setLineDash([base * 0.08, base * 0.035, base * 0.018, base * 0.05]);
      context.lineDashOffset = -time * 0.008 * ring.speed;
      context.arc(0, 0, base * ring.radius + pulseRadius * 0.05, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    context.setLineDash([]);
    const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, base * 0.28);
    glow.addColorStop(0, rgba(palette[2], 0.15));
    glow.addColorStop(0.28, rgba(palette[1], 0.07));
    glow.addColorStop(1, rgba(palette[0], 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, state.width, state.height);
    drawParticles(time, 0, 0.22, 0.22);
  };

  const drawPulsefield = time => {
    context.globalCompositeOperation = "lighter";
    const cursor = getPointerPixel();
    const spacing = Math.max(44, Math.min(68, Math.min(state.width, state.height) / 11));
    const radius = spacing * 3.1;

    for (let y = spacing * 0.6; y < state.height; y += spacing) {
      for (let x = spacing * 0.6; x < state.width; x += spacing) {
        const dx = x - cursor.x;
        const dy = y - cursor.y;
        const distance = Math.hypot(dx, dy);
        const proximity = clamp(1 - distance / radius, 0, 1);
        const force = proximity * proximity;
        const pointX = x + (dx / Math.max(distance, 1)) * force * 18 + pointer.x * 6;
        const pointY = y + (dy / Math.max(distance, 1)) * force * 18 + pointer.y * 6;
        const color = palette[Math.round((x + y) / spacing) % palette.length];

        if (x + spacing < state.width) {
          const rightDx = x + spacing - cursor.x;
          const rightDy = y - cursor.y;
          const rightDistance = Math.hypot(rightDx, rightDy);
          const rightProximity = clamp(1 - rightDistance / radius, 0, 1);
          const rightForce = rightProximity * rightProximity;
          const rightX = x + spacing + (rightDx / Math.max(rightDistance, 1)) * rightForce * 18 + pointer.x * 6;
          const rightY = y + (rightDy / Math.max(rightDistance, 1)) * rightForce * 18 + pointer.y * 6;
          context.beginPath();
          context.strokeStyle = rgba(color, 0.03 + (force + rightForce) * 0.14);
          context.moveTo(pointX, pointY);
          context.lineTo(rightX, rightY);
          context.stroke();
        }

        if (y + spacing < state.height) {
          const downDx = x - cursor.x;
          const downDy = y + spacing - cursor.y;
          const downDistance = Math.hypot(downDx, downDy);
          const downProximity = clamp(1 - downDistance / radius, 0, 1);
          const downForce = downProximity * downProximity;
          const downX = x + (downDx / Math.max(downDistance, 1)) * downForce * 18 + pointer.x * 6;
          const downY = y + spacing + (downDy / Math.max(downDistance, 1)) * downForce * 18 + pointer.y * 6;
          context.beginPath();
          context.strokeStyle = rgba(color, 0.03 + (force + downForce) * 0.14);
          context.moveTo(pointX, pointY);
          context.lineTo(downX, downY);
          context.stroke();
        }

        context.beginPath();
        context.fillStyle = rgba(color, 0.12 + force * 0.42);
        context.arc(pointX, pointY, 1.4 + force * 4.2, 0, Math.PI * 2);
        context.fill();
      }
    }

    const ripple = (Math.sin(time * 0.004) + 1) * 0.5;
    context.beginPath();
    context.strokeStyle = rgba(palette[1], 0.1);
    context.lineWidth = 1.2;
    context.arc(cursor.x, cursor.y, radius * (0.25 + ripple * 0.4), 0, Math.PI * 2);
    context.stroke();
  };

  const drawSwarm = time => {
    context.globalCompositeOperation = "lighter";
    const cursor = getPointerPixel();
    const positions = [];

    for (const mote of state.swarm) {
      const wobble = Math.sin(time * 0.001 * mote.speed + mote.phase);
      const wobbleY = Math.cos(time * 0.0013 * mote.speed + mote.phase);
      const baseX = state.width * 0.5 + Math.cos(time * 0.00065 * mote.speed + mote.phase) * state.width * mote.orbit;
      const baseY = state.height * 0.5 + Math.sin(time * 0.0008 * mote.speed + mote.phase) * state.height * mote.orbit * 0.72;
      const x = baseX + wobble * mote.drift + pointer.x * mote.depth * 44 * motionScale;
      const y = baseY + wobbleY * mote.drift + pointer.y * mote.depth * 36 * motionScale;
      const dx = cursor.x - x;
      const dy = cursor.y - y;
      const distance = Math.hypot(dx, dy);
      const proximity = clamp(1 - distance / Math.max(150, Math.min(state.width, state.height) * 0.28), 0, 1);
      const attract = proximity * proximity * 0.42;
      const fx = x + dx * attract;
      const fy = y + dy * attract;
      positions.push({ x: fx, y: fy, color: mote.color, proximity });
      context.beginPath();
      context.fillStyle = rgba(mote.color, 0.16 + proximity * 0.34);
      context.arc(fx, fy, mote.size * (1 + proximity * 0.9), 0, Math.PI * 2);
      context.fill();
    }

    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance > 110) {
          continue;
        }
        const alpha = (1 - distance / 110) * 0.08 * (1 + positions[i].proximity + positions[j].proximity);
        context.beginPath();
        context.strokeStyle = rgba(positions[i].color, alpha);
        context.moveTo(positions[i].x, positions[i].y);
        context.lineTo(positions[j].x, positions[j].y);
        context.stroke();
      }
    }

    context.beginPath();
    context.fillStyle = rgba(palette[2], 0.1);
    context.arc(cursor.x, cursor.y, 16 + Math.abs(pointer.x + pointer.y) * 14, 0, Math.PI * 2);
    context.fill();
  };

  const drawRibbons = time => {
    context.globalCompositeOperation = "lighter";
    const cursor = getPointerPixel();

    state.anchors.forEach((anchor, index) => {
      const originX = (anchor.x + Math.sin(time * 0.00018 + anchor.phase) * anchor.driftX) * state.width;
      const originY = (anchor.y + Math.cos(time * 0.00015 + anchor.phase) * anchor.driftY) * state.height;
      const dx = cursor.x - originX;
      const dy = cursor.y - originY;
      const distance = Math.hypot(dx, dy);
      const proximity = clamp(1 - distance / Math.max(200, Math.min(state.width, state.height) * 0.34), 0, 1);
      const bend = 0.26 + proximity * 0.45;
      const cp1X = originX + state.width * 0.16 + pointer.x * (42 + index * 2) * motionScale;
      const cp1Y = originY + Math.sin(time * 0.0009 + anchor.phase) * 60 + dy * bend;
      const cp2X = originX + state.width * 0.34 + dx * bend;
      const cp2Y = originY + Math.cos(time * 0.0007 + anchor.phase * 0.7) * 90 - dy * bend * 0.2;
      const endX = clamp(originX + state.width * 0.42 + dx * bend * 0.6, -80, state.width + 80);
      const endY = clamp(originY + dy * bend * 0.55, -80, state.height + 80);
      const gradient = context.createLinearGradient(originX, originY, endX, endY);
      gradient.addColorStop(0, rgba(anchor.color, 0));
      gradient.addColorStop(0.28, rgba(anchor.color, 0.12));
      gradient.addColorStop(0.56, rgba(anchor.color, 0.26 + proximity * 0.12));
      gradient.addColorStop(1, rgba(anchor.color, 0));
      context.beginPath();
      context.strokeStyle = gradient;
      context.lineWidth = 1 + proximity * 1.8;
      context.moveTo(originX, originY);
      context.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      context.stroke();
    });

    drawParticles(time, 0, 0.16, 0.55);
  };

  const scenes = {
    constellation: drawConstellation,
    orbit: drawOrbit,
    pulsefield: drawPulsefield,
    swarm: drawSwarm,
    ribbons: drawRibbons
  };

  const selectScene = index => {
    sceneIndex = (index + sceneNames.length) % sceneNames.length;
    sceneName = sceneNames[sceneIndex];
    root.dataset.scene = sceneName;
    writeSession(sceneIndexKey, String(sceneIndex));
    clear();

    if (reducedMotion) {
      render(performance.now());
    }
  };

  const selectNextScene = () => {
    selectScene(sceneIndex + 1);
  };

  document.querySelectorAll(".hero-symbol img, .page-hero-symbol img").forEach(symbol => {
    symbol.classList.add("background-cycle-trigger");
    symbol.setAttribute("role", "button");
    symbol.setAttribute("tabindex", "0");
    symbol.setAttribute("aria-label", "Next background animation");
    symbol.setAttribute("title", "Next background animation");
    symbol.closest("[aria-hidden]")?.removeAttribute("aria-hidden");
    symbol.addEventListener("click", selectNextScene);
    symbol.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      selectNextScene();
    });
  });

  const scheduleRender = () => {
    if (!reducedMotion && document.visibilityState === "visible" && !animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const render = time => {
    animationFrame = 0;
    const elapsed = Math.min(34, time - state.last || 16.7);
    state.last = time;
    const smoothing = 1 - Math.pow(0.945, elapsed / 16.7);
    pointer.x = mix(pointer.x, pointer.targetX, smoothing);
    pointer.y = mix(pointer.y, pointer.targetY, smoothing);
    root.style.setProperty("--background-x", `${pointer.x * 44 * motionScale}px`);
    root.style.setProperty("--background-y", `${pointer.y * 32 * motionScale}px`);
    root.style.setProperty("--background-x-reverse", `${pointer.x * -24 * motionScale}px`);
    root.style.setProperty("--background-y-reverse", `${pointer.y * -17 * motionScale}px`);
    clear();
    (scenes[sceneName] || drawConstellation)(time);

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
