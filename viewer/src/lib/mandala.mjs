// 資料層存取：讀資料目錄裡的 N-大格.md（純 Markdown 日記），把 frontmatter + 註記 log 解析成
// render 用的結構；寫回時用「外科式字串編輯」append 一行註記並更新 last_tended，
// 絕不重新序列化 YAML（避免打亂手寫的中文 frontmatter 排版）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// 從本檔位置往上推到 repo 根，不依賴 process.cwd()。
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
// 資料目錄解析（顯式優先序，clone 後零設定即可跑）：
//   1) 環境變數 MANDALA_DIR —— Docker / 自訂路徑用
//   2) <repo>/mandala       —— 你自己的真實日記（已 gitignore，永不進 repo）
//   3) <repo>/demo-mandala  —— 隨附的架空範例
export const MANDALA_DIR = process.env.MANDALA_DIR
  ? path.resolve(process.env.MANDALA_DIR)
  : fs.existsSync(path.join(ROOT, 'mandala'))
    ? path.join(ROOT, 'mandala')
    : path.join(ROOT, 'demo-mandala');

const FILE_RE = /^\d-.*\.md$/;
const DATE_RE = /\d{4}-\d{2}-\d{2}/;

// 九宮格位置 → 大格（中央 5 是「Get a Life」標題，無檔案）。
//  1 經濟    2 信仰    3 健康
//  4 工作事業 (5 中央)  6 人際
//  7 嗜好    8 夢想    9 家庭伴侶

export function readFields() {
  const files = fs.readdirSync(MANDALA_DIR).filter((f) => FILE_RE.test(f));
  return files.map(parseFile).sort((a, b) => a.position - b.position);
}

// js-yaml 會把 `2026-06-15` 自動解析成 Date 物件，統一轉回 YYYY-MM-DD 字串，
// 否則跟註記來的字串混在一起比較會炸。
function ymd(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v;
  return null;
}

function splitFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: '', body: raw };
  return { fm: m[1], body: m[2] };
}

function parseFile(filename) {
  const raw = fs.readFileSync(path.join(MANDALA_DIR, filename), 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const data = yaml.load(fm) || {};
  const { annByWord, nextByWord } = parseBody(body);

  const cells = (data['小格'] || []).map((c) => {
    const word = c['詞'];
    const annotations = annByWord[word] || [];
    const latest = annotations.length ? annotations[annotations.length - 1].date : null;
    return {
      word,
      born: ymd(c.born),
      archived: !!c.archived,
      annotations,
      // 荒廢由「最新註記日期」推導（規格：renderer 自動從註記推導）。
      // null = 從來沒有 dated 註記 = 誠實的迷霧。
      lastTended: latest,
      fmLastTended: ymd(c.last_tended),
      // 下一步：獨立於助記的「想清楚但還沒開始做的一步」。一格至多一個；null = 沒設。
      nextStep: nextByWord[word] || null,
    };
  });

  // 守門：一塊地只有 8 個槽。活著（非 archived）的小格超過 8 個就 fail loud——
  // 不然 renderer 會默默吞掉第 9 個之後，照妖鏡卻把東西藏起來不告訴你（最糟的失敗）。
  // 要再加焦點，先把某個舊的 archived: true（封存釋放槽位），或手動換詞。
  const aliveCount = cells.filter((c) => !c.archived).length;
  if (aliveCount > 8) {
    throw new Error(
      `「${data['大格']}」有 ${aliveCount} 個活著的小格，超過上限 8（${filename}）。` +
        `封存或合併一些——一塊地同時專注不了超過 8 件事。`
    );
  }

  return {
    filename,
    field: data['大格'],
    position: data.position,
    note: data.note ?? null,
    fmLastTended: ymd(data.last_tended),
    cells,
  };
}

// 解析 body：每個 `## 詞` 區塊底下
//   - dated 註記行：`- YYYY-MM-DD — 文字`（可多筆，助記 log）
//   - 下一步行：    `→ 下一步 — 文字`（至多一行，獨立資料型態）
const NEXT_RE = /^→\s*下一步\s*[—-]?\s*(.*)$/;
function parseBody(body) {
  const annByWord = {};
  const nextByWord = {};
  let current = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = h[1];
      annByWord[current] = [];
      continue;
    }
    if (!current) continue;
    const nm = line.match(NEXT_RE);
    if (nm) {
      const t = nm[1].trim();
      if (t) nextByWord[current] = t; // 空的當作沒設
      continue;
    }
    const dm = line.match(/^-\s*(\d{4}-\d{2}-\d{2})\s*[—-]?\s*(.*)$/);
    if (dm) annByWord[current].push({ date: dm[1], text: dm[2].trim() });
  }
  for (const k of Object.keys(annByWord)) annByWord[k].sort((a, b) => a.date.localeCompare(b.date));
  return { annByWord, nextByWord };
}

