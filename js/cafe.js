/**
 * 카페 월 매출 페이지 — 아코디언 디자인
 */
const Pages = window.Pages || {};

Pages.cafe = async function(container) {
  const { year, month } = Utils.getCurrentYM();

  container.innerHTML = `
    <div class="ws-header">
      <div class="ws-header-top">
        <div>
          <div class="ws-title">카페 월 매출</div>
          <div class="ws-subtitle">운영 리포트 · ${year}년 기준</div>
        </div>
        <div class="ws-actions">
          <button class="btn btn-sm" id="btn-export">내보내기</button>
          <button class="btn btn-primary btn-sm" id="btn-add">+ 데이터 추가</button>
        </div>
      </div>
    </div>
    <div class="ws-content" id="cafe-content">${Utils.loadingHTML()}</div>
  `;

  let apiData;
  try {
    apiData = await API.getCafeSales(year, null);
  } catch(err) {
    document.getElementById('cafe-content').innerHTML =
      Utils.emptyHTML(`데이터 로드 실패: ${err.message}`);
    return;
  }

  if (!apiData.rows || apiData.rows.length === 0) {
    document.getElementById('cafe-content').innerHTML =
      Utils.emptyHTML('데이터가 없습니다. 먼저 데이터를 추가해주세요.');
    return;
  }

  let currentRow = apiData.rows.find(r => r.month === month) || apiData.rows[apiData.rows.length - 1];
  const fixed = apiData.fixedCost;

  document.getElementById('sidebar-kpi').innerHTML = `
    <div class="sidebar-kpi-box">
      <div class="sidebar-kpi-label">${currentRow.year}년 ${currentRow.month}월 매출</div>
      <div class="sidebar-kpi-value">${Utils.formatMan(currentRow.매출합계)}</div>
      <div class="sidebar-kpi-sub" style="color:${currentRow.순매출 >= 0 ? 'var(--green)' : 'var(--red)'}">
        순매출 ${Utils.formatMan(currentRow.순매출)}
      </div>
    </div>
  `;

  container.querySelector('#btn-add').addEventListener('click', () => openAddModal(year, month));
  container.querySelector('#btn-export').addEventListener('click', () => Utils.toast('준비 중인 기능입니다.'));

  renderCafe(document.getElementById('cafe-content'), apiData, currentRow, fixed);
};

