/* wave.radio · js/stations.js · Real FM, Community stations, image uploads. */
/* ---- Real FM (Radio Browser) ---- */
const API = ['https://de1.api.radio-browser.info','https://nl1.api.radio-browser.info','https://at1.api.radio-browser.info'];
const GENRES = ['top','pop','rock','jazz','electronic','hip hop','classical','lofi','news','reggae','country'];
const FALLBACK = [['Groove Salad','groovesalad'],['DEF CON Radio','defcon'],['Lush','lush'],['Space Station','spacestation'],['Beat Blender','beatblender'],['Drone Zone','dronezone']]
  .map(([n, s]) => ({stationuuid:'soma-' + s, name:'SomaFM ' + n, url_resolved:'https://ice1.somafm.com/' + s + '-128-mp3', tags:'somafm', country:'USA', favicon:''}));
let realLoaded = false, rGenre = '', rQ = '', rOff = 0, rSeen = new Set(), rT;
async function fetchReal(){
  const p = new URLSearchParams({limit:'30', offset:String(rOff), order:'votes', reverse:'true', hidebroken:'true', is_https:'true', hls:'0'});
  if (rGenre) p.set('tag', rGenre); if (rQ) p.set('name', rQ);
  for (const h of API){ try { const r = await fetch(h + '/json/stations/search?' + p); if (r.ok) return await r.json(); } catch(e){} }
  return rGenre || rQ || rOff ? [] : FALLBACK;
}
async function loadReal(reset){
  realLoaded = true;
  if (reset){ rOff = 0; rSeen = new Set(); $('rg').innerHTML = ''; }
  const a = await fetchReal(); rOff += 30;
  const html = a.filter(s => { const k = s.name.trim().toLowerCase(); if (!k || !s.url_resolved || rSeen.has(k)) return false; rSeen.add(k); return true; })
    .map(s => `<button class="card real" data-id="${esc(s.stationuuid)}" data-u="${esc(s.url_resolved)}" data-n="${esc(s.name.trim())}" data-i="${esc(s.favicon)}" data-s="${esc([s.country, (s.tags || '').split(',')[0]].filter(Boolean).join(' · '))}">
      <div class="lg">${pic(s.favicon, 'a')}</div><div><b>${esc(s.name.trim())}</b><span>${esc([s.country, (s.tags || '').split(',')[0]].filter(Boolean).join(' · '))}</span></div></button>`).join('');
  $('rg').insertAdjacentHTML('beforeend', html);
  if (!$('rg').children.length) $('rg').innerHTML = '<div class="empty">No stations found. Try another search or genre.</div>';
  $('rm').hidden = a.length < 30;
  $('rg').querySelectorAll('.card').forEach(b => b.onclick = () => playUrl({kind:'real', id:b.dataset.id, name:b.dataset.n, sub:b.dataset.s || 'Real FM', img:b.dataset.i}, b.dataset.u));
}
$('gen').innerHTML = GENRES.map(g => `<button data-g="${g}" class="${g === 'top' ? 'on' : ''}">${g}</button>`).join('');
$('gen').querySelectorAll('button').forEach(b => b.onclick = () => { rGenre = b.dataset.g === 'top' ? '' : b.dataset.g; rQ = ''; $('rq').value = ''; $('gen').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); loadReal(true); });
$('rq').oninput = () => { clearTimeout(rT); rT = setTimeout(() => { rQ = $('rq').value.trim(); loadReal(true); }, 450); };
$('rm').onclick = () => loadReal(false);

