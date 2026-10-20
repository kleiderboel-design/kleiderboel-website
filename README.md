# Kleiderboel website

Statische website (geen build nodig). Gemaakt door [Palster](https://palster.eu/websites).

## Structuur
- `index.html` homepage, `algemene-voorwaarden/` voorwaarden, `404.html`
- `assets/` css, js, fonts en afbeeldingen
- `netlify.toml` beveiligingsheaders, caching en redirects van oude WordPress-adressen
- `robots.txt`, `sitemap.xml`

## Online zetten (eerste keer)
1. GitHub: nieuwe repository `kleiderboel-website` (privé is prima). Upload de **inhoud** van deze map (Add file > Upload files, sleep alle bestanden en mappen erin) en commit naar `main`.
2. Netlify: Add new project > Import an existing project > GitHub > kies de repository.
   Build command: leeg laten. Publish directory: `.` (punt).
3. Project settings > Build & deploy: zet **Deploy Previews** en **Branch deploys** uit, publiceer alleen `main`.

## Credits zuinig houden
- Geen build-stap, dus een deploy is een simpele bestandsupload.
- Bundel wijzigingen: één commit met meerdere aanpassingen in plaats van veel losse commits.
- Geen branch deploys of deploy previews.
- Afbeeldingen alleen als WebP/JPG van redelijke grootte toevoegen.

## Overstap domein (optie B: nameservers naar Netlify)
Voorbereiding
1. Noteer bij WordPress.com (Domeinen > kleiderboel.nl > Nameservers) de huidige nameservers, voor terugdraaien.
2. Netlify > Domain management > Add a domain `kleiderboel.nl` > kies Netlify DNS. Netlify toont 4 nameservers.
3. In Netlify DNS: controleer dat `kleiderboel.nl` en `www` naar het project wijzen. De WordPress-records (wpcloud CNAME, SPF, DMARC) zijn niet nodig.
4. Test eerst via het netlify.app-adres.

Omschakelen (rustig moment)
5. WordPress.com > Domeinen > kleiderboel.nl > Nameservers > eigen nameservers: vul de 4 van Netlify in.
6. Wacht tot Netlify het HTTPS-certificaat heeft aangemaakt (Domain management > HTTPS).
7. Verwijder in `index.html` en `algemene-voorwaarden/index.html` de regel `<meta name="robots" content="noindex, nofollow">` en commit.
8. Search Console: sitemap `https://kleiderboel.nl/sitemap.xml` indienen. Google-bedrijfsprofiel controleren.

Terugdraaien: zet bij WordPress.com de nameservers terug naar de genoteerde waarden.

## Nog te doen
- PDF-brochure toevoegen op `wp-content/uploads/2026/08/h22026-keramiek-schilderen-workshop.pdf` en links in `index.html` van `https://kleiderboel.nl/wp-content/...` naar `/wp-content/...` zetten.
- Contactformulier koppelen aan Resend (Netlify-functie) en privacyverklaring toevoegen.
- Analytics en uptime-monitor instellen.
