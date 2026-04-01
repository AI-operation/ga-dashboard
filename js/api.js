/**
 * LC GA Dashboard — API 모듈
 * Apps Script Web App과 통신하는 모든 함수
 */
const API = (() => {

  // ── 캐시 ───────────────────────────────────────────────────
  const _cache = {};

  function _cacheGet(key) {
    const hit = _cache[key];
    if (!hit) return null;
    if (Date.now() - hit.ts > CONFIG.APP.CACHE_TTL) {
      delete _cache[key];
      return null;
    }
    return hit.data;
  }

  function _cacheSet(key, data) {
    _cache[key] = { data, ts: Date.now() };
  }

  function _cacheClear(key) {
    if (key) delete _cache[key];
    else Object.keys(_cache).forEach(k => delete _cache[k]);
  }

  // ── GET 요청 ────────────────────────────────────────────────
  async function get(sheet, params = {}, useCache = true) {
    const cacheKey = `${sheet}:${JSON.stringify(params)}`;

    if (useCache) {
      const cached = _cacheGet(cacheKey);
      if (cached) return cached;
    }

    const query = new URLSearchParams({
      sheet,
      ...params,
    }).toString();

    const res = await fetch(`${CONFIG.API_URL}?${query}`);
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (useCache) _cacheSet(cacheKey, data);
    return data;
  }

  // ── POST 요청 ───────────────────────────────────────────────
  async function post(sheet, payload) {
    const res = await fetch(CONFIG.API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sheet, ...payload }),
    });
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // 해당 시트 캐시 무효화
    Object.keys(_cache)
      .filter(k => k.startsWith(sheet))
      .forEach(k => delete _cache[k]);

    return data;
  }

  // ── 리포트별 API ────────────────────────────────────────────

  /** 카페 매출: 월별 데이터 조회 */
  async function getCafeSales(year, month) {
    return get(CONFIG.SHEETS.CAFE, { year, month });
  }

  /** 카페 매출: 행 추가 */
  async function addCafeRow(row) {
    return post(CONFIG.SHEETS.CAFE, { action: 'append', row });
  }

  /** 카페 매출: 행 수정 */
  async function updateCafeRow(rowIndex, row) {
    return post(CONFIG.SHEETS.CAFE, { action: 'update', rowIndex, row });
  }

  /** 카페 매출: 행 삭제 */
  async function deleteCafeRow(rowIndex) {
    return post(CONFIG.SHEETS.CAFE, { action: 'delete', rowIndex });
  }

  /** AI 비용: 월별 데이터 조회 */
  async function getAICost(year, month) {
    return get(CONFIG.SHEETS.AI_COST, { year, month });
  }

  /** AI 비용: 행 추가/수정 */
  async function upsertAICost(row) {
    return post(CONFIG.SHEETS.AI_COST, { action: 'upsert', row });
  }

  /** 알고케어: 기간별 조회 */
  async function getAlgocare(year, month) {
    return get(CONFIG.SHEETS.ALGOCARE, { year, month });
  }

  /** 슬랙/오피스키퍼: 분기별 조회 */
  async function getSlack(year, quarter) {
    return get(CONFIG.SHEETS.SLACK, { year, quarter });
  }

  /** 권한 조회 — 이메일로 역할 확인 */
  async function getPermission(email) {
    return get(CONFIG.SHEETS.PERMISSIONS, { email }, false);
  }

  // ── 개발용 Mock 데이터 (API 연결 전 테스트용) ────────────────
  const MOCK = {
    cafe: {
      summary: {
        totalSales:     48200000,
        dailyAvg:       1554839,
        achievementRate: 96,
        workingDays:    31,
        prevMonthDiff:  12.4,
      },
      monthly: [
        { month: '10월', sales: 38200000 },
        { month: '11월', sales: 41200000 },
        { month: '12월', sales: 36400000 },
        { month: '1월',  sales: 42900000 },
        { month: '2월',  sales: 43100000 },
        { month: '3월',  sales: 48200000 },
      ],
      categories: [
        { name: '음료', amount: 23618000, pct: 49 },
        { name: '푸드', amount: 13496000, pct: 28 },
        { name: '기타', amount: 11086000, pct: 23 },
      ],
      daily: [
        { date: '2025-03-31', category: '음료', amount: 1840000, prevDiff: 6.2,  memo: '월말 행사' },
        { date: '2025-03-30', category: '푸드', amount: 1520000, prevDiff: -2.1, memo: '' },
        { date: '2025-03-29', category: '기타', amount: 980000,  prevDiff: 11.4, memo: '' },
        { date: '2025-03-28', category: '음료', amount: 2100000, prevDiff: 18.3, memo: '주말 피크' },
        { date: '2025-03-27', category: '푸드', amount: 1650000, prevDiff: 3.2,  memo: '' },
        { date: '2025-03-26', category: '음료', amount: 1780000, prevDiff: -4.1, memo: '' },
      ],
    },
  };

  return {
    get, post,
    getCafeSales, addCafeRow, updateCafeRow, deleteCafeRow,
    getAICost, upsertAICost,
    getAlgocare,
    getSlack,
    getPermission,
    MOCK,
    clearCache: _cacheClear,
  };
})();
