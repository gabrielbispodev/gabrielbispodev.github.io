// Menu sanduíche
const botaoMenu = document.querySelector('.topo__menu');
const menu = document.getElementById('menu');
botaoMenu.addEventListener('click', () => {
  const aberto = menu.classList.toggle('aberto');
  botaoMenu.setAttribute('aria-expanded', aberto);
  botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
});
menu.addEventListener('click', (e) => { if (e.target.closest('a')) botaoMenu.click(); });

// Hero: troca de destaque com fade, sozinho a cada 6 s
const slides = [...document.querySelectorAll('.hero__slide')];
let atual = 0;
function mostrar(i) {
  atual = (i + slides.length) % slides.length;
  slides.forEach((s, k) => {
    const ativo = k === atual;
    s.classList.toggle('ativo', ativo);
    s.toggleAttribute('aria-hidden', !ativo);
    s.querySelector('a').tabIndex = ativo ? 0 : -1;
  });
}
document.querySelectorAll('[data-hero]').forEach((b) =>
  b.addEventListener('click', () => { mostrar(atual + Number(b.dataset.hero)); reiniciar(); }));
let timer;
const reiniciar = () => {
  clearInterval(timer);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => mostrar(atual + 1), 6000);
};
reiniciar();

// Hero: libera a entrada do texto depois do primeiro quadro
requestAnimationFrame(() => requestAnimationFrame(() =>
  document.querySelector('.hero').classList.add('pronto')));

// Surgimento: quando um grupo entra na tela, seus itens aparecem em sequência
const PASSO = 90;
const itensDe = (grupo) => [...grupo.querySelectorAll('[data-surgir]')]
  .filter((el) => el.closest('[data-surgir-grupo]') === grupo);
function revelar(grupo) {
  observador.unobserve(grupo);
  const itens = itensDe(grupo);
  itens.forEach((el, i) => {
    el.style.setProperty('--atraso', `${i * PASSO}ms`);
    el.classList.add('visivel');
  });
  // Tira o atraso no fim, para o hover dos cartões responder na hora
  setTimeout(() => itens.forEach((el) => el.style.removeProperty('--atraso')), 1600 + itens.length * PASSO);
}
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => { if (e.isIntersecting) revelar(e.target); });
}, { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('[data-surgir-grupo]').forEach((g) => observador.observe(g));

// Abas do cardápio (setas do teclado como no padrão ARIA de tabs)
const abas = [...document.querySelectorAll('[role="tab"]')];
function abrirAba(nome) {
  abas.forEach((t) => {
    const sel = t.dataset.aba === nome;
    t.setAttribute('aria-selected', sel);
    t.tabIndex = sel ? 0 : -1;
    const painel = document.getElementById(t.getAttribute('aria-controls'));
    if (!sel) { painel.hidden = true; return; }
    if (!painel.hidden) return;
    // Aba trocada: os cartões surgem de novo, se o cardápio estiver na tela
    const revelado = painel.querySelector('.visivel');
    itensDe(painel).forEach((el) => el.classList.remove('visivel'));
    painel.hidden = false;
    painel.scrollLeft = 0;
    const r = painel.getBoundingClientRect();
    if (r.top < innerHeight * .88 && r.bottom > 0) { void painel.offsetWidth; revelar(painel); }
    else if (revelado) observador.observe(painel);
  });
  atualizarSetas();
}
abas.forEach((t, i) => {
  t.addEventListener('click', () => abrirAba(t.dataset.aba));
  t.addEventListener('keydown', (e) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!passo) return;
    const prox = abas[(i + passo + abas.length) % abas.length];
    prox.focus(); abrirAba(prox.dataset.aba);
  });
});
// Links "Peça agora" do hero e da história abrem a aba certa
document.querySelectorAll('a[data-aba]').forEach((a) =>
  a.addEventListener('click', () => abrirAba(a.dataset.aba)));

