/**
 * Dimad night-sky scene: starfield, diagonal gold globe, city perspective grid.
 */

(function () {
  "use strict";

  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationStarted = false;
  let frameTime = 0;
  let spinAngle = 0;

  const sceneState = {
    starMode: "dense", // Starfield: Deep Sky
    cityGlow: "vivid", // City Grid: Luminous
    spinMultiplier: 1.0, // Diagonal Spin: 1x
  };

  const GOLD_PALETTE = [
    { r: 245, g: 158, b: 11 },
    { r: 251, g: 191, b: 36 },
    { r: 253, g: 230, b: 138 },
    { r: 217, g: 119, b: 6 },
  ];

  const AXIS_ROLL_RAD = -0.61;
  const AXIS_PITCH_RAD = 0.28;

  let stars = [];
  let globePoints = [];
  let cityIntersections = [];

  function generateStars() {
    stars = [];
    const w = width || window.innerWidth || 1440;
    const h = height || window.innerHeight || 900;
    const countMap = { minimal: 160, crisp: 280, dense: 520 };
    const total = countMap[sceneState.starMode] || 280;

    for (let i = 0; i < total; i++) {
      const ySpread = Math.pow(Math.random(), 0.72);
      stars.push({
        x: Math.random() * w,
        y: ySpread * (h * 0.72),
        radius: Math.random() < 0.18 ? 1.45 : 0.75 + Math.random() * 0.55,
        baseAlpha: 0.35 + Math.random() * 0.65,
        twinkleSpeed: 0.012 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        coolBlueTint: Math.random() < 0.35,
      });
    }
  }

  function renderStarfield(t) {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const twinkle = 0.65 + 0.35 * Math.sin(t * s.twinkleSpeed + s.phase);
      const alpha = Math.min(1, s.baseAlpha * twinkle);
      ctx.fillStyle = s.coolBlueTint
        ? `rgba(219, 234, 254, ${alpha.toFixed(3)})`
        : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function generateGlobePoints() {
    globePoints = [];
    const totalSamples = 2600;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < totalSamples; i++) {
      const y = 1 - (i / (totalSamples - 1)) * 2;
      const ringRadius = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      const latBand = Math.abs(Math.sin(y * 12.0)) > 0.72;
      const continentWave =
        Math.sin(theta * 2.4 + 0.7) * Math.cos(y * 3.4) +
        Math.cos(theta * 4.2 - y * 2.3) * 0.4;
      const isLand = continentWave > -0.15;

      if (!isLand && !latBand && i % 3 !== 0) continue;

      globePoints.push({
        x: Math.cos(theta) * ringRadius,
        y,
        z: Math.sin(theta) * ringRadius,
        color: isLand ? GOLD_PALETTE[i % 3] : GOLD_PALETTE[3],
        size: isLand ? 1.55 + Math.random() * 1.15 : 0.95 + Math.random() * 0.55,
        isHighlight: isLand && i % 7 === 0,
      });
    }
  }

  function renderDiagonalGlobe() {
    const isMobile = width < 768;
    const radius = isMobile
      ? Math.min(width, height) * 0.42
      : Math.min(Math.max(width * 0.23, 290), 360);
    const cx = isMobile ? width * 0.8 : width * 0.81;
    const cy = isMobile ? height * 0.18 : height * 0.21;

    const outerHalo = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * 1.45);
    outerHalo.addColorStop(0, "rgba(245, 158, 11, 0.16)");
    outerHalo.addColorStop(0.55, "rgba(245, 158, 11, 0.05)");
    outerHalo.addColorStop(1, "rgba(2, 4, 10, 0)");
    ctx.fillStyle = outerHalo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(251, 191, 36, 0.14)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    const cosSpin = Math.cos(spinAngle);
    const sinSpin = Math.sin(spinAngle);
    const cosPitch = Math.cos(AXIS_PITCH_RAD);
    const sinPitch = Math.sin(AXIS_PITCH_RAD);
    const cosRoll = Math.cos(AXIS_ROLL_RAD);
    const sinRoll = Math.sin(AXIS_ROLL_RAD);

    const projected = new Array(globePoints.length);
    for (let i = 0; i < globePoints.length; i++) {
      const p = globePoints[i];
      const x1 = p.x * cosSpin - p.z * sinSpin;
      const z1 = p.z * cosSpin + p.x * sinSpin;
      const y1 = p.y;
      const y2 = y1 * cosPitch - z1 * sinPitch;
      const z2 = z1 * cosPitch + y1 * sinPitch;
      const x2 = x1;
      const x3 = x2 * cosRoll - y2 * sinRoll;
      const y3 = x2 * sinRoll + y2 * cosRoll;
      projected[i] = {
        sx: cx + x3 * radius,
        sy: cy + y3 * radius,
        z: z2,
        p,
      };
    }

    projected.sort((a, b) => a.z - b.z);

    for (let i = 0; i < projected.length; i++) {
      const item = projected[i];
      const depth = (item.z + 1) * 0.5;
      const alpha = 0.14 + Math.pow(depth, 1.4) * 0.86;
      const dotRadius = item.p.size * (0.68 + depth * 0.55);

      if (item.p.isHighlight && depth > 0.68) {
        ctx.fillStyle = `rgba(253, 230, 138, ${(alpha * 0.28).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(item.sx, item.sy, dotRadius * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = `rgba(${item.p.color.r}, ${item.p.color.g}, ${item.p.color.b}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(item.sx, item.sy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    spinAngle += 0.0032 * sceneState.spinMultiplier;
  }

  function generateCityGridNodes() {
    cityIntersections = [];
    const cols = 34;
    const rows = 16;

    for (let r = 1; r <= rows; r++) {
      const v = r / rows;
      for (let c = -cols / 2; c <= cols / 2; c++) {
        const u = c / (cols / 2);
        const avenueDensity =
          Math.sin(u * 4.6 + 0.4) * Math.cos(v * 4.8) +
          Math.cos(u * 9.0 - v * 3.5) * 0.48;
        const isAvenue = Math.abs(c) % 4 === 0 || r % 3 === 0;
        if (avenueDensity > -0.18 || isAvenue || Math.random() < 0.22) {
          cityIntersections.push({
            u,
            v,
            isGold: avenueDensity > 0.28 || Math.random() < 0.52,
            isMajor: avenueDensity > 0.68 && Math.random() < 0.45,
            phase: Math.random() * Math.PI * 2,
            speed: 0.018 + Math.random() * 0.028,
          });
        }
      }
    }
  }

  function renderCityPerspectiveGrid(t) {
    const glowIntensity =
      sceneState.cityGlow === "vivid" ? 1.4 : sceneState.cityGlow === "subtle" ? 0.6 : 1.0;
    const horizonCenterY = height * 0.62;
    const vanishX = width * 0.54;

    function getCurvedHorizonY(screenX) {
      const normX = (screenX - vanishX) / (width * 0.65);
      return horizonCenterY + normX * normX * (height * 0.045);
    }

    const hazeGrad = ctx.createLinearGradient(0, horizonCenterY - 35, 0, horizonCenterY + 65);
    hazeGrad.addColorStop(0, "rgba(2, 4, 10, 0)");
    hazeGrad.addColorStop(0.48, `rgba(245, 158, 11, ${(0.09 * glowIntensity).toFixed(3)})`);
    hazeGrad.addColorStop(1, "rgba(2, 4, 10, 0)");
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, horizonCenterY - 35, width, 100);

    ctx.strokeStyle = `rgba(251, 191, 36, ${(0.22 * glowIntensity).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let sx = 0; sx <= width; sx += 24) {
      const hy = getCurvedHorizonY(sx);
      if (sx === 0) ctx.moveTo(sx, hy);
      else ctx.lineTo(sx, hy);
    }
    ctx.stroke();

    const rayCount = 30;
    for (let i = -rayCount; i <= rayCount; i++) {
      const u = i / rayCount;
      const topX = vanishX + u * (width * 0.28);
      const bottomX = vanishX + u * (width * 1.45);
      const startY = getCurvedHorizonY(topX);
      const isMainArtery = i % 4 === 0;
      const alpha = (isMainArtery ? 0.14 : 0.065) * (1 - Math.abs(u) * 0.35) * glowIntensity;
      ctx.strokeStyle = isMainArtery
        ? `rgba(251, 191, 36, ${alpha.toFixed(3)})`
        : `rgba(148, 163, 184, ${alpha.toFixed(3)})`;
      ctx.lineWidth = isMainArtery ? 1.0 : 0.7;
      ctx.beginPath();
      ctx.moveTo(topX, startY);
      ctx.lineTo(bottomX, height);
      ctx.stroke();
    }

    const rowCount = 16;
    for (let r = 1; r <= rowCount; r++) {
      const v = r / rowCount;
      const depthT = Math.pow(v, 1.75);
      const rowAlpha = (0.04 + depthT * 0.11) * glowIntensity;
      ctx.strokeStyle = `rgba(148, 163, 184, ${rowAlpha.toFixed(3)})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let sx = 0; sx <= width; sx += 32) {
        const hY = getCurvedHorizonY(sx);
        const y = hY + depthT * (height - hY);
        if (sx === 0) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < cityIntersections.length; i++) {
      const node = cityIntersections[i];
      const depthT = Math.pow(node.v, 1.75);
      const topX = vanishX + node.u * (width * 0.28);
      const bottomX = vanishX + node.u * (width * 1.45);
      const x = topX + (bottomX - topX) * depthT;
      if (x < -20 || x > width + 20) continue;

      const hY = getCurvedHorizonY(x);
      const y = hY + depthT * (height - hY);
      const shimmer = 0.68 + 0.32 * Math.sin(t * node.speed + node.phase);
      const horizonFade = Math.min(1, node.v * 2.5);
      const alpha = Math.min(1, (0.38 + depthT * 0.62) * shimmer * horizonFade * glowIntensity);
      const coreSize = (1.0 + depthT * 1.55) * (node.isMajor ? 1.35 : 1.0);

      if (node.isMajor || depthT > 0.25) {
        const haloRadius = coreSize * (node.isMajor ? 5.8 : 3.6);
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
        if (node.isGold) {
          halo.addColorStop(0, `rgba(251, 191, 36, ${(alpha * 0.55).toFixed(3)})`);
          halo.addColorStop(1, "rgba(245, 158, 11, 0)");
        } else {
          halo.addColorStop(0, `rgba(241, 245, 249, ${(alpha * 0.45).toFixed(3)})`);
          halo.addColorStop(1, "rgba(241, 245, 249, 0)");
        }
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = node.isGold
        ? `rgba(253, 224, 71, ${alpha.toFixed(3)})`
        : `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, coreSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const bottomShade = ctx.createLinearGradient(0, height - 55, 0, height);
    bottomShade.addColorStop(0, "rgba(2, 4, 10, 0)");
    bottomShade.addColorStop(1, "rgba(2, 4, 10, 0.85)");
    ctx.fillStyle = bottomShade;
    ctx.fillRect(0, height - 55, width, 55);
  }

  function resizeCanvas() {
    if (!canvas) canvas = document.getElementById("nightSkyCanvas");
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext("2d");

    width = window.innerWidth || document.documentElement.clientWidth || 1280;
    height = window.innerHeight || document.documentElement.clientHeight || 800;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    generateStars();
  }

  function renderLoop() {
    frameTime += 1;
    if (ctx && width > 0 && height > 0) {
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, width, height);
      renderStarfield(frameTime);
      renderCityPerspectiveGrid(frameTime);
      renderDiagonalGlobe();
    }
    requestAnimationFrame(renderLoop);
  }

  function bootScene() {
    canvas = document.getElementById("nightSkyCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    if (globePoints.length === 0) generateGlobePoints();
    if (cityIntersections.length === 0) generateCityGridNodes();
    resizeCanvas();

    if (!animationStarted) {
      animationStarted = true;
      requestAnimationFrame(renderLoop);
    }
  }

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("DOMContentLoaded", bootScene);
  window.addEventListener("load", bootScene);
  if (document.readyState === "interactive" || document.readyState === "complete") {
    bootScene();
  }
})();
