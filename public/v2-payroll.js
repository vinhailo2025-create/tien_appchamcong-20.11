(() => {
  'use strict';

  const staffTab = 'v2-payroll-runs';
  const workerTab = 'v2-worker-payroll-runs';
  const actorOf = ctx => ctx.account.id;
  const field = (form, key) => String(form.get(key) || '').trim();
  const belongs = (ctx, projectId) => !ctx.account.projectId || ctx.account.projectId === 'ALL' || ctx.account.projectId === projectId;
  const load = ctx => ctx.data.payroll || { rates: [], runs: [] };
  const attendance = ctx => ctx.data.attendance || {};
  const published = ctx => Object.values(attendance(ctx).periods || {}).filter(item => item.status === 'locked' && item.snapshot).map(item => item.snapshot);
  const profiles = ctx => [...ctx.state.workers, ...(ctx.data.people?.employees || [])];
  const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value + 'T00:00:00Z'))
    && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value;
  function advanceDate(value) {
    const raw = String(value || '');
    return /^\d{2}\/\d{2}\/\d{4}$/.test(raw) ? raw.split('/').reverse().join('-') : raw;
  }

  const amount = value => /^\d{1,9}$/.test(value) ? Number(value) : NaN;
  const numberInput = name => `<input type="number" name="${name}" min="0" max="999999999" step="1" required>`;
  const rateAt = (rates, workerId, day) => rates.filter(rate => rate.workerId === workerId && rate.effective <= day)
    .sort((a,b) => b.effective.localeCompare(a.effective))[0];

  function calculate(ctx, sheet, data) {
    const adjustments = (attendance(ctx).corrections || []).filter(item => item.status === 'approved' && item.version === sheet.version);
    const lines = [];
    const missing = [];
    for (const worker of sheet.rows) {
      for (const {day, assignmentId} of worker.days) {
        const correction = adjustments.findLast(item => item.workerId === worker.id && item.day === day);
        const code = correction?.after ?? sheet.cells[`cell:${worker.id}:${day}`];
        const hours = window.NPAttendance.parseCode(code || '');
        if (!hours || (!hours.regular && !hours.ot)) continue;
        const date = sheet.month + '-' + String(day).padStart(2, '0');
        const rate = rateAt(data.rates, worker.id, date);
        if (!rate) {
          missing.push(worker.code + ' ngày ' + date);
          continue;
        }
        lines.push({
          workerId: worker.id, workerCode: worker.code, workerName: worker.name, date, assignmentId,
          rateId: rate.id, correctionId: correction?.id, hours: hours.regular, overtime: hours.ot,
          gross: Math.round(hours.regular * rate.regular + hours.ot * rate.overtime)
        });
      }
    }
    if (missing.length) throw new Error('Chưa có đơn giá hiệu lực cho ' + missing.slice(0, 3).join(', ') + (missing.length > 3 ? '…' : '.'));
    return lines;
  }

  function totals(run) {
    const out = new Map();
    for (const line of run.lines) {
      const worker = out.get(line.workerId) || { code: line.workerCode, name: line.workerName, hours: 0, overtime: 0, gross: 0, deduction: 0 };
      worker.hours += Math.round(line.hours * 100);
      worker.overtime += Math.round(line.overtime * 100);
      worker.gross += line.gross;
      out.set(line.workerId, worker);
    }
    for (const item of run.deductions || []) {
      const worker = out.get(item.workerId);
      if (worker) worker.deduction += item.amount;
    }
    return [...out].map(([id, item]) => ({ id, ...item, hours: item.hours / 100, overtime: item.overtime / 100, net: item.gross - item.deduction }));
  }

  function payrollRows(items, ctx) {
    return items.map(item => `<tr><td>${ctx.esc(item.code)}</td><td>${ctx.esc(item.name)}</td><td>${item.hours}</td><td>${item.overtime}</td>
      <td>${ctx.money(item.gross)}</td><td>${ctx.money(item.deduction)}</td><td>${ctx.money(item.net)}</td></tr>`).join('');
  }

  function advanceBalance(data, advance) {
    const allocations = data.runs.flatMap(run => run.deductions || []);
    return Number(advance.amount) - allocations.filter(item => item.advanceId === advance.id).reduce((sum,item) => sum + item.amount, 0);
  }

  function eligibleAdvances(ctx, data, run) {
    const workers = new Set(run.lines.map(line => line.workerCode));
    return ctx.state.advances.filter(item => item.status === 'BGD_DA_DUYET' && item.projectId === run.projectId
      && (!run.periodEnd || (isDate(advanceDate(item.date)) && advanceDate(item.date) <= run.periodEnd)) && workers.has(item.workerCode)
      && !run.deductions.some(entry => entry.advanceId === item.id) && advanceBalance(data,item) > 0);
  }

  function draftControls(run, ctx, data) {
    const advances = eligibleAdvances(ctx,data,run);
    return `${advances.length ? `<form class="np-admin-form" data-np-module="payroll" data-np-action="deduct">
      <input type="hidden" name="runId" value="${ctx.esc(run.id)}">
      <label>Khoản tạm ứng<select name="advanceId">${advances.map(item => `<option value="${ctx.esc(item.id)}">${ctx.esc(item.id)} · ${ctx.esc(item.workerCode)} · còn ${ctx.money(advanceBalance(data,item))}</option>`).join('')}</select></label>
      <label>Số tiền cấn trừ${numberInput('deduction')}</label>
      <label>Mã chứng từ<input name="reference" maxlength="80" required></label>
      <button type="submit" class="btn btn-soft">Ghi cấn trừ</button>
    </form>` : ''}
    <button type="button" class="btn btn-primary" data-np-module="payroll" data-np-action="publish" data-np-id="${ctx.esc(run.id)}">Công bố phiếu lương mẫu</button>`;
  }

  function render(tab, ctx) {
    const data = load(ctx);
    const { esc } = ctx;
    const isWorker = tab === workerTab && ctx.role === 'CN';
    if (!isWorker && (tab !== staffTab || ctx.role !== 'KT')) return '<p>Bạn không có quyền xem bảng lương này.</p>';
    const sheets = published(ctx).filter(item => belongs(ctx,item.projectId) && !data.runs.some(run => run.source === item.version));
    const workers = profiles(ctx);
    const rateList = data.rates.map(rate => `<li>${esc(workers.find(item => item.id === rate.workerId)?.code)} · ${esc(rate.contract)} · ${esc(rate.effective)} · ${ctx.money(rate.regular)}/giờ · TC ${ctx.money(rate.overtime)}/giờ</li>`).join('');
    const staffTools = `<details class="np-work-card"><summary>Đơn giá nhân công theo hợp đồng</summary>
      <form class="np-admin-form" data-np-module="payroll" data-np-action="rate">
        <label>Nhân sự<select name="workerId" required><option value="">Chọn nhân sự</option>${workers.map(item => `<option value="${esc(item.id)}">${esc(item.code)} · ${esc(item.name)}</option>`).join('')}</select></label>
        <label>Mã hợp đồng<input name="contract" maxlength="80" required></label>
        <label>Hiệu lực từ<input name="effective" type="date" required></label>
        <label>Đơn giá công thường / giờ${numberInput('regular')}</label>
        <label>Đơn giá tăng ca / giờ${numberInput('overtime')}</label>
        <button type="submit" class="btn btn-primary">Lưu phiên bản giá</button>
      </form><ul>${rateList || '<li>Chưa có đơn giá nhân công.</li>'}</ul>
    </details>
    <section class="np-work-card"><h2>Lập bảng lương mẫu</h2>
      ${sheets.length ? `<form class="np-admin-form" data-np-module="payroll" data-np-action="calculate">
        <label>Phiên bản bảng công<select name="source">${sheets.map(item => `<option value="${esc(item.version)}">${esc(item.version)}</option>`).join('')}</select></label>
        <button type="submit" class="btn btn-primary">Lập bản tính</button>
      </form>` : '<p>Chưa có bảng công đã khóa cần tính lương.</p>'}
    </section>`;
    const cards = data.runs.flatMap(run => {
      if (isWorker && run.status !== 'published') return [];
      if (!isWorker && !belongs(ctx, run.projectId)) return [];
      const people = totals(run).filter(item => !isWorker || item.code === ctx.account.workerCode);
      if (!people.length) return [];
      return [`<section class="np-work-card"><h2>${esc(run.source)}</h2><p>${run.status === 'published' ? 'Đã công bố' : 'Bản nháp'}</p>
        <div class="table-scroll"><table class="data-table"><thead><tr><th>Mã NV</th><th>Họ tên</th><th>Giờ công</th><th>Tăng ca</th><th>Tổng</th><th>Cấn trừ</th><th>Còn nhận</th></tr></thead>
        <tbody>${payrollRows(people,ctx)}</tbody></table></div>
        <button type="button" class="btn btn-soft" data-np-module="payroll" data-np-action="export" data-np-id="${esc(run.id)}">Xuất Excel</button>
        <button type="button" class="btn btn-soft" data-np-module="payroll" data-np-action="print" data-np-id="${esc(run.id)}">In / PDF</button>
        ${!isWorker && run.status === 'draft' ? draftControls(run,ctx,data) : ''}
        ${!isWorker && run.status === 'published' && !run.paymentId && people.some(item => item.net > 0) ? `<form class="np-admin-form" data-np-module="payroll" data-np-action="payment">
          <input type="hidden" name="runId" value="${esc(run.id)}">
          <label>Hạn thanh toán<input type="date" name="due" required></label>
          <button type="submit" class="btn btn-soft">Lập đề nghị thanh toán lương</button>
        </form>` : ''}
        ${!isWorker && run.paymentId ? `<p>Đề nghị thanh toán <strong>${esc(run.paymentId)}</strong></p>` : ''}
        </section>`];
    }).join('');
    return `<div class="np-admin">${isWorker ? '' : staffTools}${cards || '<section class="np-work-card"><p>Chưa có phiếu lương.</p></section>'}</div>`;
  }

  function handle(action, form, ctx) {
    const data = load(ctx);
    if (['export', 'print'].includes(action)) {
      const run = data.runs.find(item => item.id === field(form,'id'));
      const own = ctx.role === 'CN' && ctx.account.roleId === 'CN' && run?.status === 'published';
      if (!run || (!own && (ctx.role !== 'KT' || ctx.account.roleId !== 'KT' || !belongs(ctx,run.projectId)))) throw new Error('Phiếu lương ngoài phạm vi.');
      const items = totals(run).filter(item => !own || item.code === ctx.account.workerCode);
      if (!items.length) throw new Error('Không có phiếu lương được phép xem.');
      const rows = [['Mã NV', 'Họ tên', 'Giờ công', 'Tăng ca', 'Tổng (đ)', 'Cấn trừ (đ)', 'Còn nhận (đ)'],
        ...items.map(item => [item.code,item.name,item.hours,item.overtime,item.gross,item.deduction,item.net])];
      const name = 'Bang-luong-' + run.source.replaceAll('/', '-');
      return action === 'print' ? window.NPReport.print(rows, name) : window.NPReport.download(rows, name);
    }
    if (ctx.role !== 'KT' || ctx.account.roleId !== 'KT') throw new Error('Chỉ Kế toán được lập bảng lương.');
    if (action === 'rate') {
      const workerId = field(form,'workerId');
      const effective = field(form,'effective');
      const contract = field(form,'contract');
      const regular = amount(field(form,'regular'));
      const overtime = amount(field(form,'overtime'));
      if (!profiles(ctx).some(item => item.id === workerId) || !isDate(effective) || !contract || contract.length > 80
        || !Number.isFinite(regular) || !Number.isFinite(overtime)) throw new Error('Nhập đủ nhân sự, hợp đồng, ngày hiệu lực và đơn giá.');
      if (data.rates.some(rate => rate.workerId === workerId && rate.effective === effective)) throw new Error('Đã có đơn giá hiệu lực ngày này.');
      data.rates.push({ id: crypto.randomUUID(), workerId, contract, effective, regular, overtime, actor: actorOf(ctx), at: new Date().toISOString() });
    } else if (action === 'calculate') {
      const source = field(form,'source');
      const sheet = published(ctx).find(item => item.version === source && belongs(ctx,item.projectId));
      if (!sheet || data.runs.some(run => run.source === source)) throw new Error('Bảng công chưa khóa hoặc đã có bản tính.');
      const lines = calculate(ctx, sheet, data);
      if (!lines.length) throw new Error('Bảng công chưa có giờ công tính lương.');
      const lastDay = sheet.half === 'first' ? 15 : new Date(Number(sheet.month.slice(0,4)),Number(sheet.month.slice(5)),0).getDate();
      data.runs.unshift({ id: crypto.randomUUID(), source, projectId: sheet.projectId, teamId: sheet.teamId,
        periodEnd: sheet.month + '-' + lastDay, status: 'draft', lines, deductions: [],
        createdBy: actorOf(ctx), createdAt: new Date().toISOString() });
    } else if (action === 'deduct') {
      const run = data.runs.find(item => item.id === field(form,'runId') && belongs(ctx,item.projectId) && item.status === 'draft');
      const advance = run && eligibleAdvances(ctx,data,run).find(item => item.id === field(form,'advanceId'));
      const value = amount(field(form,'deduction'));
      const reference = field(form,'reference').toUpperCase();
      const worker = advance && totals(run).find(item => item.code === advance.workerCode);
      if (!worker || !value || value > worker.net || value > advanceBalance(data,advance) || !reference || reference.length > 80
        || data.runs.some(item => item.deductions.some(entry => entry.reference === reference))) {
        throw new Error('Kiểm tra số dư ứng, lương còn nhận và mã chứng từ chưa từng dùng.');
      }
      run.deductions.push({ advanceId: advance.id, workerId: worker.id, amount: value, reference, by: actorOf(ctx), at: new Date().toISOString() });
    } else if (action === 'payment') {
      const run = data.runs.find(item => item.id === field(form,'runId') && belongs(ctx,item.projectId) && item.status === 'published');
      const due = field(form,'due');
      const net = run && totals(run).reduce((sum, item) => sum + item.net, 0);
      if (!run || run.paymentId || !isDate(due) || !Number.isSafeInteger(net) || net <= 0) throw new Error('Chọn bảng lương đã công bố và hạn thanh toán hợp lệ.');
      run.paymentId = window.NPFinance.createPayrollPayment(ctx, run, net, due);
    } else if (action === 'publish') {
      const run = data.runs.find(item => item.id === field(form,'id') && belongs(ctx,item.projectId) && item.status === 'draft');
      if (!run) throw new Error('Phiếu lương đã thay đổi trạng thái.');
      run.status = 'published';
      run.publishedAt = new Date().toISOString();
      run.publishedBy = actorOf(ctx);
    } else {
      throw new Error('Thao tác không hợp lệ.');
    }
    ctx.data.payroll = data;
    ctx.save();
  }

  window.NPPayroll = { render, handle };
})();
