// Neon Coast Cover Studio — the cover renderer.
//
// Draws GTA-poster-style cover art on a 2D canvas: multi-panel layouts, a
// Vice City sunset or neon colour grade, bold display lettering with a
// script subtitle, halftone dots, film grain and a badge ribbon. Every pixel
// is drawn from scratch in this file: no logo, artwork, character or font
// comes from any game. Fonts are Anton and Pacifico, both SIL OFL, shipped
// as files under app/fonts/.

export const LAYOUTS = [
  { id: 'grid', name: 'Cover Grid', panels: 9, blurb: 'Hero in the middle, eight vignettes around it' },
  { id: 'hero', name: 'Hero + Trio', panels: 4, blurb: 'One big hero, three stacked moments' },
  { id: 'strips', name: 'Sunset Strips', panels: 4, blurb: 'Four tall slices of the same evening' },
  { id: 'tilt', name: 'Snapshot Tilt', panels: 3, blurb: 'Tilted snapshots over a palm sunset' },
  { id: 'bleed', name: 'Full Bleed', panels: 1, blurb: 'One photo, edge to edge, title over it' },
];

export const GRADES = [
  {
    id: 'sunset', name: 'Vice Sunset',
    sky: ['#1c0b3d', '#7a1e63', '#ff5e62', '#ffb347'],
    sun: '#ffd166', tint: 'rgba(255, 96, 60, 0.20)', title: ['#ffffff', '#ffd166'],
    accent: '#ff5e9c', ink: '#160a2b', scrim: 'rgba(22, 10, 43, 0.88)',
  },
  {
    id: 'neon', name: 'Neon Night',
    sky: ['#070418', '#2a0f5e', '#a4138f', '#ff2e88'],
    sun: '#00f0ff', tint: 'rgba(0, 240, 255, 0.14)', title: ['#ffffff', '#7df9ff'],
    accent: '#00f0ff', ink: '#0a0424', scrim: 'rgba(10, 4, 36, 0.88)',
  },
  {
    id: 'gold', name: 'Palm Gold',
    sky: ['#160f04', '#6b3d0c', '#d99421', '#ffe08a'],
    sun: '#fff3c4', tint: 'rgba(255, 180, 60, 0.18)', title: ['#ffffff', '#ffe9a8'],
    accent: '#ffb347', ink: '#1d1204', scrim: 'rgba(29, 18, 4, 0.88)',
  },
  {
    id: 'teal', name: 'Miami Teal',
    sky: ['#03181f', '#0a4a5e', '#0e8f8a', '#5ff2c8'],
    sun: '#d8fff2', tint: 'rgba(55, 224, 200, 0.14)', title: ['#ffffff', '#a8fff0'],
    accent: '#37e0c8', ink: '#03222b', scrim: 'rgba(3, 34, 43, 0.88)',
  },
  {
    id: 'noir', name: 'Noir',
    sky: ['#0a0a0a', '#2b2b2b', '#5c5c5c', '#c9c9c9'],
    sun: '#f2f2f2', tint: 'rgba(255, 255, 255, 0.10)', title: ['#ffffff', '#d8d8d8'],
    accent: '#ffffff', ink: '#0d0d0d', scrim: 'rgba(13, 13, 13, 0.90)',
  },
];

export const SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

export const PRESET_TITLES = ['NEON COAST', 'SUNSET RUN', 'PALM HEIST', 'NIGHT DRIVE', 'GOLDEN HOUR'];

/** A tiny deterministic generator, so grain and speckle never change run to run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * Panel rectangles for a layout, in cover pixels. Returns the panels, the
 * title band, and whether the layout paints a sunset backdrop behind them.
 */