// Setas do trilho rolam a aba visível
const setas = [...document.querySelectorAll('[data-trilho]')];
function atualizarSetas() {
  const t = document.querySelector('.trilho:not([hidden])');
  if (!t) return;
  const fim = t.scrollWidth - t.clientWidth - 2;
  setas.forEach((b) => { b.disabled = Number(b.dataset.trilho) < 0 ? t.scrollLeft <= 2 : t.scrollLeft >= fim; });
}
setas.forEach((b) => b.addEventListener('click', () => {
  const trilho = document.querySelector('.trilho:not([hidden])');
  trilho.scrollBy({ left: Number(b.dataset.trilho) * trilho.clientWidth * 0.8, behavior: 'smooth' });
}));
addEventListener('resize', atualizarSetas);

// Trilho: arrastar com o mouse (no toque a rolagem já é nativa)
document.querySelectorAll('.trilho').forEach((t) => {
  let ativo = false, moveu = false, inicio = 0, base = 0;
  t.addEventListener('scroll', atualizarSetas, { passive: true });
  t.addEventListener('dragstart', (e) => e.preventDefault());
  t.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button) return;
    ativo = true; moveu = false; inicio = e.clientX; base = t.scrollLeft;
  });
  addEventListener('pointermove', (e) => {
    if (!ativo) return;
    const d = e.clientX - inicio;
    if (Math.abs(d) > 6) { moveu = true; t.classList.add('arrastando'); }
    if (moveu) t.scrollLeft = base - d;
  });
  addEventListener('pointerup', () => { ativo = false; t.classList.remove('arrastando'); });
  t.addEventListener('click', (e) => { if (moveu) { e.preventDefault(); moveu = false; } }, true);
});
atualizarSetas();

// Carrossel: gira sozinho, freia sob o mouse, leva empurrão do movimento e arrasta com inércia
const giro = document.querySelector('.giro');
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const trilha = giro.querySelector('.giro__trilha');
  trilha.append(...[...trilha.children].map((item) => {
    const copia = item.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    copia.tabIndex = -1;
    return copia;
  }));
  giro.classList.add('giro--vivo');
  const CRUZEIRO = -58;
  let x = 0, v = CRUZEIRO, freado = false, arrasto = null, arrastou = false, visivel = true, antes = 0;
  const volta = () => trilha.scrollWidth / 2 + 9;
  function girar(agora) {
    const dt = Math.min((agora - antes) / 1000, 1 / 20) || 1 / 60;
    antes = agora;
    if (!arrasto) {
      v += ((freado ? 0 : CRUZEIRO) - v) * (1 - Math.exp(-dt * (freado ? 5 : 2)));
      x += v * dt;
    }
    const L = volta();
    if (x <= -L) x += L; else if (x > 0) x -= L;
    trilha.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    if (visivel) requestAnimationFrame(girar); else antes = 0;
  }
  new IntersectionObserver(([e]) => {
    const parado = !visivel;
    visivel = e.isIntersecting;
    if (visivel && parado) requestAnimationFrame((t) => { antes = t; girar(t); });
  }, { rootMargin: '120px' }).observe(giro);
  giro.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') freado = true; });
  giro.addEventListener('pointerleave', () => { if (!arrasto) freado = false; });
  giro.addEventListener('focusin', (e) => {
    freado = true;
    x = -e.target.offsetLeft + 40; giro.scrollLeft = 0;
  });
  giro.addEventListener('focusout', () => { freado = false; });
  giro.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    arrasto = { id: e.pointerId, px: e.clientX, t: e.timeStamp, inicio: e.clientX };
    arrastou = false;
  });
  giro.addEventListener('pointermove', (e) => {
    if (!arrasto) {
      if (e.pointerType === 'mouse') v = Math.max(-420, Math.min(420, v + e.movementX * 1.6));
      return;
    }
    const d = e.clientX - arrasto.px, dt = Math.max(e.timeStamp - arrasto.t, 1) / 1000;
    if (!arrastou && Math.abs(e.clientX - arrasto.inicio) > 6) {
      arrastou = true;
      giro.setPointerCapture(e.pointerId);
      giro.classList.add('arrastando');
    }
    if (arrastou) { x += d; v = v * .6 + d / dt * .4; }
    arrasto.px = e.clientX; arrasto.t = e.timeStamp;
  });
  const soltar = (e) => {
    if (!arrasto) return;
    arrasto = null;
    giro.classList.remove('arrastando');
    v = Math.max(-1800, Math.min(1800, v));
    if (e.pointerType !== 'mouse') freado = false;
    setTimeout(() => { arrastou = false; }, 0);
  };
  giro.addEventListener('pointerup', soltar);
  giro.addEventListener('pointercancel', soltar);
  giro.addEventListener('click', (e) => { if (arrastou) { e.preventDefault(); e.stopPropagation(); arrastou = false; } }, true);
}
// Clique num cartão do carrossel abre a aba certa (vale também para as cópias)
giro.addEventListener('click', (e) => {
  const item = e.target.closest('.giro__item');
  if (item) abrirAba(item.dataset.aba);
});

