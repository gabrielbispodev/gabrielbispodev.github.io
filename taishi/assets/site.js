const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

// (2.0) Intro: ensō, タイシ, selo e letras; depois as portas de shoji abrem. Pular ou Esc.
// Toca sozinha uma vez por sessão (ou com index.html?intro, vindo do logo do cardápio).
// (2.1) 3 cliques ou segurar o logo tocam de novo; um clique só continua indo para o topo.
(() => {
  let intro = document.getElementById('intro');
  if (!intro) return;
  const modelo = intro.cloneNode(true);  // cópia limpa: trocar o nó reinicia todas as animações CSS
  let abrir = () => {};
  const tocar = () => {
    const novo = modelo.cloneNode(true);
    intro.replaceWith(novo); intro = novo;
    document.documentElement.style.overflow = 'hidden';
    let feito = false;
    abrir = () => {
      if (feito) return; feito = true;
      clearTimeout(t);
      novo.classList.add('abre');
      document.documentElement.style.overflow = '';
      setTimeout(() => novo.classList.add('fora'), 1200);
    };
    const t = setTimeout(abrir, 3000);
    novo.querySelector('.intro-pular').addEventListener('click', () => abrir());
  };
  addEventListener('keydown', e => { if (e.key === 'Escape') abrir(); });

  let visto = false;
  try { visto = sessionStorage.getItem('taishi-intro') === '1'; sessionStorage.setItem('taishi-intro', '1'); } catch (e) {}
  const pedida = new URLSearchParams(location.search).has('intro');
  if (pedida) history.replaceState(null, '', location.pathname + location.hash);
  if (pedida || (!visto && !calmo)) tocar(); else intro.classList.add('fora');

  document.querySelectorAll('.nav-logo').forEach(logo => {
    let cliques = 0, espera, segura, segurou = false;
    logo.addEventListener('click', e => {
      e.preventDefault();
      if (segurou) { segurou = false; return; }
      cliques++;
      clearTimeout(espera);
      if (cliques >= 3) { cliques = 0; tocar(); return; }
      espera = setTimeout(() => { cliques = 0; location.href = logo.href; }, 420);
    });
    logo.addEventListener('pointerdown', () => { segura = setTimeout(() => { segurou = true; cliques = 0; clearTimeout(espera); tocar(); }, 650); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => logo.addEventListener(ev, () => clearTimeout(segura)));
    logo.addEventListener('contextmenu', e => e.preventDefault());  // segurar no celular não abre o menu do navegador
  });
})();

// (2.0) prato do herói gira conforme a rolagem
const prato = document.querySelector('.prato-giro');
if (prato && !calmo) {
  let pedido = false;
  addEventListener('scroll', () => {
    if (pedido) return; pedido = true;
    requestAnimationFrame(() => { prato.style.transform = `rotate(${scrollY * 0.25}deg)`; pedido = false; });
  }, { passive: true });
}

// (2.4) poucas agulhas (pétalas no tema escuro) caindo pelo site todo; a cada volta cada uma nasce num lugar novo
const agulhas = document.querySelector('.agulhas');
if (agulhas && !calmo) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sortear = a => {
    a.style.left = `${rnd(3, 95).toFixed(1)}%`;
    a.style.setProperty('--vento', `${-rnd(30, 140) | 0}px`);
    a.style.setProperty('--s', `${rnd(16, 40) | 0}px`);
    a.style.setProperty('--r0', `${rnd(0, 360) | 0}deg`);
  };
  const n = matchMedia('(max-width: 767px)').matches ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const a = document.createElement('i');
    a.className = 'agulha';
    a.style.setProperty('--d', `${rnd(16, 24).toFixed(1)}s`);
    a.style.setProperty('--atraso', `${(-i * 5 - rnd(0, 4)).toFixed(1)}s`);  // espaçadas no tempo: nunca caem juntas
    a.style.scale = rnd(.8, 1.2).toFixed(2);
    sortear(a);
    a.addEventListener('animationiteration', () => sortear(a));
    agulhas.append(a);
  }
}

// (2.5) vídeo do yakisoba: toca só quando aparece na tela (economiza bateria); com movimento reduzido fica na capa
document.querySelectorAll('.painel-video').forEach(v => {
  if (calmo) return;
  new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: .25 }).observe(v);
});

// (2.4) tema claro/escuro: guarda a escolha no navegador
document.querySelectorAll('.tema').forEach(b => b.addEventListener('click', () => {
  const escuro = document.documentElement.dataset.theme !== 'dark';
  if (escuro) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('taishi-tema', escuro ? 'dark' : 'light'); } catch (e) {}
}));

