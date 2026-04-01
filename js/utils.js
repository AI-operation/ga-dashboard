/**
 * LC GA Dashboard — 유틸리티
 */
const Utils = (() => {

  /** 숫자 → 원화 포맷 (예: 1840000 → "1,840,000원") */
  function formatKRW(n) {
    if (n == null) return '—';
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  /** 숫자 → 만원 포맷 (예: 48200000 → "4,820만원") */
  function formatMan(n) {
    if (n == null) return '—';
    const man = Math.round(n / 10000);
    return man.toLocaleString('ko-KR') + '만원';
  }

  /** 퍼센트 포맷 (예: 12.4 → "+12.4%") */
  function formatPct(n, showSign = true) {
    if (n == null) return '—';
    const sign = showSign && n > 0 ? '+' : '';
    return sign + Number(n).toFixed(1) + '%';
  }

  /** 날짜 → 표시용 (예: "2025-03-31" → "2025. 3. 31") */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
  }

  /** 현재 연/월 반환 */
  function getCurrentYM() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  /** 이전 달 반환 */
  function getPrevYM(year, month) {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
  }

  /** 분기 반환 (1~4) */
  function getQuarter(month) {
    return Math.ceil(month / 3);
  }

  /** 변화율에 따른 뱃지 클래스 */
  function diffBadge(diff) {
    if (diff == null) return '<span class="badge badge-gray">—</span>';
    const cls = diff >= 0 ? 'badge-up' : 'badge-down';
    const arrow = diff >= 0 ? '▲' : '▼';
    return `<span class="badge ${cls}">${arrow} ${Math.abs(diff).toFixed(1)}%</span>`;
  }

  /** 카테고리 → 태그 HTML */
  function categoryTag(cat) {
    const map = {
      '음료': 'tag-yellow',
      '푸드': 'tag-green',
      '기타': 'tag-gray',
    };
    const cls = map[cat] || 'tag-gray';
    return `<span class="tag ${cls}">${cat}</span>`;
  }

  /** 토스트 알림 표시 */
  function toast(msg, type = 'default', duration = 3000) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  /** 로딩 상태 HTML */
  function loadingHTML() {
    return `
      <div class="state-loading">
        <div class="state-loading-spinner"></div>
        <span>데이터를 불러오는 중...</span>
      </div>`;
  }

  /** 빈 상태 HTML */
  function emptyHTML(msg = '데이터가 없습니다.') {
    return `<div class="state-empty"><span>${msg}</span></div>`;
  }

  /** 모달 열기 */
  function openModal(html) {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modal-backdrop';
    backdrop.innerHTML = html;
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal();
    });
    document.body.appendChild(backdrop);
  }

  /** 모달 닫기 */
  function closeModal() {
    const el = document.getElementById('modal-backdrop');
    if (el) el.remove();
  }

  /** 숫자 → 간단한 막대 너비 계산 (최대 max 대비 %) */
  function barWidth(val, max) {
    if (!max || !val) return 0;
    return Math.round((val / max) * 100);
  }

  return {
    formatKRW, formatMan, formatPct,
    formatDate, getCurrentYM, getPrevYM, getQuarter,
    diffBadge, categoryTag,
    toast, loadingHTML, emptyHTML,
    openModal, closeModal,
    barWidth,
  };
})();
