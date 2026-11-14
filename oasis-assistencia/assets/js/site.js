/* Oásis (modelo de demonstração) — comportamento do site */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, body = doc.body;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  

  /* ---------- abertura com o floco se formando (1x por sessão) ---------- */
  var intro = doc.querySelector(".intro");
  if (intro) {
    var seen = false;
    try { seen = sessionStorage.getItem("intro-vista") === "1"; } catch (e) {}
    if (seen || reduce) { intro.remove(); }
    else {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      scrollTo(0, 0);                       // a intro sempre começa no topo da página
      body.classList.add("intro-lock");
      var closed = false;
      var closeIntro = function () {
        if (closed) return; closed = true;
        try { sessionStorage.setItem("intro-vista", "1"); } catch (e) {}
        intro.classList.add("done");
        body.classList.remove("intro-lock");
        setTimeout(function () { intro.remove(); }, 1300);
      };
      if (!/intro=/.test(location.hash)) setTimeout(closeIntro, 4800);   // (redesign) intro 3D em vidro dura ~4,5 s
      setTimeout(function () { if (!intro.classList.contains("intro--3d")) intro.classList.add("intro--nogl"); }, 2500);   // 3D não subiu: mostra o logo 2D
      intro.addEventListener("click", closeIntro);
      var sk = intro.querySelector(".intro-skip");
      if (sk) sk.addEventListener("click", closeIntro);
    }
  }

  /* ---------- (redesign) easter egg: 3 cliques rápidos ou segurar o logo = rever a intro ---------- */
  var brand = doc.querySelector(".brand");
  if (brand) {
    var taps = 0, tapTimer = 0, holdTimer = 0, replayed = false;
    var replay = function () {
      if (replayed) return; replayed = true;
      try { sessionStorage.removeItem("intro-vista"); } catch (e) {}
      location.href = "index.html";
    };
    var pulse = function () { brand.classList.remove("tap"); void brand.offsetWidth; brand.classList.add("tap"); };
    brand.addEventListener("click", function (e) {
      e.preventDefault(); pulse();
      taps++; clearTimeout(tapTimer);
      if (taps >= 3) { replay(); return; }
      tapTimer = setTimeout(function () { if (!replayed) location.href = brand.getAttribute("href"); taps = 0; }, 380);   // clique simples: vai ao início
    });
    brand.addEventListener("pointerdown", function () { clearTimeout(holdTimer); holdTimer = setTimeout(function () { pulse(); replay(); }, 750); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { brand.addEventListener(ev, function () { clearTimeout(holdTimer); }); });
    brand.addEventListener("contextmenu", function (e) { e.preventDefault(); });   // no celular, segurar não abre o menu do navegador
  }

  /* ---------- cabeçalho ---------- */
  var header = doc.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-solid", window.scrollY > 40); };
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    var tg = header.querySelector(".menu-toggle");
    if (tg) {
      tg.addEventListener("click", function () {
        var open = header.classList.toggle("menu-open");
        tg.setAttribute("aria-expanded", open);
        body.style.overflow = open ? "hidden" : "";
      });
      header.querySelectorAll(".nav a").forEach(function (a) {
        a.addEventListener("click", function () { header.classList.remove("menu-open"); tg.setAttribute("aria-expanded", "false"); body.style.overflow = ""; });
      });
    }
  }

  /* ---------- revelar ao rolar ---------- */
  var rvs = [].slice.call(doc.querySelectorAll(".rv"));
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add("in"); });

  /* ---------- vídeos opcionais: só usa se o arquivo existir em /media ---------- */
  doc.querySelectorAll("video[data-src]").forEach(function (v) {
    if (reduce) return;
    fetch(v.dataset.src, { method: "HEAD" }).then(function (r) {
      if (!r.ok) return;
      v.src = v.dataset.src; v.muted = true; v.loop = true; v.autoplay = true;
      v.addEventListener("playing", function () { v.classList.add("on"); }, { once: true });
      v.play().catch(function () {});
    }).catch(function () {});
  });

  /* ---------- neve no hero ---------- */
  var cv = doc.getElementById("snow");
  if (cv && !reduce) {
    var cx = cv.getContext("2d"), W = 0, H = 0, flakes = [], N = innerWidth < 700 ? 38 : 80, vis = true;
    var size = function () { var r = cv.getBoundingClientRect(); W = cv.width = r.width; H = cv.height = r.height; };
    size(); addEventListener("resize", size);
    for (var i = 0; i < N; i++) flakes.push({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 2.6, v: 0.25 + Math.random() * 0.8, p: Math.random() * 6.28 });
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(cv);
    (function tick() {
      if (vis) {
        cx.clearRect(0, 0, W, H); cx.fillStyle = "rgba(220,240,255,.85)";
        flakes.forEach(function (f) {
          f.y += f.v * 0.0011; f.p += 0.01; if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
          cx.beginPath(); cx.arc((f.x + Math.sin(f.p) * 0.012) * W, f.y * H, f.r, 0, 6.28); cx.fill();
        });
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- contadores ---------- */
  doc.querySelectorAll("[data-count]").forEach(function (el) {
    var end = +el.dataset.count, done = false;
    var run = function () {
      if (done) return; done = true;
      if (reduce) { el.textContent = end.toLocaleString("pt-BR"); return; }
      var t0 = performance.now();
      (function s(t) { var p = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e).toLocaleString("pt-BR"); if (p < 1) requestAnimationFrame(s); })(t0);
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { run(); o.disconnect(); } }).observe(el); else run();
  });

  /* ---------- (redesign) roda de serviços, no estilo ImageWheel ---------- */
  var wheel = doc.querySelector("[data-wheel]");
  if (wheel) {
    var wc = [].slice.call(wheel.querySelectorAll(".wcard"));
    var n = wc.length, TAU = Math.PI * 2, step = TAU / n;
    var ang = 0, vel = 0, target = null, drag = false, lastX = 0, moved = 0, hovering = false, t0w = performance.now();
    var sec = wheel.parentNode, now = sec.querySelector(".wheel-now"), shownFront = -1;
    var dims = function () { var w = wheel.clientWidth, sm = w < 700; return { rx: sm ? w * 0.62 : Math.min(w * 0.42, 620), rz: sm ? w * 0.5 : Math.min(w * 0.32, 380), y: Math.min(w * 0.04, 34) }; };
    var D = dims(); addEventListener("resize", function () { D = dims(); });
    var visW = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visW = e[0].isIntersecting; }).observe(wheel);
    var front = function () { var f = Math.round(-ang / step) % n; return (f + n) % n; };
    function place() {
      wc.forEach(function (c, i) {
        var a = ang + i * step, s = Math.sin(a), co = Math.cos(a);
        var x = s * D.rx, z = co * D.rz - D.rz * 0.35, y = -co * D.y + Math.sin(a * 2) * D.y * 0.6;
        var depth = (co + 1) / 2;
        c.style.transform = "translate(-50%,-50%) translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(1) + "px) rotateY(" + (-s * 22).toFixed(2) + "deg) rotateZ(" + (s * 7).toFixed(2) + "deg)";
        c.style.zIndex = Math.round(depth * 100);
        c.style.opacity = (0.25 + depth * 0.75).toFixed(3);
        c.style.setProperty("--depth", depth.toFixed(3));
      });
      var f = front();
      if (f !== shownFront) {
        shownFront = f;
        wc.forEach(function (c, i) { c.classList.toggle("is-front", i === f); c.tabIndex = i === f ? 0 : -1; });
        if (now) now.textContent = wc[f].querySelector("h3").textContent;
      }
    }
    function tickW(tm) {
      if (visW) {
        if (target !== null) { var d = target - ang; ang += d * 0.1; if (Math.abs(d) < 0.001) { ang = target; target = null; } }
        else if (!drag) { ang += vel; vel *= 0.94; if (!hovering && !reduce && Math.abs(vel) < 0.0012) ang -= 0.0016; }
        place();
        if (!reduce) wc.forEach(function (c, i) {          // cada card troca as fotos do próprio serviço
          var im = c.querySelectorAll("img"); if (im.length < 2) return;
          var k = Math.floor((tm - t0w + i * 470) / 2800) % im.length;
          if (c._k !== k) { c._k = k; im.forEach(function (x, j) { x.classList.toggle("on", j === k); }); }
        });
      }
      requestAnimationFrame(tickW);
    }
    requestAnimationFrame(tickW);
    var bringTo = function (i) {                        // gira pelo caminho mais curto até o card i ficar na frente
      var want = -i * step, k = Math.round((ang - want) / TAU); target = want + k * TAU;
    };
    var snap = function (dir) { bringTo((front() + dir + n) % n); };
    var pb = sec.querySelector(".wheel-prev"), nb = sec.querySelector(".wheel-next");
    if (pb) pb.addEventListener("click", function () { snap(-1); });
    if (nb) nb.addEventListener("click", function () { snap(1); });
    wheel.addEventListener("pointerdown", function (e) { drag = true; moved = 0; lastX = e.clientX; target = null; vel = 0; });
    addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
      var d = dx / (D.rx * 1.6); ang += d; vel = d;
      if (moved > 6) wheel.classList.add("drag");
    });
    addEventListener("pointerup", function () { drag = false; wheel.classList.remove("drag"); });
    wc.forEach(function (c, i) {
      c.addEventListener("dragstart", function (e) { e.preventDefault(); });
      c.addEventListener("click", function (e) {
        if (moved > 6) { e.preventDefault(); return; }                // foi arraste, não clique
        if (!c.classList.contains("is-front")) { e.preventDefault(); bringTo(i); }  // card de trás: traz para a frente
      });
      c.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse" && c.classList.contains("is-front")) hovering = true; });
      c.addEventListener("pointerleave", function () { hovering = false; });
      c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%"); c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%"); });
    });
    wheel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { snap(-1); e.preventDefault(); }
      if (e.key === "ArrowRight") { snap(1); e.preventDefault(); }
    });
    place();
  }

  /* ---------- carrosséis contínuos ("Somos autorizados" e galerias de fotos) ---------- */
  doc.querySelectorAll(".car").forEach(function (car) {
    var track = car.querySelector(".car-track");
    var items = [].slice.call(track.children);
    items.forEach(function (n) { var c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); });
    items.forEach(function (n) { var c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); });
    var pos = 0, speed = reduce ? 0 : 0.6, boost = 0, dragging = false, lastX = 0, hover = false, loopW = 0;
    var measure = function () { loopW = track.scrollWidth / 3; };
    measure(); addEventListener("resize", measure); addEventListener("load", measure);
    (function frame() {
      if (!dragging) { pos -= (hover ? 0 : speed) + boost; boost *= 0.92; if (Math.abs(boost) < 0.01) boost = 0; }
      if (loopW) { if (pos <= -loopW) pos += loopW; if (pos > 0) pos -= loopW; }
      track.style.transform = "translate3d(" + pos + "px,0,0)";
      requestAnimationFrame(frame);
    })();
    car.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hover = true; });
    car.addEventListener("pointerleave", function () { hover = false; });
    car.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; car.classList.add("drag"); car.setPointerCapture(e.pointerId); });
    car.addEventListener("pointermove", function (e) { if (dragging) { pos += e.clientX - lastX; lastX = e.clientX; } });
    var end = function () { dragging = false; car.classList.remove("drag"); };
    car.addEventListener("pointerup", end); car.addEventListener("pointercancel", end);
    var b = (car.closest("section") || doc).querySelectorAll(".car-btns button");
    if (b[0]) b[0].addEventListener("click", function () { boost = -14; });
    if (b[1]) b[1].addEventListener("click", function () { boost = 14; });
  });

  /* ---------- formulário rápido -> WhatsApp ---------- */
  doc.querySelectorAll("form[data-wa]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(f), t = "Olá! ";
      if (d.get("nome")) t += "Meu nome é " + d.get("nome") + ". ";
      if (d.get("servico")) t += "Preciso de: " + d.get("servico") + ". ";
      if (d.get("mensagem")) t += d.get("mensagem");
      alert("No site real, isto abre o WhatsApp da empresa com a mensagem:\n\n" + t.trim());  // modelo: não sai do site
    });
  });
})();
