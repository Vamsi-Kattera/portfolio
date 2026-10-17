/* Scenes: small canvas illustrations, one per chapter. They are illustrations of how each project works,
   not recordings of real output. Each scene runs only while visible and draws one still frame when the
   visitor prefers reduced motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function palette() {
    var cs = getComputedStyle(document.documentElement);
    function g(n) { return cs.getPropertyValue(n).trim(); }
    return { bg: g("--scene-bg"), ink: g("--ink"), muted: g("--muted"), line: g("--line"), blue: g("--blue"),
      amber: g("--amber"), good: g("--good"), bad: g("--bad"), surface: g("--surface") };
  }
  var FONT = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
  var SANS = '"Hanken Grotesk", "Segoe UI", system-ui, sans-serif';
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function alpha(hex, a) {
    // accepts #rgb/#rrggbb; falls back to the colour itself
    if (!hex || hex[0] !== "#") return hex;
    var h = hex.length === 4 ? "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
    var n = parseInt(h.slice(1), 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }

  function mount(canvas, init, draw, still) {
    var ctx = canvas.getContext("2d"), w = 0, h = 0, raf = 0, running = false, t0 = 0, last = 0, pal = palette(), palAt = 0, state = null;
    function size() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (init) state = init(w, h);
    }
    function paint(t, dt) { ctx.clearRect(0, 0, w, h); draw(ctx, w, h, t, pal, state, dt); }
    function frame(ts) {
      if (!running) return;
      if (!t0) { t0 = ts; last = ts; }
      if (ts - palAt > 400) { pal = palette(); palAt = ts; }
      var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      paint((ts - t0) / 1000, dt);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduce) return; running = true; t0 = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function once() { pal = palette(); size(); paint(still || 4, 0); }
    size(); pal = palette();
    if (reduce) { paint(still || 4, 0); }
    if ("ResizeObserver" in window) new ResizeObserver(function () { size(); if (!running) paint(still || 4, 0); }).observe(canvas);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { threshold: 0.15 }).observe(canvas);
    } else { start(); }
    new MutationObserver(function () { pal = palette(); if (!running) paint(still || 4, 0); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (window.matchMedia) { var mq = window.matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", function () { pal = palette(); if (!running) paint(still || 4, 0); }); }
  }

  /* 1. Sorting bars: data structures and algorithms */
  function sortScene(canvas) {
    var N = 30;
    function steps(seed) {
      var a = [], i, j, out = [];
      for (i = 0; i < N; i++) a.push({ k: hash(seed * 31 + i), v: 0 });
      a.sort(function (x, y) { return x.k - y.k; });
      var arr = a.map(function (_, i) { return i + 1; });
      // shuffle deterministically
      for (i = N - 1; i > 0; i--) { j = Math.floor(hash(seed * 7 + i) * (i + 1)); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
      out.push({ a: arr.slice(), x: -1, y: -1, done: 0 });
      for (i = 1; i < N; i++) {
        j = i;
        while (j > 0 && arr[j - 1] > arr[j]) {
          var t2 = arr[j]; arr[j] = arr[j - 1]; arr[j - 1] = t2;
          out.push({ a: arr.slice(), x: j - 1, y: j, done: i });
          j--;
        }
        out.push({ a: arr.slice(), x: -1, y: -1, done: i + 1 });
      }
      return out;
    }
    var runs = [steps(1), steps(2), steps(3)];
    mount(canvas, null, function (ctx, w, h, t, p) {
      var rate = 34, hold = 1.8, run = runs[0], total, cyc = 0, tt = t, i;
      // pick the run for this cycle
      for (i = 0; i < 6; i++) { run = runs[(cyc) % runs.length]; total = run.length / rate + hold; if (tt < total) break; tt -= total; cyc++; }
      var s = run[Math.min(run.length - 1, Math.floor(tt * rate))];
      var padX = w * 0.06, baseY = h * 0.84, top = h * 0.12, bw = (w - padX * 2) / N;
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padX, baseY + 6); ctx.lineTo(w - padX, baseY + 6); ctx.stroke();
      var finished = s.done >= N;
      for (i = 0; i < N; i++) {
        var v = s.a[i], bh = (v / N) * (baseY - top);
        ctx.fillStyle = finished ? p.good : (i === s.x || i === s.y) ? p.amber : (i < s.done ? p.blue : alpha(p.muted, 0.55));
        rr(ctx, padX + i * bw + bw * 0.14, baseY - bh, bw * 0.72, bh, 3); ctx.fill();
      }
      ctx.fillStyle = p.muted; ctx.font = "500 12px " + FONT; ctx.textBaseline = "alphabetic";
      ctx.fillText("insertion sort, " + N + " items", padX, h * 0.07 + 6);
      ctx.textAlign = "right"; ctx.fillStyle = finished ? p.good : p.muted;
      ctx.fillText(finished ? "sorted" : "sorting", w - padX, h * 0.07 + 6); ctx.textAlign = "left";
    }, 3.2);
  }

  /* 2. Neural network: machine learning, deep learning, AI */
  function netScene(canvas) {
    var layers = [4, 7, 7, 3];
    mount(canvas, null, function (ctx, w, h, t, p) {
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      var xs = layers.map(function (_, i) { return w * (0.1 + i * (0.8 / (layers.length - 1))) * 0.86 + w * 0.02; });
      var pos = layers.map(function (n, l) { var a = []; for (var i = 0; i < n; i++) a.push({ x: xs[l], y: h * 0.14 + (h * 0.62) * (n === 1 ? 0.5 : i / (n - 1)) }); return a; });
      var period = 3.4, prog = ((t % period) / period) * (layers.length + 0.4); // 0..~4.4
      var l, i, j;
      for (l = 0; l < layers.length - 1; l++) {
        for (i = 0; i < pos[l].length; i++) for (j = 0; j < pos[l + 1].length; j++) {
          var a = pos[l][i], b = pos[l + 1][j];
          ctx.strokeStyle = alpha(p.line, 0.9); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          var local = prog - l;
          if (local > 0 && local < 1) {
            var jitter = hash(l * 100 + i * 10 + j) * 0.25, q = clamp((local - jitter) / 0.75, 0, 1);
            if (q > 0 && q < 1 && hash(l * 13 + i * 7 + j * 3 + 1) > 0.45) {
              var px = a.x + (b.x - a.x) * q, py = a.y + (b.y - a.y) * q;
              ctx.fillStyle = alpha(p.amber, 0.95); ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill();
            }
          }
        }
      }
      for (l = 0; l < layers.length; l++) for (i = 0; i < pos[l].length; i++) {
        var lit = clamp(1 - Math.abs(prog - l - 0.15) * 1.4, 0, 1);
        ctx.fillStyle = p.surface; ctx.strokeStyle = lit > 0.05 ? p.amber : p.blue; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(pos[l][i].x, pos[l][i].y, 9, 0, 7); ctx.fill(); ctx.stroke();
        if (lit > 0.05) { ctx.fillStyle = alpha(p.amber, lit * 0.8); ctx.beginPath(); ctx.arc(pos[l][i].x, pos[l][i].y, 6, 0, 7); ctx.fill(); }
      }
      // loss curve
      var bx = w * 0.06, by = h * 0.82, bw = w * 0.34, bh = h * 0.12, T = 14, f = clamp((t % (T + 2)) / T, 0, 1), k;
      ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.stroke();
      ctx.strokeStyle = p.good; ctx.lineWidth = 2; ctx.beginPath();
      for (k = 0; k <= 60; k++) {
        var u = k / 60; if (u > f) break;
        var y = by + bh - bh * (0.12 + 0.88 * Math.exp(-3.4 * u)) - (hash(k + 5) - 0.5) * 3 * (1 - u);
        if (k === 0) ctx.moveTo(bx + bw * u, y); else ctx.lineTo(bx + bw * u, y);
      }
      ctx.stroke();
      ctx.fillStyle = p.muted; ctx.font = "500 12px " + FONT; ctx.fillText("loss", bx, by - 6);
      ctx.textAlign = "right"; ctx.fillText("layers " + layers.join("-"), w - w * 0.06, h * 0.07 + 6); ctx.textAlign = "left";
    }, 2.2);
  }

  /* 3. Image detector: real or AI-generated */
  function imageScene(canvas) {
    var conf = [0.93, 0.88, 0.81, 0.95, 0.77, 0.9];
    function tile(ctx, x, y, w, h, kind, i, p) {
      ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
      if (kind === 0) {   // photo-like: sky, hills, sun
        var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#7fb0e8"); g.addColorStop(1, "#d9ecff");
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#f6d46b"; ctx.beginPath(); ctx.arc(x + w * (0.25 + 0.5 * hash(i)), y + h * 0.28, h * 0.1, 0, 7); ctx.fill();
        ctx.fillStyle = "#4f8a5b"; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + h * 0.66);
        ctx.quadraticCurveTo(x + w * 0.35, y + h * (0.5 + hash(i + 3) * 0.12), x + w * 0.7, y + h * 0.7);
        ctx.quadraticCurveTo(x + w * 0.9, y + h * 0.6, x + w, y + h * 0.68); ctx.lineTo(x + w, y + h); ctx.fill();
      } else {            // synthetic-like: repeating, over-smooth swirl
        var g2 = ctx.createLinearGradient(x, y, x + w, y + h); g2.addColorStop(0, "#5b3fd1"); g2.addColorStop(1, "#ff8a5c");
        ctx.fillStyle = g2; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5;
        for (var r = 1; r < 7; r++) { ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.5, r * h * 0.075, hash(i) * 6, hash(i) * 6 + 4.2 + r * 0.2); ctx.stroke(); }
      }
      ctx.restore();
      ctx.strokeStyle = p.line; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
    }
    mount(canvas, null, function (ctx, w, h, t, p) {
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      var cols = 3, rows = 2, gx = w * 0.05, gy = h * 0.1, cw = (w - gx * 2 - 18 * (cols - 1)) / cols, ch = (h - gy - h * 0.08 - 34 * (rows - 1) - 16 * rows) / rows;
      var T = 7.5, tt = t % T, scan = clamp((tt - 0.4) / 5.2, 0, 1), sx = gx + scan * (w - gx * 2);
      var i;
      for (i = 0; i < 6; i++) {
        var c = i % cols, r = Math.floor(i / cols), x = gx + c * (cw + 18), y = gy + r * (ch + 50);
        var kind = i % 2 === 0 ? 0 : 1; if (i === 3) kind = 0; if (i === 4) kind = 1;
        tile(ctx, x, y, cw, ch, kind, i, p);
        var seen = sx > x + cw && tt > 0.4;
        if (seen) {
          var fade = clamp((sx - (x + cw)) / 40, 0, 1), real = kind === 0;
          ctx.globalAlpha = fade; ctx.font = "600 12px " + FONT; ctx.fillStyle = real ? p.good : p.amber;
          ctx.fillText(real ? "REAL" : "AI-GENERATED", x, y + ch + 18);
          ctx.fillStyle = p.muted; ctx.textAlign = "right"; ctx.fillText(conf[i].toFixed(2), x + cw, y + ch + 18); ctx.textAlign = "left";
          ctx.fillStyle = p.line; ctx.fillRect(x, y + ch + 25, cw, 4);
          ctx.fillStyle = real ? p.good : p.amber; ctx.fillRect(x, y + ch + 25, cw * conf[i] * ease(fade), 4);
          ctx.globalAlpha = 1;
        }
      }
      if (tt > 0.4 && tt < 5.7) {
        var gr = ctx.createLinearGradient(sx - 40, 0, sx, 0); gr.addColorStop(0, "rgba(255,194,71,0)"); gr.addColorStop(1, alpha(p.amber, 0.35));
        ctx.fillStyle = gr; ctx.fillRect(sx - 40, gy - 6, 40, h - gy - 6);
        ctx.fillStyle = p.amber; ctx.fillRect(sx - 1, gy - 6, 2, h - gy - 6);
      }
    }, 6.5);
  }

  /* 4. Coding app: write, test, hint, level up */
  function codeScene(canvas) {
    var wrong = ["def sum_two(a, b):", "    return a - b"], right = ["def sum_two(a, b):", "    return a + b"];
    var hint = "Check the operator in your return.";
    function codeLine(ctx, text, x, y, p) {
      var parts = text.split(/(def|return|\d+)/), cx = x;
      parts.forEach(function (s) {
        if (!s) return;
        ctx.fillStyle = (s === "def" || s === "return") ? p.blue : /^\d+$/.test(s) ? p.amber : p.ink;
        ctx.fillText(s, cx, y); cx += ctx.measureText(s).width;
      });
      return cx;
    }
    mount(canvas, null, function (ctx, w, h, t, p) {
      var T = 13, tt = t % T;
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      var ex = w * 0.05, ey = h * 0.12, ew = w * 0.54, eh = h * 0.76;
      ctx.fillStyle = p.surface; rr(ctx, ex, ey, ew, eh, 10); ctx.fill(); ctx.strokeStyle = p.line; ctx.stroke();
      ctx.font = "500 " + Math.max(12, Math.round(w * 0.021)) + "px " + FONT; ctx.textBaseline = "alphabetic";
      var lh = Math.max(24, h * 0.085), lx = ex + 22, ly = ey + 44;
      ctx.fillStyle = p.muted; ctx.font = "500 12px " + FONT; ctx.fillText("Sum of Two Numbers", ex + 22, ey + 24);
      ctx.font = "500 " + Math.max(12, Math.round(w * 0.021)) + "px " + FONT;
      var fixed = tt > 6.0, lines = fixed ? right : wrong, typed;
      var chars = Math.floor(clamp((tt - 0.3) * 24, 0, 999));
      var total = 0, li;
      for (li = 0; li < lines.length; li++) {
        var take = Math.max(0, Math.min(lines[li].length, chars - total)); total += lines[li].length;
        var txt = fixed ? lines[li] : lines[li].slice(0, take);
        if (txt) { var endx = codeLine(ctx, txt, lx, ly + li * lh, p);
          if (!fixed && take < lines[li].length && take > 0 || (li === lines.length - 1 && !fixed && tt < 2.4 && Math.floor(tt * 2) % 2 === 0)) { ctx.fillStyle = p.amber; ctx.fillRect(endx + 1, ly + li * lh - 13, 2, 17); } }
      }
      if (fixed && tt < 6.5) { ctx.fillStyle = alpha(p.amber, 0.25 * (1 - (tt - 6) / 0.5)); ctx.fillRect(lx, ly + lh - 18, ew - 44, 24); }
      // hint bubble
      if (tt > 3.6 && tt < 6.4) {
        var hn = Math.floor(clamp((tt - 3.8) * 30, 0, hint.length)), bx = ex + 14, by = ey + eh - 56, bw = ew - 28;
        ctx.fillStyle = alpha(p.amber, 0.14); rr(ctx, bx, by, bw, 38, 8); ctx.fill(); ctx.strokeStyle = alpha(p.amber, 0.6); ctx.stroke();
        ctx.fillStyle = p.ink; ctx.font = "500 12px " + SANS; ctx.fillText("Hint: " + hint.slice(0, hn), bx + 12, by + 24);
      }
      // test panel
      var tx = w * 0.63, tw = w * 0.32;
      ctx.font = "600 12px " + FONT; ctx.fillStyle = p.muted; ctx.fillText("Test cases", tx, ey + 24);
      var tests = ["sum_two(2, 3) == 5", "sum_two(-1, 1) == 0"];
      tests.forEach(function (s, i) {
        var y = ey + 52 + i * 44, run = tt > 2.6 + i * 0.35 && tt < 6.9 ? "fail" : (tt > 7.0 + i * 0.35 ? "pass" : "idle");
        ctx.fillStyle = p.surface; rr(ctx, tx, y, tw, 34, 8); ctx.fill(); ctx.strokeStyle = run === "fail" ? alpha(p.bad, 0.7) : run === "pass" ? alpha(p.good, 0.7) : p.line; ctx.stroke();
        ctx.font = "500 12px " + FONT; ctx.fillStyle = p.ink; ctx.fillText(s, tx + 12, y + 21);
        ctx.textAlign = "right"; ctx.fillStyle = run === "fail" ? p.bad : run === "pass" ? p.good : p.muted;
        ctx.fillText(run === "fail" ? "fail" : run === "pass" ? "pass" : "...", tx + tw - 12, y + 21); ctx.textAlign = "left";
      });
      // score and level
      var score = tt < 2.9 ? 0 : tt < 7.3 ? -5 : 5;
      ctx.font = "600 12px " + FONT; ctx.fillStyle = p.muted; ctx.fillText("Score", tx, ey + 168);
      ctx.font = "700 " + Math.round(h * 0.11) + "px " + SANS; ctx.fillStyle = p.ink; ctx.fillText(String(score), tx, ey + 168 + h * 0.12);
      if (tt > 2.9 && tt < 4.4) { ctx.font = "600 13px " + FONT; ctx.fillStyle = p.bad; ctx.globalAlpha = 1 - (tt - 2.9) / 1.5; ctx.fillText("-5", tx + tw * 0.4, ey + 168 + h * 0.12 - (tt - 2.9) * 14); ctx.globalAlpha = 1; }
      if (tt > 7.3 && tt < 9) { ctx.font = "600 13px " + FONT; ctx.fillStyle = p.good; ctx.globalAlpha = 1 - (tt - 7.3) / 1.7; ctx.fillText("+10", tx + tw * 0.4, ey + 168 + h * 0.12 - (tt - 7.3) * 14); ctx.globalAlpha = 1; }
      var lvl = tt > 9.0 ? 1 : 0, names = ["easy", "medium", "hard"], cx = tx, ly2 = ey + eh - 30;
      names.forEach(function (n, i) {
        var on = i === lvl; ctx.font = "600 12px " + FONT; var wd = ctx.measureText(n).width + 22;
        ctx.fillStyle = on ? p.amber : "transparent"; rr(ctx, cx, ly2 - 16, wd, 26, 13); if (on) ctx.fill();
        ctx.strokeStyle = on ? p.amber : p.line; ctx.stroke(); ctx.fillStyle = on ? "#0a1022" : p.muted; ctx.fillText(n, cx + 11, ly2 + 1); cx += wd + 8;
      });
    }, 8.2);
  }

  /* 5. Voice assistant: wake word, listen, answer */
  function voiceScene(canvas) {
    var ask = "What's the weather in London?", reply = "Here is the weather for London.";
    mount(canvas, null, function (ctx, w, h, t, p) {
      var T = 13, tt = t % T;
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      var cx = w / 2, cy = h * 0.4, R = Math.min(w, h) * 0.15, N = 72, i;
      var phase = tt < 1.6 ? "idle" : tt < 2.8 ? "wake" : tt < 6.4 ? "listen" : tt < 7.6 ? "think" : tt < 11.6 ? "speak" : "idle";
      var col = phase === "wake" || phase === "listen" ? p.amber : phase === "speak" || phase === "think" ? p.blue : p.muted;
      for (i = 0; i < N; i++) {
        var a = (i / N) * Math.PI * 2 - Math.PI / 2, n1 = Math.sin(t * 7 + i * 0.9) * 0.5 + 0.5, n2 = Math.sin(t * 3.1 + i * 2.3) * 0.5 + 0.5;
        var amp = phase === "idle" ? 0.06 + 0.04 * n2 : phase === "wake" ? 0.5 * (1 - (tt - 1.6) / 1.2) + 0.1 : phase === "listen" ? 0.18 + 0.7 * n1 * n2 : phase === "think" ? 0.12 : 0.15 + 0.5 * n1 * (0.4 + 0.6 * n2);
        var len = R * (0.12 + amp * 0.9), r0 = R * 1.22;
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var pulse = phase === "wake" ? 1 + 0.1 * Math.sin((tt - 1.6) * 8) : phase === "idle" ? 1 : 1 + 0.03 * Math.sin(t * 5);
      var g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * pulse);
      g.addColorStop(0, alpha(col, 0.95)); g.addColorStop(1, alpha(col, 0.25));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * pulse, 0, 7); ctx.fill();
      // labels
      ctx.textAlign = "center"; ctx.font = "600 13px " + FONT;
      var status = phase === "idle" ? "waiting for the wake word" : phase === "wake" ? "wake word: Brother Jackey" : phase === "listen" ? "listening" : phase === "think" ? "asking Gemini" : "speaking";
      ctx.fillStyle = col; ctx.fillText(status, cx, cy + R * 1.22 + R * 1.15 + 18);
      var y2 = h * 0.88; ctx.font = "500 15px " + SANS; ctx.fillStyle = p.ink;
      if (phase === "listen" || phase === "think" || phase === "speak") {
        var n = phase === "listen" ? Math.floor(clamp((tt - 3) * 14, 0, ask.length)) : ask.length;
        ctx.fillText("You: " + ask.slice(0, n), cx, y2 - 20);
      }
      if (phase === "speak") { var m = Math.floor(clamp((tt - 7.8) * 14, 0, reply.length)); ctx.fillStyle = p.blue; ctx.fillText("Jackey: " + reply.slice(0, m), cx, y2 + 6); }
      ctx.textAlign = "left";
    }, 9.5);
  }

  /* 6. Traffic: detect, track, count */
  function trafficScene(canvas) {
    function init(w, h) {
      var s = { cars: [], id: 0, nextSpawn: [0, 0.4, 0.8], inN: 0, outN: 0, flash: 0, laneZone: [0, 0, 0] };
      for (var k = 0; k < 120; k++) step(s, 0.05, w, h);
      return s;
    }
    function geom(w, h) { var rw = Math.min(w * 0.72, 560), rx = (w - rw) / 2; return { rw: rw, rx: rx, lane: rw / 3, line: h * 0.56 }; }
    function step(s, dt, w, h) {
      var g = geom(w, h), l, i;
      for (l = 0; l < 3; l++) {
        s.nextSpawn[l] -= dt;
        if (s.nextSpawn[l] <= 0) {
          var dir = l === 2 ? -1 : 1, sp = 70 + Math.random() * 60;
          var tooClose = s.cars.some(function (c) { return c.lane === l && Math.abs(c.y - (dir === 1 ? -30 : h + 30)) < 90; });
          if (!tooClose) s.cars.push({ id: ++s.id, lane: l, dir: dir, y: dir === 1 ? -30 : h + 30, sp: sp, kind: Math.random() < 0.2 ? "truck" : "car", counted: false, off: (Math.random() - 0.5) * g.lane * 0.2 });
          s.nextSpawn[l] = 0.9 + Math.random() * 1.6;
        }
      }
      s.cars.forEach(function (c) {
        var ahead = s.cars.filter(function (o) { return o !== c && o.lane === c.lane && (c.dir === 1 ? o.y > c.y : o.y < c.y); })
          .sort(function (a, b) { return Math.abs(a.y - c.y) - Math.abs(b.y - c.y); })[0];
        var sp = c.sp;
        if (ahead && Math.abs(ahead.y - c.y) < 80) sp = Math.min(sp, ahead.sp * 0.9);
        var prev = c.y; c.y += c.dir * sp * dt;
        if (!c.counted && ((prev < g.line && c.y >= g.line && c.dir === 1) || (prev > g.line && c.y <= g.line && c.dir === -1))) { c.counted = true; if (c.dir === 1) s.inN++; else s.outN++; s.flash = 1; }
      });
      s.cars = s.cars.filter(function (c) { return c.y > -80 && c.y < h + 80; });
      s.flash = Math.max(0, s.flash - dt * 3);
    }
    mount(canvas, init, function (ctx, w, h, t, p, s, dt) {
      if (dt) step(s, dt, w, h);
      var g = geom(w, h), i;
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = alpha(p.muted, 0.18); ctx.fillRect(g.rx, 0, g.rw, h);
      ctx.strokeStyle = alpha(p.muted, 0.7); ctx.lineWidth = 2; ctx.setLineDash([14, 14]);
      for (i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(g.rx + g.lane * i, 0); ctx.lineTo(g.rx + g.lane * i, h); ctx.stroke(); }
      ctx.setLineDash([]); ctx.strokeStyle = p.muted; ctx.beginPath(); ctx.moveTo(g.rx, 0); ctx.lineTo(g.rx, h); ctx.moveTo(g.rx + g.rw, 0); ctx.lineTo(g.rx + g.rw, h); ctx.stroke();
      // count line
      ctx.strokeStyle = s.flash > 0 ? p.good : alpha(p.good, 0.6); ctx.lineWidth = 2 + s.flash * 3; ctx.beginPath(); ctx.moveTo(g.rx - 20, g.line); ctx.lineTo(g.rx + g.rw + 20, g.line); ctx.stroke();
      var zone = [0, 0, 0];
      s.cars.forEach(function (c) {
        var cw = g.lane * (c.kind === "truck" ? 0.5 : 0.4), ch = c.kind === "truck" ? 66 : 42, x = g.rx + g.lane * (c.lane + 0.5) + c.off - cw / 2, y = c.y - ch / 2;
        zone[c.lane]++;
        ctx.fillStyle = c.kind === "truck" ? p.blue : alpha(p.ink, 0.88); rr(ctx, x, y, cw, ch, 6); ctx.fill();
        ctx.fillStyle = alpha(p.bg, 0.8); rr(ctx, x + cw * 0.15, y + (c.dir === 1 ? ch * 0.55 : ch * 0.1), cw * 0.7, ch * 0.3, 3); ctx.fill();
        ctx.strokeStyle = p.amber; ctx.lineWidth = 1.5; ctx.strokeRect(x - 5, y - 5, cw + 10, ch + 10);
        ctx.fillStyle = p.amber; ctx.fillRect(x - 5, y - 20, ctx.measureText("x").width * 0 + 74, 15);
        ctx.fillStyle = "#0a1022"; ctx.font = "600 10px " + FONT; ctx.fillText(c.kind + " #" + c.id, x - 2, y - 9);
      });
      var n = s.cars.length, dens = n <= 3 ? "LOW" : n <= 6 ? "MEDIUM" : "HIGH";
      ctx.font = "600 12px " + FONT; ctx.fillStyle = p.ink; ctx.textAlign = "left";
      ctx.fillText("Vehicles " + n, 14, 22); ctx.fillText("In " + s.inN + "   Out " + s.outN, 14, 42);
      ctx.fillStyle = dens === "HIGH" ? p.bad : dens === "MEDIUM" ? p.amber : p.good; ctx.fillText("Density " + dens, 14, 62);
      ctx.fillStyle = p.muted; ctx.font = "500 11px " + FONT; ctx.textAlign = "center";
      for (i = 0; i < 3; i++) ctx.fillText("lane " + (i + 1) + ": " + zone[i], g.rx + g.lane * (i + 0.5), h - 10);
      ctx.textAlign = "left";
    }, 3);
  }

  /* 7. RAG pipeline: one answered question, one refused */
  function pipelineScene(canvas) {
    var names = ["Gate", "Hybrid search", "Rerank", "Context", "Answer", "Check"];
    var runs = [
      { q: "Can I travel abroad on a Graduate visa?", sim: 0.72, pass: true, a: "Yes, you can travel and return to the UK [1]." },
      { q: "Who won the cricket world cup?", sim: 0.24, pass: false, a: "I don't know based on the pages I have indexed." }
    ];
    mount(canvas, null, function (ctx, w, h, t, p) {
      var P = 9, run = runs[Math.floor(t / P) % 2], tt = t % P;
      ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
      var left = w * 0.07, right = w * 0.93, n = names.length, step = (right - left) / (n - 1), cy = h * 0.46, i;
      var xs = names.map(function (_, i) { return left + step * i; });
      // progress of the packet: reaches node i at time 0.9 + i*1.05 (gate = node 0)
      function arrive(i) { return 0.9 + i * 1.05; }
      var stopAt = run.pass ? n - 1 : 0;
      // rail
      ctx.strokeStyle = p.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs[0], cy); ctx.lineTo(xs[n - 1], cy); ctx.stroke();
      var reach = 0; for (i = 0; i <= stopAt; i++) if (tt >= arrive(i)) reach = i;
      var lit = tt >= arrive(0) ? reach : -1;
      ctx.strokeStyle = run.pass ? p.good : p.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs[0], cy);
      var px = xs[0];
      if (tt < arrive(0)) px = xs[0] - (arrive(0) - tt) / arrive(0) * step * 0.9;
      else if (reach < stopAt) { var f = ease((tt - arrive(reach) - 0.25) / (arrive(reach + 1) - arrive(reach) - 0.25)); px = xs[reach] + (xs[reach + 1] - xs[reach]) * f; }
      else px = xs[stopAt];
      ctx.lineTo(Math.max(xs[0], px), cy); ctx.stroke();
      // nodes
      for (i = 0; i < n; i++) {
        var on = i <= lit, dead = !run.pass && i > 0;
        ctx.fillStyle = p.surface; ctx.strokeStyle = on ? (run.pass || i === 0 && run.pass ? p.good : (i === 0 ? p.bad : p.good)) : p.line; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(xs[i], cy, 15, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = on ? p.ink : p.muted; ctx.font = "600 12px " + FONT; ctx.textAlign = "center"; ctx.fillText(String(i + 1), xs[i], cy + 4);
        ctx.font = "600 13px " + SANS; ctx.fillStyle = dead && tt > arrive(0) + 0.4 ? alpha(p.muted, 0.5) : p.ink; ctx.fillText(names[i], xs[i], cy + 42);
      }
      // packet
      ctx.fillStyle = p.amber; ctx.beginPath(); ctx.arc(px, cy, 8, 0, 7); ctx.fill();
      // question chip
      ctx.textAlign = "left"; ctx.font = "500 14px " + SANS; var qw = ctx.measureText("Question: " + run.q).width + 24;
      ctx.fillStyle = p.surface; rr(ctx, left - 10, h * 0.08, Math.min(qw, w * 0.86), 32, 16); ctx.fill(); ctx.strokeStyle = p.line; ctx.stroke();
      ctx.fillStyle = p.ink; ctx.fillText("Question: " + run.q, left + 2, h * 0.08 + 21);
      // per-node detail under names
      ctx.textAlign = "center"; ctx.font = "500 11px " + FONT;
      var dy = cy + 66;
      if (tt >= arrive(0) + 0.2) { ctx.fillStyle = run.pass ? p.good : p.bad; ctx.fillText(run.sim.toFixed(2) + (run.pass ? " >= 0.45" : " < 0.45"), xs[0], dy); }
      if (run.pass) {
        if (tt >= arrive(1) + 0.2) { ctx.fillStyle = p.muted; ctx.fillText("vector + BM25", xs[1], dy); ctx.fillText("rank fusion", xs[1], dy + 15); }
        if (tt >= arrive(2) + 0.2) {
          for (var b = 0; b < 5; b++) { var bw2 = (1 - b * 0.16) * step * 0.5; ctx.fillStyle = b === 0 ? p.amber : p.blue; ctx.fillRect(xs[2] - bw2 / 2, dy - 6 + b * 7, bw2, 4); }
        }
        if (tt >= arrive(3) + 0.2) { ctx.fillStyle = p.muted; ctx.fillText("+ neighbours", xs[3], dy); ctx.fillText("merged by page", xs[3], dy + 15); }
        if (tt >= arrive(4) + 0.2) { ctx.fillStyle = p.muted; ctx.fillText("Gemini, sources only", xs[4], dy); }
        if (tt >= arrive(5) + 0.2) { ctx.fillStyle = p.good; ctx.fillText("[1] cited", xs[5], dy); }
      } else if (tt >= arrive(0) + 0.7) { ctx.fillStyle = p.muted; ctx.fillText("stop here, no model call", (xs[1] + xs[3]) / 2, cy - 30); }
      // answer line
      var show = run.pass ? tt >= arrive(5) + 0.3 : tt >= arrive(0) + 1.0;
      if (show) {
        var s0 = run.pass ? arrive(5) + 0.3 : arrive(0) + 1.0, nn = Math.floor(clamp((tt - s0) * 30, 0, run.a.length));
        ctx.textAlign = "left"; ctx.font = "600 16px " + SANS; ctx.fillStyle = run.pass ? p.ink : p.bad;
        ctx.fillText(run.a.slice(0, nn), left - 4, h * 0.9);
      }
      ctx.textAlign = "left";
    }, 8.4);
  }

  var registry = { sort: sortScene, net: netScene, image: imageScene, code: codeScene, voice: voiceScene, traffic: trafficScene, pipeline: pipelineScene };
  function boot() {
    document.querySelectorAll("canvas[data-scene]").forEach(function (c) {
      var f = registry[c.getAttribute("data-scene")]; if (f) f(c);
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
