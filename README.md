# Kleiderboel website

Statische website (geen build nodig). Gemaakt door [Palster](https://palster.eu/websites).

## Structuur
- `index.html` homepage, `algemene-voorwaarden/`, `privacyverklaring/`, `404.html`
- `assets/` css, js, fonts en afbeeldingen
- `functions/api/contact.js` contactformulier als Cloudflare Pages Function (`POST /api/contact`)
- `functions/_shared/contact-handler.mjs` gedeelde formulier-logica (ook gebruikt door de Netlify-backup)
- `_headers` en `_redirects` beveiligingsheaders, caching en redirects van oude WordPress-adressen (Cloudflare)
- `netlify.toml` en `netlify/functions/` zelfde instellingen voor de Netlify-backup
- `robots.txt`, `sitemap.xml`

## Hosting
- **Hoofdhost: Cloudflare Pages** (Git-koppeling, branch `main`, geen build command, output directory `.`).
- **Backup: Netlify** (handmatig deployen, domein niet gekoppeld, behalve bij een noodomschakeling).
- Alleen `*.pages.dev`-adressen krijgen `X-Robots-Tag: noindex` (zie `_headers`). Het eigen domein is indexeerbaar.
- - Tijdens de migratie (nov 2026) is de productiebranch tijdelijk `cloudflare`; na de livegang gaat dit terug naar `main`.

## Environment variables (Cloudflare: Settings > Variables and Secrets, Production en Preview)
- `RESEND_API_KEY` (verplicht, nooit in code)
- `MAIL_FROM` bijv. `Kleiderboel website <website@send.kleiderboel.nl>` (pas na verificatie van het domein in Resend)
- `MAIL_TO` optioneel, standaard kleiderboel@gmail.com
- `TURNSTILE_SECRET` optioneel (zie draaiboek)

## Wijzigen
Bundel wijzigingen in een commit. Elke commit op `main` deployt automatisch; test grotere wijzigingen eerst op een branch (preview-adres op pages.dev).
