// Cloudflare Pages Function: POST /api/contact
import { handleContact } from '../_shared/contact-handler.mjs';

export const onRequestPost = ({ request, env }) => handleContact(request, env);
export const onRequest = ({ request }) => new Response(JSON.stringify({ ok: false }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
