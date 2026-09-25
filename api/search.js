// POST /api/search  { query } → { embedding: number[1536] }
// 쿼리 임베딩만 프록시한다. 유사도 계산은 클라이언트(index.html)에서 수행.
const MODEL = 'text-embedding-3-small';
const MAX_QUERY_CHARS = 500;
const DAILY_LIMIT_PER_IP = 50;

// 인스턴스 메모리 기반 한도: 인스턴스가 재시작되거나 여러 개 뜨면 초기화되는 best-effort
const usage = new Map(); // ip → { day, count }

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim()
    || req.headers['x-real-ip'] || 'unknown';
}

function overLimit(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const rec = usage.get(ip);
  if (!rec || rec.day !== day) {
    if (usage.size > 10000) usage.clear();
    usage.set(ip, { day, count: 1 });
    return false;
  }
  rec.count++;
  return rec.count > DAILY_LIMIT_PER_IP;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) return res.status(400).json({ error: '검색어가 비어 있습니다' });
  if (query.length > MAX_QUERY_CHARS) {
    return res.status(400).json({ error: `검색어는 ${MAX_QUERY_CHARS}자 이내로 입력하세요` });
  }
  if (overLimit(clientIp(req))) {
    return res.status(429).json({ error: '오늘의 의미 검색 한도를 초과했습니다. 키워드 검색을 이용해주세요' });
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: MODEL, input: query }),
    });
    if (!resp.ok) {
      console.error('OpenAI error', resp.status, await resp.text());
      return res.status(502).json({ error: '임베딩 서비스 오류 (' + resp.status + ')' });
    }
    const data = await resp.json();
    return res.status(200).json({ embedding: data.data[0].embedding });
  } catch (e) {
    console.error('OpenAI request failed', e);
    return res.status(502).json({ error: '임베딩 서비스에 연결할 수 없습니다' });
  }
}
