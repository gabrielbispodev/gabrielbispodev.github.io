document.documentElement.classList.add('js');

// Menu do celular
const abrir = document.querySelector('.nav__abrir');
const links = document.querySelectorAll('.nav__links a');
abrir.addEventListener('click', () => {
  abrir.setAttribute('aria-expanded', abrir.getAttribute('aria-expanded') !== 'true');
});
links.forEach(a => a.addEventListener('click', () => abrir.setAttribute('aria-expanded', 'false')));

// Engrenagem: tema, cor de destaque e idioma, guardados no navegador
const raiz = document.documentElement;
const engrenagem = document.querySelector('.config__abrir');
const painel = document.getElementById('config-painel');
const CHAVE = 'frame-preferencias';
const PADRAO = { tema: 'escuro', cor: 'zinco', idioma: 'pt' };
let prefs = { ...PADRAO };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(CHAVE))); } catch (e) {}
// Só aceita valores que existem no painel (o localStorage pode ter lixo)
for (const k in PADRAO) {
  if (typeof prefs[k] !== 'string' || !painel.querySelector(`[data-${k}="${CSS.escape(prefs[k])}"]`)) prefs[k] = PADRAO[k];
}

// Textos em inglês ficam em data-en (HTML do próprio site); o português original é guardado na primeira troca
const traduziveis = document.querySelectorAll('[data-en]');
const rotulosAria = document.querySelectorAll('[data-en-aria-label]');
const META = {
  pt: { titulo: document.title, descricao: document.querySelector('meta[name="description"]').content },
  en: { titulo: 'Gabriel Bispo — Web Developer', descricao: 'Portfolio — placeholder text.' },
};
traduziveis.forEach(el => { el.dataset.pt = el.innerHTML; });
rotulosAria.forEach(el => { el.dataset.ptAriaLabel = el.getAttribute('aria-label'); });

// Botões "Pedir orçamento": com o número preenchido abrem o WhatsApp com a mensagem pronta;
// sem número, continuam levando para a seção Contato.
const WHATSAPP = '5519999801423'; // só dígitos, com DDI e DDD. Ex.: 5511999999999
const ctas = document.querySelectorAll('.plano__cta');
function atualizarCtas() {
  if (!WHATSAPP) return;
  ctas.forEach(a => {
    const plano = a.closest('.plano').querySelector('h3').textContent;
    const texto = prefs.idioma === 'en'
      ? `Hi, Gabriel! I'd like a quote for: ${plano}.`
      : `Olá, Gabriel! Quero um orçamento de: ${plano}.`;
    a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
    a.target = '_blank'; a.rel = 'noopener';
  });
}

function aplicarPrefs() {
  raiz.dataset.tema = prefs.tema;
  raiz.dataset.cor = prefs.cor;
  raiz.lang = prefs.idioma === 'en' ? 'en' : 'pt-BR';
  traduziveis.forEach(el => { el.innerHTML = el.dataset[prefs.idioma]; });
  rotulosAria.forEach(el => el.setAttribute('aria-label', prefs.idioma === 'en' ? el.dataset.enAriaLabel : el.dataset.ptAriaLabel));
  document.dispatchEvent(new Event('frame:prefs')); // o placar do rodapé troca de idioma
  document.title = META[prefs.idioma].titulo;
  document.querySelector('meta[name="description"]').content = META[prefs.idioma].descricao;
  painel.querySelectorAll('button').forEach(b => {
    const [chave] = Object.keys(b.dataset);
    b.setAttribute('aria-pressed', prefs[chave] === b.dataset[chave]);
  });
  atualizarCtas();
}
aplicarPrefs();

painel.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const [chave] = Object.keys(b.dataset);
  prefs[chave] = b.dataset[chave];
  try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch (e) {}
  aplicarPrefs();
});

function abrirPainel(abrir) {
  painel.hidden = !abrir;
  engrenagem.setAttribute('aria-expanded', abrir);
}
engrenagem.addEventListener('click', () => abrirPainel(painel.hidden));
document.addEventListener('click', e => { if (!e.target.closest('.config')) abrirPainel(false); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !painel.hidden) { abrirPainel(false); engrenagem.focus(); }
});

