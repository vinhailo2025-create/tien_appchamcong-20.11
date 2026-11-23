(() => {
  'use strict';

  const views = new Map([
    ['v2-director-people', 'BGD'], ['ns-workers', 'NS'], ['ns-assignments', 'NS'], ['ns-leave', 'NS'],
    ['v2-team-assignments', 'DT1'], ['v2-team-leave', 'DT1'], ['v2-worker-leave', 'CN']
  ]);

  const profileStates = { active: 'Đang làm', paused: 'Tạm nghỉ', left: 'Đã nghỉ việc', rehired: 'Tái tuyển' };
  const calendarFilters = new Map();
  const assignmentShifts = { day: 'Ca ngày', night: 'Ca đêm', other: 'Ca khác' };
  const contractTypes = { fixed: 'Có thời hạn', open: 'Không xác định thời hạn', service: 'Khoán / dịch vụ', other: 'Khác' };
  const leaveTypes = { annual: 'Nghỉ phép', sick: 'Nghỉ ốm', unpaid: 'Nghỉ không lương', other: 'Nghỉ khác' };
  const leaveStates = { submitted: 'Chờ đội trưởng xác nhận', confirmed: 'Chờ nhân sự duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

  function read(context) {
    const saved = context.data.people || {};
    return {
      employees: saved.employees || [],
      profiles: saved.profiles || {},
      assignments: saved.assignments || [],
      leave: saved.leave || []
    };
  }

  function roster(context, people) {
    return [...(context.state.workers || []), ...people.employees];
  }

  function mayUse(context, role) {
    return Boolean(role && context.account && context.role === role && (!context.account.roleId || context.account.roleId === role));
  }

  function identity(account) {
    return String(account.id || account.username || account.workerCode || '');
  }

  function byId(items, id) {
    return (items || []).find(x => String(x.id) === String(id));
  }

  function normalize(value) {
    return String(value ?? '').trim();
  }

  function dateValue(raw) {
    const value = normalize(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : '';
  }

  function today() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }

  function formatDate(value) {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return day + '/' + month + '/' + year;
  }

  function range(form) {
    const start = dateValue(form.get('start'));
    const end = dateValue(form.get('end'));
    if (!start || !end || end < start) throw new Error('Chọn khoảng ngày hợp lệ.');
    return { start, end };
  }

  function overlaps(a, b) {
    return a.start <= b.end && b.start <= a.end;
  }

  function teamAt(worker, people, date) {
    return worker ? window.NPWorkspace.assignmentAt({ people }, worker, date).teamId || '' : '';
  }

  function fixedTeam(worker, people, period) {
    const firstTeam = teamAt(worker, people, period.start);
    const assignments = people.assignments.filter(x => x.workerCode === worker?.code && overlaps(x, period))
      .sort((a,b) => a.start.localeCompare(b.start));
    let nextDay = period.start;
    for (const assignment of assignments) {
      if (assignment.teamId !== firstTeam) return '';
      if (assignment.start > nextDay && worker?.teamId !== firstTeam) return '';
      if (assignment.end >= period.end) return firstTeam;
      nextDay = new Date(Date.parse(assignment.end) + 86400000).toISOString().slice(0, 10);
    }
    return worker?.teamId === firstTeam ? firstTeam : '';
  }

  function panel(title, subtitle, body, actions = '') {
    return `<section class="section-card v2-table-section v2-people">
      <div class="section-header v2-table-header"><div><h3>${title}</h3><p class="section-desc">${subtitle}</p></div>${actions}</div>
      ${body}
    </section>`;
  }

  function table(heads, rows, label, emptyMessage, filterable = false) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${label}">
      <table class="data-table"><thead><tr>${heads.map(head => `<th scope="col">${head}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('') || `<tr><td class="v2-table-empty" colspan="${heads.length}">${emptyMessage}</td></tr>`}
      ${filterable && rows.length ? `<tr data-people-empty hidden><td class="v2-table-empty" colspan="${heads.length}">Không tìm thấy nhân sự phù hợp.</td></tr>` : ''}</tbody></table>
    </div>`;
  }

  function form(action, inner, btn) {
    return `<form class="v2-people-form" data-np-module="people" data-np-action="${action}">${inner}
      <button type="submit" class="btn btn-primary">${btn}</button></form>`;
  }

  function input(label, name, attrs = '', type = 'text') {
    return `<label>${label}<input type="${type}" name="${name}" ${attrs}></label>`;
  }

  function select(label, name, options, required = true) {
    return `<label>${label}<select name="${name}" ${required ? 'required' : ''}>${options}</select></label>`;
  }

  const PAGE_SIZE = 50;
  const attendanceStates = {
    DANG_LAM: ['working', 'Đang làm'], DA_RA: ['completed', 'Đã ra ca'],
    NGHI_PHEP: ['leave', 'Nghỉ phép'], NGHI_KP: ['absent', 'Nghỉ không phép'],
    VANG: ['absent', 'Vắng']
  };

  function attendanceBadge(status) {
    const [tone, label] = Object.hasOwn(attendanceStates, status) ? attendanceStates[status] : ['empty', 'Chưa chấm công'];
    return `<span class="np-attendance-pill" data-tone="${tone}">${label}</span>`;
  }

  function detailButton(worker, esc) {
    return `<button type="button" class="btn btn-soft btn-sm np-worker-detail-button" data-np-module="people" data-np-action="worker-detail" data-np-id="${esc(worker.code)}" aria-label="Xem hồ sơ ${esc(worker.name)}">Xem hồ sơ</button>`;
  }

  const detailDialog = '<dialog class="np-detail-dialog np-worker-detail" id="npWorkerDetail" aria-labelledby="npWorkerDetailTitle"></dialog>';

  function directorWorkers(context, people) {
    const scope = context.account.projectId;
    if (!scope || scope === 'ALL') return roster(context, people);
    return roster(context, people).filter(worker => {
      const team = byId(context.state.teams, teamAt(worker, people, today()));
      return (team?.projectId || worker.projectId) === scope;
    });
  }

  function directorTeams(context, workers) {
    const { state, esc } = context;
    const scope = context.account.projectId;
    const teams = state.teams.filter(team => !scope || scope === 'ALL' || team.projectId === scope);
    const projects = new Map(state.projects.map(project => [project.id, project]));
    const currentDate = today();
    const people = read(context);
    const rows = teams.map(team => {
      const project = projects.get(team.projectId);
      return `<tr><td>${esc(team.name)}</td><td>${esc(team.leader)}</td><td>${project ? `<button type="button" class="btn btn-soft btn-sm" data-np-target="v2-projects" data-np-project="${esc(project.id)}">${esc(project.name)}</button>` : '—'}</td><td>${workers.filter(worker => teamAt(worker, people, currentDate) === team.id).length}</td></tr>`;
    });
    return `<details class="np-work-card np-director-teams"><summary>Nhân sự theo đội</summary>${table(['Đội', 'Quản lý đội', 'Công trình', 'Quân số'], rows, 'Nhân sự theo đội', 'Chưa có đội.')}</details>`;
  }

  function openWorkerDetail(code, context) {
    if (!mayUse(context, 'BGD')) return;
    const { state, esc } = context;
    const people = read(context);
    const worker = directorWorkers(context, people).find(item => item.code === code);
    const dialog = document.getElementById('npWorkerDetail');
    if (!worker || !dialog || dialog.open) return;
    const profile = Object.hasOwn(people.profiles, code) ? people.profiles[code] : {};
    const team = byId(state.teams, teamAt(worker, people, today()));
    const project = byId(state.projects, team?.projectId || worker.projectId);
    const fields = entries => `<dl>${entries.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value ?? '—')}</dd></div>`).join('')}</dl>`;
    const documents = value => value === true ? 'Đã đủ' : value === false ? 'Chưa đủ' : 'Chưa cập nhật';
    dialog.innerHTML = `<header class="np-worker-detail-head">
      <div><p>Hồ sơ nhân sự · ${esc(worker.code)}</p><h2 id="npWorkerDetailTitle">${esc(worker.name)}</h2></div>
      <form method="dialog"><button type="submit" class="btn btn-soft" aria-label="Đóng hồ sơ" autofocus>×</button></form>
    </header>
    <div class="np-worker-detail-body">
      <section><h3>Thông tin công việc</h3>${fields([
        ['Vị trí', worker.roleName || worker.skill], ['Trạng thái', profileStates[profile.status] || profileStates.active],
        ['Đội', team?.name], ['Công trình', project?.name], ['Đội trưởng', team?.leader],
        ['Số điện thoại', worker.phone || 'Chưa cập nhật']
      ])}</section>
      <section><h3>Hồ sơ lao động</h3>${fields([
        ['Ngày vào làm', formatDate(profile.joinedOn)], ['Ngày nghỉ việc', formatDate(profile.leftOn)],
        ['Ngày tái tuyển', formatDate(profile.rehiredOn)], ['Hạn hợp đồng', formatDate(profile.contractUntil)],
        ['Loại hợp đồng', contractTypes[profile.contractType]], ['Giấy tờ xác minh', documents(profile.identityReady)], ['Hợp đồng', documents(profile.contractReady)]
      ])}</section>
      <section><h3>Bản ghi chấm công</h3>${worker.date ? attendanceBadge(worker.attendanceStatus) + fields([
        ['Ngày ghi nhận', formatDate(worker.date)], ['Vào ca', worker.checkInTime], ['Ra ca', worker.checkOutTime]
      ]) : '<p>Chưa có bản ghi chấm công.</p>'}</section>
      ${profile.spells?.length ? `<section><h3>Lịch sử làm việc</h3><ul>${profile.spells.map(spell => `<li>${esc(formatDate(spell.start))} – ${esc(spell.end ? formatDate(spell.end) : 'Hiện tại')}</li>`).join('')}</ul></section>` : ''}
    </div>`;
    dialog.showModal();
  }

  function rosterView(context, people, director = false) {
    const { esc, state } = context;
    const workers = director ? directorWorkers(context, people) : roster(context, people);
    const currentDate = today();
    const employeeStatus = worker => Object.hasOwn(people.profiles, worker.code) ? people.profiles[worker.code].status || 'active' : 'active';
    const isReady = worker => {
      const profile = Object.hasOwn(people.profiles, worker.code) ? people.profiles[worker.code] : {};
      return Boolean(profile.identityReady && profile.contractReady && (!profile.contractUntil || profile.contractUntil >= currentDate));
    };
    const rows = workers.map((worker, index) => {
      const profile = Object.hasOwn(people.profiles, worker.code) ? people.profiles[worker.code] : {};
      const team = byId(state.teams, teamAt(worker, people, currentDate));
      const status = profileStates[profile.status] || 'Đang làm';
      let action = '';
      if (director) {
        action = detailButton(worker, esc);
      } else {
        const selectedStates = Object.entries(profileStates).map(([key, label]) => `<option value="${key}" ${key === (profile.status || 'active') ? 'selected' : ''}>${label}</option>`).join('');
        const editForm = form('update-profile', `
          <input type="hidden" name="workerCode" value="${esc(worker.code)}">
          ${select('Trạng thái', 'status', selectedStates)}
          ${input('Ngày vào làm', 'joinedOn', `value="${esc(profile.joinedOn || '')}"`, 'date')}
          ${input('Ngày nghỉ việc', 'leftOn', `value="${esc(profile.leftOn || '')}"`, 'date')}
          ${input('Ngày tái tuyển', 'rehiredOn', `value="${esc(profile.rehiredOn || '')}"`, 'date')}
          ${select('Loại hợp đồng', 'contractType', '<option value="">Chưa phân loại</option>' + Object.entries(contractTypes).map(([id,label]) => `<option value="${id}" ${profile.contractType === id ? 'selected' : ''}>${label}</option>`).join(''), false)}
        ${input('Lý do cập nhật', 'reason', 'required maxlength="180"')}
        ${input('Hạn hợp đồng', 'contractUntil', `value="${esc(profile.contractUntil || '')}"`, 'date')}
          <label class="v2-people-check"><input name="identityReady" type="checkbox" ${profile.identityReady ? 'checked' : ''}> Đã đủ giấy tờ xác minh</label>
          <label class="v2-people-check"><input name="contractReady" type="checkbox" ${profile.contractReady ? 'checked' : ''}> Đã đủ hợp đồng</label>
        `, 'Lưu hồ sơ');
        const history = [...(profile.history || [])].reverse().map(entry => `<li>${formatDate(entry.at.slice(0, 10))} · ${esc(profileStates[entry.status])} · ${esc(entry.by)}${entry.reason ? ' · ' + esc(entry.reason) : ''}</li>`).join('');
        action = `<details class="v2-people-edit"><summary>Cập nhật</summary>${editForm}${history ? `<details class="v2-people-meta"><summary>Lịch sử cập nhật</summary><ul>${history}</ul></details>` : ''}</details>`;
      }
      const project = byId(state.projects, team?.projectId || worker.projectId);
      return `<tr data-people-row ${director && index >= PAGE_SIZE ? 'hidden' : ''} data-name="${esc(worker.name)}" data-code="${esc(worker.code)}" data-status="${esc(employeeStatus(worker))}" data-team="${esc(team?.id || '')}" data-project="${esc(project?.id || '')}" data-contract="${esc(profile.contractType || '')}" data-start="${esc(profile.joinedOn || '')}" data-end="${esc(profile.contractUntil || '')}">
        <td><strong>${esc(worker.code)}</strong></td><td>${esc(worker.name)}</td><td>${esc(team?.name || 'Chưa có đội')}</td><td>${esc(project?.name || '—')}</td>
        <td><span class="badge ${profile.status === 'left' ? 'badge-danger' : profile.status === 'paused' ? 'badge-warning' : 'badge-success'}">${status}</span></td>
        <td>${esc(contractTypes[profile.contractType] || '—')}${profile.contractUntil ? '<br>' + esc(formatDate(profile.contractUntil)) : ''}</td>
        <td><span class="badge ${isReady(worker) ? 'badge-success' : 'badge-warning'}">${isReady(worker) ? 'Đủ hồ sơ' : profile.contractUntil && profile.contractUntil < currentDate ? 'Hợp đồng hết hạn' : 'Cần rà soát'}</span></td>
        <td>${action}</td></tr>`;
    });
    const statuses = [['', 'Tất cả'], ...Object.entries(profileStates)];
    const options = (items = []) => items.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
    const buttons = director ? '' : `<div class="v2-people-actions"><button class="btn btn-primary" type="button" data-people-add aria-expanded="false" aria-controls="np-people-create">+ Thêm nhân sự</button>
      <button class="btn btn-soft" type="button" data-people-export ${rows.length ? '' : 'disabled'}>Xuất Excel</button></div>`;
    return panel(director ? 'Danh sách nhân sự' : 'Quản lý nhân sự', 'Tra cứu theo mã, họ tên, đội hoặc công trình.', `
      ${director ? '' : `<div id="np-people-create" class="v2-people-add" hidden>
        ${form('create-worker', input('Mã nhân sự', 'code', 'required maxlength="40"') + input('Họ và tên', 'name', 'required maxlength="120"') + input('Ngày vào làm', 'joinedOn', '', 'date'), 'Tạo hồ sơ')}
      </div>`}
      <div class="v2-people-statuses" role="group" aria-label="Lọc theo trạng thái">
        ${statuses.map(([value, label]) => `<button type="button" data-people-status="${value}" aria-pressed="${!value}">${label} (${value ? workers.filter(worker => employeeStatus(worker) === value).length : workers.length})</button>`).join('')}
      </div>
      <div class="v2-people-filters v2-table-filters">
        <input type="search" aria-label="Tìm mã hoặc tên nhân sự" placeholder="Tìm theo mã, họ tên…" data-people-filter="search">
        <select aria-label="Lọc theo đội" data-people-filter="team"><option value="">Tất cả đội</option>${options(state.teams)}</select>
        <select aria-label="Lọc theo công trình" data-people-filter="project"><option value="">Tất cả công trình</option>${options(state.projects)}</select>
        <select aria-label="Lọc theo trạng thái" data-people-filter="status">${statuses.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>
        <select aria-label="Loại hợp đồng" data-people-filter="contract"><option value="">Tất cả hợp đồng</option>${Object.entries(contractTypes).map(([id,label]) => `<option value="${id}">${label}</option>`).join('')}</select>
        <label>Vào làm từ <input type="date" data-people-filter="start"></label>
        <label>Hợp đồng hết hạn đến <input type="date" data-people-filter="end"></label>
      </div>
      ${table(['Mã NV', 'Họ và tên', 'Đội', 'Công trình', 'Trạng thái', 'Hợp đồng', 'Hồ sơ', 'Thao tác'], rows, 'Hồ sơ nhân sự', 'Chưa có hồ sơ nhân sự.', true)}
      ${director ? `<nav class="np-people-pages" data-people-pages aria-label="Phân trang nhân sự" ${workers.length > PAGE_SIZE ? '' : 'hidden'}>
        <span role="status">1–${PAGE_SIZE} / ${workers.length}</span>
        <button class="btn btn-soft" type="button" data-people-page="-1" disabled>Trước</button>
        <button class="btn btn-soft" type="button" data-people-page="1">Sau</button>
      </nav>${detailDialog}` : ''}`, buttons) + (director ? directorTeams(context, workers) : '');
  }

  function assignmentView(context, people) {
    const { esc, state } = context;
    const workers = roster(context, people);
    const isHR = context.role === 'NS';
    const teams = isHR ? state.teams : state.teams.filter(item => item.id === context.account.teamId);
    const projects = isHR ? state.projects : state.projects.filter(item => teams.some(team => team.projectId === item.id));
    const actor = identity(context.account);
    const filter = calendarFilters.get(actor) || {};
    const reference = filter.date || today();
    const monday = new Date(reference + 'T00:00:00Z');
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const endOfMonth = new Date(Date.UTC(+reference.slice(0,4),+reference.slice(5,7),0)).toISOString().slice(0,10);
    const start = filter.mode === 'day' ? reference : filter.mode === 'week' ? monday.toISOString().slice(0,10) : reference.slice(0,7) + '-01';
    const end = filter.mode === 'day' ? reference : filter.mode === 'week' ? sunday.toISOString().slice(0,10) : endOfMonth;
    const workerOptions = workers.map(w => `<option value="${esc(w.code)}">${esc(w.code)} · ${esc(w.name)}</option>`).join('');
    const teamOptions = state.teams.map(team => `<option value="${esc(team.id)}">${esc(team.name)} · ${esc(byId(state.projects, team.projectId)?.name || team.projectId)}</option>`).join('');
    const options = (entries, current) => entries.map(([key,label]) => `<option value="${esc(key)}" ${key === current ? 'selected' : ''}>${esc(label)}</option>`).join('');
    const rows = [...people.assignments].filter(item => (isHR ? (!filter.state || (item.status || 'confirmed') === filter.state) : item.teamId === context.account.teamId)
      && overlaps(item,{start,end}) && (!filter.projectId || item.projectId === filter.projectId)
      && (!filter.teamId || item.teamId === filter.teamId) && (!filter.shift || (item.shift || 'day') === filter.shift))
      .sort((a,b) => b.start.localeCompare(a.start)).map(item => {
        const worker = workers.find(w => w.code === item.workerCode);
        const team = byId(state.teams,item.teamId);
        const project = byId(state.projects,item.projectId);
        return `<tr><td>${esc(worker?.name || item.workerCode)}</td><td>${esc(team?.name || item.teamId)}</td>
          <td>${esc(project?.name || item.projectId)}</td><td>${esc(assignmentShifts[item.shift] || 'Ca ngày')}</td>
          <td>${formatDate(item.start)} – ${formatDate(item.end)}</td><td>${esc(item.reason)}</td>
          <td>${esc(item.by)}${item.confirmedByName ? '<br>Xác nhận: ' + esc(item.confirmedByName) : ''}</td>
          <td>${item.status === 'pending' ? 'Chờ xác nhận' : 'Đã xác nhận'}</td>
          <td>${item.status === 'pending' && item.requestedBy !== actor ? actionButton('confirm-assignment',item.id,'Xác nhận','primary') : '—'}</td></tr>`;
      });
    const fields = select('Nhân sự', 'workerCode', '<option value="">Chọn nhân sự</option>' + workerOptions)
      + select('Đội và công trình', 'teamId', '<option value="">Chọn đội</option>' + teamOptions)
      + select('Ca', 'shift', options(Object.entries(assignmentShifts),'day'))
      + input('Từ ngày', 'start', 'required', 'date') + input('Đến hết ngày', 'end', 'required', 'date')
      + input('Lý do', 'reason', 'maxlength="180"');
    const filters = select('Xem theo', 'mode', options([['day','Ngày'],['week','Tuần'],['month','Tháng']],filter.mode || 'month'))
      + input('Ngày tham chiếu', 'date', `required value="${esc(reference)}"`,'date')
      + select('Công trình', 'projectId', options([['','Tất cả'], ...projects.map(item => [item.id,item.name])],filter.projectId), false)
      + select('Đội', 'teamId', options([['','Tất cả'], ...teams.map(item => [item.id,item.name])],filter.teamId), false)
      + select('Ca', 'shift', options([['','Tất cả'], ...Object.entries(assignmentShifts)],filter.shift), false)
      + (isHR ? select('Tình trạng', 'state', options([['','Tất cả'],['pending','Chờ xác nhận'],['confirmed','Đã xác nhận']],filter.state), false) : '');
    return panel('Lịch điều phối', `${formatDate(start)} – ${formatDate(end)}`, `
      ${form('filter-assignments', filters, 'Lọc lịch')}
      ${isHR ? `<details class="v2-people-add"><summary>+ Thêm phân công</summary>${form('assign', fields, 'Gửi xác nhận')}</details>` : ''}
      ${table(['Nhân sự', 'Đội', 'Công trình', 'Ca', 'Hiệu lực', 'Lý do', 'Người lập / xác nhận', 'Tình trạng', 'Thao tác'], rows, 'Lịch phân công', 'Không có phân công bổ sung trong khoảng đã chọn.')}`);
  }

  function scopedLeave(context, people) {
    if (context.role === 'NS') return people.leave;
    const id = identity(context.account);
    if (context.role === 'CN') return people.leave.filter(x => x.requesterId === id);
    if (context.role === 'DT1') return people.leave.filter(x => x.requesterId === id || (x.requesterRole === 'CN' && x.teamId === context.account.teamId));
    return [];
  }

  function actionButton(action, id, label, style) {
    return `<button type="button" class="btn btn-${style} btn-sm" data-np-module="people" data-np-action="${action}" data-np-id="${id}">${label}</button>`;
  }

  function leaveView(context, people) {
    const { esc, state, role } = context;
    const visible = scopedLeave(context, people);
    const id = identity(context.account);
    const requests = [...visible].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const rows = requests.map(item => {
      const approvable = role === 'NS' && item.status === 'confirmed' && item.requesterId !== id;
      const confirmable = role === 'DT1' && item.status === 'submitted' && item.requesterRole === 'CN' && item.teamId === context.account.teamId;
      let actions = '—';
      if (approvable) actions = actionButton('approve-leave', item.id, 'Duyệt', 'primary') + actionButton('reject-leave', item.id, 'Từ chối', 'soft');
      if (confirmable) actions = actionButton('confirm-leave', item.id, 'Xác nhận', 'primary') + actionButton('reject-leave', item.id, 'Từ chối', 'soft');
      const stateBadge = item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning';
      return `<tr><td><strong>${esc(item.requesterName)}</strong></td><td>${esc(byId(state.teams,item.teamId)?.name || item.teamId || '—')}</td>
        <td>${formatDate(item.start)} – ${formatDate(item.end)}</td><td>${esc(leaveTypes[item.type] || 'Chưa phân loại')} · ${esc(item.reason)}${item.substitute ? '<br>Thay ca: ' + esc(item.substituteName || item.substitute) : ''}</td>
        <td><span class="badge badge-${stateBadge}">${esc(leaveStates[item.status])}</span></td><td><div class="v2-people-actions">${actions}</div></td></tr>`;
    });
    const approved = visible.filter(item => item.status === 'approved').sort((a,b) => a.start.localeCompare(b.start));
    const calendar = approved.map(item => `<tr><td>${formatDate(item.start)} – ${formatDate(item.end)}</td><td>${esc(item.requesterName)}</td>
      <td>${esc(byId(state.teams,item.teamId)?.name || item.teamId || '—')}</td></tr>`);
    const substitutes = state.accounts.filter(item => item.roleId === 'DT1' && item.id !== context.account.id
      && item.teamId === context.account.teamId && item.status === 'ACTIVE' && item.demoLogin);
    const leaveType = select('Loại nghỉ', 'type', '<option value="">Chọn loại nghỉ</option>' + Object.entries(leaveTypes).map(([value, label]) => `<option value="${value}">${label}</option>`).join(''));
    const cover = role === 'DT1' ? select('Người thay thế', 'substitute', '<option value="">Chọn quản lý cùng đội</option>' + substitutes.map(item => `<option value="${esc(item.id)}">${esc(item.fullName)}</option>`).join('')) : '';
    const requestForm = role === 'NS' ? '' : `<details class="v2-people-add"><summary>+ Tạo đơn nghỉ của tôi</summary>
      ${form('create-leave', input('Từ ngày', 'start', 'required', 'date') + input('Đến hết ngày', 'end', 'required', 'date') + leaveType + cover + input('Lý do nghỉ', 'reason', 'required maxlength="240"'), 'Gửi đơn nghỉ')}</details>`;
    const unavailable = role === 'CN' ? '' : `<span>Đang nghỉ hôm nay <strong>${new Set(approved.filter(a => a.start <= today() && a.end >= today()).map(a => a.requesterId)).size}</strong></span>`;
    return panel(role === 'NS' ? 'Quản lý nghỉ phép' : role === 'DT1' ? 'Nghỉ phép của đội' : 'Đơn nghỉ của tôi',
      role === 'NS' ? 'Nhân sự duyệt sau khi đội trưởng xác nhận, rồi cập nhật lịch nghỉ.' : role === 'DT1' ? 'Xác nhận đơn của đội và theo dõi đơn của mình.' : 'Tạo đơn và theo dõi trạng thái xác nhận, duyệt.',
      `${requestForm}
      <div class="v2-people-counter"><span>Đơn theo phạm vi <strong>${visible.length}</strong></span>${unavailable}</div>
      ${table(['Người đề nghị', 'Đội', 'Khoảng nghỉ', 'Lý do', 'Trạng thái', 'Thao tác'], rows, 'Danh sách đơn nghỉ', 'Chưa có đơn nghỉ trong phạm vi của anh/chị.')}
      <h4 class="v2-people-calendar-title">Lịch nghỉ đã duyệt</h4>
      ${table(['Khoảng nghỉ', 'Người nghỉ', 'Đội'], calendar, 'Lịch nghỉ đã duyệt', 'Chưa có kỳ nghỉ được duyệt.')}`);
  }

  function render(tab, context) {
    const role = views.get(tab);
    if (!mayUse(context, role)) {
      return panel('Không có quyền xem', 'Màn hình dành cho vai trò được phân công.', '');
    }
    const people = read(context);
    if (tab === 'v2-director-people') return rosterView(context, people, true);
    if (tab === 'ns-workers') return rosterView(context, people);
    if (['ns-assignments', 'v2-team-assignments'].includes(tab)) return assignmentView(context, people);
    return leaveView(context, people);
  }

  function searchKey(value) {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('đ', 'd').trim();
  }

  function updateRosterFilters(panel, requestedPage = 1) {
    const filters = Object.fromEntries([...panel.querySelectorAll('[data-people-filter]')].map(field => [field.dataset.peopleFilter, field.value]));
    const query = searchKey(filters.search);
    const rows = [...panel.querySelectorAll('[data-people-row]')];
    const matches = rows.filter(row => searchKey(`${row.dataset.name} ${row.dataset.code}`).includes(query)
      && ['status', 'team', 'project', 'contract'].every(key => !filters[key] || row.dataset[key] === filters[key])
      && (!filters.start || row.dataset.start >= filters.start)
      && (!filters.end || (row.dataset.end && row.dataset.end <= filters.end)));
    const pager = panel.querySelector('[data-people-pages]');
    const count = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const page = Math.max(1, Math.min(requestedPage, count));
    const offset = (page - 1) * PAGE_SIZE;
    const visible = new Set(pager ? matches.slice(offset, offset + PAGE_SIZE) : matches);
    for (const row of rows) row.hidden = !visible.has(row);
    if (pager) {
      pager.hidden = count <= 1;
      pager.dataset.page = page;
      pager.querySelector('[role="status"]').textContent = `${offset + 1}–${Math.min(offset + PAGE_SIZE, matches.length)} / ${matches.length}`;
      pager.querySelector('[data-people-page="-1"]').disabled = page <= 1;
      pager.querySelector('[data-people-page="1"]').disabled = page >= count;
    }
    panel.querySelectorAll('[data-people-status]').forEach(button => button.setAttribute('aria-pressed', button.dataset.peopleStatus === filters.status));
    const emptyRow = panel.querySelector('[data-people-empty]');
    if (emptyRow) emptyRow.hidden = matches.length > 0;
    const exportButton = panel.querySelector('[data-people-export]');
    if (exportButton) exportButton.disabled = matches.length === 0;
  }

  function exportRoster(panel) {
    const rows = [...panel.querySelectorAll('thead tr, [data-people-row]:not([hidden])')]
      .map(row => [...row.cells].slice(0, -1).map(cell => cell.innerText.trim()));
    window.NPReport.download(rows, 'NP-ONE-nhan-su');
  }

  function usedAttendance(ctx, worker, teamId, period) {
    return Object.entries(ctx.data.attendance?.periods || {}).some(([key, sheet]) => {
      if (!['submitted', 'confirmed', 'locked'].includes(sheet.status)) return false;
      const [month, recordedTeam, half] = key.split('/');
      const first = month + (half === 'first' ? '-01' : '-16');
      const last = month + (half === 'first' ? '-15' : '-31');
      if (first > period.end || period.start > last) return false;
      return recordedTeam === teamId || recordedTeam === worker.teamId
        || sheet.snapshot?.rows?.some(item => item.id === worker.id);
    });
  }

  function handle(action, formData, context) {
    if (action === 'worker-detail') return openWorkerDetail(formData.get('id'), context);
    const hr = mayUse(context, 'NS');
    const lead = mayUse(context, 'DT1');
    const workerRole = mayUse(context, 'CN');
    if (!hr && !lead && !workerRole) throw new Error('Tài khoản không có quyền thực hiện thao tác này.');

    const people = read(context);
    const actor = normalize(context.account.fullName) || normalize(context.account.username) || 'Người dùng';
    const actorId = identity(context.account);
    if (!actorId) throw new Error('Không nhận diện được tài khoản hiện tại.');
    const workers = roster(context, people);
    const at = new Date().toISOString();
    const requestId = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);

    if (action === 'create-worker' && hr) {
      const code = normalize(formData.get('code')).toUpperCase();
      const name = normalize(formData.get('name'));
      const joinedOn = dateValue(formData.get('joinedOn'));
      if (!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code) || !name || name.length > 120) throw new Error('Nhập họ tên và mã nhân sự hợp lệ.');
      if (formData.get('joinedOn') && !joinedOn) throw new Error('Ngày vào làm không hợp lệ.');
      if ([...workers, ...(context.state.accounts || [])].some(w => [w.code, w.workerCode, w.username].some(v => String(v || '').toUpperCase() === code))) throw new Error('Mã nhân sự đã được sử dụng.');
      people.employees.push({ id: requestId(), code, name });
      people.profiles[code] = { status: 'active', joinedOn, spells: joinedOn ? [{ start: joinedOn }] : [], history: [
        { at, by: actor, status: 'active', reason: 'Tạo hồ sơ', before: null, after: { status: 'active', joinedOn } }
      ] };
    } else if (action === 'update-profile' && hr) {
      const code = normalize(formData.get('workerCode'));
      const status = normalize(formData.get('status'));
      if (!workers.some(w => w.code === code) || !Object.hasOwn(profileStates, status)) throw new Error('Hồ sơ nhân sự không hợp lệ.');
      const joinedOn = dateValue(formData.get('joinedOn'));
      const leftOn = dateValue(formData.get('leftOn'));
      const rehiredOn = dateValue(formData.get('rehiredOn'));
      const contractUntil = dateValue(formData.get('contractUntil'));
      const contractType = normalize(formData.get('contractType'));
      if (contractType && !Object.hasOwn(contractTypes, contractType)) throw new Error('Chọn loại hợp đồng hợp lệ.');
      const dates = { joinedOn, leftOn, rehiredOn, contractUntil };
      if (Object.entries(dates).some(([field, value]) => formData.get(field) && !value)) throw new Error('Ngày trong hồ sơ không hợp lệ.');
      if (joinedOn && contractUntil && contractUntil < joinedOn) throw new Error('Hạn hợp đồng phải từ ngày vào làm trở đi.');
      if ((leftOn && joinedOn && leftOn < joinedOn) || (rehiredOn && leftOn && rehiredOn < leftOn)) throw new Error('Kiểm tra thứ tự ngày vào làm, nghỉ việc và tái tuyển.');
      const previous = Object.hasOwn(people.profiles, code) ? people.profiles[code] : {};
      const reason = normalize(formData.get('reason'));
      if (!reason || reason.length > 180) throw new Error('Nhập lý do cập nhật hồ sơ.');
      if (status === 'left' && !leftOn) throw new Error('Nhập ngày nghỉ việc.');
      if (status === 'rehired' && (!leftOn || !rehiredOn || rehiredOn <= leftOn)) throw new Error('Ngày tái tuyển phải sau ngày nghỉ việc.');
      const { history = [], spells: oldSpells, ...before } = previous;
      const spells = structuredClone(oldSpells || (previous.joinedOn ? [{ start: previous.joinedOn, end: previous.leftOn || undefined }] : []));
      if (!spells.length && joinedOn) spells.push({ start: joinedOn });
      if (status === 'left' && spells.length) {
        if (leftOn < spells.at(-1).start) throw new Error('Ngày nghỉ việc phải từ ngày bắt đầu đợt làm việc hiện tại.');
        spells.at(-1).end = leftOn;
      }
      if (status === 'rehired' && !spells.some(spell => spell.start === rehiredOn)) {
        if (spells.length && leftOn < spells.at(-1).start) throw new Error('Kiểm tra ngày nghỉ của đợt làm việc gần nhất.');
        if (spells.length) spells.at(-1).end ||= leftOn;
        spells.push({ start: rehiredOn });
      }
      const after = { status, ...dates, contractType, identityReady: formData.has('identityReady'), contractReady: formData.has('contractReady') };
      people.profiles[code] = { ...after, spells, history: [...history, { at, by: actor, status, reason, before, after }] };
    } else if (action === 'filter-assignments' && (hr || lead)) {
      const mode = normalize(formData.get('mode'));
      const date = dateValue(formData.get('date'));
      const projectId = normalize(formData.get('projectId'));
      const teamId = normalize(formData.get('teamId'));
      const shift = normalize(formData.get('shift'));
      if (!['day','week','month'].includes(mode) || !date || (projectId && !byId(context.state.projects,projectId))
        || (teamId && !byId(context.state.teams,teamId)) || (shift && !Object.hasOwn(assignmentShifts,shift))) throw new Error('Bộ lọc lịch điều phối chưa hợp lệ.');
      const state = normalize(formData.get('state'));
      if (state && !['pending','confirmed'].includes(state)) throw new Error('Tình trạng phân công không hợp lệ.');
      calendarFilters.set(actorId,{mode,date,projectId,teamId,shift,state});
      context.refresh();
      return;
    } else if (action === 'assign' && hr) {
      const workerCode = normalize(formData.get('workerCode'));
      const team = byId(context.state.teams, normalize(formData.get('teamId')));
      const person = workers.find(w => w.code === workerCode);
      const period = range(formData);
      const shift = normalize(formData.get('shift')) || 'day';
      if (!Object.hasOwn(assignmentShifts, shift)) throw new Error('Chọn ca hợp lệ.');
      if (!person || !team || !byId(context.state.projects, team.projectId)) throw new Error('Chọn đúng nhân sự, đội và công trình.');
      if (Object.hasOwn(people.profiles, workerCode) && people.profiles[workerCode].status === 'left') throw new Error('Cần cập nhật hồ sơ tái tuyển trước khi phân công.');
      if (people.assignments.some(a => a.workerCode === workerCode && overlaps(a, period))) throw new Error('Khoảng ngày trùng phân công của nhân sự.');
      if (people.leave.some(a => a.workerCode === workerCode && a.status !== 'rejected' && overlaps(a, period))) throw new Error('Nhân sự có đơn nghỉ trùng khoảng hiệu lực.');
      if (usedAttendance(context, person, team.id, period)) throw new Error('Bảng công liên quan đã gửi hoặc khóa. Điều chỉnh công qua phiếu riêng.');
      people.assignments.push({ id: requestId(), workerCode, teamId: team.id, projectId: team.projectId, shift, ...period,
        reason: normalize(formData.get('reason')).slice(0,180), status: 'pending', requestedBy: actorId, by: actor, at });
    } else if (action === 'confirm-assignment' && (hr || lead)) {
      const item = byId(people.assignments, normalize(formData.get('id')));
      if (!item || item.status !== 'pending' || item.requestedBy === actorId
        || (lead && item.teamId !== context.account.teamId)) throw new Error('Phân công chưa hợp lệ hoặc ngoài phạm vi.');
      const person = workers.find(worker => worker.code === item.workerCode);
      if (!person || usedAttendance(context, person, item.teamId, item)) throw new Error('Bảng công liên quan đã gửi hoặc khóa.');
      if (people.leave.some(leave => leave.workerCode === item.workerCode && leave.status !== 'rejected' && overlaps(leave,item))) {
        throw new Error('Nhân sự có đơn nghỉ trùng khoảng hiệu lực.');
      }
      item.status = 'confirmed';
      item.confirmedBy = actorId;
      item.confirmedByName = actor;
      item.confirmedAt = at;
    } else if (action === 'create-leave' && (lead || workerRole)) {
      const period = range(formData);
      const reason = normalize(formData.get('reason'));
      const type = normalize(formData.get('type'));
      if (!Object.hasOwn(leaveTypes, type)) throw new Error('Chọn loại nghỉ.');
      const substitute = lead ? context.state.accounts.find(item => item.id === formData.get('substitute')
        && item.id !== context.account.id && item.roleId === 'DT1' && item.teamId === context.account.teamId
        && item.status === 'ACTIVE' && item.demoLogin) : null;
      if (lead && !substitute) throw new Error('Chọn người phụ trách thay thế cùng đội.');
      const workerCode = normalize(context.account.workerCode || context.account.username);
      const person = workers.find(w => w.code === workerCode);
      const teamId = lead ? context.account.teamId : fixedTeam(person, people, period);
      if (!reason || reason.length > 240) throw new Error('Nhập lý do nghỉ từ 1 đến 240 ký tự.');
      if (!byId(context.state.teams, teamId)) throw new Error('Không xác định được một đội cho cả khoảng xin nghỉ. Hãy chia đơn theo ngày phân công.');
      if (people.leave.some(x => x.requesterId === actorId && x.status !== 'rejected' && overlaps(x, period))) throw new Error('Khoảng ngày trùng với một đơn nghỉ đã có.');
      const status = lead ? 'confirmed' : 'submitted';
      people.leave.push({ id: requestId(), requesterId: actorId, requesterRole: context.role, requesterName: actor, workerCode, teamId, ...period, reason, type, substitute: substitute?.id, substituteName: substitute?.fullName, status, createdAt: at, history: [{ status, by: actor, at }] });
    } else if (['confirm-leave', 'approve-leave', 'reject-leave'].includes(action)) {
      const item = byId(people.leave, normalize(formData.get('id')));
      if (!item || item.requesterId === actorId) throw new Error('Không tìm thấy đơn hoặc không thể tự duyệt đơn.');
      const teamAction = lead && item.requesterRole === 'CN' && item.teamId === context.account.teamId && item.status === 'submitted';
      const hrAction = hr && item.status === 'confirmed';
      let status;
      if (action === 'confirm-leave' && teamAction) status = 'confirmed';
      else if (action === 'approve-leave' && hrAction) status = 'approved';
      else if (action === 'reject-leave' && (teamAction || hrAction)) status = 'rejected';
      else throw new Error('Đơn đã đổi trạng thái hoặc nằm ngoài phạm vi xử lý.');
      item.status = status;
      item.history.push({ status, by: actor, at });
    } else {
      throw new Error('Tài khoản không có quyền thực hiện thao tác này.');
    }

    context.data.people = people;
    context.save();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('input', event => {
      if (!event.target.matches?.('[data-people-filter]')) return;
      updateRosterFilters(event.target.closest('.v2-people'));
    });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-people-add], [data-people-status], [data-people-export], [data-people-page]');
      if (!button) return;
      const panel = button.closest('.v2-people');
      if (button.hasAttribute('data-people-add')) {
        const formPanel = panel.querySelector('#np-people-create');
        formPanel.hidden = !formPanel.hidden;
        button.setAttribute('aria-expanded', !formPanel.hidden);
        if (!formPanel.hidden) formPanel.querySelector('input').focus();
      } else if (button.hasAttribute('data-people-status')) {
        panel.querySelector('[data-people-filter="status"]').value = button.dataset.peopleStatus;
        updateRosterFilters(panel);
      } else if (button.hasAttribute('data-people-page')) {
        const page = Number(button.parentElement.dataset.page || 1);
        updateRosterFilters(panel, page + Number(button.dataset.peoplePage));
      } else {
        exportRoster(panel);
      }
    });
  }

  window.NPPeople = { render, handle, attendanceBadge, detailButton, detailDialog };
})();
