(() => {
  const main = document.getElementById('appMain');
  const login = document.getElementById('fullLoginOverlay');
  const password = document.getElementById('fullLoginPin');
  const passwordToggle = document.querySelector('.np-password-toggle');
  const sidebar = document.getElementById('leftSidebar');
  const sidebarTriggers = document.querySelectorAll('[aria-controls="leftSidebar"]');

  function setPasswordVisible(visible) {
    password.type = visible ? 'text' : 'password';
    passwordToggle.setAttribute('aria-pressed', String(visible));
  }

  passwordToggle.addEventListener('click', () => setPasswordVisible(password.type === 'password'));
  new MutationObserver(() => {
    if (!login.classList.contains('open')) setPasswordVisible(false);
  }).observe(login, { attributes: true, attributeFilter: ['class'] });

  new MutationObserver(() => {
    for (const trigger of sidebarTriggers) trigger.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
  }).observe(sidebar, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('click', event => {
    const popover = document.querySelector('.np-notices[open]');
    if (popover && !popover.contains(event.target)) popover.open = false;
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const popover = document.querySelector('.np-notices[open]');
    if (popover) {
      popover.open = false;
      popover.querySelector('summary').focus();
    } else if (sidebar.classList.contains('open')) {
      window.NPApp.toggleSidebar(false);
      document.querySelector('.np-brand-menu').focus();
    }
  });

  function presentTables() {
    for (const table of main.querySelectorAll('.table-scroll > table:not([data-np-card-table])')) {
      if (table.closest('.np-excel-scroll')) continue;
      const headings = table.tHead?.rows;
      if (headings?.length !== 1 || [...headings[0].cells].some(cell => cell.colSpan !== 1)) continue;
      const labels = [...headings[0].cells].map(cell => cell.textContent.trim());
      if (!labels.length) continue;
      table.dataset.npCardTable = '';
      for (const row of [...table.tBodies].flatMap(body => [...body.rows])) {
        if (row.cells.length !== labels.length || [...row.cells].some(cell => cell.colSpan !== 1 || cell.rowSpan !== 1)) continue;
        for (const [index, cell] of [...row.cells].entries()) {
          if (labels[index]) cell.dataset.npLabel = labels[index];
        }
        const section = table.closest('.np-approval');
        if (!section) continue;
        const primary = section.classList.contains('np-approval-delete') ? [3, 7, 8] : [1, 6, 8, 9];
        const detailCells = [...row.cells].filter((_, index) => !primary.includes(index));
        detailCells.forEach((cell, index) => {
          cell.classList.add('np-approval-extra');
          cell.style.setProperty('--np-approval-order', String(index + 2));
        });
        row.cells[primary[0]].classList.add('np-approval-name');
        const actions = row.cells[primary.at(-1)];
        actions.classList.add('np-approval-actions');
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-soft btn-sm np-approval-details';
        toggle.textContent = 'Chi tiết';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', () => {
          const expanded = row.classList.toggle('np-approval-expanded');
          toggle.setAttribute('aria-expanded', String(expanded));
          toggle.textContent = expanded ? 'Thu gọn' : 'Chi tiết';
        });
        actions.prepend(toggle);
      }
    }
  }

  const mobileCards = window.matchMedia('(max-width: 720px)');
  function presentMobile() {
    if (mobileCards.matches) presentTables();
  }
  new MutationObserver(presentMobile).observe(main, { childList: true });
  mobileCards.addEventListener('change', presentMobile);
  presentMobile();
})();
