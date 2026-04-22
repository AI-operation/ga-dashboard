/**
 * LC GA Dashboard — API 모듈
 */
const API = (() => {

  const _cache = {};

  function _cacheGet(key) {
    const hit = _cache[key];
    if (!hit) return null;
    if (Date.now() - hit.ts > CONFIG.APP.CACHE_TTL) { delete _cache[key]; return null; }
    return hit.data;
  }

  function _cacheSet(key, data) { _cache[key] = { data, ts: Date.now() }; }

  function _cacheClear(key) {
    if (key) delete _cache[key];
    else Object.keys(_cache).forEach(k => delete _cache[k]);
  }

  async function get(sheet, params = {}, useCache = true) {
    const cacheKey = `${sheet}:${JSON.stringify(params)}`;
    if (useCache) { const cached = _cacheGet(cacheKey); if (cached) return cached; }
    const query = new URLSearchParams({ sheet, ...params }).toString();
    const res = await fetch(`${CONFIG.API_URL}?${query}`);
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (useCache) _cacheSet(cacheKey, data);
    return data;
  }

  async function post(sheet, payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet, ...payload }),
    });
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    Object.keys(_cache).filter(k => k.startsWith(sheet)).forEach(k => delete _cache[k]);
    return data;
  }

  async function getCafeSales(year, month) {
    const params = {};
    if (year)  params.year  = year;
    if (month) params.month = month;
    return get('카페_월요약', params);
  }
  async function addCafeRow(row)              { return post('카페_월요약', { action: 'append', row }); }
  async function updateCafeRow(rowIndex, row) { return post('카페_월요약', { action: 'update', rowIndex, row }); }
  async function deleteCafeRow(rowIndex)      { return post('카페_월요약', { action: 'delete', rowIndex }); }

  async function getCostData() { return get('원가', {}); }

  async function getAICost(year, month) { return get('AI_비용', { year, month }); }
  async function upsertAICost(row)      { return post('AI_비용', { action: 'upsert', row }); }

  async function getAlgocare(year, month) { return get('알고케어', { year, month }); }

  async function getSlack(year, quarter) { return get('슬랙_오피스키퍼', { year, quarter }); }

  async function getPermission(email) { return get('사용자_권한', { email }, false); }

  async function getLayoutConfig() {
    return get('레이아웃_설정', {}, false);
  }
  async function saveLayoutConfig(updates, editor) {
    return post('레이아웃_설정', { action: 'upsert', updates, editor });
  }
  async function resetLayoutConfig(editor) {
    return post('레이아웃_설정', { action: 'reset', editor });
  }

  return {
    get, post,
    getCafeSales, addCafeRow, updateCafeRow, deleteCafeRow,
    getCostData,
    getAICost, upsertAICost,
    getAlgocare,
    getSlack,
    getPermission,
    getLayoutConfig, saveLayoutConfig, resetLayoutConfig,
    clearCache: _cacheClear,
  };
})();