export function layoutGeometry(layoutId, w, h) {
  const frame = Math.max(10, Math.round(Math.min(w, h) * 0.016));
  const bandH = Math.round(h * (w >= h ? 0.185 : 0.15));
  const inner = { x: frame, y: frame, w: w - frame * 2, h: h - frame * 2 };
  const title = { x: inner.x, y: inner.y + inner.h - bandH, w: inner.w, h: bandH };
  const grid = { x: inner.x, y: inner.y, w: inner.w, h: inner.h - bandH };
  const g = Math.max(5, Math.round(w * 0.006));
  const panels = [];

  if (layoutId === 'grid') {
    const cw = (grid.w - g * 2) / 3;
    const ch = (grid.h - g * 2) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) continue; // the hero takes the middle four cells
        panels.push({
          x: grid.x + c * (cw + g), y: grid.y + r * (ch + g), w: cw, h: ch, rot: 0,
        });
      }
    }
    panels.push({
      x: grid.x + cw + g, y: grid.y + ch + g, w: cw * 2 + g, h: ch * 2 + g, rot: 0, hero: true,
    });
  } else if (layoutId === 'hero') {
    const heroW = (grid.w - g) * 0.62;
    panels.push({ x: grid.x, y: grid.y, w: heroW, h: grid.h, rot: 0, hero: true });
    const colX = grid.x + heroW + g;
    const colW = grid.w - heroW - g;
    const ch = (grid.h - g * 2) / 3;
    for (let r = 0; r < 3; r++) {
      panels.push({ x: colX, y: grid.y + r * (ch + g), w: colW, h: ch, rot: 0 });
    }
  } else if (layoutId === 'strips') {
    const shares = [0.3, 0.24, 0.22, 0.24];
    let x = grid.x;
    for (const share of shares) {
      const pw = (grid.w - g * 3) * share;
      panels.push({ x, y: grid.y, w: pw, h: grid.h, rot: 0 });
      x += pw + g;
    }
  } else if (layoutId === 'tilt') {
    const pw = grid.w * 0.44;
    const ph = grid.h * 0.56;
    panels.push({ x: grid.x + grid.w * 0.02, y: grid.y + grid.h * 0.30, w: pw, h: ph, rot: -0.09, snap: true });
    panels.push({ x: grid.x + grid.w * 0.30, y: grid.y + grid.h * 0.02, w: pw, h: ph, rot: 0.05, snap: true, hero: true });
    panels.push({ x: grid.x + grid.w * 0.55, y: grid.y + grid.h * 0.32, w: pw, h: ph, rot: -0.03, snap: true });
  } else {
    // bleed: one panel under everything, title scrim over it.
    panels.push({ x: 0, y: 0, w, h, rot: 0, hero: true, bleed: true });
  }
  return { panels, title, frame, backdrop: layoutId === 'tilt' || layoutId === 'bleed' };
}

function drawSky(ctx, grade, w, h, band) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  const stops = grade.sky;
  stops.forEach((c, i) => sky.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Retro slatted sun, centred in the title band so it glows behind the words.
  const sunR = band.h * 0.62;
  const sunX = w / 2;
  const sunY = band.y + band.h * 0.52;
  drawSun(ctx, sunX, sunY, sunR, grade.sun, stops[stops.length - 2]);
}

/** A big slatted sun, for the open-sky layouts (tilt, full bleed). */
export function drawBackdropSun(ctx, grade, w, h) {
  drawSun(ctx, w * 0.14, h * 0.15, Math.min(w, h) * 0.11, grade.sun, grade.sky[grade.sky.length - 2]);
}

