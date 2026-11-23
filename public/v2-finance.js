(function () {
  'use strict';

  const STATUS = {
    draft: 'Nháp', checked: 'Đã đối chiếu', eligible: 'Đủ điều kiện', pending: 'Chờ duyệt',
    approved: 'Đã duyệt', open: 'Chờ thu', partial: 'Một phần', paid: 'Đã chuyển',
    received: 'Đã thu', reconciled: 'Đã đối soát', rejected: 'Từ chối', cancelled: 'Đã hủy'
  };
  const STEP = {
    check: ['draft', 'checked', 'Đối chiếu'],
    qualify: ['checked', 'eligible', 'Xác nhận đủ điều kiện'],
    submit: ['eligible', 'pending', 'Trình Giám đốc'],
    approve: ['pending', 'approved', 'Duyệt đề nghị'],
    reject: ['pending', 'rejected', 'Từ chối']
  };
  const ACCOUNTANT = 'KT';
  const DIRECTOR = 'BGD';
  const payTab = 'v2-finance-payments';
  const directorTab = 'v2-director-payments';
  const filters = new Map();
  let feedback = '';

  const roleOf = context => context.account?.roleId || context.role;
  const actorOf = context => String(context.account?.id || context.account?.username || '');
  const fieldValue = (form, name) => String(form.get(name) ?? '').trim();
  const isoDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const balance = row => row.amount - row.transactions.reduce((sum, item) => sum + item.amount, 0);
  const isActive = row => !['cancelled', 'rejected'].includes(row.status);
  const transactionStatus = row => row.kind === 'payable' ? 'paid' : 'received';
  const dateLabel = day => day.split('-').reverse().join('/');
  const positiveInteger = value => /^[1-9]\d{0,11}$/.test(value) ? Number(value) : 0;
  const isConfirmed = row => isActive(row) && (row.kind === 'receivable' || ['approved', 'partial', 'paid', 'reconciled'].includes(row.status));

  function accessibleProjects(context) {
    const scope = context.account?.projectId;
    return (context.state?.projects || []).filter(project => !scope || scope === 'ALL' || project.id === scope);
  }

  const sameText = value => String(value || '').trim().toLocaleLowerCase('vi');

  function ledger(context) {
    if (context.data.finance) return context.data.finance;
    const project = (context.state?.projects || [])[0];
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const samples = [
      ['DEMO-CHI-001', 'payable', 'Đội thi công mẫu A', 'Thanh toán khối lượng kỳ 1', 187000000, 'pending', 'team'],
      ['DEMO-CHI-002', 'payable', 'Đội thi công mẫu B', 'Thanh toán khối lượng kỳ 1', 64000000, 'approved', 'team'],
      ['DEMO-CHI-003', 'payable', 'Bộ phận nhân công', 'Chi phí nhân công kỳ 1', 379000000, 'approved', 'labor'],
      ['DEMO-CHI-004', 'payable', 'Kho vật tư mẫu', 'Vật tư đưa vào công trình', 41000000, 'approved', 'materials'],
      ['DEMO-CHI-005', 'payable', 'Dịch vụ vận chuyển mẫu', 'Chi phí vận hành kỳ 1', 28000000, 'approved', 'other'],
      ['DEMO-THU-001', 'receivable', 'Đối tác mẫu Riverside', 'Phải thu đợt nghiệm thu 1', 620000000, 'open', null]
    ];
    context.data.finance = { rows: project ? samples.map(([id, kind, party, description, amount, status, costCategory]) => ({
      id, kind, party, description, amount, status, costCategory, due: isoDay(due), projectId: project.id,
      source: `HS-${id}`, createdBy: 'demo-seed', transactions: [], events: []
    })) : [] };
    return context.data.finance;
  }

  function button(action, label, id) {
    return `<button type="button" data-np-module="finance" data-np-action="${action}" data-np-id="${id}">${label}</button>`;
  }

  function summarize(rows) {
    const today = isoDay(new Date());
    const confirmed = rows.filter(isConfirmed);
    const outstanding = kind => confirmed.filter(row => row.kind === kind).reduce((sum, row) => sum + balance(row), 0);
    const transferred = kind => confirmed.filter(row => row.kind === kind).reduce((sum, row) => sum + row.amount - balance(row), 0);
    return {
      receivable: outstanding('receivable'), payable: outstanding('payable'),
      paid: transferred('payable'), received: transferred('receivable'),
      pendingCount: rows.filter(row => row.status === 'pending').length,
      overdueCount: confirmed.filter(row => row.due < today && balance(row) > 0).length
    };
  }

  function summary(context) {
    if (![ACCOUNTANT, DIRECTOR].includes(roleOf(context))) return summarize([]);
    const projects = accessibleProjects(context);
    return summarize(ledger(context).rows.filter(row => projects.some(project => project.id === row.projectId)));
  }

  function rowActions(row, context) {
    const id = context.esc(row.id);
    const role = roleOf(context);
    if (role === DIRECTOR && row.status === 'pending' && row.createdBy !== actorOf(context)) {
      return button('approve', STEP.approve[2], id) + button('reject', STEP.reject[2], id);
    }
    if (role !== ACCOUNTANT) return '';
    const actions = Object.entries(STEP).filter(([action, [from]]) => row.status === from && !['approve', 'reject'].includes(action));
    const controls = actions.map(([action, step]) => button(action, step[2], id));
    if (['draft', 'checked', 'eligible', 'pending', 'open'].includes(row.status) && !row.transactions.length) {
      controls.push(button('cancel', 'Hủy chứng từ', id));
    }
    if (['approved', 'open', 'partial'].includes(row.status)) {
      const payable = row.kind === 'payable';
      controls.push(`<details class="np-finance-action"><summary>${payable ? 'Ghi nhận chi' : 'Ghi nhận thu'}</summary>
        <form data-np-module="finance" data-np-action="transfer">
          <input type="hidden" name="id" value="${id}" />
          <label>Số tiền (đ)<input name="amount" type="number" min="1" max="${balance(row)}" step="1" required /></label>
          <label>Mã giao dịch / chứng từ<input name="reference" maxlength="60" required /></label>
          <label class="np-finance-check"><input name="verified" type="checkbox" required /> Đã xác nhận đối tác và chứng từ</label>
          <button type="submit">Lưu giao dịch</button>
        </form></details>`);
    }
    if (row.transactions.some(transaction => !transaction.reconciled)) {
      controls.push(`<details class="np-finance-action"><summary>Đối soát giao dịch</summary>
        <form data-np-module="finance" data-np-action="reconcile">
          <input type="hidden" name="id" value="${id}" />
          <label>Giao dịch trên sao kê<select name="reference" required>${row.transactions.filter(transaction => !transaction.reconciled).map(transaction => `<option value="${context.esc(transaction.reference)}">${context.esc(transaction.reference)} · ${context.money(transaction.amount)}</option>`).join('')}</select></label>
          <label class="np-finance-check"><input name="verified" type="checkbox" required /> Đã khớp số tiền và mã giao dịch</label>
          <button type="submit">Xác nhận đối soát</button>
        </form></details>`);
    }
    return controls.join('');
  }

  function createForm(context, projects) {
    return `<details class="np-finance-create"><summary>+ Lập chứng từ</summary>
      <form class="np-finance-fields" data-np-module="finance" data-np-action="create">
        <label>Loại<select name="kind"><option value="payable">Phải trả</option><option value="receivable">Phải thu</option></select></label>
        <label>Nhóm chi phí (phải trả)<select name="costCategory"><option value="labor">Nhân công</option><option value="team">Đội khoán</option><option value="materials">Vật tư</option><option value="other" selected>Chi phí khác</option></select></label>
        <label>Mã chứng từ<input name="code" maxlength="40" placeholder="VD-001" required /></label>
        <label>Công trình<select name="projectId" required>${projects.map(project => `<option value="${context.esc(project.id)}">${context.esc(project.name)}</option>`).join('')}</select></label>
        <label>Đối tác / người nhận<input name="party" maxlength="100" required /></label>
        <label>Hồ sơ nguồn<input name="source" maxlength="80" placeholder="Hợp đồng, nghiệm thu hoặc hóa đơn" required /></label>
        <label>Diễn giải<input name="description" maxlength="150" required /></label>
        <label>Số tiền (đ)<input name="amount" type="number" min="1" max="999999999999" step="1" required /></label>
        <label>Kỳ chứng từ<input name="period" type="month" required /></label>
        <label>Hạn thanh toán<input name="due" type="date" required /></label>
        <button type="submit">Lưu chứng từ</button>
      </form>
    </details>`;
  }

  function createPayrollPayment(context, run, net, due) {
    if (roleOf(context) !== ACCOUNTANT || !accessibleProjects(context).some(item => item.id === run.projectId)) throw new Error('Bảng lương ngoài phạm vi.');
    const rows = ledger(context).rows;
    if (rows.some(row => row.payrollRunId === run.id)) throw new Error('Bảng lương đã có đề nghị thanh toán.');
    const team = context.state.teams.find(item => item.id === run.teamId);
    const row = {
      id: 'LUONG-' + run.id.toUpperCase(), kind: 'payable', status: 'draft', projectId: run.projectId,
      party: team?.name || 'Nhân sự', source: run.source, period: run.periodEnd, description: 'Thanh toán bảng lương',
      amount: net, due, costCategory: 'labor', payrollRunId: run.id, createdBy: actorOf(context), transactions: [], events: []
    };
    recordEvent(row, context, 'Lập chứng từ từ bảng lương');
    rows.push(row);
    return row.id;
  }

  function openDetail(row, context, project) {
    const dialog = document.getElementById('npFinanceDetail');
    if (!dialog || dialog.open) return;
    const { esc, money } = context;
    const fields = [
      ['Đối tác / người nhận', row.party],
      ['Công trình', project.name],
      ['Loại chứng từ', row.kind === 'payable' ? 'Phải trả' : 'Phải thu'],
      ['Hồ sơ nguồn', row.source],
      ['Kỳ', row.period],
      ['Nội dung', row.description],
      ['Ngày đến hạn', dateLabel(row.due)]
    ];
    const actions = rowActions(row, context);
    dialog.innerHTML = `
      <header class="np-finance-detail-head">
        <div><p>Chi tiết chứng từ</p><h2 id="npFinanceDetailTitle">${esc(row.id)}</h2></div>
        <form method="dialog"><button type="submit" class="btn btn-soft" aria-label="Đóng chi tiết" autofocus>✕</button></form>
      </header>
      <div class="np-finance-detail-body">
        <span class="np-finance-status" data-status="${row.status}">${STATUS[row.status]}</span>
        <div class="np-finance-detail-totals">
          <div><span>Số tiền</span><strong>${money(row.amount)}</strong></div>
          <div><span>Còn lại</span><strong>${isActive(row) ? money(balance(row)) : '—'}</strong></div>
        </div>
        <dl class="np-finance-detail-fields">${fields.filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value || '—')}</dd></div>`).join('')}</dl>
        <section class="np-finance-detail-history"><h3>Giao dịch và xử lý</h3>${transactionHistory(row, context, true) || '<p>Chưa có giao dịch hoặc nhật ký.</p>'}</section>
        ${actions ? `<section class="np-finance-detail-actions"><h3>Thao tác</h3><div class="np-finance-actions">${actions}</div></section>` : ''}
      </div>`;
    dialog.showModal();
  }

  function render(tab, context) {
    const role = roleOf(context);
    if (tab !== payTab && tab !== directorTab) return '';
    if ((tab === payTab && role !== ACCOUNTANT) || (tab === directorTab && role !== DIRECTOR)) return '<p>Bạn không có quyền xem mục này.</p>';

    const projects = accessibleProjects(context);
    const allRows = ledger(context).rows.filter(row => projects.some(project => project.id === row.projectId));
    const actor = actorOf(context);
    if (context.projectNav && projects.some(project => project.id === context.projectNav)) {
      filters.set(actor, { projectId: context.projectNav });
      context.setProjectNav('');
    }
    const filter = filters.get(actor) || {};
    const rows = allRows.filter(row => (!filter.projectId || row.projectId === filter.projectId)
      && (!filter.kind || filter.kind === row.kind) && (!filter.status || filter.status === row.status));
    const totals = summarize(rows);
    const pageSize = 50;
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(filter.page || 1, pageCount);
    const offset = (page - 1) * pageSize;
    const visibleRows = [...rows].reverse().slice(offset, offset + pageSize);
    const today = isoDay(new Date());
    const esc = context.esc;
    const icon = window.NPWorkspace.icon;
    return `<section class="np-finance">
      <header class="np-finance-head"><div class="np-finance-title"><span class="np-finance-title-icon">${icon('money')}</span><div><h1>${role === DIRECTOR ? 'Duyệt chi & Công nợ' : 'Thanh toán & Công nợ'}</h1><p>${projects.length} công trình · Dữ liệu mẫu</p></div></div>${role === ACCOUNTANT && projects.length ? createForm(context, projects) : ''}</header>
      <div class="np-finance-filters"><form data-np-module="finance" data-np-action="filter">
        <label>Công trình<select name="projectId"><option value="">Tất cả</option>${projects.map(project => `<option value="${esc(project.id)}" ${filter.projectId === project.id ? 'selected' : ''}>${esc(project.name)}</option>`).join('')}</select></label>
        <label>Loại<select name="kind"><option value="">Tất cả</option><option value="payable" ${filter.kind === 'payable' ? 'selected' : ''}>Phải trả</option><option value="receivable" ${filter.kind === 'receivable' ? 'selected' : ''}>Phải thu</option></select></label>
        <label>Trạng thái<select name="status"><option value="">Tất cả</option>${Object.entries(STATUS).map(([key, label]) => `<option value="${key}" ${filter.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <button type="submit">${icon('filter')} Lọc</button>
      </form></div>
      <div class="np-finance-kpis">
        ${[
          ['arrow-down', 'Còn phải thu', context.money(totals.receivable)],
          ['arrow-up', 'Còn phải trả đã duyệt', context.money(totals.payable)],
          ['clipboard', 'Đề nghị chờ duyệt', totals.pendingCount],
          ['clock', 'Chứng từ quá hạn', totals.overdueCount]
        ].map(([symbol, label, value]) => `<article><span class="np-finance-metric-icon">${icon(symbol)}</span><span>${label}</span><strong>${value}</strong></article>`).join('')}
      </div>
      <p class="np-finance-feedback" role="status" data-finance-feedback>${esc(feedback)}</p>
      <div class="np-finance-table" tabindex="0" role="region" aria-label="Thanh toán và công nợ">
        <table><thead><tr><th>Chứng từ</th><th>Đối tác / Công trình</th><th>Nội dung</th><th>Số tiền</th><th>Còn lại</th><th>Đến hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>${visibleRows.length ? visibleRows.map(row => `<tr>
          <td><strong>${esc(row.id)}</strong><small>${row.kind === 'payable' ? 'Phải trả' : 'Phải thu'}</small></td>
          <td>${esc(row.party)}<small>${esc(projects.find(project => project.id === row.projectId).name)}</small></td>
          <td>${esc(row.description)}<small>Hồ sơ ${esc(row.source)}</small></td>
          <td>${context.money(row.amount)}</td><td>${isActive(row) ? context.money(balance(row)) : '—'}</td>
          <td>${dateLabel(row.due)}${isConfirmed(row) && row.due < today && balance(row) > 0 ? '<small class="np-finance-overdue">Quá hạn</small>' : ''}</td>
          <td><span class="np-finance-status" data-status="${row.status}">${STATUS[row.status]}</span></td>
          <td><div class="np-finance-actions">${button('detail', 'Chi tiết', esc(row.id))}${rowActions(row, context)}</div></td>
        </tr>`).join('') : '<tr><td colspan="8" class="np-finance-empty">Chưa có chứng từ phù hợp.</td></tr>'}</tbody></table>
      </div>
      ${pageCount > 1 ? `<nav class="np-finance-pagination" aria-label="Phân trang chứng từ"><span>${offset + 1}–${offset + visibleRows.length} / ${rows.length}</span><button type="button" data-np-module="finance" data-np-action="page" data-np-id="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Trước</button><span>Trang ${page} / ${pageCount}</span><button type="button" data-np-module="finance" data-np-action="page" data-np-id="${page + 1}" ${page >= pageCount ? 'disabled' : ''}>Sau</button></nav>` : ''}
      <dialog class="np-detail-dialog np-finance-detail" id="npFinanceDetail" aria-labelledby="npFinanceDetailTitle"></dialog>
    </section>`;
  }

  function transactionHistory(row, context, expanded = false) {
    if (!row.transactions.length && !row.events.length) return '';
    return `<details class="np-finance-history"${expanded ? ' open' : ''}><summary>Lịch sử</summary>
      <ul>${row.transactions.map(item => `<li>${context.esc(item.reference)} · ${context.money(item.amount)} · ${item.reconciled ? 'Đã đối soát' : 'Chưa đối soát'}</li>`).join('')}
      ${[...row.events].reverse().map(event => `<li>${context.esc(event.label)} · ${context.esc(event.actor)} · ${dateLabel(event.date)}</li>`).join('')}</ul></details>`;
  }

  function recordEvent(row, context, label) {
    row.events.push({ label, actor: context.account.fullName || actorOf(context), date: isoDay(new Date()) });
  }

  function fail(message) {
    feedback = message;
    const output = document.querySelector('[data-finance-feedback]');
    if (output) output.textContent = feedback;
    return false;
  }

  function finish(context, message) {
    feedback = message;
    context.save();
    return true;
  }

  function handle(action, form, context) {
    const role = roleOf(context);
    const actor = actorOf(context);
    if (!actor || ![ACCOUNTANT, DIRECTOR].includes(role)) return fail('Bạn không có quyền thực hiện thao tác này.');
    const { rows } = ledger(context);
    const projects = accessibleProjects(context);
    const value = name => fieldValue(form, name);

    if (action === 'filter') {
      filters.set(actor, { projectId: value('projectId'), kind: value('kind'), status: value('status') });
      return finish(context, 'Đã cập nhật bộ lọc.');
    }

    if (action === 'page') {
      const current = filters.get(actor) || {};
      const page = Number(value('id'));
      if (!Number.isInteger(page) || page < 1) return;
      filters.set(actor, { ...current, page });
      context.refresh();
      document.querySelector('.np-finance-table')?.scrollIntoView({ block: 'start' });
      return;
    }

    if (action === 'create' && role === ACCOUNTANT) {
      const id = value('code').toUpperCase();
      const kind = value('kind');
      const projectId = value('projectId');
      const party = value('party');
      const source = value('source');
      const description = value('description');
      const amount = positiveInteger(value('amount'));
      const due = value('due');
      const period = value('period');
      const parsedDue = new Date(`${due}T00:00:00`);
      if (!/^[A-Z0-9][A-Z0-9._/-]{0,39}$/.test(id) || !['payable', 'receivable'].includes(kind)
        || !projects.some(project => project.id === projectId) || !party || party.length > 100 || !source || source.length > 80
        || !description || description.length > 150 || !amount || !/^\d{4}-\d{2}-\d{2}$/.test(due) || isoDay(parsedDue) !== due) {
        return fail('Vui lòng kiểm tra lại thông tin bắt buộc, mã chứng từ, hạn và số tiền.');
      }
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return fail('Chọn kỳ của chứng từ.');
      if (rows.some(row => row.id === id)) return fail('Mã chứng từ này đã tồn tại.');
      if (rows.some(row => isActive(row) && row.kind === kind && row.projectId === projectId && sameText(row.source) === sameText(source)
        && sameText(row.party) === sameText(party) && row.period === period && row.amount === amount)) {
        return fail('Đã có chứng từ cùng hồ sơ, đối tượng, kỳ và số tiền.');
      }
      const group = value('costCategory');
      const costCategory = kind === 'payable' && ['labor', 'team', 'materials', 'other'].includes(group) ? group : null;
      const row = { id, kind, projectId, party, source, description, amount, due, period, costCategory, createdBy: actor,
        status: kind === 'payable' ? 'draft' : 'open', transactions: [], events: [] };
      recordEvent(row, context, 'Lập chứng từ');
      rows.push(row);
      filters.delete(actor);
      return finish(context, `Đã lưu chứng từ ${id}.`);
    }

    const row = rows.find(item => item.id === value('id') && projects.some(project => project.id === item.projectId));
    if (!row) return fail('Không tìm thấy chứng từ trong phạm vi được phép.');
    if (action === 'detail') {
      openDetail(row, context, projects.find(project => project.id === row.projectId));
      return;
    }
    if (Object.hasOwn(STEP, action)) {
      const [from, to, label] = STEP[action];
      const approval = ['approve', 'reject'].includes(action);
      if (role !== (approval ? DIRECTOR : ACCOUNTANT)) return fail('Tài khoản không được phép xử lý bước này.');
      if (approval && row.createdBy === actor) return fail('Người lập không được tự xử lý duyệt đề nghị.');
      if (row.status !== from || row.kind !== 'payable') return fail('Thao tác này đã được xử lý hoặc chưa đến bước thực hiện.');
      row.status = to;
      recordEvent(row, context, label);
      return finish(context, `${STATUS[to]} · ${row.id}.`);
    }

    if (role !== ACCOUNTANT) return fail('Chỉ Kế toán có thể ghi nhận giao dịch.');
    if (action === 'cancel' && ['draft', 'checked', 'eligible', 'pending', 'open'].includes(row.status) && !row.transactions.length) {
      row.status = 'cancelled';
      recordEvent(row, context, 'Hủy chứng từ');
      return finish(context, `Đã hủy chứng từ ${row.id}.`);
    }
    const reference = value('reference').toUpperCase();
    if (action === 'transfer' && ['approved', 'open', 'partial'].includes(row.status)) {
      const amount = positiveInteger(value('amount'));
      if (!amount || amount > balance(row)) return fail('Số tiền phải lớn hơn 0 và không vượt số dư.');
      if (!/^[A-Z0-9][A-Z0-9._/-]{0,59}$/.test(reference) || value('verified') !== 'on') {
        return fail('Vui lòng nhập mã giao dịch hợp lệ và xác nhận đối tác, chứng từ.');
      }
      if (rows.some(item => item.transactions.some(transaction => transaction.reference === reference))) {
        return fail('Mã giao dịch đã được ghi nhận. Số dư không thay đổi.');
      }
      row.transactions.push({ amount, reference, reconciled: false });
      row.status = balance(row) ? 'partial' : transactionStatus(row);
      recordEvent(row, context, row.kind === 'payable' ? 'Ghi nhận chi' : 'Ghi nhận thu');
      return finish(context, `Đã ghi nhận giao dịch ${reference}.`);
    }
    if (action === 'reconcile') {
      const transaction = row.transactions.find(item => item.reference === reference && !item.reconciled);
      if (!transaction || value('verified') !== 'on') return fail('Giao dịch đã đối soát hoặc chưa được xác nhận.');
      transaction.reconciled = true;
      if (!balance(row) && row.transactions.every(item => item.reconciled)) row.status = 'reconciled';
      recordEvent(row, context, 'Đối soát giao dịch');
      return finish(context, `Đã đối soát giao dịch ${reference}.`);
    }
    return fail('Chứng từ đã thay đổi trạng thái. Vui lòng kiểm tra lại.');
  }

  window.NPFinance = { render, handle, summary, createPayrollPayment };
})();
