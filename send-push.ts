// Supabase Edge Function: send-push
// Paste into Supabase > Edge Functions > Deploy a new function (name it send-push).
// Secrets needed (Edge Functions > Secrets): FIREBASE_SERVICE_ACCOUNT (the whole JSON file), PUSH_WEBHOOK_SECRET.
// Optional secret: SITE_URL (defaults to your GitHub Pages address).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
const SITE = Deno.env.get('SITE_URL') ?? 'https://adarshadada.github.io/Music-website/';

const b64 = (x: string | ArrayBuffer) => {
  const bytes = typeof x === 'string' ? new TextEncoder().encode(x) : new Uint8Array(x);
  let s = ''; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let cached: { token: string; exp: number } | null = null;

async function accessToken(sa: any): Promise<string> {
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claim + '.' + b64(sig) }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google token error: ' + JSON.stringify(j));
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get('x-webhook-secret') !== SECRET) return new Response('forbidden', { status: 403 });
  const { record: n } = await req.json();
  if (!n?.user_id) return new Response('no record', { status: 400 });
  const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}');
  const { data: rows } = await sb.from('push_tokens').select('token').eq('user_id', n.user_id);
  if (!rows?.length) return new Response('no devices');
  const at = await accessToken(sa);
  let sent = 0;
  for (const { token } of rows) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: {
        token,
        notification: { title: n.title, body: n.body ?? '' },
        data: { kind: String(n.kind), link: String(n.link ?? '') },
        android: { priority: 'HIGH' },
        webpush: { fcm_options: { link: SITE + '#open=' + encodeURIComponent(n.link ?? '') + '&k=' + n.kind }, notification: { icon: SITE + 'assets/icon-192.png' } },
      } }),
    });
    if (res.ok) sent++;
    else { const t = await res.text(); if (/UNREGISTERED|NOT_FOUND/.test(t)) await sb.from('push_tokens').delete().eq('token', token); }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
