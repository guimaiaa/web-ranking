// app-comentado.js — versão comentada do código principal do projeto PageRank


// Converte a matriz de adjacência (0s e 1s) em uma matriz estocástica de colunas,
// onde cada coluna soma 1. Isso é necessário para o método da potência convergir.
function buildStochasticMatrix(adj) {
  const n = adj.length;

  // cria uma matriz n×n zerada para preencher
  const M = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    // conta quantos links saem da página i somando todos os valores da linha
    const out = adj[i].reduce((s, v) => s + v, 0);

    for (let j = 0; j < n; j++) {
      // M[j][i] porque a matriz estocástica de colunas é a transposta da adjacência normalizada.
      // se a página i não tem nenhum link saindo (out == 0), considera que ela aponta
      // igualmente para todas — evita o problema do "dangling node" onde a probabilidade
      // simplesmente desapareceria do sistema.
      M[j][i] = out > 0 ? adj[i][j] / out : 1 / n;
    }
  }

  return M;
}


// Calcula o vetor de PageRank usando o método da potência.
// Parâmetros:
//   adj     — matriz de adjacência n×n
//   d       — fator de amortecimento (padrão 0.85, valor do artigo original do Google)
//   tol     — tolerância para convergência: para quando a variação é menor que isso
//   maxIter — limite de iterações para não rodar indefinidamente
function computePageRank(adj, d = 0.85, tol = 1e-8, maxIter = 1000) {
  const n = adj.length;

  // converte a adjacência na matriz estocástica M
  const M = buildStochasticMatrix(adj);

  // inicializa o vetor de scores com distribuição uniforme (1/n para cada página),
  // já que no começo não há nenhuma informação sobre importância relativa
  let r = new Array(n).fill(1 / n);

  for (let k = 0; k < maxIter; k++) {
    // (1 - d) / n é o termo de "teleporte": representa a chance de um usuário
    // abandonar os links e ir para uma página aleatória. Sem isso, páginas sem
    // nenhum link apontando para elas nunca receberiam visitas.
    const rNew = new Array(n).fill((1 - d) / n);

    // multiplicação matriz × vetor: rNew = d * M * r  (mais o teleporte já adicionado acima)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rNew[i] += d * M[i][j] * r[j];
      }
    }

    // verifica convergência: se a soma das diferenças absolutas for menor que tol,
    // o vetor praticamente parou de mudar e o algoritmo pode encerrar
    const diff = r.reduce((s, _, i) => s + Math.abs(rNew[i] - r[i]), 0);
    r = rNew;

    if (diff < tol) return { scores: r, iterations: k + 1 };
  }

  // retorna mesmo sem convergir caso atinja o limite de iterações
  return { scores: r, iterations: maxIter };
}


// variáveis globais que guardam o estado atual da aplicação
let n     = 4;  // número de páginas
let adj   = []; // matriz de adjacência n×n — adj[i][j]=1 significa "página i linka para j"
let names = []; // nomes das páginas


// Inicializa (ou redimensiona) as variáveis de estado quando o número de páginas muda.
// Preserva os dados já digitados: se o usuário tinha 4 páginas e vai para 6,
// as 4 primeiras continuam intactas.
function initState(size) {
  const oldAdj   = adj.map(r => [...r]); // cópia profunda da matriz anterior
  const oldNames = [...names];

  n = size;

  // recria a matriz aproveitando os valores anteriores onde couberem; novas posições ficam 0
  adj = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i < oldAdj.length && j < oldAdj.length ? oldAdj[i][j] : 0
    )
  );

  // reaproveita os nomes anteriores; novos recebem nomes padrão como "P5", "P6"...
  names = Array.from({ length: n }, (_, i) =>
    i < oldNames.length ? oldNames[i] : `P${i + 1}`
  );
}


