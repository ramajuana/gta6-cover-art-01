// Fixed scenes for screenshots, driven by the same editor the user sees.
//   ?shot=editor — the full editor with a sample photo loaded.
//   ?shot=cover  — the cover alone, drawn at its export size, filling the frame.
// Query knobs: layout, grade, size (square|portrait|wide), title, subtitle,
// photo (boulevard|pier — which sample fills the panels).
// window.__shotReady is set once the scene has painted.
import { LAYOUTS, GRADES, SIZES } from './cover.js';

export async function runShot(shot, query, api) {
  const { state, photos, loadImage, addPhoto, redraw } = api;
  const pick = (list, id) => list.some((x) => x.id === id) ? id : null;

  const layout = pick(LAYOUTS, query.get('layout'));
  if (layout) {
    state.layout = layout;
    document.querySelectorAll('#layouts .pick').forEach((x) => x.classList.toggle('on', x.dataset.layout === layout));
  }
  const grade = pick(GRADES, query.get('grade'));
  if (grade) {
    state.grade = grade;
    document.querySelectorAll('#grades .swatch').forEach((x) => x.classList.toggle('on', x.dataset.grade === grade));
  }
  const size = pick(SIZES, query.get('size'));
  if (size) {
    state.size = size;
    document.querySelectorAll('#sizes .pick').forEach((x) => x.classList.toggle('on', x.dataset.size === size));
  }
  if (query.get('title')) api.setTitle(query.get('title'));
  if (query.get('subtitle') !== null) api.setSubtitle(query.get('subtitle') ?? '');

  // Make sure both sample photos are in before the scene paints.
  for (const name of ['boulevard', 'pier']) {
    if (!photos.some((p) => p.name === `${name}.jpg`)) {
      try {
        addPhoto(await loadImage(`samples/${name}.jpg`), `${name}.jpg`);
      } catch {
        // A missing sample still leaves a cover: empty panels draw a sunset.
      }
    }
  }

  // Which sample fills the panels: boulevard is photo 0, pier is photo 1.
  const wanted = query.get('photo') === 'pier' ? 1 : 0;
  const single = query.get('photo');
  state.panels.forEach((slot, i) => {
    if (single) slot.photo = wanted;
    else slot.photo = i % photos.length;
  });

  await document.fonts.ready;
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    document.getElementById('cover').style.aspectRatio = '';
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
