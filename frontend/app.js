/* Oil & Altar — frontend behavior.
 * Loads series/plates from GET /api/series; if the backend isn't running
 * (e.g. GitHub Pages or index.html opened as a file), falls back to embedded
 * seed data. Plates without an uploaded photo get a generative placeholder
 * painted in the language of the work: dusk skies, sodium streetlights,
 * cross silhouettes, hard flash reds and teals, film grain. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia("(hover: none)").matches;

  /* Drop real mp4 paths here when Bren's reels are ready, e.g.
   * ["/media/reel-1.mp4", "/media/reel-2.mp4", "/media/reel-3.mp4"].
   * Empty slots show an animated static placeholder. */
  var REELS = [null, null, null];

  var MARQUEE_WORDS = ["PORTRAIT", "NOCTURNE", "AMERICANA", "35MM", "FLASH", "DUSK", "SIGNS", "GRAIN"];

  /* ---------- seeded PRNG so placeholders render identically every load ---------- */
  function prng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ================================================================
   * generative placeholder plates
   * three scene families matching the work:
   *   nocturne — dusk gradient, building silhouettes, streetlight, cross
   *   votive   — near-black interior, one hot amber source, god-rays
   *   still    — hard flash split-lit red/teal, dark subject mass
   * ================================================================ */

  function grainPass(ctx, w, h, rnd, amt) {
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var n = (rnd() - 0.5) * amt;
      d[p] += n; d[p + 1] += n; d[p + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  function vignette(ctx, w, h, strength) {
    var v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(3,2,2," + strength + ")");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  function lightLeak(ctx, w, h, rnd) {
    if (rnd() > 0.35) return;
    var fromLeft = rnd() < 0.5;
    var g = ctx.createLinearGradient(fromLeft ? 0 : w, 0, fromLeft ? w * 0.4 : w * 0.6, 0);
    var hue = rnd() < 0.5 ? "240,120,40" : "200,50,40";
    g.addColorStop(0, "rgba(" + hue + ",0.5)");
    g.addColorStop(1, "rgba(" + hue + ",0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  function paintNocturne(ctx, w, h, rnd) {
    // dusk sky
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#04050a");
    sky.addColorStop(0.45, "#101a2e");
    sky.addColorStop(0.72, "#1c2c50");
    sky.addColorStop(0.95, "#3a2a14");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    var horizon = h * (0.62 + rnd() * 0.18);

    // streetlight orb + halo
    var lx = w * (0.15 + rnd() * 0.7), ly = horizon - h * (0.12 + rnd() * 0.3);
    var halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(w, h) * (0.3 + rnd() * 0.25));
    halo.addColorStop(0, "rgba(255,220,150,0.95)");
    halo.addColorStop(0.08, "rgba(240,166,60,0.7)");
    halo.addColorStop(0.4, "rgba(240,166,60,0.16)");
    halo.addColorStop(1, "rgba(240,166,60,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // pole
    ctx.fillStyle = "rgba(4,3,2,0.9)";
    ctx.fillRect(lx - w * 0.004, ly, w * 0.008, horizon - ly + h * 0.1);

    // telephone wires
    var wires = Math.floor(rnd() * 3);
    ctx.strokeStyle = "rgba(2,2,2,0.85)";
    ctx.lineWidth = Math.max(1, w * 0.002);
    for (var wI = 0; wI < wires; wI++) {
      var wy = h * (0.08 + rnd() * 0.3);
      ctx.beginPath();
      ctx.moveTo(0, wy);
      ctx.quadraticCurveTo(w / 2, wy + h * (0.03 + rnd() * 0.06), w, wy - h * rnd() * 0.05);
      ctx.stroke();
    }

    // building silhouettes on the horizon
    ctx.fillStyle = "#040302";
    var x = 0;
    while (x < w) {
      var bw = w * (0.14 + rnd() * 0.3);
      var bh = h * (0.06 + rnd() * 0.22);
      ctx.fillRect(x, horizon - bh, bw + 1, bh);
      // pitched roof sometimes — the church profile
      if (rnd() < 0.4) {
        ctx.beginPath();
        ctx.moveTo(x, horizon - bh);
        ctx.lineTo(x + bw * 0.5, horizon - bh - h * (0.05 + rnd() * 0.08));
        ctx.lineTo(x + bw, horizon - bh);
        ctx.fill();
      }
      // a few lit windows
      var wins = Math.floor(rnd() * 3);
      for (var i = 0; i < wins; i++) {
        ctx.fillStyle = rnd() < 0.3 ? "rgba(160,220,240,0.85)" : "rgba(240,180,90,0.9)";
        ctx.fillRect(x + bw * (0.15 + rnd() * 0.6), horizon - bh * (0.3 + rnd() * 0.5), w * 0.014, w * 0.02);
        ctx.fillStyle = "#040302";
      }
      x += bw + w * rnd() * 0.08;
    }

    // ground
    ctx.fillStyle = "#050403";
    ctx.fillRect(0, horizon, w, h - horizon);

    // cross silhouette against the sky
    if (rnd() < 0.5) {
      var cx = w * (0.2 + rnd() * 0.6), cy = horizon - h * (0.16 + rnd() * 0.2);
      var ch = h * (0.1 + rnd() * 0.12), cw = ch * 0.09;
      ctx.fillStyle = "rgba(3,2,2,0.95)";
      ctx.fillRect(cx - cw / 2, cy - ch, cw, ch + h * 0.02);
      ctx.fillRect(cx - ch * 0.3, cy - ch * 0.72, ch * 0.6, cw);
    }
  }

  function paintVotive(ctx, w, h, rnd) {
    ctx.fillStyle = "#070503";
    ctx.fillRect(0, 0, w, h);

    // one hot amber source — a window, a lamp, a flame
    var lx = w * (0.2 + rnd() * 0.6), ly = h * (0.18 + rnd() * 0.4);
    var r = Math.min(w, h) * (0.5 + rnd() * 0.3);
    var light = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    light.addColorStop(0, "rgba(255,214,140,0.95)");
    light.addColorStop(0.12, "rgba(232,160,70,0.6)");
    light.addColorStop(0.5, "rgba(150,90,30,0.22)");
    light.addColorStop(1, "rgba(60,30,10,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    // god-rays
    ctx.globalCompositeOperation = "lighter";
    var rays = 3 + Math.floor(rnd() * 4);
    for (var i = 0; i < rays; i++) {
      var a = rnd() * Math.PI * 2;
      var len = r * (0.8 + rnd() * 0.8);
      var spread = 0.04 + rnd() * 0.1;
      ctx.fillStyle = "rgba(240,190,110," + (0.04 + rnd() * 0.08) + ")";
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + Math.cos(a - spread) * len, ly + Math.sin(a - spread) * len);
      ctx.lineTo(lx + Math.cos(a + spread) * len, ly + Math.sin(a + spread) * len);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    // dark furniture masses catching the edge of the light
    var forms = 3 + Math.floor(rnd() * 4);
    for (var f = 0; f < forms; f++) {
      var fx = w * (0.1 + rnd() * 0.8), fy = h * (0.45 + rnd() * 0.5);
      var fr = Math.min(w, h) * (0.14 + rnd() * 0.26);
      var g = ctx.createRadialGradient(fx - fr * 0.3, fy - fr * 0.3, fr * 0.1, fx, fy, fr);
      g.addColorStop(0, "rgba(120,80,44,0.5)");
      g.addColorStop(0.6, "rgba(20,12,7,0.8)");
      g.addColorStop(1, "rgba(7,5,3,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fr * (0.7 + rnd() * 0.6), fr, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function paintStill(ctx, w, h, rnd) {
    ctx.fillStyle = "#050304";
    ctx.fillRect(0, 0, w, h);

    // hard flash split lighting — blood red vs flash teal from opposite corners
    var flip = rnd() < 0.5;
    var red = ctx.createRadialGradient(flip ? 0 : w, h * 0.2, 0, flip ? 0 : w, h * 0.2, w * (0.8 + rnd() * 0.4));
    red.addColorStop(0, "rgba(168,35,43,0.85)");
    red.addColorStop(0.5, "rgba(110,20,30,0.35)");
    red.addColorStop(1, "rgba(60,10,18,0)");
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, w, h);

    var teal = ctx.createRadialGradient(flip ? w : 0, h * 0.85, 0, flip ? w : 0, h * 0.85, w * (0.7 + rnd() * 0.4));
    teal.addColorStop(0, "rgba(130,200,225,0.6)");
    teal.addColorStop(0.5, "rgba(50,110,140,0.22)");
    teal.addColorStop(1, "rgba(20,50,70,0)");
    ctx.fillStyle = teal;
    ctx.fillRect(0, 0, w, h);

    // central dark subject mass with a rim light
    var sx = w * (0.35 + rnd() * 0.3), sy = h * (0.4 + rnd() * 0.3);
    var sr = Math.min(w, h) * (0.22 + rnd() * 0.18);
    var subj = ctx.createRadialGradient(sx - sr * 0.35, sy - sr * 0.35, sr * 0.1, sx, sy, sr);
    subj.addColorStop(0, "rgba(40,18,16,0.9)");
    subj.addColorStop(0.75, "rgba(10,5,6,0.95)");
    subj.addColorStop(1, "rgba(5,3,4,0)");
    ctx.fillStyle = subj;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * (0.75 + rnd() * 0.5), sr, rnd() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255,230,210,0.35)";
    ctx.lineWidth = 2 + rnd() * 3;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sr * 0.8, sr * 0.95, rnd() * 0.4, -2.4, -0.9);
    ctx.stroke();

    // flash hotspot
    var hx = w * (0.15 + rnd() * 0.7), hy = h * (0.1 + rnd() * 0.35);
    var hot = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.min(w, h) * 0.16);
    hot.addColorStop(0, "rgba(255,250,240,0.55)");
    hot.addColorStop(1, "rgba(255,250,240,0)");
    ctx.fillStyle = hot;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }

  function paintPlate(canvas, seed, kind) {
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext("2d");
    var rnd = prng(seed);
    if (kind === "votive") paintVotive(ctx, w, h, rnd);
    else if (kind === "still") paintStill(ctx, w, h, rnd);
    else paintNocturne(ctx, w, h, rnd);
    lightLeak(ctx, w, h, rnd);
    vignette(ctx, w, h, kind === "votive" ? 0.9 : 0.75);
    grainPass(ctx, w, h, rnd, 22);
  }

  /* ---------- fallback data (mirrors the backend seed) ----------
   * Titles are deliberate placeholders — Bren picks the real names. */
  var FALLBACK_SERIES = [
    {
      slug: "series-i", numeral: "I", title: "Untitled I", kind: "votive",
      plates: [
        { id: 1, title: "Untitled 01", shape: "tall", position: 1, image_url: null },
        { id: 2, title: "Untitled 02", shape: "", position: 2, image_url: null },
        { id: 3, title: "Untitled 03", shape: "wide", position: 3, image_url: null },
        { id: 4, title: "Untitled 04", shape: "", position: 4, image_url: null },
        { id: 5, title: "Untitled 05", shape: "tall", position: 5, image_url: null }
      ]
    },
    {
      slug: "series-ii", numeral: "II", title: "Untitled II", kind: "still",
      plates: [
        { id: 6, title: "Untitled 06", shape: "wide", position: 1, image_url: null },
        { id: 7, title: "Untitled 07", shape: "", position: 2, image_url: null },
        { id: 8, title: "Untitled 08", shape: "", position: 3, image_url: null },
        { id: 9, title: "Untitled 09", shape: "wide", position: 4, image_url: null }
      ]
    },
    {
      slug: "series-iii", numeral: "III", title: "Untitled III", kind: "nocturne",
      plates: [
        { id: 10, title: "Untitled 10", shape: "", position: 1, image_url: null },
        { id: 11, title: "Untitled 11", shape: "tall", position: 2, image_url: null },
        { id: 12, title: "Untitled 12", shape: "wide", position: 3, image_url: null },
        { id: 13, title: "Untitled 13", shape: "", position: 4, image_url: null },
        { id: 14, title: "Untitled 14", shape: "", position: 5, image_url: null }
      ]
    }
  ];

  /* ================================================================
   * ambient: film grain, cursor glow, camera flash
   * ================================================================ */

  function initGrain() {
    var canvas = document.getElementById("grain");
    var ctx = canvas.getContext("2d");
    var tile = document.createElement("canvas");
    tile.width = tile.height = 160;
    var tctx = tile.getContext("2d");

    function drawTile() {
      var img = tctx.createImageData(160, 160);
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = Math.random() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 26;
      }
      tctx.putImageData(img, 0, 0);
    }

    function size() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    size();
    window.addEventListener("resize", size);

    function paint() {
      drawTile();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = ctx.createPattern(tile, "repeat");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    paint();
    if (!reduceMotion) setInterval(paint, 110);
  }

  function initCursorGlow() {
    if (touch) return;
    var glow = document.getElementById("cursor-glow");
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var x = tx, y = ty;
    document.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
    });
    (function loop() {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      glow.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  function cameraFlash() {
    if (reduceMotion) return;
    var el = document.getElementById("flash");
    el.classList.remove("on");
    void el.offsetWidth; // restart the animation
    el.classList.add("on");
  }

  /* ================================================================
   * hero: boot sequence — the streetlight powers on, then each letter
   * of the sign catches with its own ignition flicker and settles
   * into a slow idle flicker. Plus scroll parallax on the title.
   * ================================================================ */

  function initHero() {
    var rnd = prng(20260713);
    var lamp = document.getElementById("hero-lamp");
    var chars = [];

    document.querySelectorAll(".hero-title .line").forEach(function (line) {
      if (line.classList.contains("amp")) return;
      var text = line.textContent;
      line.textContent = "";
      for (var i = 0; i < text.length; i++) {
        var ch = document.createElement("span");
        ch.className = "ch";
        ch.textContent = text[i];
        line.appendChild(ch);
        chars.push(ch);
      }
    });
    var amp = document.querySelector(".hero-title .amp");

    if (reduceMotion) {
      lamp.classList.add("lit");
      amp.classList.add("lit");
      chars.forEach(function (ch) { ch.classList.add("lit"); });
      return;
    }

    // 1. darkness … 2. streetlight ignites … 3. letters catch one by one
    lamp.classList.add("dark");
    setTimeout(function () {
      lamp.classList.remove("dark");
      lamp.classList.add("lit");
    }, 450);

    chars.forEach(function (ch) {
      var idle = (4 + rnd() * 7).toFixed(2);
      var idleDelay = (rnd() * 9).toFixed(2);
      setTimeout(function () {
        ch.classList.add("lit");
        ch.style.animation =
          "ignite 0.5s steps(1,end), flick " + idle + "s steps(1,end) " + idleDelay + "s infinite";
      }, 700 + rnd() * 1300);
    });
    setTimeout(function () { amp.classList.add("lit"); }, 1500 + rnd() * 400);

    // scroll parallax: title lines drift apart, footer strip fades
    var lines = document.querySelectorAll(".hero-title .line");
    var foot = document.querySelector(".hero-foot");
    var speeds = [0.12, 0.24, 0.34];
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        if (y > window.innerHeight * 1.2) return;
        lines.forEach(function (line, i) {
          line.style.transform = "translateY(" + (y * speeds[i]).toFixed(1) + "px)";
        });
        foot.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.45));
      });
    }, { passive: true });
  }

  /* ================================================================
   * dust motes drifting in the lamplight, stirred by the cursor
   * ================================================================ */

  function initMotes() {
    if (reduceMotion || touch) return;
    var hero = document.getElementById("hero");
    var canvas = document.getElementById("motes");
    var ctx = canvas.getContext("2d");
    var rnd = prng(41);
    var W, H, parts = [];
    var px = -9999, py = -9999;
    var visible = true;
    var t = 0;

    function size() {
      W = canvas.width = hero.clientWidth;
      H = canvas.height = hero.clientHeight;
    }
    size();
    window.addEventListener("resize", size);

    for (var i = 0; i < 110; i++) {
      parts.push({
        x: rnd() * 2000, y: rnd() * 2000,
        vx: (rnd() - 0.5) * 0.18, vy: (rnd() - 0.5) * 0.12,
        tw: 0.4 + rnd() * 2.2, ph: rnd() * 6.28, sz: 0.6 + rnd() * 1.6
      });
    }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", function () { px = py = -9999; });

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(hero);

    // the lamp sits at 68% / 58% of the hero (matches the CSS)
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      var lx = W * 0.68, ly = H * 0.58;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        // slow wind + a whisper of lift
        p.vx += Math.sin(t * 0.3 + p.ph) * 0.0012;
        p.vy -= 0.0006;
        // the cursor stirs the dust
        var dx = (p.x % W) - px, dy = (p.y % H) - py;
        var d2 = dx * dx + dy * dy;
        if (d2 < 16000) {
          var f = 0.9 / (d2 + 60);
          p.vx += dx * f; p.vy += dy * f;
        }
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy;
        var x = ((p.x % W) + W) % W, y = ((p.y % H) + H) % H;
        // brighter near the lamp, twinkling
        var ldx = x - lx, ldy = y - ly;
        var near = Math.max(0, 1 - Math.sqrt(ldx * ldx + ldy * ldy) / (W * 0.5));
        var a = (0.10 + 0.28 * near) * (0.55 + 0.45 * Math.sin(t * p.tw + p.ph));
        if (a <= 0.01) continue;
        ctx.fillStyle = "rgba(255, " + (200 + Math.round(40 * near)) + ", 150, " + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(x, y, p.sz * (0.7 + near * 0.6), 0, 6.283);
        ctx.fill();
      }
    })();
  }

  /* ================================================================
   * magnetic nav links with glyph scramble on hover
   * ================================================================ */

  function initNav() {
    if (touch) return;
    document.querySelectorAll(".site-head nav a").forEach(function (link) {
      var orig = link.textContent;
      link.addEventListener("pointermove", function (e) {
        var r = link.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        link.style.transform = "translate(" + (dx * 0.28).toFixed(1) + "px," + (dy * 0.5).toFixed(1) + "px)";
      });
      link.addEventListener("pointerleave", function () {
        link.style.transform = "";
      });
      if (reduceMotion) return;
      var timer = null;
      link.addEventListener("pointerenter", function () {
        var tick = 0;
        clearInterval(timer);
        timer = setInterval(function () {
          tick++;
          var out = "";
          for (var i = 0; i < orig.length; i++) {
            out += i < tick - 1 ? orig[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          link.textContent = out;
          if (tick - 1 >= orig.length) { link.textContent = orig; clearInterval(timer); }
        }, 34);
      });
      link.addEventListener("pointerleave", function () {
        clearInterval(timer);
        link.textContent = orig;
      });
    });
  }

  /* ================================================================
   * filmstrip scroll indicator — the page is a roll of 36 exposures
   * ================================================================ */

  function initFilmstrip() {
    var gate = document.getElementById("fs-gate");
    var counter = document.getElementById("fs-counter");
    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      gate.style.top = (p * (window.innerHeight - 46)).toFixed(1) + "px";
      var fr = 1 + Math.round(p * 35);
      counter.textContent = (fr < 10 ? "0" : "") + fr + " / 36";
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ================================================================
   * marquee ticker
   * ================================================================ */

  function initMarquees() {
    document.querySelectorAll(".marquee-track").forEach(function (track) {
      var parts = [];
      for (var r = 0; r < 4; r++) {
        MARQUEE_WORDS.forEach(function (w) {
          parts.push("<span>" + w + "</span><span class=\"cross\">&#8224;</span>");
        });
      }
      // duplicated once more so translateX(-50%) loops seamlessly
      track.innerHTML = parts.join("") + parts.join("");
    });
  }

  /* ================================================================
   * split-flap section headers (church letterboard)
   * ================================================================ */

  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789†&";

  function splitFlap(el) {
    var finalText = el.dataset.text || el.textContent;
    if (reduceMotion) { el.textContent = finalText; return; }
    var settled = 0;
    var tick = 0;
    el.textContent = "";
    var timer = setInterval(function () {
      tick++;
      if (tick % 3 === 0) settled++;
      var out = "";
      for (var i = 0; i < finalText.length; i++) {
        if (i < settled || finalText[i] === " ") out += finalText[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (settled >= finalText.length) {
        el.textContent = finalText;
        clearInterval(timer);
      }
    }, 42);
  }

  function observeFlaps() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        splitFlap(entry.target);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".flap").forEach(function (el) {
      if (!reduceMotion) el.textContent = "";
      io.observe(el);
    });
  }

  /* ================================================================
   * gallery
   * ================================================================ */

  var lbItems = []; // {el (canvas|img), title}

  function plateSize(shape) {
    if (shape === "wide") return { w: 1400, h: 850 };
    if (shape === "tall") return { w: 800, h: 1150 };
    return { w: 800, h: 1000 };
  }

  function buildSeries(seriesList) {
    var wrap = document.getElementById("index");
    wrap.innerHTML = "";
    lbItems = [];
    var frame = 0;

    seriesList.forEach(function (s, sIdx) {
      var section = document.createElement("section");
      section.className = "series";

      var head = document.createElement("header");
      head.className = "sec-head";
      var num = document.createElement("span");
      num.className = "mono sec-num";
      num.textContent = "SIGN " + s.numeral;
      var h2 = document.createElement("h2");
      h2.className = "flap";
      h2.dataset.text = s.title.toUpperCase();
      h2.textContent = s.title.toUpperCase();
      head.appendChild(num);
      head.appendChild(h2);
      section.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "grid";

      s.plates.forEach(function (p, i) {
        var fig = document.createElement("figure");
        fig.className = "plate" + (p.shape ? " " + p.shape : "");
        fig.style.setProperty("--d", (i % 8) * 80 + "ms");

        var media;
        if (p.image_url) {
          media = document.createElement("img");
          media.src = p.image_url;
          media.alt = p.title;
          media.loading = "lazy";
        } else {
          media = document.createElement("canvas");
          var size = plateSize(p.shape);
          media.width = size.w;
          media.height = size.h;
          paintPlate(media, p.id * 7919 + sIdx * 131, s.kind);
        }

        var tilt = document.createElement("div");
        tilt.className = "tilt";
        tilt.appendChild(media);

        var torch = document.createElement("div");
        torch.className = "torch";
        tilt.appendChild(torch);
        fig.appendChild(tilt);

        frame++;
        var no = document.createElement("span");
        no.className = "frame-no mono";
        no.textContent = (frame < 10 ? "0" : "") + frame;
        fig.appendChild(no);

        if (!touch) {
          fig.addEventListener("pointermove", function (e) {
            var r = fig.getBoundingClientRect();
            var nx = (e.clientX - r.left) / r.width;
            var ny = (e.clientY - r.top) / r.height;
            fig.style.setProperty("--mx", nx * 100 + "%");
            fig.style.setProperty("--my", ny * 100 + "%");
            if (!reduceMotion) {
              tilt.style.transform =
                "perspective(900px) rotateX(" + ((0.5 - ny) * 7).toFixed(2) + "deg)" +
                " rotateY(" + ((nx - 0.5) * 9).toFixed(2) + "deg) scale(1.02)";
            }
          });
          fig.addEventListener("pointerleave", function () {
            tilt.style.transform = "";
          });
        }

        var index = lbItems.length;
        lbItems.push({ el: media, title: p.title });
        fig.addEventListener("click", function () { openLightbox(index); });

        grid.appendChild(fig);
      });

      section.appendChild(grid);
      wrap.appendChild(section);
    });

    observeFlaps();
    observeDevelop();
  }

  /* flash-develop reveal as plates scroll into view */
  function observeDevelop() {
    if (reduceMotion) {
      document.querySelectorAll(".plate").forEach(function (p) { p.classList.add("dev"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        entry.target.classList.add("dev");
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".plate").forEach(function (p) { io.observe(p); });
  }

  /* ================================================================
   * lightbox
   * ================================================================ */

  var lb = document.getElementById("lightbox");
  var lbStage = document.getElementById("lb-stage");
  var lbCounter = document.getElementById("lb-counter");
  var lbIndex = 0;

  function renderLightbox() {
    var item = lbItems[lbIndex];
    lbStage.innerHTML = "";
    var img = document.createElement("img");
    img.alt = item.title;
    img.src = item.el.tagName === "CANVAS" ? item.el.toDataURL("image/jpeg", 0.92) : item.el.src;
    lbStage.appendChild(img);
    lbCounter.textContent =
      (lbIndex + 1 < 10 ? "0" : "") + (lbIndex + 1) + " / " +
      (lbItems.length < 10 ? "0" : "") + lbItems.length;
  }

  function openLightbox(i) {
    lbIndex = i;
    renderLightbox();
    lb.classList.add("open");
    cameraFlash();
  }
  function closeLightbox() { lb.classList.remove("open"); }
  function stepLightbox(d) {
    lbIndex = (lbIndex + d + lbItems.length) % lbItems.length;
    renderLightbox();
  }

  lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
  lb.querySelector(".lb-prev").addEventListener("click", function () { stepLightbox(-1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { stepLightbox(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target === lbStage) closeLightbox(); });

  /* ================================================================
   * reels — three stacked projection bays
   * ================================================================ */

  var bayTints = [
    [240, 166, 60],   // sodium
    [140, 200, 230],  // flash teal
    [190, 55, 48]     // blood red
  ];

  function buildReels() {
    var bays = document.getElementById("bays");
    var statics = [];

    REELS.forEach(function (src, i) {
      var bay = document.createElement("div");
      bay.className = "bay";

      if (src) {
        var video = document.createElement("video");
        video.src = src;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        bay.appendChild(video);
      } else {
        var canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 90;
        bay.appendChild(canvas);
        statics.push({ canvas: canvas, tint: bayTints[i % bayTints.length], visible: false, roll: 0 });
      }

      var tag = document.createElement("span");
      tag.className = "tag mono";
      var dot = document.createElement("span");
      dot.className = "dot";
      tag.appendChild(dot);
      tag.appendChild(document.createTextNode("REEL 0" + (i + 1)));
      bay.appendChild(tag);

      bay.addEventListener("click", function () { toggleBay(bay); });
      bays.appendChild(bay);
    });

    // animated CRT static in empty bays, only while on screen
    if (statics.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          statics.forEach(function (s) {
            if (s.canvas.parentElement === entry.target) s.visible = entry.isIntersecting;
          });
        });
      }, { threshold: 0.05 });
      statics.forEach(function (s) { io.observe(s.canvas.parentElement); });

      function drawStatic(s) {
        var ctx = s.canvas.getContext("2d");
        var w = s.canvas.width, h = s.canvas.height;
        var img = ctx.createImageData(w, h);
        var d = img.data;
        var t = s.tint;
        for (var p = 0; p < d.length; p += 4) {
          var v = Math.random();
          v = v * v * v * 200; // bias hard toward dark — dead air, not snow-blind
          d[p] = (v * t[0]) / 255;
          d[p + 1] = (v * t[1]) / 255;
          d[p + 2] = (v * t[2]) / 255;
          d[p + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        // rolling tracking band
        s.roll = (s.roll + 3) % (h * 1.6);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(0, s.roll - 4, w, 8);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, s.roll + 4, w, 2);
      }

      statics.forEach(drawStatic);
      if (!reduceMotion) {
        setInterval(function () {
          statics.forEach(function (s) { if (s.visible) drawStatic(s); });
        }, 90);
      }
    }
  }

  var veil = document.getElementById("veil");
  var expandedBay = null;

  function toggleBay(bay) {
    if (expandedBay === bay) return collapseBay();
    if (expandedBay) expandedBay.classList.remove("expanded");
    expandedBay = bay;
    bay.classList.add("expanded");
    veil.classList.add("on");
    cameraFlash();
  }
  function collapseBay() {
    if (!expandedBay) return;
    expandedBay.classList.remove("expanded");
    expandedBay = null;
    veil.classList.remove("on");
  }
  veil.addEventListener("click", collapseBay);

  /* ================================================================
   * scroll parallax on the reel stack
   * ================================================================ */

  function initParallax() {
    if (reduceMotion) return;
    var ticking = false;
    function update() {
      ticking = false;
      var mid = window.innerHeight / 2;
      document.querySelectorAll(".bay").forEach(function (bay, i) {
        if (bay.classList.contains("expanded")) return;
        var r = bay.getBoundingClientRect();
        var off = (r.top + r.height / 2 - mid) / mid; // -1..1 around center
        bay.style.setProperty("--par", (off * (i - 1) * -18).toFixed(1) + "px");
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ================================================================
   * keyboard
   * ================================================================ */

  document.addEventListener("keydown", function (e) {
    if (lb.classList.contains("open")) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") stepLightbox(-1);
      if (e.key === "ArrowRight") stepLightbox(1);
      return;
    }
    if (e.key === "Escape") collapseBay();
  });

  /* ================================================================
   * contact form
   * ================================================================ */

  var form = document.getElementById("inquiry-form");
  var status = document.getElementById("form-status");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim()
    };
    status.classList.remove("error");
    status.textContent = "SENDING…";
    fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        status.textContent = "RECEIVED.";
      })
      .catch(function () {
        status.classList.add("error");
        status.textContent = "NO SIGNAL — EMAIL HELLO@OILANDALTAR.COM";
      });
  });

  /* ================================================================
   * boot
   * ================================================================ */

  initGrain();
  initCursorGlow();
  initHero();
  initMotes();
  initNav();
  initFilmstrip();
  initMarquees();
  buildReels();
  initParallax();

  fetch("/api/series")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(buildSeries)
    .catch(function () { buildSeries(FALLBACK_SERIES); });
})();