// (2.4) visualizador: qualquer foto dentro de [data-galeria] amplia; setas andam pelas fotos do mesmo grupo
const lupa = document.querySelector('.lupa');
let galeria = [], gi = 0;
const mostrar = i => {
  gi = (i + galeria.length) % galeria.length;
  const im = galeria[gi], f = lupa.querySelector('img');
  f.src = im.currentSrc || im.src; f.alt = im.alt;
  f.style.animation = 'none'; void f.offsetWidth; f.style.animation = '';
  const fc = im.closest('figure')?.querySelector('figcaption');
  lupa.querySelector('figcaption').textContent = fc ? `${fc.querySelector('small')?.textContent} · ${fc.lastChild.textContent}` : im.alt;
};
const ampliar = img => {
  galeria = [...img.closest('[data-galeria]').querySelectorAll('img')];
  mostrar(galeria.indexOf(img));
  if (!lupa.open) lupa.showModal();
};
if (lupa) {
  document.querySelectorAll('.faixa[data-galeria] img').forEach(im => im.addEventListener('click', () => ampliar(im)));
  lupa.querySelector('.lupa-fechar').addEventListener('click', () => lupa.close());
  lupa.querySelectorAll('.lupa-seta').forEach(s => s.addEventListener('click', () => mostrar(gi + +s.dataset.dir)));
  lupa.addEventListener('click', e => { if (e.target === lupa || e.target.tagName === 'FIGURE') lupa.close(); });
  lupa.addEventListener('keydown', e => { if (e.key === 'ArrowRight') mostrar(gi + 1); if (e.key === 'ArrowLeft') mostrar(gi - 1); });
}

// (2.4) carrossel 3D das casas: card da frente cheio, vizinhos de lado com profundidade e giro; volta infinita
document.querySelectorAll('.carrossel').forEach(car => {
  const palco = car.querySelector('.carrossel-palco'), cards = [...palco.children], n = cards.length;
  const pontos = car.querySelector('.carrossel-pontos');
  pontos.innerHTML = cards.map((_, i) => `<button type="button" role="tab" aria-label="Foto ${i + 1}"></button>`).join('');
  const bolas = [...pontos.children];
  let atual = 0, auto;
  const desenhar = () => {
    cards.forEach((c, i) => {
      let d = i - atual;
      if (d > n / 2) d -= n; if (d < -n / 2) d += n;   // caminho mais curto na volta
      const a = Math.abs(d);
      c.style.transform = `translateX(${d * 58}%) translateZ(${-a * 170}px) rotateY(${-Math.sign(d) * Math.min(a, 1) * 28}deg)`;
      c.style.opacity = a > 3 ? 0 : 1;
      c.style.filter = `brightness(${1 - Math.min(a, 3) * 0.2})`;
      c.style.zIndex = 100 - a;
      c.style.pointerEvents = a > 2 ? 'none' : '';
      c.classList.toggle('frente', d === 0);
    });
    bolas.forEach((b, i) => b.setAttribute('aria-selected', i === atual));
  };
  const ir = i => { atual = (i + n) % n; desenhar(); };
  const rodar = () => { clearInterval(auto); if (!calmo) auto = setInterval(() => ir(atual + 1), 4500); };
  car.querySelectorAll('.carrossel-seta').forEach(s => s.addEventListener('click', () => { ir(atual + +s.dataset.dir); rodar(); }));
  bolas.forEach((b, i) => b.addEventListener('click', () => { ir(i); rodar(); }));
  palco.addEventListener('keydown', e => { if (e.key === 'ArrowRight') ir(atual + 1); if (e.key === 'ArrowLeft') ir(atual - 1); });
  // clique: o card da frente amplia; um card de lado vem para a frente
  let x0 = null, arrastou = false;
  palco.addEventListener('pointerdown', e => { x0 = e.clientX; arrastou = false; });
  palco.addEventListener('pointermove', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 10) arrastou = true; });
  palco.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { ir(atual + (dx < 0 ? 1 : -1)); rodar(); }
  });
  palco.addEventListener('click', e => {
    if (arrastou) return;
    const c = e.target.closest('figure');
    if (!c) return;
    if (c.classList.contains('frente')) ampliar(c.querySelector('img'));
    else { ir(cards.indexOf(c)); rodar(); }
  });
  car.addEventListener('pointerenter', () => clearInterval(auto));
  car.addEventListener('pointerleave', rodar);
  new IntersectionObserver(([e]) => e.isIntersecting ? rodar() : clearInterval(auto)).observe(car);
  desenhar();
});

// (2.0) faixa de pratos: duplica os itens para a volta não ter emenda (a animação anda metade do trilho)
document.querySelectorAll('.faixa-trilho').forEach(t => [...t.children].forEach(a => {
  const c = a.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; t.append(c);
}));

// Abas de horários
document.querySelectorAll('.abas button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.abas button').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.quadro').forEach(q => q.hidden = q.dataset.painel !== b.dataset.aba);
}));

// Seções aparecem ao rolar
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.secao, .painel, .faixa').forEach(s => { s.classList.add('revela'); io.observe(s); });
