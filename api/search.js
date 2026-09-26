// POST /api/search  { query } → { embedding: number[1536] }
// 쿼리 임베딩만 프록시한다. 유사도 계산은 클라이언트(index.html)에서 수행.
// Google Gemini API 무료 등급 사용: 입력 내용이 Google 서비스 개선에 활용될 수 있음(클라이언트에 안내 문구 표시).
const MODEL = 'gemini-embedding-001';
const DIMENSIONS = 1536;          // embeddings.json과 같아야 함
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
  const key = process.env.GEMINI_API_KEY;
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
    return res.status(429).json({ error: '오늘의 AI 검색 한도를 초과했습니다' });
  }

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: DIMENSIONS,
      }),
    });
    if (resp.status === 429) {
      // 무료 등급 프로젝트 한도(분당/일당) 초과: 사이트 전체 공통
      console.warn('Gemini quota exceeded', await resp.text());
      return res.status(429).json({ error: 'AI 검색 사용량이 많아 잠시 쓸 수 없습니다' });
    }
    if (!resp.ok) {
      console.error('Gemini error', resp.status, await resp.text());
      return res.status(502).json({ error: '임베딩 서비스 오류 (' + resp.status + ')' });
    }
    const data = await resp.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== DIMENSIONS) {
      console.error('Unexpected Gemini response', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: '임베딩 응답 형식 오류' });
    }
    return res.status(200).json({ embedding: values });
  } catch (e) {
    console.error('Gemini request failed', e);
    return res.status(502).json({ error: '임베딩 서비스에 연결할 수 없습니다' });
  }
}
