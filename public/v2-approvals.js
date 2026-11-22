(function () {
  const filters = new Map();
  const groups = { pending: 'Chờ duyệt', checking: 'Chờ đối chiếu', history: 'Đã xử lý', all: 'Tất cả' };
  const paymentPending = 'CHO_BGD_DUYET';
  const paymentChecking = 'CHO_KT_KIEM_TRA';
  const deletePending = 'CHO_BGD_DONG_Y';

  function action(label, key, id, tone = 'soft') {
    return `<button type="button" class="btn btn-${tone}" data-np-module="approvals" data-np-action="${key}" data-np-id="${id}">${label}</button>`;
  }

  function fieldPairs(esc, entries) {
    return `<dl class="np-approval-fields">${entries.map(([label,value]) => `<div><dt>${label}</dt><dd>${esc(value || '—')}</dd></div>`).join('')}</dl>`;
  }

  function item({ icon, esc, title, meta, amount, status, tone, fields, actions }) {
    return `<article class="np-approval-item">
      <div class="np-approval-row"><span class="np-approval-symbol">${icon}</span>
        <div class="np-approval-person"><h3>${esc(title)}</h3><p>${esc(meta)}</p></div>
        <div class="np-approval-result">${amount ? `<strong>${esc(amount)}</strong>` : ''}<span class="np-approval-status" data-tone="${tone}">${status}</span></div>
      </div>
      <div class="np-approval-controls"><details><summary>Chi tiết</summary>${fields}</details>${actions ? `<div class="np-approval-actions">${actions}</div>` : ''}</div>
    </article>`;
  }

  function advanceItem(row, context) {
    const { esc, state, money, scaledDays } = context;
    const member = state.workers.find(item => item.code === row.workerCode) ||
      state.staffAttendance.find(item => item.code === row.workerCode || item.username === row.workerCode);
    const days = row.daysWorkedSoFar ?? (member ? scaledDays(member.daysMonthApproved) : 0);
    const salary = row.accruedSalary ?? row.accruedSalaryAtRequest ?? days * (member?.dailyWage || 0);
    const pending = row.status === paymentPending;
    const checking = row.status === paymentChecking;
    const approved = row.status === 'BGD_DA_DUYET';
    const id = esc(row.id);
    return item({
      icon: window.NPWorkspace.icon('money'), esc, title: row.workerName,
      meta: [row.teamName || member?.teamName, row.date].filter(Boolean).join(' · '),
      amount: money(row.amount), status: pending ? 'Chờ Giám đốc' : checking ? 'Chờ Kế toán' : approved ? 'Đã duyệt' : 'Đã từ chối',
      tone: pending ? 'pending' : checking ? 'checking' : approved ? 'done' : 'rejected',
      fields: fieldPairs(esc, [['Mã đơn', row.id], ['Mã nhân sự', row.workerCode], ['Vị trí', member?.roleName], ['Quản lý', member?.managerName], ['Công đã duyệt', days + ' công'], ['Lương lũy kế', money(salary)], ['Kế toán', row.checkedByKt], ['Lý do', row.reason], ['Người xử lý', row.approvedByBgd || row.rejectedByBgd]]),
      actions: !approved ? action('Duyệt chi', 'approve-advance', id, 'primary') : ''
    });
  }

  function deleteItem(row, context) {
    const { esc } = context;
    const pending = row.status === deletePending;
    const id = esc(row.id);
    return item({
      icon: window.NPWorkspace.icon('shield'), esc, title: row.targetName,
      meta: [row.targetType === 'ACCOUNT' ? 'Tài khoản' : 'Nhân sự', row.createdAt].filter(Boolean).join(' · '),
      status: pending ? 'Chờ duyệt' : row.status === 'DA_XOA' ? 'Đã xóa' : 'Đã từ chối',
      tone: pending ? 'pending' : row.status === 'DA_XOA' ? 'done' : 'rejected',
      fields: fieldPairs(esc, [['Mã yêu cầu', row.id], ['Mã đối tượng', row.targetCode], ['Chức vụ / đội', row.targetRole], ['Người gửi', row.requestedBy], ['Vai trò người gửi', row.requestedRole], ['Lý do', row.reason]]),
      actions: pending ? action('Từ chối', 'reject-delete', id) + action('Đồng ý xóa', 'approve-delete', id, 'danger') : ''
    });
  }

  const advanceGroup = row => row.status === paymentPending ? 'pending' : row.status === paymentChecking ? 'checking' : 'history';
  const deleteGroup = row => row.status === deletePending ? 'pending' : 'history';
  const statusOrder = ['pending','checking','history'];

  function render(_tab, context) {
    if (context.role !== 'BGD') return '';
    const { state, account, money, esc, rangeControl, scaledDays } = context;
    const requests = state.deleteRequests || [];
    const salaryWaiting = state.payrollMonthStatus === paymentPending;
    const salaryApproved = state.payrollMonthStatus === 'BGD_DA_DUYET';
    const advances = state.advances;
    const counts = Object.fromEntries(statusOrder.map(key => [key,
      advances.filter(row => advanceGroup(row) === key).length + requests.filter(row => deleteGroup(row) === key).length
    ]));
    const active = filters.get(account.id) || 'pending';
    const visible = group => active === 'all' || active === group;
    const selectedAdvances = advances.filter(row => visible(advanceGroup(row))).sort((a,b)=>statusOrder.indexOf(advanceGroup(a))-statusOrder.indexOf(advanceGroup(b)));
    const selectedDeletes = requests.filter(row => visible(deleteGroup(row))).sort((a,b)=>statusOrder.indexOf(deleteGroup(a))-statusOrder.indexOf(deleteGroup(b)));
    const gross = state.workers.reduce((sum, worker) => sum + scaledDays(worker.daysMonthApproved) * worker.dailyWage
      + Math.round((worker.otHoursMonthApproved || 0) * worker.dailyWage / 8 * 1.5), 0);
    const approved = advances.filter(row => row.status === 'BGD_DA_DUYET').reduce((sum,row)=>sum + Number(row.amount || 0),0);
    const icon = window.NPWorkspace.icon;
    return `<div class="np-approval">
      <section class="np-approval-payroll np-work-card"><div class="np-approval-payroll-heading"><span class="np-approval-symbol">${icon('calendar')}</span><div><h2>Bảng lương</h2><span class="np-approval-status" data-tone="${salaryWaiting ? 'pending' : salaryApproved ? 'done' : 'checking'}">${salaryWaiting ? 'Chờ duyệt' : salaryApproved ? 'Đã duyệt' : 'Chưa trình'}</span></div></div><div class="np-approval-payroll-total"><small>Tổng thực lĩnh dự tính</small><strong>${esc(money(gross-approved))}</strong></div><div class="np-approval-payroll-actions">${rangeControl}${salaryWaiting ? action('Duyệt bảng lương','approve-payroll','payroll','primary') : ''}</div></section>
      <div class="np-approval-links"><button class="btn btn-soft" type="button" data-np-target="v2-director-payments">${icon('money')} Duyệt thanh toán</button><button class="btn btn-soft" type="button" data-np-target="v2-director-quotes">${icon('folder')} Duyệt báo giá</button></div>
      <section class="np-work-card np-approval-requests">
        <h2>Yêu cầu nội bộ</h2>
        <div class="np-approval-filters" aria-label="Lọc yêu cầu">${Object.entries(groups).map(([key,label])=>`<button type="button" data-np-module="approvals" data-np-action="filter" data-np-id="${key}" aria-pressed="${active === key}">${label} <b>${key==='all' ? advances.length + requests.length : counts[key]}</b></button>`).join('')}</div>
        <div class="np-approval-list"><h3>Tạm ứng <small>${selectedAdvances.length}</small></h3>${selectedAdvances.map(row=>advanceItem(row,context)).join('') || '<p class="np-approval-empty">Không có đơn tạm ứng ở trạng thái này.</p>'}</div>
        <div class="np-approval-list"><h3>Yêu cầu xóa <small>${selectedDeletes.length}</small></h3>${selectedDeletes.map(row=>deleteItem(row,context)).join('') || '<p class="np-approval-empty">Không có yêu cầu xóa ở trạng thái này.</p>'}</div>
      </section>
    </div>`;
  }

  function handle(action, values, context) {
    if (context.role !== 'BGD') return;
    const id = values.get('id');
    if (action === 'filter' && Object.hasOwn(groups,id)) {
      filters.set(context.account.id,id);
      context.refresh();
      document.querySelector('.np-approval-filters [aria-pressed="true"]')?.focus({ preventScroll: true });
      return;
    }
    if (action === 'approve-advance') {
      window.NPApp.advanceStep(id, 'BGD');
      return;
    }
    if (action === 'approve-payroll') {
      window.NPApp.approveMonthlyPayroll();
      return;
    }
    const request = (context.state.deleteRequests || []).find(item => item.id === id && item.status === deletePending);
    if (!request) throw new Error('Yêu cầu này đã đổi trạng thái.');
    if (action === 'reject-delete') window.NPApp.directorRejectDeleteRequest(id);
    if (action === 'approve-delete') window.NPApp.directorApproveDeleteRequest(id);
  }

  window.NPApprovals = { render, handle };
})();