// Raios de haki atrás do hero: zigue-zagues com miolo preto e borda vermelha brilhante,
// que surgem, tremulam e somem (efeito inspirado nos raios de "haki" de anime).
// Sempre preto e vermelho, independente da cor de destaque escolhida.
(() => {
  const tela = document.querySelector('.hero__haki');
  const ctx = tela.getContext('2d');
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cor = '#ff1a2e';
  let W = 0, H = 0, raios = [], proximo = 0, visivel = true, quadro = 0;

  const ajustar = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = tela.clientWidth; H = tela.clientHeight;
    tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const sorteio = (a, b) => a + Math.random() * (b - a);

  // Linha quebrada por deslocamento do ponto médio: cada divisão empurra o meio para o lado
  function zigue(x1, y1, x2, y2, desvio, nivel) {
    if (nivel === 0) return [[x1, y1], [x2, y2]];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const len = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const d = sorteio(-desvio, desvio);
    const a = zigue(x1, y1, mx + nx * d, my + ny * d, desvio / 1.8, nivel - 1);
    const b = zigue(mx + nx * d, my + ny * d, x2, y2, desvio / 1.8, nivel - 1);
    return a.concat(b.slice(1));
  }

  function novoRaio(agora) {
    // atravessa o hero na diagonal, de um lado ao outro
    const esq = Math.random() < .5;
    const x1 = esq ? sorteio(-.1, .25) * W : sorteio(.75, 1.1) * W;
    const x2 = esq ? sorteio(.55, 1.1) * W : sorteio(-.1, .45) * W;
    const pontos = zigue(x1, sorteio(0, .5) * H, x2, sorteio(.5, 1) * H, Math.min(W, H) * .22, 6);
    const galhos = [];
    for (let i = 0; i < 3; i++) {
      const [px, py] = pontos[Math.floor(sorteio(.2, .8) * pontos.length)];
      galhos.push(zigue(px, py, px + sorteio(-.25, .25) * W, py + sorteio(.05, .3) * H, Math.min(W, H) * .07, 4));
    }
    return { pontos, galhos, nasce: agora, vida: sorteio(1200, 2000), largura: sorteio(7, 12) };
  }

  function traco(pontos, largura, estilo, brilho) {
    ctx.beginPath();
    pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = largura; ctx.strokeStyle = estilo; ctx.shadowBlur = brilho; ctx.shadowColor = cor;
    ctx.stroke();
  }

  function desenhar(agora) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    raios = raios.filter(r => agora - r.nasce < r.vida);
    for (const r of raios) {
      const t = (agora - r.nasce) / r.vida;
      // clarão ao nascer, tremulação no meio, some no fim
      ctx.globalAlpha = (t < .08 ? 1 : (1 - t) * (.75 + .25 * Math.sin(agora / 70 + r.largura))) * .9;
      for (const linha of [r.pontos, ...r.galhos]) {
        const l = linha === r.pontos ? r.largura : r.largura * .5;
        traco(linha, l + 5, cor, 30);       // borda brilhante
        traco(linha, l, '#050505', 0);      // miolo preto
      }
    }
    ctx.globalAlpha = 1;
  }

  function animar(agora) {
    if (agora > proximo && raios.length < 3) {
      raios.push(novoRaio(agora));
      proximo = agora + sorteio(1000, 2000);
    }
    desenhar(agora);
    quadro = visivel ? requestAnimationFrame(animar) : 0;
  }

  // Quadro fixo para quem pede menos movimento: dois raios parados
  const quadroFixo = () => { raios = [novoRaio(0), novoRaio(0)]; raios.forEach(r => { r.vida = Infinity; }); desenhar(1); };

  addEventListener('resize', () => { ajustar(); if (parado) quadroFixo(); });
  ajustar();
  if (parado) { quadroFixo(); return; }
  // Só anima enquanto o hero está na tela
  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
    if (visivel && !quadro) quadro = requestAnimationFrame(animar);
  }).observe(tela.parentElement);
})();

// Nav vira pílula depois que a página rola
const topo = document.querySelector('.topo');
const marcarRolagem = () => topo.classList.toggle('rolado', scrollY > 40);
addEventListener('scroll', marcarRolagem, { passive: true });
marcarRolagem();

