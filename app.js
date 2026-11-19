/* PlateShare MVP: a single-page app with no build step. State lives in localStorage. */
(() => {
  const LOCATIONS = ["Worcester Dining Commons", "Franklin Dining Commons", "Hampshire Dining Commons", "Berkshire Dining Commons"];
  const DIET = ["Vegetarian", "Vegan", "Halal", "Gluten-free", "Dairy-free", "Contains nuts"];
  const ORGS = ["UMass Food Pantry", "Amherst Survival Center", "Craig's Place Shelter", "Student Org: Food Justice Club"];

  // Validation thresholds from Worksheet 3 ("evidence supporting / challenging it").
  const T = {
    claim:   { good: 60, bad: 30 },   // % of postings claimed before expiration
    onTime:  { good: 80, bad: 50 },   // % of reservations picked up within window
    postSec: { good: 120, bad: 300 }, // staff posting time, seconds
    weekly:  { good: 3 },             // donations per pilot location per week
  };

  // ---------- state ----------
  const KEY = "plateshare:v1";
  const now = () => Date.now();
  const H = 3600e3, M = 60e3;
  let S = load();

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.donations) return s; } catch {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

  function seed() {
    const t = now();
    const d = (o) => ({ id: Math.random().toString(36).slice(2, 9), notes: "", postSeconds: 90, ...o });
    return {
      feedback: [], subscribers: [],
      donations: [
        d({ location: LOCATIONS[0], items: [{ name: "Vegetable lo mein", qty: 6, unit: "trays", tags: ["Vegetarian", "Dairy-free"] }, { name: "Spring rolls", qty: 40, unit: "pieces", tags: ["Vegan"] }],
            postedAt: t - 25 * M, readyAt: t - 10 * M, expiresAt: t + 95 * M, status: "available", postSeconds: 74 }),
        d({ location: LOCATIONS[1], items: [{ name: "Halal chicken & rice", qty: 4, unit: "trays", tags: ["Halal", "Gluten-free"] }],
            postedAt: t - 50 * M, readyAt: t - 30 * M, expiresAt: t + 40 * M, status: "reserved", reservedBy: ORGS[0], reservedAt: t - 20 * M, postSeconds: 102 }),
        d({ location: LOCATIONS[2], items: [{ name: "Bagels", qty: 3, unit: "dozen", tags: ["Vegetarian"] }, { name: "Fruit cups", qty: 25, unit: "cups", tags: ["Vegan", "Gluten-free"] }],
            postedAt: t - 3 * H, readyAt: t - 3 * H, expiresAt: t + 3 * H, status: "available", postSeconds: 61 }),
        // history, so the dashboard has something to show
        d({ location: LOCATIONS[0], items: [{ name: "Pasta primavera", qty: 5, unit: "trays", tags: ["Vegetarian"] }],
            postedAt: t - 26 * H, readyAt: t - 26 * H, expiresAt: t - 24 * H, status: "picked_up", reservedBy: ORGS[1], reservedAt: t - 25.5 * H, pickedUpAt: t - 24.5 * H, volunteer: "Julia", postSeconds: 88 }),
        d({ location: LOCATIONS[0], items: [{ name: "Black bean soup", qty: 3, unit: "gallons", tags: ["Vegan", "Gluten-free"] }],
            postedAt: t - 50 * H, readyAt: t - 50 * H, expiresAt: t - 48 * H, status: "picked_up", reservedBy: ORGS[2], reservedAt: t - 49.5 * H, pickedUpAt: t - 48.5 * H, volunteer: "Taha", postSeconds: 131 }),
        d({ location: LOCATIONS[3], items: [{ name: "Sandwich platters", qty: 2, unit: "platters", tags: [] }],
            postedAt: t - 74 * H, readyAt: t - 74 * H, expiresAt: t - 72 * H, status: "expired", postSeconds: 205 }),
        d({ location: LOCATIONS[1], items: [{ name: "Roasted vegetables", qty: 4, unit: "trays", tags: ["Vegan", "Gluten-free"] }],
            postedAt: t - 98 * H, readyAt: t - 98 * H, expiresAt: t - 96 * H, status: "picked_up", reservedBy: ORGS[3], reservedAt: t - 97 * H, pickedUpAt: t - 95.5 * H, volunteer: "Harini", postSeconds: 79 }),
      ],
    };
  }

  // Auto-expire anything whose window has closed.
  function tick() {
    let changed = false;
    for (const d of S.donations) {
      if ((d.status === "available" || d.status === "reserved") && now() > d.expiresAt) {
        d.status = d.status === "reserved" ? "missed" : "expired"; changed = true;
      }
    }
    if (changed) save();
  }

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = ms => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtDay = ms => new Date(ms).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  function left(ms) {
    const m = Math.round((ms - now()) / M);
    if (m <= 0) return "closed";
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m} min left`;
  }
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2400); }
  const statusLabel = { available: "Available", reserved: "Reserved", picked_up: "Picked up", expired: "Expired unclaimed", missed: "Pickup missed" };
  const statusClass = s => "s-" + (s === "missed" ? "expired" : s);

  function itemList(d) {
    return `<ul>${d.items.map(i => `<li><b>${esc(i.qty)} ${esc(i.unit)}</b> ${esc(i.name)}
      ${i.tags.length ? `<span class="tags">${i.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span>` : ""}</li>`).join("")}</ul>`;
  }

  // ---------- router ----------
  const routes = { "/": landing, "/staff": staff, "/browse": browse, "/volunteer": volunteer, "/impact": impact, "/feedback": feedback };
  function render() {
    tick();
    const path = location.hash.replace(/^#/, "") || "/";
    (routes[path] || landing)();
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + path));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);
  $("#reset").onclick = () => { if (confirm("Reset all demo data?")) { S = seed(); save(); render(); toast("Demo data reset"); } };
  setInterval(() => { if (["/browse", "/volunteer"].includes(location.hash.slice(1))) refreshCountdowns(); }, 30e3);
  function refreshCountdowns() { document.querySelectorAll("[data-exp]").forEach(el => { el.textContent = left(+el.dataset.exp); el.classList.toggle("soon", +el.dataset.exp - now() < 30 * M); }); }

  // ---------- LANDING ----------
  function landing() {
    const live = S.donations.filter(d => d.status === "available").length;
    const fed = S.donations.filter(d => d.status === "picked_up").reduce((n, d) => n + servings(d), 0);
    $("#view").innerHTML = `
      <section class="hero">
        <div>
          <h1>Campus surplus food, <em>on someone's plate</em> instead of in the trash.</h1>
          <p class="lede">PlateShare connects UMass dining halls with the student orgs, pantries and shelters who need food, plus the volunteers who move it. Post in under two minutes, claim in one tap.</p>
          <div class="row">
            <a class="btn" href="#/browse">See available food (${live})</a>
            <a class="btn ghost" href="#/staff">I'm dining staff</a>
          </div>
        </div>
        <div class="hero-card">
          <p class="meta">Live right now</p>
          ${S.donations.filter(d => d.status === "available").slice(0, 2).map(d => `
            <div style="margin-bottom:12px"><b>${esc(d.location)}</b><div class="meta">${d.items.map(i => esc(i.name)).join(" · ")}</div>
            <span class="countdown" data-exp="${d.expiresAt}">${left(d.expiresAt)}</span></div>`).join("") || `<p class="hint">No live postings. Try posting one!</p>`}
          <hr style="border:0;border-top:1px solid var(--line)">
          <p class="meta">Rescued so far (demo): <b>~${fed} servings</b></p>
        </div>
      </section>

      <div class="roles">
        <a class="role" href="#/staff"><div class="ico">👩‍🍳</div><h3>Dining staff</h3><p>Post leftover food with a pickup window. It takes about as long as writing a sticky note.</p></a>
        <a class="role" href="#/browse"><div class="ico">🥡</div><h3>Orgs, pantries & students</h3><p>See what's available, filter by dietary needs, and reserve it.</p></a>
        <a class="role" href="#/volunteer"><div class="ico">🚲</div><h3>Volunteers</h3><p>Grab a pickup run and confirm it's delivered so everyone knows food is on its way.</p></a>
      </div>

      <section class="section">
        <h2>How it works</h2>
        <div class="steps">
          <div><b>Post</b><p class="hint">Staff list items, quantity, dietary tags and a pickup window.</p></div>
          <div><b>Reserve</b><p class="hint">Orgs and shelters get the listing and claim what they can use.</p></div>
          <div><b>Pick up</b><p class="hint">A volunteer (or the org) collects within the window and confirms.</p></div>
          <div><b>Measure</b><p class="hint">Every post feeds the impact dashboard: claim rate, on-time pickups, waste avoided.</p></div>
        </div>
      </section>

      <section class="section">
        <h2>Why PlateShare</h2>
        <table class="compare">
          <tr><th></th><th>PlateShare</th><th>Food Recovery Network</th><th>Too Good To Go</th></tr>
          <tr><td>Who gets the food</td><td>Student orgs, pantries, shelters, students in need</td><td>Partner agencies</td><td>Paying customers</td></tr>
          <tr><td>Cost to recipient</td><td>Free</td><td>Free</td><td>Discounted purchase</td></tr>
          <tr><td>How surplus is coordinated</td><td>Real-time posts with pickup windows</td><td>Scheduled volunteer recoveries</td><td>Pre-set "surprise bags"</td></tr>
          <tr><td>Dietary info per item</td><td>Yes: vegan, halal, gluten-free and more</td><td>Varies</td><td>Limited (surprise bag)</td></tr>
          <tr><td>Built for one campus first</td><td>Yes: UMass dining workflow</td><td>National chapter model</td><td>Business marketplace</td></tr>
        </table>
        <p class="hint">PlateShare can work alongside a Food Recovery Network chapter. It covers the small, unplanned surplus that scheduled recoveries miss.</p>
      </section>

      <section class="section">
        <h2>Business model</h2>
        <div class="model">
          <div><h3>Nonprofit</h3><p class="hint">Free for dining halls and recipients. We measure success in meals rescued, not revenue.</p></div>
          <div><h3>Funding</h3><p class="hint">Campus sustainability grants, student government funds, and local sponsors. Website ad space is a fallback.</p></div>
          <div><h3>Growth path</h3><p class="hint">Start with one UMass dining commons, then all four, then Five College campuses, local restaurants and small businesses.</p></div>
        </div>
      </section>

      <section class="section panel">
        <h2>Help us test this</h2>
        <p>We're validating PlateShare with UMass dining staff, food pantries and students. Two minutes of your feedback helps the most.</p>
        <div class="row">
          <a class="btn maroon" href="#/feedback">Take the 2-minute survey</a>
          <form id="sub" class="row" style="flex:1;min-width:260px">
            <input id="sub-email" type="email" required placeholder="Email for launch updates" style="flex:1">
            <button class="btn ghost">Subscribe</button>
          </form>
        </div>
      </section>`;
    $("#sub").onsubmit = e => { e.preventDefault(); S.subscribers.push({ email: $("#sub-email").value, at: now() }); save(); $("#sub-email").value = ""; toast("Subscribed. We'll email you at launch."); };
  }

  // ---------- STAFF: post surplus ----------
  function staff() {
    const startedAt = now(); // used to measure posting time (assumption: under 2 minutes)
    const mine = S.donations.slice().sort((a, b) => b.postedAt - a.postedAt).slice(0, 6);
    const pad = n => String(n).padStart(2, "0");
    const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    $("#view").innerHTML = `
      <h1>Post surplus food</h1>
      <p class="hint">Takes about a minute. The timer helps us check that posting fits into a shift. <span class="timer-pill" id="clock">0:00</span></p>
      <div class="grid2">
        <form class="panel" id="post">
          <label>Location</label>
          <select id="loc">${LOCATIONS.map(l => `<option>${l}</option>`).join("")}</select>
          <label>Food items</label>
          <div class="items" id="items"></div>
          <button type="button" class="btn ghost small" id="add-item">+ Add another item</button>
          <div class="grid2">
            <div><label>Ready for pickup at</label><input type="time" id="ready" value="${hhmm(now())}" required></div>
            <div><label>Pickup window</label><select id="window">
              <option value="60">1 hour</option><option value="120" selected>2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option></select></div>
          </div>
          <label>Pickup instructions <span class="hint">(optional)</span></label>
          <input id="notes" placeholder="e.g. Loading dock door B, ask for the shift manager">
          <p class="hint">By posting, you confirm the food has been handled and stored under UMass Dining food-safety rules.</p>
          <button class="btn" style="width:100%;justify-content:center">Post donation</button>
        </form>
        <div>
          <h3>Recent postings</h3>
          <div class="cards" style="grid-template-columns:1fr">${mine.map(d => card(d)).join("")}</div>
        </div>
      </div>`;
    const items = $("#items");
    const addRow = () => {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `<input placeholder="Item (e.g. Veggie lasagna)" required>
        <input type="number" min="1" value="1" required>
        <select><option>trays</option><option>servings</option><option>pieces</option><option>dozen</option><option>gallons</option><option>lbs</option></select>
        <button type="button" class="btn ghost small" title="Remove">✕</button>
        <div class="tags chipbox" style="grid-column:1/-1">${DIET.map(t => `<span class="tag" data-t="${t}">${t}</span>`).join("")}</div>`;
      row.querySelectorAll(".chipbox .tag").forEach(c => c.onclick = () => c.classList.toggle("on"));
      row.querySelector("button").onclick = () => items.children.length > 1 && row.remove();
      items.appendChild(row);
      row.querySelector("input").focus();
    };
    addRow();
    $("#add-item").onclick = addRow;
    const clock = setInterval(() => {
      if (!$("#clock")) return clearInterval(clock);
      const s = Math.round((now() - startedAt) / 1000); $("#clock").textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
    }, 1000);
    $("#post").onsubmit = e => {
      e.preventDefault();
      const [h, m] = $("#ready").value.split(":").map(Number);
      const ready = new Date(); ready.setHours(h, m, 0, 0);
      const d = {
        id: Math.random().toString(36).slice(2, 9), location: $("#loc").value, notes: $("#notes").value.trim(),
        items: [...items.children].map(r => ({ name: r.querySelector("input").value.trim(), qty: +r.querySelectorAll("input")[1].value,
          unit: r.querySelector("select").value, tags: [...r.querySelectorAll(".chipbox .tag.on")].map(t => t.dataset.t) })),
        postedAt: now(), readyAt: ready.getTime(), expiresAt: ready.getTime() + +$("#window").value * M,
        status: "available", postSeconds: Math.round((now() - startedAt) / 1000),
      };
      S.donations.push(d); save(); clearInterval(clock);
      toast(`Posted in ${d.postSeconds}s. Orgs and pantries have been notified.`);
      staff();
    };
  }

  // ---------- BROWSE: orgs / students reserve ----------
  let filt = { loc: "", tags: [] };
  function browse() {
    const avail = S.donations.filter(d => d.status === "available")
      .filter(d => !filt.loc || d.location === filt.loc)
      .filter(d => filt.tags.every(t => d.items.some(i => i.tags.includes(t))))
      .sort((a, b) => a.expiresAt - b.expiresAt);
    $("#view").innerHTML = `
      <h1>Available food</h1>
      <p class="hint">Soonest-expiring first. Reserve what you can use and pick it up within the window.</p>
      <div class="filters panel">
        <div><label>Reserving as</label><select id="org">${ORGS.map(o => `<option ${o === S.lastOrg ? "selected" : ""}>${o}</option>`).join("")}</select></div>
        <div><label>Location</label><select id="floc"><option value="">All dining commons</option>${LOCATIONS.map(l => `<option ${l === filt.loc ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div style="flex:1"><label>Dietary needs</label><div class="tags chipbox" id="ftags">${DIET.filter(t => t !== "Contains nuts").map(t => `<span class="tag ${filt.tags.includes(t) ? "on" : ""}" data-t="${t}">${t}</span>`).join("")}</div></div>
      </div>
      <div class="cards">${avail.map(d => card(d, `<button class="btn small" data-reserve="${d.id}">Reserve</button>`)).join("") || `<div class="empty">Nothing matches right now. Check back after the next meal period.</div>`}</div>`;
    $("#floc").onchange = e => { filt.loc = e.target.value; browse(); };
    $("#ftags").querySelectorAll(".tag").forEach(c => c.onclick = () => { const t = c.dataset.t; filt.tags = filt.tags.includes(t) ? filt.tags.filter(x => x !== t) : [...filt.tags, t]; browse(); });
    document.querySelectorAll("[data-reserve]").forEach(b => b.onclick = () => {
      const d = S.donations.find(x => x.id === b.dataset.reserve);
      d.status = "reserved"; d.reservedBy = $("#org").value; d.reservedAt = now(); S.lastOrg = d.reservedBy; save();
      toast(`Reserved for ${d.reservedBy}. Pick up by ${fmtTime(d.expiresAt)}.`); browse();
    });
  }

  // ---------- VOLUNTEER: confirm pickups ----------
  function volunteer() {
    const runs = S.donations.filter(d => d.status === "reserved").sort((a, b) => a.expiresAt - b.expiresAt);
    const done = S.donations.filter(d => d.status === "picked_up").sort((a, b) => b.pickedUpAt - a.pickedUpAt).slice(0, 4);
    $("#view").innerHTML = `
      <h1>Pickup runs</h1>
      <div class="row" style="margin-bottom:16px"><label style="margin:0">Your name</label><input id="vname" value="${esc(S.lastVolunteer || "")}" placeholder="e.g. Taha" style="max-width:220px"></div>
      <div class="cards">${runs.map(d => card(d, `
        <div class="meta">Deliver to <b>${esc(d.reservedBy)}</b></div>
        <button class="btn small" data-done="${d.id}">✓ Picked up & delivered</button>`)).join("") || `<div class="empty">No reserved pickups waiting. Nice work, everyone!</div>`}</div>
      <h3 style="margin-top:32px">Recently completed</h3>
      <div class="cards">${done.map(d => card(d)).join("") || `<p class="hint">None yet.</p>`}</div>`;
    document.querySelectorAll("[data-done]").forEach(b => b.onclick = () => {
      const name = $("#vname").value.trim();
      if (!name) { $("#vname").focus(); return toast("Add your name so the org knows who's coming"); }
      const d = S.donations.find(x => x.id === b.dataset.done);
      d.status = "picked_up"; d.pickedUpAt = now(); d.volunteer = name; S.lastVolunteer = name; save();
      toast(`Thanks, ${name}! ${d.reservedBy} has been notified.`); volunteer();
    });
  }

  function card(d, actions = "") {
    const open = d.status === "available" || d.status === "reserved";
    return `<article class="card">
      <span class="status ${statusClass(d.status)}">${statusLabel[d.status]}${d.status === "reserved" ? ` · ${esc(d.reservedBy)}` : ""}${d.status === "picked_up" && d.volunteer ? ` · by ${esc(d.volunteer)}` : ""}</span>
      <h3>${esc(d.location)}</h3>
      ${itemList(d)}
      <div class="meta">${fmtDay(d.readyAt)}, pickup ${fmtTime(d.readyAt)}–${fmtTime(d.expiresAt)}
        ${open ? ` · <span class="countdown ${d.expiresAt - now() < 30 * M ? "soon" : ""}" data-exp="${d.expiresAt}">${left(d.expiresAt)}</span>` : ""}</div>
      ${d.notes ? `<div class="meta">📍 ${esc(d.notes)}</div>` : ""}
      ${actions}
    </article>`;
  }

  // ---------- IMPACT: validation dashboard ----------
  function servings(d) {
    const per = { trays: 12, servings: 1, pieces: 0.5, dozen: 6, gallons: 16, lbs: 3, platters: 10, cups: 1 };
    return Math.round(d.items.reduce((n, i) => n + i.qty * (per[i.unit] ?? 1), 0));
  }
  function impact() {
    const all = S.donations;
    const closed = all.filter(d => d.status !== "available");                       // claimed, or window over
    const claimed = all.filter(d => ["reserved", "picked_up", "missed"].includes(d.status));
    const settled = all.filter(d => ["picked_up", "missed"].includes(d.status));
    const onTime = settled.filter(d => d.status === "picked_up" && d.pickedUpAt <= d.expiresAt);
    const claimRate = closed.length ? Math.round(100 * claimed.length / closed.length) : 0;
    const onTimeRate = settled.length ? Math.round(100 * onTime.length / settled.length) : 0;
    const avgPost = all.length ? Math.round(all.reduce((n, d) => n + d.postSeconds, 0) / all.length) : 0;
    const week = all.filter(d => d.postedAt > now() - 7 * 24 * H);
    const perLoc = LOCATIONS.map(l => ({ l, n: week.filter(d => d.location === l).length }));
    const best = Math.max(0, ...perLoc.map(p => p.n));
    const rescued = all.filter(d => d.status === "picked_up").reduce((n, d) => n + servings(d), 0);
    const wasted = all.filter(d => ["expired", "missed"].includes(d.status)).reduce((n, d) => n + servings(d), 0);
    const orgs = new Set(all.filter(d => d.reservedBy).map(d => d.reservedBy));
    const repeat = [...orgs].filter(o => all.filter(d => d.reservedBy === o).length >= 2).length;

    const grade = (v, good, bad, lowerIsBetter = false) =>
      lowerIsBetter ? (v <= good ? "ok" : v > bad ? "bad" : "mid") : (v >= good ? "ok" : v < bad ? "bad" : "mid");
    const verdict = { ok: "✓ Supports the assumption", mid: "~ Inconclusive, keep testing", bad: "✗ Challenges the assumption" };
    const metric = (title, value, g, target, assumption, barPct) => `
      <div class="metric ${g}"><div class="meta">${title}</div><div class="big">${value}</div>
        ${barPct != null ? `<div class="bar"><i style="width:${Math.min(100, barPct)}%"></i></div>` : ""}
        <div class="verdict">${verdict[g]}</div><p class="hint" style="margin:6px 0 0">${assumption}<br>Target: ${target}</p></div>`;

    $("#view").innerHTML = `
      <h1>Impact & assumption tracker</h1>
      <p class="hint">Each card checks one MVP assumption against the targets in our MVP Design worksheet. Numbers update live from activity in this demo.</p>
      <div class="totals">
        <div><b>~${rescued}</b>servings rescued</div>
        <div><b>${all.length}</b>donations posted</div>
        <div><b>${orgs.size}</b>orgs reserving (${repeat} repeat)</div>
        <div><b>~${wasted}</b>servings still wasted</div>
      </div>
      <div class="metrics">
        ${metric("Postings claimed before expiring", claimRate + "%", grade(claimRate, T.claim.good, T.claim.bad), "≥ 60% claimed and 2 repeat orgs; under 30% challenges it",
          "Shelters and students will request available food.", claimRate)}
        ${metric("Reservations picked up on time", onTimeRate + "%", grade(onTimeRate, T.onTime.good, T.onTime.bad), "≥ 80% on time; under 50% challenges it",
          "Pickups will be reliable.", onTimeRate)}
        ${metric("Average staff posting time", `${Math.floor(avgPost / 60)}:${String(avgPost % 60).padStart(2, "0")}`, grade(avgPost, T.postSec.good, T.postSec.bad, true), "under 2 min; over 5 min challenges it",
          "Posting will fit into staff routines.", null)}
        ${metric("Most active location, last 7 days", `${best}/wk`, best >= T.weekly.good ? "ok" : best >= 1 ? "mid" : "bad", "pilot location posts ≥ 3 per week",
          "Dining locations will provide a consistent supply.", 100 * best / T.weekly.good)}
      </div>
      <section class="section panel">
        <h3>Postings per location (last 7 days)</h3>
        ${perLoc.map(p => `<div class="row" style="justify-content:space-between"><span>${p.l}</span><b>${p.n}</b></div><div class="bar"><i style="width:${100 * p.n / Math.max(3, best)}%"></i></div>`).join("")}
      </section>
      <section class="section panel">
        <h3>Survey responses: ${S.feedback.length} · Newsletter sign-ups: ${S.subscribers.length}</h3>
        ${S.feedback.length ? `<p class="hint">Average likelihood to use: <b>${(S.feedback.reduce((n, f) => n + +f.likely, 0) / S.feedback.length).toFixed(1)} / 5</b></p>` : `<p class="hint">No survey responses yet.</p>`}
        <div class="row"><button class="btn small" id="csv-d">Export donations CSV</button><button class="btn small ghost" id="csv-f">Export survey CSV</button></div>
      </section>`;
    $("#csv-d").onclick = () => download("plateshare-donations.csv", toCSV(all.map(d => ({
      id: d.id, location: d.location, items: d.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join("; "), status: d.status,
      posted: new Date(d.postedAt).toISOString(), window_end: new Date(d.expiresAt).toISOString(), post_seconds: d.postSeconds,
      reserved_by: d.reservedBy || "", picked_up: d.pickedUpAt ? new Date(d.pickedUpAt).toISOString() : "", volunteer: d.volunteer || "", est_servings: servings(d) }))));
    $("#csv-f").onclick = () => download("plateshare-survey.csv", toCSV(S.feedback.map(f => ({ ...f, at: new Date(f.at).toISOString() }))));
  }
  function toCSV(rows) {
    if (!rows.length) return "no data\n";
    const cols = Object.keys(rows[0]);
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n");
  }
  function download(name, text) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click();
  }

  // ---------- FEEDBACK survey (call to action) ----------
  function feedback() {
    $("#view").innerHTML = `
      <h1>2-minute feedback survey</h1>
      <p class="hint">Your answers decide what we build next. Nothing here is shared outside our team.</p>
      <form class="panel" id="fb" style="max-width:640px">
        <label>I am a…</label>
        <select id="role" required><option value="">Choose one</option><option>UMass dining staff</option><option>Student</option><option>Student org leader</option>
          <option>Food pantry / shelter staff</option><option>Potential volunteer</option><option>Other</option></select>
        <label>How likely would you be to use PlateShare? (1 = not at all, 5 = definitely)</label>
        <div class="scale">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="likely" value="${n}" required><span>${n}</span></label>`).join("")}</div>
        <label>What would stop you from using it?</label>
        <select id="blocker"><option>Nothing, I'd use it</option><option>Pickup times don't fit my schedule</option><option>Not sure the food is safe</option>
          <option>Too far to travel</option><option>Posting takes too long during a shift</option><option>Stigma about taking free food</option><option>Other</option></select>
        <label>Anything we should change or add?</label>
        <textarea id="comments" rows="3" placeholder="Optional"></textarea>
        <label>Email <span class="hint">(optional, if you're open to a 10-min interview)</span></label>
        <input id="fbemail" type="email" placeholder="you@umass.edu">
        <button class="btn" style="margin-top:16px">Submit feedback</button>
      </form>`;
    $("#fb").onsubmit = e => {
      e.preventDefault();
      S.feedback.push({ role: $("#role").value, likely: $("#fb").likely.value, blocker: $("#blocker").value,
        comments: $("#comments").value.trim(), email: $("#fbemail").value.trim(), at: now() });
      save();
      $("#view").innerHTML = `<div class="panel" style="max-width:640px;text-align:center"><h1>Thank you! 🍽</h1>
        <p>Your response was recorded. Want to see how the pilot is going?</p><a class="btn" href="#/impact">View the impact dashboard</a></div>`;
    };
  }

  render();
})();
