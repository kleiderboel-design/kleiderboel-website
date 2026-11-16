// Gedeelde logica van het contactformulier. Wordt gebruikt door:
//   - Cloudflare Pages:  functions/api/contact.js
//   - Netlify (backup):  netlify/functions/contact.mjs  (bereikbaar via /api/contact, zie netlify.toml)
//
// Environment variables (Cloudflare: Settings > Variables and Secrets, zowel Production als Preview):
//   RESEND_API_KEY    (verplicht)  API-key uit het Resend-account van Kleiderboel
//   MAIL_FROM         (verplicht na verificatie)  "Kleiderboel website <website@send.kleiderboel.nl>"
//                     Zonder geverifieerd domein verstuurt Resend alleen naar het eigen account-adres,
//                     dan krijgt de invuller GEEN kopie (de mail naar Kleiderboel komt wel aan).
//   MAIL_TO           (optioneel)  standaard kleiderboel@gmail.com
//   TURNSTILE_SECRET  (optioneel)  als gezet, moet het formulier een geldige Turnstile-token meesturen

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

const LABELS = {
  aantal_schilderen: 'Aantal personen', datum_schilderen: 'Gewenste datum',
  aantal_groep: 'Aantal personen', wie_groep: 'Voor wie', datum_groep: 'Idee voor de datum',
  stook: 'Welke stook', hoeveel: 'Hoeveel werk', ervaring: 'Ervaring met draaien'
};
const EXTRA_BY_TOPIC = {
  'Keramiek schilderen': ['aantal_schilderen', 'datum_schilderen'],
  'Groepsworkshop': ['aantal_groep', 'wie_groep', 'datum_groep'],
  'Stookservice': ['stook', 'hoeveel'],
  'Open atelier': ['ervaring'],
  'Iets anders': []
};

async function sendResend(key, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) console.error('Resend error', r.status, await r.text());
  return r.ok;
}

async function turnstileOk(secret, token, ip) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: String(token) });
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  return !!j.success;
}

export async function handleContact(req, env) {
  if (req.method !== 'POST') return json(405, { ok: false });
  let d;
  try { d = await req.json(); } catch { return json(400, { ok: false }); }

  // Spamval: bots vullen dit verborgen veld in. Doe alsof het gelukt is.
  if (d['bot-field']) return json(200, { ok: true });

  const naam = oneLine(d.naam).slice(0, 120);
  const email = oneLine(d.email).slice(0, 200);
  const bericht = String(d.bericht || '').trim().slice(0, 5000);
  const onderwerp = Object.hasOwn(EXTRA_BY_TOPIC, d.onderwerp) ? d.onderwerp : 'Iets anders';
  if (!naam || !/^\S+@\S+\.\S+$/.test(email) || !bericht) return json(400, { ok: false, error: 'invalid' });

  if (env.TURNSTILE_SECRET) {
    const ip = req.headers.get('cf-connecting-ip') || '';
    if (!(await turnstileOk(env.TURNSTILE_SECRET, d['cf-turnstile-response'], ip))) return json(400, { ok: false, error: 'captcha' });
  }

  const key = env.RESEND_API_KEY;
  if (!key) return json(500, { ok: false, error: 'not-configured' });

  const from = env.MAIL_FROM || 'Kleiderboel website <onboarding@resend.dev>';
  const to = env.MAIL_TO || 'kleiderboel@gmail.com';

  const rows = [['Naam', naam], ['E-mail', email], ['Onderwerp', onderwerp]];
  for (const k of EXTRA_BY_TOPIC[onderwerp]) {
    const v = oneLine(d[k]).slice(0, 200);
    if (v) rows.push([LABELS[k], v]);
  }
  const table = (rs) => `<table cellpadding="6" style="border-collapse:collapse">${rs.map(([a, b]) => `<tr><td style="color:#666">${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}</table>`;
  const quote = `<p style="white-space:pre-wrap;border-left:3px solid #ab92bf;padding-left:12px;margin-top:16px">${esc(bericht)}</p>`;

  // 1) Mail naar Kleiderboel (zoals voorheen)
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222">
<h2 style="margin:0 0 12px">Nieuwe aanvraag via kleiderboel.nl</h2>
${table(rows)}${quote}
<p style="color:#888;font-size:12px">Je kunt direct antwoorden op deze mail, dan gaat je antwoord naar ${esc(email)}.</p></div>`;
  const text = rows.map(([a, b]) => `${a}: ${b}`).join('\n') + `\n\n${bericht}`;

  const payload = {
    from, to: [to], reply_to: email,
    subject: `Aanvraag ${onderwerp.toLowerCase()} van ${naam}`.replace(/[\r\n]/g, ' '),
    html, text
  };
  // Optionele foto (stookservice), in de browser al verkleind tot JPEG
  if (typeof d.foto === 'string' && d.foto.startsWith('data:image/jpeg;base64,') && d.foto.length < 3_500_000) {
    payload.attachments = [{ filename: 'foto.jpg', content: d.foto.split(',')[1] }];
  }
  if (!(await sendResend(key, payload))) return json(502, { ok: false });

  // 2) Kopie naar de invuller. Mislukt dit (bijv. domein nog niet geverifieerd), dan blijft het formulier gewoon "gelukt":
  //    Kleiderboel heeft de aanvraag al ontvangen.
  let copy = false;
  try {
    const copyHtml = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222">
<h2 style="margin:0 0 12px">Dankjewel voor je bericht, ${esc(naam.split(' ')[0])}!</h2>
<p>We hebben je aanvraag ontvangen en reageren meestal binnen 72 uur. Hieronder zie je een kopie van wat je hebt verstuurd.</p>
${table(rows)}${quote}
<p style="margin-top:20px">Tot snel,<br>Marlou &amp; Jacky<br>Kleiderboel, Berkel-Enschot</p>
<p style="color:#888;font-size:12px">Dit is een automatisch bericht. Antwoorden op deze mail komen bij ons terecht.</p></div>`;
    const copyText = `Dankjewel voor je bericht, ${naam.split(' ')[0]}!\n\nWe hebben je aanvraag ontvangen en reageren meestal binnen 72 uur. Hieronder zie je een kopie van wat je hebt verstuurd.\n\n${text}\n\nTot snel,\nMarlou & Jacky\nKleiderboel, Berkel-Enschot`;
    copy = await sendResend(key, {
      from, to: [email], reply_to: to,
      subject: 'Kopie van je bericht aan Kleiderboel',
      html: copyHtml, text: copyText
    });
  } catch (e) { console.error('Kopie-mail mislukt', e); }

  return json(200, { ok: true, copy });
}