function renderCafe(el, apiData, row, fixed) {
  const maxSales = Math.max(...apiData.trend.map(t => t.매출합계 || 0), 1);
  const totalExpense = row.지출합계;

  el.innerHTML = `
    <style>
      .month-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
      .month-tabs{display:flex;border:0.5px solid var(--border);border-radius:8px;overflow:hidden;}
      .m-tab{padding:6px 14px;font-size:12px;color:var(--text-2);cursor:pointer;border-right:0.5px solid var(--border-light);background:var(--bg-surface);transition:background 0.1s;}
      .m-tab:last-child{border-right:none;}
      .m-tab.active{background:var(--yellow-pale);color:var(--brown);font-weight:700;}
      .m-tab:hover:not(.active){background:var(--bg-hover);}
      .sum-row{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1.2fr;gap:10px;margin-bottom:18px;}
      .sum-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;}
      .sum-card.featured{background:var(--yellow-pale);border-color:var(--yellow-border);}
      .sum-card.loss{background:#FEF2F2;border-color:#FECACA;}
      .sum-label{font-size:10.5px;color:var(--text-3);margin-bottom:6px;}
      .sum-card.featured .sum-label{color:var(--brown-mid);}
      .sum-card.loss .sum-label{color:#991B1B;}
      .sum-value{font-size:18px;font-weight:700;color:var(--text-1);line-height:1;letter-spacing:-0.02em;}
      .sum-card.featured .sum-value{color:var(--brown);}
      .sum-card.loss .sum-value{color:#DC2626;}
      .sum-sub{font-size:10.5px;color:var(--text-3);margin-top:4px;}
      .sum-card.featured .sum-sub{color:var(--brown-mid);}
      .cafe-grid{display:grid;grid-template-columns:1fr 300px;gap:14px;margin-bottom:14px;}
      .c-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .c-head{padding:13px 18px 11px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;}
      .c-title{font-size:13px;font-weight:700;color:var(--text-1);}
      .c-meta{font-size:11px;color:var(--text-3);}
      .sales-row{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:var(--yellow-pale);border-bottom:1px solid var(--yellow-border);}
      .sales-name{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--brown);}
      .sales-dot{width:8px;height:8px;border-radius:50%;background:var(--yellow);flex-shrink:0;}
      .sales-val{font-size:15px;font-weight:700;color:var(--brown);}
      .acc-group{border-bottom:1px solid var(--border-light);}
      .acc-group:last-of-type{border-bottom:none;}
      .acc-hd{display:flex;align-items:center;justify-content:space-between;padding:11px 18px;cursor:pointer;transition:background 0.1s;user-select:none;}
      .acc-hd:hover{background:var(--bg-hover);}
      .acc-left{display:flex;align-items:center;gap:10px;}
      .acc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
      .acc-name{font-size:12.5px;font-weight:500;color:var(--text-1);}
      .acc-right{display:flex;align-items:center;gap:12px;}
      .acc-amt{font-size:13px;font-weight:700;color:var(--text-1);}
      .acc-arrow{font-size:10px;color:var(--text-3);transition:transform 0.2s;display:inline-block;}
      .acc-arrow.open{transform:rotate(180deg);}
      .acc-body{display:none;background:var(--bg-page);}
      .acc-body.open{display:block;}
      .detail-row{display:flex;align-items:center;justify-content:space-between;padding:8px 18px 8px 38px;border-top:1px solid var(--border-light);}
      .detail-row:hover{background:var(--bg-hover);}
      .detail-name{font-size:12px;color:var(--text-2);}
      .detail-amt{font-size:12px;color:var(--text-1);font-weight:500;}
      .subtotal-row{display:flex;align-items:center;justify-content:space-between;padding:9px 18px;background:var(--bg-hover);border-top:1px solid var(--border);}
      .subtotal-name{font-size:12px;font-weight:500;color:var(--text-1);}
      .subtotal-amt{font-size:12.5px;font-weight:700;color:var(--text-1);}
      .total-row{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:var(--bg-hover);border-top:1px solid var(--border);}
      .total-name{font-size:13px;font-weight:700;color:var(--text-1);}
      .total-amt{font-size:14px;font-weight:700;color:var(--text-1);}
      .net-row{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-top:1px solid #FECACA;}
      .net-row.loss{background:#FEF2F2;}
      .net-row.profit{background:#ECFDF5;border-top-color:#A7F3D0;}
      .net-name{font-size:13px;font-weight:700;}
      .net-amt{font-size:16px;font-weight:700;}
      .net-row.loss .net-name,.net-row.loss .net-amt{color:#DC2626;}
      .net-row.profit .net-name,.net-row.profit .net-amt{color:#059669;}
      .rp-panel{display:flex;flex-direction:column;gap:14px;}
      .trend-wrap{padding:14px 16px;}
      .t-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
      .t-row:last-child{margin-bottom:0;}
      .t-month{font-size:11px;color:var(--text-3);width:22px;flex-shrink:0;text-align:right;}
      .t-track{flex:1;height:22px;background:var(--border-light);border-radius:4px;overflow:hidden;}
      .t-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;}
      .t-val{font-size:10.5px;color:var(--text-1);font-weight:500;white-space:nowrap;}
      .ratio-wrap{padding:14px 16px;}
      .ratio-row{margin-bottom:12px;}
      .ratio-row:last-child{margin-bottom:0;}
      .ratio-top{display:flex;justify-content:space-between;margin-bottom:5px;}
      .ratio-label{font-size:12px;color:var(--text-2);display:flex;align-items:center;gap:6px;}
      .ratio-sdot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
      .ratio-val{font-size:12px;color:var(--text-1);font-weight:500;}
      .ratio-track{height:6px;background:var(--border-light);border-radius:3px;overflow:hidden;}
      .ratio-fill{height:100%;border-radius:3px;}
      .memo-strip{background:var(--bg-hover);border:1px solid var(--border);border-radius:10px;padding:11px 16px;display:flex;align-items:center;gap:10px;}
      .memo-lbl{font-size:10.5px;color:var(--text-3);flex-shrink:0;}
      .memo-txt{font-size:12.5px;color:var(--text-2);}
    </style>

    <div class="month-bar">
      <div class="month-tabs" id="month-tabs">
        ${apiData.rows.map(r => `
          <div class="m-tab${r.month === row.month && r.year === row.year ? ' active' : ''}"
               data-year="${r.year}" data-month="${r.month}">
            ${r.month}월
          </div>`).join('')}
      </div>
    </div>

    <div class="sum-row">
      <div class="sum-card featured">
        <div class="sum-label">월 매출합계</div>
        <div class="sum-value">${Utils.formatKRW(row.매출합계)}</div>
        <div class="sum-sub">${row.year}년 ${row.month}월</div>
      </div>
      <div class="sum-card">
        <div class="sum-label">변동 지출</div>
        <div class="sum-value">${Utils.formatKRW(row.변동지출)}</div>
        <div class="sum-sub">재료비 + 앱비</div>
      </div>
      <div class="sum-card">
        <div class="sum-label">고정 지출</div>
        <div class="sum-value">${Utils.formatKRW(row.고정지출)}</div>
        <div class="sum-sub">60개월 안분</div>
      </div>
      <div class="sum-card">
        <div class="sum-label">특이 지출</div>
        <div class="sum-value">${Utils.formatKRW(row.특이지출)}</div>
        <div class="sum-sub">직책지원비 등</div>
      </div>
      <div class="sum-card ${row.순매출 >= 0 ? '' : 'loss'}">
        <div class="sum-label">순매출</div>
        <div class="sum-value">${Utils.formatKRW(row.순매출)}</div>
        <div class="sum-sub">매출 - 지출합계</div>
      </div>
    </div>

    <div class="cafe-grid">
      <div class="c-card">
        <div class="c-head">
          <span class="c-title">수입 / 지출 구조</span>
          <span class="c-meta">항목 클릭 시 상세 펼치기</span>
        </div>
        <div class="sales-row">
          <div class="sales-name"><div class="sales-dot"></div>매출 합계</div>
          <span class="sales-val">${Utils.formatKRW(row.매출합계)}</span>
        </div>
        <div class="acc-group">
          <div class="acc-hd" onclick="cafeToggle('변동')">
            <div class="acc-left">
              <div class="acc-dot" style="background:#93C5FD;"></div>
              <span class="acc-name">변동 지출</span>
            </div>
            <div class="acc-right">
              <span class="acc-amt">${Utils.formatKRW(row.변동지출)}</span>
              <span class="acc-arrow" id="acc-arrow-변동">▼</span>
            </div>
          </div>
          <div class="acc-body" id="acc-body-변동">
            <div class="detail-row"><span class="detail-name">재료 및 소모품비</span><span class="detail-amt">${Utils.formatKRW(row.재료비)}</span></div>
            <div class="detail-row"><span class="detail-name">엘리가오더 앱비</span><span class="detail-amt">${Utils.formatKRW(row.엘리가오더)}</span></div>
            <div class="subtotal-row"><span class="subtotal-name">소계</span><span class="subtotal-amt">${Utils.formatKRW(row.변동지출)}</span></div>
          </div>
        </div>
        <div class="acc-group">
          <div class="acc-hd" onclick="cafeToggle('고정')">
            <div class="acc-left">
              <div class="acc-dot" style="background:#D1D5DB;"></div>
              <span class="acc-name">고정 지출 (60개월 안분)</span>
            </div>
            <div class="acc-right">
              <span class="acc-amt">${Utils.formatKRW(row.고정지출)}</span>
              <span class="acc-arrow" id="acc-arrow-고정">▼</span>
            </div>
          </div>
          <div class="acc-body" id="acc-body-고정">
            <div class="detail-row"><span class="detail-name">인테리어 공사비</span><span class="detail-amt">${Utils.formatKRW(fixed.인테리어공사비)}</span></div>
            <div class="detail-row"><span class="detail-name">카페 장비 구매비</span><span class="detail-amt">${Utils.formatKRW(fixed.카페장비구매비)}</span></div>
            <div class="detail-row"><span class="detail-name">솔루션 장비비</span><span class="detail-amt">${Utils.formatKRW(fixed.솔루션장비비)}</span></div>
            <div class="detail-row"><span class="detail-name">가구비</span><span class="detail-amt">${Utils.formatKRW(fixed.가구비)}</span></div>
            <div class="subtotal-row"><span class="subtotal-name">소계</span><span class="subtotal-amt">${Utils.formatKRW(row.고정지출)}</span></div>
          </div>
        </div>
        <div class="acc-group">
          <div class="acc-hd" onclick="cafeToggle('특이')">
            <div class="acc-left">
              <div class="acc-dot" style="background:#FCA5A5;"></div>
              <span class="acc-name">특이 지출</span>
            </div>
            <div class="acc-right">
              <span class="acc-amt">${Utils.formatKRW(row.특이지출)}</span>
              <span class="acc-arrow" id="acc-arrow-특이">▼</span>
            </div>
          </div>
          <div class="acc-body" id="acc-body-특이">
            <div class="detail-row"><span class="detail-name">직책지원비</span><span class="detail-amt">${Utils.formatKRW(row.직책지원비)}</span></div>
            <div class="detail-row"><span class="detail-name">입사자지원비</span><span class="detail-amt">${Utils.formatKRW(row.입사자지원비)}</span></div>
            <div class="detail-row"><span class="detail-name">현장실습생</span><span class="detail-amt">${Utils.formatKRW(row.현장실습생)}</span></div>
            <div class="detail-row"><span class="detail-name">이벤트비</span><span class="detail-amt">${Utils.formatKRW(row.이벤트비)}</span></div>
            <div class="subtotal-row"><span class="subtotal-name">소계</span><span class="subtotal-amt">${Utils.formatKRW(row.특이지출)}</span></div>
          </div>
        </div>
        <div class="total-row">
          <span class="total-name">지출 합계</span>
          <span class="total-amt">${Utils.formatKRW(row.지출합계)}</span>
        </div>
        <div class="net-row ${row.순매출 >= 0 ? 'profit' : 'loss'}">
          <span class="net-name">순매출</span>
          <span class="net-amt">${Utils.formatKRW(row.순매출)}</span>
        </div>
      </div>

      <div class="rp-panel">
        <div class="c-card">
          <div class="c-head">
            <span class="c-title">월별 매출 추이</span>
            <span class="c-meta">${apiData.trend.length}개월</span>
          </div>
          <div class="trend-wrap">
            ${apiData.trend.map((t, i) => {
              const w = Math.max(Math.round((t.매출합계 / maxSales) * 100), 5);
              const isCur = t.month === row.month && t.year === row.year;
              const bg = isCur ? '#F5C800' : (i === apiData.trend.length - 2 ? '#FDE68A' : '#E5E7EB');
              return `<div class="t-row">
                <span class="t-month">${t.month}월</span>
                <div class="t-track">
                  <div class="t-fill" style="width:${w}%;background:${bg};">
                    <span class="t-val">${Math.round(t.매출합계/10000).toLocaleString()}만원</span>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="c-card">
          <div class="c-head">
            <span class="c-title">지출 비중</span>
            <span class="c-meta">${Utils.formatMan(row.지출합계)} 기준</span>
          </div>
          <div class="ratio-wrap">
            ${totalExpense > 0 ? `
            <div class="ratio-row">
              <div class="ratio-top">
                <span class="ratio-label"><span class="ratio-sdot" style="background:#93C5FD;"></span>변동 지출</span>
                <span class="ratio-val">${Math.round(row.변동지출/totalExpense*100)}% · ${Utils.formatMan(row.변동지출)}</span>
              </div>
              <div class="ratio-track"><div class="ratio-fill" style="width:${Math.round(row.변동지출/totalExpense*100)}%;background:#93C5FD;"></div></div>
            </div>
            <div class="ratio-row">
              <div class="ratio-top">
                <span class="ratio-label"><span class="ratio-sdot" style="background:#D1D5DB;"></span>고정 지출</span>
                <span class="ratio-val">${Math.round(row.고정지출/totalExpense*100)}% · ${Utils.formatMan(row.고정지출)}</span>
              </div>
              <div class="ratio-track"><div class="ratio-fill" style="width:${Math.round(row.고정지출/totalExpense*100)}%;background:#D1D5DB;"></div></div>
            </div>
            <div class="ratio-row">
              <div class="ratio-top">
                <span class="ratio-label"><span class="ratio-sdot" style="background:#FCA5A5;"></span>특이 지출</span>
                <span class="ratio-val">${Math.round(row.특이지출/totalExpense*100)}% · ${Utils.formatMan(row.특이지출)}</span>
              </div>
              <div class="ratio-track"><div class="ratio-fill" style="width:${Math.round(row.특이지출/totalExpense*100)}%;background:#FCA5A5;"></div></div>
            </div>` : '<div style="color:var(--text-3);font-size:12px;text-align:center;padding:8px 0;">데이터 없음</div>'}
          </div>
        </div>

        ${row.메모 ? `<div class="memo-strip"><span class="memo-lbl">메모</span><span class="memo-txt">${row.메모}</span></div>` : ''}

        <button class="btn btn-sm" style="width:100%;" onclick="openEditModal(${row.rowIndex}, ${JSON.stringify(row).replace(/"/g, '&quot;')})">
          이 달 데이터 수정
        </button>
      </div>
    </div>
  `;

  el.querySelectorAll('.m-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetRow = apiData.rows.find(r => r.month === Number(tab.dataset.month) && r.year === Number(tab.dataset.year));
      if (targetRow) renderCafe(el, apiData, targetRow, fixed);
    });
  });
}

window.cafeToggle = function(key) {
  const body = document.getElementById('acc-body-' + key);
  const arrow = document.getElementById('acc-arrow-' + key);
  if (!body || !arrow) return;
  body.classList.toggle('open');
  arrow.classList.toggle('open');
};

function openAddModal(year, month) {
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">월 매출 데이터 추가</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">연도</label><input type="number" class="form-input" id="add-year" value="${year}"></div>
          <div class="form-group"><label class="form-label">월</label><input type="number" class="form-input" id="add-month" value="${month}" min="1" max="12"></div>
        </div>
        <div class="form-group"><label class="form-label">매출합계 (원)</label><input type="number" class="form-input" id="add-sales" placeholder="예: 2162200"></div>
        <div class="form-group"><label class="form-label">재료 및 소모품비 (원)</label><input type="number" class="form-input" id="add-material" placeholder="예: 1995920"></div>
        <div class="form-group"><label class="form-label">직책지원비 (원)</label><input type="number" class="form-input" id="add-jikchaek" value="0"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">입사자지원비</label><input type="number" class="form-input" id="add-entry" value="0"></div>
          <div class="form-group"><label class="form-label">현장실습생</label><input type="number" class="form-input" id="add-intern" value="0"></div>
          <div class="form-group"><label class="form-label">이벤트비</label><input type="number" class="form-input" id="add-event" value="0"></div>
        </div>
        <div class="form-group"><label class="form-label">메모</label><input type="text" class="form-input" id="add-memo" placeholder="선택사항"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="Utils.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="submitAdd()">저장</button>
      </div>
    </div>
  `);
}

