// Letter tracing on an SVG pad. The letter is a list of strokes (polylines in a 100 x 100 box,
// from data/tracing.json). The learner draws each stroke in order, starting at the gold dot and
// following the arrow. A stroke is accepted when the drawn line covers the guide (most guide
// points lie near the line, and the line stays near the guide) and runs in the right direction.
// After two misses on a stroke, a dot animates along it as a hint.
const NS = 'http://www.w3.org/2000/svg';
const TOL = 13;            // how far (in box units) a drawn point may stray from the guide
const NEED_COVER = 0.72;   // share of guide points that must lie near the drawn line

const el = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const pts = (p) => p.map(([x, y]) => `${x},${y}`).join(' ');
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Points every `step` units along a polyline. */
export function resample(poly, step = 3) {
  const out = [poly[0]];
  for (let i = 1; i < poly.length; i++) {
    const [a, b] = [poly[i - 1], poly[i]];
    const d = dist(a, b);
    for (let t = step; t < d; t += step) out.push([a[0] + ((b[0] - a[0]) * t) / d, a[1] + ((b[1] - a[1]) * t) / d]);
    out.push(b);
  }
  return out;
}
const nearest = (p, line) => line.reduce((m, q) => Math.min(m, dist(p, q)), Infinity);

/** Score a drawn line against one guide stroke. */
export function scoreStroke(drawn, guide) {
  if (drawn.length < 2) return { ok: false, reversed: false, cover: 0 };
  const g = resample(guide);
  const d = resample(drawn);
  const cover = g.filter((p) => nearest(p, d) <= TOL).length / g.length;
  const stray = d.filter((p) => nearest(p, g) > TOL * 1.6).length / d.length;
  const fits = cover >= NEED_COVER && stray <= 0.2;
  const start = guide[0]; const end = guide[guide.length - 1];
  const a = drawn[0]; const b = drawn[drawn.length - 1];
  const forward = dist(a, start) + dist(b, end) <= dist(a, end) + dist(b, start);
  // a dot-like stroke (yod's tail) is too short to have a meaningful direction
  const short = dist(start, end) < 8;
  return { ok: fits && (forward || short), reversed: fits && !forward && !short, cover };
}

export function tracePad(strokes, { onStroke = () => {}, onDone = () => {} } = {}) {
  const svg = el('svg', { viewBox: '0 0 100 100', class: 'trace-pad', role: 'img', 'aria-label': 'Tracing pad' });
  svg.append(el('line', { x1: 0, x2: 100, y1: 78, y2: 78, class: 'baseline' }));
  const guides = strokes.map((s) => { const g = el('polyline', { points: pts(s), class: 'guide' }); svg.append(g); return g; });
  const doneLayer = el('g'); const marks = el('g'); const inkLayer = el('g');
  svg.append(doneLayer, marks, inkLayer);
  let index = 0; let misses = 0; let firstTry = 0; let missHere = 0; let drawing = null; let finished = false;

  function drawMarks() {
    marks.replaceChildren();
    if (finished) return;
    const s = strokes[index];
    const [x, y] = s[0];
    // arrow along the first leg of the stroke
    const [x2, y2] = s[1];
    const len = Math.hypot(x2 - x, y2 - y) || 1;
    const ux = (x2 - x) / len; const uy = (y2 - y) / len;
    const ax = x + ux * Math.min(16, len * 0.7); const ay = y + uy * Math.min(16, len * 0.7);
    const nx = -uy; const ny = ux;
    marks.append(el('polyline', { class: 'arrow', points: `${x + ux * 5},${y + uy * 5} ${ax},${ay}` }),
      el('polyline', { class: 'arrow', points: `${ax - ux * 4 + nx * 3},${ay - uy * 4 + ny * 3} ${ax},${ay} ${ax - ux * 4 - nx * 3},${ay - uy * 4 - ny * 3}` }),
      el('circle', { cx: x, cy: y, r: 4.2, class: 'start' }));
    const t = el('text', { x, y, class: 'start-n' }); t.textContent = String(index + 1); marks.append(t);
  }

  function hint() {
    const path = resample(strokes[index], 2);
    const dot = el('circle', { r: 3, class: 'hint-dot' });
    marks.append(dot);
    let i = 0;
    const step = () => {
      if (i >= path.length || !dot.isConnected) { dot.remove(); return; }
      dot.setAttribute('cx', path[i][0]); dot.setAttribute('cy', path[i][1]);
      i += 1; requestAnimationFrame(step);
    };
    step();
  }

  function toBox(e) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10];
  }

  svg.addEventListener('pointerdown', (e) => {
    if (finished) return;
    e.preventDefault();
    svg.setPointerCapture?.(e.pointerId);
    const p = toBox(e); if (!p) return;
    drawing = { pts: [p], line: el('polyline', { class: 'ink', points: pts([p]) }) };
    inkLayer.append(drawing.line);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = toBox(e); if (!p) return;
    const last = drawing.pts[drawing.pts.length - 1];
    if (dist(p, last) < 1) return;
    drawing.pts.push(p);
    drawing.line.setAttribute('points', pts(drawing.pts));
  });
  const end = () => {
    if (!drawing) return;
    const res = scoreStroke(drawing.pts, strokes[index]);
    drawing.line.remove(); drawing = null;
    if (res.ok) {
      doneLayer.append(el('polyline', { points: pts(strokes[index]), class: 'done-stroke' }));
      guides[index].style.opacity = '0';
      if (missHere === 0) firstTry += 1;
      index += 1; missHere = 0;
      const left = strokes.length - index;
      onStroke({ ok: true, index: index - 1, left, misses });
      if (!left) { finished = true; drawMarks(); onDone(Math.round((firstTry / strokes.length) * 100), misses); return; }
      drawMarks();
    } else {
      misses += 1; missHere += 1;
      svg.classList.remove('shake'); void svg.getBoundingClientRect(); svg.classList.add('shake');
      onStroke({ ok: false, reversed: res.reversed, index, left: strokes.length - index, misses: missHere });
      if (missHere >= 2) hint();
    }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', () => { if (drawing && drawing.pts.length > 3) end(); });

  drawMarks();
  return {
    el: svg,
    /** Peek: draw every stroke and stop accepting input. */
    showAll() {
      finished = true;
      strokes.forEach((s, i) => { guides[i].style.opacity = '0'; doneLayer.append(el('polyline', { points: pts(s), class: 'done-stroke' })); });
      marks.replaceChildren();
    },
  };
}
