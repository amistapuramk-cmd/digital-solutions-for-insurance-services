const PLANS = [
  {id:'health', name:'Health', base:3000, desc:'Hospital stays, day-care and checkups.', rate:.012},
  {id:'motor',  name:'Motor',  base:2500, desc:'Own damage and third-party liability.', rate:.02},
  {id:'life',   name:'Term life', base:4000, desc:'Income protection for your family.', rate:.006},
  {id:'home',   name:'Home',   base:1800, desc:'Fire, theft and natural calamities.', rate:.004}
];
const TABS = ['Plans','Calculator','My policies','Claims','Dashboard'];
let tab = 'Plans', st = {policies:[], claims:[]};
const KEY = 'harborcover-v1';

try { const s = localStorage.getItem(KEY); if (s) st = JSON.parse(s); } catch(e){}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e){} };
const $ = s => document.querySelector(s);
const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const plan = id => PLANS.find(p => p.id === id);

function premium(id, age, cover, smoker){
  const p = plan(id);
  let amt = p.base + cover * p.rate;
  if (age > 60) amt *= 1.6; else if (age > 45) amt *= 1.3; else if (age > 30) amt *= 1.1;
  if (smoker && (id === 'health' || id === 'life')) amt *= 1.25;
  return amt;
}

function nav(){
  $('#nav').innerHTML = TABS.map(t => `<button aria-current="${t===tab}" data-t="${t}">${t}</button>`).join('');
  $('#nav').querySelectorAll('button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
}

function render(){
  nav();
  ({'Plans':plans,'Calculator':calc,'My policies':policies,'Claims':claims,'Dashboard':dash})[tab]();
}

function plans(){
  $('#view').innerHTML = `<h1>Insurance that you can manage online</h1>
  <p class="muted">Compare plans, get a quote, buy a policy and file claims in one place.</p>
  <div class="grid">${PLANS.map(p => `<div class="card"><h3>${p.name}</h3><p>${p.desc}</p>
  <div class="price">from ${money(p.base)}/yr</div><p><button class="btn" data-q="${p.id}">Get a quote</button></p></div>`).join('')}</div>`;
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { calc(b.dataset.q); tab='Calculator'; nav(); });
}

function calc(pre){
  const sel = typeof pre === 'string' ? pre : 'health';
  $('#view').innerHTML = `<h2>Premium calculator</h2><div class="card">
  <div class="row">
  <div><label for="c-plan">Plan</label><select id="c-plan">${PLANS.map(p=>`<option value="${p.id}" ${p.id===sel?'selected':''}>${p.name}</option>`).join('')}</select></div>
  <div><label for="c-age">Age</label><input id="c-age" type="number" min="18" max="80" value="30"></div>
  <div><label for="c-cover">Cover amount (₹)</label><input id="c-cover" type="number" min="100000" step="50000" value="500000"></div>
  </div>
  <label><input id="c-smoke" type="checkbox" style="width:auto"> Smoker</label>
  <p>Estimated yearly premium: <span class="price" id="c-out"></span></p>
  <hr style="border:0;border-top:1px solid var(--line)">
  <label for="c-name">Your name</label><input id="c-name" placeholder="Full name">
  <p><button class="btn" id="c-buy">Buy this policy</button></p>
  <div class="msg" id="c-msg" role="status"></div></div>`;
  const get = () => ({id:$('#c-plan').value, age:+$('#c-age').value, cover:+$('#c-cover').value, smoker:$('#c-smoke').checked});
  const upd = () => { const v = get(); $('#c-out').textContent = money(premium(v.id,v.age,v.cover,v.smoker)); };
  ['#c-plan','#c-age','#c-cover','#c-smoke'].forEach(s => $(s).oninput = upd); upd();
  $('#c-buy').onclick = () => {
    const v = get(), name = $('#c-name').value.trim();
    if (!name){ $('#c-msg').innerHTML = '<span class="err">Enter your name to buy a policy.</span>'; return; }
    if (!(v.age >= 18 && v.age <= 80) || !(v.cover >= 100000)){ $('#c-msg').innerHTML = '<span class="err">Age must be 18–80 and cover at least ₹1,00,000.</span>'; return; }
    const pol = {no:'HC' + Date.now().toString().slice(-7), name, plan:v.id, cover:v.cover, premium:Math.round(premium(v.id,v.age,v.cover,v.smoker)), date:new Date().toISOString().slice(0,10), status:'Active'};
    st.policies.push(pol); save();
    $('#c-msg').textContent = `Policy ${pol.no} issued for ${name}.`;
  };
}