// Física dos cartões: cada um é uma mola que inclina para o mouse e recebe o embalo dele
const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !movimentoReduzido) {
  const MOLA = 150, FREIO = 11, INCLINA = 9, RAIO = 460, EMBALO_POS = .9, EMBALO_ROT = .1;
  const cartoes = [...document.querySelectorAll('.cartao__corpo, .giro__corpo')].map((el) => ({
    el, img: el.querySelector('img'),
    p: { rx: 0, ry: 0, x: 0, y: 0, sobe: 0 }, v: { rx: 0, ry: 0, x: 0, y: 0, sobe: 0 }, parado: true,
  }));
  const mouse = { x: -1e4, y: -1e4, ux: -1e4, uy: -1e4, dentro: false };
  let ultimo = 0, rodando = false;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!mouse.dentro) { mouse.ux = e.clientX; mouse.uy = e.clientY; }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.dentro = true;
    acordar();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.dentro = false; acordar(); });
  function acordar() { if (!rodando) { rodando = true; ultimo = performance.now(); requestAnimationFrame(passo); } }
  function passo(agora) {
    const dt = Math.min((agora - ultimo) / 1000, 1 / 30) || 1 / 60;
    ultimo = agora;
    const lim = (n) => Math.max(-2600, Math.min(2600, n));
    const vx = mouse.dentro ? lim((mouse.x - mouse.ux) / dt) : 0;
    const vy = mouse.dentro ? lim((mouse.y - mouse.uy) / dt) : 0;
    mouse.ux = mouse.x; mouse.uy = mouse.y;
    let vivo = false;
    for (const c of cartoes) {
      const r = c.el.parentElement.getBoundingClientRect();
      if (!r.width) continue;
      const nx = (mouse.x - r.left) / r.width * 2 - 1, ny = (mouse.y - r.top) / r.height * 2 - 1;
      const sobre = mouse.dentro && Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
      const alvo = sobre ? { rx: -ny * INCLINA, ry: nx * INCLINA, x: 0, y: 0, sobe: 1 } : { rx: 0, ry: 0, x: 0, y: 0, sobe: 0 };
      const dist = Math.hypot(mouse.x - (r.left + r.width / 2), mouse.y - (r.top + r.height / 2));
      const perto = mouse.dentro ? Math.max(0, 1 - dist / RAIO) ** 2 : 0;
      c.v.x += vx * perto * EMBALO_POS * dt * 60 * .1;
      c.v.y += vy * perto * EMBALO_POS * dt * 60 * .1;
      c.v.ry += vx * perto * EMBALO_ROT * dt * 60 * .1;
      c.v.rx -= vy * perto * EMBALO_ROT * dt * 60 * .1;
      let energia = 0;
      for (const k in c.p) {
        c.v[k] += (MOLA * (alvo[k] - c.p[k]) - FREIO * c.v[k]) * dt;
        c.p[k] += c.v[k] * dt;
        energia += Math.abs(c.v[k]) + Math.abs(alvo[k] - c.p[k]);
      }
      for (const [k, m] of [['x', 26], ['y', 18], ['rx', 16], ['ry', 16]]) {
        if (Math.abs(c.p[k]) > m) { c.p[k] = Math.sign(c.p[k]) * m; c.v[k] = 0; }
      }
      if (energia > .02) vivo = true;
      else if (!sobre && !c.parado) { c.parado = true; c.el.style.cssText = ''; if (c.img) c.img.style.translate = ''; continue; }
      if (energia <= .02 && c.parado) continue;
      c.parado = false;
      const { rx, ry, x, y, sobe } = c.p;
      c.el.style.transform = `perspective(1000px) translate3d(${x.toFixed(2)}px, ${(y - sobe * 10).toFixed(2)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${(1 + sobe * .02).toFixed(4)})`;
      c.el.style.setProperty('--sx', `${(-ry * 2.4).toFixed(1)}px`);
      c.el.style.setProperty('--sy', `${(rx * 2.4 + sobe * 12).toFixed(1)}px`);
      c.el.style.setProperty('--rx', `${((nx + 1) * 50).toFixed(1)}%`);
      c.el.style.setProperty('--ry', `${((ny + 1) * 50).toFixed(1)}%`);
      c.el.style.setProperty('--reflexo', Math.max(0, Math.min(1, sobe)).toFixed(2));
      if (c.img) c.img.style.translate = `${(-ry * .9).toFixed(1)}px ${(rx * .9).toFixed(1)}px`;
    }
    if (vivo || mouse.dentro && (vx || vy)) requestAnimationFrame(passo); else rodando = false;
  }
}