// Gera os campos de texto para nomear as páginas.
// Cria os elementos dinamicamente para a grade se ajustar quando n muda.
function renderNames() {
  const grid = document.getElementById('names-grid');
  grid.innerHTML = ''; // limpa o conteúdo anterior

  for (let i = 0; i < n; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'name-input-wrap';
    wrap.innerHTML = `<span class="name-index">${i + 1}.</span>`;

    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.value       = names[i];
    inp.maxLength   = 12;
    inp.placeholder = `P${i + 1}`;
    inp.dataset.idx = i; // guarda o índice no elemento para usar no evento

    // atualiza o array names em tempo real e re-renderiza a matriz para os
    // cabeçalhos ficarem sincronizados enquanto o usuário digita
    inp.addEventListener('input', e => {
      names[e.target.dataset.idx] = e.target.value || `P${+e.target.dataset.idx + 1}`;
      renderMatrix();
    });

    wrap.appendChild(inp);
    grid.appendChild(wrap);
  }
}


// Renderiza a tabela clicável da matriz de adjacência.
// O tamanho das células é calculado a partir da largura real do container
// para a matriz caber corretamente em qualquer tela (de celular a desktop).
function renderMatrix() {
  const wrap = document.getElementById('matrix-wrap');

  // em alguns navegadores clientWidth pode ser 0 antes do primeiro paint,
  // então tem um fallback que recalcula a partir do viewport
  const availW = (() => {
    const cw = wrap.clientWidth || wrap.offsetWidth;
    if (cw > 50) return cw;
    const vw = window.innerWidth;
    if (vw > 860) return 337; // desktop: painel de 380px menos o padding do card
    const mp = vw <= 500 ? 24 : 48; // padding do main muda no breakpoint de 500px
    return Math.max(200, vw - mp - 43); // desconta o padding do card (~43px)
  })();

  // usa espaçamentos menores para matrizes maiores
  const gap = n >= 10 ? 2 : n >= 7 ? 3 : 4;

  // resolve o tamanho ideal de célula pela equação:
  // headerW + n×célula + (n+2)×gap = availW, onde headerW ≈ 1.2 × célula
  const rawCell  = Math.floor((availW - (n + 2) * gap) / (n + 1.2));
  const cellSize = Math.max(16, Math.min(36, rawCell)); // limita entre 16px e 36px

  // calcula o headerW proporcional, evitando que ele absorva espaço demais
  // quando cellSize bate no limite de 36px (o que causava desalinhamento)
  const leftover = availW - n * cellSize - (n + 2) * gap;
  const headerW  = Math.max(24, Math.min(Math.round(cellSize * 1.2), leftover));
  const tableW   = headerW + n * cellSize + (n + 2) * gap;

  // define as variáveis CSS que controlam a aparência das células
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

  // define quantos caracteres cabem nos cabeçalhos de coluna e de linha
  const colMax = cellSize >= 28 ? 5 : cellSize >= 22 ? 3 : 2;
  const rowMax = headerW  >= 48 ? 7 : headerW  >= 36 ? 5 : headerW >= 26 ? 4 : 3;
  const trunc  = (name, max) => name.length > max ? name.slice(0, max - 1) + '…' : name;

  const table = document.createElement('table');
  table.className   = 'matrix-table';
  table.style.width = tableW + 'px'; // largura explícita necessária para table-layout:fixed funcionar

  // primeira linha: cabeçalhos de coluna (nomes das páginas no topo da tabela)
  const headRow  = document.createElement('tr');
  const cornerTh = document.createElement('th'); // célula vazia no canto superior esquerdo
  cornerTh.style.width = headerW + 'px';
  headRow.appendChild(cornerTh);

  for (let j = 0; j < n; j++) {
    const th = document.createElement('th');
    th.style.width = cellSize + 'px';
    th.textContent = trunc(names[j], colMax);
    th.title       = names[j]; // título aparece no hover com o nome completo
    headRow.appendChild(th);
  }
  table.appendChild(headRow);

  // linhas de dados: cada linha i representa os links que saem da página i
  for (let i = 0; i < n; i++) {
    const tr = document.createElement('tr');

    // rótulo da linha com o nome da página
    const th = document.createElement('th');
    th.className   = 'row-header';
    th.textContent = trunc(names[i], rowMax);
    th.title       = names[i];
    tr.appendChild(th);

    // células da linha: adj[i][j]=1 significa que página i tem link para j
    for (let j = 0; j < n; j++) {
      const td  = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'matrix-cell';
      btn.dataset.i = i;
      btn.dataset.j = j;

      if (i === j) {
        // diagonal principal: página não pode linkar para si mesma
        btn.classList.add('is-diag');
        btn.textContent = '−';
        btn.disabled    = true;
      } else {
        // células normais são clicáveis para alternar entre 0 e 1
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


// Alterna o valor de uma célula entre 0 e 1 quando clicada.
// Atualiza só o botão clicado em vez de re-renderizar a tabela inteira.
function toggleCell(e) {
  const btn = e.currentTarget;
  const i   = +btn.dataset.i; // o "+" converte a string do dataset para número
  const j   = +btn.dataset.j;

  adj[i][j] = 1 - adj[i][j]; // alterna entre 0 e 1

  btn.textContent = adj[i][j];
  btn.classList.toggle('is-0', adj[i][j] === 0);
  btn.classList.toggle('is-1', adj[i][j] === 1);
}


// trunca nomes longos para o grafo SVG, que tem espaço mais limitado
function shortName(name) {
  return name.length > 7 ? name.slice(0, 6) + '…' : name;
}


// Exibe a lista ordenada de páginas com o score de cada uma.
// Anima as barras de progresso e os números para tornar o resultado mais visual.
function renderRanking(scores, iterations) {
  const placeholder = document.getElementById('placeholder');
  const list        = document.getElementById('ranking-list');
  const badge       = document.getElementById('iters-badge');

  placeholder.style.display = 'none';
  list.innerHTML = '';
  list.classList.remove('hidden');

  // mostra quantas iterações o algoritmo precisou para convergir
  badge.textContent = `${iterations} iterações`;
  badge.classList.remove('hidden');

  // ordena as páginas do maior score para o menor
  const indexed = scores
    .map((s, i) => ({ i, s, name: names[i] }))
    .sort((a, b) => b.s - a.s);

  const maxScore = indexed[0].s; // usado para calcular o tamanho proporcional das barras

  indexed.forEach((entry, pos) => {
    const li = document.createElement('li');
    li.className            = pos === 0 ? 'rank-item rank-first' : 'rank-item';
    li.style.animationDelay = `${pos * 60}ms`; // escalonamento da animação de entrada

    // cor do ícone de posição: ouro para 1º, prata para 2º, bronze para 3º, roxo para os demais
    const posClass = pos === 0 ? 'gold' : pos === 1 ? 'silver' : pos === 2 ? 'bronze' : 'other';
    const pct      = ((entry.s / maxScore) * 100).toFixed(1); // percentual relativo ao 1º lugar

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

  // anima as barras e os números após o próximo frame de renderização,
  // para a transição CSS sair do width:0% inicial e criar o efeito de crescimento
  requestAnimationFrame(() => {
    document.querySelectorAll('.rank-bar').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });

    // conta os números de 0 até o valor final com easing cúbico
    document.querySelectorAll('.rank-score').forEach(el => {
      const target = parseFloat(el.dataset.score);
      const t0     = performance.now();
      const dur    = 750; // duração em ms

      (function tick(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3); // curva de desaceleração
        el.textContent = (target * ease).toFixed(2) + '%';
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  });
}


// namespace necessário para criar elementos SVG via JavaScript
const SVG_NS = 'http://www.w3.org/2000/svg';

// cria um elemento SVG com os atributos passados de uma vez
function el(tag, attrs = {}, text = null) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== null) e.textContent = text;
  return e;
}

// paleta de cores para os nós — posição 0 é o 1º lugar (mais escuro), últimos ficam mais claros
const PALETTE = ['#4338ca', '#6d28d9', '#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'];


// Desenha o grafo de rede com os nós em círculo e arestas curvas representando os links.
// Nós maiores indicam maior PageRank. Usa SVG puro, sem bibliotecas externas.
function drawGraph(scores) {
  const svg    = document.getElementById('graph-svg');
  const W      = svg.clientWidth  || 480;
  const H      = svg.clientHeight || 360;
  const cx     = W / 2;
  const cy     = H / 2;
  const radius = Math.min(W, H) * 0.36; // raio do círculo onde os nós são posicionados

  svg.style.opacity    = '0';
  svg.style.transition = 'opacity .5s ease';
  svg.innerHTML        = '';

  // posiciona cada nó em coordenadas polares distribuídas igualmente no círculo.
  // começa pelo topo (−π/2) para o primeiro nó ficar na posição 12h.
  const pos = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  // raio de cada nó proporcional ao seu score: varia entre 18px e 38px
  const maxS  = Math.max(...scores);
  const nodeR = scores.map(s => 18 + (s / maxS) * 20);

  // monta um dicionário {índice da página → posição no ranking}
  const rankOf = scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .reduce((acc, { i }, rank) => { acc[i] = rank; return acc; }, {});

  // definições SVG: marcadores de seta e filtro de sombra
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

  // desenha as arestas antes dos nós para os círculos ficarem por cima das setas
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && adj[i][j] === 1) {
        // passa true no último parâmetro se existir link nos dois sentidos
        drawEdge(svg, pos[i], pos[j], nodeR[i], nodeR[j], adj[j][i] === 1);
      }
    }
  }

  // desenha os nós (círculo + nome + badge de posição)
  for (let i = 0; i < n; i++) {
    const rank  = rankOf[i];
    const color = PALETTE[Math.min(rank, PALETTE.length - 1)];
    const p     = pos[i];
    const r     = nodeR[i];
    const label = names[i].length > 7 ? names[i].slice(0, 6) + '…' : names[i];

    const g = el('g');

    // sombra: círculo levemente deslocado e semi-transparente
    g.appendChild(el('circle', { cx: p.x + 2, cy: p.y + 3, r, fill: '#00000018' }));

    // círculo principal
    g.appendChild(el('circle', {
      cx: p.x, cy: p.y, r,
      fill: color, stroke: '#fff', 'stroke-width': 2.5, filter: 'url(#shadow)',
    }));

    // nome da página dentro do círculo
    g.appendChild(el('text', {
      x: p.x, y: p.y + 4,
      'text-anchor': 'middle',
      fill: '#fff',
      'font-size': r > 28 ? 11 : 9,
      'font-weight': 'bold',
      'font-family': 'system-ui, sans-serif',
    }, label));

    // badge com o número do ranking no canto superior direito do nó
    const bx = p.x + r * 0.68;
    const by = p.y - r * 0.68;
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

  // dois frames antes de ativar o fade-in — um frame não é suficiente em alguns browsers
  requestAnimationFrame(() => requestAnimationFrame(() => { svg.style.opacity = '1'; }));
}


// Desenha uma aresta curva entre dois nós.
// Usa curvas de Bézier quadráticas para as arestas ficarem mais legíveis.
// Quando existem links nos dois sentidos, desloca as duas arestas lateralmente
// para não ficarem sobrepostas.
function drawEdge(svg, from, to, r1, r2, bidir) {
  const dx  = to.x - from.x;
  const dy  = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux  = dx / len; // componente x do vetor unitário
  const uy  = dy / len; // componente y do vetor unitário
  const px  = -uy;      // vetor perpendicular (rotacionado 90°)

  const offset = bidir ? 10 : 0; // deslocamento lateral para arestas bidirecionais

  // ponto de início na borda do nó de origem
  const sx = from.x + ux * r1       + px * offset;
  const sy = from.y + uy * r1       + ux * offset;

  // ponto de fim na borda do nó de destino (−7 por causa do tamanho da ponta de seta)
  const ex = to.x - ux * (r2 + 7) + px * offset;
  const ey = to.y - uy * (r2 + 7) + ux * offset;

  // ponto de controle da curva: ponto médio deslocado perpendicularmente
  const mx = (sx + ex) / 2 - uy * 14;
  const my = (sy + ey) / 2 + ux * 14;

  svg.appendChild(el('path', {
    d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, // curva de Bézier quadrática
    fill: 'none',
    stroke: bidir ? '#a5b4fc' : '#94a3b8', // azulado se bidirecional, cinza se unidirecional
    'stroke-width': 1.6,
    'marker-end': `url(#${bidir ? 'arr-hi' : 'arr'})`,
    opacity: 0.85,
  }));
}


// dois exemplos pré-definidos para demonstração
const EXAMPLES = [
  {
    names: ['P1', 'P2', 'P3', 'P4'],
    adj: [
      [0, 1, 1, 0], // P1 aponta para P2 e P3
      [0, 0, 1, 0], // P2 aponta para P3
      [1, 0, 0, 0], // P3 aponta para P1
      [1, 1, 1, 0], // P4 aponta para P1, P2 e P3
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
let exampleIdx = 0; // controla qual exemplo carregar ao clicar "Exemplo" novamente


// carrega o próximo exemplo da lista em ciclo, alternando entre os dois disponíveis
function loadExample() {
  const ex = EXAMPLES[exampleIdx % EXAMPLES.length];
  exampleIdx++;

  n     = ex.names.length;
  names = [...ex.names];
  adj   = ex.adj.map(r => [...r]); // cópia profunda para não modificar o objeto original

  document.getElementById('n-input').value = n;
  renderNames();
  renderMatrix();
  clearResults();
}


// lê os nomes mais recentes dos inputs, roda o PageRank e exibe ranking + grafo
function calculate() {
  // garante que o array names está sincronizado com o que está nos campos de texto
  document.querySelectorAll('.name-input-wrap input').forEach(inp => {
    names[+inp.dataset.idx] = inp.value.trim() || `P${+inp.dataset.idx + 1}`;
  });

  const d = parseFloat(document.getElementById('d-slider').value);
  const { scores, iterations } = computePageRank(adj, d);

  renderRanking(scores, iterations);
  drawGraph(scores);
}


// volta a interface para o estado inicial (sem resultados exibidos)
function clearResults() {
  document.getElementById('placeholder').style.display = '';
  document.getElementById('ranking-list').innerHTML    = '';
  document.getElementById('ranking-list').classList.add('hidden');
  document.getElementById('iters-badge').classList.add('hidden');
  document.getElementById('graph-svg').innerHTML       = '';
}


// muda o número de páginas respeitando o intervalo válido [2, 12]
function setN(value) {
  value = Math.max(2, Math.min(12, value));
  document.getElementById('n-input').value = value;
  initState(value);
  renderNames();
  renderMatrix();
  clearResults();
}


// aguarda o HTML estar completamente carregado antes de inicializar tudo
document.addEventListener('DOMContentLoaded', () => {

  initState(4);
  renderNames();
  renderMatrix();

  // re-renderiza a matriz quando a janela é redimensionada.
  // o debounce de 120ms evita recalcular a cada pixel durante o resize.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderMatrix, 120);
  });

  // botões de incremento e decremento do número de páginas
  document.getElementById('btn-dec').addEventListener('click', () => setN(n - 1));
  document.getElementById('btn-inc').addEventListener('click', () => setN(n + 1));
  document.getElementById('n-input').addEventListener('change', e => setN(+e.target.value));

  // slider do fator de amortecimento
  const slider = document.getElementById('d-slider');
  const dVal   = document.getElementById('d-val');

  function updateSlider() {
    // calcula o percentual para colorir a trilha preenchida do slider via CSS
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--pct', pct + '%');
    dVal.textContent = parseFloat(slider.value).toFixed(2);
  }
  slider.addEventListener('input', updateSlider);
  updateSlider(); // roda uma vez para inicializar o visual do slider

  // alternância de tema claro/escuro
  const themeBtn = document.getElementById('btn-theme');
  const root     = document.documentElement;

  function setTheme(dark) {
    root.setAttribute('data-theme', dark ? 'dark' : '');
    localStorage.setItem('pr-theme', dark ? 'dark' : 'light'); // persiste a preferência
  }

  // carrega a preferência salva, ou usa a preferência do sistema operacional
  const saved = localStorage.getItem('pr-theme');
  setTheme(saved
    ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  themeBtn.addEventListener('click', () => {
    setTheme(root.getAttribute('data-theme') !== 'dark');
  });

  // botão limpar: zera toda a matriz sem alterar n nem os nomes
  document.getElementById('btn-clear').addEventListener('click', () => {
    adj = Array.from({ length: n }, () => new Array(n).fill(0));
    renderMatrix();
    clearResults();
  });

  document.getElementById('btn-example').addEventListener('click', loadExample);
  document.getElementById('btn-calc').addEventListener('click', calculate);
});
