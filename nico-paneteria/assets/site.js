// Nico Paneteria — interações da prévia (sem dependências).
const WHATS = '5519981987126';

// Menu no celular
const nav = document.querySelector('.nav');
document.querySelector('.nav__menu')?.addEventListener('click', e => {
  const aberto = nav.classList.toggle('aberto');
  e.currentTarget.setAttribute('aria-expanded', aberto);
});

// Entrada suave ao rolar
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rev').forEach(el => io.observe(el));

// Períodos: o item ativo troca a foto da pilha
document.querySelectorAll('[data-periodos]').forEach(box => {
  const itens = [...box.querySelectorAll('.periodo')];
  const fotos = [...box.querySelectorAll('.pilha img')];
  const ativar = i => {
    itens.forEach((b, j) => b.classList.toggle('ativo', j === i));
    fotos.forEach((f, j) => { f.classList.toggle('ativa', j === i); f.classList.toggle('atras', j === (i + 1) % fotos.length); });
  };
  // (links) o clique segue para o cardápio; mouse e foco só trocam a foto
  itens.forEach((b, i) => { b.addEventListener('mouseenter', () => ativar(i)); b.addEventListener('focus', () => ativar(i)); });
  ativar(0);
});

// Índice do cardápio acompanha a seção visível
const links = [...document.querySelectorAll('.indice a')];
if (links.length) {
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.hash === '#' + e.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  links.forEach(a => { const s = document.querySelector(a.hash); if (s) io2.observe(s); });
}

// Formulário de encomenda: monta a mensagem e abre o WhatsApp (nada vai para servidor)
document.querySelector('#form-encomenda')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const data = f.get('data') ? new Date(f.get('data') + 'T12:00').toLocaleDateString('pt-BR') : 'a combinar';
  const msg = [
    'Olá, Nico! Quero fazer uma encomenda.',
    `Nome: ${f.get('nome')}`,
    `Encomenda: ${f.get('tipo')}`,
    `Para: ${data}`,
    `Pessoas/quantidade: ${f.get('qtd') || 'a combinar'}`,
    f.get('obs') ? `Detalhes: ${f.get('obs')}` : '',
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
});

// (leque) carrossel em leque: posição de cada card pelo afastamento do card ativo
document.querySelectorAll('[data-leque]').forEach(box => {
  const palco = box.querySelector('.leque__palco');
  const cards = [...box.querySelectorAll('.leque__card')];
  const pontos = [...box.querySelectorAll('.leque__pontos button')];
  let ativo = Math.floor(cards.length / 2);
  const desenhar = () => {
    const passo = Math.min(210, palco.clientWidth * 0.2);
    cards.forEach((c, i) => {
      const d = i - ativo, a = Math.abs(d);
      const esc = d === 0 ? 1.08 : Math.max(0.62, 0.86 - (a - 1) * 0.1);
      c.style.transform = `translateX(${d * passo}px) translateY(${a * a * 14}px) scale(${esc}) rotate(${d * 8}deg)`;
      c.style.zIndex = 10 - a;
      c.style.opacity = a > 3 ? 0 : 1;
      c.classList.toggle('ativo', d === 0);
      c.tabIndex = d === 0 ? 0 : -1;
    });
    pontos.forEach((p, i) => p.setAttribute('aria-selected', i === ativo));
  };
  const ir = i => { ativo = (i + cards.length) % cards.length; desenhar(); };
  // card de lado: o clique só traz para o centro; o do centro abre o cardápio
  cards.forEach((c, i) => c.addEventListener('click', e => { if (arrastou || i !== ativo) { e.preventDefault(); if (!arrastou) ir(i); } }));
  pontos.forEach((p, i) => p.addEventListener('click', () => ir(i)));
  box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') ir(ativo - 1); if (e.key === 'ArrowRight') ir(ativo + 1); });
  let x0 = null, arrastou = false;
  palco.addEventListener('pointerdown', e => { x0 = e.clientX; arrastou = false; });
  addEventListener('pointermove', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 50) { arrastou = true; palco.classList.add('arrastando'); ir(ativo + (dx < 0 ? 1 : -1)); x0 = e.clientX; }
  });
  addEventListener('pointerup', () => { x0 = null; palco.classList.remove('arrastando'); setTimeout(() => arrastou = false, 0); });
  addEventListener('resize', desenhar);
  desenhar();
});

