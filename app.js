function buildStochasticMatrix(adj) {
  const n = adj.length;
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const out = adj[i].reduce((s, v) => s + v, 0);
    for (let j = 0; j < n; j++) {
      M[j][i] = out > 0 ? adj[i][j] / out : 1 / n;
    }
  }
  return M;
}

function computePageRank(adj, d = 0.85, tol = 1e-8, maxIter = 1000) {
  const n = adj.length;
  const M = buildStochasticMatrix(adj);
  let r = new Array(n).fill(1 / n);

  for (let k = 0; k < maxIter; k++) {
    const rNew = new Array(n).fill((1 - d) / n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rNew[i] += d * M[i][j] * r[j];
      }
    }
    const diff = r.reduce((s, _, i) => s + Math.abs(rNew[i] - r[i]), 0);
    r = rNew;
    if (diff < tol) return { scores: r, iterations: k + 1 };
  }
  return { scores: r, iterations: maxIter };
}

let n = 4;
let adj = [];
let names = [];

function initState(size) {
  const oldAdj   = adj.map(r => [...r]);
  const oldNames = [...names];
  n = size;
  adj = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i < oldAdj.length && j < oldAdj.length ? oldAdj[i][j] : 0
    )
  );
  names = Array.from({ length: n }, (_, i) =>
    i < oldNames.length ? oldNames[i] : `P${i + 1}`
  );
}

function renderNames() {
  const grid = document.getElementById('names-grid');
  grid.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'name-input-wrap';
    wrap.innerHTML = `<span class="name-index">${i + 1}.</span>`;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = names[i];
    inp.maxLength = 12;
    inp.placeholder = `P${i + 1}`;
    inp.dataset.idx = i;
    inp.addEventListener('input', e => {
      names[e.target.dataset.idx] = e.target.value || `P${+e.target.dataset.idx + 1}`;
      renderMatrix();
    });
    wrap.appendChild(inp);
    grid.appendChild(wrap);
  }
}

