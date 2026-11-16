// Netlify-variant (backup-host). Zelfde logica als Cloudflare, zie functions/_shared/contact-handler.mjs.
// Bereikbaar als /api/contact via de redirect in netlify.toml.
import { handleContact } from '../../functions/_shared/contact-handler.mjs';

export default (req) => handleContact(req, process.env);
