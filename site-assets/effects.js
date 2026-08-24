/* ============================================================================
 * MacWall 网页特效引擎
 * 移植自 macOS 客户端：纯时间函数粒子模型 + 固定随机种子（与 App 同种子），
 * 包含壁纸循环特效、鼠标特效与音乐时钟三大部分。
 * 工厂模式：MacEffectsFactory() 创建独立实例（每张特效卡一个），
 * window.MacEffects 为默认单例（兼容旧用法）。
 * ========================================================================== */
/* 花瓣素材（与 App 同素材缩至 256px，多实例共享） */
var SharedPetalAssets = (function () {
  var fronts = [], sides = [];
  function load(list, names) {
    names.forEach(function (n, i) {
      var im = new Image();
      im.src = 'site-assets/petals/' + n + '.png';
      list[i] = im;
    });
  }
  load(fronts, ['petal_front_0', 'petal_front_1', 'petal_front_2']);
  load(sides, ['petal_side_0', 'petal_side_1', 'petal_side_2']);
  return { fronts: fronts, sides: sides };
})();

/* 落叶素材（11 张）与蒲公英绒伞（与 App 同素材缩至 256px） */
var SharedLeafAssets = (function () {
  var list = [];
  for (var i = 1; i <= 11; i++) {
    var im = new Image();
    im.src = 'site-assets/leaves/leaf_' + (i < 10 ? '0' + i : i) + '.png';
    list.push(im);
  }
  return { list: list };
})();
var SharedDandyAsset = (function () {
  var im = new Image();
  im.src = 'site-assets/dandelion_seed.png';
  return { image: im };
})();

