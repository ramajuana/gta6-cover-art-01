// Neon Coast Cover Studio — the editor.
//
// Wires the page: photos in, layout and grade picked, caption typed, panels
// clicked and dragged, cover exported as a PNG. Photos are read on this
// machine and never uploaded anywhere. A `?shot=` query sets up a fixed
// scene for a screenshot instead (see ./shots.js).
import { LAYOUTS, GRADES, SIZES, PRESET_TITLES, renderCover, panelAt } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const zoomInput = document.getElementById('zoom');
const panelLabel = document.getElementById('panelLabel');
const trayEl = document.getElementById('tray');

/** The whole editor state; renderCover reads it directly. */
const state = {
  layout: 'grid',
  grade: 'sunset',
  size: 'square',
  title: 'NEON COAST',
  subtitle: 'sunset drive',
  badge: true,
  grain: true,
  halftone: true,
  vignette: true,
  panels: [],
  selected: 0,
};

/** Loaded photos: { img, name } in the order they were added. */
const photos = [];
let shuffleStep = 0;

function sizeDef() {
  return SIZES.find((s) => s.id === state.size) ?? SIZES[0];
}

function panelCount() {
  return (LAYOUTS.find((l) => l.id === state.layout) ?? LAYOUTS[0]).panels;
}

/** Keeps one panel slot per panel of the active layout, reusing old slots. */
function syncPanels() {
  const n = panelCount();
  const next = [];
  for (let i = 0; i < n; i++) {
    next.push(state.panels[i] ?? {
      photo: photos.length ? i % photos.length : -1,
      zoom: 1, ox: 0, oy: 0,
    });
  }
  state.panels = next;
  if (state.selected >= n) state.selected = 0;
}

/** Fits the preview canvas to the chosen post size and redraws the cover. */
function redraw() {
  syncPanels();
  const { w, h } = sizeDef();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, state, photos, w, h);
  updatePanelControls();
}