// Link ativo conforme a seção na tela
const spy = new IntersectionObserver(entradas => {
  entradas.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.hash === '#' + e.target.id
      ? a.setAttribute('aria-current', 'true')
      : a.removeAttribute('aria-current'));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach(s => spy.observe(s));

// Entrada ao rolar
const revela = new IntersectionObserver(entradas => {
  entradas.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visivel'); revela.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.revelar').forEach(el => revela.observe(el));

// Planos com movimento "físico": inclinam na direção do mouse, sobem um pouco e voltam com uma mola.
// Só em telas com mouse e para quem não pediu menos movimento.
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const MAX = 7, MOLA = .09, ATRITO = .78; // graus de inclinação; força e amortecimento da mola
  const cartoes = [...document.querySelectorAll('.plano')].map(el => ({
    el, atual: { rx: 0, ry: 0, sobe: 0, luz: 0 }, vel: { rx: 0, ry: 0, sobe: 0, luz: 0 }, alvo: { rx: 0, ry: 0, sobe: 0, luz: 0 },
  }));
  let rodando = false;

  function passo() {
    let mexendo = false;
    for (const c of cartoes) {
      for (const k in c.alvo) {
        c.vel[k] = (c.vel[k] + (c.alvo[k] - c.atual[k]) * MOLA) * ATRITO;
        c.atual[k] += c.vel[k];
        if (Math.abs(c.vel[k]) > .001 || Math.abs(c.alvo[k] - c.atual[k]) > .001) mexendo = true;
      }
      const s = c.el.style;
      s.setProperty('--rx', c.atual.rx.toFixed(2) + 'deg');
      s.setProperty('--ry', c.atual.ry.toFixed(2) + 'deg');
      s.setProperty('--sobe', c.atual.sobe.toFixed(2) + 'px');
      s.setProperty('--luz', Math.max(0, Math.min(1, c.atual.luz)).toFixed(3));
    }
    rodando = mexendo && requestAnimationFrame(passo);
  }
  const animar = () => { if (!rodando) rodando = requestAnimationFrame(passo); };

  for (const c of cartoes) {
    c.el.addEventListener('pointermove', e => {
      const r = c.el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; // 0 a 1
      c.alvo.ry = (x - .5) * 2 * MAX;
      c.alvo.rx = (.5 - y) * 2 * MAX;
      c.alvo.sobe = -6; c.alvo.luz = 1;
      c.el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      c.el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      animar();
    });
    c.el.addEventListener('pointerleave', () => {
      Object.assign(c.alvo, { rx: 0, ry: 0, sobe: 0, luz: 0 });
      animar();
    });
  }
}

// Filtro de projetos
const filtros = document.querySelectorAll('[data-filtro]');
filtros.forEach(botao => botao.addEventListener('click', () => {
  const tipo = botao.dataset.filtro;
  filtros.forEach(b => b.setAttribute('aria-pressed', b === botao));
  document.querySelectorAll('.projeto').forEach(p => {
    p.hidden = tipo !== 'todos' && p.dataset.tipo !== tipo;
  });
}));

// Voltar ao topo: aparece depois de rolar uma tela
const voltar = document.querySelector('.voltar-topo');
const mostrarVoltar = () => voltar.classList.toggle('visivel', scrollY > innerHeight * .8);
addEventListener('scroll', mostrarVoltar, { passive: true });
mostrarVoltar();
voltar.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));

