// index.html의 데이터(RAW·EXTRA·TRAD_KO·TRAD_INFO·TOPIC_ROUTES)에서 검색 문서를 만들고
// Google Gemini 임베딩(gemini-embedding-001)을 받아 embeddings.json으로 저장한다.
// 무료 등급 분당 토큰 한도(약 3만)에 맞춰 배치 사이에 쉬어 가므로 몇 분 걸린다.
// 실행: node --env-file=.env scripts/generate_embeddings.js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'gemini-embedding-001';
const DIMENSIONS = 1536;          // api/search.js와 같아야 함
const BATCH = 20;
const TOKENS_PER_MINUTE = 20000;  // 무료 등급 한도보다 낮게 잡은 목표치
const DECIMALS = 6;

const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// `const NAME = {...}` / `[...]` 리터럴을 괄호 짝으로 잘라 평가
function grab(name) {
  const start = html.indexOf('const ' + name);
  if (start < 0) throw new Error(name + ' not found in index.html');
  let i = html.indexOf('=', start) + 1;
  while (/\s/.test(html[i])) i++;
  const open = html[i], close = open === '{' ? '}' : ']';
  let depth = 0, quote = null, esc = false, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (quote) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) break;
  }
  return new Function('return (' + html.slice(i, j + 1) + ');')();
}

const RAW = grab('RAW');
const EXTRA = grab('EXTRA');
const TRAD_KO = grab('TRAD_KO');
const TRAD_INFO = grab('TRAD_INFO');
const TOPIC_ROUTES = grab('TOPIC_ROUTES');

// index.html의 buildDeepIndex()와 같은 필드 구성
const join = (...xs) => xs.flat().filter(Boolean).join('\n');
const docs = [];

RAW.n.forEach(n => {
  const [id, name, life, , , , , summary, q, themes, works] = n;
  const trad = n[13];
  const ex = EXTRA[id] || {};
  docs.push({
    type: 'philosopher', id, title: name,
    meta: life + ' · ' + (TRAD_KO[trad] || trad),
    snippet: ex.hook || summary || '',
    text: join(name + ' (' + (TRAD_KO[trad] || trad) + ', ' + life + ')', ex.hook, summary, q, ex.problem,
      (themes || '').split('|').join(', '), ex.metaphor, (works || '').split('|').join(', ')),
  });
});

Object.entries(TRAD_KO).forEach(([id, koName]) => {
  const info = TRAD_INFO[id] || {};
  docs.push({
    type: 'tradition', id, title: koName,
    meta: (info.reps || []).slice(0, 3).join(', '),
    snippet: info.meaning || info.era || '',
    text: join('사조: ' + koName, info.q, info.meaning, info.era,
      '대표 인물: ' + (info.reps || []).join(', '), info.metaphor),
  });
});

TOPIC_ROUTES.forEach(t => {
  docs.push({
    type: 'topic', id: t.id, title: t.title,
    meta: (t.shortTitle || '') + ' · ' + (t.routes || []).length + '개 하위 항로',
    snippet: t.framing || '',
    text: join(t.title, t.shortTitle, t.framing, t.questions,
      (t.keywords || []).join(', '), (t.tags || []).join(', '),
      (t.routes || []).map(r => join(r.title, r.guidingQuestion, r.summary))),
  });
});

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('GEMINI_API_KEY가 없습니다. .env에 넣고 `npm run embed`로 실행하세요.');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// 한국어는 대략 1.5자당 1토큰으로 보수적으로 추정 (속도 조절용)
const estimateTokens = texts => Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 1.5);

async function embed(batch) {
  const body = JSON.stringify({
    requests: batch.map(d => ({
      model: 'models/' + MODEL,
      content: { parts: [{ text: d.text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
      title: d.title,
      outputDimensionality: DIMENSIONS,
    })),
  });
  for (let attempt = 1; ; attempt++) {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.embeddings.map(e => e.values);
    }
    const text = await resp.text();
    if ((resp.status === 429 || resp.status >= 500) && attempt < 6) {
      // 429 응답의 RetryInfo.retryDelay("37s")를 따르고, 없으면 지수 백오프
      const m = text.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
      const wait = m ? Math.ceil(+m[1] + 1) * 1000 : 10000 * 2 ** (attempt - 1);
      console.warn(`HTTP ${resp.status}, ${Math.round(wait / 1000)}초 후 재시도 (${attempt}/5)`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Gemini HTTP ${resp.status}: ${text}`);
  }
}

const round = v => Number(v.toFixed(DECIMALS));
let totalTokens = 0;
for (let i = 0; i < docs.length; i += BATCH) {
  const chunk = docs.slice(i, i + BATCH);
  const tokens = estimateTokens(chunk.map(d => d.text));
  const t0 = Date.now();
  const vectors = await embed(chunk);
  totalTokens += tokens;
  chunk.forEach((d, k) => {
    if (!vectors[k] || vectors[k].length !== DIMENSIONS) throw new Error(`${d.id}: ${vectors[k] && vectors[k].length}차원`);
    d.embedding = vectors[k].map(round);
  });
  console.log(`${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  if (i + BATCH < docs.length) await sleep(Math.max(0, tokens / TOKENS_PER_MINUTE * 60000 - (Date.now() - t0)));
}

const out = {
  provider: 'google-gemini',
  model: MODEL,
  dimensions: DIMENSIONS,
  count: docs.length,
  generated: new Date().toISOString(),
  docs: docs.map(({ type, id, title, meta, snippet, embedding }) => ({ type, id, title, meta, snippet, embedding })),
};
const file = path.join(ROOT, 'embeddings.json');
writeFileSync(file, JSON.stringify(out));
const byType = docs.reduce((a, d) => ((a[d.type] = (a[d.type] || 0) + 1), a), {});
console.log(`완료: ${docs.length}개 문서 ${JSON.stringify(byType)}, 추정 ${totalTokens} 토큰, ${(readFileSync(file).length / 1e6).toFixed(2)}MB`);
