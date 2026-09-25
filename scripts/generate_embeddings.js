// index.html의 데이터(RAW·EXTRA·TRAD_KO·TRAD_INFO·TOPIC_ROUTES)에서 검색 문서를 만들고
// OpenAI 임베딩을 받아 embeddings.json으로 저장한다.
// 실행: node --env-file=.env scripts/generate_embeddings.js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;
const BATCH = 100;
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

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error('OPENAI_API_KEY가 없습니다. .env에 넣고 `node --env-file=.env scripts/generate_embeddings.js`로 실행하세요.');
  process.exit(1);
}

async function embed(inputs) {
  for (let attempt = 1; ; attempt++) {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: MODEL, input: inputs }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return { vectors: data.data.sort((a, b) => a.index - b.index).map(d => d.embedding), tokens: data.usage.total_tokens };
    }
    const body = await resp.text();
    if ((resp.status === 429 || resp.status >= 500) && attempt < 4) {
      console.warn(`HTTP ${resp.status}, ${attempt * 5}초 후 재시도`);
      await new Promise(r => setTimeout(r, attempt * 5000));
      continue;
    }
    throw new Error(`OpenAI HTTP ${resp.status}: ${body}`);
  }
}

const round = v => Number(v.toFixed(DECIMALS));
let totalTokens = 0;
for (let i = 0; i < docs.length; i += BATCH) {
  const chunk = docs.slice(i, i + BATCH);
  const { vectors, tokens } = await embed(chunk.map(d => d.text));
  totalTokens += tokens;
  chunk.forEach((d, k) => {
    if (vectors[k].length !== DIMENSIONS) throw new Error(`${d.id}: ${vectors[k].length}차원`);
    d.embedding = vectors[k].map(round);
  });
  console.log(`${Math.min(i + BATCH, docs.length)}/${docs.length}`);
}

const out = {
  model: MODEL,
  dimensions: DIMENSIONS,
  count: docs.length,
  generated: new Date().toISOString(),
  docs: docs.map(({ type, id, title, meta, snippet, embedding }) => ({ type, id, title, meta, snippet, embedding })),
};
const file = path.join(ROOT, 'embeddings.json');
writeFileSync(file, JSON.stringify(out));
const byType = docs.reduce((a, d) => ((a[d.type] = (a[d.type] || 0) + 1), a), {});
console.log(`완료: ${docs.length}개 문서 ${JSON.stringify(byType)}, ${totalTokens} 토큰, ${(readFileSync(file).length / 1e6).toFixed(2)}MB`);