window.submitAdd = async function() {
  const row = {
    year: Number(document.getElementById('add-year').value),
    month: Number(document.getElementById('add-month').value),
    매출합계: Number(document.getElementById('add-sales').value),
    재료비: Number(document.getElementById('add-material').value),
    엘리가오더: 73500,
    직책지원비: Number(document.getElementById('add-jikchaek').value),
    입사자지원비: Number(document.getElementById('add-entry').value),
    현장실습생: Number(document.getElementById('add-intern').value),
    이벤트비: Number(document.getElementById('add-event').value),
    메모: document.getElementById('add-memo').value,
  };
  if (!row.매출합계) { Utils.toast('매출합계를 입력해주세요.', 'error'); return; }
  try {
    Utils.closeModal();
    await API.addCafeRow(row);
    Utils.toast('저장되었습니다.', 'success');
    await Router.go('cafe');
  } catch(err) { Utils.toast(`저장 실패: ${err.message}`, 'error'); }
};

window.openEditModal = function(rowIndex, rowData) {
  Utils.openModal(`
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title">${rowData.year}년 ${rowData.month}월 수정</span>
        <button class="modal-close" onclick="Utils.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">매출합계 (원)</label><input type="number" class="form-input" id="edit-sales" value="${rowData.매출합계}"></div>
        <div class="form-group"><label class="form-label">재료 및 소모품비 (원)</label><input type="number" class="form-input" id="edit-material" value="${rowData.재료비}"></div>
        <div class="form-group"><label class="form-label">직책지원비 (원)</label><input type="number" class="form-input" id="edit-jikchaek" value="${rowData.직책지원비}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">입사자지원비</label><input type="number" class="form-input" id="edit-entry" value="${rowData.입사자지원비}"></div>
          <div class="form-group"><label class="form-label">현장실습생</label><input type="number" class="form-input" id="edit-intern" value="${rowData.현장실습생}"></div>
          <div class="form-group"><label class="form-label">이벤트비</label><input type="number" class="form-input" id="edit-event" value="${rowData.이벤트비}"></div>
        </div>
        <div class="form-group"><label class="form-label">메모</label><input type="text" class="form-input" id="edit-memo" value="${rowData.메모}"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="Utils.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="submitEdit(${rowIndex},${rowData.year},${rowData.month})">수정</button>
      </div>
    </div>
  `);
};