window.MacEffectsFactory = function () {
  'use strict';
  var TAU = Math.PI * 2;

  /* ---- 固定种子伪随机（与 App 模型同思路：可复现、不每帧抖） ---- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rand(seed) { return mulberry32(seed); }

  var canvas = null, ctx = null, clockCanvas = null, clockCtx = null;
  var W = 0, H = 0, dpr = 1;
  var dispScale = 1; // 按显示区域等比例缩放（以 App 全屏 1920×1080 为基准）

  var wallEffect = 'none';
  var mouseEffect = 'comet';
  var clockStyle = 'crystal';

  var mouse = { x: 0.5, y: 0.5, lastX: 0.5, lastY: 0.5, moved: 0, down: false };
  var audio = { level: 0, bands: [0, 0, 0] };

  /* ================= 粒子状态 ================= */
  var snow = null, flies = null, embers = null, bubbles = null;
  var leaves = null, dandys = null, petals = null, hearts = null;
  var snowDots = null, heartPaths = null;
  var comets = [], butterflies = [], sparks = [], trailFlies = [];

  /* 雪光点三档清晰度贴图（复刻 App：柔/中/清晰径向渐变） */
  function makeSnowDots() {
    function dot(stops) {
      var c = document.createElement('canvas'); c.width = 64; c.height = 64;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      stops.forEach(function (s) { grad.addColorStop(s[0], 'rgba(255,255,255,' + s[1] + ')'); });
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      return c;
    }
    snowDots = [
      dot([[0, 0.75], [0.32, 0.38], [0.78, 0.12], [1, 0]]),
      dot([[0, 0.92], [0.45, 0.50], [0.78, 0.10], [1, 0]]),
      dot([[0, 1.0], [0.50, 0.55], [0.78, 0.12], [1, 0]])
    ];
  }
  function initSnow() {
    var r = rand(0x534E4F57); // "SNOW"
    makeSnowDots();
    snow = { far: [], mid: [], near: [] };
    // 复刻 App 三层光点：速度按整屏秒数定档（远6.5-8s/中4.5-6.5s/近3-4.5s）
    for (var i = 0; i < 300; i++) {
      snow.far.push({ x: r(), y: r(), r: 0.75 + r() * 1.0, vy: 1 / (6.5 + r() * 1.5) / 60, vx: (r() - 0.5) * 0.0003, sw: r() * TAU, a: 0.30 + r() * 0.25, sh: 0 });
    }
    for (var j = 0; j < 80; j++) {
      snow.mid.push({ x: r(), y: r(), r: 2.25 + r() * 2.25, vy: 1 / (4.5 + r() * 2) / 60, vx: (r() - 0.5) * 0.0004, sw: r() * TAU, a: 0.55 + r() * 0.25, sh: 1 });
    }
    for (var k = 0; k < 16; k++) {
      snow.near.push({ x: r(), y: r(), r: 5 + r() * 3, vy: 1 / (3 + r() * 1.5) / 60, vx: (r() - 0.5) * 0.0006, sw: r() * TAU, a: 0.75 + r() * 0.20, sh: 2 });
    }
  }
  function initFireflies() {
    var r = rand(0x46495245); // "FIRE"
    flies = [];
    var colors = [[199, 255, 61], [140, 252, 71], [255, 153, 36], [250, 235, 77]];
    function make(n, rmin, rmax) {
      for (var i = 0; i < n; i++) {
        var kind = r();
        var period, duty;
        if (kind < 0.35) { period = 12 + r() * 6; duty = 0.55; }        // 长亮 12-18s（亮灭时间延长一倍）
        else if (kind < 0.70) { period = 6 + r() * 3.6; duty = 0.60; }   // 中 6-9.6s
        else { period = 1.8 + r() * 2.4; duty = 0.45; }                 // 快闪 1.8-4.2s
        flies.push({
          x: r(), y: 0.15 + r() * 0.65,
          vx: (r() - 0.5) * 0.0002, vy: (r() - 0.5) * 0.00015,
          ang: r() * TAU, angSpeed: (r() - 0.5) * 0.0005,
          period: period, duty: duty, phase: r(),
          r: rmin + r() * (rmax - rmin),
          c: colors[i % colors.length]
        });
      }
    }
    make(150, 0.5, 1.0);   // 远（尺寸缩小一倍，数量+1/2）
    make(75, 1.0, 1.75);   // 中
    make(45, 1.8, 3.4);    // 近
  }
  /* 闪耀爱心（复刻 App 浮尘模型 + 心形参数方程，粉色） */
  function initHearts() {
    var r = rand(0x48454152); // "HEAR"
    hearts = [];
    for (var i = 0; i < 120; i++) {
      var big = r() < 0.28;
      hearts.push({
        x: r(), y: r(),
        vy: (0.004 + r() * 0.010) * 1.5 / 60,
        vx: (r() - 0.5) * 0.0002,
        sw: r() * TAU,
        r: big ? 2.2 + r() * 2.8 : 0.6 + r() * 1.0,
        a: 0.08 + r() * 0.14,
        tint: 0.72 + r() * 0.33,
        period: 1.2 + r() * 2.3,
        phase: r() * TAU
      });
    }
    // 预生成四层心形路径（参数方程 x=16sin³t, y=13cost-5cos2t-2cos3t-cos4t）
    heartPaths = [1.95, 1.45, 1.15, 0.5].map(function (s) {
      var d = '';
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      var pts = [];
      for (var i = 0; i < 36; i++) {
        var t = i / 36 * TAU;
        var st = Math.sin(t);
        var x = 16 * st * st * st;
        var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push([x, y]);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      var span = Math.max(maxX - minX, maxY - minY, 1);
      var sc = 2 / span * s;
      var midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
      for (var k = 0; k < pts.length; k++) {
        var px = (pts[k][0] - midX) * sc;
        var py = -(pts[k][1] - midY) * sc; // canvas y 向下：瓣在上
        d += (k === 0 ? 'M' : 'L') + px.toFixed(3) + ' ' + py.toFixed(3);
      }
      return new Path2D(d + 'Z');
    });
  }
  function initEmbers() {
    var r = rand(0x454D4253); // "EMBS"
    embers = [];
    for (var i = 0; i < 90; i++) {
      embers.push({ x: r(), p: r(), life: 2.4 + r() * 3.2, rise: 0.07 + r() * 0.14, r: 0.8 + r() * 2.4, sw: r() * TAU });
    }
  }
  function initBubbles() {
    var r = rand(0x4255424C); // "BUBL"
    bubbles = [];
    for (var i = 0; i < 26; i++) {
      bubbles.push({ x: r(), y: r(), r: 5 + r() * 12, vy: 0.0006 + r() * 0.001, sw: r() * TAU, hue: r() });
    }
  }
  function initLeaves() {
    var r = rand(0x4C454146); // "LEAF"
    leaves = [];
    for (var i = 0; i < 80; i++) {
      leaves.push({ x: r(), y: r(), r: 2 + r() * 2.75, vy: 0.0011 + r() * 0.0014, sw: r() * TAU, rot: r() * TAU, spin: 0.4 + r() * 0.8, li: i % 11 });
    }
  }
  /* 花瓣飘落：复刻 App 花瓣模型（固定种子 152 片：远70/中62/近20，贴图翻面；网页尺寸比 App 缩小至少一倍） */
  function initPetals() {
    var r = rand(0x50455441); // "PETA"
    petals = [];
    for (var i = 0; i < 70; i++) {
      petals.push({ x: r(), y: r(), r: 0.7 + r() * 0.9, vy: 0.0005 + r() * 0.0004, dx: (r() - 0.5) * 0.0004, sw: r() * TAU, tp: r() * TAU, tumble: 0.010 + r() * 0.012, a: 0.14 + r() * 0.18, f: i % 3, s: i % 3 });
    }
    for (var j = 0; j < 62; j++) {
      petals.push({ x: r(), y: r(), r: 2.3 + r() * 2.45, vy: 0.0009 + r() * 0.0005, dx: (r() - 0.5) * 0.0005, sw: r() * TAU, tp: r() * TAU, tumble: 0.014 + r() * 0.014, a: 0.5 + r() * 0.28, f: j % 3, s: j % 3 });
    }
    for (var k = 0; k < 20; k++) {
      petals.push({ x: r(), y: r(), r: 6 + r() * 4, vy: 0.0013 + r() * 0.0006, dx: (r() - 0.5) * 0.0006, sw: r() * TAU, tp: r() * TAU, tumble: 0.018 + r() * 0.014, a: 0.55 + r() * 0.30, f: k % 3, s: k % 3 });
    }
  }
  function initDandelions() {
    var r = rand(0x44414E44); // "DAND"
    dandys = [];
    for (var i = 0; i < 30; i++) {
      dandys.push({ x: r(), y: r(), r: 2.2 + r() * 2.8, vy: 0.0005 + r() * 0.0008, sw: r() * TAU, rot: r() * TAU });
    }
  }

  /* ================= 绘图小工具 ================= */
  function glowCircle(c, x, y, r, color, alpha) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + color + ',' + alpha + ')');
    g.addColorStop(0.45, 'rgba(' + color + ',' + alpha * 0.55 + ')');
    g.addColorStop(1, 'rgba(' + color + ',0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function drawFlake(c, x, y, r, rot, alpha) {
    c.save();
    c.translate(x, y); c.rotate(rot);
    c.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
    c.lineWidth = Math.max(0.6, r * 0.22);
    c.lineCap = 'round';
    c.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * TAU;
      c.moveTo(0, 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.stroke();
    c.restore();
  }
  function drawStar(c, x, y, r, color, alpha) {
    c.save();
    c.translate(x, y);
    c.fillStyle = color;
    c.globalAlpha = alpha;
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 === 0 ? r : r * 0.42;
      var a = -Math.PI / 2 + i / 10 * TAU;
      var px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.fill();
    c.restore();
  }

  /* ================= 壁纸循环特效 ================= */
  function drawSnow(t) {
    var layers = [snow.far, snow.mid, snow.near];
    for (var l = 0; l < 3; l++) {
      for (var i = 0; i < layers[l].length; i++) {
        var p = layers[l][i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(t / 1000 * 1.2 + p.sw) * 0.0003;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        if (p.x < -0.02) p.x += 1.04; if (p.x > 1.02) p.x -= 1.04;
        var x = p.x * W, y = p.y * H, r = p.r * dpr * dispScale;
        ctx.globalAlpha = p.a;
        ctx.drawImage(snowDots[p.sh], x - r * 2, y - r * 2, r * 4, r * 4);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawFireflies(t) {
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      // 飞动：方向缓变 + 速度与体型正比 + 阻尼（复刻 App 自由游动）
      f.ang += f.angSpeed;
      var sp = (0.00006 + f.r * 0.000014);
      f.vx += Math.cos(f.ang) * sp * 0.02;
      f.vy += Math.sin(f.ang) * sp * 0.02;
      f.vx *= 0.985; f.vy *= 0.985;
      f.x += f.vx; f.y += f.vy;
      if (f.x < 0.02) { f.x = 0.02; f.vx = Math.abs(f.vx); f.ang = Math.random() * TAU; }
      if (f.x > 0.98) { f.x = 0.98; f.vx = -Math.abs(f.vx); f.ang = Math.random() * TAU; }
      if (f.y < 0.10) { f.y = 0.10; f.vy = Math.abs(f.vy); f.ang = Math.random() * TAU; }
      if (f.y > 0.88) { f.y = 0.88; f.vy = -Math.abs(f.vy); f.ang = Math.random() * TAU; }
      // 三档亮灯包络：快亮 7% → 微闪 → 慢熄 14%（复刻 App，周期减缓）
      var cyc = ((t / 1000) / f.period + f.phase) % 1;
      var glow = 0;
      if (cyc < f.duty) {
        var p = cyc / f.duty;
        if (p < 0.07) glow = p / 0.07;
        else if (p < 0.84) glow = 0.84 + 0.16 * Math.sin(p * 40);
        else glow = 1 - (p - 0.84) / 0.16;
        glow = Math.max(0, Math.min(1, glow));
      }
      if (glow > 0.01) {
        var x = f.x * W, y = f.y * H;
        ctx.globalCompositeOperation = 'lighter';
        glowCircle(ctx, x, y, f.r * 3.2 * dpr * dispScale * glow + 1, f.c.join(','), 0.75 * glow);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * glow) + ')';
        ctx.beginPath(); ctx.arc(x, y, f.r * dpr * dispScale * glow * 0.55, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  function drawHearts(t) {
    for (var i = 0; i < hearts.length; i++) {
      var h = hearts[i];
      h.y += h.vy;
      h.x += h.vx + Math.sin(t / 1000 * 1.1 + h.sw) * 0.0003;
      if (h.y > 1.06) { h.y = -0.06; h.x = Math.random(); }
      var tw = Math.pow(Math.abs(Math.sin(t / 1000 * Math.PI * 2 / h.period + h.phase)), 8);
      var rr = h.r * (1 + tw * 0.5);
      var intensity = Math.min(1, h.a + tw * 0.85);
      var x = h.x * W, y = h.y * H;
      var ti = h.tint;
      var col = 'rgb(' + Math.round(255 * ti) + ',' + Math.round(158 * ti) + ',' + Math.round(184 * ti) + ')';
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(rr * dpr * dispScale, rr * dpr * dispScale);
      if (rr > 1.25) { ctx.globalAlpha = 0.10 * intensity; ctx.fillStyle = col; ctx.fill(heartPaths[0]); }
      if (rr > 1.5) { ctx.globalAlpha = 0.16 * intensity; ctx.fillStyle = col; ctx.fill(heartPaths[1]); }
      ctx.globalAlpha = intensity; ctx.fillStyle = col; ctx.fill(heartPaths[2]);
      if (tw > 0.30) {
        ctx.globalAlpha = tw * 0.85; ctx.fillStyle = '#fff'; ctx.fill(heartPaths[3]);
      }
      ctx.restore();
    }
  }

  function emberColor(p) {
    var stops = [[255, 246, 224], [255, 194, 71], [255, 115, 25], [237, 59, 15], [89, 31, 8]];
    var x = Math.max(0, Math.min(1, p)) * (stops.length - 1);
    var i = Math.floor(x), f = x - i, a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }
  function drawEmbers(t) {
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      e.p += e.rise * 0.016;
      var x = e.x * W, y = (1 - Math.pow(e.p, 1.07)) * H;
      var wob = Math.sin(t / 1000 * 2.2 + e.sw) * 14 * Math.pow(e.p, 1.6);
      var px = x + wob, py = y;
      var lifeP = e.p;
      var alpha = lifeP < 0.05 ? lifeP / 0.05 : (lifeP > 0.68 ? Math.max(0, 0.85 * (0.76 - lifeP) / 0.08 + Math.sin(lifeP * 60) * 0.15) : 0.9);
      alpha = Math.max(0, Math.min(1, alpha));
      // 拖尾
      ctx.strokeStyle = emberColor(lifeP * 0.55);
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineWidth = e.r * dpr * 0.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(t / 700 + e.sw) * 10, py + 8); ctx.stroke();
      ctx.globalAlpha = 1;
      glowCircle(ctx, px, py, e.r * 4 * dpr, emberColor(lifeP).match(/\d+/g).join(','), alpha * 0.5);
      ctx.fillStyle = emberColor(Math.max(0, lifeP - 0.15));
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(px, py, e.r * dpr, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      if (e.p >= 1) { e.p = 0; e.x = Math.random(); e.rise = 0.07 + Math.random() * 0.14; }
    }
  }

  function drawBubbles(t) {
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      b.y -= b.vy;
      b.x += Math.sin(t / 1000 * 1.4 + b.sw) * 0.0004;
      if (b.y < -0.08) { b.y = 1.05; b.x = Math.random(); }
      var x = b.x * W, y = b.y * H, r = b.r * dpr * dispScale;
      ctx.save();
      ctx.globalAlpha = 0.85;
      var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, 'hsla(' + (b.hue * 360) + ',85%,92%,.55)');
      g.addColorStop(0.7, 'hsla(' + (b.hue * 360) + ',80%,75%,.35)');
      g.addColorStop(1, 'hsla(' + (b.hue * 360) + ',85%,65%,.12)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      // 彩虹细边
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      var rg = ctx.createConicGradient ? ctx.createConicGradient(t / 4000, x, y) : null;
      if (rg) { rg.addColorStop(0, '#f99'); rg.addColorStop(0.2, '#ff9'); rg.addColorStop(0.4, '#9f9'); rg.addColorStop(0.6, '#9ff'); rg.addColorStop(0.8, '#99f'); rg.addColorStop(1, '#f99'); ctx.strokeStyle = rg; }
      else { ctx.strokeStyle = 'rgba(255,255,255,.85)'; }
      ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, TAU); ctx.stroke();
      // 双高光
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.3, r * 0.17, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.45, r * 0.07, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawLeafShape(c, r) {
    c.beginPath();
    c.moveTo(0, -r);
    c.bezierCurveTo(r * 0.9, -r * 0.5, r * 0.8, r * 0.55, 0, r);
    c.bezierCurveTo(-r * 0.8, r * 0.55, -r * 0.9, -r * 0.5, 0, -r);
    c.closePath();
  }
  function drawPetalShape(c, r) {
    c.beginPath();
    c.moveTo(0, -r);
    c.bezierCurveTo(r * 0.85, -r * 0.45, r * 0.85, r * 0.45, 0, r);
    c.bezierCurveTo(-r * 0.85, r * 0.45, -r * 0.85, -r * 0.45, 0, -r);
    c.closePath();
  }
  function drawPetals(t) {
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.y += p.vy;
      p.x += p.dx + Math.sin(t / 1000 * 1.5 + p.sw) * 0.0008;
      p.tp += p.tumble;
      if (p.y > 1.08) { p.y = -0.08; p.x = Math.random(); }
      var x = p.x * W, y = p.y * H, r = p.r * dpr * dispScale;
      var face = Math.abs(Math.sin(p.tp));
      var img = face < 0.5 ? SharedPetalAssets.sides[p.s] : SharedPetalAssets.fronts[p.f];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t / 1600 + p.sw) * 0.3);
      ctx.scale(0.3 + 0.7 * face, 1);
      ctx.globalAlpha = p.a;
      if (img && img.complete && img.naturalWidth > 0) {
        // 真实花瓣贴图（与 App 同素材）
        ctx.drawImage(img, -r, -r, r * 2, r * 2);
      } else {
        // 素材未加载完成时程序化兜底
        ctx.fillStyle = '#f8a6c8';
        drawPetalShape(ctx, r);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawLeaves(t) {
    for (var i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      l.y += l.vy;
      l.x += Math.sin(t / 1000 * 1.6 + l.sw) * 0.0007;
      l.rot += l.spin * 0.016;
      if (l.y > 1.06) { l.y = -0.06; l.x = Math.random(); }
      var x = l.x * W, y = l.y * H, r = l.r * dpr * dispScale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(l.rot);
      var tumble = Math.abs(Math.sin(l.rot * 1.6));
      ctx.scale(0.35 + 0.65 * tumble, 1);
      var img = SharedLeafAssets.list[l.li];
      if (img && img.complete && img.naturalWidth > 0) {
        // 真实落叶贴图（与 App 同素材）
        ctx.drawImage(img, -r, -r, r * 2, r * 2);
      } else {
        ctx.fillStyle = '#d97a3a';
        drawLeafShape(ctx, r);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawDandelions(t) {
    for (var i = 0; i < dandys.length; i++) {
      var d = dandys[i];
      d.y += d.vy;
      d.x += Math.sin(t / 1000 * 2.2 + d.sw) * 0.0012;
      if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); }
      var x = d.x * W, y = d.y * H, r = d.r * dpr * dispScale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.rot + Math.sin(t / 1400 + d.sw) * 0.3);
      var img = SharedDandyAsset.image;
      if (img && img.complete && img.naturalWidth > 0) {
        // 真实蒲公英绒伞贴图（与 App 同素材，旋转 180° 让绒伞朝上）
        ctx.rotate(Math.PI);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, -r, -r, r * 2, r * 2);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = Math.max(0.5, r * 0.06);
        ctx.lineCap = 'round';
        for (var k = 0; k < 12; k++) {
          var a = k / 12 * TAU;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(240,235,220,.95)';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ================= 鼠标特效（严格复刻 App：参数/几何/颜色/混合 1:1 移植，大小不缩放） ================= */
  var cometLast = { x: 0.5, y: 0.5 }, butterflyLast = { x: 0.5, y: 0.5 }, trailLast = { x: 0.5, y: 0.5 };
  function resetMouseLast() {
    cometLast = { x: mouse.x, y: mouse.y };
    butterflyLast = { x: mouse.x, y: mouse.y };
    trailLast = { x: mouse.x, y: mouse.y };
  }
  // 星尘六色（App 压暗版，勿调回高亮版）
  var cometStarColors = [
    [0.95, 0.96, 0.97], [0.88, 0.79, 0.47], [0.90, 0.64, 0.26],
    [0.90, 0.49, 0.76], [0.38, 0.78, 0.90], [0.58, 0.49, 0.90]
  ];
  function rgb255(col, a) {
    return 'rgba(' + (col[0] * 255 | 0) + ',' + (col[1] * 255 | 0) + ',' + (col[2] * 255 | 0) + ',' + a + ')';
  }
  // 星尘柔光贴图（16px 六色缓存：中心亮白 → 色 → 透明）
  var sparkGlowCache = {};
  function sparkGlowImage(ci) {
    var key = String(ci % 6);
    if (sparkGlowCache[key]) return sparkGlowCache[key];
    var c = document.createElement('canvas'); c.width = 16; c.height = 16;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.35, rgb255(cometStarColors[ci % 6], 0.5));
    grad.addColorStop(1, rgb255(cometStarColors[ci % 6], 0));
    g.fillStyle = grad; g.fillRect(0, 0, 16, 16);
    sparkGlowCache[key] = c;
    return c;
  }
  // 五角星路径（顶点朝上，中心原点）
  function fivePointStarPath(c, outer, inner) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 === 0 ? outer : inner;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }
  var cometFade = 0;
  function spawnCometAt(x, y) {
    comets.push({ x: x, y: y,
      vx: (Math.random() * 2 - 1) * 0.0014, vy: 0.00015 + Math.random() * 0.0004,
      life: 3.2 + Math.random() * 1.8, size: 2.4 + Math.random() * 3.6,
      colorIndex: Math.floor(Math.random() * 6),
      rotation: Math.random() * TAU, spin: (Math.random() - 0.5) * 0.1,
      twinklePhase: Math.random() * TAU });
  }
  function drawCometHead(mx, my, t) {
    var mainR = 15; // App 固定 15px 金色主星，不随显示区域缩放
    var fade = Math.min(1, cometFade);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * fade;
    ctx.drawImage(sparkGlowImage(1), mx - mainR * 2, my - mainR * 2, mainR * 4, mainR * 4);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(t / 1000 * 0.0054); // App：phase*0.3 慢转
    ctx.globalAlpha = fade;
    fivePointStarPath(ctx, mainR, mainR * 0.5);
    ctx.clip();
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, mainR);
    g.addColorStop(0, 'rgba(255,255,255,0.98)');
    g.addColorStop(0.4, 'rgba(255,224,115,0.98)');
    g.addColorStop(0.75, 'rgba(255,158,41,0.8)');
    g.addColorStop(1, 'rgba(255,128,26,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(-mainR, -mainR, mainR * 2, mainR * 2);
    ctx.restore();
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(mx, my, mainR * 0.26, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawComet(t, dt, noHead) {
    var dx = mouse.x - cometLast.x, dy = mouse.y - cometLast.y;
    var jumpDistance = Math.sqrt(dx * dx + dy * dy);
    if (jumpDistance > 0.20) {
      comets = [];
    } else if (jumpDistance > 0.0002) {
      var step = 0.0005, travelled = 0; // 生成间隔进一步减小：星星更密
      while (travelled + step <= jumpDistance) {
        travelled += step;
        var tt = travelled / jumpDistance;
        spawnCometAt(cometLast.x + dx * tt, cometLast.y + dy * tt);
      }
      cometLast.x = mouse.x; cometLast.y = mouse.y;
    }
    // 推进：漂移 + 阻尼 + 闪烁 + 自转（App 参数）
    for (var i = comets.length - 1; i >= 0; i--) {
      var p = comets[i];
      p.x += p.vx; p.vx *= 0.96;
      p.y += p.vy;
      p.life -= dt * 0.84;
      p.twinklePhase += 0.08;
      p.rotation += p.spin;
      if (p.life <= 0) comets.splice(i, 1);
    }
    if (comets.length > 1500) comets.splice(0, comets.length - 1500);
    // 绘制：加色混合发光（六色柔光贴图 + 自转五角星 + 白心）
    ctx.globalCompositeOperation = 'lighter';
    for (var j = 0; j < comets.length; j++) {
      var s = comets[j];
      var lifeFactor = Math.min(1, s.life);
      var alpha = lifeFactor * lifeFactor * 0.95;
      var twinkle = 0.7 + 0.3 * Math.sin(s.twinklePhase);
      var r = 0.5 * Math.max(0.7, s.size * (0.4 + 0.6 * lifeFactor)); // 星尘光尾II 缩小 50%
      var x = s.x * W, y = s.y * H;
      ctx.globalAlpha = alpha * 0.16 * twinkle;
      ctx.drawImage(sparkGlowImage(s.colorIndex), x - r * 2, y - r * 2, r * 4, r * 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rotation);
      ctx.globalAlpha = alpha * twinkle;
      ctx.fillStyle = rgb255(cometStarColors[s.colorIndex % 6], 1);
      fivePointStarPath(ctx, r * 1.35, r * 0.62);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 金色大主星：移动时淡入、停住渐隐（星尘光尾II 不画主星）
    if (mouse.moved > 0) cometFade = 1;
    else cometFade = Math.max(0, cometFade - dt * 1.25);
    if (!noHead && cometFade > 0.004) drawCometHead(mouse.x * W, mouse.y * H, t);
    ctx.globalCompositeOperation = 'source-over';
    mouse.moved = Math.max(0, mouse.moved - 0.05);
  }

  /* 七彩蝴蝶（严格复刻 App：程序化浅色柔光蝴蝶 + 鳞片粉） */
  // 浅色蝴蝶色板（App 用户定稿）：浅蓝/浅粉/浅绿/浅橘/浅黄/浅紫/柔光白
  var butterflyPastelColors = [
    [0.50, 0.80, 1.00], [1.00, 0.72, 0.88], [0.60, 0.95, 0.60],
    [1.00, 0.75, 0.45], [1.00, 0.92, 0.40], [0.72, 0.60, 1.00], [0.98, 0.99, 1.00]
  ];
  var butterflyGlowCache = {};
  var butterflyDust = [];
  function butterflyGlowImage(ci) {
    var key = String(ci % 7);
    if (butterflyGlowCache[key]) return butterflyGlowCache[key];
    var c = document.createElement('canvas'); c.width = 32; c.height = 32;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.35, rgb255(butterflyPastelColors[ci % 7], 0.55));
    grad.addColorStop(1, rgb255(butterflyPastelColors[ci % 7], 0));
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    butterflyGlowCache[key] = c;
    return c;
  }
  function spawnButterflyAt(x, y, dirX, dirY, trailAngle) {
    // 扇面起飞：方向围绕尾迹 ±60°，整体跟随尾迹
    butterflies.push({ x: x, y: y,
      angle: trailAngle + (Math.random() * 2.1 - 1.05),
      tangent: trailAngle,
      speed: 0.015 + Math.random() * 0.020,
      age: 0, life: 2.1 + Math.random() * 1.5,
      size: 10 + Math.random() * 12,
      colorIndex: Math.floor(Math.random() * 7),
      trailDX: dirX, trailDY: dirY,
      flapSpeed: 3 + Math.random() * 2,
      flapPhase: Math.random() * TAU,
      curveFreq: 0.9 + Math.random() * 1.5,
      curvePhase: Math.random() * TAU,
      curveRate: 0.4 + Math.random() * 0.5,
      swayFreq: 0.8 + Math.random() * 1.0,
      swayPhase: Math.random() * TAU,
      swayAmp: 0.010 + Math.random() * 0.020 });
  }
  // 蝴蝶双翅（左右连体单色发光翅，App 坐标逐点移植）
  function drawButterflyWings(c, s, spread) {
    for (var side = -1; side <= 1; side += 2) {
      c.beginPath();
      c.moveTo(side * s * 0.06, s * 0.02);
      c.bezierCurveTo(side * s * 0.30 * spread, s * 0.44, side * s * 0.78 * spread, s * 0.42, side * s * 0.98 * spread, s * 0.30);
      c.quadraticCurveTo(side * s * 1.05 * spread, s * 0.10, side * s * 0.70 * spread, -s * 0.02);
      c.bezierCurveTo(side * s * 0.82 * spread, -s * 0.22, side * s * 0.78 * spread, -s * 0.36, side * s * 0.66 * spread, -s * 0.30);
      c.quadraticCurveTo(side * s * 0.52 * spread, -s * 0.48, side * s * 0.40 * spread, -s * 0.36);
      c.bezierCurveTo(side * s * 0.20 * spread, -s * 0.24, side * s * 0.12 * spread, -s * 0.10, side * s * 0.06, s * 0.02);
      c.closePath();
    }
  }
  // 蝴蝶身体：细长腹部 + 胸部 + 头部 + 双触角（末端小圆点），与翅膀同色
  function drawButterflyBody(c, s, col) {
    var c95 = rgb255(col, 0.95), c90 = rgb255(col, 0.9);
    c.fillStyle = c95;
    c.beginPath(); c.ellipse(0, -s * 0.13, s * 0.075, s * 0.31, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, s * 0.31, s * 0.10, s * 0.15, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, s * 0.495, s * 0.075, s * 0.075, 0, 0, TAU); c.fill();
    c.strokeStyle = c90;
    c.lineWidth = Math.max(0.4, s * 0.022);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-s * 0.04, s * 0.52);
    c.quadraticCurveTo(-s * 0.16, s * 0.80, -s * 0.30, s * 0.72);
    c.moveTo(s * 0.04, s * 0.52);
    c.quadraticCurveTo(s * 0.16, s * 0.80, s * 0.30, s * 0.72);
    c.stroke();
    c.fillStyle = c90;
    c.beginPath(); c.arc(-s * 0.30, s * 0.72, s * 0.035, 0, TAU); c.fill();
    c.beginPath(); c.arc(s * 0.30, s * 0.72, s * 0.035, 0, TAU); c.fill();
  }
  function drawButterflies(t, dt) {
    var dx = mouse.x - butterflyLast.x, dy = mouse.y - butterflyLast.y;
    var jumpDistance = Math.sqrt(dx * dx + dy * dy);
    if (jumpDistance > 0.20) {
      butterflies = [];
      butterflyDust = [];
    } else if (jumpDistance > 0.0002) {
      var dirX = dx / jumpDistance, dirY = dy / jumpDistance;
      var trailAngle = Math.atan2(dirY, dirX);
      var step = 0.0015, travelled = 0; // 密度向星尘看齐：蝴蝶轨迹连续
      while (travelled + step <= jumpDistance) {
        travelled += step;
        spawnButterflyAt(butterflyLast.x + dirX * travelled, butterflyLast.y + dirY * travelled, dirX, dirY, trailAngle);
      }
      butterflyLast.x = mouse.x; butterflyLast.y = mouse.y;
    }
    // 推进：弧线飞行（方向角正弦缓变）+ 波浪式双频摆动，速度渐缓
    for (var i = butterflies.length - 1; i >= 0; i--) {
      var b = butterflies[i];
      b.age += dt;
      if (b.age >= b.life) { butterflies.splice(i, 1); continue; }
      var progress = Math.min(1, b.age / b.life);
      var speed = b.speed * (1 - 0.45 * progress);
      b.angle += Math.sin(b.age * b.curveFreq + b.curvePhase) * b.curveRate * dt;
      var mainWave = Math.sin(b.age * b.swayFreq + b.swayPhase) * b.swayAmp;
      var rippleWave = Math.sin(b.age * b.swayFreq * 2.8 + b.curvePhase) * b.swayAmp * 0.4;
      var sway = mainWave + rippleWave;
      var drift = speed * 0.55;
      var bdx = (Math.cos(b.angle) * speed - Math.sin(b.angle) * sway) * dt + b.trailDX * drift * dt;
      var bdy = (Math.sin(b.angle) * speed + Math.cos(b.angle) * sway) * dt + b.trailDY * drift * dt;
      b.x += bdx; b.y += bdy;
      b.tangent = Math.atan2(bdy, bdx);
      // 鳞片粉：飞行时洒出同色光点
      if (Math.random() < 0.22) {
        butterflyDust.push({ x: b.x, y: b.y, vy: 0, age: 0,
          life: 1.8 + Math.random() * 1.6, size: 1.1 + Math.random() * 0.9,
          colorIndex: b.colorIndex,
          twinklePhase: Math.random() * TAU, twinkleFreq: 5 + Math.random() * 7 });
        if (butterflyDust.length > 800) butterflyDust.shift();
      }
    }
    if (butterflies.length > 1200) butterflies.splice(0, butterflies.length - 1200);
    // 鳞片粉推进：只受重力向下洒落
    for (var d = butterflyDust.length - 1; d >= 0; d--) {
      var du = butterflyDust[d];
      du.age += dt;
      du.y += du.vy * dt;
      du.vy += 0.024 * dt;
      if (du.age >= du.life) butterflyDust.splice(d, 1);
    }
    // 绘制（base=1：用户要求大小不缩小，App 1080p 基准）
    var base = 1;
    for (var bi = 0; bi < butterflies.length; bi++) {
      var bf = butterflies[bi];
      var tt = bf.age / bf.life;
      var growInput = Math.min(tt / 0.35, 1);
      var grow = growInput * growInput * (3 - 2 * growInput);
      var fadeInput = tt < 0.60 ? 0 : Math.min((tt - 0.60) / 0.40, 1);
      var alpha = 1 - fadeInput * fadeInput * (3 - 2 * fadeInput);
      var bodyLength = bf.size * (0.30 + 0.70 * grow) * base * 0.5; // 蝴蝶缩小 50%
      if (bodyLength < 2) continue;
      var x = bf.x * W, y = bf.y * H;
      var flap = 0.5 + 0.5 * Math.sin(bf.flapPhase + bf.age * bf.flapSpeed * TAU);
      var spread = 0.20 + 0.80 * flap;
      var col = butterflyPastelColors[bf.colorIndex % 7];
      var s = bodyLength;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(bf.tangent - Math.PI / 2);
      if (Math.cos(bf.tangent) < 0) ctx.scale(-1, 1);
      var halo = s * 1.25;
      // 柔光晕（加色混合）
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.40;
      ctx.drawImage(butterflyGlowImage(bf.colorIndex), -halo, -halo, halo * 2, halo * 2);
      // 加色发光层：翅膀形状向外泛光
      ctx.globalAlpha = alpha * 0.34;
      ctx.fillStyle = rgb255(col, 1);
      drawButterflyWings(ctx, s, spread);
      ctx.fill();
      // 主体：normal 混合保真色（单色，无翅脉），整体透明度 75%
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha * 0.75;
      ctx.fillStyle = rgb255(col, 1);
      drawButterflyWings(ctx, s, spread);
      ctx.fill();
      drawButterflyBody(ctx, s, col);
      ctx.restore();
    }
    // 鳞片粉：同色清晰光点（锐利核心 + 小光晕，加色混合）
    if (butterflyDust.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (var di = 0; di < butterflyDust.length; di++) {
        var dust = butterflyDust[di];
        var dprog = dust.age / dust.life;
        var dfade = 1 - dprog;
        var dtw = 0.55 + 0.45 * Math.sin(dust.twinklePhase + dust.age * dust.twinkleFreq);
        var dalpha = dfade * dtw;
        if (dalpha <= 0.03) continue;
        var dx2 = dust.x * W, dy2 = dust.y * H;
        var r = Math.max(0.5, dust.size * base); // 鳞片粉随蝴蝶缩小 50%
        ctx.globalAlpha = dalpha * 0.55;
        ctx.drawImage(butterflyGlowImage(dust.colorIndex), dx2 - r * 1.9, dy2 - r * 1.9, r * 3.8, r * 3.8);
        var dc = butterflyPastelColors[dust.colorIndex % 7];
        ctx.globalAlpha = Math.min(1, dalpha * 1.1);
        ctx.fillStyle = rgb255([dc[0] * 0.45 + 0.55, dc[1] * 0.45 + 0.55, dc[2] * 0.45 + 0.55], 1);
        ctx.beginPath(); ctx.arc(dx2, dy2, r * 0.62, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + (dalpha * 0.75) + ')';
        ctx.beginPath(); ctx.arc(dx2, dy2, r * 0.30, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* 点击星爆火星（严格复刻 App）：黑体辐射 5 档冷却色 + 三段拖尾 */
  function sparkColor(progress) {
    var stops = [[0, [1, 1, 1]], [0.22, [1, 0.88, 0.52]], [0.45, [1, 0.55, 0.15]],
      [0.70, [0.78, 0.22, 0.06]], [0.95, [0.35, 0.08, 0.03]]];
    for (var i = 0; i < stops.length - 1; i++) {
      var p0 = stops[i][0], p1 = stops[i + 1][0];
      if (progress <= p1) {
        var t = Math.min(1, Math.max(0, (progress - p0) / Math.max(1e-6, p1 - p0)));
        var s = t * t * (3 - 2 * t);
        var c0 = stops[i][1], c1 = stops[i + 1][1];
        return [c0[0] + (c1[0] - c0[0]) * s, c0[1] + (c1[1] - c0[1]) * s, c0[2] + (c1[2] - c0[2]) * s];
      }
    }
    return [0.35, 0.08, 0.03];
  }
  function sparkAlpha(progress, seed) {
    if (progress > 0.55) {
      var flicker = 0.80 + 0.20 * Math.sin(seed + progress * 46);
      var fade = Math.max(0, 1 - (progress - 0.55) / 0.45);
      var s = fade * fade * (3 - 2 * fade);
      return s * flicker;
    }
    var fadeIn = Math.min(1, progress / 0.08);
    return fadeIn * fadeIn * (3 - 2 * fadeIn);
  }
  function spawnSparks() {
    // App：每次点击清空旧火星，一次喷出 26-34 颗（随机方向偏上）
    sparks = [];
    var n = 26 + Math.floor(Math.random() * 9);
    for (var i = 0; i < n; i++) {
      var angle = Math.random() * TAU;
      var speed = 0.12 + Math.random() * 0.30;
      sparks.push({ x: mouse.x, y: mouse.y, prevX: mouse.x, prevY: mouse.y,
        vx: Math.cos(angle) * speed,
        vy: -(Math.sin(angle) * speed + 0.05 + Math.random() * 0.13),
        age: 0, life: 0.5 + Math.random() * 0.55,
        size: 1.6 + Math.random() * 2.0,
        flickerSeed: Math.random() * TAU,
        trailScale: 0.45 + Math.random() * 0.55 });
    }
  }
  function drawSparks(t, dt) {
    // 推进：重力抛物线 + 空气阻力（App 参数）
    for (var i = sparks.length - 1; i >= 0; i--) {
      var f = sparks[i];
      f.age += dt;
      f.prevX = f.x; f.prevY = f.y;
      f.vx *= (1 - 0.7 * dt);
      f.vy = f.vy * (1 - 0.7 * dt) + 0.55 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.age >= f.life) sparks.splice(i, 1);
    }
    var base = 1; // 大小不缩放
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var j = 0; j < sparks.length; j++) {
      var sp = sparks[j];
      var progress = sp.age / sp.life;
      var col = sparkColor(progress);
      var alpha = sparkAlpha(progress, sp.flickerSeed);
      if (alpha <= 0.02) continue;
      var x = sp.x * W, y = sp.y * H;
      var radius = sp.size * (1 - 0.35 * progress) * base;
      if (radius < 0.5) continue;
      // 拖尾：沿速度反方向 0.045s×个体因子，三段从尾到头渐粗渐亮
      var tailTime = 0.045 * sp.trailScale;
      var tailX = x - sp.vx * tailTime * W;
      var tailY = y - sp.vy * tailTime * H;
      var tdx = tailX - x, tdy = tailY - y;
      if (Math.hypot(tdx, tdy) > 1.5) {
        var segAlphas = [0.28, 0.50, 0.75];
        var segWidths = [0.7, 1.1, 1.5];
        for (var seg = 0; seg < 3; seg++) {
          var t0 = seg / 3, t1 = (seg + 1) / 3;
          ctx.strokeStyle = rgb255(col, alpha * segAlphas[seg]);
          ctx.lineWidth = Math.max(0.5, radius * segWidths[seg]);
          ctx.beginPath();
          ctx.moveTo(x + tdx * t0, y + tdy * t0);
          ctx.lineTo(x + tdx * t1, y + tdy * t1);
          ctx.stroke();
        }
      }
      // 外层柔光 + 主体亮核
      var halo = radius * 2.4;
      ctx.fillStyle = rgb255(col, alpha * 0.22);
      ctx.beginPath(); ctx.arc(x, y, halo, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb255(col, alpha * 0.95);
      ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
  }

  /* 萤火光迹（严格复刻 App）：四色腹部光点，慢速飘飞 + 正弦游荡，明灭脉冲 */
  var trailFireflyColors = [
    [0.78, 1.00, 0.24], [0.55, 0.99, 0.28], [1.00, 0.60, 0.14], [0.98, 0.92, 0.30]
  ];
  function spawnTrailFlyAt(x, y) {
    trailFlies.push({ x: x, y: y,
      vx: (Math.random() - 0.5) * 0.03, vy: -(0.0015 + Math.random() * 0.0165),
      age: 0, life: 2.7 + Math.random() * 2.55,
      size: 1.4 + Math.random() * 1.6,
      colorIndex: Math.floor(Math.random() * 4),
      pulseSpeed: 0.55 + Math.random() * 1.25,
      pulsePhase: Math.random() * TAU,
      wanderPhase: Math.random() * TAU,
      wanderFreq: 0.8 + Math.random() * 1.4,
      wanderAmp: 0.010 + Math.random() * 0.020 });
  }
  function drawTrailFlies(t, dt) {
    var dx = mouse.x - trailLast.x, dy = mouse.y - trailLast.y;
    var jumpDistance = Math.sqrt(dx * dx + dy * dy);
    if (jumpDistance > 0.20) {
      trailFlies = [];
    } else if (jumpDistance > 0.0002) {
      var dirX = dx / jumpDistance, dirY = dy / jumpDistance;
      var step = 0.0012, travelled = 0; // 密度向星尘看齐：萤火轨迹连续
      while (travelled + step <= jumpDistance) {
        travelled += step;
        spawnTrailFlyAt(trailLast.x + dirX * travelled, trailLast.y + dirY * travelled);
      }
      trailLast.x = mouse.x; trailLast.y = mouse.y;
    }
    // 推进：慢速飘飞 + 正弦游荡
    for (var i = trailFlies.length - 1; i >= 0; i--) {
      var f = trailFlies[i];
      f.age += dt;
      if (f.age >= f.life) { trailFlies.splice(i, 1); continue; }
      var wander = Math.sin(f.age * f.wanderFreq + f.wanderPhase) * f.wanderAmp;
      f.x += (f.vx + Math.cos(f.wanderPhase + f.age * f.wanderFreq) * f.wanderAmp) * dt;
      f.y += (f.vy + wander) * dt;
    }
    if (trailFlies.length > 2000) trailFlies.splice(0, trailFlies.length - 2000);
    // 绘制：加色混合，柔光晕 + 亮核，末尾 20% 平滑淡出
    var base = 1; // 大小不缩放
    ctx.globalCompositeOperation = 'lighter';
    for (var j = 0; j < trailFlies.length; j++) {
      var ff = trailFlies[j];
      var progress = ff.age / ff.life;
      var pulse = 0.5 + 0.5 * Math.sin(ff.pulsePhase + ff.age * ff.pulseSpeed * TAU);
      var fade = progress > 0.80 ? Math.max(0, 1 - (progress - 0.80) / 0.20) : 1;
      var fadeSmooth = fade * fade * (3 - 2 * fade);
      var glow = 0.25 + 0.75 * pulse;
      var alpha = glow * fadeSmooth;
      if (alpha <= 0.03) continue;
      var x = ff.x * W, y = ff.y * H;
      var radius = ff.size * base * (0.85 + 0.15 * pulse);
      var col = trailFireflyColors[ff.colorIndex % 4];
      var halo = radius * 2.6;
      ctx.fillStyle = rgb255(col, alpha * 0.20);
      ctx.beginPath(); ctx.arc(x, y, halo, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb255(col, Math.min(1, alpha * 0.95));
      ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawWallEffect(t) {
    if (wallEffect === 'snow') drawSnow(t);
    else if (wallEffect === 'fireflies') drawFireflies(t);
    else if (wallEffect === 'embers') drawEmbers(t);
    else if (wallEffect === 'bubbles') drawBubbles(t);
    else if (wallEffect === 'leaves') drawLeaves(t);
    else if (wallEffect === 'petals') drawPetals(t);
    else if (wallEffect === 'dandelions') drawDandelions(t);
    else if (wallEffect === 'hearts') drawHearts(t);
  }
  function drawMouseEffect(t, dt) {
    if (mouseEffect === 'comet') drawComet(t, dt);
    else if (mouseEffect === 'cometII') drawComet(t, dt, true); // 星尘光尾II：无大主星
    else if (mouseEffect === 'butterflies') drawButterflies(t, dt);
    else if (mouseEffect === 'spark') drawSparks(t, dt);
    else if (mouseEffect === 'fireflyTrail') drawTrailFlies(t, dt);
  }

  /* ================= 音乐时钟（严格复刻 App：玲珑幻彩/时空波纹/霓虹灯牌，白色文字） ================= */
  var phase = 0;
  var neonFlowHue = 0;
  // 时钟文字色：白色（网页演示版）
  var CLOCK_INK = [1.0, 1.0, 1.0];
  var oilFilmPalette = [
    [1.000, 0.702, 0.729], [1.000, 0.875, 0.729], [1.000, 1.000, 0.729],
    [0.729, 1.000, 0.788], [0.729, 0.882, 1.000], [0.820, 0.729, 1.000],
    [1.000, 0.753, 0.796], [0.878, 0.733, 0.894]
  ];
  function oilFilmColorAt(position) {
    var count = oilFilmPalette.length;
    var wrapped = ((position % count) + count) % count;
    var lowIndex = Math.floor(wrapped) % count;
    var highIndex = (lowIndex + 1) % count;
    var frac = wrapped - Math.floor(wrapped);
    var low = oilFilmPalette[lowIndex], high = oilFilmPalette[highIndex];
    return [low[0] + (high[0] - low[0]) * frac, low[1] + (high[1] - low[1]) * frac, low[2] + (high[2] - low[2]) * frac];
  }
  function clockTimeText() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return { time: p(d.getHours()) + ':' + p(d.getMinutes()), date: (d.getMonth() + 1) + '月' + d.getDate() + '日' };
  }
  function drawClock(t) {
    if (!clockCtx) return;
    var cw = clockCanvas.clientWidth, ch = clockCanvas.clientHeight;
    if (!cw || !ch) return;
    clockCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clockCtx.clearRect(0, 0, cw, ch);
    var cx = cw / 2, cy = ch / 2;
    // 用户要求：整个音乐时钟（含时间日期）缩小 50%
    clockCtx.translate(cx, cy);
    clockCtx.scale(0.5, 0.5);
    clockCtx.translate(-cx, -cy);
    // App：radius = clamp(min(w,h)*0.32, 112, 190)
    var radius = Math.min(Math.max(Math.min(cw, ch) * 0.32, 112), 190);
    var time = clockTimeText();
    if (clockStyle === 'crystal') drawCrystalGlassClock(cx, cy, radius, t, time);
    else if (clockStyle === 'ripples') drawNeonRippleClock(cx, cy, radius, time);
    else drawNeonBrandClock(cx, cy, radius, t, time);
  }
  /* 玲珑幻彩：56 根玻璃柱，七彩 60 秒一圈（真实时间驱动） */
  function drawCrystalGlassClock(cx, cy, radius, t, time) {
    var values = audio.bands;
    var columnCount = 56;
    clockCtx.lineCap = 'round';
    for (var index = 0; index < columnCount; index++) {
      var angle = index / columnCount * TAU - Math.PI / 2;
      var bandIndex = Math.min(2, Math.floor(index * 3 / columnCount));
      var wave1 = Math.sin(phase * 7.5 + index * 0.52);
      var wave2 = Math.sin(phase * 13.0 - index * 0.31);
      var wave3 = Math.sin(phase * 3.0 + index * 1.05 + bandIndex * 2.1);
      var idle = 0.22 + 0.09 * wave1 + 0.055 * wave2 + 0.045 * wave3;
      var response = Math.max(values[bandIndex] * 1.5, idle);
      var shimmer = 0.72 + 0.28 * Math.sin(phase * 9.0 + index * 2.3);
      var length = Math.min(76, 20 + response * 52 * shimmer);
      var inner = radius + 13;
      var x1 = cx + Math.cos(angle) * inner, y1 = cy + Math.sin(angle) * inner;
      var x2 = cx + Math.cos(angle) * (inner + length), y2 = cy + Math.sin(angle) * (inner + length);
      var hue = (index / columnCount + ((t / 60000) % 1)) % 1;
      // App NSColor(hue, s:0.7, b:1) HSB → CSS HSL：h=hue*360, s=54%, l=65%（勿用 lightness 100% 会发白）
      clockCtx.strokeStyle = 'hsla(' + (hue * 360) + ',54%,65%,' + (0.48 + response * 0.42) + ')';
      clockCtx.lineWidth = 8;
      clockCtx.beginPath(); clockCtx.moveTo(x1, y1); clockCtx.lineTo(x2, y2); clockCtx.stroke();
      clockCtx.strokeStyle = 'hsla(' + (hue * 360) + ',54%,65%,0.92)';
      clockCtx.lineWidth = 4;
      clockCtx.beginPath(); clockCtx.moveTo(x1, y1); clockCtx.lineTo(x2, y2); clockCtx.stroke();
    }
    drawClockText(time, cx, cy, radius);
  }
  /* 时空波纹：三层独立频段白色波纹 */
  function drawNeonRippleClock(cx, cy, radius, time) {
    var values = audio.bands;
    var coreAlphas = [0.86, 0.70, 0.58];
    var amplitudeScale = [1.0, 0.70, 0.45];
    var idleAmplitude = [7.0, 5.0, 3.0];
    var meanBand = (values[0] + values[1] + values[2]) / 3;
    var commonBase = radius * 1.24;
    for (var ringIndex = 0; ringIndex < 3; ringIndex++) {
      var band = Math.max(values[ringIndex], 0.045);
      var deviation = values[ringIndex] - meanBand;
      var baseRadius = commonBase + Math.min(Math.max(deviation, -0.6), 0.6) * 30;
      clockCtx.beginPath();
      for (var step = 0; step <= 360; step++) {
        var angle = step / 360 * TAU;
        var ripplePhase = phase * (13 + ringIndex * 4) + ringIndex * 2.1;
        var harmonic = Math.sin(angle * (11 + ringIndex * 3) + ripplePhase)
          + 0.5 * Math.sin(angle * (21 + ringIndex * 2) - phase * (8 + ringIndex * 3));
        var displacement = harmonic * (idleAmplitude[ringIndex] + band * 22 * amplitudeScale[ringIndex]);
        var rr = baseRadius + displacement;
        var px = cx + Math.cos(angle) * rr, py = cy + Math.sin(angle) * rr;
        if (step === 0) clockCtx.moveTo(px, py); else clockCtx.lineTo(px, py);
      }
      clockCtx.closePath();
      // 细线辉光层
      clockCtx.save();
      clockCtx.shadowBlur = 5 + ringIndex;
      clockCtx.shadowColor = 'rgba(255,255,255,0.5)';
      clockCtx.strokeStyle = 'rgba(255,255,255,' + (0.36 + band * 0.20) + ')';
      clockCtx.lineWidth = 1.4 + band * 0.9;
      clockCtx.stroke();
      clockCtx.restore();
      // 主线
      clockCtx.strokeStyle = 'rgba(255,255,255,' + coreAlphas[ringIndex] + ')';
      clockCtx.lineWidth = 0.55 + band * 0.5;
      clockCtx.stroke();
    }
    drawClockText(time, cx, cy, radius);
  }
  /* 霓虹灯牌：时间日期玻璃字 + 油膜流光品牌字 */
  function drawNeonBrandClock(cx, cy, radius, t, time) {
    var level = audio.level;
    drawGlassText(time.time, Math.round(radius * 0.50), 600, 0, cx, cy - radius * 0.30, true);
    drawGlassText(time.date, Math.round(radius * 0.15), 500, 1.8, cx, cy - radius * 0.01, false);
    var hue = ((t / 40000) % 1 + neonFlowHue) % 1;
    var fontSize = Math.round(radius * 0.21);
    var brandY = cy + radius * 0.30;
    var glow = 0.15 + Math.min(1, level) * 0.15;
    var brandText = '麦壳壁纸｜MacWall';
    clockCtx.save();
    clockCtx.textAlign = 'center'; clockCtx.textBaseline = 'middle';
    clockCtx.font = '800 ' + fontSize + 'px -apple-system, "PingFang SC", sans-serif';
    if ('letterSpacing' in clockCtx) { try { clockCtx.letterSpacing = '1.4px'; } catch (e) {} }
    var tw = clockCtx.measureText(brandText).width;
    // 1. 灯管周围轻微辉光
    clockCtx.shadowColor = 'rgba(255,255,255,' + glow + ')';
    clockCtx.shadowBlur = radius * 0.045;
    clockCtx.fillStyle = 'rgba(255,255,255,' + glow + ')';
    clockCtx.fillText(brandText, cx, brandY);
    clockCtx.shadowColor = 'transparent'; clockCtx.shadowBlur = 0;
    // 2. 油膜（离屏：大油膜底 + 6 色斑，再用字形遮罩）
    var pad = 6, bw = tw + pad * 2, bh = fontSize * 1.5 + pad * 2;
    var off = document.createElement('canvas');
    off.width = Math.max(2, Math.ceil(bw * dpr)); off.height = Math.max(2, Math.ceil(bh * dpr));
    var octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    octx.translate(bw / 2, bh / 2);
    var sb = { minX: -tw / 2, maxX: tw / 2, minY: -fontSize * 0.62, maxY: fontSize * 0.62,
      midX: 0, midY: 0, width: tw, height: fontSize * 1.24 };
    var grad = octx.createLinearGradient(sb.minX, sb.midY, sb.maxX, sb.midY);
    for (var step = 0; step <= 8; step++) {
      var pal = oilFilmColorAt(hue * 8 + step);
      grad.addColorStop(step / 8, 'rgba(' + (pal[0] * 255 | 0) + ',' + (pal[1] * 255 | 0) + ',' + (pal[2] * 255 | 0) + ',0.50)');
    }
    octx.fillStyle = grad;
    octx.fillRect(sb.minX, sb.minY, sb.width, sb.height);
    for (var index = 0; index < 6; index++) {
      var seed = index;
      var scx = sb.midX + Math.sin(hue * TAU * 1.3 + seed * 2.4) * sb.width * 0.36
        + Math.sin(hue * TAU * 0.6 + seed * 1.1) * sb.width * 0.08;
      var scy = sb.midY + Math.cos(hue * TAU * 1.1 + seed * 2.0) * sb.height * 0.34;
      var spotRadius = Math.max(14, sb.height * (0.55 + 0.28 * Math.sin(seed * 1.7)));
      var pal2 = oilFilmColorAt(hue * 8 + seed * 1.7);
      var spotCol = 'rgb(' + (pal2[0] * 255 | 0) + ',' + (pal2[1] * 255 | 0) + ',' + (pal2[2] * 255 | 0) + ')';
      octx.save();
      octx.translate(scx, scy);
      octx.scale(1, 0.62);
      for (var li = 0; li < 12; li++) {
        var layerRadius = spotRadius * (0.03 + li / 11 * 0.97);
        var layerAlpha = 0.55 * Math.pow(Math.cos(li / 11 * Math.PI / 2), 2);
        octx.fillStyle = spotCol;
        octx.globalAlpha = layerAlpha;
        octx.beginPath(); octx.arc(0, 0, layerRadius, 0, TAU); octx.fill();
      }
      octx.restore();
    }
    octx.globalAlpha = 1;
    var mask = document.createElement('canvas');
    mask.width = off.width; mask.height = off.height;
    var mctx = mask.getContext('2d');
    mctx.scale(dpr, dpr);
    mctx.translate(bw / 2, bh / 2);
    mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.font = clockCtx.font;
    if ('letterSpacing' in mctx) { try { mctx.letterSpacing = '1.4px'; } catch (e) {} }
    mctx.fillStyle = '#fff';
    mctx.fillText(brandText, 0, 0);
    // 遮罩必须重置变换后按原点绘制，否则与油膜错位（导致油膜被全部擦除）
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(mask, 0, 0);
    clockCtx.drawImage(off, cx - bw / 2, brandY - bh / 2, bw, bh);
    clockCtx.restore();
  }
  function drawClockText(time, cx, cy, radius) {
    // 时间在上、日期在下（App：time 中心上方 6pt、date 中心下方 0.30r）
    drawGlassText(time.time, Math.round(radius * 0.56), 600, 0, cx, cy - 6, true);
    drawGlassText(time.date, Math.round(radius * 0.15), 500, 1.8, cx, cy + radius * 0.30, false);
  }
  function drawGlassText(text, fontSize, weight, tracking, tx, ty, mono) {
    clockCtx.save();
    clockCtx.textAlign = 'center'; clockCtx.textBaseline = 'middle';
    clockCtx.font = weight + ' ' + fontSize + 'px ' + (mono ? 'ui-monospace, "SF Mono", Menlo, monospace' : '-apple-system, "PingFang SC", sans-serif');
    if (tracking && 'letterSpacing' in clockCtx) { try { clockCtx.letterSpacing = tracking + 'px'; } catch (e) {} }
    // 1. 外发光（白色文字：glowAlpha 0.26 / glowFillAlpha 0.24）
    clockCtx.shadowColor = 'rgba(255,255,255,0.26)';
    clockCtx.shadowBlur = fontSize * 0.14;
    clockCtx.fillStyle = 'rgba(255,255,255,0.24)';
    clockCtx.fillText(text, tx, ty);
    // 2. 玻璃字形主体（白色 0.98）
    clockCtx.shadowColor = 'transparent'; clockCtx.shadowBlur = 0;
    clockCtx.fillStyle = 'rgba(' + (CLOCK_INK[0] * 255 | 0) + ',' + (CLOCK_INK[1] * 255 | 0) + ',' + (CLOCK_INK[2] * 255 | 0) + ',0.98)';
    clockCtx.fillText(text, tx, ty);
    clockCtx.restore();
  }

  /* ================= 帧循环 ================= */
  function resize() {
    if (!canvas) return;
    dpr = 2; // 强制 2× 超采样，粒子更锐利
    W = canvas.clientWidth; H = canvas.clientHeight;
    dispScale = Math.max(0.45, Math.min(1.2, Math.min(W / 1920, H / 1080)));
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (clockCanvas) {
      clockCanvas.width = clockCanvas.clientWidth * dpr;
      clockCanvas.height = clockCanvas.clientHeight * dpr;
    }
  }
  var lastFrameT = 0;
  function frame(t) {
    if (!ctx) return;
    var dt = lastFrameT ? Math.min(0.05, (t - lastFrameT) / 1000) : 0.016;
    lastFrameT = t;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 音乐时钟相位与霓虹流光推进（App 参数）
    var weighted = Math.min(1, audio.bands[0] * 0.5 + audio.bands[1] * 0.3 + audio.bands[2] * 0.2);
    neonFlowHue = (neonFlowHue + weighted * 0.012 * dt) % 1;
    phase += dt * (0.12 + audio.level * 0.36);
    drawWallEffect(t);
    drawMouseEffect(t, dt);
    drawClock(t);
    requestAnimationFrame(frame);
  }

  return {
    init: function (fxCanvas, clock) {
      canvas = fxCanvas; ctx = canvas.getContext('2d');
      clockCanvas = clock || null;
      clockCtx = clock ? clock.getContext('2d') : null;
      initSnow(); initFireflies(); initEmbers(); initBubbles(); initLeaves(); initPetals(); initDandelions(); initHearts();
      resize();
      requestAnimationFrame(frame);
    },
    resize: resize,
    setWallpaperEffect: function (name) { wallEffect = name; },
    setMouseEffect: function (name) {
      mouseEffect = name;
      comets = []; butterflies = []; sparks = []; trailFlies = []; butterflyDust = [];
      cometFade = 0;
    },
    setClockStyle: function (name) { clockStyle = name; },
    resetTrail: function () { resetMouseLast(); },
    pointerMove: function (x, y) {
      mouse.lastX = mouse.x; mouse.lastY = mouse.y;
      mouse.x = x; mouse.y = y; mouse.moved = 1;
    },
    pointerDown: function () { if (mouseEffect === 'spark') spawnSparks(); },
    audioData: function (level, bands) {
      audio.level = Math.min(1, Math.max(0, level));
      audio.bands = bands.map(function (b) { return Math.min(1, Math.max(0, b)); });
    }
  };
};
window.MacEffects = MacEffectsFactory();
