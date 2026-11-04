/* wave.radio · js/social.js · People, friends, upvotes, rooms and chat. */
/* ---- people, friends, upvotes ---- */
const COUNTRIES = 'Afghanistan,Albania,Algeria,Andorra,Angola,Antigua and Barbuda,Argentina,Armenia,Australia,Austria,Azerbaijan,Bahamas,Bahrain,Bangladesh,Barbados,Belarus,Belgium,Belize,Benin,Bhutan,Bolivia,Bosnia and Herzegovina,Botswana,Brazil,Brunei,Bulgaria,Burkina Faso,Burundi,Cabo Verde,Cambodia,Cameroon,Canada,Central African Republic,Chad,Chile,China,Colombia,Comoros,Congo,Costa Rica,Côte d’Ivoire,Croatia,Cuba,Cyprus,Czechia,Democratic Republic of the Congo,Denmark,Djibouti,Dominica,Dominican Republic,Ecuador,Egypt,El Salvador,Equatorial Guinea,Eritrea,Estonia,Eswatini,Ethiopia,Fiji,Finland,France,Gabon,Gambia,Georgia,Germany,Ghana,Greece,Grenada,Guatemala,Guinea,Guinea-Bissau,Guyana,Haiti,Honduras,Hungary,Iceland,India,Indonesia,Iran,Iraq,Ireland,Israel,Italy,Jamaica,Japan,Jordan,Kazakhstan,Kenya,Kiribati,Kosovo,Kuwait,Kyrgyzstan,Laos,Latvia,Lebanon,Lesotho,Liberia,Libya,Liechtenstein,Lithuania,Luxembourg,Madagascar,Malawi,Malaysia,Maldives,Mali,Malta,Marshall Islands,Mauritania,Mauritius,Mexico,Micronesia,Moldova,Monaco,Mongolia,Montenegro,Morocco,Mozambique,Myanmar,Namibia,Nauru,Nepal,Netherlands,New Zealand,Nicaragua,Niger,Nigeria,North Korea,North Macedonia,Norway,Oman,Pakistan,Palau,Palestine,Panama,Papua New Guinea,Paraguay,Peru,Philippines,Poland,Portugal,Qatar,Romania,Russia,Rwanda,Saint Kitts and Nevis,Saint Lucia,Saint Vincent and the Grenadines,Samoa,San Marino,São Tomé and Príncipe,Saudi Arabia,Senegal,Serbia,Seychelles,Sierra Leone,Singapore,Slovakia,Slovenia,Solomon Islands,Somalia,South Africa,South Korea,South Sudan,Spain,Sri Lanka,Sudan,Suriname,Sweden,Switzerland,Syria,Taiwan,Tajikistan,Tanzania,Thailand,Timor-Leste,Togo,Tonga,Trinidad and Tobago,Tunisia,Turkey,Turkmenistan,Tuvalu,Uganda,Ukraine,United Arab Emirates,United Kingdom,United States,Uruguay,Uzbekistan,Vanuatu,Vatican City,Venezuela,Vietnam,Yemen,Zambia,Zimbabwe,Other'.split(',');
const opts = (a, first) => `<option value="">${first}</option>` + a.map(c => `<option>${c}</option>`).join('');
const GEN2 = GENRES.filter(g => g !== 'top');
$('pCo').innerHTML = opts(COUNTRIES, 'Prefer not to say'); $('fCo').innerHTML = opts(COUNTRIES, 'Any country'); $('cGenSel').innerHTML = opts(GEN2, 'Any genre');
$('cSortSel').onchange = () => { cSort = $('cSortSel').value; loadComm(true); };
$('cGenSel').onchange = () => { cGen = $('cGenSel').value; loadComm(true); };

async function refreshVote(){
  const b = $('pVote'); if (!P || P.kind !== 'comm') return void (b.hidden = true);
  b.hidden = false; P.mine = false;
  if (sb && user){ P.mine = !!(await sb.from('station_votes').select('station_id').eq('station_id', P.id).eq('user_id', user.id).maybeSingle()).data; }
  b.textContent = (P.mine ? 'Upvoted' : 'Upvote') + ' (' + (P.votes || 0) + ')'; b.classList.toggle('on', P.mine);
}
$('pVote').onclick = async () => {
  if (!P || !need()) return; if (!sb) return toast('Upvotes need Supabase connected.');
  if (P.mine){ await sb.from('station_votes').delete().eq('station_id', P.id).eq('user_id', user.id); P.votes = Math.max(0, P.votes - 1); }
  else { const r = await sb.from('station_votes').insert({station_id:P.id}); if (r.error) return toast(r.error.message); P.votes++; }
  if (window.CS && window.CS[P.id]) window.CS[P.id].votes = P.votes; refreshVote();
};

