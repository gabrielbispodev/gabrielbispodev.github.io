// (2.0) Cardápio em pergaminho: a rolagem desenrola o papel; aberto, o pincel escreve a seção.
// "Continuar" enrola e desenrola de novo com a próxima seção. Dados em cardapio-dados.js.
(() => {
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palco = document.getElementById('palco');
  const perg = palco.querySelector('.pergaminho');
  const folha = palco.querySelector('.folha-conteudo');
  const miolo = palco.querySelector('.papel-miolo');
  const pincel = palco.querySelector('.pincel');
  const conta = palco.querySelector('.papel-conta');
  const [voltar, continuar] = palco.querySelectorAll('.btn-papel');
  const secoes = palco.querySelector('.secoes');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // seções longas viram mais de uma folha ((2.1) 5 itens no desktop, 3 no celular, para a letra caber grande)
  // shortcut: a paginação é decidida ao carregar; girar o tablet entre os dois tamanhos não repagina (recarregar resolve)
  const POR_FOLHA = matchMedia('(max-width: 767px)').matches ? 3 : 5;
  const folhas = [], mesaItens = [];
  CARDAPIO.forEach(s => {
    for (let i = 0; i < s.itens.length; i += POR_FOLHA) folhas.push({ s, parte: i / POR_FOLHA, itens: s.itens.slice(i, i + POR_FOLHA), base: mesaItens.length + i });
    s.itens.forEach(([nome, desc, p], k) => mesaItens.push({
      nome, desc, img: `assets/img/menu/${s.fotos[k % s.fotos.length]}.webp`,
      quando: `${s.titulo} · ${Array.isArray(p) ? p.map(([r, v]) => `${r} R$ ${v}`).join(' | ') : `R$ ${p}`}` }));
  });
  const primeira = id => folhas.findIndex(f => f.s.id === id);

  secoes.innerHTML = CARDAPIO.map(s => `<button type="button" data-ir="${s.id}">${esc(s.titulo)}</button>`).join('');

  const preco = p => Array.isArray(p)
    ? p.map(([r, v]) => `<span class="f-op"><small>${esc(r)}</small> R$ ${v}</span>`).join('')
    : `R$ ${p}`;

  let atual = Math.max(0, primeira(location.hash.slice(1))), animacoes = [], aberto = false, trocando = false;

  const desenhar = () => {
    const { s, parte, itens, base } = folhas[atual];
    folha.classList.remove('escrito');
    folha.style.fontSize = '';
    folha.innerHTML = `
      <header class="folha-cab"><h2 class="tinta">${esc(s.titulo)}${parte ? ' <small>(cont.)</small>' : ''}</h2><p class="tinta">${esc(s.nota)}</p><hr></header>
      <ul class="folha-itens">${itens.map(([n, d, p], k) => `<li><button type="button" class="f-item" data-n="${base + k}" aria-label="Morder: ${esc(n)}"><span class="f-nome tinta">${esc(n)}</span><span class="f-preco tinta">${preco(p)}</span>${d ? `<span class="f-desc tinta">${esc(d)}</span>` : ''}</button></li>`).join('')}</ul>
      <div class="folha-fotos">${s.fotos.map(f => `<img class="foto-tinta" src="assets/img/menu/${f}.webp" alt="" width="760" height="760">`).join('')}</div>`;
    // a folha reduz a letra até caber no papel
    let tam = parseFloat(getComputedStyle(folha).fontSize);
    while (folha.scrollHeight > folha.clientHeight + 1 && tam > 13) folha.style.fontSize = `${tam -= 0.5}px`;
    const ultima = atual === folhas.length - 1;
    voltar.disabled = atual === 0;
    continuar.textContent = ultima ? 'Fazer pedido ›' : 'Continuar ›';
    continuar.classList.toggle('pedir', ultima);
    conta.innerHTML = `<span class="conta-nome">${esc(s.titulo)} · </span>${atual + 1} / ${folhas.length}`;
    secoes.querySelectorAll('button').forEach(b => b.toggleAttribute('aria-current', b.dataset.ir === s.id));
    const ativo = secoes.querySelector('[aria-current]');
    ativo && secoes.scrollTo({ left: ativo.offsetLeft - secoes.clientWidth / 2 + ativo.clientWidth / 2, behavior: 'smooth' });
  };

  // o pincel passa por cada linha e a tinta aparece atrás dele
  const terminar = () => { animacoes.forEach(a => a.finish()); };
  const escrever = () => {
    if (calmo) { folha.classList.add('escrito'); return; }
    animacoes.forEach(a => a.cancel()); animacoes = [];
    const base = miolo.getBoundingClientRect();
    let t = 150;
    folha.querySelectorAll('.foto-tinta').forEach((f, i) => animacoes.push(f.animate(
      [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }],
      { duration: 900, delay: 200 + i * 500, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' })));
    folha.querySelectorAll('.tinta').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const dur = Math.min(520, Math.max(140, el.textContent.length * 12));
      animacoes.push(el.animate([{ clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0 -20% 0)' }],
        { duration: dur, delay: t, easing: 'linear', fill: 'forwards' }));
      // a ponta do pincel fica em (18, 84) dentro da imagem de 90 px
      const y = r.top - base.top + r.height * 0.62 - 84, x0 = r.left - base.left - 18, x1 = r.right - base.left - 18;
      animacoes.push(pincel.animate([
        { transform: `translate(${x0}px,${y - 6}px) rotate(-4deg)` },
        { transform: `translate(${(x0 + x1) / 2}px,${y + 3}px) rotate(3deg)`, offset: .5 },
        { transform: `translate(${x1}px,${y - 4}px) rotate(-2deg)` }],
        { duration: dur, delay: t, easing: 'ease-in-out', fill: 'forwards' }));
      t += dur + 60;
    });
    miolo.classList.add('escrevendo');
    const fim = animacoes.at(-1);
    fim && fim.finished.then(() => { folha.classList.add('escrito'); miolo.classList.remove('escrevendo'); }).catch(() => {});
  };

  // a rolagem desenrola o papel; abre por completo depois de ~0,9 tela de rolagem
  const abertura = () => Math.min(1, Math.max(0, (scrollY - palco.offsetTop + 40) / (innerHeight * 0.9)));
  const rolar = () => {
    if (trocando) return;
    const p = abertura();
    perg.style.setProperty('--abre', Math.max(0.03, p).toFixed(4));
    if (p >= 1 && !aberto) { aberto = true; palco.classList.add('aberto'); desenhar(); escrever(); }
  };
  addEventListener('scroll', () => requestAnimationFrame(rolar), { passive: true });
  addEventListener('resize', () => { if (aberto) { terminar(); desenhar(); folha.classList.add('escrito'); } rolar(); });

  // trocar de folha: enrola, troca o texto, desenrola e escreve
  const ir = novo => {
    if (trocando || novo < 0) return;
    if (novo >= folhas.length) { location.href = 'index.html#pedir'; return; }
    terminar();
    if (!aberto) { atual = novo; abrirAgora(); return; }
    trocando = true; palco.classList.add('trocando');
    perg.style.setProperty('--abre', '0.05');
    setTimeout(() => {
      atual = novo; desenhar();
      perg.style.setProperty('--abre', '1');
      setTimeout(() => { palco.classList.remove('trocando'); trocando = false; escrever(); }, calmo ? 0 : 470);
    }, calmo ? 0 : 470);
  };
  voltar.addEventListener('click', () => ir(atual - 1));
  continuar.addEventListener('click', () => ir(atual + 1));
  secoes.addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) ir(primeira(b.dataset.ir)); });
  // (2.2) as abas de seção também andam arrastando com o mouse; um arraste não conta como clique na aba
  let x0 = null, rol0 = 0, arrastou = false;
  secoes.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; rol0 = secoes.scrollLeft; arrastou = false; });
  addEventListener('pointermove', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 5) { arrastou = true; secoes.classList.add('arrastando'); }
    secoes.scrollLeft = rol0 - dx;
  });
  addEventListener('pointerup', () => { x0 = null; secoes.classList.remove('arrastando'); });
  secoes.addEventListener('click', e => { if (arrastou) { e.stopImmediatePropagation(); arrastou = false; } }, true);
  // clicar no papel termina de escrever na hora; com tudo escrito, clicar num prato abre a mesa
  folha.addEventListener('click', e => {
    if (miolo.classList.contains('escrevendo')) return terminar();
    const b = e.target.closest('.f-item');
    if (b) abrirMesa(+b.dataset.n);
  });
  addEventListener('keydown', e => {
    if (!aberto || mesa.open) return;
    if (e.key === 'ArrowRight') ir(atual + 1);
    if (e.key === 'ArrowLeft') ir(atual - 1);
  });

  // (2.1) mesa de morder (adaptada do site da Nico Paneteria): cada clique abre um furo grande + três pequenos
  // (marca dos dentes) na máscara da foto e solta grãos de arroz; depois de 6 mordidas vem o próximo prato.
  const mesa = document.querySelector('.mesa'), sec = mesa.querySelector('.morder');
  const $ = s => sec.querySelector(s);
  const corte = $('.morder__corte'), img = $('.morder__corte img'), btnMorder = $('.morder__btn');
  const l1 = $('.morder__l1'), l2 = $('.morder__l2'), titulo = $('.morder__titulo'), farelos = $('.morder__farelos'), status = $('.morder__status');
  const TOTAL = 6;
  let prato = 0, furos = [], timer;
  const titular = (a, b) => {
    l1.textContent = a; l2.textContent = b;
    const n = Math.max(a.length, b.length);
    titulo.style.fontSize = `min(${Math.min(210, 1600 / n)}px, ${Math.min(19, 110 / n)}vw)`;
  };
  const dividir = nome => {
    const p = nome.split(' · ')[0].split(' ');
    if (p.length === 1) return [p[0], 'do Taishi.'];
    const meio = Math.ceil(p.length / 2);
    return [p.slice(0, meio).join(' '), p.slice(meio).join(' ') + '.'];
  };
  const contar = () => {
    const n = furos.length / 4, nome = mesaItens[prato].nome;
    status.textContent = n === 0 ? `${nome} · clique com o hashi para morder` : `${nome} · ${n} ${n === 1 ? 'mordida' : 'mordidas'} · faltam ${TOTAL - n}`;
  };
  const mascarar = () => {
    const m = furos.map(([x, y, r]) => `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 1}px)`).join(',') || 'none';
    corte.style.webkitMaskImage = corte.style.maskImage = m;
  };
  const carregar = i => {
    clearTimeout(timer);
    prato = (i + mesaItens.length) % mesaItens.length;
    const it = mesaItens[prato];
    furos = []; mascarar();
    img.src = it.img;
    new Image().src = mesaItens[(prato + 1) % mesaItens.length].img;  // pré-carrega o próximo
    btnMorder.setAttribute('aria-label', `Morder: ${it.nome}`);
    $('.morder__nome').textContent = it.nome;
    $('.morder__desc').textContent = it.desc;
    $('.morder__quando').textContent = it.quando;
    titular(...dividir(it.nome));
    sec.classList.remove('acabou', 'cai'); void sec.offsetWidth; sec.classList.add('cai');
    contar();
  };
  const soltarFarelos = (x, y) => {
    if (calmo) return;
    for (let k = 0; k < 11; k++) {
      const f = document.createElement('i');
      f.className = 'farelo' + (k % 3 ? '' : ' gergelim');
      f.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.random() - .5) * 160}px;--dy:${90 + Math.random() * 160}px;--r:${Math.random() * 360}deg;--c:${['#fffaf0', '#f4ead6', '#ff8a5c', '#fffaf0', '#2a1e16'][k % 5]};animation-delay:${Math.random() * 60}ms`;
      farelos.append(f);
      setTimeout(() => f.remove(), 1200);
    }
  };
  const morder = (x, y) => {
    if (sec.classList.contains('acabou')) return;
    const w = corte.offsetWidth, h = corte.offsetHeight, r = Math.min(w, h) * .19;
    const ang = Math.atan2(y - h / 2, x - w / 2) + Math.PI;  // os dentes ficam do lado de dentro da mordida
    furos.push([x, y, r]);
    for (const k of [-.75, 0, .75]) furos.push([x + Math.cos(ang + k) * r * .95, y + Math.sin(ang + k) * r * .95, r * .4]);
    mascarar();
    corte.classList.remove('mastiga'); void corte.offsetWidth; corte.classList.add('mastiga');
    soltarFarelos(x, y);
    if (furos.length / 4 >= TOTAL) {
      sec.classList.add('acabou');
      titular('Acabou!', 'Tem mais.');
      status.textContent = `${mesaItens[prato].nome} · ${TOTAL} mordidas · o próximo já sai`;
      timer = setTimeout(() => carregar(prato + 1), 2200);
    } else contar();
  };
  btnMorder.addEventListener('click', e => {
    const b = corte.getBoundingClientRect();
    // pelo teclado (detail 0) morde a borda direita, como quem começa pela ponta
    if (e.detail === 0) return morder(b.width * (.82 + Math.random() * .12), b.height * (.3 + Math.random() * .4));
    morder(e.clientX - b.left, e.clientY - b.top);
  });
  const abrirMesa = i => { carregar(i); mesa.showModal(); };
  mesa.querySelector('.mesa__fechar').addEventListener('click', () => mesa.close());
  mesa.querySelectorAll('.mesa__seta').forEach(s => s.addEventListener('click', () => carregar(prato + +s.dataset.dir)));
  mesa.addEventListener('click', e => { if (e.target === mesa) mesa.close(); });
  mesa.addEventListener('close', () => clearTimeout(timer));
  mesa.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') carregar(prato + 1);
    if (e.key === 'ArrowLeft') carregar(prato - 1);
  });

  // (2.1) 3 cliques ou segurar o logo: volta para a home tocando a intro; um clique só vai para a home
  document.querySelectorAll('.nav-logo').forEach(logo => {
    let cliques = 0, espera, segura;
    const intro = () => { location.href = 'index.html?intro'; };
    logo.addEventListener('click', e => {
      e.preventDefault();
      cliques++; clearTimeout(espera);
      if (cliques >= 3) return intro();
      espera = setTimeout(() => { cliques = 0; location.href = logo.href; }, 420);
    });
    logo.addEventListener('pointerdown', () => { segura = setTimeout(intro, 650); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => logo.addEventListener(ev, () => clearTimeout(segura)));
    logo.addEventListener('contextmenu', e => e.preventDefault());
  });

  // vindo de um prato da faixa (cardapio.html#temakis): rola sozinho até o pergaminho abrir
  const abrirAgora = () => scrollTo({ top: palco.offsetTop + innerHeight * 0.9, behavior: calmo ? 'auto' : 'smooth' });
  rolar();
  if (location.hash && primeira(location.hash.slice(1)) >= 0) setTimeout(abrirAgora, 500);
})();
