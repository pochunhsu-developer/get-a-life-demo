import type { APIRoute } from 'astro';
// @ts-ignore — 純 JS 資料層，無型別宣告
import { setNextStep } from '../../lib/mandala.mjs';

export const prerender = false; // on-demand：在 dev server 下即時寫回 .md

export const POST: APIRoute = async ({ request }) => {
  try {
    const { filename, word, text } = await request.json();
    if (!filename || !word) {
      return json({ error: '缺少欄位（filename / word）' }, 400);
    }
    // text 為空字串 = 清除這格的下一步
    setNextStep({ filename, word, text: text ?? '' });
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
