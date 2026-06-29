// 資料層存取：讀資料目錄裡的 N-大格.md（純 Markdown 日記），把 frontmatter + 註記 log 解析成
// render 用的結構；寫回時只在內文 append 一行註記，不動 frontmatter
// （新鮮度一律由內文註記推導，frontmatter 不存日期）。
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
// 同步工具（Drive / Dropbox / iCloud / Syncthing）在衝突時產生的副本檔，略過不讀。
const CONFLICT_RE = /conflicted copy|sync-conflict|\.conflict\b/i;
const DATE_RE = /\d{4}-\d{2}-\d{2}/;

// 把可能多行的使用者輸入壓成單行：註記與下一步在 .md 裡都是「一行」格式。
// 直接寫入換行會 (a) 讓第二行起的內容在解析時被當雜訊丟掉（資料無聲消失），
// (b) 若某行以 `## ` 或 `- 日期` 開頭，還會注入假標題/假註記、汙染整個檔。
const oneLine = (s) => String(s ?? '').replace(/\s*\r?\n\s*/g, ' ').trim();

// 九宮格位置 → 大格（中央 5 是「Get a Life」標題，無檔案）。
//  1 經濟    2 信仰    3 健康
//  4 工作事業 (5 中央)  6 人際
//  7 嗜好    8 夢想    9 家庭伴侶

export function readFields() {
  const all = fs.readdirSync(MANDALA_DIR);
  const conflicts = all.filter((f) => FILE_RE.test(f) && CONFLICT_RE.test(f));
  if (conflicts.length)
    console.warn(`[mandala] 略過同步衝突副本（請手動合併後刪除）：${conflicts.join('、')}`);
  const files = all.filter((f) => FILE_RE.test(f) && !CONFLICT_RE.test(f));
  const fields = files.map(parseFile).sort((a, b) => a.position - b.position);
  // 跨檔守門：兩塊地不能搶同一個九宮格位置（否則畫面上一塊會靜默蓋掉另一塊）。
  const seen = new Map();
  for (const f of fields) {
    if (seen.has(f.position))
      throw new Error(`position ${f.position} 重複：${seen.get(f.position)} 與 ${f.filename} 搶同一格。`);
    seen.set(f.position, f.filename);
  }
  return fields;
}

function splitFrontmatter(raw) {
  // 一律正規化成 LF：Windows clone（core.autocrlf=true）會把 .md 換成 CRLF，
  // 內文逐行解析時尾端的 \r 會讓 `^-\s*日期…(.*)$` 之類的 regex 整批 miss、註記靜默消失。
  // 在唯一的入口處轉一次，下游所有 regex 都不必再煩惱換行。
  const text = raw.replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: '', body: text };
  return { fm: m[1], body: m[2] };
}

function parseFile(filename) {
  const raw = fs.readFileSync(path.join(MANDALA_DIR, filename), 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const data = yaml.load(fm) || {};
  const { annByWord, nextByWord, bodyWords } = parseBody(body);

  // 結構守門：壞掉的檔要 fail loud，不要靜默漏一塊地或錯置資料。
  const VALID_POS = new Set([1, 2, 3, 4, 6, 7, 8, 9]);
  if (data['大格'] == null || data.position == null)
    throw new Error(`${filename} 缺少 frontmatter 的「大格」或 position（檔案壞了或沒有 frontmatter）。`);
  if (!VALID_POS.has(data.position))
    throw new Error(`${filename} 的 position=${data.position} 不合法：要是 1–9 且非 5（5 是中央「Get a Life」）。`);
  const fmWords = (data['小格'] || []).map((c) => c['詞']);
  const dupFm = fmWords.find((w, i) => fmWords.indexOf(w) !== i);
  if (dupFm != null) throw new Error(`${filename} 的 frontmatter 有重複小格「${dupFm}」。`);
  const dupBody = bodyWords.find((w, i) => bodyWords.indexOf(w) !== i);
  if (dupBody != null) throw new Error(`${filename} 的 body 有重複的「## ${dupBody}」區塊。`);

  const cells = (data['小格'] || []).map((c) => {
    const word = c['詞'];
    const annotations = annByWord[word] || [];
    const latest = annotations.length ? annotations[annotations.length - 1].date : null;
    return {
      word,
      archived: !!c.archived,
      annotations,
      // 荒廢由「最新註記日期」推導（renderer 自動從內文註記推導）。
      // null = 從來沒有 dated 註記 = 誠實的迷霧。
      lastTended: latest,
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
  const bodyWords = []; // 依出現順序記每個 `## 詞`，給 parseFile 偵測重複區塊
  let current = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = h[1];
      bodyWords.push(current);
      if (!annByWord[current]) annByWord[current] = []; // 不在這 reset，重複交給 parseFile fail loud
      continue;
    }
    if (!current) continue;
    const nm = line.match(NEXT_RE);
    if (nm) {
      const t = nm[1].trim();
      if (t) nextByWord[current] = t; // 空的當作沒設
      continue;
    }
    // 日期接受未補零（手改常見 `2026-6-1`），一律正規化成 YYYY-MM-DD，避免無聲掉資料。
    const dm = line.match(/^-\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*[—-]?\s*(.*)$/);
    if (dm) {
      const date = `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`;
      annByWord[current].push({ date, text: dm[4].trim() });
    }
  }
  for (const k of Object.keys(annByWord)) annByWord[k].sort((a, b) => a.date.localeCompare(b.date));
  return { annByWord, nextByWord, bodyWords };
}

// 連續枯萎：state=fog（無註記）/ alive；level 0=剛照料(亮) → 1=枯到底(暗)。
const WITHER_DAYS = 180;
export function freshness(lastTended, today = new Date()) {
  if (!lastTended) return { state: 'fog', days: null, level: 1 };
  const days = Math.max(0, Math.floor((today - new Date(lastTended + 'T00:00:00')) / 86400000));
  const level = Math.min(1, days / WITHER_DAYS);
  return { state: 'alive', days, level };
}

// 大格新鮮度 = 所有活躍小格中、最近一筆註記的日期（純由內文註記推導）。
export function fieldFreshness(field, today = new Date()) {
  const dates = [];
  for (const c of field.cells) if (!c.archived && c.lastTended) dates.push(c.lastTended);
  if (!dates.length) return { state: 'fog', days: null, level: 1 };
  const latest = dates.sort((a, b) => b.localeCompare(a))[0];
  return freshness(latest, today);
}

// ── 寫回：append 一行 dated 註記到內文（不動 frontmatter）──────────────

export function addAnnotation({ filename, word, text, date }) {
  if (!FILE_RE.test(filename)) throw new Error(`非法檔名：${filename}`);
  if (!DATE_RE.test(date)) throw new Error(`非法日期：${date}`);
  const full = path.join(MANDALA_DIR, filename);
  const raw = fs.readFileSync(full, 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const newBody = insertAnnotation(body, word, `- ${date} — ${oneLine(text)}`);
  fs.writeFileSync(full, `---\n${fm}\n---\n${newBody}`, 'utf8');
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

// ── 下一步：設定／取代／清除（不碰 frontmatter）────────────
// 「下一步」是想清楚但還沒開始做的一步，刻意獨立於助記：不刷新新鮮度、不算荒廢。
// text 為空字串 = 清除。

export function setNextStep({ filename, word, text }) {
  if (!FILE_RE.test(filename)) throw new Error(`非法檔名：${filename}`);
  const full = path.join(MANDALA_DIR, filename);
  const raw = fs.readFileSync(full, 'utf8');
  const { fm, body } = splitFrontmatter(raw);
  const newBody = writeNextStep(body, word, oneLine(text));
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
