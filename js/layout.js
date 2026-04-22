/**
 * LC GA Dashboard — 레이아웃 관리 모듈
 * - 그리드 칼럼 비율을 Google Sheets에 저장/로드
 * - 관리자 전용 편집 모드
 * - 편집 중 임시저장 → 저장/취소로 확정
 */
const Layout = (() => {

  // ──────────────────────────────────────────────────────
  // 상태
  // ──────────────────────────────────────────────────────
  let _savedLayouts = {};     // 서버에서 가져온 확정 레이아웃 { page: { gridId: {ratio, gridColumns, ...} } }
  let _draftLayouts = {};     // 편집 중 임시 레이아웃 (저장 누르면 _savedLayouts에 반영)
  let _isEditMode   = false;  // 편집 모드 on/off
  let _isDragging   = false;
  let _loaded       = false;

  // ──────────────────────────────────────────────────────
  // 서버에서 레이아웃 로드 (앱 시작 시 1회)
  // ──────────────────────────────────────────────────────
  async function load() {
    try {
      const data = await API.getLayoutConfig();
      _savedLayouts = data.layouts || {};
      _draftLayouts = _deepClone(_savedLayouts);
      _loaded = true;
      console.log('[Layout] 로드 완료', _savedLayouts);
    } catch (err) {
      console.warn('[Layout] 로드 실패, 기본값 사용:', err.message);
      _savedLayouts = {};
      _draftLayouts = {};
      _loaded = true;
    }
  }

  // ──────────────────────────────────────────────────────
  // 특정 페이지의 그리드 비율 가져오기
  // (편집 모드면 draft, 아니면 saved)
  // ──────────────────────────────────────────────────────
  function getGridColumns(page, gridId, fallback) {
    const source = _isEditMode ? _draftLayouts : _savedLayouts;
    const entry = source[page] && source[page][gridId];
    if (entry && entry.gridColumns) return entry.gridColumns;
    return fallback || '';
  }

  // ──────────────────────────────────────────────────────
  // 저장된 레이아웃을 DOM에 적용 (페이지 렌더 후 호출)
  // ──────────────────────────────────────────────────────
  function applyToDom(page, container) {
    if (!_loaded) return;
    const scope = container || document;
    scope.querySelectorAll('[data-grid-id]').forEach(el => {
      const gridId = el.dataset.gridId;
      const columns = getGridColumns(page, gridId, null);
      if (columns) {
        el.style.gridTemplateColumns = columns;
      }
    });

    // 편집 모드면 리사이즈 핸들도 추가
    if (_isEditMode) {
      _attachHandlesInScope(scope, page);
    }
  }

  // ──────────────────────────────────────────────────────
  // 편집 모드 진입
  // ──────────────────────────────────────────────────────
  function enterEditMode() {
    if (_isEditMode) return;
    _isEditMode = true;
    _draftLayouts = _deepClone(_savedLayouts);

    document.body.classList.add('layout-edit-mode');
    _showEditBar();

    // 현재 페이지의 모든 그리드에 핸들 추가
    _attachHandlesInScope(document, Router.current());

    Utils.toast('편집 모드 시작. 카드 사이 구분선을 드래그하세요.', 'default', 2500);
  }

  // ──────────────────────────────────────────────────────
  // 편집 모드 종료 (취소)
  // ──────────────────────────────────────────────────────
  function cancelEditMode() {
    if (!_isEditMode) return;
    _isEditMode = false;
    _draftLayouts = _deepClone(_savedLayouts);

    document.body.classList.remove('layout-edit-mode');
    _hideEditBar();
    _removeAllHandles();

    // 원래 레이아웃으로 복구
    applyToDom(Router.current(), document);

    Utils.toast('편집이 취소되었습니다.', 'default', 2000);
  }

  // ──────────────────────────────────────────────────────
  // 편집 내용 저장 (Google Sheets에 반영)
  // ──────────────────────────────────────────────────────
  async function saveEditMode() {
    if (!_isEditMode) return;

    // 변경된 항목만 추출
    const updates = [];
    Object.keys(_draftLayouts).forEach(page => {
      Object.keys(_draftLayouts[page]).forEach(gridId => {
        const draft = _draftLayouts[page][gridId];
        const saved = _savedLayouts[page] && _savedLayouts[page][gridId];
        const draftRatio = draft.ratio;
        const savedRatio = saved ? saved.ratio : null;
        if (draftRatio && draftRatio !== savedRatio) {
          updates.push({ page, gridId, ratio: draftRatio });
        }
      });
    });

    if (updates.length === 0) {
      Utils.toast('변경된 내용이 없습니다.', 'default', 2000);
      _isEditMode = false;
      document.body.classList.remove('layout-edit-mode');
      _hideEditBar();
      _removeAllHandles();
      return;
    }

    try {
      const res = await API.saveLayoutConfig(updates, CONFIG.USER.NAME);
      // 저장 성공: draft를 saved로 승격
      _savedLayouts = _deepClone(_draftLayouts);
      _isEditMode = false;
      document.body.classList.remove('layout-edit-mode');
      _hideEditBar();
      _removeAllHandles();

      Utils.toast(`✓ ${updates.length}개 레이아웃 저장됨`, 'success', 2500);
    } catch (err) {
      Utils.toast('저장 실패: ' + err.message, 'error', 3000);
    }
  }

  // ──────────────────────────────────────────────────────
  // 그리드에 리사이즈 핸들 추가 (편집 모드일 때만)
  // ──────────────────────────────────────────────────────
  function _attachHandlesInScope(scope, page) {
    scope.querySelectorAll('[data-grid-id]').forEach(grid => {
      _attachHandleToGrid(grid, page);
    });
  }

  function _attachHandleToGrid(grid, page) {
    // 이미 핸들이 있으면 스킵
    if (grid.dataset.handleAttached === '1') return;

    const gridId = grid.dataset.gridId;
    const children = Array.from(grid.children).filter(c => !c.classList.contains('resize-handle'));
    if (children.length < 2) return;  // 2칼럼 이상만 리사이즈 가능

    // 현재 칼럼 비율 확인
    const current = getGridColumns(page, gridId, null);
    if (!current) return;

    // 2칼럼만 지원 (첫 번째 칼럼과 두 번째 칼럼 사이에 핸들)
    // 3칼럼 이상은 추후 확장
    const parts = current.split(' ');
    if (parts.length !== 2) return;

    // 그리드에 position:relative 적용 (핸들 절대 위치 기준)
    if (getComputedStyle(grid).position === 'static') {
      grid.style.position = 'relative';
    }

    // 핸들 생성
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.dataset.gridId = gridId;
    handle.dataset.page = page;
    handle.title = '드래그해서 카드 너비 조절';
    grid.appendChild(handle);

    // 핸들 위치 업데이트 함수
    function updateHandlePosition() {
      const firstChild = children[0];
      if (!firstChild) return;
      const gridRect = grid.getBoundingClientRect();
      const childRect = firstChild.getBoundingClientRect();
      const leftOffset = childRect.right - gridRect.left;
      handle.style.left = leftOffset + 'px';
    }
    updateHandlePosition();

    // 리사이즈 감지 (윈도우 크기 변경 시)
    const ro = new ResizeObserver(updateHandlePosition);
    ro.observe(grid);
    handle._resizeObserver = ro;

    // 드래그 로직
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      _isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const gridRect = grid.getBoundingClientRect();
      const totalWidth = gridRect.width;

      function onMouseMove(ev) {
        const offsetX = ev.clientX - gridRect.left;
        // 최소/최대 제한 (양쪽 최소 15%)
        const minPx = totalWidth * 0.15;
        const clampedX = Math.max(minPx, Math.min(totalWidth - minPx, offsetX));

        const leftRatio = clampedX;
        const rightRatio = totalWidth - clampedX;

        // fr 기준 비율로 변환 (소수점 2자리)
        const leftFr  = (leftRatio  / totalWidth * 10).toFixed(2);
        const rightFr = (rightRatio / totalWidth * 10).toFixed(2);
        const newColumns = `${leftFr}fr ${rightFr}fr`;

        grid.style.gridTemplateColumns = newColumns;
        handle.style.left = clampedX + 'px';
      }

      function onMouseUp() {
        _isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // draft에 저장
        const computed = grid.style.gridTemplateColumns;
        const ratio = _cssToRatio(computed);
        if (!_draftLayouts[page]) _draftLayouts[page] = {};
        _draftLayouts[page][gridId] = {
          ratio: ratio,
          gridColumns: computed,
        };
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    grid.dataset.handleAttached = '1';
  }

  // ──────────────────────────────────────────────────────
  // 모든 핸들 제거
  // ──────────────────────────────────────────────────────
  function _removeAllHandles() {
    document.querySelectorAll('.resize-handle').forEach(h => {
      if (h._resizeObserver) h._resizeObserver.disconnect();
      h.remove();
    });
    document.querySelectorAll('[data-grid-id]').forEach(g => {
      g.dataset.handleAttached = '';
    });
  }

  // ──────────────────────────────────────────────────────
  // 편집 모드 툴바 (상단 고정 바)
  // ──────────────────────────────────────────────────────
  function _showEditBar() {
    let bar = document.getElementById('layout-edit-bar');
    if (bar) { bar.style.display = 'flex'; return; }

    bar = document.createElement('div');
    bar.id = 'layout-edit-bar';
    bar.innerHTML = `
      <div class="edit-bar-left">
        <span class="edit-bar-icon">✏️</span>
        <span class="edit-bar-title">편집 모드</span>
        <span class="edit-bar-desc">카드 사이 구분선을 드래그해서 너비를 조절하세요</span>
      </div>
      <div class="edit-bar-right">
        <button class="btn-edit-cancel">취소</button>
        <button class="btn-edit-save">저장</button>
      </div>
    `;
    document.body.appendChild(bar);

    bar.querySelector('.btn-edit-cancel').addEventListener('click', cancelEditMode);
    bar.querySelector('.btn-edit-save').addEventListener('click', saveEditMode);
  }

  function _hideEditBar() {
    const bar = document.getElementById('layout-edit-bar');
    if (bar) bar.style.display = 'none';
  }

  // ──────────────────────────────────────────────────────
  // 유틸
  // ──────────────────────────────────────────────────────
  function _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // "1.4fr 1fr" → "1.4,1"
  // "1fr 300px" → "1,300px"
  function _cssToRatio(css) {
    return css.split(/\s+/).map(part => {
      const m = part.trim();
      if (m.endsWith('fr')) return m.replace('fr', '');
      return m;
    }).join(',');
  }

  function isEditMode() { return _isEditMode; }
  function isLoaded()   { return _loaded; }

  return {
    load,
    applyToDom,
    getGridColumns,
    enterEditMode,
    cancelEditMode,
    saveEditMode,
    isEditMode,
    isLoaded,
  };
})();
