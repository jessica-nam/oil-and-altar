/* Oil & Altar — Swiss-minimal portfolio (after brandnewalias.com).
 *
 * Hash-routed single page:
 *   #/                      landing — crossfade carousel (real photos, 1.5s)
 *   #/bible-belt            flagship project, continuous full-bleed scroll
 *   #/bible-belt/ephemera   View Ephemera — sub-section of Bible Belt
 *   #/abandoned-america     continuous scroll (Photography Portfolio)
 *   #/portraits             grouped by session (Photography Portfolio)
 *   #/wanderings            2-col grid (Photography Portfolio)
 *   #/in-passing            stacked 16:9 video bays (atmospheric clips)
 *   #/about                 bio, statement, contact + inquiry form
 *
 * Gallery content is injected at load by gallery-data.js (window.GALLERY),
 * generated from photosandvideos/ by scripts/build_gallery.py. The embedded
 * fallback below only renders if that file failed to load; any plate without a
 * photo gets a generative placeholder painted in the language of the work. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Carousel timing — per Bren's spec: 1.5s per slide */
  var DWELL = 1500;

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
    { slug: "portraits", numeral: "III", title: "Portraits", kind: "still", layout: "grid",
      plates: plates(15, ["tall", "", "", "tall", "", ""]) },
    { slug: "wanderings", numeral: "IV", title: "Wanderings", kind: "mixed", layout: "grid",
      plates: plates(21, ["", "wide", "", "tall", "", "wide"]) }
  ];

  /* Real content is injected via gallery-data.js (window.GALLERY); the embedded
   * fallback above only renders if that file failed to load. */
  var GALLERY = window.GALLERY || {};
  var SERIES = (GALLERY.series && GALLERY.series.length) ? GALLERY.series : FALLBACK_SERIES;

  /* ================================================================
   * views
   * ================================================================ */

  var view = document.getElementById("view");
  var carouselAlive = false;
  var carouselTimer = null;

  function mediaFor(p, kind) {
    if (p.image_url) {
      var img = document.createElement("img");
      img.className = "shot";
      img.alt = p.title;
      img.loading = "lazy";
      img.decoding = "async";
      // Fade in when the bitmap is ready instead of popping from blank.
      img.onload = img.onerror = function () { img.classList.add("loaded"); };
      img.src = p.image_url;
      if (img.complete) img.classList.add("loaded");
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
    var urls = GALLERY.carousel || [];
    if (urls.length) {
      return urls.map(function (u) { return { url: u }; });
    }
    // fallback: generative slides if the real carousel didn't load
    var pool = [];
    for (var i = 0; i < 24; i++) {
      pool.push({ url: null, seed: 50021 + i * 977, kind: KINDS[i % 3] });
    }
    return pool;
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

    // Warm the browser cache for every real slide up front so crossfades never
    // fade in to a blank element while the photo is still downloading.
    pool.forEach(function (item) {
      if (item.url) { var pre = new Image(); pre.src = item.url; }
    });

    function makeSlide(item) {
      var el;
      if (item.url) {
        el = document.createElement("img");
        el.src = item.url;
        el.alt = "";
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

    function reveal(next) {
      if (!carouselAlive) return;
      wrap.appendChild(next);
      void next.offsetWidth; // commit initial opacity before transitioning
      next.classList.add("show");
      if (current) {
        var old = current;
        old.classList.remove("show");
        setTimeout(function () { old.remove(); }, 380);
      }
      current = next;
      carouselTimer = setTimeout(step, reduceMotion ? 4000 : DWELL);
    }

    function step() {
      if (!carouselAlive) return;
      var next = makeSlide(pool[idx]);
      idx = (idx + 1) % pool.length;
      // For photos, wait until the bitmap is decoded before crossfading in;
      // canvases (and browsers without decode()) reveal immediately.
      if (next.tagName === "IMG" && next.decode) {
        next.decode().then(function () { reveal(next); }, function () { reveal(next); });
      } else {
        reveal(next);
      }
    }
    step();
  }

  function stopCarousel() {
    carouselAlive = false;
    clearTimeout(carouselTimer);
  }

  /* ---------- project pages ---------- */

  function renderIntro(paragraphs) {
    if (!paragraphs || !paragraphs.length) return;
    var intro = document.createElement("div");
    intro.className = "project-intro";
    paragraphs.forEach(function (text) {
      var p = document.createElement("p");
      p.textContent = text;
      intro.appendChild(p);
    });
    view.appendChild(intro);
  }

  function addPiece(host, plate, kind, caption) {
    var fig = document.createElement("figure");
    fig.className = "piece";
    fig.appendChild(mediaFor(plate, kind));
    if (caption) {
      var cap = document.createElement("figcaption");
      cap.textContent = "‘" + plate.title + "’";
      fig.appendChild(cap);
    }
    host.appendChild(fig);
  }

  function renderProject(slug) {
    var s = null;
    for (var i = 0; i < SERIES.length; i++) if (SERIES[i].slug === slug) s = SERIES[i];
    if (!s) return renderLanding();

    view.innerHTML = "";
    renderIntro(s.excerpt);

    // Portraits are grouped under session headers; other series are flat.
    if (s.layout === "sessions") return renderSessions(s);

    var host = view;
    if (s.layout === "grid") {
      host = document.createElement("div");
      host.className = "grid2";
      view.appendChild(host);
    }
    s.plates.forEach(function (p) { addPiece(host, p, s.kind, true); });
  }

  function renderSessions(s) {
    var host = null;
    var currentSession = null;
    s.plates.forEach(function (p) {
      if (p.session !== currentSession) {
        currentSession = p.session;
        var head = document.createElement("h2");
        head.className = "session-head";
        head.textContent = p.session;
        view.appendChild(head);
        host = document.createElement("div");
        host.className = "grid2";
        view.appendChild(host);
      }
      addPiece(host, p, s.kind, false);
    });
  }

  /* ---------- in passing (video) ---------- */

  function renderInPassing() {
    view.innerHTML = "";
    var data = GALLERY.inPassing || {};
    renderIntro(data.excerpt);

    var clips = data.clips || [];
    if (!clips.length) {
      var note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "Films coming soon.";
      view.appendChild(note);
      return;
    }

    clips.forEach(function (clip) {
      var wrap = document.createElement("figure");
      wrap.className = "bay-wrap";
      var bay = document.createElement("div");
      bay.className = "bay";

      var video = document.createElement("video");
      video.src = clip.src;
      if (clip.poster) video.poster = clip.poster;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.controls = true;
      video.preload = "metadata";
      bay.appendChild(video);

      wrap.appendChild(bay);
      var cap = document.createElement("figcaption");
      cap.textContent = "‘" + clip.title + "’";
      wrap.appendChild(cap);
      view.appendChild(wrap);
    });
  }

  /* ---------- view ephemera (sub-section of Bible Belt) ---------- */

  function renderEphemera() {
    view.innerHTML = "";
    var data = GALLERY.ephemera || {};
    renderIntro(data.headline ? [data.headline] : []);

    var plates = data.plates || [];
    if (!plates.length) {
      var note = document.createElement("p");
      note.className = "empty-note";
      note.textContent = "Ephemera coming soon.";
      view.appendChild(note);
      return;
    }
    var host = document.createElement("div");
    host.className = "grid2";
    view.appendChild(host);
    plates.forEach(function (p) { addPiece(host, p, "nocturne", true); });
  }

  /* ---------- about ---------- */

  function renderAbout() {
    view.innerHTML =
      '<div class="about">' +
      '  <h1 class="about-name">Brenden Cavazos <span>| oilandaltar</span></h1>' +
      '  <div class="bio">' +
      '    <p>Texas Panhandle native and traveling documentary photographer working in night photography, portraiture, and urban exploration, centered on gothic architecture and the American Bible Belt.</p>' +
      '    <p>Background in content strategy, analytics, supply chain and merchandising at Fortune 1 scale. Fluent in both the creative and operational sides of building a body of work and getting it seen.</p>' +
      '  </div>' +
      '  <h2 class="about-sub">What Oil and Altar is</h2>' +
      '  <p class="about-statement">Oil and Altar takes its name from the two things sitting at the center of the work: oil, the grit, grain, and rust of a place left to weather on its own while altar, is the sacred spaces built to hold belief in a region defined by it. The project moves between the two without resolving the tension: churches lit against the dark, roadside signage preaching salvation next to buildings falling into ruin, portraits held in the same exposure stillness as an abandoned house. It’s an ongoing documentary practice, not a single series, a way of looking at the American South that treats decay and devotion as part of the same picture, and leaves the interpretation to whoever’s looking.</p>' +
      '  <h2 class="about-sub">Education</h2>' +
      '  <p class="about-edu">Bachelor of Science, Digital Marketing — Purdue University, 2023</p>' +
      '  <h2 class="about-sub">Contact</h2>' +
      '  <ul class="about-contact">' +
      '    <li><a href="mailto:Brenden.cavazos@gmail.com">Brenden.cavazos@gmail.com</a></li>' +
      '    <li><a href="https://www.instagram.com/oilandaltar/" rel="noopener" target="_blank">instagram.com/oilandaltar</a></li>' +
      '    <li><a href="tel:+18069947560">806-994-7560</a></li>' +
      '  </ul>' +
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
          status.textContent = "Couldn’t send — email Brenden.cavazos@gmail.com instead.";
        });
    });
  }

  /* ================================================================
   * router + nav state
   * ================================================================ */

  var PP_ROUTES = ["abandoned-america", "portraits", "wanderings"];
  var ppToggle = document.getElementById("pp-toggle");
  var ppMenu = document.getElementById("pp-menu");
  var bbMenu = document.getElementById("bb-menu");

  ppToggle.addEventListener("click", function () {
    var open = !ppMenu.classList.contains("open");
    ppMenu.classList.toggle("open", open);
    ppToggle.classList.toggle("open", open);
    ppToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  function setNav(route) {
    document.querySelectorAll("#nav a[data-route]").forEach(function (a) {
      var r = a.dataset.route;
      a.classList.toggle("active", r === route || route.indexOf(r + "/") === 0);
    });
    if (PP_ROUTES.indexOf(route) !== -1) {
      ppMenu.classList.add("open");
      ppToggle.classList.add("open");
      ppToggle.setAttribute("aria-expanded", "true");
    }
    // View Ephemera is a subcategory of Bible Belt — reveal it only in-section.
    bbMenu.classList.toggle("open", route === "bible-belt" || route.indexOf("bible-belt/") === 0);
  }

  function currentRoute() {
    return location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  }

  function renderRoute() {
    stopCarousel();
    var route = currentRoute();
    setNav(route);
    window.scrollTo(0, 0);

    if (route === "in-passing") renderInPassing();
    else if (route === "about") renderAbout();
    else if (route === "bible-belt/ephemera") renderEphemera();
    else if (route === "") renderLanding();
    else renderProject(route);

    var titles = {
      "": "Oil & Altar",
      "bible-belt": "Oil & Altar — Bible Belt",
      "bible-belt/ephemera": "Oil & Altar — View Ephemera",
      "abandoned-america": "Oil & Altar — Abandoned America",
      "portraits": "Oil & Altar — Portraits",
      "wanderings": "Oil & Altar — Wanderings",
      "in-passing": "Oil & Altar — In Passing",
      "about": "Oil & Altar — About"
    };
    document.title = titles[route] || "Oil & Altar";
  }

  window.addEventListener("hashchange", renderRoute);

  /* Warm the cache with the top images of every section during idle time so
   * switching tabs shows the top of the page instantly instead of after a
   * download. Only the first few per series (above the fold) — the rest
   * lazy-load on scroll. Videos are never prefetched (too heavy). */
  function warmGallery() {
    var urls = [];
    (GALLERY.series || []).forEach(function (s) {
      (s.plates || []).slice(0, 8).forEach(function (p) {
        if (p.image_url) urls.push(p.image_url);
      });
    });
    var i = 0;
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
    function next() {
      if (i >= urls.length) return;
      var img = new Image();
      img.onload = img.onerror = function () { idle(next); };
      img.src = urls[i++];
    }
    idle(next);
  }

  /* ================================================================
   * boot — gallery data is embedded (gallery-data.js), so render directly.
   * ================================================================ */

  renderRoute();
  warmGallery();
})();