/* ---- Community stations ---- */
let cQ = '', cOff = 0, cT, cSort = 'live', cGen = '';
async function loadComm(reset){
  if (reset){ cOff = 0; $('cg').innerHTML = ''; }
  const a = await db.stations(cQ, cOff); cOff += 24;
  $('cg').insertAdjacentHTML('beforeend', a.map(s => {
    const o = s.profiles || {};
    return `<button class="card" data-id="${esc(s.id)}"><div class="ban">${pic(s.banner_url, 'b')}</div>
      <div class="cb"><div class="lg">${pic(s.logo_url, 'a')}</div><b>${esc(s.name)}${isLive(s) ? '<em class="live">LIVE</em>' : ''}</b>
      <span class="tag" style="background:${esc(s.accent)};color:${onc(s.accent || '#c8f54b')}">wmz/${esc(s.tag)}</span>
      <p>${esc(s.description || (s.genres || []).join(', ') || 'No description yet')}</p><span>by ${esc(who(o))} · ${vt(s.votes || 0)}</span></div></button>`;
  }).join(''));
  window.CS = Object.assign(window.CS || {}, Object.fromEntries(a.map(s => [s.id, s])));
  if (!$('cg').children.length) $('cg').innerHTML = '<div class="empty">No community stations yet. Be the first: open Studio and start yours.</div>';
  if (reset){
    $('oa').innerHTML = a.filter(isLive).map(s => `<button data-id="${esc(s.id)}"><span class="lg">${pic(s.logo_url, 'a')}</span><span class="dot"></span>${esc(s.name)}</button>`).join('');
    $('oa').querySelectorAll('button').forEach(b => b.onclick = () => playComm(window.CS[b.dataset.id]));
  }
  $('cm').hidden = a.length < 24;
  $('cg').querySelectorAll('.card').forEach(b => b.onclick = () => playComm(window.CS[b.dataset.id]));
}
async function playComm(s){
  if (sb && s.mode !== 'stream'){ const r = await sb.from('stations').select('*').eq('id', s.id).maybeSingle(); if (r.data) Object.assign(s, r.data); }
  const p = {kind:'comm', id:s.id, name:s.name, sub:'wmz/' + s.tag, img:s.logo_url, votes:s.votes || 0};
  if (s.mode === 'stream' && s.stream_url) playUrl(p, s.stream_url); else listenLive(s, p);
}
$('cq').oninput = () => { clearTimeout(cT); cT = setTimeout(() => { cQ = $('cq').value.trim(); loadComm(true); }, 400); };
$('cm').onclick = () => loadComm(false);

/* ---- images: pick, shrink, upload to Supabase Storage (or keep local in demo mode) ---- */
const T = {}; let pend = null;
const imgField = (key, label, k) => `<label>${label}</label><div class="imgf ${k}"><div class="pv" id="${key}P"></div><div class="ib"><button type="button" class="btn ghost sm" data-up="${key}" data-k="${k}">Upload</button><button type="button" class="btn ghost sm" data-rm="${key}" data-k="${k}">Use logo</button></div></div>`;
const setImg = (key, url, k) => { T[key] = url || ''; $(key + 'P').innerHTML = pic(url, k); };
document.addEventListener('click', e => {
  const u = e.target.closest('[data-up]'), r = e.target.closest('[data-rm]');
  if (u){ pend = {key:u.dataset.up, k:u.dataset.k}; $('file').value = ''; $('file').click(); }
  if (r) setImg(r.dataset.rm, '', r.dataset.k);
});
$('file').onchange = async () => {
  const f = $('file').files[0]; if (!f || !pend) return;
  try {
    const bmp = await createImageBitmap(f), max = pend.k === 'b' ? 1400 : 500, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = bmp.width * sc; c.height = bmp.height * sc; c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86)); let url;
    if (sb){
      const path = `${user.id}/${Date.now()}.jpg`, r = await sb.storage.from('media').upload(path, blob, {contentType:'image/jpeg'});
      if (r.error) throw r.error; url = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
    } else url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    setImg(pend.key, url, pend.k);
  } catch(e){ toast('Couldn’t upload that image: ' + (e.message || 'try another file')); }
};
$('pImgs').innerHTML = imgField('av', 'Profile picture', 'a') + imgField('bn', 'Banner', 'b');
$('sImgs').innerHTML = imgField('lg', 'Station logo', 'a') + imgField('sb', 'Station banner', 'b');