// Barra de vidro: lente nas bordas (Chromium) e brilho que acompanha o mouse
const topo = document.querySelector('.topo');
if (/Chrome\/\d/.test(navigator.userAgent)) {
  const filtro = document.getElementById('vidro'), mapa = document.getElementById('vidro-mapa');
  const desenhar = () => {
    const w = Math.round(topo.offsetWidth), h = Math.round(topo.offsetHeight), r = h / 2, faixa = 20;
    const tela = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = tela.getContext('2d'), img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const qx = Math.max(r - x - .5, x + .5 - (w - r)), qy = y + .5 - r;
      const ex = Math.max(qx, 0), d = Math.hypot(ex, qy), borda = r - d;
      const forca = Math.max(0, 1 - borda / faixa) ** 2.2;
      const nx = d ? (x + .5 < r ? -1 : 1) * ex / d : 0, ny = d ? qy / d : 0, i = (y * w + x) * 4;
      img.data[i] = 128 - nx * forca * 127; img.data[i + 1] = 128 - ny * forca * 127;
      img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    for (const el of [filtro, mapa]) { el.setAttribute('width', w); el.setAttribute('height', h); }
    mapa.setAttribute('href', tela.toDataURL());
    topo.classList.add('topo--lente');
  };
  new ResizeObserver(desenhar).observe(topo);
}
topo.addEventListener('pointermove', (e) => {
  topo.style.setProperty('--bx', `${e.clientX - topo.getBoundingClientRect().left}px`);
  topo.style.setProperty('--brilho', 1);
});
topo.addEventListener('pointerleave', () => topo.style.setProperty('--brilho', 0));

// WhatsApp: coloque aqui o número da loja (só dígitos, com 55 e DDD).
// Vazio, o WhatsApp abre com a mensagem pronta e a pessoa escolhe o contato.
const WHATSAPP = '';
const linkWhatsapp = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
const abrirFora = (a, texto) => Object.assign(a, { href: linkWhatsapp(texto), target: '_blank', rel: 'noopener' });
document.querySelectorAll('[data-whatsapp]').forEach((a) => abrirFora(a, a.dataset.whatsapp));
document.querySelectorAll('[data-pedido]').forEach((a) =>
  abrirFora(a, `Olá! Quero pedir: ${a.closest('.cartao').querySelector('h3').textContent}.`));

// Newsletter: sem servidor, nada é enviado nem guardado
const news = document.querySelector('.news');
news.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = news.querySelector('input');
  document.querySelector('.news__msg').textContent = email.checkValidity()
    ? 'Novidades em breve por aqui.'
    : 'Digite um e-mail válido.';
});