function updatePanelControls() {
  const slot = state.panels[state.selected];
  panelLabel.textContent = slot
    ? `Panel ${state.selected + 1} of ${panelCount()} — ${slot.photo >= 0 ? photos[slot.photo]?.name ?? '' : 'no photo yet'}`
    : 'No panel selected';
  zoomInput.value = slot ? String(Math.round(slot.zoom * 100)) : '100';
  document.getElementById('zoomVal').textContent = `${zoomInput.value}%`;
  document.getElementById('photoSelect').value = slot && slot.photo >= 0 ? String(slot.photo) : '-1';
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function addPhoto(img, name) {
  if (photos.some((p) => p.name === name)) return;
  photos.push({ img, name });
  // New photos join the cover at once: empty slots take them first.
  state.panels.forEach((slot, i) => {
    if (slot.photo === -1) slot.photo = photos.length - 1;
  });
  rebuildTray();
  rebuildPhotoSelect();
  redraw();
}

function rebuildTray() {
  trayEl.innerHTML = '';
  photos.forEach((p, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = `${p.name} — use in the selected panel`;
    const t = document.createElement('canvas');
    t.width = 96;
    t.height = 96;
    const tctx = t.getContext('2d');
    const s = Math.max(96 / p.img.naturalWidth, 96 / p.img.naturalHeight);
    tctx.drawImage(p.img, (96 - p.img.naturalWidth * s) / 2, (96 - p.img.naturalHeight * s) / 2, p.img.naturalWidth * s, p.img.naturalHeight * s);
    thumb.appendChild(t);
    const cap = document.createElement('span');
    cap.textContent = p.name;
    thumb.appendChild(cap);
    thumb.addEventListener('click', () => {
      const slot = state.panels[state.selected];
      if (slot) slot.photo = i;
      rebuildPhotoSelect();
      redraw();
    });
    trayEl.appendChild(thumb);
  });
  if (!photos.length) {
    trayEl.textContent = 'No photos yet — add one below, or use the samples.';
  }
}

function rebuildPhotoSelect() {
  const sel = document.getElementById('photoSelect');
  sel.innerHTML = '<option value="-1">Empty panel</option>';
  photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${p.name}`;
    sel.appendChild(opt);
  });
}

function buildPickers() {
  const layoutBox = document.getElementById('layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = l.id;
    b.innerHTML = `<strong>${l.name}</strong><span>${l.blurb}</span>`;
    b.addEventListener('click', () => {
      state.layout = l.id;
      layoutBox.querySelectorAll('.pick').forEach((x) => x.classList.toggle('on', x === b));
      redraw();
    });
    layoutBox.appendChild(b);
  });
  layoutBox.querySelector('[data-layout="grid"]').classList.add('on');

  const gradeBox = document.getElementById('grades');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = g.id;
    b.title = g.name;
    b.style.background = `linear-gradient(135deg, ${g.sky[1]}, ${g.sky[2]} 55%, ${g.sky[3]})`;
    b.innerHTML = `<span>${g.name}</span>`;
    b.addEventListener('click', () => {
      state.grade = g.id;
      gradeBox.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === b));
      redraw();
    });
    gradeBox.appendChild(b);
  });
  gradeBox.querySelector('[data-grade="sunset"]').classList.add('on');

  const sizeBox = document.getElementById('sizes');
  SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.size = s.id;
    b.innerHTML = `<strong>${s.label}</strong>`;
    b.addEventListener('click', () => {
      state.size = s.id;
      sizeBox.querySelectorAll('.pick').forEach((x) => x.classList.toggle('on', x === b));
      redraw();
    });
    sizeBox.appendChild(b);
  });
  sizeBox.querySelector('[data-size="square"]').classList.add('on');

  const titleBox = document.getElementById('presets');
  PRESET_TITLES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = t;
    b.addEventListener('click', () => {
      state.title = t;
      titleInput.value = t;
      redraw();
    });
    titleBox.appendChild(b);
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Renders the cover at full export size and returns its PNG data URL. */
export async function exportCoverDataURL(w, h) {
  await document.fonts.ready;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'), state, photos, w, h);
  return off.toDataURL('image/png');
}

function exportPNG() {
  const { w, h } = sizeDef();
  exportCoverDataURL(w, h).then((url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    setStatus(`Saved neon-coast-cover-${w}x${h}.png — ${w} × ${h}, ready to post.`);
  });
}

// --- Controls -------------------------------------------------------------

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try {
      addPhoto(await loadImage(URL.createObjectURL(file)), file.name);
    } catch {
      setStatus(`Could not read ${file.name} — try another image.`);
    }
  }
  e.target.value = '';
  setStatus(`${photos.length} photo${photos.length === 1 ? '' : 's'} loaded. Click a panel, then a photo, to place it.`);
});

document.getElementById('useSamples').addEventListener('click', async () => {
  for (const name of ['boulevard', 'pier']) {
    if (photos.some((p) => p.name === `${name}.jpg`)) continue;
    addPhoto(await loadImage(`samples/${name}.jpg`), `${name}.jpg`);
  }
  setStatus('Sample photos loaded — two golden-hour shots to play with.');
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
zoomInput.addEventListener('input', () => {
  const slot = state.panels[state.selected];
  if (slot) slot.zoom = Number(zoomInput.value) / 100;
  redraw();
});
document.getElementById('photoSelect').addEventListener('change', (e) => {
  const slot = state.panels[state.selected];
  if (slot) slot.photo = Number(e.target.value);
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  const slot = state.panels[state.selected];
  if (!slot || slot.photo < 0) { setStatus('Pick a panel with a photo first.'); return; }
  state.panels.forEach((p) => { p.photo = slot.photo; });
  redraw();
  setStatus('Every panel now shows the selected photo.');
});
document.getElementById('resetPan').addEventListener('click', () => {
  const slot = state.panels[state.selected];
  if (slot) { slot.ox = 0; slot.oy = 0; slot.zoom = 1; slot.touched = false; }
  redraw();
});
document.getElementById('shuffle').addEventListener('click', () => {
  // Deterministic shuffle: cycles the same layout/grade pairs in order.
  shuffleStep += 1;
  const combos = [
    ['tilt', 'neon'], ['hero', 'gold'], ['strips', 'teal'],
    ['grid', 'sunset'], ['bleed', 'neon'], ['hero', 'sunset'],
  ];
  const [layout, grade] = combos[shuffleStep % combos.length];
  state.layout = layout;
  state.grade = grade;
  document.querySelectorAll('#layouts .pick').forEach((x) => x.classList.toggle('on', x.dataset.layout === layout));
  document.querySelectorAll('#grades .swatch').forEach((x) => x.classList.toggle('on', x.dataset.grade === grade));
  redraw();
  setStatus(`Shuffled to ${layout} + ${grade}.`);
});
for (const id of ['badge', 'grain', 'halftone', 'vignette']) {
  document.getElementById(`fx-${id}`).addEventListener('change', (e) => {
    state[id] = e.target.checked;
    redraw();
  });
}
document.getElementById('export').addEventListener('click', exportPNG);

// --- Drag a panel to reposition its photo ----------------------------------

let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const { w, h } = sizeDef();
  return {
    x: ((e.clientX - r.left) / r.width) * w,
    y: ((e.clientY - r.top) / r.height) * h,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const { w, h } = sizeDef();
  const hit = panelAt(state.layout, w, h, x, y);
  if (hit < 0) return;
  state.selected = hit;
  const slot = state.panels[hit];
  drag = { x, y, ox: slot.ox, oy: slot.oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const { w, h } = sizeDef();
  const slot = state.panels[state.selected];
  if (!slot) return;
  slot.ox = drag.ox + (x - drag.x) / w;
  slot.oy = drag.oy + (y - drag.y) / h;
  slot.touched = true;
  slot.ox = Math.max(-0.5, Math.min(0.5, slot.ox));
  slot.oy = Math.max(-0.5, Math.min(0.5, slot.oy));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- Start ------------------------------------------------------------------

buildPickers();
rebuildPhotoSelect();
syncPanels();

// The two kit sample photos load at once, so the first paint is a full cover.
Promise.all([
  loadImage('samples/boulevard.jpg').then((img) => ({ img, name: 'boulevard.jpg' })),
  loadImage('samples/pier.jpg').then((img) => ({ img, name: 'pier.jpg' })),
]).then((loaded) => {
  loaded.forEach((p) => addPhoto(p.img, p.name));
  return document.fonts.ready;
}).then(() => {
  redraw();
  setStatus('Ready — click a panel to crop it, drag to reposition, then export.');
}).catch(() => {
  redraw();
  setStatus('Ready — add your own photos to start.');
});

// Screenshot scenes (?shot=editor / ?shot=cover) drive the same editor.
const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query.get('shot'), query, {
    state,
    photos,
    loadImage,
    addPhoto,
    redraw,
    setTitle: (t) => { state.title = t; titleInput.value = t; },
    setSubtitle: (t) => { state.subtitle = t; subtitleInput.value = t; },
  });
} else {
  redraw();
}

// For screenshot tooling: the exact PNG the app exports, at any size.
window.__exportCover = exportCoverDataURL;
window.__coverState = state;
