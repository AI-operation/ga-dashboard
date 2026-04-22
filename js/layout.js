/**
 * LC GA Dashboard — 레이아웃 관리 모듈
 * - 그리드 칼럼 비율 + 차트 높이를 Google Sheets에 저장/로드
 * - 관리자 전용 편집 모드
 */
const Layout = (() => {

  let _savedLayouts = {};
  let _draftLayouts = {};
  let _isEditMode   = false;
  let _isDragging   = false;
  let _loaded       = false;

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

  function getGridColumns(page, gridId, fallback) {
    const source = _isEditMode ? _draftLayouts : _savedLayouts;
    const entry = source[page] && source[page][gridId];
    if (entry && entry.gridColumns) return entry.gridColumns;
    return fallback || '';
  }

  function getChartHeight(page, gridId, fallback) {
    const source = _isEditMode ? _draftLayouts : _savedLayouts;
    const entry = source[page] && source[page][gridId];
    if (entry && entry.chartHeight) return entry.chartHeight;
    return fallback || null;
  }

  function applyToDom(page, container) {
    if (!_loaded) return;
    const scope = container || document;

    scope.querySelectorAll('[data-grid-id]').forEach(el => {
      const gridId = el.dataset.gridId;
      const gridPage = el.dataset.page || page;

      const columns = getGridColumns(gridPage, gridId, null);
      if (columns) {
        el.style.gridTemplateColumns = columns;
      }

      const chartHeight = getChartHeight(gridPage, gridId, null);
      if (chartHeight) {
        el.querySelectorAll('canvas').forEach(cv => {
          cv.style.height = chartHeight + 'px';
          cv.style.maxHeight = chartHeight + 'px';
          cv.setAttribute('height', chartHeight);
        });
      }
    });

    if (_isEditMode) {
      _attachHandlesInScope(scope);
    }
  }

  function enterEditMode() {
    if (_isEditMode) return;
    _isEditMode = true;
    _draftLayouts = _deepClone(_savedLayouts);

    document.body.classList.add('layout-edit-mode');
    _showEditBar();

    _attachHandlesInScope(document);

    Utils.toast('편집 모드 시작. 가로: 카드 사이, 세로: 차트 아래 핸들을 드래그하세요.', 'default', 3000);
  }

  function cancelEditMode() {
    if (!_isEditMode) return;
    _isEditMode = false;
    _draftLayouts = _deepClone(_savedLayouts);

    document.body.classList.remove('layout-edit-mode');
    _hideEditBar();
    _removeAllHandles();

    applyToDom(Router.current(), document);

    Utils.toast('편집이 취소되었습니다.', 'default', 2000);
  }

  async function saveEditMode() {
    if (!_isEditMode) return;

    const updates = [];
    Object.keys(_draftLayouts).forEach(page => {
      Object.keys(_draftLayouts[page]).forEach(gridId => {
        const draft = _draftLayouts[page][gridId];
        const saved = _savedLayouts[page] && _savedLayouts[page][gridId];

        const draftRatio  = draft.ratio;
        const savedRatio  = saved ? saved.ratio : null;
        const draftHeight = draft.chartHeight;
        const savedHeight = saved ? saved.chartHeight : null;

        const ratioChanged  = draftRatio && draftRatio !== savedRatio;
        const heightChanged = draftHeight && draftHeight !== savedHeight;

        if (ratioChanged || heightChanged) {
          const update = { page, gridId };
          if (ratioChanged)  update.ratio = draftRatio;
          if (heightChanged) update.chartHeight = draftHeight;
          updates.push(update);
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
      await API.saveLayoutConfig(updates, CONFIG.USER.NAME);
      _savedLayouts = _deepClone(_draftLayouts);
      _isEditMode = false;
      document.body.classList.remove('layout-edit-mode');
      _hideEditBar();
      _removeAllHandles();

      Utils.toast('저장됨 (' + updates.length + '건)', 'success', 2500);
    } catch (err) {
      Utils.toast('저장 실패: ' + err.message, 'error', 3000);
    }
  }

  function _attachHandlesInScope(scope) {
    scope.querySelectorAll('[data-grid-id]').forEach(grid => {
      const gridPage = grid.dataset.page;
      _attachColumnHandle(grid, gridPage);
      _attachRowHandlesForCharts(grid, gridPage);
    });
  }

  function _attachColumnHandle(grid, page) {
    if (grid.dataset.colHandleAttached === '1') return;

    const gridId = grid.dataset.gridId;
    const children = Array.from(grid.children).filter(c =>
      !c.classList.contains('resize-handle') && !c.classList.contains('resize-handle-v')
    );
    if (children.length < 2) return;

    const current = getGridColumns(page, gridId, null);
    if (!current) return;

    const parts = current.split(' ');
    if (parts.length !== 2) return;

    if (getComputedStyle(grid).position === 'static') {
      grid.style.position = 'relative';
    }

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.dataset.gridId = gridId;
    handle.dataset.page = page;
    handle.title = '드래그해서 카드 너비 조절';
    grid.appendChild(handle);

    function updateHandlePosition() {
      const firstChild = children[0];
      if (!firstChild) return;
      const gridRect = grid.getBoundingClientRect();
      const childRect = firstChild.getBoundingClientRect();
      handle.style.left = (childRect.right - gridRect.left) + 'px';
    }
    updateHandlePosition();

    const ro = new ResizeObserver(updateHandlePosition);
    ro.observe(grid);
    handle._resizeObserver = ro;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      _isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const gridRect = grid.getBoundingClientRect();
      const totalWidth = gridRect.width;

      function onMouseMove(ev) {
        const offsetX = ev.clientX - gridRect.left;
        const minPx = totalWidth * 0.15;
        const clampedX = Math.max(minPx, Math.min(totalWidth - minPx, offsetX));

        const leftFr  = (clampedX / totalWidth * 10).toFixed(2);
        const rightFr = ((totalWidth - clampedX) / totalWidth * 10).toFixed(2);
        const newColumns = leftFr + 'fr ' + rightFr + 'fr';

        grid.style.gridTemplateColumns = newColumns;
        handle.style.left = clampedX + 'px';
      }

      function onMouseUp() {
        _isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const computed = grid.style.gridTemplateColumns;
        const ratio = _cssToRatio(computed);
        if (!_draftLayouts[page]) _draftLayouts[page] = {};
        if (!_draftLayouts[page][gridId]) _draftLayouts[page][gridId] = {};
        _draftLayouts[page][gridId].ratio = ratio;
        _draftLayouts[page][gridId].gridColumns = computed;
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    grid.dataset.colHandleAttached = '1';
  }

  function _attachRowHandlesForCharts(grid, page) {
    const gridId = grid.dataset.gridId;
    const canvases = grid.querySelectorAll('canvas');
    if (canvases.length === 0) return;

    const firstCanvas = canvases[0];
    const container = firstCanvas.parentElement;
    if (!container || container.dataset.rowHandleAttached === '1') return;

    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const handle = document.createElement('div');
    handle.className = 'resize-handle-v';
    handle.dataset.gridId = gridId;
    handle.dataset.page = page;
    handle.title = '드래그해서 차트 높이 조절';
    container.appendChild(handle);

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      _isDragging = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const startY = e.clientY;
      const startHeight = firstCanvas.getBoundingClientRect().height;

      function onMouseMove(ev) {
        const deltaY = ev.clientY - startY;
        const newHeight = Math.max(120, Math.min(600, startHeight + deltaY));

        grid.querySelectorAll('canvas').forEach(cv => {
          cv.style.height = newHeight + 'px';
          cv.style.maxHeight = newHeight + 'px';
        });
      }

      function onMouseUp() {
        _isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const finalHeight = Math.round(firstCanvas.getBoundingClientRect().height);
        if (!_draftLayouts[page]) _draftLayouts[page] = {};
        if (!_draftLayouts[page][gridId]) _draftLayouts[page][gridId] = {};
        _draftLayouts[page][gridId].chartHeight = finalHeight;
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    container.dataset.rowHandleAttached = '1';
  }

  function _removeAllHandles() {
    document.querySelectorAll('.resize-handle, .resize-handle-v').forEach(h => {
      if (h._resizeObserver) h._resizeObserver.disconnect();
      h.remove();
    });
    document.querySelectorAll('[data-grid-id]').forEach(g => {
      g.dataset.colHandleAttached = '';
    });
    document.querySelectorAll('[data-row-handle-attached="1"]').forEach(el => {
      el.dataset.rowHandleAttached = '';
    });
  }

  function _showEditBar() {
    let bar = document.getElementById('layout-edit-bar');
    if (bar) { bar.style.display = 'flex'; return; }

    bar = document.createElement('div');
    bar.id = 'layout-edit-bar';
    bar.innerHTML =
      '<div class="edit-bar-left">' +
        '<span class="edit-bar-icon">EDIT</span>' +
        '<span class="edit-bar-title">편집 모드</span>' +
        '<span class="edit-bar-desc">가로: 카드 사이 | 세로: 차트 아래 핸들을 드래그</span>' +
      '</div>' +
      '<div class="edit-bar-right">' +
        '<button class="btn-edit-cancel">취소</button>' +
        '<button class="btn-edit-save">저장</button>' +
      '</div>';
    document.body.appendChild(bar);

    bar.querySelector('.btn-edit-cancel').addEventListener('click', cancelEditMode);
    bar.querySelector('.btn-edit-save').addEventListener('click', saveEditMode);
  }

  function _hideEditBar() {
    const bar = document.getElementById('layout-edit-bar');
    if (bar) bar.style.display = 'none';
  }

  function _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

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
    getChartHeight,
    enterEditMode,
    cancelEditMode,
    saveEditMode,
    isEditMode,
    isLoaded,
  };
})();