const pf = {q:'', country:'', genre:'', sort:'votes', friends:false, live:false}; let pOff = 0, fmap = {}, pT;
$('fGen').innerHTML = ['any'].concat(GEN2).map(g => `<button data-g="${g}" class="${g === 'any' ? 'on' : ''}">${g}</button>`).join('');
$('fGen').querySelectorAll('button').forEach(b => b.onclick = () => { pf.genre = b.dataset.g === 'any' ? '' : b.dataset.g; $('fGen').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); loadPeople(true); });
$('fTog').querySelectorAll('button').forEach(b => b.onclick = () => { pf[b.dataset.k] = !pf[b.dataset.k]; b.classList.toggle('on', pf[b.dataset.k]); loadPeople(true); });
$('fCo').onchange = () => { pf.country = $('fCo').value; loadPeople(true); };
$('fSort').onchange = () => { pf.sort = $('fSort').value; loadPeople(true); };
$('fq').oninput = () => { clearTimeout(pT); pT = setTimeout(() => { pf.q = $('fq').value.trim(); loadPeople(true); }, 400); };
$('pm').onclick = () => loadPeople(false);
async function loadFriends(){
  fmap = {}; if (!sb || !user) return;
  ((await sb.from('friendships').select('*').limit(500)).data || []).forEach(f => { const o = f.requester === user.id ? f.addressee : f.requester; fmap[o] = {id:f.id, status:f.status, out:f.requester === user.id}; });
}
const fBtn = id => { const f = fmap[id];
  return !f ? `<button class="btn sm" data-fa="add" data-id="${id}">Add friend</button>`
    : f.status === 'accepted' ? `<button class="btn ghost sm" data-fa="rm" data-id="${id}">Friends</button>`
    : f.out ? `<button class="btn ghost sm" data-fa="rm" data-id="${id}">Requested</button>`
    : `<button class="btn sm" data-fa="acc" data-id="${id}">Accept</button>`; };
async function renderReq(){
  const ids = Object.keys(fmap).filter(k => fmap[k].status === 'pending' && !fmap[k].out);
  if (!ids.length) return void ($('frq').innerHTML = '');
  const a = (await sb.from('profiles').select('id,username,display_name,avatar_url').in('id', ids)).data || [];
  $('frq').innerHTML = '<h3 class="disp" style="margin:14px 0 8px">Friend requests</h3>' + a.map(p => `<div class="prow"><div class="av">${pic(p.avatar_url, 'a')}</div><div class="t"><b>${esc(who(p))}</b><small>@${esc(p.username)}</small></div><div class="acts2">${fBtn(p.id)}<button class="btn ghost sm" data-fa="rm" data-id="${p.id}">Decline</button></div></div>`).join('');
}
async function loadPeople(reset){
  const list = $('plist');
  if (!sb){ list.innerHTML = '<div class="empty">Connect Supabase to find people and add friends.</div>'; return; }
  if (reset){ pOff = 0; list.innerHTML = ''; await loadFriends(); renderReq(); }
  let r = sb.from('people').select('*').range(pOff, pOff + 19);
  if (pf.q){ const q = pf.q.replace(/[%,()]/g, ''); r = r.or(`username.ilike.%${q}%,display_name.ilike.%${q}%,station_name.ilike.%${q}%`); }
  if (pf.country) r = r.eq('country', pf.country);
  if (pf.genre) r = r.contains('genres', [pf.genre]);
  if (pf.live) r = r.eq('is_live', true);
  if (pf.friends){
    const ids = Object.keys(fmap).filter(k => fmap[k].status === 'accepted');
    if (!ids.length){ list.innerHTML = '<div class="empty">No friends yet. Add some from the full list.</div>'; $('pm').hidden = true; return; }
    r = r.in('id', ids);
  }
  if (user) r = r.neq('id', user.id);
  r = pf.sort === 'new' ? r.order('created_at', {ascending:false}) : pf.sort === 'az' ? r.order('username') : r.order('votes', {ascending:false, nullsFirst:false}).order('created_at', {ascending:false});
  const a = (await r).data || []; pOff += 20;
  list.insertAdjacentHTML('beforeend', a.map(p => `<div class="prow"><div class="av">${pic(p.avatar_url, 'a')}</div><div class="t"><b>${esc(who(p))}${p.is_live && Date.now() - new Date(p.live_at || 0) < 180000 ? '<em class="live">LIVE</em>' : ''}</b>
    <small>@${esc(p.username)}${p.country ? ' · ' + esc(p.country) : ''}</small>
    <small>${p.station_id ? 'wmz/' + esc(p.station_tag) + ' · ' + esc(p.station_name) + ' · ' + vt(p.votes || 0) + ((p.genres || []).length ? ' · ' + esc(p.genres.slice(0, 3).join(', ')) : '') : 'No station yet'}</small></div>
    <div class="acts2">${user ? fBtn(p.id) : ''}${p.station_id ? `<button class="btn ghost sm" data-ls="${p.station_id}">Listen</button>` : ''}</div></div>`).join(''));
  if (!list.children.length) list.innerHTML = '<div class="empty">No one matches those filters.</div>';
  $('pm').hidden = a.length < 20;
}
document.addEventListener('click', async e => {
  const f = e.target.closest('[data-fa]'), l = e.target.closest('[data-ls]');
  if (f){
    if (!need()) return; const id = f.dataset.id, act = f.dataset.fa;
    if (act === 'rm' && fmap[id] && fmap[id].status === 'accepted' && !confirm('Remove this friend?')) return;
    const r = act === 'add' ? await sb.from('friendships').insert({addressee:id})
      : act === 'acc' ? await sb.from('friendships').update({status:'accepted'}).eq('id', fmap[id].id)
      : await sb.from('friendships').delete().eq('id', fmap[id].id);
    if (r.error) toast(r.error.message); loadPeople(true);
  }
  if (l){ const s = (await sb.from('stations').select('*').eq('id', l.dataset.ls).maybeSingle()).data; if (s){ window.CS = window.CS || {}; window.CS[s.id] = s; playComm(s); } }
});

