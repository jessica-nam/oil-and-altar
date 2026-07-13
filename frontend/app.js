/* Oil & Altar — gallery frontend.
 * Loads series/plates from GET /api/series; if the backend isn't running
 * (e.g. index.html opened as a file), falls back to embedded seed data.
 * Plates without an uploaded image get a generative chiaroscuro placeholder. */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- seeded PRNG so placeholder plates render identically every load ---------- */
  function prng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ---------- generative chiaroscuro placeholder "photographs" ---------- */
  function paintPlate(canvas, seed, kind) {
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext("2d");
    var rnd = prng(seed);

    ctx.fillStyle = "#0a0705";
    ctx.fillRect(0, 0, w, h);

    var wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "rgba(38,26,18,0.9)");
    wash.addColorStop(1, "rgba(16,10,8,0.9)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    // one dominant warm light source
    var lx = w * (0.25 + rnd() * 0.5), ly = h * (0.2 + rnd() * 0.4);
    var r = Math.min(w, h) * (0.45 + rnd() * 0.35);
    var light = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    var warm = kind === "nocturne" ? "120,140,170" : "224,178,104";
    light.addColorStop(0, "rgba(" + warm + ",0.85)");
    light.addColorStop(0.35, "rgba(" + warm + ",0.32)");
    light.addColorStop(1, "rgba(" + warm + ",0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    // subject masses — soft dark forms catching the light
    var forms = 3 + Math.floor(rnd() * 4);
    for (var i = 0; i < forms; i++) {
      var fx = w * (0.15 + rnd() * 0.7), fy = h * (0.35 + rnd() * 0.55);
      var fr = Math.min(w, h) * (0.12 + rnd() * 0.25);
      var g = ctx.createRadialGradient(fx - fr * 0.3, fy - fr * 0.3, fr * 0.1, fx, fy, fr);
      var tone = kind === "still" ? "94,36,28" : "20,14,10";
      g.addColorStop(0, "rgba(" + (kind === "votive" ? "180,140,96" : tone) + ",0.55)");
      g.addColorStop(0.6, "rgba(" + tone + ",0.75)");
      g.addColorStop(1, "rgba(10,7,5,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fr * (0.7 + rnd() * 0.6), fr, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // rim highlight strokes
    ctx.globalCompositeOperation = "lighter";
    var strokes = 4 + Math.floor(rnd() * 5);
    for (var s = 0; s < strokes; s++) {
      var sx = lx + (rnd() - 0.5) * w * 0.5;
      var sy = ly + rnd() * h * 0.5;
      ctx.strokeStyle = "rgba(" + warm + "," + (0.05 + rnd() * 0.12) + ")";
      ctx.lineWidth = 1 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + (rnd() - 0.5) * 120, sy + rnd() * 160,
        sx + (rnd() - 0.5) * 120, sy + rnd() * 260,
        sx + (rnd() - 0.5) * 200, sy + rnd() * 340
      );
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // vignette
    var v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(4,3,2,0.88)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);

    // fine grain baked into the plate
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var n = (rnd() - 0.5) * 18;
      d[p] += n; d[p + 1] += n; d[p + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------- fallback data (mirrors the backend seed) ---------- */
  var FALLBACK_SERIES = [
    {
      slug: "votive", numeral: "I", title: "Votive", kind: "votive",
      blurb: "Portraits by a single flame. One light, one face, nothing else permitted.",
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
      blurb: "Fruit, cloth, brass, and bone — arranged the way the Dutch left them.",
      plates: [
        { id: 6, title: "Pomegranate & Brass", shape: "wide", position: 1, image_url: null },
        { id: 7, title: "Linen Study No. 4", shape: "", position: 2, image_url: null },
        { id: 8, title: "The Last Pear", shape: "", position: 3, image_url: null },
        { id: 9, title: "Vanitas, Interrupted", shape: "wide", position: 4, image_url: null }
      ]
    },
    {
      slug: "nocturnes", numeral: "III", title: "Nocturnes", kind: "nocturne",
      blurb: "The city after midnight, exposed long enough for the dark to speak.",
      plates: [
        { id: 10, title: "Vespers on 6th Street", shape: "", position: 1, image_url: null },
        { id: 11, title: "Blue Hour Mass", shape: "tall", position: 2, image_url: null },
        { id: 12, title: "The All-Night Diner", shape: "wide", position: 3, image_url: null },
        { id: 13, title: "Streetlight Annunciation", shape: "", position: 4, image_url: null },
        { id: 14, title: "Last Train Psalm", shape: "", position: 5, image_url: null }
      ]
    }
  ];

  var lightboxPlates = []; // { getSrc, title, num }

  function buildSeries(seriesList) {
    var work = document.getElementById("work");
    work.innerHTML = "";

    seriesList.forEach(function (series, si) {
      var section = document.createElement("section");
      section.id = "series-" + series.slug;

      var head = document.createElement("div");
      head.className = "series-head reveal";
      head.innerHTML =
        '<span class="numeral" aria-hidden="true">' + series.numeral + "</span>" +
        "<h2></h2><p></p>";
      head.querySelector("h2").textContent = series.title;
      head.querySelector("p").textContent = series.blurb;
      section.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "plates";
      section.appendChild(grid);

      series.plates.forEach(function (p) {
        var shape = p.shape || "";
        var num = "Plate " + series.numeral + "." + p.position;

        var plate = document.createElement("div");
        plate.className = "plate reveal" + (shape ? " " + shape : "");
        var fig = document.createElement("figure");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("aria-label", "View “" + p.title + "” full screen");
        var frame = document.createElement("div");
        frame.className = "frame";

        var getSrc;
        if (p.image_url) {
          var img = document.createElement("img");
          img.className = "photo";
          img.src = p.image_url;
          img.alt = "Photograph: " + p.title;
          img.loading = "lazy";
          frame.appendChild(img);
          getSrc = function () { return p.image_url; };
        } else {
          var cw = shape === "wide" ? 1200 : 840;
          var ch = shape === "wide" ? 800 : shape === "tall" ? 1120 : 1000;
          var cv = document.createElement("canvas");
          cv.width = cw; cv.height = ch;
          cv.setAttribute("role", "img");
          cv.setAttribute("aria-label", "Placeholder photograph: " + p.title);
          paintPlate(cv, 20260713 + p.id * 7, series.kind);
          frame.appendChild(cv);
          getSrc = function () { return cv.toDataURL("image/jpeg", 0.9); };
        }

        var cap = document.createElement("figcaption");
        var t = document.createElement("span");
        t.className = "title";
        t.textContent = p.title;
        var n = document.createElement("span");
        n.className = "num";
        n.textContent = num;
        cap.appendChild(t);
        cap.appendChild(n);

        btn.appendChild(frame);
        fig.appendChild(btn);
        fig.appendChild(cap);
        plate.appendChild(fig);
        grid.appendChild(plate);

        var idx = lightboxPlates.length;
        lightboxPlates.push({ getSrc: getSrc, title: p.title, num: num });
        btn.addEventListener("click", function () { openLightbox(idx); });
      });

      work.appendChild(section);

      // interlude quote after the first series
      if (si === 0) {
        var interlude = document.createElement("div");
        interlude.className = "interlude reveal";
        interlude.innerHTML =
          "<blockquote>“Every photograph is a small act of worship.”</blockquote>" +
          '<p class="attr">Bren — studio notes</p>';
        work.appendChild(interlude);
      }
    });

    observeReveals();
  }

  /* ---------- scroll reveal ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("lit"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });

  function observeReveals() {
    document.querySelectorAll(".reveal:not(.lit)").forEach(function (el) { io.observe(el); });
  }

  /* ---------- candlelight cursor ---------- */
  var candle = document.getElementById("candle");
  if (window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", function (e) {
      candle.style.setProperty("--mx", e.clientX + "px");
      candle.style.setProperty("--my", e.clientY + "px");
    }, { passive: true });
  } else {
    candle.style.opacity = "0";
  }

  /* ---------- animated film grain ---------- */
  var grain = document.getElementById("grain");
  if (!reduceMotion) {
    var gctx = grain.getContext("2d");
    var gw, gh;
    var sizeGrain = function () {
      gw = grain.width = Math.floor(innerWidth / 2);
      gh = grain.height = Math.floor(innerHeight / 2);
    };
    sizeGrain();
    window.addEventListener("resize", sizeGrain);
    var frame = 0;
    (function tick() {
      if (frame++ % 3 === 0) {
        var id = gctx.createImageData(gw, gh), d = id.data;
        for (var i = 0; i < d.length; i += 4) {
          var v = Math.random() * 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 14;
        }
        gctx.putImageData(id, 0, 0);
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  var lbCap = lb.querySelector(".cap");
  var lbIdx = lb.querySelector(".idx");
  var current = 0, lastFocus = null;

  function renderLightbox() {
    var p = lightboxPlates[current];
    lbImg.src = p.getSrc();
    lbImg.alt = "Photograph: " + p.title;
    lbCap.textContent = "“" + p.title + "”";
    lbIdx.textContent = p.num + " · " + (current + 1) + " / " + lightboxPlates.length;
  }
  function openLightbox(i) {
    current = i;
    renderLightbox();
    lastFocus = document.activeElement;
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    lb.querySelector(".close").focus();
  }
  function closeLightbox() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function step(d) {
    current = (current + d + lightboxPlates.length) % lightboxPlates.length;
    renderLightbox();
  }

  lb.querySelector(".prev").addEventListener("click", function () { step(-1); });
  lb.querySelector(".next").addEventListener("click", function () { step(1); });
  lb.querySelector(".close").addEventListener("click", closeLightbox);
  lb.addEventListener("click", function (e) {
    if (e.target === lb || e.target.classList.contains("stage")) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ---------- contact form ---------- */
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
        status.textContent = "Received. Bren will write back soon.";
      })
      .catch(function () {
        status.classList.add("error");
        status.textContent = "Couldn't send — the studio server isn't reachable. Email instead: hello@oilandaltar.com";
      });
  });

  /* ---------- about portrait placeholder ---------- */
  paintPlate(document.querySelector('[data-art="portrait"]'), 20260713 + 999 * 7, "votive");

  /* ---------- load gallery ---------- */
  fetch("/api/series")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(buildSeries)
    .catch(function () { buildSeries(FALLBACK_SERIES); });

  observeReveals();
})();