// 連續枯萎：state=fog（無註記）/ alive；level 0=剛照料(亮) → 1=枯到底(暗)。
const WITHER_DAYS = 180;
export function freshness(lastTended, today = new Date()) {
  if (!lastTended) return { state: 'fog', days: null, level: 1 };
  const days = Math.max(0, Math.floor((today - new Date(lastTended + 'T00:00:00')) / 86400000));
  const level = Math.min(1, days / WITHER_DAYS);
  return { state: 'alive', days, level };
}

// 大格新鮮度 = 所有活躍小格中、最近一筆註記的日期（純由註記推導；不採用被建檔日污染的
// frontmatter last_tended，否則從沒碰過的地也會因「昨天建檔」而假性發亮）。
export function fieldFreshness(field, today = new Date()) {
  const dates = [];
  for (const c of field.cells) if (!c.archived && c.lastTended) dates.push(c.lastTended);
  if (!dates.length) return { state: 'fog', days: null, level: 1 };
  const latest = dates.sort((a, b) => b.localeCompare(a))[0];
  return freshness(latest, today);
}

// ── 寫回：append 一行 dated 註記 + 同步更新 last_tended ──────────────

export function addAnnotation({ filename, word, text, date }) {
  if (!FILE_RE.test(filename)) throw new Error(`非法檔名：${filename}`);
  if (!DATE_RE.test(date)) throw new Error(`非法日期：${date}`);
  const full = path.join(MANDALA_DIR, filename);
  const raw = fs.readFileSync(full, 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const newBody = insertAnnotation(body, word, `- ${date} — ${text.trim()}`);
  const newFm = updateLastTended(fm, word, date);
  fs.writeFileSync(full, `---\n${newFm}\n---\n${newBody}`, 'utf8');
}

function insertAnnotation(body, word, newLine) {
  const lines = body.split('\n');
  const i = lines.findIndex((l) => l.trim() === `## ${word}`);
  if (i === -1) throw new Error(`找不到小格區塊：## ${word}`);
  let j = i + 1;
  while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
  // 區塊內容去掉佔位 '-' 與空行，append 新行，補一個尾端空行隔開下一塊。
  const content = lines.slice(i + 1, j).filter((l) => l.trim() !== '' && l.trim() !== '-');
  content.push(newLine);
  return [...lines.slice(0, i), lines[i], ...content, '', ...lines.slice(j)].join('\n');
}

// last_tended 只往前、不倒退（取 max）：補記比較舊的日期時，不該把時間戳往回拉。
// 日期是 YYYY-MM-DD，字串比較即時間順序。
function updateLastTended(fm, word, date) {
  const lines = fm.split('\n');
  // 1) 大格層第一個 top-level last_tended
  for (let k = 0; k < lines.length; k++) {
    const m = lines[k].match(/^last_tended:\s*(\S+)/);
    if (m) {
      if (date > m[1]) lines[k] = `last_tended: ${date}`;
      break;
    }
  }
  // 2) 小格層：找到 `- 詞: word`，更新其縮排塊內第一個 last_tended
  const wordIdx = lines.findIndex((l) => {
    const m = l.match(/^\s*-\s*詞:\s*(.+?)\s*$/);
    return m && m[1].trim() === word;
  });
  if (wordIdx !== -1) {
    for (let k = wordIdx + 1; k < lines.length; k++) {
      if (/^\s*-\s*詞:/.test(lines[k])) break;
      const m = lines[k].match(/^(\s*)last_tended:\s*(\S+)/);
      if (m) {
        if (date > m[2]) lines[k] = `${m[1]}last_tended: ${date}`;
        break;
      }
    }
  }
  return lines.join('\n');
}

// ── 下一步：設定／取代／清除（不碰 frontmatter、不動 last_tended）────────────
// 「下一步」是想清楚但還沒開始做的一步，刻意獨立於助記：不刷新新鮮度、不算荒廢。
// text 為空字串 = 清除。

export function setNextStep({ filename, word, text }) {
  if (!FILE_RE.test(filename)) throw new Error(`非法檔名：${filename}`);
  const full = path.join(MANDALA_DIR, filename);
  const raw = fs.readFileSync(full, 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const newBody = writeNextStep(body, word, (text || '').trim());
  fs.writeFileSync(full, `---\n${fm}\n---\n${newBody}`, 'utf8');
}

// 在 `## 詞` 區塊內維持「至多一行」下一步：先抽掉舊的，有新文字就插在標題正下方，
// 空文字 = 只抽不插（清除）。其餘內容（佔位、註記、空行）原樣保留。
function writeNextStep(body, word, text) {
  const lines = body.split('\n');
  const i = lines.findIndex((l) => l.trim() === `## ${word}`);
  if (i === -1) throw new Error(`找不到小格區塊：## ${word}`);
  let j = i + 1;
  while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
  const content = lines.slice(i + 1, j).filter((l) => !NEXT_RE.test(l.trim()));
  if (text) content.unshift(`→ 下一步 — ${text}`);
  return [...lines.slice(0, i), lines[i], ...content, ...lines.slice(j)].join('\n');
}