// Rodapé: eu em pixel art (eu-mesa.webp, de terno no banquinho) digitando na mesa. Cada clique é uma tarefa:
// digito mais rápido, sai código do notebook e um trabalho pronto cai nas pilhas do chão (papel, pasta ou janela).
// Pilhas cheias = deploy: sobem como foguete, conta um projeto entregue e o café é reposto. Parado, eu cochilo.
(() => {
  const botao = document.querySelector('.trabalho');
  const tela = botao.querySelector('canvas');
  const placar = document.querySelector('.trabalho__placar');
  const c = tela.getContext('2d');
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // a tela tem 480 x 300 px e desenha em unidades de 3 px (160 x 100); a imagem mantém a resolução dela
  const ESC = 3, W = 160, H = 100;
  const EU = { x: 4, y: 10, w: 92.3, h: 88 };   // onde a imagem entra
  const TAMPO = 49, CHAO = 98;                   // altura do tampo da mesa e do chão
  const ROSTO = { x: 13, y: 12, w: 20, h: 22 };  // luz da tela no rosto
  const MAOS = { x: 33, y: 39, w: 13, h: 8 };    // mãos no teclado (balançam ao digitar)
  const LOGO = { x: 54, y: 41 };                 // logo na tampa do notebook
  const COL = 9, PILHAS = [102, 121, 140], MAX = COL * PILHAS.length;
  const COR = { X: '#ece8df', x: '#b8b2a6', K: '#e8e4dc', k: '#4a2c1a', l: '#2a2c33', V: '#8fd3ff' };
  const GLIFOS = {
    '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'], '/': ['..#', '..#', '.#.', '#..', '#..'],
    '{': ['.##', '.#.', '#..', '.#.', '.##'], '}': ['##.', '.#.', '..#', '.#.', '##.'], ';': ['.#.', '...', '.#.', '.#.', '#..'],
    z: ['###', '..#', '.#.', '#..', '###'], ok: ['....#', '...#.', '#.#..', '.#...'],
  };
  const CODIGO = ['<', '>', '/', '{', '}', ';'];
  const est = { tarefas: 0, entregues: 0, pilha: [], energia: 0, cafe: 1, quadro: 0, proxQuadro: 0, ultimo: performance.now(), deploy: 0, part: [] };
  let acento = '#e4e4e7';
  const lerAcento = () => { acento = getComputedStyle(raiz).getPropertyValue('--acento').trim() || acento; };
  const eu = new Image();
  eu.src = 'eu-mesa.webp';
  eu.onload = () => desenhar(performance.now());
  // recorte da imagem que corresponde a uma área da cena (para redesenhar só as mãos)
  const fonte = r => [(r.x - EU.x) / EU.w * eu.naturalWidth, (r.y - EU.y) / EU.h * eu.naturalHeight, r.w / EU.w * eu.naturalWidth, r.h / EU.h * eu.naturalHeight];

  const px = (x, y, cor) => { c.fillStyle = cor; c.fillRect(x, y, 1, 1); };
  const ret = (x, y, w, h, cor) => { c.fillStyle = cor; c.fillRect(x, y, w, h); };
  const glifo = (g, x, y, cor) => GLIFOS[g].forEach((l, j) => [...l].forEach((ch, i) => ch === '#' && px(x + i, y + j, cor)));

  function item(tipo, x, y) { // um trabalho pronto, 16 x 3
    if (tipo === 0) { ret(x, y, 16, 2, COR.X); ret(x + 2, y, 9, 1, COR.x); }             // papel com texto
    else if (tipo === 1) { ret(x, y, 16, 2, acento); ret(x, y, 5, 1, COR.K); }           // pasta
    else { ret(x, y, 16, 2, COR.l); ret(x, y, 16, 1, acento); px(x + 1, y, COR.l); }     // janela de navegador
    ret(x + 1, y + 2, 15, 1, 'rgba(0,0,0,.45)');                                         // sombra entre os itens
  }

  function desenhar(t) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, tela.width, tela.height);
    c.setTransform(ESC, 0, 0, ESC, 0, 0);
    c.imageSmoothingEnabled = false;
    const dormindo = !parado && t - est.ultimo > 9000 && !est.deploy;
    if (eu.complete && eu.naturalWidth) {
      c.drawImage(eu, EU.x, EU.y, EU.w, EU.h);
      // luz da tela no rosto: só pinta onde já tem imagem
      c.globalCompositeOperation = 'source-atop';
      const g = c.createRadialGradient(ROSTO.x + ROSTO.w, ROSTO.y + ROSTO.h * .6, 1, ROSTO.x + ROSTO.w, ROSTO.y + ROSTO.h * .6, ROSTO.w);
      g.addColorStop(0, acento); g.addColorStop(1, 'transparent');
      c.globalAlpha = dormindo ? .06 : .14 + est.energia * .22;
      c.fillStyle = g; c.fillRect(ROSTO.x, ROSTO.y, ROSTO.w + 8, ROSTO.h);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // mãos digitando: o trecho das mãos sobe 1 px nos quadros alternados
      if (est.quadro && !dormindo) c.drawImage(eu, ...fonte(MAOS), MAOS.x, MAOS.y - 1 / ESC * 2, MAOS.w, MAOS.h);
    }
    // logo da tampa acende na cor de destaque
    c.globalAlpha = .25 + est.energia * .6;
    ret(LOGO.x, LOGO.y, 2, 2, acento);
    c.globalAlpha = 1;
    // suor quando estou no gás
    if (est.energia > .7 && !dormindo) { px(34, 16, COR.V); px(34, 17, COR.V); }
    // café no tampo: o nível baixa a cada tarefa; com café, sai vapor
    const mx = 68, my = TAMPO - 6;
    ret(mx, my, 6, 6, COR.K); ret(mx + 6, my + 1, 2, 1, COR.K); ret(mx + 7, my + 2, 1, 2, COR.K); ret(mx + 6, my + 4, 2, 1, COR.K);
    const nivel = Math.round(est.cafe * 4);
    if (nivel) ret(mx + 1, my + 5 - nivel, 4, nivel, COR.k);
    if (est.cafe > 0 && !parado) {
      const v = Math.floor(t / 300) % 2;
      ret(mx + 2 + v, my - 3, 1, 2, 'rgba(255,255,255,.35)'); ret(mx + 4 - v, my - 5, 1, 2, 'rgba(255,255,255,.35)');
    }
    // pilhas de trabalho pronto no chão (no deploy, sobem como foguete deixando rastro de fogo)
    est.pilha.forEach((p, i) => {
      const x = PILHAS[Math.floor(i / COL)], base = CHAO - 3 * (i % COL + 1);
      let y = base - p.cai;
      if (est.deploy) {
        const d = Math.max(0, t - est.deploy - (i % COL) * 30);
        y -= d * d / 2500;
        if (y < base - 1) ret(x + 5, y + 3, 6, 3, `rgba(255,170,60,${Math.random() * .6 + .3})`);
      }
      if (y > -4) item(p.tipo, x, Math.round(y));
    });
    // partículas: código saindo do notebook, confete do deploy, "z" do cochilo
    est.part.forEach(p => {
      c.globalAlpha = Math.max(0, p.vida);
      if (p.g) glifo(p.g, Math.round(p.x), Math.round(p.y), p.cor); else px(Math.round(p.x), Math.round(p.y), p.cor);
    });
    c.globalAlpha = 1;
    return dormindo;
  }

  function passo(t, dt) {
    est.energia = Math.max(0, est.energia - dt / 4000);
    if (t >= est.proxQuadro) { est.quadro ^= 1; est.proxQuadro = t + 420 - est.energia * 340; }
    est.pilha.forEach(p => { if (p.cai > 0) p.cai = Math.max(0, p.cai - dt * .12); });
    est.part.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.g) p.vy += .00015 * dt; p.vida -= dt / p.dura; });
    est.part = est.part.filter(p => p.vida > 0);
    if (est.deploy && t - est.deploy > 1400) { est.deploy = 0; est.pilha = []; est.entregues++; est.cafe = 1; atualizarPlacar(); }
  }

  function atualizarPlacar() {
    placar.textContent = prefs.idioma === 'en'
      ? `Tasks: ${est.tarefas} · Projects shipped: ${est.entregues}`
      : `Tarefas: ${est.tarefas} · Projetos entregues: ${est.entregues}`;
  }

  botao.addEventListener('click', () => {
    const t = performance.now();
    est.ultimo = t;
    if (est.deploy) return; // durante o deploy as pilhas estão voando
    est.tarefas++;
    est.energia = Math.min(1, est.energia + .22);
    est.cafe = Math.max(0, est.cafe - .04);
    est.quadro ^= 1;
    est.pilha.push({ tipo: est.tarefas % 3, cai: parado ? 0 : 30 });
    if (!parado) est.part.push({ g: CODIGO[est.tarefas % 6], x: 55 + Math.random() * 8, y: 30, vx: (Math.random() - .5) * .02, vy: -.03, vida: 1, dura: 900, cor: acento });
    if (est.pilha.length >= MAX) {
      if (parado) { est.pilha = []; est.entregues++; est.cafe = 1; }
      else {
        est.deploy = t;
        for (let i = 0; i < 50; i++) est.part.push({ x: PILHAS[i % 3] + 8, y: CHAO - 3 * COL, vx: (Math.random() - .5) * .12, vy: -Math.random() * .1, vida: 1, dura: 1300, cor: i % 2 ? acento : ['#ffd166', '#06d6a0', '#ef476f', '#ffffff'][i % 4] });
        est.part.push({ g: 'ok', x: 128, y: 40, vx: 0, vy: -.01, vida: 1, dura: 1600, cor: '#22c55e' });
      }
    }
    atualizarPlacar();
    if (parado) desenhar(t);
  });
  document.addEventListener('frame:prefs', () => { lerAcento(); atualizarPlacar(); desenhar(performance.now()); });

  lerAcento();
  atualizarPlacar();
  desenhar(performance.now());
  if (parado) return;
  let ativo = false, antes = 0, proxZ = 0;
  function laco(t) {
    if (!ativo) return;
    const dt = Math.min(64, t - (antes || t)); antes = t;
    passo(t, dt);
    if (desenhar(t) && t > proxZ) { est.part.push({ g: 'z', x: 32, y: 8, vx: .006, vy: -.01, vida: 1, dura: 1800, cor: '#a9a6b3' }); proxZ = t + 1200; }
    requestAnimationFrame(laco);
  }
  new IntersectionObserver(([e]) => { ativo = e.isIntersecting; if (ativo) { antes = 0; requestAnimationFrame(laco); } }).observe(tela);
})();
