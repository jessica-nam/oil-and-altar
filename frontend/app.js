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

  /* ---------- fallback data (mirrors the backend seed) ---------- */
  var FALLBACK_SERIES = [
    {
      slug: "votive", numeral: "I", title: "Votive", kind: "votive",
      plates: [
        { id: 1, title: "The Vigil", shape: "tall", position: 1, image_url: null },
        { id: 2, title: "Anointed", shape: "", position: 2, image_url: null },
        { id: 3, title: "Her Hands, Folded", shape: "wide", position: 3, image_url: null },
        { id: 4, title: "Candlemas", shape: "", position: 4, image_url: null },
        { id: 5, title: "Saint of the Kitchen Table", shape: "tall", position: 5, image_url: null }
      ]
    },
    {
      slug: "still-lifes", numeral: "II", title: "Still Lifes for a Dark Room", kind: "still",
      plates: [
        { id: 6, title: "Pomegranate & Brass", shape: "wide", position: 1, image_url: null },
        { id: 7, title: "Linen Study No. 4", shape: "", position: 2, image_url: null },
        { id: 8, title: "The Last Pear", shape: "", position: 3, image_url: null },
        { id: 9, title: "Vanitas, Interrupted", shape: "wide", position: 4, image_url: null }
      ]
    },
    {
      slug: "nocturnes", numeral: "III", title: "Nocturnes", kind: "nocturne",
      plates: [
        { id: 10, title: "Vespers on 6th Street", shape: "", position: 1, image_url: null },
        { id: 11, title: "Blue Hour Mass", shape: "tall", position: 2, image_url: null },
        { id: 12, title: "The All-Night Diner", shape: "wide", position: 3, image_url: null },
        { id: 13, title: "Streetlight Annunciation", shape: "", position: 4, image_url: null },
        { id: 14, title: "Last Train Psalm", shape: "", position: 5, image_url: null }
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
   * hero: per-letter fluorescent flicker
   * ================================================================ */

  function initHero() {
    var rnd = prng(20260713);
    document.querySelectorAll(".hero-title .line").forEach(function (line) {
      if (line.classList.contains("amp")) return;
      var text = line.textContent;
      line.textContent = "";
      for (var i = 0; i < text.length; i++) {
        var ch = document.createElement("span");
        ch.className = "ch";
        ch.textContent = text[i];
        ch.style.animationDuration = (4 + rnd() * 7).toFixed(2) + "s";
        ch.style.animationDelay = "-" + (rnd() * 9).toFixed(2) + "s";
        line.appendChild(ch);
      }
    });
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
        fig.appendChild(media);

        var torch = document.createElement("div");
        torch.className = "torch";
        fig.appendChild(torch);

        frame++;
        var no = document.createElement("span");
        no.className = "frame-no mono";
        no.textContent = (frame < 10 ? "0" : "") + frame;
        fig.appendChild(no);

        if (!touch) {
          fig.addEventListener("pointermove", function (e) {
            var r = fig.getBoundingClientRect();
            fig.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
            fig.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
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
