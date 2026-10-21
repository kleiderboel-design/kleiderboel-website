// Ontvangt het contactformulier en mailt het via Resend naar Kleiderboel.
// Instellen in Netlify (Project configuration > Environment variables):
//   RESEND_API_KEY  (verplicht)  API-key uit het Resend-account van Kleiderboel
//   MAIL_TO         (optioneel)  standaard kleiderboel@gmail.com
//   MAIL_FROM       (optioneel)  standaard "Kleiderboel website <onboarding@resend.dev>"
//                                 Na het verifieren van send.kleiderboel.nl in Resend: "Kleiderboel website <website@send.kleiderboel.nl>"

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

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

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false });
  let d;
  try { d = await req.json(); } catch { return json(400, { ok: false }); }

  // Spamval: bots vullen dit verborgen veld in. Doe alsof het gelukt is.
  if (d['bot-field']) return json(200, { ok: true });

  const naam = String(d.naam || '').trim().slice(0, 120);
  const email = String(d.email || '').trim().slice(0, 200);
  const bericht = String(d.bericht || '').trim().slice(0, 5000);
  const onderwerp = Object.hasOwn(EXTRA_BY_TOPIC, d.onderwerp) ? d.onderwerp : 'Iets anders';
  if (!naam || !/^\S+@\S+\.\S+$/.test(email) || !bericht) return json(400, { ok: false, error: 'invalid' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return json(500, { ok: false, error: 'not-configured' });

  const rows = [['Naam', naam], ['E-mail', email], ['Onderwerp', onderwerp]];
  for (const k of EXTRA_BY_TOPIC[onderwerp]) {
    const v = String(d[k] || '').trim().slice(0, 200);
    if (v) rows.push([LABELS[k], v]);
  }
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222">
<h2 style="margin:0 0 12px">Nieuwe aanvraag via kleiderboel.nl</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([a, b]) => `<tr><td style="color:#666">${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}</table>
<p style="white-space:pre-wrap;border-left:3px solid #ab92bf;padding-left:12px;margin-top:16px">${esc(bericht)}</p>
<p style="color:#888;font-size:12px">Je kunt direct antwoorden op deze mail, dan gaat je antwoord naar ${esc(email)}.</p></div>`;
  const text = rows.map(([a, b]) => `${a}: ${b}`).join('\n') + `\n\n${bericht}`;

  const payload = {
    from: process.env.MAIL_FROM || 'Kleiderboel website <onboarding@resend.dev>',
    to: [process.env.MAIL_TO || 'kleiderboel@gmail.com'],
    reply_to: email,
    subject: `Aanvraag ${onderwerp.toLowerCase()} van ${naam}`.replace(/[\r\n]/g, ' '),
    html, text
  };
  // Optionele foto (stookservice), in de browser al verkleind tot JPEG
  if (typeof d.foto === 'string' && d.foto.startsWith('data:image/jpeg;base64,') && d.foto.length < 3_500_000) {
    payload.attachments = [{ filename: 'foto.jpg', content: d.foto.split(',')[1] }];
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) { console.error('Resend error', r.status, await r.text()); return json(502, { ok: false }); }
  return json(200, { ok: true });
};
