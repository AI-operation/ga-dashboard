/**
 * LC GA Dashboard — 라우터
 * 사이드바 클릭 시 워크스페이스 콘텐츠를 교체합니다.
 */
const Router = (() => {

  let _currentPage = null;
  const _pages = {};   // { pageId: renderFn }

  /** 페이지 등록 */
  function register(pageId, renderFn) {
    _pages[pageId] = renderFn;
  }

  /** 페이지 이동 */
  async function go(pageId) {
    if (_currentPage === pageId) return;
    _currentPage = pageId;

    // 사이드바 active 업데이트
    document.querySelectorAll('.sidebar-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // 워크스페이스 로딩 표시
    const ws = document.getElementById('workspace');
    ws.innerHTML = Utils.loadingHTML();

    // 페이지 렌더
    const renderFn = _pages[pageId];
    if (renderFn) {
      try {
        await renderFn(ws);
      } catch (err) {
        console.error(`[Router] ${pageId} 렌더 오류:`, err);
        ws.innerHTML = `<div class="state-empty">페이지를 불러오지 못했습니다.<br><small>${err.message}</small></div>`;
      }
    } else {
      ws.innerHTML = Utils.emptyHTML('준비 중인 페이지입니다.');
    }
  }

  /** 현재 페이지 */
  function current() { return _currentPage; }

  /** 사이드바 클릭 이벤트 바인딩 */
  function bindSidebar() {
    document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
      el.addEventListener('click', () => go(el.dataset.page));
    });
  }

  return { register, go, current, bindSidebar };
})();
