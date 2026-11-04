/* wave.radio · js/backend.js · Data layer: talks to Supabase (or localStorage in demo mode). */
/* ---- data layer: Supabase when connected, localStorage otherwise ---- */
const db = {
  async stations(q, off){
    if (sb){
      let r = sb.from('stations').select('*,profiles!owner(username,display_name,avatar_url)').range(off, off + 23);
      r = cSort === 'votes' ? r.order('votes', {ascending:false}).order('created_at', {ascending:false}) : cSort === 'new' ? r.order('created_at', {ascending:false}) : r.order('is_live', {ascending:false}).order('votes', {ascending:false});
      if (cGen) r = r.contains('genres', [cGen]);
      if (q){ const s = q.replace(/[%,()]/g, ''); r = r.or(`name.ilike.%${s}%,tag.ilike.%${s}%`); }
      { const x = await r; if (x.error){ toast('Couldn’t load stations: ' + x.error.message); $('cg').innerHTML = '<div class="empty">Couldn’t load stations: ' + esc(x.error.message) + '</div>'; return []; } return x.data || []; }
    }
    return ls.get('wr_stn', []).filter(s => !q || (s.name + s.tag).toLowerCase().includes(q.toLowerCase())).slice(off, off + 24);
  },
  async mine(){
    if (!user) return null;
    if (sb) return (await sb.from('stations').select('*').eq('owner', user.id).maybeSingle()).data;
    return ls.get('wr_stn', []).find(s => s.owner === 'demo') || null;
  },
  async save(p){
    if (sb){
      const r = my ? await sb.from('stations').update(p).eq('id', my.id).select().single() : await sb.from('stations').insert(p).select().single();
      if (r.error) throw r.error; return r.data;
    }
    const a = ls.get('wr_stn', []), i = a.findIndex(s => s.owner === 'demo');
    const s = Object.assign(i < 0 ? {id:'l' + Date.now(), owner:'demo', created_at:new Date().toISOString()} : a[i], p, {profiles:{username:user.username, display_name:user.display_name, avatar_url:user.avatar_url}});
    if (i < 0) a.push(s); ls.set('wr_stn', a); return s;
  },
  async setLive(v){
    if (!my) return; const p = {is_live:v, live_at:new Date().toISOString()};
    if (sb) return (await sb.from('stations').update(p).eq('id', my.id)).error; else { Object.assign(my, p); db.save(p); }
  },
  async rooms(){
    if (sb) return (await sb.from('rooms').select('*,profiles!owner(username,display_name)').order('created_at', {ascending:false}).limit(40)).data || [];
    return ls.get('wr_rm', [{id:'r1', name:'Open mic', topic:'Say hi and share what you hear', profiles:{username:'wave.radio'}}]);
  },
  async addRoom(x){
    if (sb){ const r = await sb.from('rooms').insert(x).select().single(); if (r.error) throw r.error; return r.data; }
    const a = await db.rooms(); x.id = 'r' + Date.now(); x.profiles = {username:user.username, display_name:user.display_name}; a.unshift(x); ls.set('wr_rm', a); return x;
  },
  async msgs(ch, q = ''){
    if (sb){ let r = sb.from('messages').select('*,profiles!user_id(username,display_name)').eq('channel', ch); if (q) r = r.ilike('body', '%' + q.replace(/[%_,()]/g, '') + '%'); return ((await r.order('created_at', {ascending:false}).limit(60)).data || []).reverse(); }
    return ls.get('wr_m_' + ch, []).filter(m => !q || m.body.toLowerCase().includes(q.toLowerCase()));
  },
  async send(ch, body){
    if (sb){ const r = await sb.from('messages').insert({channel:ch, body}); if (r.error) throw r.error; return; }
    const a = ls.get('wr_m_' + ch, []); a.push({body, profiles:{username:user.username, display_name:user.display_name}}); ls.set('wr_m_' + ch, a.slice(-60));
  }
};