// (morder) cada clique na comida tira um pedaço: um círculo grande + três menores (marca dos dentes) viram furos na máscara
document.querySelectorAll('.morder').forEach(sec => {
  const itens = JSON.parse(sec.dataset.itens);
  const $ = s => sec.querySelector(s);
  const palco = $('.morder__palco'), btn = $('.morder__btn'), corte = $('.morder__corte'), img = $('.morder__corte img');
  const l1 = $('.morder__l1'), l2 = $('.morder__l2'), titulo = $('.morder__titulo'), farelos = $('.morder__farelos');
  const status = $('.morder__status'), cursor = $('.morder__cursor');
  const fichas = [...sec.querySelectorAll('.ficha')];
  const TOTAL = 6, calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let atual = 0, furos = [], timer;

  const titular = (a, b) => {
    l1.textContent = a; l2.textContent = b;
    const n = Math.max(a.length, b.length);
    titulo.style.fontSize = `min(${Math.min(190, 1500 / n)}px, ${Math.min(16, 100 / n)}vw)`;
  };
  const dividir = nome => {
    const p = nome.split(' ');
    if (p.length === 1) return [nome, 'da Nico.'];
    const meio = Math.ceil(p.length / 2);
    return [p.slice(0, meio).join(' '), p.slice(meio).join(' ') + '.'];
  };
  const contar = () => {
    const it = itens[atual], n = furos.length / 4;
    status.textContent = n === 0 ? `${it.nome} · clique para morder` : `${it.nome} · ${n} ${n === 1 ? 'mordida' : 'mordidas'} · faltam ${TOTAL - n}`;
  };
  const mascarar = () => {
    const m = furos.map(([x, y, r]) => `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 1}px)`).join(',') || 'none';
    corte.style.webkitMaskImage = corte.style.maskImage = m;
  };
  const carregar = i => {
    clearTimeout(timer);
    atual = (i + itens.length) % itens.length;
    const it = itens[atual];
    furos = []; mascarar();
    img.onload = () => sec.classList.toggle('alto', img.naturalHeight > img.naturalWidth * 1.05);
    img.src = it.img;
    btn.setAttribute('aria-label', `Morder: ${it.nome}`);
    $('.morder__nome').textContent = it.nome;
    $('.morder__desc').textContent = it.desc;
    $('.morder__quando').textContent = it.quando;
    titular(...dividir(it.nome));
    fichas.forEach(f => f.setAttribute('aria-pressed', f.dataset.morder === it.id));
    sec.classList.remove('acabou', 'cai'); void sec.offsetWidth; sec.classList.add('cai');
    contar();
  };
  const soltarFarelos = (x, y) => {
    if (calmo) return;
    for (let k = 0; k < 9; k++) {
      const f = document.createElement('i');
      f.className = 'farelo';
      f.style.cssText = `left:${x}px;top:${y}px;--t:${4 + Math.random() * 7}px;--dx:${(Math.random() - .5) * 140}px;--dy:${90 + Math.random() * 150}px;--r:${Math.random() * 360}deg;--c:${['#b8824a', '#9A6A3A', '#d9b77c', '#7a4f26'][k % 4]};animation-delay:${Math.random() * 60}ms`;
      farelos.append(f);
      setTimeout(() => f.remove(), 1200);
    }
  };
  const morder = (x, y) => {
    if (sec.classList.contains('acabou')) return;
    const w = corte.offsetWidth, h = corte.offsetHeight, r = Math.min(w, h) * .2;
    const ang = Math.atan2(y - h / 2, x - w / 2) + Math.PI; // os dentes ficam do lado de dentro da mordida
    furos.push([x, y, r]);
    for (const k of [-.75, 0, .75]) furos.push([x + Math.cos(ang + k) * r * .95, y + Math.sin(ang + k) * r * .95, r * .4]);
    mascarar();
    corte.classList.remove('mastiga'); void corte.offsetWidth; corte.classList.add('mastiga');
    soltarFarelos(x, y);
    if (furos.length / 4 >= TOTAL) {
      sec.classList.add('acabou');
      titular('Acabou!', 'Tem mais.');
      status.textContent = `${itens[atual].nome} · ${TOTAL} mordidas · o próximo já sai`;
      timer = setTimeout(() => carregar(atual + 1), 2200);
    } else contar();
  };

  btn.addEventListener('click', e => {
    // clique pelo teclado (detail 0): morde a borda direita, como quem começa pela ponta
    if (e.detail === 0) return morder(corte.offsetWidth * (.82 + Math.random() * .15), corte.offsetHeight * (.25 + Math.random() * .5));
    // converte o ponto da tela para o sistema do recorte, que está girado -6°
    const box = corte.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2, a = 6 * Math.PI / 180;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    morder(corte.offsetWidth / 2 + dx * Math.cos(a) - dy * Math.sin(a), corte.offsetHeight / 2 + dx * Math.sin(a) + dy * Math.cos(a));
  });
  btn.addEventListener('pointerenter', () => palco.classList.add('mira'));
  btn.addEventListener('pointerleave', () => palco.classList.remove('mira'));
  palco.addEventListener('pointermove', e => {
    const b = palco.getBoundingClientRect();
    cursor.style.translate = `${e.clientX - b.left}px ${e.clientY - b.top}px`;
  });
  fichas.forEach(f => f.addEventListener('click', () => carregar(itens.findIndex(it => it.id === f.dataset.morder))));
  // (livro) qualquer [data-morder] da página traz o item; dentro da mesa (diálogo), abre a mesa
  const mesa = sec.closest('dialog');
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-morder]');
    if (!b || b.classList.contains('ficha')) return;
    const i = itens.findIndex(it => it.id === b.dataset.morder);
    if (i < 0) return;
    carregar(i);
    if (mesa) { if (!mesa.open) mesa.showModal(); }
    else sec.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
  });
  if (mesa) {
    mesa.querySelector('.mesa__fechar').addEventListener('click', () => mesa.close());
    mesa.querySelectorAll('.mesa__seta').forEach(s => s.addEventListener('click', () => carregar(atual + +s.dataset.dir)));
    mesa.addEventListener('click', e => { if (e.target === mesa) mesa.close(); });
    mesa.addEventListener('close', () => clearTimeout(timer));
  } else carregar(0);
});

