/* =====================================================================
   App: routing, progress, quizzes, interactive exercises.
   ===================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Storage (per-viewer convenience only) ---------- */
  const KEY = "genai-gov-academy-v1";
  let state = { done: {}, quiz: {}, checklist: {}, ckName: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
  } catch (e) { /* storage unavailable: run without persistence */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const MODS = COURSE.modules;
  const ROUTES = ["home"].concat(MODS.map((m) => m.id), COURSE.extras.map((x) => x.id));

  /* ---------- Navigation ---------- */
  function buildNav() {
    let html = '<ul class="nav-list"><li><a class="nav-link" data-route="home" href="#home"><span class="nav-num">⌂</span><span>Course home</span><span></span></a></li></ul>';
    COURSE.parts.forEach((p) => {
      html += `<p class="nav-part">Part ${p.id} · ${esc(p.title)}</p><ul class="nav-list">`;
      MODS.filter((m) => m.part === p.id).forEach((m) => {
        html += `<li><a class="nav-link" data-route="${m.id}" href="#${m.id}"><span class="nav-num">${m.num}</span><span>${esc(m.short)}</span><span class="nav-min">${m.min}′</span></a></li>`;
      });
      html += "</ul>";
    });
    html += '<p class="nav-part">Resources</p><ul class="nav-list">';
    COURSE.extras.forEach((x, i) => {
      const sym = ["✓", "A–Z", "★", "i"][i];
      html += `<li><a class="nav-link" data-route="${x.id}" href="#${x.id}"><span class="nav-num">${sym}</span><span>${esc(x.short)}</span><span></span></a></li>`;
    });
    html += "</ul>";
    $("#nav").innerHTML = html;
  }

  function refreshProgress() {
    const n = MODS.filter((m) => state.done[m.id]).length;
    $("#meter-fill").style.width = (100 * n / MODS.length) + "%";
    $("#meter-label").textContent = `${n} of ${MODS.length} modules`;
    $$(".nav-link").forEach((a) => a.classList.toggle("done", !!state.done[a.dataset.route]));
    $$("[data-modcard]").forEach((c) => {
      const id = c.dataset.modcard, d = !!state.done[id];
      c.classList.toggle("done", d);
      const st = $(".mc-status", c);
      if (st) {
        const qs = state.quiz[id];
        st.textContent = d ? "Completed" + (qs ? ` · quiz ${qs.right}/${qs.total}` : "") : "Not started";
      }
    });
    $$("[data-complete]").forEach((b) => {
      const id = b.dataset.complete, d = !!state.done[id];
      b.textContent = d ? "Completed ✓ (mark as not done)" : "Mark module as complete";
      const st = b.closest(".mod-end") && $(".status", b.closest(".mod-end"));
      if (st) { st.textContent = d ? "You completed this module." : "Finished reading? Mark it complete to track your progress."; st.classList.toggle("done", d); }
    });
    const homeCount = $("#home-progress");
    if (homeCount) homeCount.textContent = n === 0 ? "Start with Module 1, or jump to any topic." : n === MODS.length ? "All modules complete. Take the final assessment." : `${n} of ${MODS.length} modules complete. Pick up where you left off.`;
    const resume = $("#resume-btn");
    if (resume) {
      const next = MODS.find((m) => !state.done[m.id]);
      resume.href = "#" + (next ? next.id : "exam");
      resume.textContent = n === 0 ? "Start Module 1" : next ? `Continue: Module ${next.num}` : "Take the final assessment";
    }
  }

  function route() {
    let r = (location.hash || "#home").slice(1);
    let anchor = null;
    if (!ROUTES.includes(r)) {
      // An in-page anchor (e.g. #m3-mcp): show the page that contains it, then scroll to it.
      const el = r && document.getElementById(r);
      const page = el && el.closest(".page");
      if (page) { anchor = el; r = page.id.replace(/^page-/, ""); } else r = "home";
    }
    $$(".page").forEach((p) => { p.hidden = p.id !== "page-" + r; });
    $$(".nav-link").forEach((a) => {
      if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    closeMenu();
    const main = $("#main");
    if (main) main.focus({ preventScroll: true });
    if (anchor) anchor.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }

  /* ---------- Mobile menu ---------- */
  function openMenu() { $("#sidebar").classList.add("open"); $("#scrim").hidden = false; $("#menu-btn").setAttribute("aria-expanded", "true"); }
  function closeMenu() { $("#sidebar").classList.remove("open"); $("#scrim").hidden = true; $("#menu-btn").setAttribute("aria-expanded", "false"); }

  /* ---------- Module header & footer ---------- */
  function decorateModules() {
    MODS.forEach((m, i) => {
      const page = $("#page-" + m.id);
      if (!page) return;
      const head = $(".mod-head", page);
      if (head) {
        const part = COURSE.parts.find((p) => p.id === m.part);
        head.insertAdjacentHTML("afterbegin",
          `<div class="eyebrow"><b>Module ${m.num} of ${MODS.length}</b><span>Part ${part.id} · ${esc(part.title)}</span><span>≈ ${m.min} min</span><span>Report ${esc(m.ref)}</span></div>`);
      }
      const prev = MODS[i - 1], next = MODS[i + 1];
      page.insertAdjacentHTML("beforeend",
        `<div class="mod-end">
           <div class="stack"><button class="btn primary" type="button" data-complete="${m.id}">Mark module as complete</button><span class="status"></span></div>
           <div class="btn-row">
             ${prev ? `<a class="btn" href="#${prev.id}">← Module ${prev.num}</a>` : `<a class="btn" href="#home">← Course home</a>`}
             ${next ? `<a class="btn" href="#${next.id}">Module ${next.num} →</a>` : `<a class="btn" href="#exam">Final assessment →</a>`}
           </div>
         </div>`);
    });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-complete]");
      if (!b) return;
      const id = b.dataset.complete;
      if (state.done[id]) delete state.done[id]; else state.done[id] = true;
      save(); refreshProgress();
    });
  }

  function buildHomeCards() {
    $$("[data-part-cards]").forEach((wrap) => {
      const part = wrap.dataset.partCards;
      wrap.innerHTML = MODS.filter((m) => m.part === part).map((m) =>
        `<a class="mod-card" data-modcard="${m.id}" href="#${m.id}">
           <span class="mc-top"><span>Module ${m.num}</span><span>≈ ${m.min} min · ${esc(m.ref)}</span></span>
           <h4>${esc(m.title)}</h4><p>${esc(m.blurb)}</p><span class="mc-status">Not started</span>
         </a>`).join("");
    });
  }

  /* ---------- Quizzes ---------- */
  function renderQuiz(el) {
    const id = el.dataset.quiz;
    const bank = QUIZZES[id];
    if (!bank) return;
    const isExam = id === "exam";
    const title = el.dataset.title || "Check your understanding";
    let html = `<div class="quiz-head"><h2>${esc(title)}</h2><span class="quiz-score" aria-live="polite"></span></div>`;
    if (!isExam) html += `<p class="muted small">Pick an answer and check it. Each answer comes with a short explanation and a pointer to the report.</p>`;
    bank.forEach((q, qi) => {
      const name = `${id}-q${qi}`;
      html += `<fieldset class="q" data-qi="${qi}" style="border:1px solid var(--line)"><legend class="sr">Question ${qi + 1}</legend>
        <div class="q-text"><span class="q-n">Question ${qi + 1} of ${bank.length}</span>${esc(q.q)}</div>
        <div class="q-opts">${q.o.map((o, oi) =>
          `<label class="q-opt"><input type="radio" name="${name}" id="${name}-o${oi}" value="${oi}"><span>${esc(o)}</span></label>`).join("")}</div>
        ${isExam ? "" : `<div class="q-actions"><button class="btn small" type="button" data-check>Check answer</button></div>`}
        <div class="q-feedback" hidden></div></fieldset>`;
    });
    if (isExam) html += `<div class="btn-row"><button class="btn primary" type="button" data-submit-exam>Submit my answers</button><button class="btn" type="button" data-reset-exam>Start again</button></div><div class="exam-out"></div>`;
    el.innerHTML = html;

    const answered = {};
    const scoreEl = $(".quiz-score", el);
    function grade(fs) {
      const qi = +fs.dataset.qi, q = bank[qi];
      const sel = $("input:checked", fs);
      const fb = $(".q-feedback", fs);
      if (!sel) { fb.hidden = false; fb.className = "q-feedback ko"; fb.innerHTML = "<b>Choose an answer first.</b>"; return null; }
      const ok = +sel.value === q.a;
      $$(".q-opt", fs).forEach((l, oi) => { l.classList.toggle("right", oi === q.a); l.classList.toggle("wrong", oi === +sel.value && !ok); });
      fb.hidden = false; fb.className = "q-feedback " + (ok ? "ok" : "ko");
      fb.innerHTML = `<b>${ok ? "Correct." : "Not quite. The right answer is highlighted."}</b>${esc(q.e)}`;
      answered[qi] = ok;
      return ok;
    }
    function updateScore() {
      const n = Object.keys(answered).length, right = Object.values(answered).filter(Boolean).length;
      scoreEl.textContent = n ? `${right} / ${n} correct · ${bank.length} questions` : `${bank.length} questions`;
      if (!isExam && n === bank.length) { state.quiz[id] = { right, total: bank.length }; save(); refreshProgress(); }
    }
    updateScore();
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-check]")) { grade(e.target.closest(".q")); updateScore(); }
      if (e.target.closest("[data-submit-exam]")) {
        let right = 0, missing = 0;
        $$(".q", el).forEach((fs) => { const r = grade(fs); if (r === null) missing++; else if (r) right++; });
        const pct = Math.round(100 * right / bank.length);
        const pass = pct >= 70;
        const out = $(".exam-out", el);
        out.innerHTML = `<div class="exam-result ${pass ? "pass" : "fail"}" role="status">
          <div class="big">${right} / ${bank.length}</div>
          <p><b>${pct}%</b> ${missing ? `· ${missing} unanswered` : ""}</p>
          <p>${pass ? "Well done. You passed the 70% threshold. Review any highlighted explanations above to close the remaining gaps."
                    : "You have not reached the 70% threshold yet. Read the explanations above, revisit the modules they point to, and try again."}</p></div>`;
        state.quiz.exam = { right, total: bank.length }; save();
        updateScore();
        out.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (e.target.closest("[data-reset-exam]")) { renderQuiz(el); }
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs(root) {
    const list = $(".tab-list", root);
    const btns = $$("button", list);
    const panels = $$(".tab-panel", root);
    function show(i) {
      btns.forEach((b, j) => { b.setAttribute("aria-selected", i === j ? "true" : "false"); b.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = i !== j; });
    }
    btns.forEach((b, i) => {
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => show(i));
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const k = (i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length;
          btns[k].focus(); show(k);
        }
      });
    });
    list.setAttribute("role", "tablist");
    panels.forEach((p) => p.setAttribute("role", "tabpanel"));
    show(0);
  }

  /* ---------- Segmented "pick one" explainers ---------- */
  function initPicker(root) {
    const btns = $$("[data-pick]", root);
    const out = $("[data-pick-out]", root);
    const tpl = (k) => $(`template[data-for="${k}"]`, root);
    function show(k) {
      btns.forEach((b) => b.setAttribute("aria-pressed", b.dataset.pick === k ? "true" : "false"));
      const t = tpl(k);
      out.innerHTML = t ? t.innerHTML : "";
    }
    btns.forEach((b) => b.addEventListener("click", () => show(b.dataset.pick)));
    if (btns[0]) show(btns[0].dataset.pick);
  }

  /* ---------- Exercise: oversight matrix ---------- */
  function initOversight(root) {
    const cases = {
      R: { x: 9, y: 69, name: "Actuarial reporting", text: "<b>Agentic workflow, human in and on the loop.</b> Placed at the lower-risk end, since it makes no decisions about individual customers, but high on complexity: a multi-step synthesis of data, models and narrative. Actuaries validate intermediate steps and approve the final presentation." },
      M: { x: 9, y: 39, name: "Marketing chatbot", text: "<b>Agentic workflow, human out of the loop.</b> Lower stakes as long as the system personalises rather than decides, and moderate complexity. Real-time conversation rules out case-by-case review, so automated guardrails and monitoring carry the load." },
      U: { x: 69, y: 62, name: "Underwriting support", text: "<b>Human-led with AI agent support.</b> Higher stakes: decisions affect access to life cover and are tightly regulated. The agent recommends and explains; the underwriter decides every case." }
    };
    const mx = $(".matrix", root), info = $("[data-info]", root);
    Object.entries(cases).forEach(([k, c]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "dot"; b.textContent = k; b.title = c.name;
      b.style.left = c.x + "%"; b.style.bottom = c.y + "%";
      b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", c.name);
      b.addEventListener("click", () => {
        $$(".dot", mx).forEach((d) => d.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        info.innerHTML = `<h4 style="margin-top:0">${c.name}</h4><p>${c.text}</p>`;
      });
      mx.appendChild(b);
    });
    const you = document.createElement("span");
    you.className = "dot user"; you.textContent = "★"; you.setAttribute("aria-hidden", "true");
    mx.appendChild(you);
    const rs = $("#ov-risk", root), cs = $("#ov-cx", root), out = $("[data-reco]", root);
    const labels = ["very low", "low", "moderate", "high", "very high"];
    function upd() {
      const r = +rs.value, c = +cs.value;
      $("#ov-risk-o", root).textContent = labels[r - 1];
      $("#ov-cx-o", root).textContent = labels[c - 1];
      // Positions on the same 0-100 scale as the zones drawn in the page.
      const x = [8, 30, 48, 70, 92][r - 1], y = [10, 35, 59, 75, 92][c - 1];
      you.style.left = x + "%"; you.style.bottom = y + "%";
      let mode, why;
      if (x >= 84) { mode = "Human only"; why = "At the highest stakes, the report suggests keeping the process human only."; }
      else if (x >= 55) {
        if (y >= 43) { mode = "Human-led with AI agent support"; why = "High stakes keep a human as decision-maker. For a complex task, an agent can retrieve, calculate and draft, as in the underwriting case."; }
        else { mode = "Human-led with automation support"; why = "High stakes keep a human as decision-maker. For a simpler task, conventional automation can support them."; }
      } else if (y >= 69) { mode = "Agentic workflow, human in the loop"; why = "Stakes allow an agent to lead, but a complex goal needs explicit human approval at key steps."; }
      else if (y >= 49) { mode = "Agentic workflow, human on the loop"; why = "The agent runs the workflow; humans monitor, sample outputs and can intervene."; }
      else if (y >= 21) { mode = "Agentic workflow, human out of the loop"; why = "Lower stakes and moderate complexity: automated guardrails, monitoring and periodic system-level review carry the oversight."; }
      else { mode = "Traditional automation"; why = "A simple, low-stakes task may not need an agent at all: rules-based automation can be enough."; }
      out.innerHTML = `<p><b>${mode}.</b></p><p class="small muted">${why}</p>`;
    }
    rs.addEventListener("input", upd); cs.addEventListener("input", upd); upd();
  }

  /* ---------- Exercise: sampling parameters ---------- */
  function initSampling(root) {
    const base = [["water", 3.1], ["fire", 2.5], ["storm", 2.2], ["theft", 1.6], ["flood", 1.4], ["subsidence", .6], ["hail", .5], ["vandalism", .2], ["meteorite", -1.4], ["dragon", -3.2]];
    const T = $("#smp-t", root), K = $("#smp-k", root), P = $("#smp-p", root), list = $(".tokens", root), out = $(".sample-out", root);
    function dist() {
      const t = Math.max(+T.value, .05);
      const ex = base.map(([w, l]) => [w, Math.exp(l / t)]);
      const z = ex.reduce((s, [, v]) => s + v, 0);
      const pr = ex.map(([w, v]) => [w, v / z]).sort((a, b) => b[1] - a[1]);
      const k = +K.value, p = +P.value;
      let cum = 0;
      return pr.map(([w, v], i) => {
        const inK = i < k;
        const inP = cum < p || i === 0;
        cum += v;
        return { w, v, keep: inK && inP };
      });
    }
    function draw() {
      $("#smp-t-o", root).textContent = (+T.value).toFixed(2);
      $("#smp-k-o", root).textContent = K.value;
      $("#smp-p-o", root).textContent = (+P.value).toFixed(2);
      const d = dist();
      list.innerHTML = d.map((x) =>
        `<div class="tok ${x.keep ? "" : "out"}"><span class="w">${x.w}</span><span class="bar"><span style="width:${(x.v * 100).toFixed(1)}%"></span></span><span class="p">${(x.v * 100).toFixed(1)}%</span></div>`).join("");
      const kept = d.filter((x) => x.keep).length;
      out.textContent = `${kept} candidate word${kept > 1 ? "s" : ""} can be sampled.`;
    }
    $("[data-sample]", root).addEventListener("click", () => {
      const d = dist().filter((x) => x.keep);
      const z = d.reduce((s, x) => s + x.v, 0);
      const draws = [];
      for (let n = 0; n < 5; n++) {
        let u = Math.random() * z, pick = d[0].w;
        for (const x of d) { u -= x.v; if (u <= 0) { pick = x.w; break; } }
        draws.push(`“The policyholder reported ${pick} damage.”`);
      }
      out.textContent = "Five samples: " + draws.join("  ");
    });
    [T, K, P].forEach((i) => i.addEventListener("input", draw));
    draw();
  }

  /* ---------- Exercise: COSTAR builder ---------- */
  function initCostar(root) {
    const ids = ["context", "objective", "style", "tone", "audience", "response"];
    const out = $("pre.out", root);
    function build() {
      out.textContent = ids.map((k) => `# ${k.toUpperCase()}\n${$("#cs-" + k, root).value.trim()}`).join("\n\n");
    }
    ids.forEach((k) => $("#cs-" + k, root).addEventListener("input", build));
    $("[data-copy]", root).addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const done = () => { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = "Copy prompt"), 1600); };
      try {
        navigator.clipboard.writeText(out.textContent).then(done, () => selectText(out));
      } catch (err) { selectText(out); }
    });
    build();
  }
  function selectText(el) {
    const r = document.createRange(); r.selectNodeContents(el);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ---------- Exercise: MCP integration count ---------- */
  function initMcp(root) {
    const A = $("#mcp-a", root), T = $("#mcp-t", root);
    function upd() {
      const a = +A.value, t = +T.value;
      $("#mcp-a-o", root).textContent = a; $("#mcp-t-o", root).textContent = t;
      $("[data-mxn]", root).textContent = a * t;
      $("[data-mpn]", root).textContent = a + t;
      $("[data-saving]", root).textContent = a * t > 0 ? Math.round(100 * (1 - (a + t) / (a * t))) + "%" : "0%";
    }
    A.addEventListener("input", upd); T.addEventListener("input", upd); upd();
  }

  /* ---------- Exercise: single vs multi-agent wizard (Figure 6) ---------- */
  function initMas(root) {
    const steps = {
      q1: { q: "Does a single agent already achieve more than 45% of the task on its own?", yes: "r_single_sat", no: "q2" },
      q2: { q: "Is the task strictly sequential (each step depends on the previous one, e.g., planning)?", yes: "r_single", no: "q3" },
      q3: { q: "Can the task be split into parts analysed in parallel (e.g., analysis)?", yes: "r_central", no: "q4" },
      q4: { q: "Is the task exploratory (e.g., open-ended web research)?", yes: "r_decentral", no: "r_central2" },
      r_single_sat: { r: "Single agent", why: "Capacity is saturated: coordination costs in tokens would exceed the gains from adding agents." },
      r_single: { r: "Single agent", why: "For sequential work, decomposition spends the token budget on coordination instead of problem solving." },
      r_central: { r: "Centralised multi-agent", why: "Agents work on sub-problems in parallel and the orchestrator synthesises, and can catch and correct errors." },
      r_decentral: { r: "Decentralised multi-agent", why: "Peer-to-peer exploration tends to perform better for dynamic search." },
      r_central2: { r: "Centralised multi-agent", why: "The default when the task is neither sequential nor exploratory." }
    };
    const box = $("[data-mas]", root);
    const trail = [];
    function show(k) {
      const s = steps[k];
      const back = trail.length ? `<button class="btn small" type="button" data-back>← Back</button>` : "";
      if (s.r) {
        box.innerHTML = `<p class="eyebrow"><b>Recommendation</b></p><p class="kpi">${s.r}</p><p>${s.why}</p><div class="btn-row">${back}<button class="btn small" type="button" data-restart>Start again</button></div>`;
      } else {
        box.innerHTML = `<p class="eyebrow"><b>Question ${trail.length + 1}</b></p><p style="font-weight:600">${s.q}</p><div class="btn-row"><button class="btn primary small" type="button" data-ans="yes">Yes</button><button class="btn small" type="button" data-ans="no">No</button>${back}</div>`;
      }
      box.dataset.cur = k;
    }
    box.addEventListener("click", (e) => {
      const cur = box.dataset.cur;
      const a = e.target.closest("[data-ans]");
      if (a) { trail.push(cur); show(steps[cur][a.dataset.ans]); }
      if (e.target.closest("[data-back]")) show(trail.pop());
      if (e.target.closest("[data-restart]")) { trail.length = 0; show("q1"); }
    });
    show("q1");
  }

  /* ---------- Exercise: fairness metrics ---------- */
  function initFairness(root) {
    const ids = ["fa-n", "fa-acc", "fa-good", "fb-n", "fb-acc", "fb-good"];
    function v(id) { return Math.max(0, +$("#" + id, root).value || 0); }
    function pct(x) { return isFinite(x) ? (100 * x).toFixed(1) + "%" : "–"; }
    function upd() {
      const aN = v("fa-n"), aAcc = Math.min(v("fa-acc"), aN), aGood = Math.min(v("fa-good"), aAcc);
      const bN = v("fb-n"), bAcc = Math.min(v("fb-acc"), bN), bGood = Math.min(v("fb-good"), bAcc);
      const ra = aAcc / aN, rb = bAcc / bN, pa = aGood / aAcc, pb = bGood / bAcc;
      $("[data-ra]", root).textContent = pct(ra); $("[data-rb]", root).textContent = pct(rb);
      $("[data-pa]", root).textContent = pct(pa); $("[data-pb]", root).textContent = pct(pb);
      const dp = Math.abs(ra - rb), pp = Math.abs(pa - pb);
      const verdict = (g) => g < 0.05 ? '<span class="pill teal">close</span>' : g < 0.1 ? '<span class="pill amber">gap</span>' : '<span class="pill red">large gap</span>';
      $("[data-dp]", root).innerHTML = isFinite(dp) ? `${(100 * dp).toFixed(1)} pts ${verdict(dp)}` : "–";
      $("[data-pp]", root).innerHTML = isFinite(pp) ? `${(100 * pp).toFixed(1)} pts ${verdict(pp)}` : "–";
    }
    ids.forEach((id) => $("#" + id, root).addEventListener("input", upd));
    upd();
  }

  /* ---------- Exercise: RAGAS faithfulness ---------- */
  function initRagas(root) {
    const boxes = $$("input[type=checkbox]", root);
    function upd() {
      const s = boxes.filter((b) => b.checked).length;
      $("[data-faith]", root).textContent = (s / boxes.length).toFixed(2);
      $("[data-faith-n]", root).textContent = `${s} of ${boxes.length} statements supported`;
    }
    boxes.forEach((b) => b.addEventListener("change", upd)); upd();
  }

  /* ---------- Exercise: sort items into categories ---------- */
  function initSorter(root) {
    const rows = $$(".sort-row", root);
    const cats = ["Planning", "Design", "Development", "Deployment"];
    rows.forEach((row, i) => {
      const id = `sort-${i}`;
      row.insertAdjacentHTML("beforeend",
        `<label class="sr" for="${id}">Phase</label><select id="${id}"><option value="">Choose a phase…</option>${cats.map((c) => `<option>${c}</option>`).join("")}</select><span class="sort-mark" aria-hidden="true"></span>`);
    });
    $("[data-sort-check]", root).addEventListener("click", () => {
      let right = 0;
      rows.forEach((row) => {
        const v = $("select", row).value, ok = v === row.dataset.answer;
        if (ok) right++;
        row.classList.toggle("right", ok);
        row.classList.toggle("wrong", !ok);
        $(".sort-mark", row).textContent = ok ? "✓" : "→ " + row.dataset.answer;
      });
      $("[data-sort-out]", root).textContent = `${right} of ${rows.length} correct.` + (right < rows.length ? " The correct phase is shown next to each miss." : " Well done.");
    });
  }

  /* ---------- Checklist tool ---------- */
  function initChecklist(root) {
    const host = $("[data-ck]", root);
    let html = "";
    CHECKLIST.forEach((ph) => {
      html += `<section class="ck-phase" data-phase="${ph.id}"><header><h3>${ph.phase} phase</h3><span class="ck-count"></span></header><div class="ck-body">`;
      ph.groups.forEach((g) => {
        html += `<div class="ck-group"><h4><span class="mono">${g.code}</span>${esc(g.title)}</h4>`;
        g.items.forEach((it, i) => {
          const key = `${g.code}-${i}`;
          html += `<label class="ck-item"><input type="checkbox" id="ck-${key}" data-key="${key}"><span>${esc(it)}</span></label>`;
        });
        if (g.hint) html += `<p class="ck-hint">${esc(g.hint)}</p>`;
        html += "</div>";
      });
      html += "</div></section>";
    });
    host.innerHTML = html;
    const name = $("#ck-name", root);
    name.value = state.ckName || "";
    name.addEventListener("input", () => { state.ckName = name.value; save(); });
    $$("input[data-key]", host).forEach((cb) => {
      cb.checked = !!state.checklist[cb.dataset.key];
      cb.closest(".ck-item").classList.toggle("checked", cb.checked);
      cb.addEventListener("change", () => {
        if (cb.checked) state.checklist[cb.dataset.key] = true; else delete state.checklist[cb.dataset.key];
        cb.closest(".ck-item").classList.toggle("checked", cb.checked);
        save(); counts();
      });
    });
    function counts() {
      let all = 0, tot = 0;
      $$(".ck-phase", host).forEach((s) => {
        const b = $$("input[data-key]", s), c = b.filter((x) => x.checked).length;
        all += c; tot += b.length;
        $(".ck-count", s).textContent = `${c} / ${b.length}`;
      });
      $("[data-ck-total]", root).textContent = `${all} of ${tot} items addressed`;
    }
    counts();
    const confirmBox = $("[data-ck-confirm]", root);
    $("[data-ck-reset]", root).addEventListener("click", () => { confirmBox.hidden = false; });
    $("[data-ck-cancel]", root).addEventListener("click", () => { confirmBox.hidden = true; });
    $("[data-ck-yes]", root).addEventListener("click", () => {
      state.checklist = {}; save();
      $$("input[data-key]", host).forEach((cb) => { cb.checked = false; cb.closest(".ck-item").classList.remove("checked"); });
      counts(); confirmBox.hidden = true;
    });
    $("[data-ck-copy]", root).addEventListener("click", (e) => {
      const btn = e.currentTarget;
      let txt = `GenAI governance checklist${name.value ? " – " + name.value : ""}\n`;
      CHECKLIST.forEach((ph) => {
        txt += `\n${ph.phase.toUpperCase()} PHASE\n`;
        ph.groups.forEach((g) => {
          txt += `  ${g.code} ${g.title}\n`;
          g.items.forEach((it, i) => { txt += `    [${state.checklist[`${g.code}-${i}`] ? "x" : " "}] ${it}\n`; });
        });
      });
      const pre = $("[data-ck-text]", root);
      pre.textContent = txt;
      const done = () => { btn.textContent = "Copied to clipboard"; setTimeout(() => (btn.textContent = "Copy as text"), 1800); };
      try { navigator.clipboard.writeText(txt).then(done, () => { pre.hidden = false; selectText(pre); }); }
      catch (err) { pre.hidden = false; selectText(pre); }
    });
  }

  /* ---------- Glossary ---------- */
  function initGlossary(root) {
    const list = $(".gloss-list", root), input = $("#gloss-q", root);
    const sorted = GLOSSARY.slice().sort((a, b) => a[0].localeCompare(b[0]));
    const letters = Array.from(new Set(sorted.map((g) => g[0][0].toUpperCase())));
    $(".letters", root).innerHTML = letters.map((l) => `<a href="#glossary" data-letter="${l}">${l}</a>`).join("");
    function draw(q) {
      const t = q.trim().toLowerCase();
      const hits = sorted.filter((g) => !t || g[0].toLowerCase().includes(t) || g[1].toLowerCase().includes(t));
      list.innerHTML = hits.length
        ? hits.map((g) => `<div class="gloss-item" data-l="${g[0][0].toUpperCase()}"><dt>${esc(g[0])}</dt><dd>${esc(g[1])} <span class="ref">${esc(g[2])}</span></dd></div>`).join("")
        : `<p class="gloss-empty">No term matches “${esc(q)}”. Try a shorter word.</p>`;
      $(".gloss-count", root).textContent = `${hits.length} term${hits.length === 1 ? "" : "s"}`;
    }
    input.addEventListener("input", () => draw(input.value));
    $(".letters", root).addEventListener("click", (e) => {
      const a = e.target.closest("[data-letter]");
      if (!a) return;
      e.preventDefault();
      input.value = ""; draw("");
      const t = $(`.gloss-item[data-l="${a.dataset.letter}"]`, list);
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    draw("");
  }

  /* ---------- Boot ---------- */
  buildNav();
  buildHomeCards();
  decorateModules();
  $$("[data-quiz]").forEach(renderQuiz);
  $$(".tabs").forEach(initTabs);
  $$("[data-picker]").forEach(initPicker);
  const inits = { oversight: initOversight, sampling: initSampling, costar: initCostar, mcp: initMcp, mas: initMas,
                  fairness: initFairness, ragas: initRagas, checklist: initChecklist, glossary: initGlossary, sorter: initSorter };
  $$("[data-x]").forEach((el) => { const f = inits[el.dataset.x]; if (f) f(el); });

  $("#menu-btn").addEventListener("click", () => ($("#sidebar").classList.contains("open") ? closeMenu() : openMenu()));
  $("#scrim").addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("hashchange", route);
  refreshProgress();
  route();
})();
