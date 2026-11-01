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