// (tema) botão sol/lua: troca e lembra a escolha
document.querySelectorAll('.tema').forEach(b => b.addEventListener('click', () => {
  const claro = document.documentElement.dataset.theme !== 'light';
  if (claro) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('tema', claro ? 'light' : ''); } catch (e) {}
}));

// (livro) cardápio em livro 3D: cada folha gira pela lombada; as folhas de fora ficam em leque atrás.
// No desktop são duas páginas por vez; no celular, uma (cada folha leva uma página só).
document.querySelectorAll('.livro').forEach(livro => {
  const palco = livro.querySelector('.livro__palco'), miolo = livro.querySelector('.livro__miolo');
  const conta = livro.querySelector('.livro__conta');
  const paginas = [...livro.querySelectorAll('.livro__paginas > .pag')];
  const capitulos = JSON.parse(livro.dataset.capitulos);
  const umaPagina = matchMedia('(max-width: 767px)');
  let folhas = [], s = 0, modo = 0;

  const montar = () => {
    modo = umaPagina.matches ? 1 : 2;
    const guardadas = livro.querySelector('.livro__paginas');
    paginas.forEach(p => guardadas.append(p));  // devolve as páginas antes de remontar
    miolo.innerHTML = '';
    const n = modo === 2 ? paginas.length / 2 : paginas.length;
    folhas = Array.from({ length: n }, (_, i) => {
      const f = document.createElement('div');
      f.className = 'folha';
      f.innerHTML = '<div class="folha__face folha__frente"></div><div class="folha__face folha__verso"></div>';
      const frente = modo === 2 ? paginas[2 * i] : paginas[i];
      const verso = modo === 2 ? paginas[2 * i + 1] : null;
      f.firstChild.append(frente);
      if (verso) f.lastChild.append(verso); else f.lastChild.classList.add('folha__verso--liso');
      miolo.append(f);
      return f;
    });
    livro.classList.toggle('livro--uma', modo === 1);
  };

  const desenhar = () => {
    const passo = modo === 2 ? 26 : 0, fundo = 34;
    folhas.forEach((f, i) => {
      const virada = i < s, d = virada ? s - 1 - i : i - s, k = Math.min(d, 6);
      const lado = virada ? -1 : 1;
      f.style.transform = `translateX(${lado * k * passo}px) translateZ(${-k * fundo}px) rotateY(${virada ? -180 - k * 5 : k * 5}deg)`;
      f.style.zIndex = 200 - d;
      f.style.setProperty('--escuro', Math.min(k * 0.12, 0.55));
      f.style.visibility = d > 7 ? 'hidden' : 'visible';
    });
    // só as duas páginas abertas (ou a única, no celular) recebem cliques
    folhas.forEach((f, i) => { f.inert = !(i === s || (modo === 2 && i === s - 1)); });
    const total = paginas.length;
    conta.textContent = modo === 2
      ? (s === 0 ? `Capa / ${total}` : `${2 * s - 1}–${Math.min(2 * s, total - 1)} / ${total}`)
      : `${s + 1} / ${total}`;
    livro.classList.toggle('livro--fechado', modo === 2 && s === 0);
    livro.classList.toggle('livro--fim', s === folhas.length);
  };
  const ir = novo => { s = Math.max(0, Math.min(folhas.length, novo)); desenhar(); };
  const irPara = cid => {
    const p = capitulos[cid];
    if (p === undefined) return;
    ir(modo === 2 ? Math.ceil(p / 2) : p);
  };

  // cada página encolhe a fonte até caber na folha (as descrições têm tamanhos muito diferentes)
  const caber = () => paginas.forEach(p => {
    let f = 1; p.style.fontSize = '';
    while (p.scrollHeight > p.clientHeight + 1 && f > .62) { f -= .04; p.style.fontSize = `calc(var(--pw) * ${(.04 * f).toFixed(4)})`; }
  });
  montar(); desenhar(); caber();
  document.fonts?.ready.then(caber);
  let tempo; addEventListener('resize', () => { clearTimeout(tempo); tempo = setTimeout(caber, 200); });
  umaPagina.addEventListener('change', () => {
    const p = modo === 2 ? Math.max(0, 2 * s - 1) : s;  // mantém a página que estava aberta
    montar(); ir(modo === 2 ? Math.ceil(p / 2) : p); caber();
  });
  livro.querySelectorAll('.livro__seta').forEach(b => b.addEventListener('click', () => ir(s + +b.dataset.dir)));
  livro.addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) irPara(b.dataset.ir); });
  palco.addEventListener('keydown', e => { if (e.key === 'ArrowRight') ir(s + 1); if (e.key === 'ArrowLeft') ir(s - 1); });

  // arrastar para os lados vira a página; um arraste não conta como clique no item
  let x0 = null, arrastou = false;
  palco.addEventListener('pointerdown', e => { x0 = e.clientX; arrastou = false; });
  palco.addEventListener('pointermove', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 10) arrastou = true; });
  palco.addEventListener('pointerup', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) ir(s + (dx < 0 ? 1 : -1));
  });
  palco.addEventListener('click', e => { if (arrastou) { e.stopPropagation(); e.preventDefault(); arrastou = false; } }, true);

  // cardapios.html#pizzaria abre o livro direto na seção
  if (location.hash && capitulos[location.hash.slice(1)] !== undefined) {
    miolo.classList.add('sem-animacao'); irPara(location.hash.slice(1));
    requestAnimationFrame(() => requestAnimationFrame(() => miolo.classList.remove('sem-animacao')));
    livro.scrollIntoView({ block: 'start' });
  }
});