function drawSun(ctx, sunX, sunY, sunR, sunColor, slatColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sunColor;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = slatColor;
  let y = sunY + sunR * 0.05;
  let gap = Math.max(2, sunR * 0.03);
  while (y < sunY + sunR) {
    ctx.fillRect(sunX - sunR, y, sunR * 2, gap);
    y += gap + sunR * 0.14;
    gap += 2;
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning slightly, drawn as tapering strokes.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.06, -size * 0.55, size * 0.16, -size * 0.95);
  ctx.lineWidth = size * 0.055;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.06, -size * 0.55, size * 0.16, -size * 0.95);
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();
  // Fronds fanning from the crown.
  const cx = size * 0.16;
  const cy = -size * 0.95;
  ctx.strokeStyle = color;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = size * (0.52 - Math.abs(i - 3) * 0.045);
    const tx = cx + Math.cos(a) * len;
    const ty = cy - Math.sin(a) * len * 0.55 + len * 0.34;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.6, cy - Math.sin(a) * len * 0.7, tx, ty);
    ctx.lineWidth = size * (0.045 - Math.abs(i - 3) * 0.004);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHalftone(ctx, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(14, Math.round(w / 64));
  for (let row = 0; row < 7; row++) {
    const y = h * 0.03 + row * step * 1.1;
    for (let col = 0; col < Math.ceil(w / step); col++) {
      const x = col * step + (row % 2 ? step / 2 : 0);
      const r = Math.max(0.6, (step * 0.32 * (7 - row)) / 7);
      ctx.globalAlpha = 0.05 + row * 0.012;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPhotoInto(ctx, img, rect, panel, grade) {
  ctx.save();
  if (panel.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(panel.rot);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    rect = { x: 0, y: 0, w: rect.w, h: rect.h };
  }
  if (panel.snap) {
    // Instant-photo frame: white border, deeper at the foot.
    ctx.fillStyle = '#fdf8ef';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = rect.w * 0.05;
    ctx.shadowOffsetY = rect.w * 0.02;
    const pad = rect.w * 0.035;
    ctx.fillRect(-pad, -pad, rect.w + pad * 2, rect.h + pad * 2 + rect.w * 0.09);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const placeholder = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    placeholder.addColorStop(0, grade.sky[1]);
    placeholder.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = placeholder;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    drawPalm(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.92, rect.w * 0.5, 'rgba(10,4,24,0.55)');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${Math.max(11, Math.round(rect.w * 0.055))}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.52);
  } else {
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const scale = base * (panel.zoom || 1);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w;
    // Until the user drags a panel, bias the crop toward the top of the
    // photo: faces live in the upper third, and a tall photo in a wide
    // panel would otherwise lose them to the centre crop.
    let cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h;
    if (!panel.touched && ph > rect.h) cy += (ph - rect.h) * 0.35;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grade.tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    shade.addColorStop(0, 'rgba(10,4,24,0)');
    shade.addColorStop(1, 'rgba(10,4,24,0.32)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  // Frame line around the panel.
  ctx.save();
  if (panel.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(panel.rot);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    rect = { x: 0, y: 0, w: rect.w, h: rect.h };
  }
  if (!panel.snap) {
    ctx.lineWidth = Math.max(2, Math.round(rect.w * 0.012));
    ctx.strokeStyle = '#fdf8ef';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(10,4,24,0.5)';
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(20, size - 4);
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function drawTitleBlock(ctx, state, geometry, w, h) {
  const grade = gradeById(state.grade);
  const band = geometry.title;
  const title = (state.title || 'NEON COAST').trim().toUpperCase() || 'NEON COAST';
  const subtitle = (state.subtitle || '').trim();

  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.55, 0, band.y + band.h);
  scrim.addColorStop(0, 'rgba(10,4,24,0)');
  scrim.addColorStop(0.45, grade.scrim.replace(/[\d.]+\)$/, '0.55)'));
  scrim.addColorStop(1, grade.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(band.x, band.y - band.h * 0.55, band.w, band.h * 1.55);

  const cx = band.x + band.w / 2;
  const titleSize = fitFont(ctx, title, band.w * 0.94, Math.round(band.h * 0.44), 'Anton, "Arial Black", sans-serif');
  const titleY = band.y + band.h * 0.38 + titleSize * 0.30;

  ctx.save();
  ctx.translate(cx, titleY);
  ctx.rotate(-0.018);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const fill = ctx.createLinearGradient(0, -titleSize * 0.55, 0, titleSize * 0.55);
  fill.addColorStop(0, grade.title[0]);
  fill.addColorStop(1, grade.title[1]);
  ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = titleSize * 0.16;
  ctx.shadowOffsetY = titleSize * 0.05;
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = Math.max(3, titleSize * 0.085);
  ctx.strokeText(title, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = fill;
  ctx.fillText(title, 0, 0);
  // A thin bright edge on the top of the letters.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(title, 0, -titleSize * 0.03);
  ctx.restore();

  // Script subtitle with a neon glow, tucked under the title.
  if (subtitle) {
    const subSize = Math.round(titleSize * 0.42);
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.45;
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, cx, band.y + band.h * 0.86);
    ctx.restore();
  }

  // Five-star heat meter, left of the subtitle line when there is room.
  const starR = Math.max(5, Math.round(band.h * 0.055));
  const starY = band.y + band.h * 0.86;
  const starGap = starR * 2.5;
  const totalW = starR * 2 * 5 + starGap * 4;
  const startX = band.x + band.w * 0.045;
  const endX = band.x + band.w - band.w * 0.045 - totalW;
  const starsX = subtitle ? startX : cx - totalW / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starsX + starR + i * (starR * 2 + starGap), starY, starR, i < 4 ? grade.accent : 'rgba(255,255,255,0.35)');
  }
  if (subtitle) {
    // Mirror the stars on the right for balance.
    for (let i = 0; i < 5; i++) {
      drawStar(ctx, endX + starR + i * (starR * 2 + starGap), starY, starR, i < 4 ? grade.accent : 'rgba(255,255,255,0.35)');
    }
  }
}

function drawBadge(ctx, state, w, h, frame) {
  const grade = gradeById(state.grade);
  const text = 'EST. 2026 ★ LAUNCH WEEK';
  ctx.save();
  ctx.translate(w - frame, frame);
  const size = Math.max(13, Math.round(Math.min(w, h) * 0.016));
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + size * 2.2;
  const bh = size * 2.1;
  ctx.translate(-bw / 2, bh / 2);
  ctx.rotate(0.06);
  ctx.fillStyle = grade.ink;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(-bw / 2 + 3, -bh / 2 + 3, bw - 6, bh - 6);
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function addGrain(ctx, w, h) {
  const rand = mulberry32(20261119);
  const n = Math.floor((w * h) / 1600);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const a = 0.02 + rand() * 0.06;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function addVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders the whole cover. `state` carries layout, grade, title, subtitle,
 * effect toggles and `panels` (one slot per panel of the active layout, each
 * { photo, zoom, ox, oy }); `photos` is the loaded image list.
 */
export function renderCover(ctx, state, photos, w, h) {
  const grade = gradeById(state.grade);
  const geometry = layoutGeometry(state.layout, w, h);
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, grade, w, h, geometry.title);
  if (geometry.backdrop) {
    drawBackdropSun(ctx, grade, w, h);
    drawPalm(ctx, w * 0.05, h * 0.34, Math.min(w, h) * 0.26, 'rgba(12,4,26,0.5)');
    drawPalm(ctx, w * 0.95, h * 0.38, Math.min(w, h) * 0.22, 'rgba(12,4,26,0.42)');
  }
  if (state.halftone !== false) drawHalftone(ctx, w, h, '#ffffff');
  const count = layoutById(state.layout).panels;
  for (let i = 0; i < count; i++) {
    const slot = state.panels[i] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const img = slot.photo >= 0 && photos[slot.photo] ? photos[slot.photo].img : null;
    drawPhotoInto(ctx, img, geometry.panels[i], slot, grade);
  }
  drawTitleBlock(ctx, state, geometry, w, h);
  if (state.badge !== false) drawBadge(ctx, state, w, h, geometry.frame);
  if (state.vignette !== false) addVignette(ctx, w, h);
  if (state.grain !== false) addGrain(ctx, w, h);
  // Outer frame.
  ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  ctx.strokeStyle = '#fdf8ef';
  ctx.strokeRect(
    geometry.frame / 2, geometry.frame / 2,
    w - geometry.frame, h - geometry.frame,
  );
}

/** Hit-tests a point (cover pixels) against the active layout's panels. */
export function panelAt(layoutId, w, h, x, y) {
  const { panels } = layoutGeometry(layoutId, w, h);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
