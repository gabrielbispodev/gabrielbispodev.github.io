/* (redesign) Intro 3D do logo OÁSIS em vidro/gelo: o floco cresce como cristal, o anel de traços
   acende em vidro colorido, ÁSIS e "ASSISTÊNCIA TÉCNICA" chegam em letras de gelo. Three.js r128.
   Se o WebGL falhar, fica a versão SVG animada que já está no HTML. */
(function () {
  "use strict";
  requestAnimationFrame(function () {          // espera o site.js decidir se a intro aparece
    var intro = document.querySelector(".intro");
    var canvas = document.getElementById("intro3d");
    if (!intro || !canvas) return;
    var fallback = function () { intro.classList.add("intro--nogl"); };
    if (!window.THREE) { fallback(); return; }
    var T = THREE, PI = Math.PI, renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); } catch (e) { fallback(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    var sc = new T.Scene();
    var cam = new T.PerspectiveCamera(35, 1, 0.1, 200);

    // estúdio para os reflexos do vidro: faixas claras e um recorte ciano
    (function () {
      var env = new T.Scene(); env.background = new T.Color(0x050b14);
      var add = function (w, h, c, k, x, y, z, rx, ry) {
        var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide }));
        m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m);
      };
      add(30, 3, 0xffffff, 3.0, 0, 10, 0, PI / 2);
      add(3, 20, 0xbfe8ff, 2.2, -12, 0, 2, 0, PI / 2);
      add(3, 20, 0x7cc8ff, 1.6, 12, 0, 2, 0, -PI / 2);
      add(24, 2, 0xe6f6ff, 0.15, 0, -3, 12, 0, PI);
      add(6, 6, 0xffb37a, 0.6, 8, -8, 6, -PI / 3);
      sc.environment = new T.PMREMGenerator(renderer).fromScene(env, 0.02).texture;
    })();
    sc.add(new T.AmbientLight(0x9fd0ff, 0.25));
    var key = new T.DirectionalLight(0xffffff, 0.7); key.position.set(3, 6, 10); sc.add(key);
    var back = new T.PointLight(0x5bc8ff, 2.5, 30, 2); back.position.set(0, 0, -6); sc.add(back);
    var glint = new T.PointLight(0xffffff, 0, 18, 2); glint.position.set(-12, 2, 5); sc.add(glint);   // brilho que passa pelo vidro

    // materiais de gelo / vidro
    var ice = function (tint, k) {
      return new T.MeshPhysicalMaterial({
        color: tint || 0x9fdcff, metalness: 0, roughness: 0.08, transmission: 0.2, transparent: true, opacity: k || 0.62,
        clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2, reflectivity: 1, depthWrite: false,
        emissive: new T.Color(tint || 0x9fdcff).multiplyScalar(0.12)
      });
    };
    // vidro de gelo em 3 camadas: volume azul translúcido + película que só soma reflexos (fresnel) + núcleo aceso
    var ICE = new T.MeshStandardMaterial({ color: 0x3aa2ec, emissive: 0x0f5fa8, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0,
      transparent: true, opacity: 0.34, depthWrite: true, envMapIntensity: 0.5, side: T.FrontSide });
    var SHELL = new T.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
      envMapIntensity: 2.8, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
    var FROST = new T.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.11, blending: T.AdditiveBlending, depthWrite: false });

    // cápsula extrudada (traço com pontas redondas)
    function capsule(len, w, depth, mat) {
      var r = w / 2, s = new T.Shape();
      s.moveTo(-r, 0); s.lineTo(-r, len); s.absarc(0, len, r, PI, 0, true); s.lineTo(r, 0); s.absarc(0, 0, r, 0, PI, true);
      var g = new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 10 });
      g.translate(0, 0, -depth / 2);
      return new T.Mesh(g, mat);
    }
    function frosted(m) {   // núcleo fosco dentro do gelo: dá a sensação de cristal
      var core = new T.Mesh(m.geometry, FROST); core.scale.set(1, 1, 0.4);   // só afina na profundidade: não desloca o contorno core.renderOrder = 0; m.add(core);   // núcleo antes do corpo
      var shell = new T.Mesh(m.geometry, SHELL); shell.renderOrder = 2; m.add(shell); m.renderOrder = 1; return m;
    }
    function seg(group, x1, y1, x2, y2, w, d) {   // segmento de x1,y1 até x2,y2
      var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      var m = frosted(capsule(len, w, d, ICE)); m.position.set(x1, y1, 0); m.rotation.z = Math.atan2(dy, dx) - PI / 2;
      group.add(m); return m;
    }

    /* ---------- floco de neve (mesmo desenho do logo) ---------- */
    var logo = new T.Group(); sc.add(logo);
    var flake = new T.Group(); logo.add(flake);
    var arms = [];
    for (var a = 0; a < 6; a++) {
      var arm = new T.Group(); arm.rotation.z = a * PI / 3; flake.add(arm);
      var stem = new T.Group(); arm.add(stem); seg(stem, 0, 0.13, 0, 0.96, 0.15, 0.32);
      var br = [];
      [[0.53, 0.19, 0.71], [0.31, 0.26, 0.5], [0.91, 0.11, 1.02]].forEach(function (b) {
        var g = new T.Group(); g.position.y = b[0]; arm.add(g);
        seg(g, 0, 0, -b[1], b[2] - b[0], 0.12, 0.26); seg(g, 0, 0, b[1], b[2] - b[0], 0.12, 0.26);
        br.push(g);
      });
      arms.push({ stem: stem, br: br });
    }
    var hexS = new T.Shape(), hexH = new T.Path();
    for (var h = 0; h < 6; h++) { var ha = h * PI / 3 + PI / 6; (h ? hexS.lineTo : hexS.moveTo).call(hexS, Math.cos(ha) * 0.16, Math.sin(ha) * 0.16); (h ? hexH.lineTo : hexH.moveTo).call(hexH, Math.cos(ha) * 0.08, Math.sin(ha) * 0.08); }
    hexS.holes.push(hexH);
    var hexG = new T.ExtrudeGeometry(hexS, { depth: 0.3, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.03, bevelSegments: 3 }); hexG.translate(0, 0, -0.15);
    var hex = frosted(new T.Mesh(hexG, ICE)); flake.add(hex);

    /* ---------- anel de traços em vidro colorido (o "O") ---------- */
    var ring = new T.Group(); logo.add(ring);
    var COLS = [0x2f6ea6, 0x3e86c2, 0x6faedb, 0xa9d2ee, 0xf2a15a, 0xec7a2c, 0xe2401f, 0xd61f1f, 0xf3b78c, 0xf6cfae];
    var ticks = [], N = 22;
    for (var i = 0; i < N; i++) {
      var ang = (-102 + i * (210 / (N - 1))) * PI / 180;
      var col = COLS[Math.min(COLS.length - 1, Math.floor(i / N * COLS.length))];
      var tk = capsule(0.17, 0.085, 0.16, new T.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.95, envMapIntensity: 0.25 }));
      var holder = new T.Group(); holder.position.set(Math.cos(ang) * 1.22, -Math.sin(ang) * 1.22, 0);
      // traço radial: orienta a cápsula de dentro para fora
      holder.rotation.z = Math.atan2(-Math.sin(ang), Math.cos(ang)) - PI / 2;
      holder.add(tk); ring.add(holder); ticks.push(holder);
    }

    /* ---------- letras em gelo ---------- */
    var letters = [], sub = null, dashes = [], ready = false;
    fetch("assets/fonts/poppins-800.typeface.json").then(function (r) { return r.json(); }).then(function (data) {
      var font = new T.Font(data), size = 2.55, res = data.resolution;
      var x = 1.62;
      "ÁSIS".split("").forEach(function (ch) {
        var g = new T.TextGeometry(ch, { font: font, size: size, height: 0.4, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.045, bevelSegments: 4 });
        g.translate(0, 0, -0.2);
        var m = frosted(new T.Mesh(g, ICE)); m.position.set(x, -0.9, 0);
        logo.add(m); letters.push(m);
        x += data.glyphs[ch].ha * size / res - 0.05;
      });
      var sg = new T.TextGeometry("ASSISTÊNCIA TÉCNICA", { font: font, size: 0.56, height: 0.14, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.014, bevelSegments: 2 });
      sg.computeBoundingBox();
      var sw = sg.boundingBox.max.x - sg.boundingBox.min.x;
      sub = frosted(new T.Mesh(sg, ICE.clone())); sub.material.opacity = 0.75;
      var cx = (x - 1.45) / 2 - 0.3;   // centro do conjunto
      sub.position.set(cx - sw / 2, -2.3, 0); logo.add(sub);
      [-1, 1].forEach(function (sgn) {
        var d = frosted(capsule(0.75, 0.09, 0.1, ICE)); d.rotation.z = PI / 2;
        d.position.set(cx + sgn * (sw / 2 + 0.3) + (sgn > 0 ? 0.75 : 0), -2.02, 0); logo.add(d); dashes.push(d);
      });
      logo.position.x = -cx;     // centraliza o logo na tela
      ready = true; intro.classList.remove("intro--nogl");   // 3D pronto: some o logo reserva
    }).catch(fallback);

    /* ---------- neve ---------- */
    var NS = 420, pos = new Float32Array(NS * 3), sp = [];
    for (var n = 0; n < NS; n++) { pos[n * 3] = (Math.random() - 0.5) * 30; pos[n * 3 + 1] = (Math.random() - 0.5) * 18; pos[n * 3 + 2] = -6 + Math.random() * 10; sp.push(0.4 + Math.random()); }
    var pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pos, 3));
    var snow = new T.Points(pg, new T.PointsMaterial({ color: 0xe6f6ff, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending }));
    sc.add(snow);

    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    addEventListener("resize", size); size();

    intro.classList.add("intro--3d");
    var clamp = function (x) { return Math.max(0, Math.min(1, x)); };
    var outCubic = function (x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
    var outBack = function (x) { x = clamp(x); var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
    var t0 = 0, raf = 0, last = 0;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!document.body.contains(canvas)) { cancelAnimationFrame(raf); renderer.dispose(); return; }
      if (!ready) return;                 // nada na tela até tudo estar pronto
      if (!t0) t0 = now;
      var fix = /intro=([\d.]+)/.exec(location.hash);
      var t = fix ? +fix[1] : (now - t0) / 1000, dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;

      // floco: gira e cresce como cristal
      var f = outCubic(t / 1.3);
      flake.rotation.z = (1 - f) * -2.2;
      flake.rotation.y = (1 - f) * 1.1 + Math.sin(t * 1.2) * 0.12 * (1 - clamp((t - 2.6) / 1.2));
      flake.scale.setScalar(0.35 + 0.65 * f);
      arms.forEach(function (am) {
        am.stem.scale.y = Math.max(0.001, outCubic((t - 0.1) / 0.7));
        am.br.forEach(function (b, k) { b.scale.setScalar(Math.max(0.001, outBack((t - 0.5 - k * 0.14) / 0.45))); });
      });
      hex.scale.setScalar(Math.max(0.001, outBack((t - 0.95) / 0.4)));
      // anel acende traço a traço
      ticks.forEach(function (tk, k) { var s = outBack((t - 1.0 - k * 0.035) / 0.35); tk.scale.setScalar(Math.max(0.001, s)); });
      // letras chegam girando, de trás
      letters.forEach(function (m, k) {
        var s = outBack((t - 1.35 - k * 0.13) / 0.75), base = m.userData.bx === undefined ? (m.userData.bx = m.position.x) : m.userData.bx;
        m.position.set(base, -0.9 + (1 - s) * 2.2, (1 - s) * -6); m.rotation.x = (1 - s) * -1.4; m.rotation.y = (1 - s) * 0.6;
        m.visible = s > 0.02;
      });
      if (sub) { var u = outCubic((t - 2.15) / 0.7); sub.visible = u > 0.02; sub.position.z = (1 - u) * -2; sub.position.y = -2.3 - (1 - u) * 0.4; }
      dashes.forEach(function (d) { var v = outCubic((t - 2.35) / 0.5); d.scale.y = Math.max(0.001, v); d.visible = v > 0.02; });
      // brilho atravessando o vidro
      var g = clamp((t - 1.9) / 1.6);
      glint.intensity = Math.sin(g * PI) * 6; glint.position.x = -12 + 26 * g;
      back.intensity = 3 + Math.sin(t * 2) * 0.8;
      // câmera: aproximação lenta, enquadrando o logo inteiro
      var fitW = 14.2, dist = Math.max(fitW / (2 * Math.tan(cam.fov * PI / 360) * cam.aspect), 10.5);
      var settle = 1 - outCubic((t - 2.4) / 1.2);           // termina de frente: sem lateral aparecendo
      cam.position.set(Math.sin(t * 0.9) * 0.9 * settle, 0.35 * settle, dist * (1.12 - 0.12 * outCubic(t / 4)));
      cam.lookAt(0, -0.35 * (1 - settle * 0) , 0);
      logo.rotation.y = Math.sin(t * 0.7) * 0.1 * (1 - clamp((t - 2.8) / 1));
      // neve
      for (var q = 0; q < NS; q++) { pos[q * 3 + 1] -= sp[q] * dt * 0.9; pos[q * 3] += Math.sin(t + q) * dt * 0.1; if (pos[q * 3 + 1] < -9) pos[q * 3 + 1] = 9; }
      pg.attributes.position.needsUpdate = true;
      renderer.render(sc, cam);
    }
    raf = requestAnimationFrame(frame);
  });
})();
