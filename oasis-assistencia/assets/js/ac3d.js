/* split hi-wall detalhado que se desmonta ao rolar (Three.js r128, modelo feito em código)
   (redesign) v2: carcaça curva, display, grade, palhetas, filtros, evaporador com aletas e tubos,
   turbina de fluxo cruzado, caixa elétrica com placa, dreno, chassi, placa de fixação e tubulação. */
(function () {
  "use strict";
  var scene = document.querySelector(".scene");
  var canvas = document.getElementById("ac3d");
  if (!scene || !canvas) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!window.THREE) { scene.style.height = "auto"; return; }
  var T = THREE, renderer, PI = Math.PI;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
  catch (e) { scene.style.height = "auto"; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  var sc = new T.Scene();
  var cam = new T.PerspectiveCamera(30, 1, 0.1, 200);

  /* ---------- ambiente de estúdio para reflexos (softboxes) ---------- */
  (function () {
    var env = new T.Scene(); env.background = new T.Color(0x0a1626);
    var panel = function (w, h, color, inten, x, y, z, ry, rx) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(inten), side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m);
    };
    panel(14, 5, 0xffffff, 2.2, 0, 9, 2, 0, PI / 2);       // softbox de cima
    panel(5, 9, 0x6fb6ff, 0.7, -10, 1, 2, PI / 2);         // recorte frio à esquerda
    panel(5, 7, 0xffd2aa, 1.4, 10, 0, 3, -PI / 2);         // quente à direita
    panel(10, 3, 0xdfeeff, 0.9, 0, 1, 12, PI);             // frente
    var pm = new T.PMREMGenerator(renderer);
    sc.environment = pm.fromScene(env, 0.04).texture;
  })();

  sc.add(new T.HemisphereLight(0xf2f6ff, 0x1a2230, 0.4));
  var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(4, 9, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9; key.shadow.bias = -0.0005;
  sc.add(key);
  var rim = new T.DirectionalLight(0x5bb0ec, 0.9); rim.position.set(-9, 3, -6); sc.add(rim);
  var warm = new T.PointLight(0xd08150, 1.1, 25, 2); warm.position.set(6, -2, 6); sc.add(warm);

  /* ---------- materiais ---------- */
  var phys = function (o) { return new T.MeshPhysicalMaterial(o); };
  var std = function (o) { return new T.MeshStandardMaterial(o); };
  var MAT = {
    shell: phys({ color: 0xf3f6f9, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    shellInner: std({ color: 0xd9e1e8, roughness: 0.7 }),
    glass: phys({ color: 0x0a1018, roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
    darkPlastic: std({ color: 0x1b2430, roughness: 0.62 }),
    grey: std({ color: 0x5d6873, roughness: 0.55, metalness: 0.15 }),
    alu: std({ color: 0xc4ced8, roughness: 0.32, metalness: 0.9 }),
    galv: std({ color: 0xa7b1ba, roughness: 0.42, metalness: 0.85 }),
    copper: std({ color: 0xd98a52, roughness: 0.28, metalness: 1, envMapIntensity: 1.3 }),
    brass: std({ color: 0xc9a24a, roughness: 0.3, metalness: 1 }),
    blade: std({ color: 0x24303d, roughness: 0.45, metalness: 0.1 }),
    pcb: std({ color: 0x0f5c47, roughness: 0.45, metalness: 0.15 }),
    chip: std({ color: 0x111418, roughness: 0.4 }),
    foam: std({ color: 0x15171a, roughness: 0.95 }),
    white: std({ color: 0xeef1f4, roughness: 0.5 }),
    blue: std({ color: 0x2d6fd0, roughness: 0.4 }),
    red: std({ color: 0xb0242a, roughness: 0.5 }),
    yellow: std({ color: 0xd9b23a, roughness: 0.5 }),
    black: std({ color: 0x0b0d10, roughness: 0.6 }),
    steel: std({ color: 0x8f9aa6, roughness: 0.35, metalness: 0.95 })
  };

  /* ---------- utilitários de geometria ---------- */
  var mesh = function (g, m, sh) { var o = new T.Mesh(g, m); if (sh !== false) { o.castShadow = true; o.receiveShadow = true; } return o; };
  var box = function (w, h, d, m) { return mesh(new T.BoxGeometry(w, h, d), m); };
  var cyl = function (r1, r2, h, s, m) { return mesh(new T.CylinderGeometry(r1, r2, h, s || 24), m); };
  // perfil lateral (z = profundidade, y = altura) extrudado ao longo de x, centralizado
  function extrudeX(pts, width, m, bevel) {
    var sh = new T.Shape(); pts.forEach(function (p, i) { if (i) sh.lineTo(p[0], p[1]); else sh.moveTo(p[0], p[1]); });
    var b = bevel || 0;
    var g = new T.ExtrudeGeometry(sh, { depth: width - 2 * b, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 4, curveSegments: 24, steps: 1 });
    g.rotateY(-PI / 2); g.translate((width - 2 * b) / 2, 0, 0);
    return mesh(g, m);
  }
  // faixa de espessura t ao longo de uma curva (para a carcaça curva)
  function bandPts(keys, t, n, center) {
    var c = new T.CatmullRomCurve3(keys.map(function (k) { return new T.Vector3(k[0], k[1], 0); }), false, "centripetal");
    var out = [], inn = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, p = c.getPoint(u), tg = c.getTangent(u);
      var nx = -tg.y, ny = tg.x;
      if ((center[0] - p.x) * nx + (center[1] - p.y) * ny < 0) { nx = -nx; ny = -ny; }
      out.push([p.x, p.y]); inn.push([p.x + nx * t, p.y + ny * t]);
    }
    return { band: out.concat(inn.reverse()), curve: out };
  }
  function instanced(geo, m, list) {   // list: [{p:[x,y,z], r:[x,y,z], s:[x,y,z]}]
    var im = new T.InstancedMesh(geo, m, list.length), o = new T.Object3D();
    list.forEach(function (it, i) {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      o.rotation.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0);
      o.scale.set(it.s ? it.s[0] : 1, it.s ? it.s[1] : 1, it.s ? it.s[2] : 1);
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    });
    im.castShadow = true; im.receiveShadow = true; return im;
  }
  function tube(points, r, m, seg) {
    var c = new T.CatmullRomCurve3(points.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }));
    return mesh(new T.TubeGeometry(c, seg || 48, r, 12, false), m);
  }
  function canvasTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  /* ---------- dimensões (unidade ≈ 11 cm; aparelho ~ 90 × 30 × 23 cm) ---------- */
  var W = 8.2, HALF = W / 2;
  var rig = new T.Group(); sc.add(rig);
  var parts = [];
  function part(name, step, g, ex) { rig.add(g); g.userData.base = g.position.clone(); g.userData.baseRot = g.rotation.clone(); parts.push({ name: name, step: step, g: g, ex: ex }); ownMaterials(g); return g; }
  function ownMaterials(g) {        // cada peça com materiais próprios, para destacar só ela
    var cache = {};
    g.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var m = o.material; if (!cache[m.uuid]) { cache[m.uuid] = m.clone(); } o.material = cache[m.uuid];
    });
  }

  /* ===== 1. CARCAÇA FRONTAL (curva) com tampas laterais, grade superior, display ===== */
  var cover = new T.Group();                    // pivô na dobradiça superior traseira
  cover.position.set(0, 1.42, -0.3);
  var coverIn = new T.Group(); coverIn.position.set(0, -1.42, 0.3); cover.add(coverIn);
  var KEYS = [[-0.3, 1.42], [0.45, 1.42], [0.92, 1.3], [1.13, 0.92], [1.18, 0.2], [1.13, -0.48], [0.98, -0.88], [0.78, -1.02]];
  var bp = bandPts(KEYS, 0.07, 70, [0.2, 0.1]);
  var shellMesh = extrudeX(bp.band, W - 0.16, MAT.shell, 0.012); coverIn.add(shellMesh);
  var capPts = bp.curve.concat([[0.3, -1.02], [-0.3, -1.02]]);
  [-1, 1].forEach(function (sgn) {
    var cap = extrudeX(capPts, 0.09, MAT.shell, 0.02); cap.position.x = sgn * (HALF - 0.05); coverIn.add(cap);
  });
  // grade de entrada de ar no topo
  var slats = []; for (var s = 0; s < 22; s++) slats.push({ p: [0, 1.445, -0.24 + s * 0.031] });
  coverIn.add(instanced(new T.BoxGeometry(W - 0.5, 0.025, 0.014), MAT.darkPlastic, slats));
  // filete decorativo e display
  var trim = box(W - 0.4, 0.012, 0.012, MAT.grey); trim.position.set(0, -0.62, 1.15); coverIn.add(trim);
  var dispTex = canvasTex(256, 96, function (c, w, h) {
    c.fillStyle = "#05090f"; c.fillRect(0, 0, w, h);
    c.shadowColor = "#5bd0ff"; c.shadowBlur = 14; c.fillStyle = "#8fe3ff";
    c.font = "bold 64px Poppins, Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("24°", w / 2 - 10, h / 2 + 4);
    c.font = "bold 20px Arial"; c.fillText("❄", w - 34, 30);
  });
  var disp = mesh(new T.PlaneGeometry(0.62, 0.24), new T.MeshStandardMaterial({ map: dispTex, emissive: 0xffffff, emissiveMap: dispTex, emissiveIntensity: 0.9, roughness: 0.15 }), false);
  disp.position.set(2.9, 0.42, 1.172); disp.rotation.x = -0.05; coverIn.add(disp);
  var dispFrame = box(0.7, 0.3, 0.01, MAT.glass); dispFrame.position.set(2.9, 0.42, 1.165); coverIn.add(dispFrame);
  part("Carcaça", 0, cover, function (k, g, b) { g.rotation.x = b.rx - 0.95 * k; g.position.y = b.y + 1.6 * k; g.position.z = b.z + 1.3 * k; });

  /* ===== 1b. ALETA DIRECIONAL + PALHETAS (saem junto com a carcaça) ===== */
  var louver = new T.Group(); louver.position.set(0, -1.17, 0.7);
  var flapPts = bandPts([[-0.32, 0.06], [0, 0.0], [0.32, -0.08]], 0.035, 16, [0, 0.4]).band;
  var flap = extrudeX(flapPts, W - 0.9, MAT.shell, 0.008); flap.rotation.x = 0.45; louver.add(flap);
  var vanes = []; for (var v = 0; v < 26; v++) vanes.push({ p: [-HALF + 0.6 + v * ((W - 1.2) / 25), 0.08, -0.12], r: [0, 0.25 * Math.sin(v * 0.4), 0] });
  louver.add(instanced(new T.BoxGeometry(0.018, 0.2, 0.34), MAT.darkPlastic, vanes));
  part("Aleta", 0, louver, function (k, g, b) { g.position.y = b.y - 1.3 * k; g.position.z = b.z + 2.6 * k; g.rotation.x = b.rx + 0.3 * k; });

  /* ===== 2. FILTROS (duas molduras com malha) ===== */
  var meshTex = canvasTex(512, 256, function (c, w, h) {
    c.clearRect(0, 0, w, h); c.strokeStyle = "rgba(205,228,245,0.95)"; c.lineWidth = 2;
    for (var x = 0; x <= w; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (var y = 0; y <= h; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
  meshTex.wrapS = meshTex.wrapT = T.RepeatWrapping; meshTex.repeat.set(3, 2);
  var filters = new T.Group(); filters.position.set(0, 0.55, 0.78); filters.rotation.x = -0.32;
  [-1, 1].forEach(function (sgn) {
    var f = new T.Group(); f.position.x = sgn * 1.95; f.userData.sgn = sgn;
    var fw = 3.75, fh = 1.85;
    var m = mesh(new T.PlaneGeometry(fw - 0.1, fh - 0.1), new T.MeshStandardMaterial({ map: meshTex, alphaMap: meshTex, transparent: true, color: 0xdff0ff, roughness: 0.6, side: T.DoubleSide, depthWrite: false }), false);
    f.add(m);
    [[0, fh / 2, fw, 0.06], [0, -fh / 2, fw, 0.06], [-fw / 2, 0, 0.06, fh], [fw / 2, 0, 0.06, fh], [0, 0, 0.04, fh], [0, fh / 6, fw, 0.03], [0, -fh / 6, fw, 0.03]].forEach(function (r) {
      var e = box(r[2], r[3], 0.05, MAT.darkPlastic); e.position.set(r[0], r[1], 0); f.add(e);
    });
    var tab = box(0.5, 0.18, 0.06, MAT.darkPlastic); tab.position.set(0, -fh / 2 - 0.08, 0.02); f.add(tab);
    filters.add(f);
  });
  part("Filtros", 1, filters, function (k, g, b) {
    g.position.z = b.z + 2.2 * k; g.position.y = b.y + 0.5 * k;
    g.children.forEach(function (f) { f.position.x = f.userData.sgn * (1.95 + 1.35 * k); f.rotation.y = -f.userData.sgn * 0.5 * k; });
  });

  /* ===== 3. EVAPORADOR (duas placas com aletas, tubos e curvas de retorno) ===== */
  var evap = new T.Group(); evap.position.set(-0.45, 0, 0);
  var EW = 6.6;
  function slab(h, d, nFin, rows, cols) {
    var g = new T.Group(), fins = [];
    for (var i = 0; i < nFin; i++) fins.push({ p: [-EW / 2 + (i + 0.5) * (EW / nFin), 0, 0] });
    g.add(instanced(new T.BoxGeometry(0.008, h, d), MAT.alu, fins));
    var tubes = [], bends = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var y = -h / 2 + (r + 0.5) * (h / rows), z = -d / 2 + (c + 0.5) * (d / cols);
      tubes.push({ p: [0, y, z] });
      if (r % 2 === 0 && r + 1 < rows) bends.push({ p: [EW / 2 + 0.03, y + h / rows / 2, z], r: [0, PI / 2, PI / 2] });
      if (r % 2 === 1 && r + 1 < rows) bends.push({ p: [-EW / 2 - 0.03, y + h / rows / 2, z], r: [0, -PI / 2, PI / 2] });
    }
    g.add(instanced(new T.CylinderGeometry(0.035, 0.035, EW + 0.08, 12).rotateZ(PI / 2), MAT.copper, tubes));
    g.add(instanced(new T.TorusGeometry(h / rows / 2, 0.033, 8, 16, PI), MAT.copper, bends));
    [-1, 1].forEach(function (s) { var ep = box(0.03, h + 0.05, d + 0.04, MAT.galv); ep.position.x = s * (EW / 2 + 0.01); g.add(ep); });
    return g;
  }
  var slabA = slab(1.9, 0.36, 170, 12, 2); slabA.position.set(0, -0.12, 0.42); slabA.rotation.x = -0.22; evap.add(slabA);
  var slabB = slab(1.05, 0.32, 170, 6, 2); slabB.position.set(0, 1.0, -0.12); slabB.rotation.x = -1.05; evap.add(slabB);
  // distribuidor e tubos de saída (lado direito)
  for (var q = 0; q < 6; q++) evap.add(tube([[EW / 2 + 0.06, -0.8 + q * 0.3, 0.45], [EW / 2 + 0.25, -0.5 + q * 0.12, 0.1], [EW / 2 + 0.32, 0.1, -0.45], [EW / 2 + 0.3, -0.6, -0.8]], 0.014, MAT.copper, 32));
  evap.add(tube([[EW / 2 + 0.1, 0.9, -0.2], [EW / 2 + 0.38, 0.6, -0.5], [EW / 2 + 0.4, -0.9, -0.85], [EW / 2 + 0.2, -1.3, -1.0]], 0.05, MAT.copper, 40));
  part("Evaporador", 2, evap, function (k, g, b) { g.position.z = b.z + 1.55 * k; g.position.y = b.y + 0.25 * k; });

  /* ===== 4. TURBINA (rotor de fluxo cruzado) + motor ===== */
  var blower = new T.Group(); blower.position.set(-0.45, -0.5, -0.05);
  var rotor = new T.Group(); blower.add(rotor);
  var SEG = 9, BL = 34, segLen = EW / SEG, blades = [], discs = [];
  for (var sgi = 0; sgi < SEG; sgi++) {
    var cx = -EW / 2 + (sgi + 0.5) * segLen;
    for (var bi = 0; bi < BL; bi++) { var a = bi / BL * PI * 2; blades.push({ p: [cx, Math.cos(a) * 0.4, Math.sin(a) * 0.4], r: [-a + 0.55, 0, 0] }); }
  }
  for (var di = 0; di <= SEG; di++) discs.push({ p: [-EW / 2 + di * segLen, 0, 0], r: [0, 0, PI / 2] });
  rotor.add(instanced(new T.BoxGeometry(segLen - 0.03, 0.012, 0.13), MAT.blade, blades));
  rotor.add(instanced(new T.CylinderGeometry(0.47, 0.47, 0.018, 40), MAT.blade, discs));
  var shaft = cyl(0.04, 0.04, EW + 0.6, 12, MAT.steel); shaft.rotation.z = PI / 2; blower.add(shaft);
  var motor = new T.Group(); motor.position.x = EW / 2 + 0.38;
  var mb = cyl(0.3, 0.3, 0.42, 36, MAT.darkPlastic); mb.rotation.z = PI / 2; motor.add(mb);
  var ribs = []; for (var ri = 0; ri < 18; ri++) { var ra = ri / 18 * PI * 2; ribs.push({ p: [0, Math.cos(ra) * 0.3, Math.sin(ra) * 0.3], r: [ra, 0, 0] }); }
  motor.add(instanced(new T.BoxGeometry(0.4, 0.03, 0.05), MAT.grey, ribs));
  var mcap = cyl(0.2, 0.26, 0.08, 30, MAT.galv); mcap.rotation.z = PI / 2; mcap.position.x = 0.24; motor.add(mcap);
  blower.add(motor);
  var bearing = cyl(0.12, 0.12, 0.12, 20, MAT.darkPlastic); bearing.rotation.z = PI / 2; bearing.position.x = -EW / 2 - 0.12; blower.add(bearing);
  part("Turbina", 3, blower, function (k, g, b) { g.position.z = b.z + 1.0 * k; g.position.y = b.y - 1.55 * k; });

  /* ===== 5. CAIXA ELÉTRICA + PLACA ===== */
  var ebox = new T.Group(); ebox.position.set(HALF - 0.55, 0.05, 0.15);
  var ecase = box(0.75, 2.0, 0.8, MAT.galv); ecase.position.z = -0.1; ebox.add(ecase);
  var pcbG = new T.Group(); pcbG.position.set(0, 0.1, 0.33);
  pcbG.add(box(0.66, 1.5, 0.03, MAT.pcb));
  var chips = [];
  for (var ci = 0; ci < 14; ci++) chips.push({ p: [-0.22 + (ci % 3) * 0.2, 0.62 - Math.floor(ci / 3) * 0.17, 0.025], s: [0.6 + (ci % 2) * 0.5, 0.7, 1] });
  pcbG.add(instanced(new T.BoxGeometry(0.12, 0.1, 0.03), MAT.chip, chips));
  [[-0.18, -0.25, MAT.blue], [0.15, -0.3, MAT.black]].forEach(function (c) {
    var e = cyl(0.075, 0.075, 0.22, 20, c[2]); e.rotation.x = PI / 2; e.position.set(c[0], c[1], 0.12); pcbG.add(e);
    var top = cyl(0.07, 0.07, 0.005, 20, MAT.steel); top.rotation.x = PI / 2; top.position.set(c[0], c[1], 0.232); pcbG.add(top);
  });
  var relay = box(0.2, 0.16, 0.16, MAT.blue); relay.position.set(0.18, -0.02, 0.09); pcbG.add(relay);
  var trafo = box(0.22, 0.2, 0.18, MAT.yellow); trafo.position.set(-0.18, 0.02, 0.1); pcbG.add(trafo);
  var wind = cyl(0.07, 0.07, 0.23, 16, MAT.copper); wind.rotation.z = PI / 2; wind.position.set(-0.18, 0.02, 0.2); pcbG.add(wind);
  var sink = new T.Group(); sink.position.set(0.1, 0.32, 0.06);
  for (var hs = 0; hs < 7; hs++) { var fin2 = box(0.012, 0.18, 0.14, MAT.alu); fin2.position.x = -0.1 + hs * 0.035; sink.add(fin2); }
  pcbG.add(sink);
  var tblock = box(0.5, 0.12, 0.1, MAT.white); tblock.position.set(0, -0.62, 0.06); pcbG.add(tblock);
  var screws = []; for (var sc2 = 0; sc2 < 4; sc2++) screws.push({ p: [-0.18 + sc2 * 0.12, -0.62, 0.115], r: [PI / 2, 0, 0] });
  pcbG.add(instanced(new T.CylinderGeometry(0.025, 0.025, 0.02, 10), MAT.steel, screws));
  [MAT.red, MAT.blue, MAT.white, MAT.yellow, MAT.black].forEach(function (m, i) {
    pcbG.add(tube([[-0.25 + i * 0.12, -0.68, 0.08], [-0.25 + i * 0.12, -0.95, 0.05], [-0.4 - i * 0.05, -1.15, -0.2], [-1.2 - i * 0.1, -1.0, -0.6]], 0.012, m, 24));
  });
  ebox.add(pcbG);
  var lid = box(0.75, 2.0, 0.03, MAT.galv); lid.position.z = 0.33; ebox.add(lid);
  part("Placa eletrônica", 4, ebox, function (k, g, b) {
    g.position.x = b.x + 1.9 * k; g.position.z = b.z + 1.2 * k;
    lid.position.set(0.9 * k, 0.6 * k, 0.33 + 0.5 * k); pcbG.position.z = 0.33 + 0.35 * k;
  });

  /* ===== 6. CHASSI + BANDEJA DE DRENO ===== */
  var chassis = new T.Group();
  var CH = [[-1.1, 1.38], [-0.32, 1.38], [-0.32, -0.84], [0.08, -1.1], [0.8, -1.1], [0.84, -1.24], [0.62, -1.4], [-1.1, -1.4]];
  chassis.add(extrudeX(CH, W - 0.2, MAT.shellInner, 0.03));
  var outlet = box(W - 0.9, 0.18, 0.52, MAT.darkPlastic); outlet.position.set(0, -1.2, 0.5); chassis.add(outlet);
  var pan = box(EW + 0.2, 0.1, 0.95, MAT.grey); pan.position.set(-0.45, -0.95, 0.3); chassis.add(pan);
  var lip = box(EW + 0.2, 0.16, 0.04, MAT.grey); lip.position.set(-0.45, -0.88, 0.76); chassis.add(lip);
  var hosePts = [[-HALF + 0.3, -1.05, -0.4], [-HALF - 0.2, -1.4, -0.6], [-HALF - 0.4, -2.2, -0.75], [-HALF - 0.35, -3.0, -0.8]];
  chassis.add(tube(hosePts, 0.07, MAT.grey, 40));
  var hc = new T.CatmullRomCurve3(hosePts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); })), rings = [];
  for (var hr = 0; hr < 26; hr++) { var hp = hc.getPoint(hr / 25), ht = hc.getTangent(hr / 25); var o3 = new T.Object3D(); o3.position.copy(hp); o3.lookAt(hp.clone().add(ht)); rings.push({ p: [hp.x, hp.y, hp.z], r: [o3.rotation.x, o3.rotation.y, o3.rotation.z] }); }
  chassis.add(instanced(new T.TorusGeometry(0.075, 0.012, 6, 16), MAT.grey, rings));
  part("Chassi", 5, chassis, function (k, g, b) { g.position.z = b.z - 1.2 * k; });

  /* ===== 7. PLACA DE FIXAÇÃO + TUBULAÇÃO COM ISOLAMENTO ===== */
  var mount = new T.Group(); mount.position.z = -1.22;
  var holeTex = canvasTex(512, 160, function (c, w, h) {
    c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.fillStyle = "#000";
    for (var x = 20; x < w; x += 34) for (var y = 22; y < h; y += 38) { c.beginPath(); c.ellipse(x, y, 9, 5, 0, 0, PI * 2); c.fill(); }
  });
  var plate = mesh(new T.PlaneGeometry(W - 1.0, 2.3), new T.MeshStandardMaterial({ color: 0xaeb8c1, metalness: 0.85, roughness: 0.42, alphaMap: holeTex, alphaTest: 0.5, side: T.DoubleSide }));
  mount.add(plate);
  [[-2.8, 1.05], [2.8, 1.05], [0, 1.05], [-2.8, -1.05], [2.8, -1.05]].forEach(function (p) { var sc3 = cyl(0.05, 0.05, 0.04, 12, MAT.steel); sc3.rotation.x = PI / 2; sc3.position.set(p[0], p[1], 0.02); mount.add(sc3); });
  [[0.08, -0.55], [0.06, -0.85]].forEach(function (pp, i) {
    var pts = [[-HALF + 0.6, -0.95 + i * 0.12, 0.25], [-HALF - 0.3, -1.0 + i * 0.12, 0.1], [-HALF - 0.9, -1.15 + i * 0.12, -0.6], [-HALF - 1.2, -1.4 + i * 0.12, -1.6]];
    mount.add(tube(pts, pp[0], MAT.copper, 40));
    mount.add(tube(pts.slice(1), pp[0] + 0.07, MAT.foam, 40));
    var nut = cyl(0.11, 0.11, 0.12, 6, MAT.brass); nut.rotation.z = PI / 2; nut.position.set(-HALF + 0.55, -0.95 + i * 0.12, 0.25); mount.add(nut);
  });
  part("Placa de fixação", 5, mount, function (k, g, b) { g.position.z = b.z - 2.4 * k; });

  /* ---------- texto dos passos ---------- */
  var STEPS = [
    ["Carcaça, aleta e display", "A parte que você vê. Por baixo dela fica tudo o que acumula poeira, umidade e fungos."],
    ["Filtros de ar", "Filtro sujo força o aparelho, gasta mais energia e devolve o ar com cheiro. É a primeira coisa que a manutenção limpa."],
    ["Evaporador", "Centenas de aletas de alumínio e tubos de cobre: é aqui que o ar esfria. Com sujeira, perde rendimento. A higienização profunda atua aqui."],
    ["Turbina e motor", "O rotor de fluxo cruzado empurra o ar para o ambiente. Acúmulo nas pás causa barulho, desequilíbrio e mau cheiro."],
    ["Placa eletrônica, chassi e tubulação", "Comando, sensores e capacitores, a bandeja de dreno e a tubulação de cobre isolada. É onde o diagnóstico técnico evita troca desnecessária de peça."]
  ];
  var h3 = scene.querySelector(".scene-step h3"), pEl = scene.querySelector(".scene-step p"), dots = [].slice.call(scene.querySelectorAll(".scene-dots i"));

  function size() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  addEventListener("resize", size); size();

  var STACK = matchMedia("(max-width:820px),(max-aspect-ratio:5/4)");
  var prog = 0, shown = -1, visible = false, t0 = performance.now(), mx = 0, my = 0, pmx = 0, pmy = 0;
  scene.addEventListener("pointermove", function (e) { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  function target() { var r = scene.getBoundingClientRect(), span = r.height - innerHeight; return Math.max(0, Math.min(1, -r.top / span)); }
  var smooth = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { rootMargin: "100px" }).observe(scene);
  var TAN = Math.tan(cam.fov * PI / 360);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    var t = reduce ? 0.7 : target();
    prog += (t - prog) * 0.14;
    var step = Math.min(4, Math.floor(prog * 5));
    parts.forEach(function (pt) {
      var k = smooth((prog - pt.step * 0.135) / 0.32);          // cada peça sai na sua etapa
      var b = { x: pt.g.userData.base.x, y: pt.g.userData.base.y, z: pt.g.userData.base.z, rx: pt.g.userData.baseRot.x };
      pt.ex(k, pt.g, b);
    });
    parts.forEach(function (pt) {
      var on = prog > 0.03 && (pt.step === step || (step === 4 && pt.step === 5));
      pt.g.traverse(function (o) { if (o.isMesh && o.material && o.material.emissive && !o.material.emissiveMap) o.material.emissive.setHex(on ? 0x07182b : 0x000000); });
    });
    rotor.rotation.x = reduce ? 0 : (now - t0) * 0.004 + prog * 10;
    pmx += (mx - pmx) * 0.06; pmy += (my - pmy) * 0.06;
    rig.rotation.y = -0.6 + prog * 1.0 + pmx * 0.25;
    rig.rotation.x = 0.2 + Math.sin(prog * PI) * 0.06 + pmy * 0.12;
    // enquadramento: o aparelho aberto cabe na área livre (à direita no desktop, embaixo no celular)
    var stack = STACK.matches, asp = cam.aspect;
    var needW = stack ? 12.5 : 15.5 / 0.6, needH = stack ? 9.5 : 11.5;
    var dist = Math.max(needW / (2 * TAN * asp), needH / (2 * TAN));
    var visW = 2 * dist * TAN * asp;
    rig.position.x = stack ? 0 : visW * 0.17;
    rig.position.y = -0.2;
    cam.position.set(0, 2.2, dist); cam.lookAt(0, 0.2, 0);
    renderer.render(sc, cam);
    if (step !== shown) {
      shown = step;
      if (h3) { h3.textContent = STEPS[step][0]; pEl.textContent = STEPS[step][1]; }
      dots.forEach(function (d, i) { d.classList.toggle("on", i === step); });
    }
  }
  requestAnimationFrame(frame);
})();
