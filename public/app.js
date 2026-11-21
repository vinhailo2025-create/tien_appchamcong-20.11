// Ứng dụng Quản lý Chấm công, Nhân sự & Tính lương 5 cấp NP ONE - Nguyên Phát HR (Bản Tối ưu Mobile + Menu Trái + Phím tắt PWA)
(function () {
  const STORAGE_KEY = 'NP_ONE_HR_STATE_V3';

  let state = loadState();
  let currentTab = 'quan-ly';
  let currentRoleId = 'BGD';
  let filterProject = 'ALL';
  let filterTeam = 'ALL';
  let filterStatus = 'ALL';
  let searchQuery = '';
  let liveStream = null;
  let cameraFacingMode = 'user'; // 'user' (trước) hoặc 'environment' (sau)
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
  sampleImgObj.crossOrigin = 'anonymous';
  sampleImgObj.src = '/assets/sample-selfie-worker.png';

  const TAB_TITLES = {
    'quan-ly': '📊 Quản lý Chấm công • Camera GPS',
    'quan-so': '📈 Quân số & Báo cáo 08:30',
    'tang-ca': '🧰 Công việc & Tăng ca (Chốt 17:30)',
    'bang-cong': '🕒 Bảng Công (Ngày / Tuần / Tháng)',
    'luong': '💰 Lương & Duyệt Ứng lương',
    'doi': '👷 Đội & Công trình (Tọa độ GPS)',
    'nhan-su': '👥 Hồ sơ Nhân sự (108 Công nhân)',
    'phan-quyen': '🔒 Phân quyền 5 Cấp & Mã PIN',
    'so-do': '🗺️ Sơ đồ & 5 Quy tắc Kiểm soát'
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.workers && parsed.workers.length === 108) {
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(window.NP_SEED));
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

  // ================= ĐÓNG / MỞ MENU BÊN TRÁI (LEFT DRAWER SIDEBAR) =================
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
    // Cập nhật active trong Menu trái
    document.querySelectorAll('#sidebarMenu .sidebar-item[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    // Cập nhật active ở thanh Đáy màn hình điện thoại
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
        <div style="color:#15803d; font-weight:800;">🟢 ĐÃ ĐỊNH VỊ GPS THẬT CỦA THIẾT BỊ:</div>
        <div style="color:#0f172a; margin-top:2px;">📍 <strong>Địa điểm:</strong> ${liveGps.address}</div>
        <div style="color:#1e40af; margin-top:2px;">🌐 <strong>Tọa độ:</strong> <code>${liveGps.lat.toFixed(6)}, ${liveGps.lng.toFixed(6)}</code> (±${liveGps.acc}m)</div>
      `;
    } else {
      el.innerHTML = `<span style="color:#b45309;">⏳ ${liveGps.address} (Bấm "Cho phép / Allow" vị trí trên trình duyệt)</span>`;
    }
  }

  function refreshRealGps() {
    if (!navigator.geolocation) {
      liveGps.address = 'Thiết bị không hỗ trợ Geolocation API';
      updateGpsStatusBox();
      return;
    }
    liveGps.address = 'Đang bắt tín hiệu vệ tinh GPS...';
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
        liveGps.address = `Chưa cấp quyền GPS (${err.message}). Hãy bấm "Lấy lại GPS" và chọn Cho phép.`;
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

  // ================= VẼ ẢNH CHẤM CÔNG CÓ ĐÓNG DẤU ĐỊA ĐIỂM + THỜI GIAN + LOGO NP ONE =================
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

    const grad = ctx.createLinearGradient(0, 0, 480, 480);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 480);

    if (worker.useRealSamplePhoto && sampleImgObj.complete && sampleImgObj.naturalWidth > 0) {
      ctx.drawImage(sampleImgObj, 0, 0, 480, 480);
    } else {
      const seed = worker.avatarSeed || 1;
      const skinColors = ['#d9a17c', '#c68b63', '#e0ac8b', '#b97c56'];
      const shirtColors = ['#1e3a8a', '#0f766e', '#334155', '#1e40af', '#0369a1'];

      ctx.fillStyle = shirtColors[seed % shirtColors.length];
      ctx.beginPath();
      ctx.ellipse(240, 465, 165, 115, 0, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.fillRect(145, 390, 28, 85);
      ctx.fillRect(307, 390, 28, 85);

      ctx.fillStyle = skinColors[seed % skinColors.length];
      ctx.fillRect(205, 295, 70, 65);
      ctx.beginPath();
      ctx.ellipse(240, 235, 82, 98, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(206, 225, 7, 0, Math.PI * 2);
      ctx.arc(274, 225, 7, 0, Math.PI * 2);
      ctx.fill();

      const helmGrad = ctx.createLinearGradient(140, 90, 340, 195);
      helmGrad.addColorStop(0, '#fef08a');
      helmGrad.addColorStop(0.5, '#eab308');
      helmGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = helmGrad;
      ctx.beginPath();
      ctx.arc(240, 182, 96, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.ellipse(240, 182, 112, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#071e3d';
      ctx.font = 'bold 17px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NP ONE', 240, 148);
    }

    const wmGrad = ctx.createLinearGradient(0, 310, 0, 480);
    wmGrad.addColorStop(0, 'rgba(0,0,0,0)');
    wmGrad.addColorStop(0.28, 'rgba(6, 23, 51, 0.80)');
    wmGrad.addColorStop(1, 'rgba(6, 23, 51, 0.96)');
    ctx.fillStyle = wmGrad;
    ctx.fillRect(0, 310, 480, 170);

    ctx.fillStyle = '#16a34a';
    ctx.fillRect(14, 340, 245, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📷 CAMERA TRỰC TIẾP • ĐỊNH VỊ GPS', 20, 354);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13.5px Segoe UI, sans-serif';
    ctx.fillText(`Mã NV: ${worker.code}  |  Họ tên: ${worker.name}`, 14, 380);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText(`🕒 Thời gian: ${worker.checkInTime} — ${worker.date}`, 14, 402);

    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 12px Segoe UI, sans-serif';
    ctx.fillText(`📍 Địa điểm: ${(worker.realAddress || proj.address).slice(0, 46)}`, 14, 424);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '11.5px Segoe UI, sans-serif';
    ctx.fillText(`🏗️ ${proj.name}`, 14, 444);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11.5px Segoe UI, sans-serif';
    ctx.fillText(`🌐 GPS: ${worker.lat}, ${worker.lng} (±${worker.acc}m)`, 14, 464);

    ctx.fillStyle = '#071e3d';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.fillRect(388, 424, 78, 42);
    ctx.strokeRect(388, 424, 78, 42);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NP ONE', 427, 446);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px Segoe UI, sans-serif';
    ctx.fillText('NGUYÊN PHÁT', 427, 459);

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
        🔔 <strong>BÁO CÁO 08:30 CHO GIÁM ĐỐC:</strong>
        "08:30 — Tổng quân số có mặt: <strong>${s.presentCount}/${s.total}</strong>
        (CT1: <strong>${s.ct1}</strong> | CT2: <strong>${s.ct2}</strong> | CT3: <strong>${s.ct3}</strong>)
        • Đi muộn: <strong>${s.lateCount}</strong>
        • Nghỉ phép: <strong>${s.leaveCount}</strong>
        • Nghỉ KP: <strong>${s.unexcusedCount}</strong>
        • Chi phí nhân công hôm nay: <strong>${formatVND(s.estimatedCostToday)}</strong>"
      </div>
    `;
  }

  function updateTopBadges() {
    const s = computeMorningStats();
    const bFeed = document.getElementById('badgeTotalFeed');
    const bForgot = document.getElementById('badgeForgotCo');
    const bAdv = document.getElementById('badgePendingAdv');
    if (bFeed) bFeed.textContent = state.workers.length;
    if (bForgot) bForgot.textContent = s.forgotCoCount;
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

  // ================= TAB 1: 📊 QUẢN LÝ (THIẾT KẾ ĐIỆN THOẠI GỌN GÀNG, ĐỦ CHECK-IN & CHECK-OUT) =================
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

      let statusBadge = `<span class="status-pill status-working">• ĐANG LÀM</span>`;
      if (w.attendanceStatus === 'DA_RA') {
        statusBadge = `<span class="status-pill status-out">✓ ĐÃ RA (${w.checkOutTime})</span>`;
      } else if (w.attendanceStatus === 'NGHI_PHEP') {
        statusBadge = `<span class="status-pill status-leave">NGHỈ PHÉP</span>`;
      } else if (w.attendanceStatus === 'NGHI_KP') {
        statusBadge = `<span class="status-pill status-unexcused">NGHỈ KP</span>`;
      }

      const lateBadge = w.isLate ? `<span class="status-pill status-leave">Muộn ${w.lateMin}p</span>` : '';
      const forgotBadge = w.forgotCheckoutFlag ? `<span class="status-pill status-forgot">⏳ Quá 17:30</span>` : '';
      const approvalBadge = w.approvalStatus === 'DA_DUYET'
        ? `<span style="font-size:11px; color:#0f766e; font-weight:800;">🔒 Đã duyệt</span>`
        : `<span style="font-size:11px; color:#b45309; font-weight:700;">⏳ Chờ duyệt</span>`;

      return `
        <div class="worker-card-mobile">
          <div class="wc-top">
            <img class="wc-photo" src="${photoUrl}" alt="${w.name}" onclick="window.NPApp.openPhotoModal('${w.id}')" title="Chạm xem ảnh đóng dấu GPS" />
            <div class="wc-info">
              <div class="wc-name-row">
                <span class="wc-name">${w.name}</span>
                <span class="wc-seq">#${w.seq} • ${w.checkInTime}</span>
              </div>
              <div class="wc-meta">
                <strong>${w.code}</strong>
                <span>• ${team.id} (${proj.id})</span>
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
            <button class="btn-wc-in" onclick="window.NPApp.openCameraQuick('VAO', '${w.id}')">
              🟢 CHECK-IN (Chụp Vào)
            </button>
            <button class="btn-wc-out" onclick="window.NPApp.openCameraQuick('RA', '${w.id}')">
              🔵 CHECK-OUT (Chụp Ra)
            </button>
            <button class="btn-wc-adj" onclick="window.NPApp.openAdjustModal('${w.id}')">
              ✏️ Sửa
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-grid-mobile">
          <input class="input-ctl full-row" type="text" placeholder="🔍 Tìm tên hoặc mã công nhân..." value="${searchQuery}" oninput="window.NPApp.setSearch(this.value)" />
          <select class="select-ctl" onchange="window.NPApp.setFilterProject(this.value)">
            <option value="ALL" ${filterProject === 'ALL' ? 'selected' : ''}>🏗️ Tất cả Công trình</option>
            ${state.projects.map(p => `<option value="${p.id}" ${filterProject === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <select class="select-ctl" onchange="window.NPApp.setFilterTeam(this.value)">
            <option value="ALL" ${filterTeam === 'ALL' ? 'selected' : ''}>👷 Tất cả 6 Đội</option>
            ${state.teams.map(t => `<option value="${t.id}" ${filterTeam === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
          <select class="select-ctl" onchange="window.NPApp.setFilterStatus(this.value)">
            <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>📌 Mọi trạng thái (${state.workers.length})</option>
            <option value="DANG_LAM" ${filterStatus === 'DANG_LAM' ? 'selected' : ''}>🟢 Đang làm (94)</option>
            <option value="NGHI_PHEP" ${filterStatus === 'NGHI_PHEP' ? 'selected' : ''}>🟡 Nghỉ phép (6)</option>
            <option value="NGHI_KP" ${filterStatus === 'NGHI_KP' ? 'selected' : ''}>🔴 Nghỉ KP (3)</option>
            <option value="DA_RA" ${filterStatus === 'DA_RA' ? 'selected' : ''}>🔵 Đã ra ca (5)</option>
          </select>
          <button class="btn btn-success" onclick="window.NPApp.approveAllVisible()">
            ✔️ Duyệt công
          </button>
        </div>
      </div>

      <div style="margin-bottom:8px; font-size:12px; color:#475569; display:flex; justify-content:space-between; align-items:center;">
        <span>💡 Chạm vào <strong>ảnh</strong> để xem phóng to • Bấm <strong>🟢 CHECK-IN</strong> để mở Camera chụp</span>
        <strong>${filtered.length}/${state.workers.length} CN</strong>
      </div>

      <div class="feed-list">
        ${cardsHtml || '<div style="padding:24px; text-align:center; background:#fff; border-radius:12px; color:#64748b;">Không tìm thấy công nhân phù hợp.</div>'}
      </div>
    `;
  }

  // TAB 2: 📈 QUÂN SỐ
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
          <td><strong>${p.name}</strong><br/><small style="color:#64748b;">📍 ${p.address}</small></td>
          <td><strong>${working}/${pWorkers.length}</strong></td>
          <td style="color:#d97706; font-weight:700;">${late}</td>
          <td>${leave}P / <span style="color:#dc2626; font-weight:700;">${kp}KP</span></td>
          <td><strong>${formatVND(cost)}</strong></td>
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
          <td><strong>${t.name}</strong><br/><small style="color:#64748b;">${t.leader}</small></td>
          <td>${proj.id}</td>
          <td style="color:#15803d; font-weight:800;">${working}/${tWorkers.length}</td>
          <td>${leave}P / ${kp}KP</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-box green">
          <div class="kpi-label">CÓ MẶT (08:30)</div>
          <div class="kpi-val">${s.presentCount}/${s.total}</div>
          <div class="kpi-sub">CT1:${s.ct1} • CT2:${s.ct2} • CT3:${s.ct3}</div>
        </div>
        <div class="kpi-box amber">
          <div class="kpi-label">ĐI MUỘN</div>
          <div class="kpi-val">${s.lateCount} CN</div>
          <div class="kpi-sub">Sau 08:08</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">NGHỈ PHÉP (P)</div>
          <div class="kpi-val">${s.leaveCount} CN</div>
          <div class="kpi-sub">Có báo phép</div>
        </div>
        <div class="kpi-box red">
          <div class="kpi-label">NGHỈ KP</div>
          <div class="kpi-val">${s.unexcusedCount} CN</div>
          <div class="kpi-sub">Vắng tự do</div>
        </div>
        <div class="kpi-box teal" style="grid-column: span 2;">
          <div class="kpi-label">ƯỚC TÍNH CHI PHÍ NHÂN CÔNG HÔM NAY</div>
          <div class="kpi-val">${formatVND(s.estimatedCostToday)}</div>
          <div class="kpi-sub">Tổng hợp tự động báo cáo Giám đốc lúc 08:30</div>
        </div>
      </div>

      <div class="section-card">
        <h3>🏗️ Quân số &amp; Chi phí theo Công trình</h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công trình &amp; Địa điểm</th>
                <th>Có mặt</th>
                <th>Muộn</th>
                <th>Nghỉ P/KP</th>
                <th>Chi phí ngày</th>
              </tr>
            </thead>
            <tbody>${projectRows}</tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>👷 Quân số theo 6 Đội thi công</h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Đội &amp; Đội trưởng</th>
                <th>CT</th>
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

  // TAB 3: 🧰 CÔNG VIỆC & TĂNG CA (Chống quên Check-out sau 17:30)
  function renderTabTangCa(container) {
    const forgotList = state.workers.filter(w => w.forgotCheckoutFlag);
    const otList = state.workers.filter(w => w.hoursOtRegistered > 0 || w.forgotCheckoutFlag).slice(0, 18);

    container.innerHTML = `
      <div class="section-card" style="background:#fff7ed; border:2px solid #f97316;">
        <h3>
          <span>⏱️ Chống "Quên Check-out = Cộng khống tăng ca" (Sau 17:30)</span>
          <button class="btn btn-warning" onclick="window.NPApp.runCutoff1730Check()">⚡ Quét Chốt Ca 17:30</button>
        </h3>
        <p style="font-size:12.5px; color:#7c2d12; margin-bottom:10px;">
          Sau <strong>17:30</strong>, ai chưa Check-out và Đội trưởng <strong>không có phiếu Đăng ký tăng ca</strong> sẽ tự động chốt tối đa <strong>8.0h hành chính (0h OT)</strong>, tuyệt đối không tự nhảy giờ tăng ca.
        </p>
        <div class="data-table-wrap">
          <table class="data-table" style="background:#fff;">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Giờ vào</th>
                <th>Trạng thái 17:30</th>
                <th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              ${forgotList.map(w => `
                <tr>
                  <td><strong>${w.name}</strong><br/><small>${w.code} (${w.teamId})</small></td>
                  <td>${w.checkInTime}</td>
                  <td><span class="status-pill status-forgot">⏳ Khóa 8h HC (0h OT)</span></td>
                  <td>
                    <button class="btn btn-primary" onclick="window.NPApp.confirmForgotCheckout('${w.id}', 0)">✔️ Chốt 17:30</button>
                    <button class="btn btn-outline" onclick="window.NPApp.openAdjustModal('${w.id}')">✏️ Báo OT</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="4" style="text-align:center;">Đã xử lý hết các ca quên Check-out.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>🧰 Đăng ký &amp; Duyệt Tăng ca Độc lập (Đội trưởng nhập → QLCT duyệt)</h3>
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
                  <td><strong>${w.name}</strong><br/><small>${w.code} • ${w.teamId}</small></td>
                  <td><strong style="color:#0f3b7a;">+${w.hoursOtRegistered}h OT</strong></td>
                  <td>
                    ${w.approvalStatus === 'DA_DUYET'
                      ? `<span class="status-pill status-working">🔒 Đã duyệt</span>`
                      : `<span class="status-pill status-leave">⏳ Chờ duyệt</span>`}
                  </td>
                  <td>
                    <button class="btn btn-outline" onclick="window.NPApp.registerOtByLeader('${w.id}')">👷 ĐT Báo OT</button>
                    <button class="btn btn-success" onclick="window.NPApp.approveSingleWorker('${w.id}')">🏗️ Duyệt</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // TAB 4: 🕒 BẢNG CÔNG & LỊCH SỬ ĐIỀU CHỈNH
  function renderTabBangCong(container) {
    const sampleWorkers = state.workers.slice(0, 25);
    container.innerHTML = `
      <div class="section-card">
        <h3>
          <span>🕒 Bảng Công Ngày → Tuần → Tháng</span>
          <button class="btn btn-success" onclick="window.NPApp.approveAllVisible()">🏗️ QLCT Duyệt Tất Cả</button>
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
                <th>Sửa</th>
              </tr>
            </thead>
            <tbody>
              ${sampleWorkers.map(w => `
                <tr>
                  <td><strong>${w.name}</strong><br/><small>${w.code} (${w.teamId})</small></td>
                  <td>${w.hoursRegular > 0 ? '1.0 công' : 'Nghỉ'} (+${w.hoursOtActual}h)</td>
                  <td><strong style="color:#0f3b7a;">${w.daysMonthApproved} công</strong></td>
                  <td>${w.otHoursMonthApproved}h</td>
                  <td>
                    ${w.approvalStatus === 'DA_DUYET'
                      ? `<span class="status-pill status-working">🔒 Đã duyệt</span>`
                      : `<span class="status-pill status-leave">⏳ Chờ duyệt</span>`}
                  </td>
                  <td>
                    <button class="btn btn-outline" onclick="window.NPApp.openAdjustModal('${w.id}')">✏️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>📜 Lịch sử Điều chỉnh Công (Audit Log)</h3>
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
                  <td><strong>${log.workerName}</strong></td>
                  <td><span style="color:#dc2626;">${log.oldValue}</span> → <strong style="color:#15803d;">${log.newValue}</strong></td>
                  <td><em>"${log.reason}"</em></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // TAB 5: 💰 LƯƠNG & DUYỆT ỨNG LƯƠNG
  function renderTabLuong(container) {
    const payrollWorkers = state.workers.slice(0, 20);
    container.innerHTML = `
      <div class="section-card" style="border:2px solid #0f766e;">
        <h3>
          <span>💳 Duyệt Ứng Lương (100% Ứng lương phải được duyệt)</span>
          <button class="btn btn-primary" onclick="window.NPApp.createNewAdvancePrompt()">➕ Xin Ứng Lương</button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Số tiền ứng</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Duyệt</th>
              </tr>
            </thead>
            <tbody>
              ${state.advances.map(adv => {
                let badge = `<span class="status-pill status-working">✅ GĐ Đã duyệt</span>`;
                if (adv.status === 'CHO_BGD_DUYET') badge = `<span class="status-pill status-leave">⏳ Chờ GĐ duyệt</span>`;
                else if (adv.status === 'CHO_KT_KIEM_TRA') badge = `<span class="status-pill status-forgot">⏳ Chờ KT kiểm tra</span>`;
                return `
                  <tr>
                    <td><strong>${adv.workerName}</strong><br/><small>${adv.workerCode} • ${adv.date}</small></td>
                    <td style="color:#b45309; font-weight:800;">${formatVND(adv.amount)}</td>
                    <td>${adv.reason}</td>
                    <td>${badge}</td>
                    <td>
                      ${adv.status === 'CHO_KT_KIEM_TRA' ? `<button class="btn btn-primary" onclick="window.NPApp.advanceStep('${adv.id}', 'KT')">🧮 KT Duyệt</button>` : ''}
                      ${adv.status !== 'BGD_DA_DUYET' ? `<button class="btn btn-success" onclick="window.NPApp.advanceStep('${adv.id}', 'BGD')">👑 GĐ Duyệt</button>` : '✓ Đã trừ lương'}
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
          <span>💰 Bảng Lương Tháng (Trừ Ứng lương Đã duyệt)</span>
          <button class="btn btn-success" onclick="window.NPApp.approveMonthlyPayroll()">👑 Giám đốc Duyệt Lương</button>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công nhân</th>
                <th>Công</th>
                <th>Lương Gộp</th>
                <th>Trừ Ứng</th>
                <th>Thực Lĩnh</th>
                <th>Phiếu</th>
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
                    <td><strong>${w.name}</strong><br/><small>${w.code}</small></td>
                    <td>${w.daysMonthApproved}c (+${w.otHoursMonthApproved}h)</td>
                    <td>${formatVND(gross)}</td>
                    <td style="color:#dc2626;">-${formatVND(approvedAdvance)}</td>
                    <td style="color:#15803d; font-weight:800;">${formatVND(net)}</td>
                    <td><button class="btn btn-outline" onclick="window.NPApp.openPayslipModal('${w.id}')">🧾</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // TAB 6: 👷 ĐỘI & CÔNG TRÌNH
  function renderTabDoi(container) {
    container.innerHTML = `
      <div class="section-card">
        <h3>🏗️ 3 Công trình &amp; Địa điểm Định vị GPS</h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Công trình</th>
                <th>Địa chỉ định vị</th>
                <th>Tọa độ GPS</th>
                <th>Quản lý CT</th>
              </tr>
            </thead>
            <tbody>
              ${state.projects.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>📍 ${p.address}</td>
                  <td><code>${p.lat}, ${p.lng}</code></td>
                  <td>${p.manager}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card">
        <h3>👷 6 Đội Thi công</h3>
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
                  <td><strong>${t.name}</strong></td>
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

  // TAB 7: 👥 NHÂN SỰ
  function renderTabNhanSu(container) {
    container.innerHTML = `
      <div class="section-card">
        <h3>👥 Danh sách ${state.workers.length} Công nhân</h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Đội / CT</th>
                <th>Lương ngày</th>
                <th>Chấm công</th>
              </tr>
            </thead>
            <tbody>
              ${state.workers.map(w => `
                <tr>
                  <td><strong>${w.code}</strong></td>
                  <td><strong>${w.name}</strong><br/><small>${w.skill}</small></td>
                  <td>${w.teamId} • ${w.projectId}</td>
                  <td>${formatVND(w.dailyWage)}</td>
                  <td>
                    <button class="btn btn-success" onclick="window.NPApp.openCameraQuick('VAO', '${w.id}')">📸 Chụp GPS</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // TAB 8: 🔒 PHÂN QUYỀN 5 CẤP
  function renderTabPhanQuyen(container) {
    container.innerHTML = `
      <div class="section-card">
        <h3>🔒 Phân quyền 5 Cấp Độc lập (Bấm để chuyển vai trò dùng thử)</h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Cấp</th>
                <th>Vai trò &amp; Người phụ trách</th>
                <th>Mã PIN</th>
                <th>Chuyển nhanh</th>
              </tr>
            </thead>
            <tbody>
              ${state.roles.map(r => `
                <tr>
                  <td><strong>Cấp ${r.level}</strong></td>
                  <td><strong>${r.title}</strong><br/><small>${r.personName}</small></td>
                  <td><code>${r.pin}</code></td>
                  <td>
                    <button class="btn btn-primary" onclick="window.NPApp.switchRole('${r.id}')">
                      ${currentRoleId === r.id ? '✓ Đang dùng' : 'Chọn vai trò'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // TAB 9: 🗺️ SƠ ĐỒ & QUY TẮC
  function renderTabSoDo(container) {
    container.innerHTML = `
      <div class="section-card">
        <h3>🗺️ Sơ đồ Phân cấp 5 Tầng — Công ty Nguyên Phát</h3>
        <div class="org-flow-box">
          <div class="org-node" style="background:#134e4a;">1. BAN GIÁM ĐỐC<br/><small>Báo cáo tự động 08:30 • Duyệt 100% Ứng lương &amp; Bảng lương</small></div>
          <div>↓</div>
          <div class="org-node" style="background:#1e4e79;">2. HÀNH CHÍNH – KẾ TOÁN<br/><small>Tổng hợp công Ngày/Tuần/Tháng • Chỉ tính lương trên công ĐÃ DUYỆT</small></div>
          <div>↓</div>
          <div class="org-node" style="background:#2c6293;">3. QUẢN LÝ CÔNG TRÌNH<br/><small>Đối chiếu ảnh định vị GPS thực tế • Duyệt công &amp; khóa bảng công</small></div>
          <div>↓</div>
          <div class="org-node" style="background:#b45309;">4. ĐỘI TRƯỞNG (6 Đội)<br/><small>Chấm công đội • Đăng ký tăng ca • KHÔNG được tự duyệt công</small></div>
          <div>↓</div>
          <div class="org-node" style="background:#15803d;">5. CÔNG NHÂN (108 Công nhân)<br/><small>Chụp Camera trực tiếp (Chặn thư viện) • Đóng dấu Địa điểm &amp; Thời gian</small></div>
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
        <img src="${photoUrl}" alt="${w.name}" style="width:100%; max-width:440px; border-radius:12px; border:2px solid #d4af37;" />
      </div>
      <div style="margin-top:12px; background:#f8fafc; padding:11px 13px; border-radius:10px; border:1px solid #cbd5e1; font-size:12.5px; display:grid; gap:4px;">
        <div><strong>👤 Công nhân:</strong> ${w.name} (<code>${w.code}</code>) — ${team.name}</div>
        <div><strong>🕒 Thời gian chấm công:</strong> <span style="color:#0f3b7a; font-weight:800;">${w.checkInTime} Ngày ${w.date}</span></div>
        <div><strong>📍 Địa điểm định vị:</strong> <span style="color:#15803d; font-weight:800;">${displayAddr}</span></div>
        <div><strong>🌐 Tọa độ GPS:</strong> <code>${w.lat}, ${w.lng}</code> (Sai số: <strong>±${w.acc}m</strong>)</div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;">
        <button class="btn-big-checkin" onclick="window.NPApp.closeModal('photoModal'); window.NPApp.openCameraQuick('VAO', '${w.id}')">🟢 Chụp Check-in Mới</button>
        <button class="btn-big-checkout" onclick="window.NPApp.closeModal('photoModal'); window.NPApp.openCameraQuick('RA', '${w.id}')">🔵 Chụp Check-out</button>
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
      if (headerTitle) headerTitle.textContent = '🔵 Chụp Camera CHECK-OUT (RA CA)';
      if (snapBtn) snapBtn.textContent = '📸 BẤM CHỤP & CHECK-OUT NGAY';
    } else {
      if (headerTitle) headerTitle.textContent = '🟢 Chụp Camera CHECK-IN (VÀO CA)';
      if (snapBtn) snapBtn.textContent = '📸 BẤM CHỤP & CHECK-IN NGAY';
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

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const video = document.getElementById('liveVideo');
    if (liveStream && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else if (sampleImgObj.complete && sampleImgObj.naturalWidth > 0) {
      ctx.drawImage(sampleImgObj, 0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = 'rgba(6, 23, 51, 0.90)';
    ctx.fillRect(0, canvas.height - 165, canvas.width, 165);

    ctx.fillStyle = actionType === 'VAO' ? '#16a34a' : '#2563eb';
    ctx.fillRect(16, canvas.height - 152, 350, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11.5px Segoe UI, sans-serif';
    ctx.fillText(
      actionType === 'VAO'
        ? '🟢 CHECK-IN VÀO CA • CAMERA TRỰC TIẾP GPS'
        : '🔵 CHECK-OUT RA CA • CAMERA TRỰC TIẾP GPS',
      22,
      canvas.height - 137
    );

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14.5px Segoe UI, sans-serif';
    ctx.fillText(`Mã NV: ${worker.code}   |   Họ tên: ${worker.name}`, 16, canvas.height - 108);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 13.5px Segoe UI, sans-serif';
    ctx.fillText(`🕒 Thời gian chấm công: ${timeStr} — Ngày ${dateStr}`, 16, canvas.height - 85);

    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 12.5px Segoe UI, sans-serif';
    ctx.fillText(`📍 Địa điểm: ${realAddr.slice(0, 60)}`, 16, canvas.height - 62);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(`🏗️ Công trình: ${proj.name}`, 16, canvas.height - 42);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12.5px Segoe UI, sans-serif';
    ctx.fillText(`🌐 Tọa độ GPS: ${realLat}, ${realLng}   |   Sai số: ±${realAcc} m`, 16, canvas.height - 20);

    ctx.fillStyle = '#071e3d';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.fillRect(canvas.width - 108, canvas.height - 72, 92, 52);
    ctx.strokeRect(canvas.width - 108, canvas.height - 72, 92, 52);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 15px Segoe UI, sans-serif';
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

  function openAdjustModal(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const role = getCurrentRole();

    document.getElementById('adjustModalBody').innerHTML = `
      <div style="background:#fffbeb; border:1px solid #f59e0b; padding:9px 11px; border-radius:8px; margin-bottom:10px; font-size:12px; color:#92400e;">
        🛡️ <strong>Kiểm soát độc lập:</strong> Bảng công đã duyệt không tự ý sửa. Mọi điều chỉnh bắt buộc nhập lý do lưu vào Audit Log (${role.personName}).
      </div>
      <div class="form-group">
        <label>Công nhân:</label>
        <input type="text" value="${w.code} — ${w.name} (${w.teamId})" disabled />
      </div>
      <div class="form-group">
        <label>Trạng thái chấm công:</label>
        <select id="adjStatus">
          <option value="DANG_LAM" ${w.attendanceStatus === 'DANG_LAM' ? 'selected' : ''}>• ĐANG LÀM (Có mặt)</option>
          <option value="DA_RA" ${w.attendanceStatus === 'DA_RA' ? 'selected' : ''}>✓ ĐÃ CHECK-OUT</option>
          <option value="NGHI_PHEP" ${w.attendanceStatus === 'NGHI_PHEP' ? 'selected' : ''}>NGHỈ PHÉP (P)</option>
          <option value="NGHI_KP" ${w.attendanceStatus === 'NGHI_KP' ? 'selected' : ''}>NGHỈ KHÔNG PHÉP (KP)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Giờ công hành chính &amp; Giờ tăng ca (OT):</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <input type="number" id="adjRegHours" value="${w.hoursRegular}" min="0" max="8" step="0.5" />
          <input type="number" id="adjOtHours" value="${w.hoursOtActual}" min="0" max="12" step="0.5" />
        </div>
      </div>
      <div class="form-group">
        <label style="color:#dc2626;">Lý do điều chỉnh (Bắt buộc):</label>
        <textarea id="adjReason" rows="2" placeholder="Nhập lý do cụ thể..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-outline" onclick="window.NPApp.closeModal('adjustModal')">Hủy</button>
        <button class="btn btn-primary" onclick="window.NPApp.submitAdjustment('${w.id}')">💾 Lưu Điều chỉnh</button>
      </div>
    `;
    document.getElementById('adjustModal').classList.add('open');
  }

  function submitAdjustment(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const reason = (document.getElementById('adjReason').value || '').trim();
    if (!reason) {
      alert('Vui lòng nhập lý do điều chỉnh để lưu vào lịch sử!');
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
    alert(`Đã quét chốt ca 17:30: Khóa tối đa 8.0h HC (0h OT) cho ${lockedCount} trường hợp quên Check-out không có phiếu đăng ký tăng ca!`);
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
      alert('⛔ Đội trưởng / Công nhân chỉ được nhập công, KHÔNG được tự duyệt công! Hãy chuyển sang vai trò Quản lý công trình hoặc Ban Giám đốc ở Menu trái.');
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
      alert('⛔ Đội trưởng chỉ được nhập công, KHÔNG được tự duyệt công! Hãy chuyển sang vai trò Quản lý công trình / Giám đốc ở Menu bên trái.');
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

  function registerOtByLeader(workerId) {
    const w = state.workers.find(x => x.id === workerId);
    if (!w) return;
    const hours = prompt(`Đội trưởng đăng ký số giờ tăng ca cho ${w.name}:`, w.hoursOtRegistered || 2);
    if (hours === null) return;
    w.hoursOtRegistered = Number(hours) || 0;
    w.hoursOtActual = Number(hours) || 0;
    w.approvalStatus = 'CHO_DUYET';
    w.approvedBy = null;
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
        alert('⛔ Chỉ Ban Giám Đốc mới có quyền phê duyệt ứng lương!');
        return;
      }
      adv.status = 'BGD_DA_DUYET';
      adv.approvedByBgd = 'GĐ. Nguyễn Phát';
    }
    saveState();
    renderMain();
  }

  function createNewAdvancePrompt() {
    const code = prompt('Nhập Mã công nhân xin ứng lương:', 'NV.SME-30');
    if (!code) return;
    const w = state.workers.find(x => x.code.toLowerCase() === code.trim().toLowerCase()) || state.workers[1];
    const amountStr = prompt(`Số tiền xin ứng cho ${w.name}:`, '2000000');
    if (!amountStr) return;
    const reason = prompt('Lý do xin ứng:', 'Ứng lương sinh hoạt giữa tháng') || 'Ứng lương';

    state.advances.unshift({
      id: 'ADV-0' + (state.advances.length + 1),
      workerCode: w.code,
      workerName: w.name,
      teamId: w.teamId,
      projectId: w.projectId,
      date: new Date().toLocaleDateString('vi-VN'),
      amount: Number(amountStr) || 2000000,
      reason,
      accruedSalaryAtRequest: w.daysMonthApproved * w.dailyWage,
      status: 'CHO_KT_KIEM_TRA',
      checkedByKt: null,
      approvedByBgd: null
    });
    saveState();
    renderMain();
  }

  function approveMonthlyPayroll() {
    const role = getCurrentRole();
    if (role.id !== 'BGD') {
      alert('⛔ Chỉ Ban Giám Đốc mới có quyền Phê duyệt Bảng lương!');
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
      <div style="border:2px solid #0b2e46; border-radius:12px; padding:14px;">
        <div style="font-weight:900; font-size:15px; color:#0b2e46; margin-bottom:8px;">PHIẾU LƯƠNG — ${w.name} (${w.code})</div>
        <table class="data-table" style="margin-bottom:10px;">
          <tbody>
            <tr><td>Công hành chính (${w.daysMonthApproved} công)</td><td style="text-align:right; font-weight:700;">${formatVND(basePay)}</td></tr>
            <tr><td>Giờ tăng ca (${w.otHoursMonthApproved}h x 1.5)</td><td style="text-align:right; font-weight:700;">${formatVND(otPay)}</td></tr>
            <tr><td>Công Chủ nhật (${w.sundayDaysMonth}c x 2.0)</td><td style="text-align:right; font-weight:700;">${formatVND(sunPay)}</td></tr>
            <tr style="background:#f1f5f9;"><td><strong>TỔNG LƯƠNG GỘP</strong></td><td style="text-align:right; font-weight:800;">${formatVND(gross)}</td></tr>
            <tr><td style="color:#dc2626;">Trừ Ứng lương đã duyệt</td><td style="text-align:right; color:#dc2626; font-weight:700;">-${formatVND(approvedAdvance)}</td></tr>
            <tr style="background:#dcfce7;"><td><strong>THỰC LĨNH</strong></td><td style="text-align:right; color:#15803d; font-weight:900;">${formatVND(net)}</td></tr>
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('payslipModal').classList.add('open');
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }

  function switchRole(roleId) {
    currentRoleId = roleId;
    const sel = document.getElementById('roleSelect');
    if (sel) sel.value = roleId;
    const role = getCurrentRole();
    const bannerTitle = document.getElementById('activeRoleBannerTitle');
    if (bannerTitle) {
      bannerTitle.textContent = `👤 Đang dùng: ${role.title} — ${role.personName}`;
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

  // ================= CÀI PHÍM TẮT APP RA MÀN HÌNH (PWA INSTALL) =================
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
    // Đăng ký Service Worker để cài phím tắt App PWA
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

    // Kiểm tra tham số phím tắt (?action=checkin hoặc ?tab=...)
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') && TAB_TITLES[params.get('tab')]) {
      selectTab(params.get('tab'));
    }
    if (params.get('action') === 'checkin') {
      setTimeout(() => openCameraQuick('VAO', null), 300);
    }

    setTimeout(refreshRealGps, 400);
  }

  window.NPApp = {
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
    runCutoff1730Check,
    confirmForgotCheckout,
    approveSingleWorker,
    approveAllVisible,
    registerOtByLeader,
    advanceStep,
    createNewAdvancePrompt,
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
