(function () {
  'use strict';

  const clients = [
    { id: 'KD-KH-01', name: 'Công ty Mẫu Ánh Dương', contact: 'Lê Minh Tân', detail: 'Ban điều hành công trình' },
    { id: 'KD-KH-02', name: 'Công ty Mẫu Vườn Mây', contact: 'Mai Thanh Vy', detail: 'Bộ phận mua hàng' }
  ];
  const requests = [
    { id: 'KD-YC-01', clientId: 'KD-KH-01', project: 'Nhà mẫu Ánh Dương', scope: 'Tổ thi công hoàn thiện', quantity: 20, date: '2026-11-26' },
    { id: 'KD-YC-02', clientId: 'KD-KH-02', project: 'Khu mẫu Vườn Mây', scope: 'Tổ lắp dựng giàn giáo', quantity: 12, date: '2026-12-04' }
  ];
  const quotes = [
    { id: 'KD-BG-01-v1', code: 'KD-BG-01', requestId: 'KD-YC-01', version: 1, quantity: 20, rate: 6500000, validThrough: '2026-12-12', status: 'approved', author: 'Hồ sơ mẫu', decision: 'Đồng ý theo phạm vi chào giá.' },
    { id: 'KD-BG-02-v1', code: 'KD-BG-02', requestId: 'KD-YC-02', version: 1, quantity: 12, rate: 7400000, validThrough: '2026-12-15', status: 'pending', author: 'Hồ sơ mẫu' }
  ];
  const contracts = [
    { id: 'KD-HD-01', number: 'HD-MAU-001', quoteId: 'KD-BG-01-v1', start: '2026-11-26', end: '2026-12-31', cycle: 'Theo đợt', dueDays: 30, vat: 10, retention: 5, thirdParty: '' }
  ];
  const acceptance = [
    { id: 'KD-NT-01', contractId: 'KD-HD-01', date: '2026-11-30', performed: 8, accepted: 7, approver: 'Đại diện khách hàng mẫu', reference: 'BBNT-MAU-01' }
  ];
  const receivables = [
    { id: 'KD-PT-01', acceptanceId: 'KD-NT-01', amount: 47775000, paid: 15000000, invoice: 'HDĐT-MAU-01', due: '2026-12-30' }
  ];
  const priceEntries = [
    { type: 'A', group: 'Công ty Mẫu Ánh Dương', item: 'Thi công hoàn thiện', unit: 'Tổ/đợt', version: 1, price: 6500000, effective: '2026-11-20' },
    { type: 'B', group: 'Đội khoán mẫu 01', item: 'Thi công hoàn thiện', unit: 'Tổ/đợt', version: 1, price: 4800000, effective: '2026-11-20' }
  ];

  const quoteStatuses = { draft: 'Bản nháp', pending: 'Chờ Giám đốc duyệt', approved: 'Đã duyệt', rejected: 'Yêu cầu chỉnh sửa', superseded: 'Đã thay phiên bản' };
  const badgeClasses = { draft: 'badge-navy', pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', superseded: 'badge-navy' };
  const directorRoles = ['BGD', 'GD', 'GĐ'];
  let notice = null;

  function getState(data) {
    if (!data.business) {
      data.business = JSON.parse(JSON.stringify({ clients, requests, quotes, contracts, acceptance, receivables, annexes: [], prices: priceEntries }));
    }
    if (!data.business.prices) data.business.prices = JSON.parse(JSON.stringify(priceEntries));
    return data.business;
  }

  const lookup = (rows, id) => rows.find(row => row.id === id);
  const latest = (quote, rows) => !rows.some(row => row.code === quote.code && row.version > quote.version);
  const nextId = (rows, prefix) => prefix + String(rows.length + 1).padStart(2, '0');
  const displayDate = (value) => value ? value.split('-').reverse().join('/') : '—';
  const roleCode = ({ role, account }) => (typeof role === 'string' ? role : role?.id) || account?.roleId;
  const heading = (title, text) => `<div class="np-kd-heading"><div><h2>${title}</h2><p>${text}</p></div></div>`;
  const panel = (title, content) => `<section class="section-card np-kd-panel"><h3>${title}</h3>${content}</section>`;
  const actionForm = (action, html, label, className = '') => `<form class="np-kd-form ${className}" data-np-module="business" data-np-action="${action}">${html}<button class="btn btn-primary" type="submit">${label}</button></form>`;
  const field = (title, control) => `<label class="np-kd-field"><span>${title}</span>${control}</label>`;
  const textInput = (name, max = 120, required = true) => `<input name="${name}" maxlength="${max}" ${required ? 'required' : ''}>`;
  const dateInput = (name) => `<input type="date" name="${name}" required>`;
  const numberInput = (name, min = 1, max = 1000000000, value = '') => `<input type="number" name="${name}" min="${min}" max="${max}" value="${value}" required>`;

  function render(tab, context) {
    const { data, esc, money } = context;
    const role = roleCode(context);
    const isDirector = directorRoles.includes(role);
    if (tab === 'v2-director-quotes' ? !isDirector : role !== 'KD') return '';
    const state = getState(data);
    const { clients, requests, quotes, contracts, acceptance, receivables, annexes, prices } = state;
    const h = (value) => esc(String(value ?? ''));
    const cash = (value) => h(money(value));
    const nameFor = (request) => lookup(clients, request?.clientId)?.name || '—';
    const requestFor = (quote) => lookup(requests, quote?.requestId);
    const inputId = (id) => `<input type="hidden" name="id" value="${h(id)}">`;
    const select = (name, rows, getLabel) => `<select name="${name}" required><option value="">Chọn từ danh sách</option>${rows.map(row => `<option value="${h(row.id)}">${h(getLabel(row))}</option>`).join('')}</select>`;
    const text = (value) => h(value || '—');
    const status = (q) => `<span class="badge ${badgeClasses[q.status]}">${quoteStatuses[q.status]}</span>`;
    const table = (headers, rows) => rows.length ? `<div class="np-kd-table" tabindex="0" aria-label="Bảng dữ liệu"><table><thead><tr>${headers.map(name => `<th scope="col">${name}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="np-kd-empty">Chưa có hồ sơ.</p>';
    const quoteFields = field('Số lượng chào giá', numberInput('quantity')) + field('Đơn giá bán (đ)', numberInput('rate')) + field('Hiệu lực đến', dateInput('validThrough')) + field('Mã/tên chứng từ', textInput('reference', 100, false));
    let body = '';

    if (tab === 'kd-clients') {
      body = heading('Khách hàng & Cơ hội', 'Theo dõi đầu mối liên hệ và nhu cầu cung ứng theo công trình.');
      body += `<div class="np-kd-grid">${panel('Thêm khách hàng', actionForm('add-client', field('Tên đơn vị', textInput('name')) + field('Người liên hệ', textInput('contact')) + field('Ghi chú liên hệ', textInput('detail', 200, false)), 'Lưu khách hàng'))}${panel('Tạo nhu cầu cung ứng', actionForm('add-request', field('Khách hàng', select('clientId', clients, row => row.name)) + field('Công trình', textInput('project')) + field('Nhu cầu', textInput('scope')) + field('Quân số dự kiến', numberInput('quantity', 1, 100000)) + field('Ngày cần', dateInput('date')), 'Lưu nhu cầu'))}</div>`;
      body += panel('Danh sách khách hàng', table(['Mã', 'Khách hàng', 'Người liên hệ', 'Ghi chú', 'Nhu cầu', 'Hợp đồng'], clients.map(row => [
        h(row.id), h(row.name), h(row.contact), text(row.detail), requests.filter(request => request.clientId === row.id).length,
        contracts.filter(contract => requestFor(lookup(quotes, contract.quoteId))?.clientId === row.id).length
      ])));
      body += panel('Nhu cầu cung ứng', table(['Mã', 'Khách hàng', 'Công trình', 'Nhu cầu', 'Quân số', 'Ngày cần', 'Giai đoạn'], requests.map(row => {
        const related = quotes.filter(quote => quote.requestId === row.id);
        const contracted = contracts.some(contract => related.some(quote => quote.id === contract.quoteId));
        return [h(row.id), h(nameFor(row)), h(row.project), h(row.scope), row.quantity, displayDate(row.date), contracted ? 'Đã lập hợp đồng' : related.length ? 'Đang xử lý báo giá' : 'Chờ báo giá'];
      })));
    }

    if (tab === 'kd-quotes' || tab === 'v2-director-quotes') {
      body = isDirector ? heading('Duyệt báo giá', 'Xem đơn giá bán, phiên bản và phản hồi cho Kinh doanh.')
        : heading('Báo giá & Phiên bản', 'Lập, sửa phiên bản và gửi Giám đốc duyệt trước khi tạo hợp đồng.');
      if (!isDirector) body += panel('Lập báo giá', actionForm('add-quote', field('Nhu cầu cung ứng', select('requestId', requests, row => `${row.id} · ${row.project}`)) + quoteFields, 'Lưu bản nháp'));
      const visibleQuotes = isDirector ? quotes.filter(row => row.status !== 'draft') : quotes;
      body += panel('Lịch sử phiên bản', table(['Báo giá', 'Khách hàng / Công trình', 'Đơn giá bán', 'Giá trị trước VAT', 'Hiệu lực', 'Trạng thái', 'Thao tác'], [...visibleQuotes].reverse().map(row => {
        const request = requestFor(row);
        const newest = latest(row, quotes);
        const linked = contracts.some(contract => contract.quoteId === row.id);
        let controls = '—';
        if (isDirector && newest && row.status === 'pending') {
          controls = `<div class="np-kd-controls">${actionForm('approve-quote', inputId(row.id) + field('Ghi chú duyệt', textInput('decision', 200, false)), 'Duyệt', 'np-kd-inline')}${actionForm('reject-quote', inputId(row.id) + field('Lý do trả lại', textInput('decision', 200)), 'Trả lại', 'np-kd-inline')}</div>`;
        } else if (!isDirector && newest && !linked && ['draft', 'approved', 'rejected'].includes(row.status)) {
          const send = row.status === 'draft' ? actionForm('submit-quote', inputId(row.id), 'Gửi duyệt', 'np-kd-inline') : '';
          controls = `<div class="np-kd-controls">${send}<details><summary>Tạo phiên bản mới</summary>${actionForm('revise-quote', inputId(row.id) + quoteFields, 'Lưu phiên bản mới')}</details></div>`;
        }
        return [
          `<strong>${h(row.code)} · v${row.version}</strong><small>${h(row.author)}${row.reference ? ` · ${h(row.reference)}` : ''}</small>`,
          `${h(nameFor(request))}<small>${h(request?.project)}</small>`,
          cash(row.rate), `${cash(row.rate * row.quantity)}<small>SL ${row.quantity}</small>`, displayDate(row.validThrough),
          `${status(row)}${row.decision ? `<small>${h(row.decision)}</small>` : ''}`, controls
        ];
      })));
    }

    if (tab === 'kd-contracts') {
      body = heading('Hợp đồng & Phụ lục', 'Tạo hợp đồng từ báo giá đã duyệt và tra cứu điều khoản bán.');
      const approved = quotes.filter(row => row.status === 'approved' && latest(row, quotes) && !contracts.some(contract => contract.quoteId === row.id));
      const contractForm = field('Báo giá đã duyệt', select('quoteId', approved, row => `${row.code} v${row.version} · ${nameFor(requestFor(row))}`)) + field('Số hợp đồng', textInput('number', 45)) + field('Ngày bắt đầu', dateInput('start')) + field('Ngày kết thúc', dateInput('end')) + field('Chu kỳ nghiệm thu', textInput('cycle', 50)) + field('Hạn thanh toán (ngày)', numberInput('dueDays', 0, 365, 30)) + field('VAT (%)', numberInput('vat', 0, 100, 10)) + field('Giữ lại (%)', numberInput('retention', 0, 100, 0)) + field('Bên ký thứ ba (nếu có)', textInput('thirdParty', 100, false)) + field('Bên ký bảng công', textInput('timeSigner', 100, false)) + field('Bên ký bảng giá trị', textInput('valueSigner', 100, false)) + field('Bên nhận hóa đơn', textInput('invoiceParty', 100, false));
      body += `<div class="np-kd-grid">${panel('Lập hợp đồng', approved.length ? actionForm('add-contract', contractForm, 'Lưu hợp đồng') : '<p class="np-kd-empty">Chưa có báo giá đã duyệt để lập hợp đồng mới.</p>')}${panel('Thêm phụ lục', contracts.length ? actionForm('add-annex', field('Hợp đồng', select('contractId', contracts, row => row.number)) + field('Số phụ lục', textInput('number', 45)) + field('Ngày hiệu lực', dateInput('date')) + field('Nội dung điều chỉnh', textInput('description', 240)) + field('Mã/tên chứng từ', textInput('reference', 100, false)), 'Lưu phụ lục') : '<p class="np-kd-empty">Cần có hợp đồng để thêm phụ lục.</p>')}</div>`;
      body += panel('Hợp đồng', table(['Số hợp đồng', 'Bên ký / nhận hóa đơn', 'Thời hạn', 'Chu kỳ / hạn trả', 'Giá trị trước VAT', 'VAT / Giữ lại'], contracts.map(row => {
        const quote = lookup(quotes, row.quoteId);
        return [
          `<strong>${h(row.number)}</strong><small>${h(quote?.code)} · v${quote?.version || '—'}</small>`,
          h(nameFor(requestFor(quote))) + (row.thirdParty ? `<small>Bên thứ ba: ${h(row.thirdParty)}</small>` : '')
            + (row.timeSigner ? `<small>Ký bảng công: ${h(row.timeSigner)}</small>` : '')
            + (row.valueSigner ? `<small>Ký bảng giá trị: ${h(row.valueSigner)}</small>` : '')
            + (row.invoiceParty ? `<small>Nhận hóa đơn: ${h(row.invoiceParty)}</small>` : ''),
          `${displayDate(row.start)} đến ${displayDate(row.end)}`, `${h(row.cycle)}<small>${row.dueDays} ngày</small>`,
          quote ? cash(quote.quantity * quote.rate) : '—', `${row.vat}% / ${row.retention}%`
        ];
      })));
      body += panel('Phụ lục', table(['Số phụ lục', 'Hợp đồng', 'Ngày hiệu lực', 'Nội dung', 'Chứng từ'], annexes.map(row => [h(row.number), text(lookup(contracts, row.contractId)?.number), displayDate(row.date), h(row.description), text(row.reference)])));
    }

    if (tab === 'kd-prices') {
      body = heading('Bảng giá A / B', 'Quản lý đơn giá đối tác và đơn giá đội khoán theo phiên bản và ngày hiệu lực.');
      for (const type of ['A', 'B']) {
        const isPartner = type === 'A';
        const title = isPartner ? 'Bảng A · Giá đối tác' : 'Bảng B · Giá đội khoán';
        const entityLabel = isPartner ? 'Đối tác' : 'Đội khoán';
        const savePrice = actionForm(isPartner ? 'add-price-a' : 'add-price-b', field(entityLabel, isPartner ? select('group', clients, row => row.name) : textInput('group')) + field('Hạng mục', textInput('item')) + field('Đơn vị tính', textInput('unit', 25)) + field('Đơn giá (đ)', numberInput('price')) + field('Ngày hiệu lực', dateInput('effective')), 'Lưu phiên bản giá');
        const rows = prices.filter(row => row.type === type).slice().reverse().map(row => [
          h(row.group), h(row.item), h(row.unit), `v${row.version}`, cash(row.price), displayDate(row.effective)
        ]);
        body += panel(title, savePrice + table([entityLabel, 'Hạng mục', 'Đơn vị tính', 'Phiên bản', 'Đơn giá', 'Hiệu lực từ'], rows));
      }
    }

    if (tab === 'kd-acceptance') {
      body = heading('Nghiệm thu & Công nợ', 'Ghi nhận khối lượng với khách hàng và theo dõi phải thu theo từng hồ sơ.');
      body += panel('Lập biên bản nghiệm thu', contracts.length ? actionForm('add-acceptance', field('Hợp đồng', select('contractId', contracts, row => row.number)) + field('Ngày nghiệm thu', dateInput('date')) + field('Khối lượng thực hiện', numberInput('performed')) + field('Khối lượng chấp nhận', numberInput('accepted', 0)) + field('Người xác nhận', textInput('approver')) + field('Mã/tên biên bản ký', textInput('reference')), 'Lưu nghiệm thu') : '<p class="np-kd-empty">Cần có hợp đồng để ghi nhận nghiệm thu.</p>');
      body += panel('Biên bản nghiệm thu', table(['Mã', 'Hợp đồng', 'Ngày', 'Thực hiện', 'Chấp nhận', 'Người xác nhận', 'Biên bản'], acceptance.map(row => [
        h(row.id), text(lookup(contracts, row.contractId)?.number), displayDate(row.date), row.performed, row.accepted, h(row.approver), text(row.reference)
      ])));
      body += panel('Công nợ phải thu', table(['Mã phải thu', 'Hồ sơ nghiệm thu', 'Hóa đơn', 'Hạn thanh toán', 'Phải thu', 'Đã thu', 'Còn lại'], receivables.map(row => [
        h(row.id), h(row.acceptanceId), text(row.invoice), displayDate(row.due), cash(row.amount), cash(row.paid), cash(Math.max(0, row.amount - row.paid))
      ])) + '<p class="np-kd-empty">Kế toán ghi nhận hóa đơn và thu tiền. Lưu nghiệm thu sẽ cập nhật biên bản.</p>');
    }

    if (!body) return '';
    const banner = notice?.tab === tab ? `<p class="np-kd-notice${notice.error ? ' is-error' : ''}" role="status">${h(notice.message)}</p>` : '';
    return `<div class="np-kd">${banner}${body}</div>`;
  }

  function handle(action, formData, context) {
    const role = roleCode(context);
    const directorAction = ['approve-quote', 'reject-quote'].includes(action);
    if (directorAction ? !directorRoles.includes(role) : role !== 'KD') return false;
    const { data, account, save } = context;
    const state = getState(data);
    const { clients, requests, quotes, contracts, acceptance, annexes, prices } = state;
    const values = Object.fromEntries(formData);
    const tabs = {
      'add-client': 'kd-clients', 'add-request': 'kd-clients',
      'add-quote': 'kd-quotes', 'revise-quote': 'kd-quotes', 'submit-quote': 'kd-quotes',
      'approve-quote': 'v2-director-quotes', 'reject-quote': 'v2-director-quotes',
      'add-contract': 'kd-contracts', 'add-annex': 'kd-contracts', 'add-acceptance': 'kd-acceptance',
      'add-price-a': 'kd-prices', 'add-price-b': 'kd-prices'
    };
    if (!tabs[action]) return false;
    function finish(message, error = false) {
      notice = { tab: tabs[action], message, error };
      save();
      return !error;
    }
    const fail = (message = 'Vui lòng kiểm tra thông tin đã nhập.') => finish(message, true);
    const str = (key, max = 120) => typeof values[key] === 'string' ? values[key].trim().slice(0, max) : '';
    const num = (key, min = 1, max = 1000000000) => {
      const value = str(key) ? Number(values[key]) : NaN;
      return Number.isSafeInteger(value) && value >= min && value <= max ? value : NaN;
    };
    const date = (key) => /^\d{4}-\d{2}-\d{2}$/.test(str(key)) && !Number.isNaN(Date.parse(str(key))) ? str(key) : '';
    const sameNumber = (rows, number) => rows.some(row => row.number.toLowerCase() === number.toLowerCase());
    const quote = action === 'add-quote' ? undefined : lookup(quotes, str('id'));
    const canUpdate = quote && latest(quote, quotes) && !contracts.some(contract => contract.quoteId === quote.id);
    const author = account?.fullName || (directorAction ? 'Giám đốc' : 'Kinh doanh');

    if (action === 'add-client') {
      const name = str('name');
      const contact = str('contact');
      if (!name || !contact) return fail();
      if (clients.some(row => row.name.toLowerCase() === name.toLowerCase())) return fail('Khách hàng đã có trong danh sách.');
      clients.push({ id: nextId(clients, 'KD-KH-'), name, contact, detail: str('detail', 200) });
      return finish('Đã lưu khách hàng.');
    }
    if (action === 'add-request') {
      const clientId = str('clientId');
      const project = str('project');
      const scope = str('scope');
      const quantity = num('quantity', 1, 100000);
      const needed = date('date');
      if (!lookup(clients, clientId) || !project || !scope || !quantity || !needed) return fail();
      requests.push({ id: nextId(requests, 'KD-YC-'), clientId, project, scope, quantity, date: needed });
      return finish('Đã lưu nhu cầu cung ứng.');
    }

    if (action === 'add-quote' || action === 'revise-quote') {
      const quantity = num('quantity');
      const rate = num('rate');
      const validThrough = date('validThrough');
      const requestId = action === 'add-quote' ? str('requestId') : quote?.requestId;
      if (!lookup(requests, requestId) || !quantity || !rate || !Number.isSafeInteger(quantity * rate) || !validThrough) return fail();
      if (action === 'revise-quote' && (!canUpdate || !['draft', 'approved', 'rejected'].includes(quote.status))) return fail('Phiên bản này hiện không thể chỉnh sửa.');
      const code = quote?.code || 'KD-BG-' + String(new Set(quotes.map(row => row.code)).size + 1).padStart(2, '0');
      const version = quote ? quote.version + 1 : 1;
      if (quote && quote.status !== 'rejected') quote.status = 'superseded';
      quotes.push({ id: code + '-v' + version, code, requestId, version, quantity, rate, validThrough, status: 'draft', author, reference: str('reference', 100) });
      return finish('Đã lưu bản nháp báo giá.');
    }
    if (action === 'submit-quote') {
      if (!canUpdate || quote.status !== 'draft') return fail('Chỉ bản nháp mới nhất có thể gửi duyệt.');
      quote.status = 'pending';
      return finish('Báo giá đang chờ Giám đốc duyệt.');
    }
    if (directorAction) {
      const decision = str('decision', 200);
      if (!canUpdate || quote.status !== 'pending') return fail('Báo giá này đã được xử lý.');
      if (action === 'reject-quote' && !decision) return fail('Hãy nhập lý do trả lại báo giá.');
      quote.status = action === 'approve-quote' ? 'approved' : 'rejected';
      quote.decision = decision || 'Đã duyệt';
      quote.decidedBy = author;
      return finish(action === 'approve-quote' ? 'Đã duyệt báo giá.' : 'Đã trả báo giá về Kinh doanh.');
    }

    if (action === 'add-contract') {
      const selected = lookup(quotes, str('quoteId'));
      const number = str('number', 45);
      const start = date('start');
      const end = date('end');
      const cycle = str('cycle', 50);
      const dueDays = num('dueDays', 0, 365);
      const vat = num('vat', 0, 100);
      const retention = num('retention', 0, 100);
      if (!selected || selected.status !== 'approved' || !latest(selected, quotes) || contracts.some(row => row.quoteId === selected.id)) return fail('Hãy chọn báo giá đã duyệt và chưa lập hợp đồng.');
      if (!number || !start || !end || start > end || !cycle || [dueDays, vat, retention].some(Number.isNaN)) return fail();
      if (sameNumber(contracts, number)) return fail('Số hợp đồng đã có.');
      const thirdParty = str('thirdParty', 100);
      const timeSigner = str('timeSigner', 100);
      const valueSigner = str('valueSigner', 100);
      const invoiceParty = str('invoiceParty', 100);
      if (thirdParty && (!timeSigner || !valueSigner || !invoiceParty)) return fail('Hợp đồng ba bên cần chỉ rõ bên ký bảng công, bên ký bảng giá trị và bên nhận hóa đơn.');
      contracts.push({ id: nextId(contracts, 'KD-HD-'), number, quoteId: selected.id, start, end, cycle, dueDays, vat, retention, thirdParty, timeSigner, valueSigner, invoiceParty });
      return finish('Đã lưu hợp đồng.');
    }
    if (action === 'add-annex') {
      const contractId = str('contractId');
      const number = str('number', 45);
      const effective = date('date');
      const description = str('description', 240);
      if (!lookup(contracts, contractId) || !number || !effective || !description) return fail();
      if (sameNumber(annexes.filter(row => row.contractId === contractId), number)) return fail('Số phụ lục đã có trong hợp đồng này.');
      annexes.push({ id: nextId(annexes, 'KD-PL-'), contractId, number, date: effective, description, reference: str('reference', 100) });
      return finish('Đã lưu phụ lục.');
    }
    if (action === 'add-price-a' || action === 'add-price-b') {
      const type = action === 'add-price-a' ? 'A' : 'B';
      const group = type === 'A' ? lookup(clients, str('group'))?.name : str('group');
      const item = str('item');
      const unit = str('unit', 25);
      const price = num('price');
      const effective = date('effective');
      if (!group || !item || !unit || !price || !effective) return fail();
      const history = prices.filter(row => row.type === type && row.group.toLowerCase() === group.toLowerCase() && row.item.toLowerCase() === item.toLowerCase() && row.unit.toLowerCase() === unit.toLowerCase());
      if (history.some(row => row.effective >= effective)) return fail('Chọn ngày hiệu lực sau ngày của phiên bản hiện tại.');
      const version = 1 + Math.max(0, ...history.map(row => row.version));
      prices.push({ type, group, item, unit, price, effective, version });
      return finish('Đã cập nhật phiên bản bảng giá.');
    }
    const contractId = str('contractId');
    const conducted = date('date');
    const performed = num('performed');
    const accepted = num('accepted', 0);
    const approver = str('approver');
    const reference = str('reference');
    const contract = lookup(contracts, contractId);
    if (!contract || !conducted || !performed || Number.isNaN(accepted) || !approver || !reference) return fail();
    if (accepted > performed) return fail('Khối lượng chấp nhận cần nhỏ hơn hoặc bằng khối lượng thực hiện.');
    if (acceptance.some(row => row.contractId === contractId && row.reference.toLowerCase() === reference.toLowerCase())) return fail('Mã biên bản này đã có trong hợp đồng.');
    acceptance.push({ id: nextId(acceptance, 'KD-NT-'), contractId, date: conducted, performed, accepted, approver, reference });
    return finish('Đã lưu biên bản nghiệm thu.');
  }

  window.NPBusiness = { render, handle };
})();
