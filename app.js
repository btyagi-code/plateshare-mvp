/* PlateShare MVP: a single-page app with no build step. State lives in localStorage. */
(() => {
  // Franklin goes first: it's the pilot location (Worksheet 5: most receptive dining hall per Food Recovery Network).
  const LOCATIONS = ["Franklin Dining Commons", "Worcester Dining Commons", "Hampshire Dining Commons", "Berkshire Dining Commons", "Campus event (club leftovers)"];
  const PILOT = LOCATIONS[0];
  const DIET = ["Vegetarian", "Vegan", "Halal", "Gluten-free", "Dairy-free", "Contains nuts"];
  const ORGS = ["UMass Food Pantry", "Amherst Survival Center", "Craig's Place Shelter", "Food Justice Club"];
  const UNITS = ["trays", "servings", "pieces", "dozen", "gallons", "lbs"];
  const LBS = { trays: 8, servings: 0.75, pieces: 0.15, dozen: 1.5, gallons: 8.5, lbs: 1, platters: 6, cups: 0.4 }; // rough, for the demo

  // Kitchens date food with colored "day dot" stickers. These colors are for this demo.
  const DAY = [["Sun", "#3a3a3a"], ["Mon", "#2f5fae"], ["Tue", "#b58a00"], ["Wed", "#b3261e"], ["Thu", "#6b4a2b"], ["Fri", "#23704a"], ["Sat", "#d0631b"]];

  // Targets: Worksheet 3 (assumptions) and Worksheet 5 (milestones).
  const T = { claim: { good: 60, bad: 30 }, onTime: { good: 90, bad: 50 }, postSec: { good: 120, bad: 300 }, weekly: { good: 3 } };

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
    const d = o => ({ id: Math.random().toString(36).slice(2, 9), notes: "", postSeconds: 90, ...o });
    return {
      feedback: [], subscribers: [],
      donations: [
        d({ location: PILOT, items: [{ name: "Vegetable lo mein", qty: 6, unit: "trays", tags: ["Vegetarian", "Dairy-free"] }, { name: "Spring rolls", qty: 40, unit: "pieces", tags: ["Vegan"] }],
            postedAt: t - 25 * M, readyAt: t - 10 * M, expiresAt: t + 95 * M, status: "available", postSeconds: 74, notes: "Loading dock, ring the bell by the back door" }),
        d({ location: PILOT, items: [{ name: "Halal chicken and rice", qty: 4, unit: "trays", tags: ["Halal", "Gluten-free"] }],
            postedAt: t - 50 * M, readyAt: t - 30 * M, expiresAt: t + 40 * M, status: "reserved", reservedBy: ORGS[0], reservedAt: t - 20 * M, postSeconds: 102 }),
        d({ location: LOCATIONS[4], items: [{ name: "Cheese pizza", qty: 5, unit: "trays", tags: ["Vegetarian"] }, { name: "Fruit cups", qty: 25, unit: "cups", tags: ["Vegan", "Gluten-free"] }],
            postedAt: t - 40 * M, readyAt: t - 30 * M, expiresAt: t + 2.5 * H, status: "available", postSeconds: 66, notes: "Campus Center room 903, Food Justice Club meeting" }),
        d({ location: PILOT, items: [{ name: "Pasta primavera", qty: 5, unit: "trays", tags: ["Vegetarian"] }],
            postedAt: t - 26 * H, readyAt: t - 26 * H, expiresAt: t - 24 * H, status: "picked_up", reservedBy: ORGS[1], reservedAt: t - 25.5 * H, pickedUpAt: t - 24.5 * H, volunteer: "Julia", postSeconds: 88 }),
        d({ location: PILOT, items: [{ name: "Black bean soup", qty: 3, unit: "gallons", tags: ["Vegan", "Gluten-free"] }],
            postedAt: t - 50 * H, readyAt: t - 50 * H, expiresAt: t - 48 * H, status: "picked_up", reservedBy: ORGS[2], reservedAt: t - 49.5 * H, pickedUpAt: t - 48.5 * H, volunteer: "Taha", postSeconds: 131 }),
        d({ location: LOCATIONS[1], items: [{ name: "Sandwich platters", qty: 2, unit: "platters", tags: [] }],
            postedAt: t - 74 * H, readyAt: t - 74 * H, expiresAt: t - 72 * H, status: "expired", postSeconds: 205 }),
        d({ location: PILOT, items: [{ name: "Roasted vegetables", qty: 4, unit: "trays", tags: ["Vegan", "Gluten-free"] }],
            postedAt: t - 98 * H, readyAt: t - 98 * H, expiresAt: t - 96 * H, status: "picked_up", reservedBy: ORGS[3], reservedAt: t - 97 * H, pickedUpAt: t - 95.5 * H, volunteer: "Harini", postSeconds: 79 }),
      ],
    };
  }

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
  const fmtDay = ms => new Date(ms).toLocaleDateString([], { weekday: "long" });
  const pounds = d => d.items.reduce((n, i) => n + i.qty * (LBS[i.unit] ?? 1), 0);
  const lb = n => `${Math.round(n).toLocaleString()} lb`;
  function left(ms) {
    const m = Math.round((ms - now()) / M);
    if (m <= 0) return "Window closed";
    return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min left` : `${m} min left`;
  }
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
  const STATE = { available: "Up for grabs", reserved: "Claimed", picked_up: "Picked up", expired: "Expired, nobody claimed it", missed: "Claimed, but missed the pickup" };

  // ---------- the label ----------
  function label(d, actions = "") {
    const [dayName, dayColor] = DAY[new Date(d.postedAt).getDay()];
    const open = d.status === "available" || d.status === "reserved";
    const tags = [...new Set(d.items.flatMap(i => i.tags))];
    const who = d.status === "reserved" ? ` for ${esc(d.reservedBy)}` : d.status === "picked_up" ? ` by ${esc(d.volunteer || d.reservedBy)}` : "";
    return `<article class="label-card">
      <div class="tape">
        <span class="daydot" style="background:${dayColor}" title="Posted ${dayName}">${dayName}</span>
        <div class="food">${d.items.map(i => `<span>${esc(i.qty)} ${esc(i.unit)} ${esc(i.name)}</span>`).join("")}</div>
      </div>
      <span class="state ${d.status}">${STATE[d.status]}${who}</span>
      <div class="where">${esc(d.location)}</div>
      <ul class="facts">
        <li>Pick up ${open ? "today" : fmtDay(d.readyAt)}, ${fmtTime(d.readyAt)} to ${fmtTime(d.expiresAt)}${open ? `. <span class="clock ${d.expiresAt - now() < 30 * M ? "soon" : ""}" data-exp="${d.expiresAt}">${left(d.expiresAt)}</span>` : ""}</li>
        ${d.notes ? `<li>${esc(d.notes)}</li>` : ""}
        ${tags.length ? `<li class="diet">${tags.map(esc).join(", ")}</li>` : ""}
      </ul>
      ${actions}
    </article>`;
  }

  // ---------- router ----------
  const routes = { "": landing, staff, browse, volunteer, impact, feedback };
  function render() {
    tick();
    const path = location.hash.replace(/^#/, "");
    (routes[path] || landing)();
    document.querySelectorAll("#nav a").forEach(a => {
      const on = path && a.getAttribute("href") === "#" + path;
      a.classList.toggle("on", !!on);
      on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    $("#view").focus?.();
  }
  window.addEventListener("hashchange", render);
  $("#reset").onclick = e => {
    const b = e.target;
    if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Tap again to reset"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Reset demo"; }, 3000); return; }
    delete b.dataset.armed; b.textContent = "Reset demo"; S = seed(); save(); render(); toast("Demo data reset");
  };
  setInterval(() => document.querySelectorAll("[data-exp]").forEach(el => {
    el.textContent = left(+el.dataset.exp); el.classList.toggle("soon", +el.dataset.exp - now() < 30 * M);
  }), 30e3);

  // ---------- landing ----------
  function landing() {
    const live = S.donations.filter(d => d.status === "available").sort((a, b) => a.expiresAt - b.expiresAt);
    const rescued = S.donations.filter(d => d.status === "picked_up").reduce((n, d) => n + pounds(d), 0);
    $("#view").innerHTML = `
      <section class="intro">
        <div>
          <h1>Dining hall leftovers, picked up before they're thrown out.</h1>
          <p class="lede">Dining staff post what's left at the end of a shift. Student orgs, the food pantry and local shelters claim it, and a volunteer brings it over. We're piloting at Franklin Dining Commons.</p>
          <div class="btns">
            <a class="btn" href="#browse">See what's available (${live.length})</a>
            <a class="btn quiet" href="#staff">Post leftover food</a>
          </div>
          <p class="soft small" style="margin-top:14px">${lb(rescued)} of food picked up so far in this demo.</p>
        </div>
        <div class="pass" aria-label="Food available now">
          <div class="pass-head"><span>On the pass right now</span><a href="#browse" class="small">All listings</a></div>
          <div class="labels">${live.slice(0, 2).map(d => label(d)).join("") || `<div class="empty">Nothing posted right now.</div>`}</div>
        </div>
      </section>

      <section class="block">
        <div class="who">
          <a href="#staff"><h3>Dining staff</h3><p>Post leftovers with a pickup window. It takes about a minute and a half.</p></a>
          <a href="#browse"><h3>Orgs, pantries and students</h3><p>Filter by dietary needs and claim food for your group.</p></a>
          <a href="#volunteer"><h3>Volunteers</h3><p>Take a pickup run and mark it delivered so the group knows it's coming.</p></a>
        </div>
      </section>

      <section class="block">
        <h2>How a pickup works</h2>
        <ol class="flow">
          <li><b>Staff post it.</b> What's left, how much, dietary info, and when it can be picked up.</li>
          <li><b>A group claims it.</b> The pantry, a shelter or a student org reserves the listing.</li>
          <li><b>Someone picks it up.</b> A volunteer or the group collects it inside the window and marks it delivered.</li>
          <li><b>We count it.</b> Every pickup adds to the pounds rescued and tells us whether the pilot is working.</li>
        </ol>
      </section>

      <section class="block">
        <h2>How we're different</h2>
        <p class="soft">We work with Food Recovery Network, not against it. FRN runs scheduled recoveries; PlateShare catches the smaller, last-minute surplus between them.</p>
        <div class="vs-wrap"><table class="vs">
          <thead><tr><th></th><th>PlateShare</th><th>Food Recovery Network</th><th>Too Good To Go</th></tr></thead>
          <tbody>
            <tr><td>Who gets the food</td><td>Student orgs, the pantry, shelters</td><td>Partner agencies</td><td>Paying customers</td></tr>
            <tr><td>Cost to them</td><td>Free</td><td>Free</td><td>Discounted price</td></tr>
            <tr><td>Timing</td><td>Posted when it's left over</td><td>Scheduled runs</td><td>Set pickup slots</td></tr>
            <tr><td>Dietary info</td><td>On every item</td><td>Varies</td><td>Surprise bag</td></tr>
          </tbody>
        </table></div>
      </section>

      <section class="block">
        <h2>How it's funded</h2>
        <div class="money">
          <div><h3>Nonprofit</h3><p class="soft">Free for dining halls and for everyone who gets food. We measure pounds rescued, not revenue.</p></div>
          <div><h3>Donors and grants</h3><p class="soft">Individual donors, foundation grants, and campus fundraising events. Goal: $2,000 by month 9.</p></div>
          <div><h3>Growth</h3><p class="soft">Franklin first, then club events, then all four dining commons by month 12.</p></div>
        </div>
      </section>

      <section class="block helpbox">
        <h2>Help us run the pilot</h2>
        <p>We're testing this with UMass Dining, local shelters and students. Tell us what would stop you from using it, or sign up to volunteer.</p>
        <div class="btns">
          <a class="btn" href="#feedback">Take the 2-minute survey</a>
          <a class="btn quiet" href="#volunteer">Sign up to do pickups</a>
        </div>
        <form id="sub">
          <label for="sub-email" class="hidden">Email</label>
          <input id="sub-email" type="email" required placeholder="Email for pilot updates" autocomplete="email">
          <button class="btn quiet">Get updates</button>
        </form>
      </section>`;
    $("#sub").onsubmit = e => { e.preventDefault(); S.subscribers.push({ email: $("#sub-email").value, at: now() }); save(); $("#sub-email").value = ""; toast("You're on the list for pilot updates"); };
  }

  // ---------- post food ----------
  function staff() {
    const startedAt = now();
    const recent = S.donations.slice().sort((a, b) => b.postedAt - a.postedAt).slice(0, 4);
    const pad = n => String(n).padStart(2, "0");
    const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    $("#view").innerHTML = `
      <h1>Post leftover food</h1>
      <p class="soft">Most posts take under two minutes. We time it to make sure this fits into a shift. <span class="clock" id="clock">0:00</span></p>
      <form class="sheet" id="post" novalidate>
        <label for="loc">Where is it?</label>
        <select id="loc">${LOCATIONS.map(l => `<option>${l}</option>`).join("")}</select>
        <span class="label">What's left?</span>
        <div id="items"></div>
        <button type="button" class="btn quiet" id="add-item">Add another item</button>
        <div class="pair">
          <div><label for="ready">Ready at</label><input type="time" id="ready" value="${hhmm(now())}" required></div>
          <div><label for="window">Pickup window</label><select id="window">
            <option value="60">1 hour</option><option value="120" selected>2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option></select></div>
        </div>
        <label for="notes">Where to pick it up (optional)</label>
        <input id="notes" placeholder="Loading dock, ask for the shift manager">
        <p class="soft small" style="margin-top:12px">Posting confirms the food was stored following UMass Dining food-safety rules.</p>
        <div class="actionbar"><button class="btn">Post it</button></div>
      </form>
      <section class="block"><h2>Recently posted</h2><div class="labels">${recent.map(d => label(d)).join("")}</div></section>`;
    const items = $("#items");
    const addRow = () => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<div class="line">
          <input placeholder="Item, e.g. veggie lasagna" aria-label="Item" required>
          <input type="number" inputmode="numeric" min="1" value="1" aria-label="Quantity" required>
          <select aria-label="Unit">${UNITS.map(u => `<option>${u}</option>`).join("")}</select>
          <button type="button" class="remove" aria-label="Remove item">&times;</button>
        </div>
        <div class="chips">${DIET.map(t => `<button type="button" class="chip" aria-pressed="false" data-t="${t}">${t}</button>`).join("")}</div>`;
      row.querySelectorAll(".chip").forEach(c => c.onclick = () => c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"));
      row.querySelector(".remove").onclick = () => items.children.length > 1 && row.remove();
      items.appendChild(row);
      if (items.children.length > 1) row.querySelector("input").focus();
    };
    addRow();
    $("#add-item").onclick = addRow;
    const clock = setInterval(() => {
      if (!$("#clock") || !$("#post")) return clearInterval(clock);
      const s = Math.round((now() - startedAt) / 1000); $("#clock").textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
    }, 1000);
    $("#post").onsubmit = e => {
      e.preventDefault();
      const first = [...items.querySelectorAll(".line input:first-child")].find(i => !i.value.trim());
      if (first) { first.focus(); return toast("Add a name for each item, or remove the empty one"); }
      const [h, m] = $("#ready").value.split(":").map(Number);
      const ready = new Date(); ready.setHours(h, m, 0, 0);
      const d = {
        id: Math.random().toString(36).slice(2, 9), location: $("#loc").value, notes: $("#notes").value.trim(),
        items: [...items.children].map(r => ({ name: r.querySelector("input").value.trim(), qty: +r.querySelectorAll("input")[1].value || 1,
          unit: r.querySelector("select").value, tags: [...r.querySelectorAll('.chip[aria-pressed="true"]')].map(t => t.dataset.t) })),
        postedAt: now(), readyAt: ready.getTime(), expiresAt: ready.getTime() + +$("#window").value * M,
        status: "available", postSeconds: Math.round((now() - startedAt) / 1000),
      };
      S.donations.push(d); save(); clearInterval(clock);
      toast(`Posted in ${d.postSeconds} seconds. Groups can claim it now.`);
      staff();
    };
  }

  // ---------- find food ----------
  let filt = { loc: "", tags: [] };
  function browse() {
    const avail = S.donations.filter(d => d.status === "available")
      .filter(d => !filt.loc || d.location === filt.loc)
      .filter(d => filt.tags.every(t => d.items.some(i => i.tags.includes(t))))
      .sort((a, b) => a.expiresAt - b.expiresAt);
    $("#view").innerHTML = `
      <h1>Food up for grabs</h1>
      <p class="soft">Ending soonest first. Claim what your group can use and pick it up before the window closes.</p>
      <div class="filters sheet">
        <div><label for="org">Claiming for</label><select id="org">${ORGS.map(o => `<option ${o === S.lastOrg ? "selected" : ""}>${o}</option>`).join("")}</select></div>
        <div><label for="floc">Location</label><select id="floc"><option value="">Anywhere on campus</option>${LOCATIONS.map(l => `<option ${l === filt.loc ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="wide"><span class="label" style="margin-top:0">Only show food that is</span>
          <div class="chips" id="ftags">${DIET.filter(t => t !== "Contains nuts").map(t => `<button type="button" class="chip" aria-pressed="${filt.tags.includes(t)}" data-t="${t}">${t}</button>`).join("")}</div></div>
      </div>
      <div class="labels">${avail.map(d => label(d, `<button class="btn go" data-claim="${d.id}">Claim it</button>`)).join("")
        || `<div class="empty"><h3>Nothing matches right now</h3><p class="soft">Most food gets posted after lunch and after dinner. Try fewer filters, or check back after the next meal.</p></div>`}</div>`;
    $("#floc").onchange = e => { filt.loc = e.target.value; browse(); };
    $("#ftags").querySelectorAll(".chip").forEach(c => c.onclick = () => {
      const t = c.dataset.t; filt.tags = filt.tags.includes(t) ? filt.tags.filter(x => x !== t) : [...filt.tags, t]; browse();
    });
    document.querySelectorAll("[data-claim]").forEach(b => b.onclick = () => {
      const d = S.donations.find(x => x.id === b.dataset.claim);
      d.status = "reserved"; d.reservedBy = $("#org").value; d.reservedAt = now(); S.lastOrg = d.reservedBy; save();
      toast(`Claimed for ${d.reservedBy}. Pick it up by ${fmtTime(d.expiresAt)}.`); browse();
    });
  }

  // ---------- pickups ----------
  function volunteer() {
    const runs = S.donations.filter(d => d.status === "reserved").sort((a, b) => a.expiresAt - b.expiresAt);
    const done = S.donations.filter(d => d.status === "picked_up").sort((a, b) => b.pickedUpAt - a.pickedUpAt).slice(0, 3);
    $("#view").innerHTML = `
      <h1>Pickups waiting</h1>
      <div class="sheet" style="margin-bottom:18px;max-width:420px">
        <label for="vname">Your name</label>
        <input id="vname" value="${esc(S.lastVolunteer || "")}" placeholder="So the group knows who's coming" autocomplete="given-name">
      </div>
      <div class="labels">${runs.map(d => label(d, `<p class="small" style="margin:0 0 10px">Bring to <b>${esc(d.reservedBy)}</b></p>
        <button class="btn" data-done="${d.id}">Mark as delivered</button>`)).join("")
        || `<div class="empty"><h3>No pickups waiting</h3><p class="soft">When a group claims food, it shows up here.</p></div>`}</div>
      <section class="block"><h2>Recently delivered</h2><div class="labels">${done.map(d => label(d)).join("") || `<p class="soft">None yet.</p>`}</div></section>`;
    document.querySelectorAll("[data-done]").forEach(b => b.onclick = () => {
      const name = $("#vname").value.trim();
      if (!name) { $("#vname").focus(); return toast("Add your name first"); }
      const d = S.donations.find(x => x.id === b.dataset.done);
      d.status = "picked_up"; d.pickedUpAt = now(); d.volunteer = name; S.lastVolunteer = name; save();
      toast(`Marked as delivered. ${d.reservedBy} can see it's on the way.`); volunteer();
    });
  }

  // ---------- impact ----------
  function impact() {
    const all = S.donations;
    const closed = all.filter(d => d.status !== "available");
    const claimed = all.filter(d => ["reserved", "picked_up", "missed"].includes(d.status));
    const settled = all.filter(d => ["picked_up", "missed"].includes(d.status));
    const onTime = settled.filter(d => d.status === "picked_up" && d.pickedUpAt <= d.expiresAt);
    const claimRate = closed.length ? Math.round(100 * claimed.length / closed.length) : 0;
    const onTimeRate = settled.length ? Math.round(100 * onTime.length / settled.length) : 0;
    const avgPost = all.length ? Math.round(all.reduce((n, d) => n + d.postSeconds, 0) / all.length) : 0;
    const week = all.filter(d => d.postedAt > now() - 7 * 24 * H);
    const perLoc = LOCATIONS.map(l => ({ l, n: week.filter(d => d.location === l).length }));
    const pilotWeek = perLoc[0].n;
    const rescued = all.filter(d => d.status === "picked_up").reduce((n, d) => n + pounds(d), 0);
    const wasted = all.filter(d => ["expired", "missed"].includes(d.status)).reduce((n, d) => n + pounds(d), 0);
    const pickups = all.filter(d => d.status === "picked_up").length;
    const orgs = new Set(all.filter(d => d.reservedBy).map(d => d.reservedBy));
    const repeat = [...orgs].filter(o => all.filter(d => d.reservedBy === o).length >= 2).length;

    const grade = (v, good, bad, low = false) => low ? (v <= good ? "ok" : v > bad ? "bad" : "mid") : (v >= good ? "ok" : v < bad ? "bad" : "mid");
    const words = { ok: "On track", mid: "Not sure yet", bad: "Not working" };
    const test = (claim, value, g, why, pct, target) => `
      <li><div><div class="claim">${claim}</div><span class="verdict ${g}">${words[g]}</span></div><div class="val">${value}</div>
        ${pct != null ? `<div class="meter" aria-hidden="true"><i style="width:${Math.min(100, pct)}%"></i><b style="left:${target}%"></b></div>` : ""}
        <div class="why">${why}</div></li>`;

    $("#view").innerHTML = `
      <h1>Is the pilot working?</h1>
      <p class="soft">Each line checks one thing we assumed in our MVP plan, against the target we set. The numbers come from activity in this demo.</p>
      <div class="headline-stat">${lb(rescued)}</div>
      <p>of food picked up instead of thrown out. The month 12 goal is 5,000 lb.</p>
      <div class="facts-row">
        <div><b>${pickups}</b>pickups (month 1 goal: 5)</div>
        <div><b>${orgs.size}</b>groups claiming, ${repeat} more than once</div>
        <div><b>${lb(wasted)}</b>still wasted</div>
      </div>
      <ul class="tests">
        ${test("Groups will claim the food", claimRate + "%", grade(claimRate, T.claim.good, T.claim.bad),
          `Share of closed listings that someone claimed. Target 60% with two repeat groups; under 30% means the assumption is wrong.`, claimRate, 60)}
        ${test("Pickups will happen on time", onTimeRate + "%", grade(onTimeRate, T.onTime.good, T.onTime.bad),
          `Claimed food collected inside its window. Month 4 target is 90%; under 50% means it isn't reliable.`, onTimeRate, 90)}
        ${test("Posting fits into a shift", `${Math.floor(avgPost / 60)}:${String(avgPost % 60).padStart(2, "0")}`, grade(avgPost, T.postSec.good, T.postSec.bad, true),
          `Average time staff spend on a post. Target under 2 minutes; over 5 minutes means it's too much work.`, null)}
        ${test("Franklin posts regularly", `${pilotWeek} this week`, pilotWeek >= T.weekly.good ? "ok" : pilotWeek >= 1 ? "mid" : "bad",
          `Posts from the pilot dining hall in the last 7 days. Target is at least 3.`, 100 * pilotWeek / 6, 50)}
      </ul>
      <section class="block sheet">
        <h2>Posts by location, last 7 days</h2>
        <div class="locbars">${perLoc.map(p => `<div><span>${p.l}</span><span class="bar"><i style="width:${100 * p.n / Math.max(3, ...perLoc.map(x => x.n))}%"></i></span><b>${p.n}</b></div>`).join("")}</div>
      </section>
      <section class="block sheet">
        <h2>Survey</h2>
        <p>${S.feedback.length} responses and ${S.subscribers.length} update sign-ups.${S.feedback.length ? ` Average likelihood to use PlateShare: <b>${(S.feedback.reduce((n, f) => n + +f.likely, 0) / S.feedback.length).toFixed(1)} out of 5</b>.` : ""}</p>
        <div class="btns"><button class="btn quiet" id="csv-d">Copy listings as CSV</button><button class="btn quiet" id="csv-f">Copy survey as CSV</button></div>
        <p class="soft small" style="margin-top:8px">Paste into Google Sheets or Excel.</p>
      </section>`;
    $("#csv-d").onclick = () => copyCSV("Listings", toCSV(all.map(d => ({
      id: d.id, location: d.location, items: d.items.map(i => `${i.qty} ${i.unit} ${i.name}`).join("; "), status: d.status,
      posted: new Date(d.postedAt).toISOString(), window_end: new Date(d.expiresAt).toISOString(), post_seconds: d.postSeconds,
      claimed_by: d.reservedBy || "", picked_up: d.pickedUpAt ? new Date(d.pickedUpAt).toISOString() : "", volunteer: d.volunteer || "", est_lb: Math.round(pounds(d)) }))));
    $("#csv-f").onclick = () => copyCSV("Survey", toCSV(S.feedback.map(f => ({ ...f, at: new Date(f.at).toISOString() }))));
  }
  function toCSV(rows) {
    if (!rows.length) return "no data\n";
    const cols = Object.keys(rows[0]);
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n");
  }
  async function copyCSV(what, text) {
    try { await navigator.clipboard.writeText(text); toast(`${what} copied. Paste into a spreadsheet.`); }
    catch { toast("This browser blocked the clipboard"); }
  }

  // ---------- survey ----------
  function feedback() {
    $("#view").innerHTML = `
      <h1>Tell us what you think</h1>
      <p class="soft">Five questions, about two minutes. Only our team sees the answers.</p>
      <form class="sheet" id="fb" style="max-width:620px">
        <label for="role">Which describes you?</label>
        <select id="role" required><option value="">Choose one</option><option>UMass Dining staff</option><option>Student</option><option>Student org leader</option>
          <option>Food pantry or shelter staff</option><option>Possible volunteer</option><option>Other</option></select>
        <span class="label">How likely are you to use PlateShare?</span>
        <div class="scale" role="radiogroup">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="likely" value="${n}">${n}</label>`).join("")}</div>
        <div class="scale-ends"><span>Not likely</span><span>Definitely</span></div>
        <label for="blocker">What would stop you?</label>
        <select id="blocker"><option>Nothing, I'd use it</option><option>Pickup times don't fit my schedule</option><option>I'm not sure the food is safe</option>
          <option>It's too far to go</option><option>Posting takes too long during a shift</option><option>I'd feel awkward taking free food</option><option>Something else</option></select>
        <label for="comments">What should we change or add? (optional)</label>
        <textarea id="comments"></textarea>
        <label for="fbemail">Email, if you'd do a 10-minute interview (optional)</label>
        <input id="fbemail" type="email" placeholder="you@umass.edu" autocomplete="email">
        <div class="actionbar"><button class="btn">Send feedback</button></div>
      </form>`;
    $("#fb").onsubmit = e => {
      e.preventDefault();
      if (!$("#role").value) { $("#role").focus(); return toast("Choose which describes you"); }
      if (!$("#fb").likely.value) { $("#fb").querySelector(".scale input").focus(); return toast("Pick a number from 1 to 5"); }
      S.feedback.push({ role: $("#role").value, likely: $("#fb").likely.value, blocker: $("#blocker").value,
        comments: $("#comments").value.trim(), email: $("#fbemail").value.trim(), at: now() });
      save();
      $("#view").innerHTML = `<div class="sheet" style="max-width:620px"><h1>Feedback sent</h1>
        <p>Thanks. Want to see how the pilot is going?</p><a class="btn" href="#impact">See the pilot numbers</a></div>`;
    };
  }

  render();
})();