window.submitEdit = async function(rowIndex, year, month) {
  const row = {
    year, month,
    매출합계: Number(document.getElementById('edit-sales').value),
    재료비: Number(document.getElementById('edit-material').value),
    엘리가오더: 73500,
    직책지원비: Number(document.getElementById('edit-jikchaek').value),
    입사자지원비: Number(document.getElementById('edit-entry').value),
    현장실습생: Number(document.getElementById('edit-intern').value),
    이벤트비: Number(document.getElementById('edit-event').value),
    메모: document.getElementById('edit-memo').value,
  };
  try {
    Utils.closeModal();
    await API.updateCafeRow(rowIndex, row);
    Utils.toast('수정되었습니다.', 'success');
    await Router.go('cafe');
  } catch(err) { Utils.toast(`수정 실패: ${err.message}`, 'error'); }
};

Pages.aiCost = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">AI 비용 현황</div><div class="ws-subtitle">비용 관리 · 월별 도구별 집계</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.algocare = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">알고케어 이용자 현황</div><div class="ws-subtitle">복지 현황 · 월별 이용자 집계</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.slack = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">슬랙 / 오피스키퍼</div><div class="ws-subtitle">인프라 · 분기별 사용 현황</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.input = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">데이터 입력</div></div></div></div><div class="ws-content"><div class="state-empty"><span>다음 단계에서 구현됩니다.</span></div></div>`;
};
Pages.permissions = async function(container) {
  container.innerHTML = `<div class="ws-header"><div class="ws-header-top"><div><div class="ws-title">권한 설정</div></div></div></div><div class="ws-content"><div class="state-empty"><span>Google OAuth 연동 후 구현됩니다.</span></div></div>`;
};