function policies(){
  $('#view').innerHTML = `<h2>My policies</h2><div class="card scroll">` + (st.policies.length
    ? `<table><tr><th>Policy no.</th><th>Holder</th><th>Plan</th><th>Cover</th><th>Premium</th><th>Issued</th><th>Status</th></tr>${st.policies.map(p=>`<tr><td>${p.no}</td><td>${esc(p.name)}</td><td>${plan(p.plan).name}</td><td>${money(p.cover)}</td><td>${money(p.premium)}</td><td>${p.date}</td><td><span class="tag ${p.status}">${p.status}</span></td></tr>`).join('')}</table>`
    : `<p class="muted">No policies yet. Open Plans and get a quote to buy your first one.</p>`) + `</div>`;
}

function claims(){
  const active = st.policies.filter(p => p.status === 'Active');
  $('#view').innerHTML = `<h2>File a claim</h2><div class="card">` + (active.length ? `
  <label for="k-pol">Policy</label><select id="k-pol">${active.map(p=>`<option value="${p.no}">${p.no} – ${plan(p.plan).name}</option>`).join('')}</select>
  <label for="k-amt">Claim amount (₹)</label><input id="k-amt" type="number" min="1">
  <label for="k-desc">What happened?</label><textarea id="k-desc" rows="3"></textarea>
  <p><button class="btn" id="k-go">Submit claim</button></p><div class="msg" id="k-msg" role="status"></div>`
  : `<p class="muted">You need an active policy before you can file a claim.</p>`) + `</div>
  <h3 style="margin-top:1.5rem">Claim history</h3><div class="card scroll">` + (st.claims.length
  ? `<table><tr><th>Claim</th><th>Policy</th><th>Amount</th><th>Description</th><th>Status</th></tr>${st.claims.map(c=>`<tr><td>${c.id}</td><td>${c.policy}</td><td>${money(c.amount)}</td><td>${esc(c.desc)}</td><td><span class="tag ${c.status}">${c.status}</span></td></tr>`).join('')}</table>`
  : `<p class="muted">No claims filed.</p>`) + `</div>`;
  const go = $('#k-go');
  if (go) go.onclick = () => {
    const pol = st.policies.find(p => p.no === $('#k-pol').value), amount = +$('#k-amt').value, desc = $('#k-desc').value.trim();
    if (!amount || amount <= 0 || !desc){ $('#k-msg').innerHTML = '<span class="err">Enter an amount and a short description.</span>'; return; }
    // Simple rule-based auto-assessment: within cover = Approved, otherwise Rejected
    const status = amount <= pol.cover ? 'Approved' : 'Rejected';
    st.claims.push({id:'CL' + Date.now().toString().slice(-6), policy:pol.no, amount, desc, status}); save(); claims();
  };
}

function dash(){
  const prem = st.policies.reduce((a,p)=>a+p.premium,0);
  const paid = st.claims.filter(c=>c.status==='Approved').reduce((a,c)=>a+c.amount,0);
  $('#view').innerHTML = `<h2>Dashboard</h2><div class="stats">
  <div class="card"><b>${st.policies.length}</b>Policies</div>
  <div class="card"><b>${money(prem)}</b>Yearly premium</div>
  <div class="card"><b>${st.claims.length}</b>Claims filed</div>
  <div class="card"><b>${money(paid)}</b>Claims approved</div></div>
  <div class="card"><button class="btn alt" id="reset">Clear all data</button></div>`;
  $('#reset').onclick = () => { st = {policies:[], claims:[]}; save(); render(); };
}

function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
render();
