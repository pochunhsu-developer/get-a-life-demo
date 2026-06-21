import type { APIRoute } from 'astro';
// @ts-ignore — 純 JS 資料層，無型別宣告
import { addAnnotation } from '../../lib/mandala.mjs';

export const prerender = false; // on-demand：在 dev server 下即時寫回 .md

export const POST: APIRoute = async ({ request }) => {
  try {
    const { filename, word, text, date } = await request.json();
    if (!filename || !word || !text) {
      return json({ error: '缺少欄位（filename / word / text）' }, 400);
    }
    const day = date || new Date().toISOString().slice(0, 10);
    addAnnotation({ filename, word, text, date: day });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
