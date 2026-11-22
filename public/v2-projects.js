(() => {
  const PAGE_SIZE = 50;
  const sections = { teams: 'Đội thi công', workers: 'Nhân sự', attendance: 'Chấm công', tasks: 'Công việc' };
  const views = new Map();
  const present = worker => ['DANG_LAM', 'DA_RA'].includes(worker.attendanceStatus);
  const allowed = context => context.role === 'BGD' ? context.state.projects.filter(project => !context.account.projectId || context.account.projectId === 'ALL' || context.account.projectId === project.id) : [];

  function pageItems(rows, page) {
    const count = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const current = Math.min(page, count);
    const offset = (current - 1) * PAGE_SIZE;
    return { rows: rows.slice(offset, offset + PAGE_SIZE), count, current, offset };
  }

  function projectButton(action, id, label, css = 'btn btn-soft') {
    return `<button type="button" class="${css}" data-np-module="projects" data-np-action="${action}" data-np-id="${window.NPWorkspace.esc(id)}">${label}</button>`;
  }

  function footer(total, page) {
    if (page.count <= 1) return '';
    return `<nav class="np-project-pagination" aria-label="Phân trang công trình">
      <span role="status">${page.offset + 1}–${page.offset + page.rows.length} / ${total}</span>
      ${page.current > 1 ? projectButton('page', page.current - 1, 'Trước') : '<button type="button" class="btn btn-soft" disabled>Trước</button>'}
      <span>Trang ${page.current} / ${page.count}</span>
      ${page.current < page.count ? projectButton('page', page.current + 1, 'Sau') : '<button type="button" class="btn btn-soft" disabled>Sau</button>'}
    </nav>`;
  }

  function sharedTable(headers, rows, empty) {
    if (!rows.length) return `<p class="np-project-empty">${empty}</p>`;
    return `<div class="table-scroll" tabindex="0"><table class="data-table">
      <thead><tr>${headers.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function projectList(projects, context, view) {
    const { state, esc } = context;
    const icon = window.NPWorkspace.icon;
    const page = pageItems(projects, view.page);
    const cards = page.rows.map(project => {
      const teamCount = state.teams.filter(team => team.projectId === project.id).length;
      const workerCount = state.workers.filter(worker => worker.projectId === project.id).length;
      return projectButton('open', project.id, `
        <span class="np-project-card-top"><span class="np-project-icon">${icon('building')}</span><span>${esc(project.code || project.id)}</span>${icon('arrow')}</span>
        <strong class="np-project-card-name">${esc(project.name)}</strong>
        ${project.address ? `<span class="np-project-card-address">${esc(project.address)}</span>` : ''}
        <span class="np-project-card-counts"><span><b>${teamCount}</b> đội</span><span><b>${workerCount}</b> nhân sự</span></span>
        <span class="np-project-card-link">Xem chi tiết</span>`, 'np-project-card');
    }).join('');
    return `<section class="np-work-card np-projects"><h2>Công trình <span class="np-project-count">${projects.length}</span></h2>
      ${cards ? `<div class="np-project-cards">${cards}</div>${footer(projects.length,page)}` : '<p class="np-project-empty">Chưa có công trình trong phạm vi tài khoản.</p>'}
    </section>`;
  }

  function projectDetail(project, context, view) {
    const { state, esc } = context;
    const icon = window.NPWorkspace.icon;
    const teams = state.teams.filter(team => team.projectId === project.id);
    const workers = state.workers.filter(worker => worker.projectId === project.id);
    const tasks = (state.tasks || []).filter(task => task.projectId === project.id);
    const teamName = new Map(teams.map(team => [team.id, team.name]));
    const headcounts = new Map();
    for (const worker of workers) headcounts.set(worker.teamId, (headcounts.get(worker.teamId) || 0) + 1);
    const taskStatus = { DANG_THUC_HIEN: 'Đang thực hiện', HOAN_THANH: 'Hoàn thành', CHUA_BAT_DAU: 'Chưa bắt đầu', CHO_NHAN: 'Chờ nhận' };
    const cell = value => esc(value ?? '—');
    const { attendanceBadge, detailButton, detailDialog } = window.NPPeople;
    const records = worker => {
      const day = worker.date?.split('-');
      return day?.length === 3 ? day.reverse().join('/') : worker.date;
    };
    const definitions = {
      teams: [['Đội', 'Đội trưởng', 'Nhân sự'], teams, team => [team.name, team.leader, headcounts.get(team.id) || 0].map(cell), 'Công trình chưa có đội thi công.'],
      workers: [['Mã NV', 'Họ và tên', 'Vị trí', 'Đội', 'Hồ sơ'], workers, worker => [worker.code, worker.name, worker.roleName, teamName.get(worker.teamId)].map(cell).concat(detailButton(worker, esc)), 'Chưa có nhân sự thuộc công trình.'],
      attendance: [['Mã NV', 'Họ và tên', 'Ngày ghi nhận', 'Vào ca', 'Ra ca', 'Trạng thái', 'Hồ sơ'], workers, worker => [worker.code, worker.name, records(worker), worker.checkInTime, worker.checkOutTime].map(cell).concat(attendanceBadge(worker.attendanceStatus), detailButton(worker, esc)), 'Chưa có dữ liệu chấm công.'],
      tasks: [['Hạng mục', 'Đội thi công', 'Ngày', 'Tiến độ', 'Trạng thái'], tasks, task => [task.title, teamName.get(task.teamId), task.date, Number.isFinite(task.progressPercent) ? task.progressPercent + '%' : '—', taskStatus[task.status] || '—'].map(cell), 'Chưa có công việc của công trình.']
    };
    const [headers, items, toRow, empty] = definitions[view.section];
    const page = pageItems(items, view.page);
    return `<div class="np-project-detail">
      ${projectButton('back', 'list', icon('back') + ' Tất cả công trình', 'btn btn-soft np-project-back')}
      <section class="np-work-card np-project-intro">
        <div class="np-project-intro-heading"><span class="np-project-icon">${icon('building')}</span><div>
          <p>${esc(project.code || project.id)}</p><h1>${esc(project.name)}</h1>
        </div></div>
        <dl><div><dt>Địa chỉ</dt><dd>${esc(project.address || 'Chưa cập nhật')}</dd></div><div><dt>Quản lý công trình</dt><dd>${esc(project.manager || 'Chưa phân công')}</dd></div></dl>
        <div class="np-project-stats">
          <div><strong>${teams.length}</strong><span>Đội thi công</span></div>
          <div><strong>${workers.length}</strong><span>Nhân sự</span></div>
          <div><strong>${workers.filter(present).length}</strong><span>Có mặt theo bản ghi</span></div>
        </div>
      </section>
      <section class="np-work-card np-project-related" data-project-section="${view.section}">
        <nav class="np-project-tabs" aria-label="Thông tin công trình">${Object.entries(sections).map(([id, name]) => `<button type="button" data-np-module="projects" data-np-action="section" data-np-id="${id}" aria-pressed="${id === view.section}">${name}</button>`).join('')}</nav>
        <h2>${sections[view.section]} <span class="np-project-count">${items.length}</span></h2>
        ${sharedTable(headers, page.rows.map(toRow), empty)}
        ${footer(items.length,page)}
      </section>
      <button type="button" class="btn btn-soft np-project-finance" data-np-target="v2-director-payments" data-np-project="${esc(project.id)}">${icon('money')} Tài chính công trình ${icon('arrow')}</button>
      ${detailDialog}
    </div>`;
  }

  function render(_tab, context) {
    const projects = allowed(context);
    if (context.role !== 'BGD') return '';
    const project = projects.find(item => item.id === context.projectNav);
    const key = project?.id || '';
    const saved = views.get(context.account.id);
    const view = saved?.key === key ? saved : { key, section: 'teams', page: 1 };
    views.set(context.account.id, view);
    return project ? projectDetail(project, context, view) : projectList(projects, context, view);
  }

  function handle(action, values, context) {
    const projects = allowed(context);
    if (context.role !== 'BGD') return;
    const id = values.get('id');
    const view = views.get(context.account.id);
    if (action === 'open') {
      if (!projects.some(project => project.id === id)) return;
      context.setProjectNav(id);
      views.delete(context.account.id);
    } else if (action === 'back') {
      context.setProjectNav('');
      views.delete(context.account.id);
    } else if (action === 'section' && view && Object.hasOwn(sections, id)) {
      view.section = id;
      view.page = 1;
    } else if (action === 'page' && view && Number.isInteger(Number(id)) && Number(id) > 0) {
      view.page = Number(id);
    } else {
      return;
    }
    context.refresh();
    if (action === 'open' || action === 'back') {
      const heading = document.querySelector('.np-project-detail h1, .np-projects h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
      document.querySelector('#appMain')?.scrollIntoView({ block: 'start' });
    }
    if (action === 'section') document.querySelector('.np-project-tabs [aria-pressed="true"]')?.focus({ preventScroll: true });
  }

  window.NPProjects = { render, handle };
})();
