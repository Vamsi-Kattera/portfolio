(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* Theme toggle (remembered if storage is available) */
  var root = document.documentElement, themeBtn = $("#theme");
  try { var saved = localStorage.getItem("theme"); if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved); } catch (e) {}
  themeBtn.addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : !(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
    var next = dark ? "light" : "dark"; root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* Timeline strip: positions come from real dates */
  (function strip() {
    var svg = $("#strip-svg"); if (!svg) return;
    var NS = "http://www.w3.org/2000/svg", T0 = 2020, T1 = 2027, X0 = 40, X1 = 960, AX = 176;
    function x(y) { return X0 + (y - T0) / (T1 - T0) * (X1 - X0); }
    function el(n, a, parent, text) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; (parent || svg).appendChild(e); return e; }
    var ax = el("line", { x1: x(T0), y1: AX, x2: x(T1), y2: AX, "class": "axis draw", style: "--len:" + (x(T1) - x(T0)) + ";--d:.5s" });
    for (var y = T0; y < T1; y++) {
      el("line", { x1: x(y), y1: AX - 5, x2: x(y), y2: AX + 5, "class": "tick" });
      el("text", { x: x(y), y: AX + 24, "text-anchor": "middle", "class": "yr" }, null, String(y));
    }
    // study spans
    function span(a, b, row, cls, label, d) {
      var yy = row; el("rect", { x: x(a), y: yy, width: x(b) - x(a), height: 16, rx: 8, "class": "bar " + cls + " grow", style: "--d:" + d + "s" });
      el("text", { x: x(a), y: yy - 8, "class": "span-label pop", style: "--d:" + (d + .5) + "s" }, null, label);
    }
    span(2020.6, 2024.5, 130, "", "BSc, KHIT, India (2020 to 2024)", 1.0);
    span(2025.0, 2026.0, 130, "msc", "MSc, Strathclyde", 1.5);
    // projects
    var P = [
      { t: 2025.808, name: "AI or Real Image Detector", href: "#image", dy: 218, side: "end", d: 2.0 },
      { t: 2025.815, name: "Adaptive Coding Practice", href: "#coding", dy: 236, side: "end", d: 2.2 },
      { t: 2025.832, name: "Jackey voice assistant", href: "#jackey", dy: 254, side: "end", d: 2.4 },
      { t: 2026.408, name: "Traffic monitoring", href: "#traffic", dy: 96, side: "end", d: 2.7, up: true },
      { t: 2026.775, name: "GOV.UK RAG assistant", href: "#rag", dy: 66, side: "end", d: 3.0, up: true, now: true }
    ];
    P.forEach(function (p) {
      var a = el("a", { href: p.href, "aria-label": p.name });
      el("line", { x1: x(p.t), y1: AX, x2: x(p.t), y2: p.up ? p.dy + 6 : p.dy - 12, "class": "stem draw", style: "--len:" + Math.abs((p.up ? p.dy + 6 : p.dy - 12) - AX) + ";--d:" + p.d + "s" }, a);
      el("circle", { cx: x(p.t), cy: AX, r: 7, "class": "dot pop" + (p.now ? " now" : ""), style: "--d:" + p.d + "s" }, a);
      el("text", { x: x(p.t) - (p.up ? 0 : 6), y: p.dy, "text-anchor": "end", "class": "lbl pop", style: "--d:" + (p.d + .25) + "s" }, a, p.name);
    });
  })();

  /* Rail (year + label), spine fill, nav progress */
  var journey = $("#journey"), chapters = $$(".chapter"), fill = $("#spine-fill"), railYear = $("#rail-year"), railLabel = $("#rail-label"), bar = $("#progress");
  var curYear = "2020", ticking = false, curTone = "";
  var logo = $(".brand svg");
  function setTone(t) {
    if (t === curTone) return;
    curTone = t; root.setAttribute("data-tone", t);
    if (logo && !reduce) { logo.classList.remove("flip"); void logo.getBoundingClientRect(); logo.classList.add("flip"); setTimeout(function () { logo.classList.remove("flip"); }, 650); }
  }
  function setYear(y) {
    if (y === curYear) return;
    var old = $(".y.cur", railYear), nu = document.createElement("span");
    nu.className = "y in"; nu.textContent = y; railYear.appendChild(nu);
    if (reduce) { old.remove(); nu.className = "y cur"; }
    else {
      void nu.offsetWidth; old.className = "y out"; nu.className = "y cur";
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 650);
    }
    curYear = y;
  }
  function update() {
    ticking = false;
    var vh = window.innerHeight, sy = window.scrollY, doc = document.documentElement.scrollHeight - vh;
    bar.style.transform = "scaleX(" + (doc > 0 ? Math.min(1, sy / doc) : 0) + ")";
    var jr = journey.getBoundingClientRect(), line = vh * 0.45;
    var p = (line - jr.top - 32) / Math.max(1, jr.height - 64);
    fill.style.height = Math.max(0, Math.min(1, p)) * 100 + "%";
    var active = chapters[0];
    chapters.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.top < vh * 0.55) { c.classList.add("reached"); active = c; }
    });
    setYear(active.getAttribute("data-year"));
    var tone = (jr.top > vh * 0.45) ? "hero" : active.id;
    setTone(tone);
    var lab = active.getAttribute("data-label"); if (railLabel.textContent !== lab) railLabel.textContent = lab;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  /* Scenes wipe in once, when first seen */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.25 });
    $$(".scene").forEach(function (s) { s.classList.add("pre"); io.observe(s); });
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("seen"); io2.unobserve(e.target); } }); }, { threshold: 0.3 });
    $$(".results").forEach(function (r) { io2.observe(r); });
  } else { $$(".results").forEach(function (r) { r.classList.add("seen"); }); }

  /* "Ask this portfolio": tiny retrieval demo over the facts on this page (TF-IDF, a gate, cited answers). No language model. */
  var CHUNKS = [
    { title: "Projects overview", href: "#journey", text: "Projects built: an AI or real image detector, an adaptive coding practice app, Jackey the voice assistant, an AI traffic monitoring system and a GOV.UK RAG assistant." },
    { title: "BSc Computer Science and Engineering", href: "#bsc", text: "BSc in Computer Science and Engineering at KHIT in India, 2020 to 2024, CGPA 7.66. Studied Python, data structures and algorithms, artificial intelligence and machine learning." },
    { title: "MSc Advanced Computer Science", href: "#msc", text: "MSc in Advanced Computer Science at the University of Strathclyde in Scotland, January 2025 to January 2026. Studied machine learning, deep learning and artificial intelligence." },
    { title: "Certifications", href: "#toolkit", text: "Completed the Deep Learning Specialization and Mathematics for Machine Learning and Data Science from DeepLearning.AI on Coursera." },
    { title: "AI or Real Image Detector", href: "#image", text: "A MobileNetV2 transfer-learning classifier that labels an uploaded image as AI-generated or real with a confidence score, over 80% accuracy, served through Streamlit and FastAPI. First published October 2025." },
    { title: "Adaptive Coding Practice", href: "#coding", text: "A Streamlit app with 50 coding challenges and 50 quiz questions that runs submitted code against test cases, raises difficulty after fast correct answers and asks Gemini for hints. First published October 2025." },
    { title: "Jackey voice assistant", href: "#jackey", text: "A voice assistant with offline wake-word detection using Picovoice Porcupine, answers through Gemini 2.0 Flash, memory of tasks and conversation, opens apps, reports time and weather. First published October 2025." },
    { title: "AI Traffic Monitoring System", href: "#traffic", text: "Computer vision project. YOLOv8 and ByteTrack detect, track and count vehicles, lane-zone counts, a Random Forest for traffic density and an Isolation Forest for unusual traffic, FastAPI with a React dashboard on Render. First published May 2026." },
    { title: "GOV.UK RAG assistant", href: "#rag", text: "A retrieval-augmented generation assistant over 129 GOV.UK pages on UK visas, right to work, employment rights and benefits. It answers with citations to the exact page and refuses when the pages do not cover the question." },
    { title: "Hybrid retrieval", href: "#rag", text: "Combines vector search and BM25 with Reciprocal Rank Fusion, then reranks with a cross-encoder. Top-1 retrieval accuracy rose from 74% with vector search only to 86% on a 42-question test set." },
    { title: "How the RAG assistant is evaluated", href: "#rag", text: "Evaluated on 42 hand-reviewed questions plus 10 out-of-scope ones: 95% of answers judged correct, all 10 out-of-scope questions refused, median answer time 2.6 seconds. The judge is the same model family that writes the answers, so samples were also checked by hand." },
    { title: "Saying I don't know", href: "#rag", text: "A similarity gate stops unrelated questions before any model call, and a cite-or-abstain rule turns any answer without a real citation into a refusal." },
    { title: "What went wrong along the way", href: "#rag", text: "Answers were lost at chunk boundaries until neighbouring chunks were added. Citations pointed at the wrong source until sources were numbered per page. A prompt example leaked into unrelated answers. Strict refusal rules cost recall." },
    { title: "Engineering around the model", href: "#rag", text: "The RAG assistant is a FastAPI service with request validation, rate limiting, JSON logs and a metrics endpoint, a pytest suite, GitHub Actions continuous integration, a Docker image and a Streamlit interface, deployed on Hugging Face Spaces." },
    { title: "Where the work is deployed", href: "#toolkit", text: "Deployed on Hugging Face Spaces (RAG assistant), Render (traffic monitoring) and AWS EC2 (Streamlit apps), packaged with Docker." },
    { title: "LLM and RAG skills", href: "#toolkit", text: "Hybrid retrieval, reranking, embeddings, prompt engineering, grounded answers with citations, LLM-as-judge evaluation, Gemini API, OpenAI API and Chroma." },
    { title: "Machine learning and vision skills", href: "#toolkit", text: "Computer vision and machine learning: TensorFlow, Keras, scikit-learn, convolutional neural networks, transfer learning, YOLOv8, ByteTrack and OpenCV." },
    { title: "Backend and delivery skills", href: "#toolkit", text: "Python, SQL, FastAPI, pytest, Docker, GitHub Actions, AWS EC2, Hugging Face Spaces, Render, Git and GitHub." },
    { title: "What he is looking for", href: "#contact", text: "Looking for his first AI engineering role building LLM and RAG applications for real users, on a team that measures its work." },
    { title: "Contact", href: "#contact", text: "Reach him by email at katteravamsi2@gmail.com, on LinkedIn or on GitHub as Vamsi-Kattera." }
  ];
  var STOP = new Set(("a an the and or of to in on at for with by from is are was were be been he his him she her it its what who which where when how why do does did has have had can could will would about into over than then that this those these me my you your tell show give any some there their they them as not no know").split(" "));
  var SYN = { build: "built", made: "built", create: "built", project: "built", projects: "built", deploy: "deployed", host: "deployed", hosted: "deployed",
    study: "studied", studied: "studied", degree: "msc", university: "msc", school: "msc", masters: "msc", education: "msc", evaluate: "evaluated", evaluation: "evaluated", measure: "evaluated", accuracy: "evaluated", metrics: "evaluated",
    hire: "looking", job: "looking", role: "looking", seeking: "looking", reach: "contact", email: "contact", linkedin: "contact", skill: "skills", tools: "skills", tech: "skills", stack: "skills" };
  function stem(w) { if (w.length > 4 && w.slice(-3) === "ing") return w.slice(0, -3); if (w.length > 4 && w.slice(-2) === "ed") return w.slice(0, -2); if (w.length > 3 && w.slice(-1) === "s" && w.slice(-2) !== "ss") return w.slice(0, -1); return w; }
  function tokens(s) { var out = [], ws = s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/); ws.forEach(function (w) { if (!w || STOP.has(w)) return; if (SYN[w]) out.push(stem(SYN[w])); out.push(stem(w)); }); return out; }
  var docs = CHUNKS.map(function (c) { return tokens(c.title + " " + c.text); }), df = {};
  docs.forEach(function (d) { new Set(d).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
  var N = docs.length;
  function vec(toks) { var tf = {}, v = {}, n = 0; toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; }); Object.keys(tf).forEach(function (t) { if (!df[t]) return; v[t] = (1 + Math.log(tf[t])) * Math.log(1 + N / (1 + df[t])); n += v[t] * v[t]; }); n = Math.sqrt(n) || 1; Object.keys(v).forEach(function (t) { v[t] /= n; }); return v; }
  var dv = docs.map(vec), GATE = 0.17;
  function cos(a, b) { var s = 0; for (var t in a) if (b[t]) s += a[t] * b[t]; return s; }
  function search(q) { var qv = vec(tokens(q)); return CHUNKS.map(function (c, i) { return { c: c, s: cos(qv, dv[i]) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3); }

  var form = $("#ask-form"), input = $("#q"), hitsEl = $("#hits"), answerEl = $("#answer"), gateEl = $("#trace-gate"), timers = [];
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function first(t) { var m = t.match(/^.*?[.!?](\s|$)/); return m ? m[0].trim() : t; }
  function render(q) {
    timers.forEach(clearTimeout); timers = [];
    var top = search(q), best = top[0].s, pass = best >= GATE;
    gateEl.textContent = "gate " + GATE.toFixed(2) + ", best " + best.toFixed(2) + (pass ? ", passed" : ", stopped");
    hitsEl.innerHTML = ""; answerEl.innerHTML = "";
    top.forEach(function (h, i) {
      var li = mk("li", "hit" + (i === 0 && pass ? " top" : ""));
      li.appendChild(mk("span", "tag", "[" + (i + 1) + "]")); li.appendChild(mk("span", "title", h.c.title)); li.appendChild(mk("span", "score", h.s.toFixed(2)));
      var m = mk("span", "meter"), b = document.createElement("i"); m.appendChild(b); li.appendChild(m); hitsEl.appendChild(li);
      var w = Math.max(2, Math.round(Math.min(1, h.s / 0.6) * 100)) + "%";
      if (reduce) b.style.width = w; else timers.push(setTimeout(function () { b.style.width = w; }, 60 + i * 140));
    });
    function cite(n, h) { var a = mk("a", "cite", "[" + n + "]"); a.href = h.c.href; a.title = "Go to: " + h.c.title; return a; }
    function show() {
      answerEl.innerHTML = "";
      if (!pass) { answerEl.appendChild(mk("p", "refusal", "I don't know based on the facts on this page.")); answerEl.appendChild(mk("p", "refusal-note", "Nothing here is close enough to that question, so no answer is given and nothing is cited. Try one of the questions above.")); return; }
      var p = mk("p"); p.appendChild(document.createTextNode(top[0].c.text + " ")); p.appendChild(cite(1, top[0]));
      if (top[1].s >= 0.7 * best && top[1].s >= GATE) { p.appendChild(document.createTextNode(" " + first(top[1].c.text) + " ")); p.appendChild(cite(2, top[1])); }
      answerEl.appendChild(p);
    }
    if (reduce) show(); else timers.push(setTimeout(show, 520));
  }
  function ask(q) { q = (q || "").trim(); if (q.length < 2) return; input.value = q; render(q); }
  form.addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
  $$(".chip").forEach(function (b) { b.addEventListener("click", function () { ask(b.getAttribute("data-q")); }); });
  ask("What has he built?");

  /* Show the project screenshot only if it loads */
  var shot = $("#shot"), img = $("#shot-img");
  if (shot && img) { var ok = function () { shot.hidden = false; }; if (img.complete && img.naturalWidth > 0) ok(); else img.addEventListener("load", ok); }
})();