function renderMatrix() {
  const wrap = document.getElementById('matrix-wrap');

  // Reliable available width — clientWidth is 0 before first paint on some browsers
  const availW = (() => {
    const cw = wrap.clientWidth || wrap.offsetWidth;
    if (cw > 50) return cw;
    const vw = window.innerWidth;
    if (vw > 860) return 337; // desktop: 380px panel minus card padding
    const mp = vw <= 500 ? 24 : 48; // main padding L+R
    return Math.max(200, vw - mp - 43); // minus card padding
  })();

  const gap = n >= 10 ? 2 : n >= 7 ? 3 : 4;

  // Solve for cellSize where: idealHeader(=1.2×cell) + n×cell + (n+2)×gap = availW
  const rawCell  = Math.floor((availW - (n + 2) * gap) / (n + 1.2));
  const cellSize = Math.max(16, Math.min(36, rawCell));

  // Cap headerW proportionally — don't let it absorb all leftover when cellSize is maxed
  const leftover   = availW - n * cellSize - (n + 2) * gap;
  const headerW    = Math.max(24, Math.min(Math.round(cellSize * 1.2), leftover));
  const tableW     = headerW + n * cellSize + (n + 2) * gap;

  const cellFont = cellSize >= 30 ? '.80rem' : cellSize >= 24 ? '.74rem' : cellSize >= 20 ? '.68rem' : '.62rem';
  const cellR    = cellSize >= 30 ? 7 : cellSize >= 24 ? 6 : 5;
  const thPad    = cellSize >= 28 ? '.3rem .5rem' : cellSize >= 22 ? '.2rem .3rem' : '.12rem .15rem';
  const rhPr     = cellSize >= 28 ? '.6rem' : cellSize >= 22 ? '.4rem' : '.25rem';

  wrap.style.setProperty('--cell',      cellSize + 'px');
  wrap.style.setProperty('--gap',       gap      + 'px');
  wrap.style.setProperty('--cell-font', cellFont);
  wrap.style.setProperty('--cell-r',    cellR    + 'px');
  wrap.style.setProperty('--th-pad',    thPad);
  wrap.style.setProperty('--rh-pr',     rhPr);

  const colMax = cellSize >= 28 ? 5 : cellSize >= 22 ? 3 : 2;
  const rowMax = headerW  >= 48 ? 7 : headerW  >= 36 ? 5 : headerW >= 26 ? 4 : 3;
  const trunc  = (name, max) => name.length > max ? name.slice(0, max - 1) + '…' : name;

  const table = document.createElement('table');
  table.className = 'matrix-table';
  // Explicit width required for table-layout:fixed to enforce column widths
  table.style.width = tableW + 'px';

  const headRow = document.createElement('tr');
  const cornerTh = document.createElement('th');
  cornerTh.style.width = headerW + 'px';
  headRow.appendChild(cornerTh);
  for (let j = 0; j < n; j++) {
    const th = document.createElement('th');
    th.style.width = cellSize + 'px';
    th.textContent = trunc(names[j], colMax);
    th.title = names[j];
    headRow.appendChild(th);
  }
  table.appendChild(headRow);

  for (let i = 0; i < n; i++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'row-header';
    th.textContent = trunc(names[i], rowMax);
    th.title = names[i];
    tr.appendChild(th);

    for (let j = 0; j < n; j++) {
      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'matrix-cell';
      btn.dataset.i = i;
      btn.dataset.j = j;

      if (i === j) {
        btn.classList.add('is-diag');
        btn.textContent = '−';
        btn.disabled = true;
      } else {
        btn.classList.add(adj[i][j] ? 'is-1' : 'is-0');
        btn.textContent = adj[i][j];
        btn.addEventListener('click', toggleCell);
      }
      td.appendChild(btn);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  wrap.innerHTML = '';
  wrap.appendChild(table);
}

function toggleCell(e) {
  const btn = e.currentTarget;
  const i = +btn.dataset.i;
  const j = +btn.dataset.j;
  adj[i][j] = 1 - adj[i][j];
  btn.textContent = adj[i][j];
  btn.classList.toggle('is-0', adj[i][j] === 0);
  btn.classList.toggle('is-1', adj[i][j] === 1);
}

function shortName(name) {
  return name.length > 7 ? name.slice(0, 6) + '…' : name;
}

function renderRanking(scores, iterations) {
  const placeholder = document.getElementById('placeholder');
  const list        = document.getElementById('ranking-list');
  const badge       = document.getElementById('iters-badge');

  placeholder.style.display = 'none';
  list.innerHTML = '';
  list.classList.remove('hidden');
  badge.textContent = `${iterations} iterações`;
  badge.classList.remove('hidden');

  const indexed = scores
    .map((s, i) => ({ i, s, name: names[i] }))
    .sort((a, b) => b.s - a.s);

  const maxScore = indexed[0].s;

  indexed.forEach((entry, pos) => {
    const li = document.createElement('li');
    li.className = pos === 0 ? 'rank-item rank-first' : 'rank-item';
    li.style.animationDelay = `${pos * 60}ms`;

    const posClass = pos === 0 ? 'gold' : pos === 1 ? 'silver' : pos === 2 ? 'bronze' : 'other';
    const pct      = ((entry.s / maxScore) * 100).toFixed(1);

    li.innerHTML = `
      <div class="rank-pos ${posClass}">${pos + 1}</div>
      <div class="rank-info">
        <div class="rank-name" title="${entry.name}">${entry.name}</div>
        <div class="rank-bar-wrap">
          <div class="rank-bar-bg">
            <div class="rank-bar" style="width:0%" data-pct="${pct}"></div>
          </div>
          <div class="rank-score" data-score="${(entry.s * 100).toFixed(6)}">0.00%</div>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('.rank-bar').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
    document.querySelectorAll('.rank-score').forEach(el => {
      const target = parseFloat(el.dataset.score);
      const t0 = performance.now();
      const dur = 750;
      (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * ease).toFixed(2) + '%';
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, text = null) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== null) e.textContent = text;
  return e;
}

const PALETTE = ['#4338ca', '#6d28d9', '#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'];

function drawGraph(scores) {
  const svg    = document.getElementById('graph-svg');
  const W      = svg.clientWidth  || 480;
  const H      = svg.clientHeight || 360;
  const cx     = W / 2;
  const cy     = H / 2;
  const radius = Math.min(W, H) * 0.36;

  svg.style.opacity = '0';
  svg.style.transition = 'opacity .5s ease';
  svg.innerHTML = '';

  const pos = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const maxS  = Math.max(...scores);
  const nodeR = scores.map(s => 18 + (s / maxS) * 20);

  const rankOf = scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .reduce((acc, { i }, rank) => { acc[i] = rank; return acc; }, {});

  const defs = el('defs');
  defs.innerHTML = `
    <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#94a3b8"/>
    </marker>
    <marker id="arr-hi" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#a5b4fc"/>
    </marker>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#00000020"/>
    </filter>
  `;
  svg.appendChild(defs);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && adj[i][j] === 1) {
        drawEdge(svg, pos[i], pos[j], nodeR[i], nodeR[j], adj[j][i] === 1);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const rank  = rankOf[i];
    const color = PALETTE[Math.min(rank, PALETTE.length - 1)];
    const p     = pos[i];
    const r     = nodeR[i];
    const label = names[i].length > 7 ? names[i].slice(0, 6) + '…' : names[i];

    const g = el('g');
    g.appendChild(el('circle', { cx: p.x + 2, cy: p.y + 3, r, fill: '#00000018' }));
    g.appendChild(el('circle', { cx: p.x, cy: p.y, r, fill: color, stroke: '#fff', 'stroke-width': 2.5, filter: 'url(#shadow)' }));
    g.appendChild(el('text', {
      x: p.x, y: p.y + 4,
      'text-anchor': 'middle',
      fill: '#fff',
      'font-size': r > 28 ? 11 : 9,
      'font-weight': 'bold',
      'font-family': 'system-ui, sans-serif',
    }, label));

    const bx = p.x + r * 0.68, by = p.y - r * 0.68;
    g.appendChild(el('circle', { cx: bx, cy: by, r: 10, fill: '#fff', stroke: color, 'stroke-width': 1.8 }));
    g.appendChild(el('text', {
      x: bx, y: by + 4,
      'text-anchor': 'middle',
      fill: color,
      'font-size': 8.5,
      'font-weight': 'bold',
      'font-family': 'system-ui, sans-serif',
    }, `#${rank + 1}`));

    svg.appendChild(g);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { svg.style.opacity = '1'; }));
}

function drawEdge(svg, from, to, r1, r2, bidir) {
  const dx  = to.x - from.x;
  const dy  = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux  = dx / len, uy = dy / len;
  const px  = -uy;
  const offset = bidir ? 10 : 0;

  const sx = from.x + ux * r1       + px * offset;
  const sy = from.y + uy * r1       + ux * offset;
  const ex = to.x   - ux * (r2 + 7) + px * offset;
  const ey = to.y   - uy * (r2 + 7) + ux * offset;
  const mx = (sx + ex) / 2 - uy * 14;
  const my = (sy + ey) / 2 + ux * 14;

  svg.appendChild(el('path', {
    d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`,
    fill: 'none',
    stroke: bidir ? '#a5b4fc' : '#94a3b8',
    'stroke-width': 1.6,
    'marker-end': `url(#${bidir ? 'arr-hi' : 'arr'})`,
    opacity: 0.85,
  }));
}

const EXAMPLES = [
  {
    names: ['P1', 'P2', 'P3', 'P4'],
    adj: [
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
    ],
  },
  {
    names: ['Blog', 'Wiki', 'News', 'Fórum', 'Shop', 'Gov'],
    adj: [
      [0, 1, 1, 0, 0, 1],
      [1, 0, 1, 1, 0, 0],
      [0, 1, 0, 1, 0, 1],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 0],
      [1, 1, 1, 0, 0, 0],
    ],
  },
];
let exampleIdx = 0;

function loadExample() {
  const ex = EXAMPLES[exampleIdx % EXAMPLES.length];
  exampleIdx++;
  n     = ex.names.length;
  names = [...ex.names];
  adj   = ex.adj.map(r => [...r]);
  document.getElementById('n-input').value = n;
  renderNames();
  renderMatrix();
  clearResults();
}

function calculate() {
  document.querySelectorAll('.name-input-wrap input').forEach(inp => {
    names[+inp.dataset.idx] = inp.value.trim() || `P${+inp.dataset.idx + 1}`;
  });
  const d = parseFloat(document.getElementById('d-slider').value);
  const { scores, iterations } = computePageRank(adj, d);
  renderRanking(scores, iterations);
  drawGraph(scores);
}

function clearResults() {
  document.getElementById('placeholder').style.display = '';
  document.getElementById('ranking-list').innerHTML = '';
  document.getElementById('ranking-list').classList.add('hidden');
  document.getElementById('iters-badge').classList.add('hidden');
  document.getElementById('graph-svg').innerHTML = '';
}

function setN(value) {
  value = Math.max(2, Math.min(12, value));
  document.getElementById('n-input').value = value;
  initState(value);
  renderNames();
  renderMatrix();
  clearResults();
}

document.addEventListener('DOMContentLoaded', () => {
  initState(4);
  renderNames();
  renderMatrix();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderMatrix, 120);
  });

  document.getElementById('btn-dec').addEventListener('click', () => setN(n - 1));
  document.getElementById('btn-inc').addEventListener('click', () => setN(n + 1));
  document.getElementById('n-input').addEventListener('change', e => setN(+e.target.value));

  const slider = document.getElementById('d-slider');
  const dVal   = document.getElementById('d-val');
  function updateSlider() {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--pct', pct + '%');
    dVal.textContent = parseFloat(slider.value).toFixed(2);
  }
  slider.addEventListener('input', updateSlider);
  updateSlider();

  const themeBtn = document.getElementById('btn-theme');
  const root = document.documentElement;
  function setTheme(dark) {
    root.setAttribute('data-theme', dark ? 'dark' : '');
    localStorage.setItem('pr-theme', dark ? 'dark' : 'light');
  }
  const saved = localStorage.getItem('pr-theme');
  setTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  themeBtn.addEventListener('click', () => setTheme(root.getAttribute('data-theme') !== 'dark'));

  document.getElementById('btn-clear').addEventListener('click', () => {
    adj = Array.from({ length: n }, () => new Array(n).fill(0));
    renderMatrix();
    clearResults();
  });
  document.getElementById('btn-example').addEventListener('click', loadExample);
  document.getElementById('btn-calc').addEventListener('click', calculate);
});
