// Ứng dụng Quản lý Chấm công, Nhân sự & Tính lương 5 cấp NP ONE - Nguyên Phát HR
// Phiên bản Hoàn thiện Bàn giao theo Hệ thiết kế Navy · Cam (v1.0 - 22/11/2026)
(function () {
  const STORAGE_KEY = 'NP_ONE_HR_STATE_V5';
  const THEME_KEY = 'NP_ONE_THEME_V1';

  let state = loadState();
  let currentTab = 'quan-ly';
  let currentRoleId = 'BGD';
  let currentAccountId = 'ACC-01';
  let requirePinOnRoleSwitch = false;
  let filterProject = 'ALL';
  let filterTeam = 'ALL';
  let filterStatus = 'ALL';
  let searchQuery = '';
  let liveStream = null;
  let cameraFacingMode = 'user';
  let deferredInstallPrompt = null;

  let liveGps = {
    hasRealGps: false,
    lat: null,
    lng: null,
    acc: null,
    address: 'Đang lấy vị trí GPS thực tế từ thiết bị...',
    updatedAt: null
  };
  let gpsWatchId = null;
  let lastGeocodedKey = '';

  let sampleImgObj = new Image();
  sampleImgObj.src = 'assets/sample-selfie-worker.png';

  const TAB_TITLES = {
    'quan-ly': 'Quản lý Chấm công · Camera GPS',
    'quan-so': 'Quân số & Báo cáo 08:30',
    'tang-ca': 'Công việc & Tăng ca (Chốt 17:30)',
    'bang-cong': 'Bảng Công (Ngày / Tuần / Tháng)',
    'luong': 'Lương & Duyệt Ứng lương',
    'doi': 'Đội & Công trình (Tọa độ GPS)',
    'nhan-su': 'Hồ sơ Nhân sự',
    'phan-quyen': 'Admin Quản trị & Tạo Tài khoản theo Vị trí',
    'so-do': 'Sơ đồ & 5 Quy tắc Kiểm soát'
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.workers && parsed.workers.length >= 100 && parsed.accounts) {
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(window.NP_SEED));
  }

  function getCurrentAccount() {
    if (!state.accounts || !state.accounts.length) return null;
    return state.accounts.find(a => a.id === currentAccountId) || state.accounts[0];
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      }).catch(() => {});
    } catch (e) {}
    updateTopBadges();
    renderMorningReport830();
  }

  function formatVND(num) {
    return Number(num || 0).toLocaleString('vi-VN') + 'đ';
  }

  function getCurrentRole() {
    return state.roles.find(r => r.id === currentRoleId) || state.roles[0];
  }

  function getProject(projectId) {
    return state.projects.find(p => p.id === projectId) || state.projects[0];
  }

  function getTeam(teamId) {
    return state.teams.find(t => t.id === teamId) || state.teams[0];
  }

  // ================= ĐỔI BỘ MÀU 1 (NAVY & CAM) <-> BỘ MÀU 2 (XANH VỊNH & VÀNG MẬT) =================
  function toggleTheme() {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'bo-2') {
      html.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'bo-1');
    } else {
      html.setAttribute('data-theme', 'bo-2');
      localStorage.setItem(THEME_KEY, 'bo-2');
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'bo-2') {
      document.documentElement.setAttribute('data-theme', 'bo-2');
    }
  }

  // ================= ĐÓNG / MỞ MENU BÊN TRÁI =================
  function toggleSidebar(forceOpen) {
    const sidebar = document.getElementById('leftSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    } else {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    }
  }

  function selectTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('#sidebarMenu .sidebar-item[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('#mobileBottomNav .bnav-item[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    const sub = document.getElementById('currentTabSubtitle');
    if (sub) sub.textContent = TAB_TITLES[tabName] || 'NP ONE HR';

    toggleSidebar(false);
    renderMain();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCameraFromSidebar(actionType) {
    toggleSidebar(false);
    openCameraQuick(actionType, null);
  }

  // ================= ĐỊNH VỊ GPS THẬT TỪ THIẾT BỊ & DỊCH ĐỊA CHỈ THẬT =================
  async function reverseGeocodeRealGps(lat, lng) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === lastGeocodedKey && liveGps.address && !liveGps.address.startsWith('Đang')) {
      return liveGps.address;
    }
    lastGeocodedKey = key;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',').map(s => s.trim()).filter(Boolean);
          const cleanAddr = parts.slice(0, 5).join(', ');
          liveGps.address = cleanAddr;
          updateGpsStatusBox();
          applyRealGpsToProjectsAndWorkers(lat, lng, liveGps.acc || 12, cleanAddr);
          drawLivePreviewOnCanvas();
          return cleanAddr;
        }
      }
    } catch (e) {}
    try {
      const res2 = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`);
      if (res2.ok) {
        const d2 = await res2.json();
        const addr2 = [d2.locality, d2.city, d2.principalSubdivision, d2.countryName].filter(Boolean).join(', ');
        if (addr2) {
          liveGps.address = addr2;
          updateGpsStatusBox();
          applyRealGpsToProjectsAndWorkers(lat, lng, liveGps.acc || 12, addr2);
          drawLivePreviewOnCanvas();
          return addr2;
        }
      }
    } catch (e2) {}
    liveGps.address = `Vị trí GPS thực tế (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
    updateGpsStatusBox();
    applyRealGpsToProjectsAndWorkers(lat, lng, liveGps.acc || 12, liveGps.address);
    drawLivePreviewOnCanvas();
    return liveGps.address;
  }

  function updateGpsStatusBox() {
    const el = document.getElementById('gpsLiveStatus');
    if (!el) return;
    if (liveGps.hasRealGps) {
      el.innerHTML = `
        <div style="color:var(--ds-primary); font-weight:700;">Đã định vị GPS thực tế của thiết bị:</div>
        <div style="color:var(--ds-text); margin-top:2px;">📍 <strong>Địa điểm:</strong> ${liveGps.address}</div>
        <div style="color:var(--ds-link); margin-top:2px;">🌐 <strong>Tọa độ:</strong> <code>${liveGps.lat.toFixed(6)}, ${liveGps.lng.toFixed(6)}</code> (Sai số: ±${liveGps.acc}m)</div>
      `;
    } else {
      el.innerHTML = `<span style="color:var(--ds-text-muted);">${liveGps.address}</span>`;
    }
  }

  function refreshRealGps() {
    if (!navigator.geolocation) {
      liveGps.address = 'Thiết bị không hỗ trợ Geolocation API';
      updateGpsStatusBox();
      return;
    }
    liveGps.address = 'Đang bắt tín hiệu vệ tinh GPS độ chính xác cao...';
    updateGpsStatusBox();

    navigator.geolocation.getCurrentPosition(
      pos => {
        liveGps.hasRealGps = true;
        liveGps.lat = Number(pos.coords.latitude.toFixed(6));
        liveGps.lng = Number(pos.coords.longitude.toFixed(6));
        liveGps.acc = Math.max(3, Math.round(pos.coords.accuracy || 12));
        liveGps.updatedAt = new Date();
        updateGpsStatusBox();
        drawLivePreviewOnCanvas();
        reverseGeocodeRealGps(liveGps.lat, liveGps.lng);
      },
      err => {
        liveGps.address = `Chưa cấp quyền vị trí (${err.message}). Bấm "Lấy lại GPS" và chọn Cho phép.`;
        updateGpsStatusBox();
        drawLivePreviewOnCanvas();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    if (!gpsWatchId) {
      gpsWatchId = navigator.geolocation.watchPosition(
        pos => {
          liveGps.hasRealGps = true;
          liveGps.lat = Number(pos.coords.latitude.toFixed(6));
          liveGps.lng = Number(pos.coords.longitude.toFixed(6));
          liveGps.acc = Math.max(3, Math.round(pos.coords.accuracy || 12));
          liveGps.updatedAt = new Date();
          updateGpsStatusBox();
          drawLivePreviewOnCanvas();
          reverseGeocodeRealGps(liveGps.lat, liveGps.lng);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
    }
  }

  function applyRealGpsToProjectsAndWorkers(lat, lng, acc, address) {
    if (!lat || !lng) return;
    if (state.projects[0]) {
      state.projects[0].lat = lat;
      state.projects[0].lng = lng;
      if (address && !address.startsWith('Đang')) {
        state.projects[0].address = address;
      }
    }
    state.workers.slice(0, 15).forEach((w, idx) => {
      if (!w.customPhotoDataUrl) {
        w.lat = Number((lat + ((idx % 5) - 2) * 0.00004).toFixed(6));
        w.lng = Number((lng + ((idx % 4) - 1.5) * 0.00004).toFixed(6));
        w.acc = idx === 0 ? acc : Math.max(5, acc + (idx % 12));
        if (address && !address.startsWith('Đang')) {
          w.realAddress = address;
        }
      }
    });
    Object.keys(photoCache).forEach(k => delete photoCache[k]);
    renderMain();
  }

  // ================= VẼ ẢNH CHẤM CÔNG CÓ ĐÓNG DẤU WATERMARK NAVY · CAM =================
  const photoCache = {};
  function getWatermarkedPhotoUrl(worker) {
    if (worker.customPhotoDataUrl) {
      return worker.customPhotoDataUrl;
    }
    const cacheKey = `${worker.id}_${worker.checkInTime}_${worker.checkOutTime}_${worker.lat}_${worker.lng}_${worker.realAddress || ''}`;
    if (photoCache[cacheKey]) return photoCache[cacheKey];

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    const proj = getProject(worker.projectId);

    ctx.fillStyle = '#123A70';
    ctx.fillRect(0, 0, 480, 480);

    if (worker.useRealSamplePhoto && sampleImgObj.complete && sampleImgObj.naturalWidth > 0) {
      ctx.drawImage(sampleImgObj, 0, 0, 480, 480);
    } else {
      const seed = worker.avatarSeed || 1;
      const skinColors = ['#d9a17c', '#c68b63', '#e0ac8b', '#b97c56'];
      const shirtColors = ['#0B2D5B', '#123A70', '#0E5A6B', '#1A7DB0'];

      ctx.fillStyle = shirtColors[seed % shirtColors.length];
      ctx.beginPath();
      ctx.ellipse(240, 465, 165, 115, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#F7931E';
      ctx.fillRect(145, 390, 28, 85);
      ctx.fillRect(307, 390, 28, 85);

      ctx.fillStyle = skinColors[seed % skinColors.length];
      ctx.fillRect(205, 295, 70, 65);
      ctx.beginPath();
      ctx.ellipse(240, 235, 82, 98, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16233A';
      ctx.beginPath();
      ctx.arc(206, 225, 7, 0, Math.PI * 2);
      ctx.arc(274, 225, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F7931E';
      ctx.beginPath();
      ctx.arc(240, 182, 96, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#E8840F';
      ctx.beginPath();
      ctx.ellipse(240, 182, 112, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16233A';
      ctx.font = 'bold 17px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('NP ONE', 240, 148);
    }

    // Khung Watermark nền Navy sâu (#07203F) chuẩn Hệ thiết kế Navy · Cam
    ctx.fillStyle = 'rgba(7, 32, 63, 0.92)';
    ctx.fillRect(0, 325, 480, 155);

    ctx.fillStyle = '#F7931E';
    ctx.fillRect(14, 336, 250, 22);
    ctx.fillStyle = '#16233A';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CAMERA TRỰC TIẾP · ĐỊNH VỊ GPS', 22, 351);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13.5px Segoe UI, sans-serif';
    ctx.fillText(`Mã NV: ${worker.code}  |  Họ tên: ${worker.name}`, 14, 378);

    ctx.fillStyle = '#F7931E';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText(`Thời gian: ${worker.checkInTime} — ${worker.date}`, 14, 400);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.fillText(`Địa điểm: ${(worker.realAddress || proj.address).slice(0, 46)}`, 14, 422);

    ctx.fillStyle = '#26A7DE';
    ctx.font = '11.5px Segoe UI, sans-serif';
    ctx.fillText(`Công trình: ${proj.name}`, 14, 442);

    ctx.fillStyle = '#F8F6EF';
    ctx.font = '11.5px Segoe UI, sans-serif';
    ctx.fillText(`Tọa độ GPS: ${worker.lat}, ${worker.lng} (±${worker.acc}m)`, 14, 462);

    ctx.fillStyle = '#0B2D5B';
    ctx.strokeStyle = '#F7931E';
    ctx.lineWidth = 2;
    ctx.fillRect(388, 422, 78, 44);
    ctx.strokeRect(388, 422, 78, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('NP ONE', 427, 444);
    ctx.fillStyle = '#F7931E';
    ctx.font = '9px Segoe UI, sans-serif';
    ctx.fillText('NGUYÊN PHÁT', 427, 458);

    const url = canvas.toDataURL('image/jpeg', 0.88);
    photoCache[cacheKey] = url;
    return url;
  }

  function computeMorningStats() {
    const total = state.workers.length;
    const workingNow = state.workers.filter(w => w.attendanceStatus === 'DANG_LAM');
    const ct1 = workingNow.filter(w => w.projectId === 'CT1').length;
    const ct2 = workingNow.filter(w => w.projectId === 'CT2').length;
    const ct3 = workingNow.filter(w => w.projectId === 'CT3').length;
    const lateCount = state.workers.filter(w => w.isLate).length;
    const leaveCount = state.workers.filter(w => w.attendanceStatus === 'NGHI_PHEP').length;
    const unexcusedCount = state.workers.filter(w => w.attendanceStatus === 'NGHI_KP').length;
    const forgotCoCount = state.workers.filter(w => w.forgotCheckoutFlag).length;
    const estimatedCostToday = workingNow.reduce((sum, w) => sum + Number(w.dailyWage || 450000), 0);

    return {
      total,
      presentCount: workingNow.length,
      ct1,
      ct2,
      ct3,
      lateCount,
      leaveCount,
      unexcusedCount,
      forgotCoCount,
      estimatedCostToday
    };
  }

  function renderMorningReport830() {
    const s = computeMorningStats();
    const banner = document.getElementById('morningReportBanner');
    if (!banner) return;
    banner.innerHTML = `
      <div class="banner-830-compact">
        <span class="kicker" style="margin-bottom:2px;">BÁO CÁO TỰ ĐỘNG 08:30 SÁNG CHO BAN GIÁM ĐỐC</span>
        "08:30 — Tổng quân số có mặt: <strong>${s.presentCount}/${s.total}</strong>
        (CT1: <strong>${s.ct1}</strong> | CT2: <strong>${s.ct2}</strong> | CT3: <strong>${s.ct3}</strong>)
        · Đi muộn: <strong>${s.lateCount}</strong>
        · Nghỉ phép: <strong>${s.leaveCount}</strong>
        · Nghỉ không phép: <strong>${s.unexcusedCount}</strong>
        · Ước tính chi phí nhân công hôm nay: <strong>${formatVND(s.estimatedCostToday)}</strong>"
      </div>
    `;
  }

  function updateTopBadges() {
    const s = computeMorningStats();
    const bFeed = document.getElementById('badgeTotalFeed');
    const bPres = document.getElementById('badgePresentSide');
    const bForgot = document.getElementById('badgeForgotCo');
    const bAdv = document.getElementById('badgePendingAdv');
    const bProj = document.getElementById('badgeProjectCount');
    const bWCount = document.getElementById('badgeWorkerCountSide');
    const bAccCount = document.getElementById('badgeAccountCount');

    if (bFeed) bFeed.textContent = state.workers.length;
    if (bPres) bPres.textContent = `${s.presentCount}/${s.total}`;
    if (bForgot) bForgot.textContent = s.forgotCoCount;
    if (bProj) bProj.textContent = `${state.projects.length} CT`;
    if (bWCount) bWCount.textContent = state.workers.length;
    if (bAccCount && state.accounts) bAccCount.textContent = `${state.accounts.length} TK`;
    if (bAdv) {
      const pending = state.advances.filter(a => a.status !== 'BGD_DA_DUYET' && a.status !== 'TU_CHOI').length;
      bAdv.textContent = pending;
    }
  }

  function renderMain() {
    const container = document.getElementById('appMain');
    if (!container) return;

    if (currentTab === 'quan-ly') renderTabQuanLy(container);
    else if (currentTab === 'quan-so') renderTabQuanSo(container);
    else if (currentTab === 'tang-ca') renderTabTangCa(container);
    else if (currentTab === 'bang-cong') renderTabBangCong(container);
    else if (currentTab === 'luong') renderTabLuong(container);
    else if (currentTab === 'doi') renderTabDoi(container);
    else if (currentTab === 'nhan-su') renderTabNhanSu(container);
    else if (currentTab === 'phan-quyen') renderTabPhanQuyen(container);
    else if (currentTab === 'so-do') renderTabSoDo(container);
  }

  // ================= TAB 1: 📊 QUẢN LÝ (CHUẨN HỆ THIẾT KẾ NAVY · CAM) =================
  function renderTabQuanLy(container) {
    const filtered = state.workers.filter(w => {
      if (filterProject !== 'ALL' && w.projectId !== filterProject) return false;
      if (filterTeam !== 'ALL' && w.teamId !== filterTeam) return false;
      if (filterStatus !== 'ALL' && w.attendanceStatus !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const cardsHtml = filtered.map(w => {
      const proj = getProject(w.projectId);
      const team = getTeam(w.teamId);
      const photoUrl = getWatermarkedPhotoUrl(w);

      let statusBadge = `<span class="status-pill status-working">Đang làm</span>`;
      if (w.attendanceStatus === 'DA_RA') {
        statusBadge = `<span class="status-pill status-out">Đã ra (${w.checkOutTime})</span>`;
      } else if (w.attendanceStatus === 'NGHI_PHEP') {
        statusBadge = `<span class="status-pill status-leave">Nghỉ phép</span>`;
      } else if (w.attendanceStatus === 'NGHI_KP') {
        statusBadge = `<span class="status-pill status-unexcused">Nghỉ KP</span>`;
      }

      const lateBadge = w.isLate ? `<span class="status-pill status-leave">Muộn ${w.lateMin}p</span>` : '';
      const forgotBadge = w.forgotCheckoutFlag ? `<span class="status-pill status-forgot">Quá 17:30</span>` : '';
      const approvalBadge = w.approvalStatus === 'DA_DUYET'
        ? `<span style="font-size:12px; color:var(--ds-primary); font-weight:700;">🔒 Đã duyệt</span>`
        : `<span style="font-size:12px; color:var(--ds-text-muted); font-weight:600;">Chờ duyệt</span>`;

      // Quy tắc 6: Mỗi khối chỉ MỘT nút chính màu Cam (.btn-primary), các nút còn lại dùng .btn-navy và .btn-soft
      return `
        <div class="worker-card-mobile">
          <div class="wc-top">
            <img class="wc-photo" src="${photoUrl}" alt="${w.name}" onclick="window.NPApp.openPhotoModal('${w.id}')" title="Chạm xem ảnh đóng dấu GPS" />
            <div class="wc-info">
              <div class="wc-name-row">
                <span class="wc-name">${w.name}</span>
                <span class="wc-seq">#${w.seq} · ${w.checkInTime} · ${w.date}</span>
              </div>
              <div class="wc-meta">
                <strong style="color:var(--ds-primary);">${w.code}</strong>
                <span>· ${team.id} (${proj.id})</span>
                ${statusBadge}
                ${lateBadge}
                ${forgotBadge}
                ${approvalBadge}
              </div>
              <div class="wc-gps">
                📍 ${w.realAddress || proj.address} (${w.lat}, ${w.lng} ±${w.acc}m)
              </div>
            </div>
          </div>
          <div class="wc-actions">
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openCameraQuick('VAO', '${w.id}')">
              📸 Check-in Vào
            </button>
            <button class="btn btn-navy btn-sm" onclick="window.NPApp.openCameraQuick('RA', '${w.id}')">
              Check-out Ra
            </button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAdjustModal('${w.id}')">
              Điều chỉnh
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-grid-mobile">
          <input class="input-ctl full-row" type="text" placeholder="Tìm tên hoặc mã công nhân..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select class="select-ctl" onchange="window.NPApp.setFilterProject(this.value)">
            <option value="ALL" ${filterProject === 'ALL' ? 'selected' : ''}>Tất cả Công trình (${state.projects.length})</option>
            ${state.projects.map(p => `<option value="${p.id}" ${filterProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <select class="select-ctl" onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>Tất cả ${state.teams.length} Đội</option>
            ${state.teams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
          <select class="select-ctl" onchange="window.NPApp.setFilterStatus(this.value)">
            <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>Mọi trạng thái (${state.workers.length})</option>
            <option value="DANG_LAM" ${filterStatus === 'DANG_LAM' ? 'selected' : ''}>Đang làm</option>
            <option value="NGHI_PHEP" ${filterStatus === 'NGHI_PHEP' ? 'selected' : ''}>Nghỉ phép</option>
            <option value="NGHI_KP" ${filterStatus === 'NGHI_KP' ? 'selected' : ''}>Nghỉ không phép</option>
            <option value="DA_RA" ${filterStatus === 'DA_RA' ? 'selected' : ''}>Đã ra ca</option>
          </select>
          <button class="btn btn-navy btn-sm" onclick="window.NPApp.approveAllVisible()">
            ✔️ Duyệt công
          </button>
        </div>
      </div>

      <div style="margin-bottom:10px; font-size:13.5px; color:var(--ds-text-muted); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Chạm vào <strong>ảnh</strong> để xem phóng to · Bấm <strong>Check-in Vào</strong> để mở Camera chụp GPS</span>
        <strong style="color:var(--ds-primary);">Hiển thị ${filtered.length}/${state.workers.length} nhân sự · 11/2026</strong>
      </div>

      <div class="feed-list">
        ${cardsHtml || '<div class="section-card" style="text-align:center; color:var(--ds-text-muted);">Không tìm thấy công nhân phù hợp bộ lọc.</div>'}
      </div>
    `;
  }

  // ================= TAB 2: 📈 QUÂN SỐ =================
  function renderTabQuanSo(container) {
    const s = computeMorningStats();
    const projectRows = state.projects.map(p => {
      const pWorkers = state.workers.filter(w => w.projectId === p.id);
      const working = pWorkers.filter(w => w.attendanceStatus === 'DANG_LAM').length;
      const late = pWorkers.filter(w => w.isLate).length;
      const leave = pWorkers.filter(w => w.attendanceStatus === 'NGHI_PHEP').length;
      const kp = pWorkers.filter(w => w.attendanceStatus === 'NGHI_KP').length;
      const cost = pWorkers.filter(w => w.attendanceStatus === 'DANG_LAM').reduce((sum, w) => sum + w.dailyWage, 0);
      return `
        <tr>
          <td><strong style="color:var(--ds-primary);">${p.name}</strong><br/><small style="color:var(--ds-text-muted);">📍 ${p.address}</small></td>
          <td><strong>${working}/${pWorkers.length}</strong></td>
          <td>${late}</td>
          <td>${leave}P / <strong style="color:var(--ds-danger);">${kp}KP</strong></td>
          <td><strong style="color:var(--ds-primary);">${formatVND(cost)}</strong></td>
        </tr>
      `;
    }).join('');

    const teamRows = state.teams.map(t => {
      const proj = getProject(t.projectId);
      const tWorkers = state.workers.filter(w => w.teamId === t.id);
      const working = tWorkers.filter(w => w.attendanceStatus === 'DANG_LAM').length;
      const leave = tWorkers.filter(w => w.attendanceStatus === 'NGHI_PHEP').length;
      const kp = tWorkers.filter(w => w.attendanceStatus === 'NGHI_KP').length;
      return `
        <tr>
          <td><strong style="color:var(--ds-primary);">${t.name}</strong><br/><small style="color:var(--ds-text-muted);">${t.leader}</small></td>
          <td>${proj.id}</td>
          <td><strong>${working}/${tWorkers.length}</strong></td>
          <td>${leave}P / ${kp}KP</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-box featured">
          <div class="kpi-label">QUÂN SỐ CÓ MẶT</div>
          <div class="kpi-val">${s.presentCount}/${s.total}</div>
          <div class="kpi-sub">CT1:${s.ct1} · CT2:${s.ct2} · CT3:${s.ct3} · 11/2026</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">ĐI MUỘN</div>
          <div class="kpi-val">${s.lateCount}</div>
          <div class="kpi-sub">Ghi nhận sau 08:08 · 11/2026</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">NGHỈ CÓ PHÉP</div>
          <div class="kpi-val">${s.leaveCount}</div>
          <div class="kpi-sub">Đã báo Đội trưởng · 11/2026</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">NGHỈ KHÔNG PHÉP</div>
          <div class="kpi-val">${s.unexcusedCount}</div>
          <div class="kpi-sub">Cần nhắc nhở · 11/2026</div>
        </div>
        <div class="kpi-box" style="grid-column: span 2;">
          <div class="kpi-label">CHI PHÍ NHÂN CÔNG HÔM NAY</div>
          <div class="kpi-val">${formatVND(s.estimatedCostToday)}</div>
          <div class="kpi-sub">Nguồn: Báo cáo tự động 08:30 · 11/2026</div>
        </div>
      </div>

      <div class="section-card">
        <div>
          <span class="kicker">THỐNG KÊ THEO DỰ ÁN</span>
          <h3>Quân số &amp; Chi phí theo Công trình</h3>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công trình &amp; Địa điểm</th>
                <th>Có mặt</th>
                <th>Đi muộn</th>
                <th>Nghỉ P/KP</th>
                <th>Chi phí ngày</th>
              </tr>
            </thead>
            <tbody>${projectRows}</tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <div>
          <span class="kicker">THỐNG KÊ TỔ ĐỘI</span>
          <h3>Quân số theo 6 Đội thi công</h3>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Đội &amp; Đội trưởng</th>
                <th>Công trình</th>
                <th>Có mặt</th>
                <th>Nghỉ P/KP</th>
              </tr>
            </thead>
            <tbody>${teamRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 3: 🧰 CÔNG VIỆC & TĂNG CA =================
  function renderTabTangCa(container) {
    const forgotList = state.workers.filter(w => w.forgotCheckoutFlag);
    const otList = state.workers.filter(w => w.hoursOtRegistered > 0 || w.forgotCheckoutFlag).slice(0, 20);

    container.innerHTML = `
      <div class="section-card" style="background:var(--ds-bg-soft); border:2px solid var(--ds-accent);">
        <h3>
          <div>
            <span class="kicker">CHỐNG CỘNG KHỐNG GIỜ LÀM</span>
            <span>Kiểm soát ca quên Check-out sau 17:30</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.runCutoff1730Check()">⚡ Quét chốt ca 17:30</button>
        </h3>
        <p style="font-size:14px; color:var(--ds-text-muted); margin-bottom:14px;">
          Sau <strong>17:30</strong>, nhân sự chưa Check-out và Đội trưởng <strong>không có phiếu Đăng ký tăng ca</strong> sẽ tự động chốt tối đa <strong>8.0h hành chính (0h OT)</strong>, tuyệt đối không tự nhảy giờ tăng ca.
        </p>
        <div class="data-table-wrap">
          <table class="data-table" style="background:#FFFFFF;">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Giờ vào</th>
                <th>Trạng thái 17:30</th>
                <th>Thao tác xử lý</th>
              </tr>
            </thead>
            <tbody>
              ${forgotList.map(w => `
                <tr>
                  <td><strong style="color:var(--ds-primary);">${w.name}</strong><br/><small>${w.code} (${w.teamId})</small></td>
                  <td>${w.checkInTime}</td>
                  <td><span class="status-pill status-forgot">Khóa 8h HC (0h OT)</span></td>
                  <td>
                    <button class="btn btn-navy btn-sm" onclick="window.NPApp.confirmForgotCheckout('${w.id}', 0)">Chốt 17:30</button>
                    <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAdjustModal('${w.id}')">Báo có OT</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="4" style="text-align:center;">Tất cả các ca quên Check-out đã được xử lý.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>
          <div>
            <span class="kicker">PHÂN QUYỀN ĐỘC LẬP</span>
            <span>Đăng ký &amp; Duyệt Tăng ca (Đội trưởng nhập → QLCT duyệt)</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openOtModal()">➕ Đăng ký Tăng ca</button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Giờ OT</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${otList.map(w => `
                <tr>
                  <td><strong style="color:var(--ds-primary);">${w.name}</strong><br/><small>${w.code} · ${w.teamId}</small></td>
                  <td><strong style="color:var(--ds-primary);">+${w.hoursOtRegistered}h OT</strong></td>
                  <td>
                    ${w.approvalStatus === 'DA_DUYET'
                      ? `<span class="status-pill status-working">🔒 Đã duyệt</span>`
                      : `<span class="status-pill status-leave">Chờ duyệt</span>`}
                  </td>
                  <td>
                    <button class="btn btn-soft btn-sm" onclick="window.NPApp.openOtModal('${w.id}')">Sửa OT</button>
                    <button class="btn btn-navy btn-sm" onclick="window.NPApp.approveSingleWorker('${w.id}')">QLCT Duyệt</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 4: 🕒 BẢNG CÔNG & XUẤT EXCEL CSV =================
  function renderTabBangCong(container) {
    const sampleWorkers = state.workers.slice(0, 30);
    container.innerHTML = `
      <div class="section-card">
        <h3>
          <div>
            <span class="kicker">LUÂN CHUYỂN DỮ LIỆU</span>
            <span>Bảng Tổng hợp Công Ngày → Tuần → Tháng</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.exportAttendanceCsv()">📥 Xuất Excel (.CSV)</button>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.approveAllVisible()">✔️ QLCT Duyệt tất cả</button>
          </div>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Hôm nay</th>
                <th>Công Tháng</th>
                <th>OT Tháng</th>
                <th>Trạng thái</th>
                <th>Điều chỉnh</th>
              </tr>
            </thead>
            <tbody>
              ${sampleWorkers.map(w => `
                <tr>
                  <td><strong style="color:var(--ds-primary);">${w.name}</strong><br/><small>${w.code} (${w.teamId})</small></td>
                  <td>${w.hoursRegular > 0 ? '1.0 công' : 'Nghỉ'} (+${w.hoursOtActual}h)</td>
                  <td><strong style="color:var(--ds-primary);">${w.daysMonthApproved} công</strong></td>
                  <td>${w.otHoursMonthApproved}h</td>
                  <td>
                    ${w.approvalStatus === 'DA_DUYET'
                      ? `<span class="status-pill status-working">🔒 Đã duyệt</span>`
                      : `<span class="status-pill status-leave">Chờ duyệt</span>`}
                  </td>
                  <td>
                    <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAdjustModal('${w.id}')">Điều chỉnh</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <div>
          <span class="kicker">MINH BẠCH DỮ LIỆU</span>
          <h3>Lịch sử Điều chỉnh Công (Audit Log)</h3>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Thời gian / Người sửa</th>
                <th>Công nhân</th>
                <th>Thay đổi</th>
                <th>Lý do bắt buộc</th>
              </tr>
            </thead>
            <tbody>
              ${state.auditLogs.map(log => `
                <tr>
                  <td><strong>${log.timestamp}</strong><br/><small>${log.actor}</small></td>
                  <td><strong style="color:var(--ds-primary);">${log.workerName}</strong></td>
                  <td><span style="color:var(--ds-danger);">${log.oldValue}</span> → <strong style="color:var(--ds-primary);">${log.newValue}</strong></td>
                  <td><em>"${log.reason}"</em></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 5: 💰 LƯƠNG & DUYỆT ỨNG LƯƠNG =================
  function renderTabLuong(container) {
    const payrollWorkers = state.workers.slice(0, 25);
    container.innerHTML = `
      <div class="section-card" style="border:2px solid var(--ds-accent);">
        <h3>
          <div>
            <span class="kicker">KIỂM SOÁT TẠM ỨNG</span>
            <span>Duyệt Ứng Lương (100% khoản ứng phải được duyệt)</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAdvanceModal()">➕ Tạo Phiếu Xin Ứng</button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Lương lũy kế</th>
                <th>Số tiền ứng</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Phê duyệt</th>
              </tr>
            </thead>
            <tbody>
              ${state.advances.map(adv => {
                let badge = `<span class="status-pill status-working">GĐ Đã duyệt</span>`;
                if (adv.status === 'CHO_BGD_DUYET') badge = `<span class="status-pill status-leave">Chờ GĐ duyệt</span>`;
                else if (adv.status === 'CHO_KT_KIEM_TRA') badge = `<span class="status-pill status-out">Chờ KT kiểm tra</span>`;
                return `
                  <tr>
                    <td><strong style="color:var(--ds-primary);">${adv.workerName}</strong><br/><small>${adv.workerCode} · ${adv.date}</small></td>
                    <td>${formatVND(adv.accruedSalaryAtRequest)}</td>
                    <td style="color:var(--ds-danger); font-weight:700;">${formatVND(adv.amount)}</td>
                    <td>${adv.reason}</td>
                    <td>${badge}</td>
                    <td>
                      ${adv.status === 'CHO_KT_KIEM_TRA' ? `<button class="btn btn-soft btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'KT')">KT Xác nhận</button>` : ''}
                      ${adv.status !== 'BGD_DA_DUYET' ? `<button class="btn btn-navy btn-sm" onclick="window.NPApp.advanceStep('${adv.id}', 'BGD')">GĐ Duyệt</button>` : '<span style="font-size:12.5px; color:var(--ds-text-muted);">Đã trừ lương</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>
          <div>
            <span class="kicker">CHỐT LƯƠNG THÁNG 11/2026</span>
            <span>Bảng Tính Lương (Chỉ tính trên công Đã duyệt — Trừ Ứng lương Đã duyệt)</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.exportPayrollCsv()">📥 Xuất Excel Lương (.CSV)</button>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.approveMonthlyPayroll()">👑 Giám đốc Duyệt Lương</button>
          </div>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Công đã duyệt</th>
                <th>Lương Gộp</th>
                <th>Trừ Ứng</th>
                <th>Thực Lĩnh</th>
                <th>Phiếu lương</th>
              </tr>
            </thead>
            <tbody>
              ${payrollWorkers.map(w => {
                const hourly = w.dailyWage / 8;
                const basePay = w.daysMonthApproved * w.dailyWage;
                const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
                const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
                const gross = basePay + otPay + sunPay;
                const approvedAdvance = state.advances
                  .filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET')
                  .reduce((s, a) => s + a.amount, 0);
                const net = gross - approvedAdvance;
                return `
                  <tr>
                    <td><strong style="color:var(--ds-primary);">${w.name}</strong><br/><small>${w.code}</small></td>
                    <td>${w.daysMonthApproved} công (+${w.otHoursMonthApproved}h OT)</td>
                    <td>${formatVND(gross)}</td>
                    <td style="color:var(--ds-danger);">-${formatVND(approvedAdvance)}</td>
                    <td style="color:var(--ds-primary); font-weight:700;">${formatVND(net)}</td>
                    <td><button class="btn btn-soft btn-sm" onclick="window.NPApp.openPayslipModal('${w.id}')">Phiếu lương</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 6: 👷 ĐỘI & CÔNG TRÌNH =================
  function renderTabDoi(container) {
    container.innerHTML = `
      <div class="section-card">
        <h3>
          <div>
            <span class="kicker">ĐỊNH VỊ CÔNG TRƯỜNG</span>
            <span>Danh sách ${state.projects.length} Công trình &amp; Tâm GPS</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddProjectModal()">➕ Thêm Công trình mới</button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công trình</th>
                <th>Địa chỉ định vị</th>
                <th>Tọa độ GPS</th>
                <th>Quản lý CT</th>
                <th>Cập nhật GPS</th>
              </tr>
            </thead>
            <tbody>
              ${state.projects.map(p => `
                <tr>
                  <td><strong style="color:var(--ds-primary);">${p.name}</strong></td>
                  <td>📍 ${p.address}</td>
                  <td><code>${p.lat}, ${p.lng}</code> (±${p.radiusM}m)</td>
                  <td>${p.manager}</td>
                  <td>
                    <button class="btn btn-soft btn-sm" onclick="window.NPApp.setProjectToCurrentGps('${p.id}')">📍 Lấy GPS hiện tại</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <div>
          <span class="kicker">TỔ ĐỘI THI CÔNG</span>
          <h3>Danh sách ${state.teams.length} Đội Thi công</h3>
        </div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Đội</th>
                <th>Đội trưởng</th>
                <th>SĐT</th>
                <th>Quân số</th>
              </tr>
            </thead>
            <tbody>
              ${state.teams.map(t => `
                <tr>
                  <td><strong style="color:var(--ds-primary);">${t.name}</strong></td>
                  <td>${t.leader}</td>
                  <td>${t.phone}</td>
                  <td><strong>${state.workers.filter(w => w.teamId === t.id).length} CN</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 7: 👥 NHÂN SỰ (THÊM MỚI + XUẤT EXCEL) =================
  function renderTabNhanSu(container) {
    container.innerHTML = `
      <div class="section-card">
        <h3>
          <div>
            <span class="kicker">DỮ LIỆU NHÂN SỰ</span>
            <span>Hồ sơ ${state.workers.length} Công nhân Công ty Nguyên Phát</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAddWorkerModal()">➕ Thêm Công nhân mới</button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ tên &amp; Tay nghề</th>
                <th>Đội / CT</th>
                <th>Lương ngày</th>
                <th>Chấm công</th>
              </tr>
            </thead>
            <tbody>
              ${state.workers.map(w => `
                <tr>
                  <td><strong style="color:var(--ds-primary);">${w.code}</strong></td>
                  <td><strong>${w.name}</strong><br/><small style="color:var(--ds-text-muted);">${w.skill}</small></td>
                  <td>${w.teamId} · ${w.projectId}</td>
                  <td>${formatVND(w.dailyWage)}</td>
                  <td>
                    <button class="btn btn-soft btn-sm" onclick="window.NPApp.openCameraQuick('VAO', '${w.id}')">📸 Chụp GPS</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 8: 👑 ADMIN QUẢN TRỊ & TẠO TÀI KHOẢN THEO TỪNG VỊ TRÍ =================
  function renderTabPhanQuyen(container) {
    const accounts = state.accounts || [];
    const curAcc = getCurrentAccount();

    const permLabels = {
      checkin: 'Chấm công GPS',
      inputTeam: 'Nhập công/OT đội',
      approveWork: 'Duyệt công (QLCT)',
      accounting: 'Tính lương (KT)',
      approveDirector: 'Duyệt ứng/lương (GĐ)',
      adminUsers: 'Admin Tạo TK'
    };

    const accRows = accounts.map(acc => {
      const scopeText = (acc.projectId === 'ALL' ? 'Toàn công ty' : acc.projectId) +
        (acc.teamId && acc.teamId !== 'ALL' ? ` · ${acc.teamId}` : '');

      const activePerms = Object.keys(permLabels)
        .filter(k => acc.perms && acc.perms[k])
        .map(k => `<span class="status-pill status-out" style="font-size:9px;">✓ ${permLabels[k]}</span>`)
        .join(' ');

      const isCurrent = curAcc && curAcc.id === acc.id;
      const statusBadge = acc.status === 'ACTIVE'
        ? `<span class="status-pill status-working">Hoạt động</span>`
        : `<span class="status-pill status-unexcused">Đã khóa</span>`;

      return `
        <tr>
          <td>
            <strong style="color:var(--ds-primary);">${acc.username}</strong>
            <br/><small>PIN/MK: <code>${acc.pin}</code></small>
          </td>
          <td>
            <strong>${acc.fullName}</strong>
            <br/><small style="color:var(--ds-text-muted);">Cấp ${acc.level} · ${acc.positionTitle}</small>
          </td>
          <td><strong>${scopeText}</strong></td>
          <td style="max-width:260px;">${activePerms}</td>
          <td>${statusBadge}</td>
          <td style="white-space:nowrap;">
            <button class="btn ${isCurrent ? 'btn-primary' : 'btn-navy'} btn-sm" onclick="window.NPApp.loginAsAccount('${acc.id}')">
              ${isCurrent ? 'Đang đăng nhập' : 'Đăng nhập TK'}
            </button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openAccountFormModal('${acc.id}')">✏️ Sửa/Quyền</button>
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.toggleAccountStatus('${acc.id}')">${acc.status === 'ACTIVE' ? '🔒 Khóa' : '🔓 Mở'}</button>
            ${acc.username !== 'admin' ? `<button class="btn btn-soft btn-sm" style="color:var(--ds-danger);" onclick="window.NPApp.deleteAccount('${acc.id}')">✕</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="section-card" style="border:1.5px solid var(--ds-accent); background:var(--ds-bg-soft);">
        <h3>
          <div>
            <span class="kicker">TRUNG TÂM QUẢN TRỊ HỆ THỐNG (ADMIN)</span>
            <span>Quản lý &amp; Tạo Tài khoản cho từng Vị trí (${accounts.length} Tài khoản)</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-soft btn-sm" onclick="window.NPApp.openLoginModal()">🔐 Đăng nhập bằng Tên TK &amp; PIN</button>
            <button class="btn btn-primary btn-sm" onclick="window.NPApp.openAccountFormModal(null)">➕ Tạo Tài khoản Vị trí mới</button>
          </div>
        </h3>
        <p style="font-size:10.5px; color:var(--ds-text-muted); margin-bottom:8px;">
          Admin có toàn quyền <strong>Tạo tài khoản mới cho từng vị trí</strong> (Giám đốc, Kế toán, Quản lý từng Công trình CT1/CT2/CT3, Đội trưởng từng Đội 1..6, Công nhân), gán phạm vi dữ liệu được phép xem, cấp/thu hồi từng quyền hạn chi tiết, đổi mã PIN hoặc khóa tài khoản khi nhân sự nghỉ việc.
        </p>

        <div class="data-table-wrap">
          <table class="data-table" style="background:#FFFFFF;">
            <thead>
              <tr>
                <th>Tài khoản &amp; PIN</th>
                <th>Họ tên &amp; Vị trí chức danh</th>
                <th>Phạm vi phụ trách</th>
                <th>Quyền hạn được cấp</th>
                <th>Trạng thái</th>
                <th>Thao tác Admin</th>
              </tr>
            </thead>
            <tbody>${accRows}</tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>
          <div>
            <span class="kicker">CHUYỂN NHANH 5 CẤP MẶC ĐỊNH</span>
            <span>Ma trận 5 Cấp Phân quyền Chuẩn</span>
          </div>
          <button class="btn ${requirePinOnRoleSwitch ? 'btn-primary' : 'btn-soft'} btn-sm" onclick="window.NPApp.togglePinLockMode()">
            ${requirePinOnRoleSwitch ? '🔒 Đang BẬT hỏi mã PIN khi chuyển cấp' : '🔓 Đang TẮT hỏi PIN (Chế độ Test nhanh)'}
          </button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cấp</th>
                <th>Vai trò &amp; Người phụ trách</th>
                <th>Mã PIN</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${state.roles.map(r => `
                <tr>
                  <td><strong>Cấp ${r.level}</strong></td>
                  <td><strong style="color:var(--ds-primary);">${r.title}</strong><br/><small>${r.personName}</small></td>
                  <td><code>${r.pin}</code></td>
                  <td style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn ${currentRoleId === r.id ? 'btn-primary' : 'btn-navy'} btn-sm" onclick="window.NPApp.switchRole('${r.id}')">
                      ${currentRoleId === r.id ? 'Đang sử dụng' : 'Chọn vai trò'}
                    </button>
                    <button class="btn btn-soft btn-sm" onclick="window.NPApp.openChangePinModal('${r.id}')">🔑 Đổi PIN</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================= TAB 9: 🗺️ SƠ ĐỒ & QUY TẮC =================
  function renderTabSoDo(container) {
    container.innerHTML = `
      <div class="section-card">
        <div>
          <span class="kicker">MÔ HÌNH QUẢN TRỊ</span>
          <h3>Sơ đồ Phân cấp 5 Tầng — Công ty Nguyên Phát</h3>
        </div>
        <div class="org-flow-box">
          <div class="org-node" style="background:var(--ds-primary-deep);">1. BAN GIÁM ĐỐC<br/><small>Báo cáo tự động 08:30 · Duyệt 100% Ứng lương &amp; Bảng lương</small></div>
          <div>↓</div>
          <div class="org-node">2. HÀNH CHÍNH – KẾ TOÁN<br/><small>Tổng hợp công Ngày/Tuần/Tháng · Chỉ tính lương trên công ĐÃ DUYỆT</small></div>
          <div>↓</div>
          <div class="org-node" style="background:var(--ds-primary-2);">3. QUẢN LÝ CÔNG TRÌNH<br/><small>Đối chiếu ảnh định vị GPS thực tế · Duyệt công &amp; khóa bảng công</small></div>
          <div>↓</div>
          <div class="org-node" style="background:var(--ds-accent); color:var(--ds-on-accent);">4. ĐỘI TRƯỞNG (6 Đội)<br/><small>Chấm công đội · Đăng ký tăng ca · KHÔNG được tự duyệt công</small></div>
          <div>↓</div>
          <div class="org-node">5. CÔNG NHÂN (${state.workers.length} Công nhân)<br/><small>Chụp Camera trực tiếp (Chặn thư viện) · Đóng dấu Địa điểm &amp; Thời gian</small></div>
        </div>
      </div>
    `;
  }

  // ================= MODAL XEM ẢNH & CAMERA CHẤM CÔNG =================
  function openPhotoModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const proj = getProject(w.projectId);
    const team = getTeam(w.teamId);
    const photoUrl = getWatermarkedPhotoUrl(w);
    const displayAddr = w.realAddress || proj.address;

    document.getElementById('photoModalTitle').textContent = `Ảnh Chấm Công — ${w.name}`;
    document.getElementById('photoModalBody').innerHTML = `
      <div style="text-align:center;">
        <img src="${photoUrl}" alt="${w.name}" style="width:100%; max-width:440px; border-radius:var(--ds-radius-md); border:1px solid var(--ds-line);" />
      </div>
      <div style="margin-top:14px; background:var(--ds-bg-soft); padding:14px 16px; border-radius:var(--ds-radius-sm); border:1px solid var(--ds-line); font-size:13.5px; display:grid; gap:5px;">
        <div><strong>Công nhân:</strong> ${w.name} (<code>${w.code}</code>) — ${team.name}</div>
        <div><strong>Thời gian chấm công:</strong> <span style="color:var(--ds-primary); font-weight:700;">${w.checkInTime} Ngày ${w.date}</span></div>
        <div><strong>Địa điểm định vị:</strong> <span style="color:var(--ds-primary); font-weight:700;">${displayAddr}</span></div>
        <div><strong>Tọa độ GPS:</strong> <code>${w.lat}, ${w.lng}</code> (Sai số: <strong>±${w.acc}m</strong>)</div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px;">
        <button class="btn btn-primary" onclick="window.NPApp.closeModal('photoModal'); window.NPApp.openCameraQuick('VAO', '${w.id}')">📸 Chụp Check-in</button>
        <button class="btn btn-navy" onclick="window.NPApp.closeModal('photoModal'); window.NPApp.openCameraQuick('RA', '${w.id}')">Chụp Check-out</button>
      </div>
    `;
    document.getElementById('photoModal').classList.add('open');
  }

  function openCameraQuick(actionType, preselectedWorkerId) {
    const selWorker = document.getElementById('camWorkerSelect');
    const selProj = document.getElementById('camProjectSelect');
    const selAction = document.getElementById('camActionType');

    selWorker.innerHTML = state.workers.map(w =>
      `<option value="${w.id}">${w.code} — ${w.name} (${w.teamId})</option>`
    ).join('');

    if (preselectedWorkerId) {
      selWorker.value = preselectedWorkerId;
    }

    selProj.innerHTML = state.projects.map(p =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');

    if (actionType) {
      selAction.value = actionType;
    }

    const headerTitle = document.getElementById('cameraModalHeaderTitle');
    const snapBtn = document.getElementById('btnSnapSubmit');
    if (selAction.value === 'RA') {
      if (headerTitle) headerTitle.textContent = 'Chụp Camera Check-out (Ra ca)';
      if (snapBtn) snapBtn.textContent = '📸 Chụp & Check-out ngay';
    } else {
      if (headerTitle) headerTitle.textContent = 'Chụp Camera Check-in (Vào ca)';
      if (snapBtn) snapBtn.textContent = '📸 Chụp & Check-in ngay';
    }

    document.getElementById('cameraModal').classList.add('open');
    refreshRealGps();
    startHardwareCamera();
    drawLivePreviewOnCanvas();
  }

  function openCameraModal() {
    openCameraQuick('VAO', null);
  }

  function toggleCameraFacing() {
    cameraFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    if (liveStream) {
      liveStream.getTracks().forEach(t => t.stop());
      liveStream = null;
    }
    startHardwareCamera();
  }

  function drawLivePreviewOnCanvas() {
    const canvas = document.getElementById('captureCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const wId = document.getElementById('camWorkerSelect').value || state.workers[0].id;
    const projId = document.getElementById('camProjectSelect').value || 'CT1';
    const actionType = document.getElementById('camActionType').value || 'VAO';
    const worker = state.workers.find(x => x.id === wId) || state.workers[0];
    const proj = getProject(projId);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const dateStr = now.toLocaleDateString('vi-VN');

    const realLat = liveGps.hasRealGps ? liveGps.lat : proj.lat;
    const realLng = liveGps.hasRealGps ? liveGps.lng : proj.lng;
    const realAcc = liveGps.hasRealGps ? liveGps.acc : 15;
    const realAddr = (liveGps.hasRealGps && liveGps.address && !liveGps.address.startsWith('Đang'))
      ? liveGps.address
      : proj.address;

    ctx.fillStyle = '#07203F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const video = document.getElementById('liveVideo');
    if (liveStream && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else if (sampleImgObj.complete && sampleImgObj.naturalWidth > 0) {
      ctx.drawImage(sampleImgObj, 0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = 'rgba(7, 32, 63, 0.92)';
    ctx.fillRect(0, canvas.height - 165, canvas.width, 165);

    ctx.fillStyle = '#F7931E';
    ctx.fillRect(16, canvas.height - 152, 340, 22);
    ctx.fillStyle = '#16233A';
    ctx.font = 'bold 11.5px Segoe UI, sans-serif';
    ctx.fillText(
      actionType === 'VAO'
        ? 'CHECK-IN VÀO CA · CAMERA TRỰC TIẾP GPS'
        : 'CHECK-OUT RA CA · CAMERA TRỰC TIẾP GPS',
      22,
      canvas.height - 137
    );

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14.5px Segoe UI, sans-serif';
    ctx.fillText(`Mã NV: ${worker.code}   |   Họ tên: ${worker.name}`, 16, canvas.height - 108);

    ctx.fillStyle = '#F7931E';
    ctx.font = 'bold 13.5px Segoe UI, sans-serif';
    ctx.fillText(`Thời gian chấm công: ${timeStr} — Ngày ${dateStr}`, 16, canvas.height - 85);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12.5px Segoe UI, sans-serif';
    ctx.fillText(`Địa điểm: ${realAddr.slice(0, 60)}`, 16, canvas.height - 62);

    ctx.fillStyle = '#26A7DE';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(`Công trình: ${proj.name}`, 16, canvas.height - 42);

    ctx.fillStyle = '#F8F6EF';
    ctx.font = 'bold 12.5px Segoe UI, sans-serif';
    ctx.fillText(`Tọa độ GPS: ${realLat}, ${realLng}   |   Sai số: ±${realAcc} m`, 16, canvas.height - 20);

    ctx.fillStyle = '#0B2D5B';
    ctx.strokeStyle = '#F7931E';
    ctx.lineWidth = 2;
    ctx.fillRect(canvas.width - 108, canvas.height - 72, 92, 52);
    ctx.strokeRect(canvas.width - 108, canvas.height - 72, 92, 52);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('NP ONE', canvas.width - 92, canvas.height - 43);
  }

  function startHardwareCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    if (liveStream) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode }, audio: false })
      .then(stream => {
        liveStream = stream;
        const video = document.getElementById('liveVideo');
        video.srcObject = stream;
        video.play();
        setInterval(() => {
          if (document.getElementById('cameraModal').classList.contains('open')) {
            drawLivePreviewOnCanvas();
          }
        }, 250);
      })
      .catch(() => {
        drawLivePreviewOnCanvas();
      });
  }

  function closeCameraModal() {
    if (liveStream) {
      liveStream.getTracks().forEach(t => t.stop());
      liveStream = null;
    }
    document.getElementById('cameraModal').classList.remove('open');
  }

  function snapAndSubmitCheckin() {
    drawLivePreviewOnCanvas();
    const canvas = document.getElementById('captureCanvas');
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const wId = document.getElementById('camWorkerSelect').value;
    const actionType = document.getElementById('camActionType').value;
    const projId = document.getElementById('camProjectSelect').value;

    const worker = state.workers.find(x => x.id === wId);
    const proj = getProject(projId);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const dateStr = now.toLocaleDateString('vi-VN');

    const realLat = liveGps.hasRealGps ? liveGps.lat : proj.lat;
    const realLng = liveGps.hasRealGps ? liveGps.lng : proj.lng;
    const realAcc = liveGps.hasRealGps ? liveGps.acc : 15;
    const realAddr = (liveGps.hasRealGps && liveGps.address && !liveGps.address.startsWith('Đang'))
      ? liveGps.address
      : proj.address;

    if (worker) {
      const maxSeq = Math.max(...state.workers.map(w => w.seq || 4900));
      worker.seq = maxSeq + 1;
      worker.projectId = proj.id;
      worker.lat = realLat;
      worker.lng = realLng;
      worker.acc = realAcc;
      worker.realAddress = realAddr;
      worker.date = dateStr;
      worker.customPhotoDataUrl = dataUrl;
      if (actionType === 'VAO') {
        worker.checkInTime = timeStr;
        worker.checkOutTime = null;
        worker.attendanceStatus = 'DANG_LAM';
      } else {
        worker.checkOutTime = timeStr;
        worker.attendanceStatus = 'DA_RA';
        worker.forgotCheckoutFlag = false;
      }
      state.workers = [worker, ...state.workers.filter(x => x.id !== worker.id)];
      saveState();
      renderMain();
    }
    closeCameraModal();
  }

  function handleCheckout(workerId) {
    openCameraQuick('RA', workerId);
  }

  // ================= MODAL ĐIỀU CHỈNH CÔNG (CÓ BÁO LỖI INLINE CHUẨN MỤC 6) =================
  function openAdjustModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const role = getCurrentRole();

    document.getElementById('adjustModalTitle').textContent = 'Điều chỉnh Chấm công (Lưu Audit Log)';
    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-left:4px solid var(--ds-accent); padding:12px 14px; border-radius:var(--ds-radius-sm); margin-bottom:14px; font-size:13px;">
        <strong>Kiểm soát độc lập:</strong> Bảng công đã duyệt không tự ý sửa. Mọi điều chỉnh bắt buộc nhập lý do lưu vào Audit Log (${role.personName}).
      </div>
      <div class="form-group">
        <label>Công nhân</label>
        <input type="text" value="${w.code} — ${w.name} (${w.teamId})" disabled />
      </div>
      <div class="form-group">
        <label for="adjStatus">Trạng thái chấm công <span class="req">*</span></label>
        <select id="adjStatus">
          <option value="DANG_LAM" ${w.attendanceStatus === 'DANG_LAM' ? 'selected' : ''}>Đang làm (Có mặt)</option>
          <option value="DA_RA" ${w.attendanceStatus === 'DA_RA' ? 'selected' : ''}>Đã Check-out</option>
          <option value="NGHI_PHEP" ${w.attendanceStatus === 'NGHI_PHEP' ? 'selected' : ''}>Nghỉ phép (P)</option>
          <option value="NGHI_KP" ${w.attendanceStatus === 'NGHI_KP' ? 'selected' : ''}>Nghỉ không phép (KP)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Giờ công hành chính &amp; Giờ tăng ca (OT)</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <input type="number" id="adjRegHours" value="${w.hoursRegular}" min="0" max="8" step="0.5" />
          <input type="number" id="adjOtHours" value="${w.hoursOtActual}" min="0" max="12" step="0.5" />
        </div>
      </div>
      <div class="form-group">
        <label for="adjReason">Lý do điều chỉnh <span class="req">*</span></label>
        <textarea id="adjReason" rows="2" placeholder="Nhập lý do cụ thể (VD: Bổ sung biên bản xác nhận đổ bê tông ca tối)..."></textarea>
        <div id="adjReasonErr" class="field-error-msg" style="display:none;">Vui lòng nhập rõ lý do điều chỉnh để lưu vào lịch sử Audit Log.</div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAdjustment('${w.id}')">Lưu điều chỉnh</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAdjustment(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const reasonEl = document.getElementById('adjReason');
    const errEl = document.getElementById('adjReasonErr');
    const reason = (reasonEl.value || '').trim();
    if (!reason) {
      reasonEl.style.borderColor = 'var(--ds-danger)';
      if (errEl) errEl.style.display = 'block';
      return;
    }
    const newStatus = document.getElementById('adjStatus').value;
    const newReg = Number(document.getElementById('adjRegHours').value || 0);
    const newOt = Number(document.getElementById('adjOtHours').value || 0);
    const role = getCurrentRole();

    state.auditLogs.unshift({
      id: 'LOG-' + (state.auditLogs.length + 103),
      timestamp: new Date().toLocaleString('vi-VN'),
      workerCode: w.code,
      workerName: w.name,
      actor: `${role.personName} (${role.title})`,
      field: 'Điều chỉnh Công & OT',
      oldValue: `${w.hoursRegular}h HC + ${w.hoursOtActual}h OT`,
      newValue: `${newReg}h HC + ${newOt}h OT (${newStatus})`,
      reason
    });

    w.attendanceStatus = newStatus;
    w.hoursRegular = newReg;
    w.hoursOtActual = newOt;
    w.hoursOtRegistered = newOt;
    w.forgotCheckoutFlag = false;

    if (role.level >= 4) {
      w.approvalStatus = 'CHO_DUYET';
      w.approvedBy = null;
    }

    saveState();
    document.getElementById('adjustModal').classList.remove('open');
    renderMain();
  }

  // ================= MODAL ĐĂNG KÝ TĂNG CA CHUẨN (THAY CHO PROMPT) =================
  function openOtModal(workerId) {
    const w = workerId ? state.workers.find(x => x.id === workerId) : state.workers[0];
    document.getElementById('adjustModalTitle').textContent = 'Đăng ký Giờ Tăng ca (Đội trưởng báo OT)';
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label for="otWorkerSel">Chọn Công nhân đăng ký tăng ca <span class="req">*</span></label>
        <select id="otWorkerSel">
          ${state.workers.slice(0, 50).map(item => `<option value="${item.id}" ${w && item.id === w.id ? 'selected' : ''}>${item.code} — ${item.name} (${item.teamId})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="otHoursInput">Số giờ tăng ca đăng ký (giờ) <span class="req">*</span></label>
        <input type="number" id="otHoursInput" value="${w ? (w.hoursOtRegistered || 2) : 2}" min="0" max="12" step="0.5" />
      </div>
      <div class="form-group">
        <label for="otNoteInput">Hạng mục thi công tăng ca <span class="req">*</span></label>
        <input type="text" id="otNoteInput" value="Đổ bê tông sàn & hoàn thiện" placeholder="Nhập công việc tăng ca..." />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitOtModal()">Lưu đăng ký OT</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitOtModal() {
    const wId = document.getElementById('otWorkerSel').value;
    const hours = Number(document.getElementById('otHoursInput').value || 0);
    const w = state.workers.find(x => x.id === wId);
    if (w) {
      w.hoursOtRegistered = hours;
      w.hoursOtActual = hours;
      w.approvalStatus = 'CHO_DUYET';
      w.approvedBy = null;
      saveState();
      renderMain();
    }
    document.getElementById('adjustModal').classList.remove('open');
  }

  // ================= MODAL TẠO PHIẾU XIN ỨNG LƯƠNG CHUẨN (THAY CHO PROMPT) =================
  function openAdvanceModal() {
    const w0 = state.workers[0];
    const accrued0 = w0.daysMonthApproved * w0.dailyWage;
    document.getElementById('adjustModalTitle').textContent = 'Tạo Phiếu Xin Ứng Lương (Duyệt 100%)';
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label for="advWorkerSel">Chọn Công nhân xin ứng lương <span class="req">*</span></label>
        <select id="advWorkerSel" onchange="window.NPApp.updateAdvanceAccruedPreview()">
          ${state.workers.slice(0, 60).map(w => `<option value="${w.id}">${w.code} — ${w.name} (${w.teamId})</option>`).join('')}
        </select>
      </div>
      <div id="advAccruedBox" style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); padding:10px 14px; margin-bottom:14px; font-size:13.5px;">
        Lương lũy kế đã duyệt: <strong style="color:var(--ds-primary);">${formatVND(accrued0)}</strong> · Hạn mức ứng an toàn (70%): <strong>${formatVND(Math.round(accrued0 * 0.7))}</strong>
      </div>
      <div class="form-group">
        <label for="advAmountInput">Số tiền xin ứng (VNĐ) <span class="req">*</span></label>
        <input type="number" id="advAmountInput" value="2000000" min="100000" step="100000" />
      </div>
      <div class="form-group">
        <label for="advReasonInput">Lý do xin ứng lương <span class="req">*</span></label>
        <input type="text" id="advReasonInput" value="Ứng lương sinh hoạt giữa tháng" placeholder="Nhập lý do xin ứng..." />
        <div id="advErrMsg" class="field-error-msg" style="display:none;">Vui lòng nhập số tiền ứng hợp lệ và lý do xin ứng.</div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAdvanceModal()">Gửi phiếu xin ứng</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function updateAdvanceAccruedPreview() {
    const wId = document.getElementById('advWorkerSel').value;
    const w = state.workers.find(x => x.id === wId);
    const box = document.getElementById('advAccruedBox');
    if (w && box) {
      const accrued = w.daysMonthApproved * w.dailyWage;
      box.innerHTML = `Lương lũy kế đã duyệt: <strong style="color:var(--ds-primary);">${formatVND(accrued)}</strong> · Hạn mức ứng an toàn (70%): <strong>${formatVND(Math.round(accrued * 0.7))}</strong>`;
    }
  }

  function submitAdvanceModal() {
    const wId = document.getElementById('advWorkerSel').value;
    const amount = Number(document.getElementById('advAmountInput').value || 0);
    const reason = (document.getElementById('advReasonInput').value || '').trim();
    const errEl = document.getElementById('advErrMsg');
    if (amount <= 0 || !reason) {
      if (errEl) errEl.style.display = 'block';
      return;
    }
    const w = state.workers.find(x => x.id === wId) || state.workers[0];
    state.advances.unshift({
      id: 'ADV-0' + (state.advances.length + 1),
      workerCode: w.code,
      workerName: w.name,
      teamId: w.teamId,
      projectId: w.projectId,
      date: new Date().toLocaleDateString('vi-VN'),
      amount,
      reason,
      accruedSalaryAtRequest: w.daysMonthApproved * w.dailyWage,
      status: 'CHO_KT_KIEM_TRA',
      checkedByKt: null,
      approvedByBgd: null
    });
    saveState();
    document.getElementById('adjustModal').classList.remove('open');
    renderMain();
  }

  // ================= MODAL THÊM CÔNG NHÂN MỚI & THÊM CÔNG TRÌNH MỚI =================
  function openAddWorkerModal() {
    const nextIdx = state.workers.length + 1;
    document.getElementById('adjustModalTitle').textContent = 'Thêm Công nhân mới vào Hệ thống';
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label for="nwCode">Mã Công nhân <span class="req">*</span></label>
        <input type="text" id="nwCode" value="NV.NP-${String(nextIdx).padStart(3, '0')}" />
      </div>
      <div class="form-group">
        <label for="nwName">Họ và Tên <span class="req">*</span></label>
        <input type="text" id="nwName" placeholder="VD: NGUYỄN VĂN MINH" />
        <div id="nwErr" class="field-error-msg" style="display:none;">Vui lòng nhập đầy đủ Họ và Tên công nhân.</div>
      </div>
      <div class="form-group">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label for="nwTeam">Đội thi công <span class="req">*</span></label>
            <select id="nwTeam">
              ${state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label for="nwWage">Lương ngày (VNĐ) <span class="req">*</span></label>
            <input type="number" id="nwWage" value="480000" step="10000" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="nwSkill">Tay nghề / Chức danh</label>
        <input type="text" id="nwSkill" value="Thợ chính Xây dựng" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAddWorker()">Thêm công nhân</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAddWorker() {
    const code = (document.getElementById('nwCode').value || '').trim();
    const name = (document.getElementById('nwName').value || '').trim().toUpperCase();
    if (!name) {
      document.getElementById('nwErr').style.display = 'block';
      return;
    }
    const teamId = document.getElementById('nwTeam').value;
    const team = getTeam(teamId);
    const proj = getProject(team.projectId);
    const wage = Number(document.getElementById('nwWage').value || 450000);
    const skill = (document.getElementById('nwSkill').value || 'Thợ xây dựng').trim();
    const maxSeq = Math.max(...state.workers.map(w => w.seq || 4900));
    const now = new Date();

    state.workers.unshift({
      id: 'W' + (state.workers.length + 1),
      seq: maxSeq + 1,
      code: code || `NV.NP-${state.workers.length + 1}`,
      name,
      teamId: team.id,
      projectId: proj.id,
      skill,
      dailyWage: wage,
      checkInTime: now.toTimeString().slice(0, 8),
      checkOutTime: null,
      date: now.toLocaleDateString('vi-VN'),
      lat: liveGps.hasRealGps ? liveGps.lat : proj.lat,
      lng: liveGps.hasRealGps ? liveGps.lng : proj.lng,
      acc: liveGps.hasRealGps ? liveGps.acc : 15,
      realAddress: liveGps.hasRealGps ? liveGps.address : proj.address,
      attendanceStatus: 'DANG_LAM',
      isLate: false,
      lateMin: 0,
      hoursRegular: 8,
      hoursOtRegistered: 0,
      hoursOtActual: 0,
      forgotCheckoutFlag: false,
      approvalStatus: 'CHO_DUYET',
      approvedBy: null,
      daysMonthApproved: 1,
      otHoursMonthApproved: 0,
      sundayDaysMonth: 0,
      useRealSamplePhoto: false,
      avatarSeed: state.workers.length + 1
    });
    saveState();
    document.getElementById('adjustModal').classList.remove('open');
    renderMain();
  }

  function openAddProjectModal() {
    const nextNum = state.projects.length + 1;
    const defLat = liveGps.hasRealGps ? liveGps.lat : 15.998583;
    const defLng = liveGps.hasRealGps ? liveGps.lng : 107.988185;
    const defAddr = (liveGps.hasRealGps && liveGps.address && !liveGps.address.startsWith('Đang'))
      ? liveGps.address
      : 'TP. Đà Nẵng';

    document.getElementById('adjustModalTitle').textContent = 'Thêm Công trình mới & Định vị GPS';
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label for="npName">Tên Công trình <span class="req">*</span></label>
        <input type="text" id="npName" value="CT${nextNum} - Công trình Nguyên Phát ${nextNum}" />
      </div>
      <div class="form-group">
        <label for="npAddr">Địa chỉ định vị <span class="req">*</span></label>
        <input type="text" id="npAddr" value="${defAddr}" />
      </div>
      <div class="form-group">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label for="npLat">Vĩ độ (Lat)</label>
            <input type="number" id="npLat" value="${defLat}" step="0.000001" />
          </div>
          <div>
            <label for="npLng">Kinh độ (Lng)</label>
            <input type="number" id="npLng" value="${defLng}" step="0.000001" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="npMgr">Quản lý Công trình phụ trách</label>
        <input type="text" id="npMgr" value="KS. Trần Minh Hoàng" />
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAddProject()">Lưu Công trình</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAddProject() {
    const nextNum = state.projects.length + 1;
    const name = (document.getElementById('npName').value || `CT${nextNum}`).trim();
    const address = (document.getElementById('npAddr').value || '').trim();
    const lat = Number(document.getElementById('npLat').value || 15.998583);
    const lng = Number(document.getElementById('npLng').value || 107.988185);
    const manager = (document.getElementById('npMgr').value || 'KS. Trần Minh Hoàng').trim();

    state.projects.push({
      id: 'CT' + nextNum,
      code: 'CT-NP0' + nextNum,
      name,
      address,
      lat,
      lng,
      radiusM: 200,
      manager,
      managerRole: 'Quản lý công trình CT' + nextNum
    });
    saveState();
    document.getElementById('adjustModal').classList.remove('open');
    renderMain();
  }

  function setProjectToCurrentGps(projectId) {
    const p = state.projects.find(x => x.id === projectId);
    if (!p) return;
    if (liveGps.hasRealGps) {
      p.lat = liveGps.lat;
      p.lng = liveGps.lng;
      if (liveGps.address && !liveGps.address.startsWith('Đang')) {
        p.address = liveGps.address;
      }
      saveState();
      renderMain();
    } else {
      refreshRealGps();
    }
  }

  // ================= QUẢN TRỊ ADMIN: TẠO / SỬA / KHÓA / XÓA / ĐĂNG NHẬP TÀI KHOẢN THEO VỊ TRÍ =================
  function getDefaultPermsForRole(roleId) {
    if (roleId === 'BGD') return { checkin: true, inputTeam: true, approveWork: true, accounting: true, approveDirector: true, adminUsers: true, level: 1, title: 'Admin & Ban Giám Đốc' };
    if (roleId === 'KT') return { checkin: true, inputTeam: false, approveWork: false, accounting: true, approveDirector: false, adminUsers: false, level: 2, title: 'Hành Chính – Kế Toán' };
    if (roleId === 'QLCT') return { checkin: true, inputTeam: true, approveWork: true, accounting: false, approveDirector: false, adminUsers: false, level: 3, title: 'Quản lý Công trình' };
    if (roleId === 'DT1') return { checkin: true, inputTeam: true, approveWork: false, accounting: false, approveDirector: false, adminUsers: false, level: 4, title: 'Đội trưởng Thi công' };
    return { checkin: true, inputTeam: false, approveWork: false, accounting: false, approveDirector: false, adminUsers: false, level: 5, title: 'Công nhân' };
  }

  function openAccountFormModal(accId) {
    const curAcc = getCurrentAccount();
    if (curAcc && curAcc.perms && !curAcc.perms.adminUsers && currentRoleId !== 'BGD') {
      alert('Chỉ tài khoản Admin / Ban Giám Đốc mới có quyền Tạo hoặc Chỉnh sửa tài khoản hệ thống!');
      return;
    }

    const editing = accId ? (state.accounts || []).find(a => a.id === accId) : null;
    const defRole = editing ? editing.roleId : 'QLCT';
    const defPerms = editing ? editing.perms : getDefaultPermsForRole(defRole);

    document.getElementById('adjustModalTitle').textContent = editing
      ? `Chỉnh sửa Tài khoản — ${editing.username}`
      : 'Tạo Tài khoản mới cho Vị trí';

    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label for="accRoleSel">Chọn Vị trí / Cấp bậc <span class="req">*</span></label>
        <select id="accRoleSel" onchange="window.NPApp.applyPresetByRoleInModal(this.value)">
          <option value="BGD" ${defRole === 'BGD' ? 'selected' : ''}>Cấp 1 — Admin / Ban Giám Đốc (Toàn quyền)</option>
          <option value="KT" ${defRole === 'KT' ? 'selected' : ''}>Cấp 2 — Hành chính – Kế toán (Tổng hợp &amp; Tính lương)</option>
          <option value="QLCT" ${defRole === 'QLCT' ? 'selected' : ''}>Cấp 3 — Quản lý Công trình (Kiểm tra &amp; Duyệt bảng công)</option>
          <option value="DT1" ${defRole === 'DT1' ? 'selected' : ''}>Cấp 4 — Đội trưởng (Chấm công đội &amp; Báo tăng ca)</option>
          <option value="CN" ${defRole === 'CN' ? 'selected' : ''}>Cấp 5 — Công nhân (Điểm danh GPS &amp; Xem công cá nhân)</option>
        </select>
      </div>

      <div class="form-group">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label for="accUsername">Tên đăng nhập (Username) <span class="req">*</span></label>
            <input type="text" id="accUsername" value="${editing ? editing.username : ''}" placeholder="VD: qlct_ct2 hoặc doitruong7" />
          </div>
          <div>
            <label for="accPin">Mật khẩu / Mã PIN <span class="req">*</span></label>
            <input type="text" id="accPin" value="${editing ? editing.pin : '1234'}" placeholder="VD: 1234" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label for="accFullName">Họ và tên nhân sự <span class="req">*</span></label>
            <input type="text" id="accFullName" value="${editing ? editing.fullName : ''}" placeholder="VD: KS. Nguyễn Văn A" />
          </div>
          <div>
            <label for="accPosTitle">Chức danh vị trí hiển thị</label>
            <input type="text" id="accPosTitle" value="${editing ? editing.positionTitle : 'Quản lý Công trình'}" />
          </div>
        </div>
      </div>

      <div class="form-group">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label for="accProjScope">Phạm vi Công trình phụ trách</label>
            <select id="accProjScope">
              <option value="ALL" ${(!editing || editing.projectId === 'ALL') ? 'selected' : ''}>Toàn công ty (Tất cả CT)</option>
              ${state.projects.map(p => `<option value="${p.id}" ${(editing && editing.projectId === p.id) ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label for="accTeamScope">Phạm vi Đội phụ trách</label>
            <select id="accTeamScope">
              <option value="ALL" ${(!editing || editing.teamId === 'ALL') ? 'selected' : ''}>Tất cả các Đội</option>
              ${state.teams.map(t => `<option value="${t.id}" ${(editing && editing.teamId === t.id) ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="form-group" style="background:var(--ds-bg-soft); border:1px solid var(--ds-line); border-radius:var(--ds-radius-sm); padding:8px 10px;">
        <label style="margin-bottom:5px;">Phân quyền chức năng chi tiết cho Tài khoản này:</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:10.5px;">
          <label style="display:flex; align-items:center; gap:5px; font-weight:500; margin:0;"><input type="checkbox" id="permCheckin" style="width:auto; min-height:auto;" ${defPerms.checkin ? 'checked' : ''} /> Chấm công Camera GPS</label>
          <label style="display:flex; align-items:center; gap:5px; font-weight:500; margin:0;"><input type="checkbox" id="permInputTeam" style="width:auto; min-height:auto;" ${defPerms.inputTeam ? 'checked' : ''} /> Nhập công &amp; Báo tăng ca</label>
          <label style="display:flex; align-items:center; gap:5px; font-weight:500; margin:0;"><input type="checkbox" id="permApproveWork" style="width:auto; min-height:auto;" ${defPerms.approveWork ? 'checked' : ''} /> Duyệt công (Khóa công)</label>
          <label style="display:flex; align-items:center; gap:5px; font-weight:500; margin:0;"><input type="checkbox" id="permAccounting" style="width:auto; min-height:auto;" ${defPerms.accounting ? 'checked' : ''} /> Tổng hợp &amp; Tính lương</label>
          <label style="display:flex; align-items:center; gap:5px; font-weight:500; margin:0;"><input type="checkbox" id="permApproveDirector" style="width:auto; min-height:auto;" ${defPerms.approveDirector ? 'checked' : ''} /> Duyệt Ứng &amp; Bảng lương</label>
          <label style="display:flex; align-items:center; gap:5px; font-weight:500; margin:0;"><input type="checkbox" id="permAdminUsers" style="width:auto; min-height:auto;" ${defPerms.adminUsers ? 'checked' : ''} /> Admin Tạo tài khoản</label>
        </div>
      </div>

      <div id="accFormErr" class="field-error-msg" style="display:none; margin-bottom:8px;">Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu/PIN và Họ tên nhân sự.</div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAccountForm('${editing ? editing.id : ''}')">
          ${editing ? 'Lưu cập nhật tài khoản' : 'Tạo tài khoản ngay'}
        </button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function applyPresetByRoleInModal(roleId) {
    const p = getDefaultPermsForRole(roleId);
    const posInput = document.getElementById('accPosTitle');
    if (posInput) posInput.value = p.title;
    document.getElementById('permCheckin').checked = p.checkin;
    document.getElementById('permInputTeam').checked = p.inputTeam;
    document.getElementById('permApproveWork').checked = p.approveWork;
    document.getElementById('permAccounting').checked = p.accounting;
    document.getElementById('permApproveDirector').checked = p.approveDirector;
    document.getElementById('permAdminUsers').checked = p.adminUsers;
  }

  function submitAccountForm(existingId) {
    const roleId = document.getElementById('accRoleSel').value;
    const username = (document.getElementById('accUsername').value || '').trim();
    const pin = (document.getElementById('accPin').value || '').trim();
    const fullName = (document.getElementById('accFullName').value || '').trim();
    const positionTitle = (document.getElementById('accPosTitle').value || '').trim();
    const projectId = document.getElementById('accProjScope').value;
    const teamId = document.getElementById('accTeamScope').value;

    if (!username || !pin || !fullName) {
      document.getElementById('accFormErr').style.display = 'block';
      return;
    }

    const preset = getDefaultPermsForRole(roleId);
    const perms = {
      checkin: document.getElementById('permCheckin').checked,
      inputTeam: document.getElementById('permInputTeam').checked,
      approveWork: document.getElementById('permApproveWork').checked,
      accounting: document.getElementById('permAccounting').checked,
      approveDirector: document.getElementById('permApproveDirector').checked,
      adminUsers: document.getElementById('permAdminUsers').checked
    };

    if (!state.accounts) state.accounts = [];

    if (existingId) {
      const acc = state.accounts.find(a => a.id === existingId);
      if (acc) {
        acc.roleId = roleId;
        acc.level = preset.level;
        acc.username = username;
        acc.pin = pin;
        acc.fullName = fullName;
        acc.positionTitle = positionTitle || preset.title;
        acc.projectId = projectId;
        acc.teamId = teamId;
        acc.perms = perms;
      }
    } else {
      const newAcc = {
        id: 'ACC-' + String(state.accounts.length + 1).padStart(2, '0'),
        username,
        pin,
        fullName,
        positionTitle: positionTitle || preset.title,
        roleId,
        level: preset.level,
        projectId,
        teamId,
        status: 'ACTIVE',
        perms
      };
      state.accounts.unshift(newAcc);
    }

    saveState();
    document.getElementById('adjustModal').classList.remove('open');
    renderMain();
  }

  function toggleAccountStatus(accId) {
    const acc = (state.accounts || []).find(a => a.id === accId);
    if (!acc) return;
    if (acc.username === 'admin') {
      alert('Không thể khóa tài khoản Admin Tổng!');
      return;
    }
    acc.status = acc.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    saveState();
    renderMain();
  }

  function deleteAccount(accId) {
    const acc = (state.accounts || []).find(a => a.id === accId);
    if (!acc || acc.username === 'admin') return;
    state.accounts = state.accounts.filter(a => a.id !== accId);
    saveState();
    renderMain();
  }

  function loginAsAccount(accId) {
    const acc = (state.accounts || []).find(a => a.id === accId);
    if (!acc) return;
    if (acc.status !== 'ACTIVE') {
      alert('Tài khoản này đang bị khóa! Vui lòng mở khóa trên trang Admin trước.');
      return;
    }
    currentAccountId = acc.id;
    currentRoleId = acc.roleId;

    // Tự động áp dụng phạm vi lọc Công trình & Đội theo tài khoản vừa đăng nhập
    filterProject = acc.projectId || 'ALL';
    filterTeam = acc.teamId || 'ALL';

    const sel = document.getElementById('roleSelect');
    if (sel) sel.value = acc.roleId;
    document.querySelectorAll('#roleQuickPills .role-mini-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-role') === acc.roleId);
    });

    const bannerTitle = document.getElementById('activeRoleBannerTitle');
    if (bannerTitle) {
      const scopeTag = acc.projectId === 'ALL' ? 'Toàn công ty' : `${acc.projectId}${acc.teamId !== 'ALL' ? ' · ' + acc.teamId : ''}`;
      bannerTitle.textContent = `Tài khoản: ${acc.username} (${acc.positionTitle}) — ${acc.fullName} [${scopeTag}]`;
    }
    toggleSidebar(false);
    renderMorningReport830();
    renderMain();
  }

  function openFullLoginScreen() {
    toggleSidebar(false);
    const accounts = state.accounts || [];
    const curAcc = getCurrentAccount();
    if (curAcc) {
      const uEl = document.getElementById('fullLoginUser');
      const pEl = document.getElementById('fullLoginPin');
      if (uEl) uEl.value = curAcc.username;
      if (pEl) pEl.value = curAcc.pin;
    }
    const errEl = document.getElementById('fullLoginErr');
    if (errEl) errEl.style.display = 'none';

    const grid = document.getElementById('fullLoginQuickGrid');
    if (grid) {
      grid.innerHTML = accounts.slice(0, 8).map(a => `
        <button type="button" class="quick-acc-chip" onclick="window.NPApp.quickSelectLoginAccount('${a.id}')">
          <div><strong>${a.username}</strong> (PIN: <code>${a.pin}</code>)</div>
          <div style="opacity:0.85;">${a.positionTitle}</div>
        </button>
      `).join('');
    }
    const overlay = document.getElementById('fullLoginOverlay');
    if (overlay) overlay.classList.add('open');
  }

  function closeFullLoginScreen() {
    const overlay = document.getElementById('fullLoginOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  function quickSelectLoginAccount(accId) {
    const acc = (state.accounts || []).find(a => a.id === accId);
    if (!acc) return;
    document.getElementById('fullLoginUser').value = acc.username;
    document.getElementById('fullLoginPin').value = acc.pin;
    submitFullLogin();
  }

  function submitFullLogin() {
    const u = (document.getElementById('fullLoginUser').value || '').trim().toLowerCase();
    const p = (document.getElementById('fullLoginPin').value || '').trim();
    const errEl = document.getElementById('fullLoginErr');

    // 1. Kiểm tra trong danh sách Tài khoản Admin đã tạo
    let acc = (state.accounts || []).find(a => a.username.toLowerCase() === u && a.pin === p && a.status === 'ACTIVE');

    // 2. Nếu nhân sự nhập Mã Công nhân (trong 108 công nhân) + PIN (mặc định 0000 hoặc 1234) thì tự động đăng nhập đúng công nhân đó
    if (!acc) {
      const worker = state.workers.find(w => w.code.toLowerCase() === u);
      if (worker && (p === '0000' || p === '1234')) {
        acc = {
          id: 'ACC-W-' + worker.id,
          username: worker.code,
          pin: p,
          fullName: worker.name,
          positionTitle: `Công nhân ${worker.teamId} (${worker.skill})`,
          roleId: 'CN',
          level: 5,
          projectId: worker.projectId,
          teamId: worker.teamId,
          workerCode: worker.code,
          status: 'ACTIVE',
          perms: { checkin: true, inputTeam: false, approveWork: false, accounting: false, approveDirector: false, adminUsers: false }
        };
        state.accounts.push(acc);
        saveState();
      }
    }

    if (!acc) {
      if (errEl) errEl.style.display = 'block';
      return;
    }

    closeFullLoginScreen();
    loginAsAccount(acc.id);
  }

  function openLoginModal() {
    openFullLoginScreen();
  }

  function fillQuickLogin(accId) {
    const acc = (state.accounts || []).find(a => a.id === accId);
    if (!acc) return;
    document.getElementById('loginUser').value = acc.username;
    document.getElementById('loginPin').value = acc.pin;
  }

  function submitLogin() {
    const u = (document.getElementById('loginUser').value || '').trim().toLowerCase();
    const p = (document.getElementById('loginPin').value || '').trim();
    const acc = (state.accounts || []).find(a => a.username.toLowerCase() === u && a.pin === p && a.status === 'ACTIVE');
    if (!acc) {
      document.getElementById('loginErrMsg').style.display = 'block';
      return;
    }
    document.getElementById('adjustModal').classList.remove('open');
    loginAsAccount(acc.id);
  }

  // ================= ĐỔI MÃ PIN & BẬT/TẮT KHÓA PIN =================
  function togglePinLockMode() {
    requirePinOnRoleSwitch = !requirePinOnRoleSwitch;
    renderMain();
  }

  function openChangePinModal(roleId) {
    const r = state.roles.find(x => x.id === roleId);
    if (!r) return;
    document.getElementById('adjustModalTitle').textContent = `Đổi Mã PIN — ${r.title}`;
    document.getElementById('adjustModalBody').innerHTML = `
      <div class="form-group">
        <label>Vai trò &amp; Người đại diện</label>
        <input type="text" value="${r.title} — ${r.personName}" disabled />
      </div>
      <div class="form-group">
        <label for="newPinInput">Mã PIN mới (4 – 6 chữ số) <span class="req">*</span></label>
        <input type="text" id="newPinInput" value="${r.pin}" maxlength="6" />
        <div id="pinErrMsg" class="field-error-msg" style="display:none;">Mã PIN phải gồm ít nhất 4 ký tự.</div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button class="btn btn-soft" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitChangePin('${r.id}')">Lưu Mã PIN</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitChangePin(roleId) {
    const r = state.roles.find(x => x.id === roleId);
    const val = (document.getElementById('newPinInput').value || '').trim();
    if (!val || val.length < 4) {
      document.getElementById('pinErrMsg').style.display = 'block';
      return;
    }
    if (r) {
      r.pin = val;
      saveState();
      renderMain();
    }
    document.getElementById('adjustModal').classList.remove('open');
  }

  // ================= XUẤT FILE EXCEL (.CSV UTF-8 BOM) =================
  function downloadCsvFile(filename, rows) {
    const bom = '\uFEFF';
    const csvContent = bom + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportAttendanceCsv() {
    const header = ['STT', 'Mã NV', 'Họ và Tên', 'Đội', 'Công trình', 'Giờ vào', 'Giờ ra', 'Trạng thái', 'Công tháng đã duyệt', 'Giờ OT tháng', 'Trạng thái duyệt'];
    const rows = state.workers.map((w, i) => [
      i + 1, w.code, w.name, w.teamId, w.projectId, w.checkInTime, w.checkOutTime || '', w.attendanceStatus, w.daysMonthApproved, w.otHoursMonthApproved, w.approvalStatus
    ]);
    downloadCsvFile('Bang-Cong-NP-ONE-Thang-11-2026.csv', [header, ...rows]);
  }

  function exportPayrollCsv() {
    const header = ['STT', 'Mã NV', 'Họ và Tên', 'Đội', 'Công trình', 'Đơn giá ngày', 'Công đã duyệt', 'Giờ OT', 'Công CN', 'Tổng lương gộp', 'Trừ ứng lương đã duyệt', 'Thực lĩnh'];
    const rows = state.workers.map((w, i) => {
      const hourly = w.dailyWage / 8;
      const basePay = w.daysMonthApproved * w.dailyWage;
      const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
      const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
      const gross = basePay + otPay + sunPay;
      const adv = state.advances.filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET').reduce((s, a) => s + a.amount, 0);
      return [i + 1, w.code, w.name, w.teamId, w.projectId, w.dailyWage, w.daysMonthApproved, w.otHoursMonthApproved, w.sundayDaysMonth, gross, adv, gross - adv];
    });
    downloadCsvFile('Bang-Luong-NP-ONE-Thang-11-2026.csv', [header, ...rows]);
  }

  function runCutoff1730Check() {
    let lockedCount = 0;
    state.workers.forEach(w => {
      if (w.attendanceStatus === 'DANG_LAM' && w.hoursOtRegistered === 0) {
        w.hoursRegular = 8;
        w.hoursOtActual = 0;
        if (w.seq >= 4944) {
          w.forgotCheckoutFlag = true;
          lockedCount++;
        }
      }
    });
    saveState();
    renderMain();
  }

  function confirmForgotCheckout(workerId, otHours) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    w.forgotCheckoutFlag = false;
    w.checkOutTime = '17:30:00';
    w.attendanceStatus = 'DA_RA';
    w.hoursRegular = 8;
    w.hoursOtActual = otHours;
    saveState();
    renderMain();
  }

  function approveSingleWorker(workerId) {
    const role = getCurrentRole();
    if (role.level >= 4) {
      alert('Nguyên tắc kiểm soát: Đội trưởng / Công nhân chỉ được nhập công, KHÔNG được tự duyệt công! Hãy chuyển sang vai trò Quản lý công trình hoặc Ban Giám đốc.');
      return;
    }
    const w = state.workers.find(x => x.id === workerId);
    if (w) {
      w.approvalStatus = 'DA_DUYET';
      w.approvedBy = role.personName;
      saveState();
      renderMain();
    }
  }

  function approveAllVisible() {
    const role = getCurrentRole();
    if (role.level >= 4) {
      alert('Nguyên tắc kiểm soát: Đội trưởng chỉ được nhập công, KHÔNG được tự duyệt công! Hãy chuyển sang vai trò Quản lý công trình / Giám đốc.');
      return;
    }
    state.workers.forEach(w => {
      if (w.approvalStatus !== 'DA_DUYET') {
        w.approvalStatus = 'DA_DUYET';
        w.approvedBy = role.personName;
      }
    });
    saveState();
    renderMain();
  }

  function advanceStep(advId, stepType) {
    const role = getCurrentRole();
    const adv = state.advances.find(a => a.id === advId);
    if (!adv) return;

    if (stepType === 'KT') {
      adv.status = 'CHO_BGD_DUYET';
      adv.checkedByKt = role.personName;
    } else if (stepType === 'BGD') {
      if (role.level > 2) {
        alert('Chỉ Ban Giám Đốc mới có quyền phê duyệt ứng lương!');
        return;
      }
      adv.status = 'BGD_DA_DUYET';
      adv.approvedByBgd = 'GĐ. Nguyễn Phát';
    }
    saveState();
    renderMain();
  }

  function approveMonthlyPayroll() {
    const role = getCurrentRole();
    if (role.id !== 'BGD') {
      alert('Chỉ Ban Giám Đốc mới có quyền Phê duyệt Bảng lương!');
      return;
    }
    state.payrollMonthStatus = 'BGD_DA_DUYET';
    saveState();
    renderMain();
  }

  function openPayslipModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const hourly = w.dailyWage / 8;
    const basePay = w.daysMonthApproved * w.dailyWage;
    const otPay = Math.round(w.otHoursMonthApproved * hourly * 1.5);
    const sunPay = Math.round(w.sundayDaysMonth * w.dailyWage * 2.0);
    const gross = basePay + otPay + sunPay;
    const approvedAdvance = state.advances
      .filter(a => a.workerCode === w.code && a.status === 'BGD_DA_DUYET')
      .reduce((s, a) => s + a.amount, 0);
    const net = gross - approvedAdvance;

    document.getElementById('payslipModalBody').innerHTML = `
      <div style="border:1px solid var(--ds-line); border-radius:var(--ds-radius-md); padding:18px; background:var(--ds-bg);">
        <span class="kicker">CÔNG TY NGUYÊN PHÁT · NP ONE HR</span>
        <div style="font-family:var(--ds-font-serif); font-weight:700; font-size:20px; color:var(--ds-primary); margin-bottom:10px;">
          Phiếu Lương — ${w.name} (${w.code})
        </div>
        <table class="data-table" style="margin-bottom:14px;">
          <tbody>
            <tr><td>Công hành chính đã duyệt (${w.daysMonthApproved} công)</td><td style="text-align:right; font-weight:700;">${formatVND(basePay)}</td></tr>
            <tr><td>Giờ tăng ca đã duyệt (${w.otHoursMonthApproved}h x 1.5)</td><td style="text-align:right; font-weight:700;">${formatVND(otPay)}</td></tr>
            <tr><td>Công Chủ nhật (${w.sundayDaysMonth} công x 2.0)</td><td style="text-align:right; font-weight:700;">${formatVND(sunPay)}</td></tr>
            <tr style="background:var(--ds-bg-soft);"><td><strong>TỔNG LƯƠNG GỘP</strong></td><td style="text-align:right; font-weight:700;">${formatVND(gross)}</td></tr>
            <tr><td style="color:var(--ds-danger);">Trừ Ứng lương đã duyệt</td><td style="text-align:right; color:var(--ds-danger); font-weight:700;">-${formatVND(approvedAdvance)}</td></tr>
            <tr style="background:var(--ds-bg-soft);"><td><strong style="color:var(--ds-primary);">THỰC LĨNH THANH TOÁN</strong></td><td style="text-align:right; color:var(--ds-primary); font-family:var(--ds-font-serif); font-size:18px; font-weight:700;">${formatVND(net)}</td></tr>
          </tbody>
        </table>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn btn-soft" onclick="window.NPApp.closeModal('payslipModal')">Đóng</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ In Phiếu lương</button>
        </div>
      </div>
    `;
    document.getElementById('payslipModal').classList.add('open');
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }

  function switchRole(roleId) {
    const targetRole = state.roles.find(r => r.id === roleId);
    if (!targetRole) return;
    if (requirePinOnRoleSwitch && roleId !== currentRoleId) {
      const entered = prompt(`Nhập Mã PIN của ${targetRole.title} (Mặc định: ${targetRole.pin}):`, '');
      if (entered !== targetRole.pin) {
        alert('Mã PIN không đúng!');
        const sel = document.getElementById('roleSelect');
        if (sel) sel.value = currentRoleId;
        return;
      }
    }
    currentRoleId = roleId;
    const sel = document.getElementById('roleSelect');
    if (sel) sel.value = roleId;
    document.querySelectorAll('#roleQuickPills .role-mini-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-role') === roleId);
    });
    const role = getCurrentRole();
    const bannerTitle = document.getElementById('activeRoleBannerTitle');
    if (bannerTitle) {
      bannerTitle.textContent = `Đang xem: ${role.title} — ${role.personName}`;
    }
    toggleSidebar(false);
    renderMorningReport830();
    renderMain();
  }

  function resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    state = JSON.parse(JSON.stringify(window.NP_SEED));
    saveState();
    renderMain();
  }

  function openInstallModal() {
    toggleSidebar(false);
    document.getElementById('installModal').classList.add('open');
  }

  function triggerNativeInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
      });
    } else {
      alert('Trên trình duyệt hiện tại: Hãy làm theo hướng dẫn ngay bên dưới (Trên iPhone bấm nút Chia sẻ ⬆️ → Thêm vào MH chính; trên Android bấm dấu ⋮ → Cài đặt ứng dụng).');
    }
  }

  function init() {
    initTheme();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });

    const roleSelect = document.getElementById('roleSelect');
    roleSelect.innerHTML = state.roles.map(r =>
      `<option value="${r.id}">${r.title} — ${r.personName}</option>`
    ).join('');
    roleSelect.value = currentRoleId;
    roleSelect.addEventListener('change', e => switchRole(e.target.value));

    document.getElementById('btnOpenCamera').addEventListener('click', () => openCameraQuick('VAO', null));

    const camWorkerSelect = document.getElementById('camWorkerSelect');
    const camProjectSelect = document.getElementById('camProjectSelect');
    const camActionType = document.getElementById('camActionType');
    if (camWorkerSelect) camWorkerSelect.addEventListener('change', drawLivePreviewOnCanvas);
    if (camProjectSelect) camProjectSelect.addEventListener('change', drawLivePreviewOnCanvas);
    if (camActionType) camActionType.addEventListener('change', drawLivePreviewOnCanvas);

    sampleImgObj.onload = () => {
      renderMain();
    };

    updateTopBadges();
    renderMorningReport830();
    renderMain();

    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') && TAB_TITLES[params.get('tab')]) {
      selectTab(params.get('tab'));
    }
    if (params.get('login') === '1') {
      openFullLoginScreen();
    }
    if (params.get('action') === 'checkin') {
      setTimeout(() => openCameraQuick('VAO', null), 300);
    }

    setTimeout(refreshRealGps, 400);
  }

  window.NPApp = {
    toggleTheme,
    toggleSidebar,
    selectTab,
    openCameraFromSidebar,
    openCameraQuick,
    openPhotoModal,
    closeModal,
    openCameraModal,
    closeCameraModal,
    startHardwareCamera,
    toggleCameraFacing,
    refreshRealGps,
    snapAndSubmitCheckin,
    handleCheckout,
    openAdjustModal,
    submitAdjustment,
    openOtModal,
    submitOtModal,
    openAdvanceModal,
    updateAdvanceAccruedPreview,
    submitAdvanceModal,
    openAddWorkerModal,
    submitAddWorker,
    openAddProjectModal,
    submitAddProject,
    setProjectToCurrentGps,
    openAccountFormModal,
    applyPresetByRoleInModal,
    submitAccountForm,
    toggleAccountStatus,
    deleteAccount,
    loginAsAccount,
    openLoginModal,
    openFullLoginScreen,
    closeFullLoginScreen,
    quickSelectLoginAccount,
    submitFullLogin,
    fillQuickLogin,
    submitLogin,
    togglePinLockMode,
    openChangePinModal,
    submitChangePin,
    exportAttendanceCsv,
    exportPayrollCsv,
    runCutoff1730Check,
    confirmForgotCheckout,
    approveSingleWorker,
    approveAllVisible,
    advanceStep,
    approveMonthlyPayroll,
    openPayslipModal,
    switchRole,
    resetDemoData,
    openInstallModal,
    triggerNativeInstall,
    setSearch(val) { searchQuery = val; renderMain(); },
    setFilterProject(val) { filterProject = val; renderMain(); },
    setFilterTeam(val) { filterTeam = val; renderMain(); },
    setFilterStatus(val) { filterStatus = val; renderMain(); }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
