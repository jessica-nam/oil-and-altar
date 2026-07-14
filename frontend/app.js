/* Oil & Altar — Swiss-minimal portfolio (after brandnewalias.com).
 *
 * Hash-routed single page:
 *   #/                      landing — crossfade carousel (~40 images)
 *   #/bible-belt            flagship project, single column
 *   #/abandoned-america     |
 *   #/portraits             | Photography Portfolio dropdown, 2-col grid
 *   #/everyday-exploration  |
 *   #/films                 stacked 16:9 video bays (mp4 slots)
 *   #/about                 placeholder statement + inquiry form
 *
 * Data comes from GET /api/series; without a backend (GitHub Pages, file://)
 * it falls back to the embedded seed. Plates without an uploaded photo get a
 * generative placeholder painted in the language of the work. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Drop real mp4 paths here when the films are ready, e.g.
   * ["/media/film-1.mp4", null, null]. Empty slots show static. */
  var REELS = [null, null, null];

  /* Carousel timing — per Bren's spec */
  var DWELL_MIN = 1200, DWELL_MAX = 1800, CAROUSEL_COUNT = 40;

  /* ---------- seeded PRNG so placeholders render identically every load ---------- */
  function prng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ================================================================
   * generative placeholder painters (kept from the previous design):
   *   nocturne — dusk sky, church silhouettes, streetlight, cross
   *   votive   — near-black interior, one hot amber source, god-rays
   *   still    — hard flash split-lit red/teal, dark subject mass
   *   mixed    — one of the above, chosen by seed
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
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#04050a");
    sky.addColorStop(0.45, "#101a2e");
    sky.addColorStop(0.72, "#1c2c50");
    sky.addColorStop(0.95, "#3a2a14");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    var horizon = h * (0.62 + rnd() * 0.18);

    var lx = w * (0.15 + rnd() * 0.7), ly = horizon - h * (0.12 + rnd() * 0.3);
    var halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(w, h) * (0.3 + rnd() * 0.25));
    halo.addColorStop(0, "rgba(255,220,150,0.95)");
    halo.addColorStop(0.08, "rgba(240,166,60,0.7)");
    halo.addColorStop(0.4, "rgba(240,166,60,0.16)");
    halo.addColorStop(1, "rgba(240,166,60,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(4,3,2,0.9)";
    ctx.fillRect(lx - w * 0.004, ly, w * 0.008, horizon - ly + h * 0.1);

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

    ctx.fillStyle = "#040302";
    var x = 0;
    while (x < w) {
      var bw = w * (0.14 + rnd() * 0.3);
      var bh = h * (0.06 + rnd() * 0.22);
      ctx.fillRect(x, horizon - bh, bw + 1, bh);
      if (rnd() < 0.4) {
        ctx.beginPath();
        ctx.moveTo(x, horizon - bh);
        ctx.lineTo(x + bw * 0.5, horizon - bh - h * (0.05 + rnd() * 0.08));
        ctx.lineTo(x + bw, horizon - bh);
        ctx.fill();
      }
      var wins = Math.floor(rnd() * 3);
      for (var i = 0; i < wins; i++) {
        ctx.fillStyle = rnd() < 0.3 ? "rgba(160,220,240,0.85)" : "rgba(240,180,90,0.9)";
        ctx.fillRect(x + bw * (0.15 + rnd() * 0.6), horizon - bh * (0.3 + rnd() * 0.5), w * 0.014, w * 0.02);
        ctx.fillStyle = "#040302";
      }
      x += bw + w * rnd() * 0.08;
    }

    ctx.fillStyle = "#050403";
    ctx.fillRect(0, horizon, w, h - horizon);

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

    var lx = w * (0.2 + rnd() * 0.6), ly = h * (0.18 + rnd() * 0.4);
    var r = Math.min(w, h) * (0.5 + rnd() * 0.3);
    var light = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    light.addColorStop(0, "rgba(255,214,140,0.95)");
    light.addColorStop(0.12, "rgba(232,160,70,0.6)");
    light.addColorStop(0.5, "rgba(150,90,30,0.22)");
    light.addColorStop(1, "rgba(60,30,10,0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

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
    if (kind === "mixed") {
      var r = rnd();
      kind = r < 0.34 ? "votive" : r < 0.67 ? "still" : "nocturne";
    }
    if (kind === "votive") paintVotive(ctx, w, h, rnd);
    else if (kind === "still") paintStill(ctx, w, h, rnd);
    else paintNocturne(ctx, w, h, rnd);
    lightLeak(ctx, w, h, rnd);
    vignette(ctx, w, h, kind === "votive" ? 0.9 : 0.75);
    grainPass(ctx, w, h, rnd, 22);
  }

  function plateSize(shape) {
    if (shape === "wide") return { w: 1400, h: 850 };
    if (shape === "tall") return { w: 800, h: 1150 };
    return { w: 900, h: 1000 };
  }

  /* ---------- fallback data (mirrors the backend seed) ---------- */
  function plates(startId, defs) {
    return defs.map(function (shape, i) {
      var n = startId + i;
      return {
        id: n,
        title: "Untitled " + (n < 10 ? "0" : "") + n,
        shape: shape,
        position: i + 1,
        image_url: null
      };
    });
  }

  var FALLBACK_SERIES = [
    { slug: "bible-belt", numeral: "I", title: "Bible Belt", kind: "nocturne",
      plates: plates(1, ["tall", "", "wide", "", "tall", "", "wide", ""]) },
    { slug: "abandoned-america", numeral: "II", title: "Abandoned America", kind: "votive",
      plates: plates(9, ["wide", "", "tall", "", "wide", ""]) },
    { slug: "portraits", numeral: "III", title: "Portraits", kind: "still",
      plates: plates(15, ["tall", "", "", "tall", "", ""]) },
    { slug: "everyday-exploration", numeral: "IV", title: "Everyday Exploration", kind: "mixed",
      plates: plates(21, ["", "wide", "", "tall", "", "wide"]) }
  ];

  var SERIES = FALLBACK_SERIES;

  /* ================================================================
   * views
   * ================================================================ */

  var view = document.getElementById("view");
  var carouselAlive = false;
  var carouselTimer = null;

  function mediaFor(p, kind) {
    if (p.image_url) {
      var img = document.createElement("img");
      img.src = p.image_url;
      img.alt = p.title;
      img.loading = "lazy";
      return img;
    }
    var canvas = document.createElement("canvas");
    var size = plateSize(p.shape);
    canvas.width = size.w;
    canvas.height = size.h;
    paintPlate(canvas, p.id * 7919, kind);
    return canvas;
  }

  /* ---------- landing: crossfade carousel ---------- */

  var CAROUSEL_SIZES = [[900, 1125], [1280, 850], [820, 1100], [1000, 1000], [1300, 730]];
  var KINDS = ["nocturne", "votive", "still"];

  function carouselPool() {
    var pool = [];
    SERIES.forEach(function (s) {
      s.plates.forEach(function (p) {
        pool.push({ url: p.image_url, seed: p.id * 7919, kind: s.kind, title: p.title });
      });
    });
    var extra = 0;
    while (pool.length < CAROUSEL_COUNT) {
      extra++;
      pool.push({ url: null, seed: 50021 + extra * 977, kind: KINDS[extra % 3], title: "Untitled" });
    }
    // seeded shuffle so the order is stable but not grouped by project
    var rnd = prng(7);
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, CAROUSEL_COUNT);
  }

  function renderLanding() {
    view.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "carousel";
    view.appendChild(wrap);

    var pool = carouselPool();
    var idx = 0;
    var current = null;
    carouselAlive = true;

    function makeSlide(item) {
      var el;
      if (item.url) {
        el = document.createElement("img");
        el.src = item.url;
        el.alt = item.title;
      } else {
        el = document.createElement("canvas");
        var size = CAROUSEL_SIZES[item.seed % CAROUSEL_SIZES.length];
        el.width = size[0];
        el.height = size[1];
        paintPlate(el, item.seed, item.kind);
      }
      el.className = "slide";
      return el;
    }

    function step() {
      if (!carouselAlive) return;
      var next = makeSlide(pool[idx]);
      idx = (idx + 1) % pool.length;
      wrap.appendChild(next);
      void next.offsetWidth; // commit initial opacity before transitioning
      next.classList.add("show");
      if (current) {
        var old = current;
        old.classList.remove("show");
        setTimeout(function () { old.remove(); }, 380);
      }
      current = next;
      var dwell = DWELL_MIN + Math.random() * (DWELL_MAX - DWELL_MIN);
      carouselTimer = setTimeout(step, reduceMotion ? 4000 : dwell);
    }
    step();
  }

  function stopCarousel() {
    carouselAlive = false;
    clearTimeout(carouselTimer);
  }

  /* ---------- project pages ---------- */

  function renderProject(slug) {
    var s = null;
    for (var i = 0; i < SERIES.length; i++) if (SERIES[i].slug === slug) s = SERIES[i];
    if (!s) return renderLanding();

    view.innerHTML = "";
    var grid = slug === "portraits" || slug === "everyday-exploration";
    var host = view;
    if (grid) {
      host = document.createElement("div");
      host.className = "grid2";
      view.appendChild(host);
    }

    s.plates.forEach(function (p) {
      var fig = document.createElement("figure");
      fig.className = "piece";
      fig.appendChild(mediaFor(p, s.kind));
      var cap = document.createElement("figcaption");
      cap.textContent = "‘" + p.title + "’";
      fig.appendChild(cap);
      host.appendChild(fig);
    });
  }

  /* ---------- films ---------- */

  function renderFilms() {
    view.innerHTML = "";
    var statics = [];

    REELS.forEach(function (src, i) {
      var wrap = document.createElement("figure");
      wrap.className = "bay-wrap";
      var bay = document.createElement("div");
      bay.className = "bay";

      if (src) {
        var video = document.createElement("video");
        video.src = src;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.controls = true;
        bay.appendChild(video);
      } else {
        var canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 144;
        bay.appendChild(canvas);
        statics.push(canvas);
      }

      wrap.appendChild(bay);
      var cap = document.createElement("figcaption");
      cap.textContent = "‘Untitled Film 0" + (i + 1) + "’";
      wrap.appendChild(cap);
      view.appendChild(wrap);
    });

    if (statics.length && !reduceMotion) {
      var timer = setInterval(function () {
        if (!document.body.contains(statics[0])) return clearInterval(timer);
        statics.forEach(drawStatic);
      }, 90);
    }
    statics.forEach(drawStatic);
  }

  function drawStatic(canvas) {
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(canvas.width, canvas.height);
    var d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var v = Math.random();
      v = v * v * v * 165; // mostly dark — dead air
      d[p] = d[p + 1] = d[p + 2] = v;
      d[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------- about ---------- */

  function renderAbout() {
    view.innerHTML =
      '<div class="about">' +
      '  <p class="placeholder">[ Artist statement — text to come. ]</p>' +
      '  <form id="inquiry-form" novalidate>' +
      "    <label><span>NAME</span><input name=\"name\" type=\"text\" required maxlength=\"200\" autocomplete=\"name\" /></label>" +
      "    <label><span>EMAIL</span><input name=\"email\" type=\"email\" required autocomplete=\"email\" /></label>" +
      "    <label><span>MESSAGE</span><textarea name=\"message\" rows=\"5\" required maxlength=\"5000\"></textarea></label>" +
      "    <button type=\"submit\">Send</button>" +
      '    <p id="form-status" role="status"></p>' +
      "  </form>" +
      "</div>";

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
      status.textContent = "Sending…";
      fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          status.textContent = "Received.";
        })
        .catch(function () {
          status.classList.add("error");
          status.textContent = "Couldn’t send — email hello@oilandaltar.com instead.";
        });
    });
  }

  /* ================================================================
   * router + nav state
   * ================================================================ */

  var PP_ROUTES = ["abandoned-america", "portraits", "everyday-exploration"];
  var ppToggle = document.getElementById("pp-toggle");
  var ppMenu = document.getElementById("pp-menu");

  ppToggle.addEventListener("click", function () {
    var open = !ppMenu.classList.contains("open");
    ppMenu.classList.toggle("open", open);
    ppToggle.classList.toggle("open", open);
    ppToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function setNav(route) {
    document.querySelectorAll("#nav a[data-route]").forEach(function (a) {
      a.classList.toggle("active", a.dataset.route === route);
    });
    if (PP_ROUTES.indexOf(route) !== -1) {
      ppMenu.classList.add("open");
      ppToggle.classList.add("open");
      ppToggle.setAttribute("aria-expanded", "true");
    }
  }

  function currentRoute() {
    return location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  }

  function renderRoute() {
    stopCarousel();
    var route = currentRoute();
    setNav(route);
    window.scrollTo(0, 0);

    if (route === "films") renderFilms();
    else if (route === "about") renderAbout();
    else if (route === "") renderLanding();
    else renderProject(route);

    var titles = {
      "": "Oil & Altar",
      "bible-belt": "Oil & Altar — Bible Belt",
      "abandoned-america": "Oil & Altar — Abandoned America",
      "portraits": "Oil & Altar — Portraits",
      "everyday-exploration": "Oil & Altar — Everyday Exploration",
      "films": "Oil & Altar — Films & Videography",
      "about": "Oil & Altar — About"
    };
    document.title = titles[route] || "Oil & Altar";
  }

  window.addEventListener("hashchange", renderRoute);

  /* ================================================================
   * boot
   * ================================================================ */

  fetch("/api/series")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (data && data.length) SERIES = data;
      renderRoute();
    })
    .catch(renderRoute);
})();