/* ---- rooms + chat ---- */
async function renderRooms(){
  const rs = await db.rooms();
  $('rl').innerHTML = rs.length ? rs.map(r => `<button class="row" data-id="${esc(r.id)}"><span class="hash">#</span><span class="t"><b>${esc(r.name)}</b><span>${esc(r.topic || 'Open room')} · hosted by ${esc(who(r.profiles))}</span></span></button>`).join('')
    : '<div class="empty">No rooms yet. Start one and listen together.</div>';
  $('rl').querySelectorAll('.row').forEach(b => b.onclick = () => { const r = rs.find(x => x.id === b.dataset.id); openChat('room:' + r.id, r.name, r.topic || 'Open room'); });
}
$('newRm').onclick = () => { if (need()){ $('rN').value = $('rT').value = ''; $('dRm').showModal(); } };
$('rGo').onclick = async () => {
  const n = $('rN').value.trim(); if (n.length < 2) return;
  try { const r = await db.addRoom({name:n, topic:$('rT').value.trim()}); $('dRm').close(); await renderRooms(); openChat('room:' + r.id, r.name, r.topic || 'Open room'); }
  catch(e){ $('rN').value = ''; $('rN').placeholder = e.message; }
};
let chCh = null, chName = null;
async function openChat(name, title, sub){
  chName = name; $('cF').value = ''; $('cT').textContent = title; $('cS').textContent = sub; drawChat(await db.msgs(name)); $('dChat').showModal();
  if (sb) chCh = sb.channel('chat-' + name).on('postgres_changes', {event:'INSERT', schema:'public', table:'messages', filter:'channel=eq.' + name}, async () => drawChat(await db.msgs(name, $('cF').value.trim()))).subscribe();
}
function drawChat(a){
  const me = user && user.username;
  $('cL').innerHTML = a.length ? a.map(m => `<p class="${m.profiles && m.profiles.username === me ? 'me' : ''}"><i>${esc(who(m.profiles))}</i>${esc(m.body)}</p>`).join('') : ($('cF').value ? '<div class="msg">No messages match your search.</div>' : '<div class="msg">Quiet in here. Say hello.</div>');
  $('cL').scrollTop = 1e9;
}
async function sendMsg(){
  const x = $('cI').value.trim(); if (!x || !chName) return; if (!need()) return;
  $('cI').value = ''; try { await db.send(chName, x); if (!sb) drawChat(await db.msgs(chName)); } catch(e){ $('cS').textContent = e.message; }
}
$('cSend').onclick = sendMsg; $('cI').onkeydown = e => { if (e.key === 'Enter') sendMsg(); };
let cfT; $('cF').oninput = () => { clearTimeout(cfT); cfT = setTimeout(async () => drawChat(await db.msgs(chName, $('cF').value.trim())), 300); };
$('dChat').onclose = () => { if (chCh){ sb.removeChannel(chCh); chCh = null; } };
