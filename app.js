/* ═══════════════════════════════════════════
   千問大小姐 — 行為層
   零依賴、零框架。全部原生 API。
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 1. 滾動揭露（scroll 監聽為主，不用 IntersectionObserver：
         部分 WebView 在程式化捲動下不觸發 callback，一旦失效整頁會透明） ── */
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  const watched = new Set(revealEls);

  function inView(el, edge) {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight * (1 - edge) && r.bottom > innerHeight * -edge;
  }

  const hooks = [];   // 額外的一次性觸發（圖表、動效示範）
  function scan() {
    for (const el of Array.from(watched)) {
      if (inView(el, 0.12)) {
        el.classList.add("in");
        watched.delete(el);
      }
    }
    for (let i = hooks.length - 1; i >= 0; i--) {
      if (hooks[i].test()) { hooks[i].run(); hooks.splice(i, 1); }
    }
    if (!watched.size && !hooks.length) stopWatching();
  }

  let ticking = false, listening = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { scan(); ticking = false; });
  }
  function startWatching() {
    if (listening) return;
    listening = true;
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
  }
  function stopWatching() {
    if (!listening) return;
    listening = false;
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onScroll);
  }
  function watchOnce(el, run, edge) {
    hooks.push({ test: () => inView(el, edge || 0.25), run: run });
  }
  startWatching();
  scan();

  /* ── 2. 游標光暈（只在有指標的裝置） ── */
  if (matchMedia("(pointer:fine)").matches) {
    const glow = document.getElementById("glow");
    let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
    addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      document.body.classList.add("has-cursor");
    }, { passive: true });
    (function follow() {
      cx += (tx - cx) * 0.085;
      cy += (ty - cy) * 0.085;
      glow.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      requestAnimationFrame(follow);
    })();
  }

  /* ── 3. 配色切換 ── */
  document.getElementById("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("light");
  });

  /* ── 4. 語氣滑桿 ── */
  const TONES = [
    { hi: 33,  mode: "正式文件",
      line: "歡迎提出任何問題，我將立即處理並提供可驗證的結果。" },
    { hi: 66,  mode: "大小姐（預設）",
      line: "有問題就問。本小姐才不是特地等你的。" },
    { hi: 100, mode: "傲嬌全開",
      line: "哼，這種問題也要問？……算了。本小姐剛好沒事，就幫你一次而已，別多想。" }
  ];

  const slider = document.getElementById("tone");
  const out = document.getElementById("toneOut");
  const modeEl = document.getElementById("toneMode");
  let current = -1;

  function setTone(v) {
    const t = TONES.find((x) => v <= x.hi) || TONES[0];
    if (TONES.indexOf(t) === current) return;
    current = TONES.indexOf(t);
    out.classList.add("swap");
    setTimeout(() => {
      out.textContent = t.line;
      modeEl.textContent = t.mode;
      out.classList.remove("swap");
    }, reduce ? 0 : 260);
  }
  slider.addEventListener("input", (e) => setTone(+e.target.value));
  setTone(+slider.value);

  /* ── 5. 長條圖：純 SVG，無圖表庫 ── */
  const DATA = [
    { k: "style.css",      v: 418, u: "行" },
    { k: "index.html",     v: 296, u: "行" },
    { k: "app.js",         v: 378, u: "行" },
    { k: "設計 token",      v: 34,  u: "個" },
    { k: "外部 JS 依賴",     v: 0,   u: "個" }
  ];

  const NS = "http://www.w3.org/2000/svg";
  const W = 1000, H = 300, PAD = { t: 34, r: 26, b: 54, l: 62 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const rawMax = Math.max(...DATA.map((d) => d.v)) || 1;

  // nice ticks：把 376 這種醜數字收斂成 0/100/200/300/400
  const TICKS = 4;
  const rawStep = rawMax / TICKS;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step10 = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const max = step10 * TICKS;

  const step = plotW / DATA.length;
  const barW = Math.min(96, step * 0.46);

  const gGrid = document.getElementById("chartGrid");
  const gBars = document.getElementById("chartBars");
  const gLabels = document.getElementById("chartLabels");

  function el(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // 網格與 y 軸刻度
  for (let i = 0; i <= TICKS; i++) {
    const y = PAD.t + (plotH / TICKS) * i;
    gGrid.appendChild(el("line", { x1: PAD.l, y1: y, x2: W - PAD.r, y2: y }));
    const t = el("text", { x: PAD.l - 12, y: y + 4, "text-anchor": "end", class: "chart-lbl" });
    t.textContent = max - step10 * i;
    gLabels.appendChild(t);
  }

  // 長條與標籤
  const bars = [];
  DATA.forEach((d, i) => {
    const x = PAD.l + step * i + (step - barW) / 2;
    const h = (d.v / max) * plotH;
    const y = PAD.t + plotH - h;

    const r = el("rect", {
      x: x, y: PAD.t + plotH, width: barW, height: 0,
      fill: "url(#gBar)", class: "bar"
    });
    gBars.appendChild(r);
    bars.push({ node: r, y: y, h: h });

    const cap = el("text", { x: x + barW / 2, y: y - 9, "text-anchor": "middle", class: "chart-val", opacity: 0 });
    cap.textContent = d.v + (d.u === "個" ? "" : "");
    gLabels.appendChild(cap);
    bars[bars.length - 1].cap = cap;

    const lab = el("text", { x: x + barW / 2, y: PAD.t + plotH + 20, "text-anchor": "middle", class: "chart-lbl" });
    lab.textContent = d.k;
    gLabels.appendChild(lab);
  });

  // 滾動到這裡才開始長出來
  let played = false;
  function draw() {
    if (played) return;
    played = true;
    const dur = reduce ? 1 : 900;
    bars.forEach((b, i) => {
      const delay = reduce ? 0 : i * 110;
      const t0 = performance.now() + delay;
      (function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        if (p < 0) { requestAnimationFrame(tick); return; }
        // expo-out
        const e = 1 - Math.pow(1 - p, 4);
        const h = b.h * e;
        b.node.setAttribute("height", Math.max(0, h));
        b.node.setAttribute("y", PAD.t + plotH - h);
        if (p >= 1) { b.cap.setAttribute("opacity", 1); return; }
        requestAnimationFrame(tick);
      })(performance.now());
    });
  }

  watchOnce(document.getElementById("chart"), draw, 0.25);

  /* ── 6. 設計系統區的動效示範 ── */
  const boxes = document.querySelectorAll(".motion-box");
  if (boxes.length) {
    watchOnce(boxes[0].parentElement, () => {
      boxes.forEach((b, i) => setTimeout(() => b.classList.add("go"), i * 160));
    }, 0.4);
  }

  /* ── 7. 3D 印章：手寫旋轉矩陣、透視投影、畫家演算法深度排序。
         沒有任何 WebGL、沒有 Three.js。 ── */
  (function seal3d() {
    const cv = document.getElementById("seal3d");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const S = 440;
    const DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = S * DPR; cv.height = S * DPR;
    ctx.scale(DPR, DPR);

    const hw = 0.74, hd = 0.74, hh = 1.02;
    const V = [
      [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd],
      [-hw,  hh, -hd], [hw,  hh, -hd], [hw,  hh, hd], [-hw,  hh, hd]
    ];
    const F = [
      { i: [0, 1, 2, 3], top: true },
      { i: [7, 6, 5, 4], top: false },
      { i: [0, 1, 5, 4] }, { i: [3, 2, 6, 7] },
      { i: [0, 3, 7, 4] }, { i: [1, 2, 6, 5] }
    ];

    let rx = -0.74, ry = 0.62;
    let vx = 0, vy = 0, drag = null, spin = true, visible = true;

    function rot(p) {
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const y1 = p[1] * cx - z1 * sx;
      const z2 = p[1] * sx + z1 * cx;
      const cam = 3.4, f = 430;
      const s = f / (cam - z2);
      return { x: S / 2 + x1 * s, y: S / 2 + y1 * s, z: z2, s: s };
    }

    function normal(a, b, c) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    }

    function draw() {
      ctx.clearRect(0, 0, S, S);
      const P = V.map(rot);

      const faces = F.map((f) => {
        const pts = f.i.map((k) => P[k]);
        const z = pts.reduce((a, p) => a + p.z, 0) / pts.length;
        const n = normal(V[f.i[0]], V[f.i[1]], V[f.i[2]]);
        const len = Math.hypot(n[0], n[1], n[2]) || 1;
        const light = (n[0] * -0.45 + n[1] * -0.62 + n[2] * 0.65) / len;
        return { pts: pts, z: z, n: n, light: light, top: f.top };
      }).sort((a, b) => a.z - b.z);   // 畫家演算法：遠的先畫

      for (const f of faces) {
        const l = Math.max(0, Math.min(1, f.light * 0.5 + 0.5));
        ctx.beginPath();
        f.pts.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.closePath();

        if (f.top) {
          const g = ctx.createLinearGradient(f.pts[0].x, f.pts[0].y, f.pts[2].x, f.pts[2].y);
          g.addColorStop(0, "rgba(224,101,93," + (0.30 + l * 0.34) + ")");
          g.addColorStop(1, "rgba(200,68,60," + (0.16 + l * 0.26) + ")");
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = "rgba(200,68,60," + (0.05 + l * 0.17) + ")";
        }
        ctx.fill();
        ctx.strokeStyle = "rgba(201,162,39," + (0.22 + l * 0.5).toFixed(3) + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // 頂面刻字：最後畫，確保不被任何面遮蓋
      const top = faces.find((f) => f.top);
      if (top) {
        const a = top.pts[0], b = top.pts[1], d = top.pts[3], c = top.pts[2];
        const l = Math.max(0, Math.min(1, top.light * 0.5 + 0.5));
        ctx.save();
        ctx.setTransform(
          (b.x - a.x) * DPR * 0.42, (b.y - a.y) * DPR * 0.42,
          (d.x - a.x) * DPR * 0.42, (d.y - a.y) * DPR * 0.42,
          (a.x + c.x) / 2 * DPR, (a.y + c.y) / 2 * DPR
        );
        ctx.font = '900 1px "Noto Serif TC",serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(242,236,225," + (0.55 + l * 0.4).toFixed(3) + ")";
        ctx.fillText("千", 0, 0);
        ctx.restore();
      }
    }

    function loop() {
      if (!visible) { requestAnimationFrame(loop); return; }
      if (!drag) {
        if (spin) ry += 0.0055;
        ry += vy; rx += vx;
        vy *= 0.94; vx *= 0.94;
        rx = Math.max(-1.15, Math.min(0.55, rx));
      }
      draw();
      requestAnimationFrame(loop);
    }

    const wrap = document.getElementById("sealWrap");
    wrap.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY };
      spin = false;
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!drag) return;
      vy = (e.clientX - drag.x) * 0.008;
      vx = (e.clientY - drag.y) * 0.006;
      drag = { x: e.clientX, y: e.clientY };
      ry += vy; rx += vx;
      rx = Math.max(-1.15, Math.min(0.55, rx));
    });
    wrap.addEventListener("pointerup", () => { drag = null; });
    wrap.addEventListener("pointercancel", () => { drag = null; });

    watchOnce(wrap, () => { visible = true; }, 0);
    if (reduce) { spin = false; draw(); } else { requestAnimationFrame(loop); }
  })();

  /* ── 8. 卡片 3D 傾斜（跟隨指標） ── */
  if (matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".cap").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tiltX", (-py * 6).toFixed(2) + "deg");
        card.style.setProperty("--tiltY", (px * 8).toFixed(2) + "deg");
        card.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        card.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tiltX", "0deg");
        card.style.setProperty("--tiltY", "0deg");
      });
    });
  }

  /* ── 9. 滾動視差（多層，用同一個 scroll 迴圈） ── */
  const parallax = [
    { el: document.querySelector(".hero-title"), k: -0.10 },
    { el: document.querySelector(".hero-seal"),   k:  0.16 },
    { el: document.querySelector(".hero-vertical"), k: -0.05 }
  ].filter((p) => p.el);

  if (parallax.length && !reduce) {
    let lastY = -1;
    addEventListener("scroll", () => {
      if (scrollY === lastY) return;
      lastY = scrollY;
      requestAnimationFrame(() => {
        for (const p of parallax) {
          p.el.style.transform = "translate3d(0," + (scrollY * p.k).toFixed(1) + "px,0)";
        }
      });
    }, { passive: true });
  }
})();
