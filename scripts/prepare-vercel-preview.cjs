const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const publicDirectory = path.resolve(__dirname, '../public');
const previewAssets = [
  'index.html',
  'styles.css',
  'v2-shell.css',
  'v2-dashboard.css',
  'v2-tables.css',
  'v2-mobile.css',
  'v2-workspace.css',
  'v2-workspace.js',
  'v2-business.js',
  'v2-business.css',
  'v2-people.js',
  'v2-people.css',
  'v2-finance.js',
  'v2-finance.css',
  'v2-attendance.js',
  'v2-attendance.css',
  'v2-director.js',
  'v2-director.css',
  'manifest.json',
  'assets/np-mark.png',
  'assets/np-app-icon.png',
  'assets/np-construction.webp'
];
const projectNames = ['Khu mẫu Bờ Đông', 'Nhà mẫu Ánh Dương', 'Khu mẫu Vườn Mây'];
const managerNames = ['Lâm Quốc Huy', 'Bùi Mỹ Hạnh', 'Vũ Thanh Nam'];
const leaderNames = ['Võ Minh Sơn', 'Lý Đức Thành', 'Tạ Hoàng Sơn', 'Hà Anh Tân', 'Đỗ Ngọc Hải', 'Ngô Gia Hưng'];
const directorName = 'Đinh Mai An';
const accountantName = 'Phan Thảo Uyên';
const workNames = ['Lắp dựng giàn giáo', 'Thi công cốt thép', 'Kiểm tra cốp pha', 'San nền khu A', 'Vận chuyển vật tư', 'Hoàn thiện khu mẫu'];
const demoDate = '2026-11-22';
const noPhone = 'Chưa cung cấp';

function buildDemoSeed() {
  const projects = projectNames.map((name, index) => ({
    id: 'CT' + (index + 1),
    code: 'DEMO-CT' + (index + 1),
    name,
    address: 'Khu vực mô phỏng ' + (index + 1),
    lat: 10 + index / 100,
    lng: 106 + index / 100,
    radiusM: 200,
    managerUsername: 'demo-quan-ly-' + (index + 1),
    manager: managerNames[index],
    managerRole: 'Quản lý công trình'
  }));

  const teams = leaderNames.map((leader, index) => {
    const project = projects[Math.floor(index / 2)];
    return {
      id: 'D' + (index + 1),
      name: 'Đội ' + String(index + 1).padStart(2, '0'),
      leader,
      leaderUsername: 'demo-doi-truong-' + (index + 1),
      projectId: project.id,
      managerUsername: project.managerUsername,
      managerName: project.manager,
      phone: noPhone,
      dailyTargetTask: workNames[index]
    };
  });

  const accounts = [];
  function addAccount({ username, fullName, positionTitle, roleId, level, projectId, teamId, workerCode, managerName, leaderName, dailyWage }) {
    const account = {
      id: 'DEMO-ACC-' + (accounts.length + 1),
      username,
      pin: String(7811 + accounts.length),
      fullName,
      positionTitle,
      roleId,
      level,
      projectId,
      teamId,
      workerCode,
      dailyWage,
      managerName,
      leaderName,
      createdBy: managerName || directorName,
      status: 'ACTIVE',
      perms: {
        checkin: roleId !== 'BGD',
        inputTeam: roleId === 'QLCT' || roleId === 'DT1',
        approveWork: roleId === 'BGD' || roleId === 'QLCT',
        accounting: roleId === 'BGD' || roleId === 'KT',
        approveDirector: roleId === 'BGD',
        adminUsers: roleId === 'BGD'
      }
    };
    accounts.push(account);
    return account;
  }

  addAccount({
    username: 'demo-giam-doc', fullName: directorName, positionTitle: 'Tổng Giám đốc', roleId: 'BGD',
    level: 1, projectId: 'ALL', teamId: 'ALL', dailyWage: 0
  });
  addAccount({
    username: 'demo-ke-toan', fullName: accountantName, positionTitle: 'Hành chính – Kế toán', roleId: 'KT',
    level: 2, projectId: 'ALL', teamId: 'VP-HC', workerCode: 'DEMO-KT', managerName: directorName, dailyWage: 550000
  });
  for (const project of projects) {
    addAccount({
      username: project.managerUsername, fullName: project.manager, positionTitle: 'Quản lý công trình', roleId: 'QLCT',
      level: 3, projectId: project.id, teamId: 'BCH-' + project.id, workerCode: 'DEMO-QL-' + project.id,
      managerName: directorName, dailyWage: 680000
    });
  }
  for (const team of teams) {
    addAccount({
      username: team.leaderUsername, fullName: team.leader, positionTitle: 'Đội trưởng thi công', roleId: 'DT1',
      level: 4, projectId: team.projectId, teamId: team.id, workerCode: 'DEMO-DT-' + team.id,
      managerName: team.managerName, dailyWage: 570000
    });
  }

  function times(project, index) {
    const onLeave = index % 17 === 12;
    const absent = index % 19 === 18;
    const finished = index % 5 === 4;
    const checkedIn = !onLeave && !absent;
    return {
      date: demoDate,
      attendanceStatus: onLeave ? 'NGHI_PHEP' : absent ? 'NGHI_KP' : finished ? 'DA_RA' : 'DANG_LAM',
      checkInTime: checkedIn ? '07:' + String(index % 28).padStart(2, '0') : null,
      checkOutTime: checkedIn && finished ? '17:05' : null,
      lat: project.lat,
      lng: project.lng,
      acc: 12,
      hoursRegular: checkedIn ? 8 : 0,
      hoursOtRegistered: checkedIn && index % 7 === 0 ? 2 : 0,
      hoursOtActual: checkedIn && finished && index % 7 === 0 ? 2 : 0,
      forgotCheckoutFlag: false,
      approvalStatus: index % 4 === 0 ? 'CHO_DUYET' : 'DA_DUYET',
      approvedBy: index % 4 === 0 ? null : project.manager,
      daysMonthApproved: 12 + index % 8,
      otHoursMonthApproved: index % 6 * 2,
      sundayDaysMonth: index % 2
    };
  }

  const familyNames = ['Đào', 'Hứa', 'Lương', 'Bạch', 'Trịnh', 'Từ', 'Châu', 'Tống', 'Diệp', 'Mai', 'Lục', 'La'];
  const givenNames = ['Minh Tân', 'Văn Huân', 'Khánh Toàn', 'Anh Phong', 'Ngọc Hà', 'Kim Yến', 'Minh Quân', 'Văn Khải', 'Hoàng Tâm'];
  const workers = Array.from({ length: 108 }, (_, index) => {
    const team = teams[Math.floor(index / 18)];
    const project = projects.find(row => row.id === team.projectId);
    const skill = ['Thợ xây', 'Thợ sắt', 'Thợ cốp pha', 'Phụ việc'][index % 4];
    return {
      id: 'DEMO-W-' + (index + 1),
      seq: index + 1,
      code: 'DEMO-CN-' + String(index + 1).padStart(3, '0'),
      name: familyNames[index % familyNames.length] + ' ' + givenNames[Math.floor(index / familyNames.length)],
      pin: String(8101 + index),
      teamId: team.id,
      projectId: project.id,
      skill,
      assignedTaskToday: team.dailyTargetTask,
      dailyWage: 390000 + index % 5 * 25000,
      ...times(project, index),
      isLate: false,
      lateMin: 0,
      useRealSamplePhoto: false,
      avatarSeed: index + 1,
      teamName: team.name,
      projectName: project.name,
      roleName: skill,
      phone: noPhone,
      leaderName: team.leader,
      leaderUsername: team.leaderUsername,
      managerName: team.managerName,
      managerUsername: team.managerUsername,
      createdBy: team.leader,
      daysPendingMonth: index % 4 === 0 ? 1 : 0
    };
  });
  const firstWorker = workers[0];
  const workerAccount = addAccount({
    username: 'demo-cong-nhan', fullName: firstWorker.name, positionTitle: 'Công nhân', roleId: 'CN',
    level: 5, projectId: firstWorker.projectId, teamId: firstWorker.teamId, workerCode: firstWorker.code,
    managerName: firstWorker.managerName, leaderName: firstWorker.leaderName, dailyWage: firstWorker.dailyWage
  });
  firstWorker.pin = workerAccount.pin;

  addAccount({
    username: 'demo-kinh-doanh', fullName: 'Nguyễn Linh Chi', positionTitle: 'Kinh doanh', roleId: 'KD',
    level: 2, projectId: 'ALL', teamId: 'ALL'
  });
  addAccount({
    username: 'demo-nhan-su', fullName: 'Phạm Gia Hân', positionTitle: 'Nhân sự', roleId: 'NS',
    level: 2, projectId: 'ALL', teamId: 'ALL'
  });

  const demoLogins = { BGD: 'giamdoc', KD: 'kinhdoanh', NS: 'nhansu', KT: 'ketoan', DT1: 'doitruong', CN: 'congnhan' };
  for (const [roleId, demoLogin] of Object.entries(demoLogins)) {
    const account = accounts.find(item => item.roleId === roleId);
    account.demoLogin = demoLogin;
    account.pin = '9999';
  }

  const staffAttendance = accounts.filter(account => ['KT', 'QLCT', 'DT1'].includes(account.roleId)).map((account, index) => {
    const project = projects.find(row => row.id === account.projectId) || projects[0];
    const team = teams.find(row => row.id === account.teamId);
    return {
      id: 'DEMO-STAFF-' + (index + 1),
      seq: index + 1,
      code: account.workerCode,
      username: account.username,
      name: account.fullName,
      roleId: account.roleId,
      roleName: account.positionTitle,
      teamId: account.teamId,
      teamName: team?.name || (account.roleId === 'KT' ? 'Văn phòng' : 'Ban chỉ huy'),
      leaderName: account.managerName,
      leaderUsername: team?.managerUsername || accounts[0].username,
      projectId: project.id,
      projectName: project.name,
      managerUsername: team?.managerUsername || accounts[0].username,
      managerName: account.managerName,
      createdBy: account.createdBy,
      assignedTaskToday: team?.dailyTargetTask || 'Theo dõi tiến độ công việc',
      phone: noPhone,
      dailyWage: account.dailyWage,
      ...times(project, index + 1)
    };
  });

  const roles = ['BGD', 'KD', 'NS', 'KT', 'DT1', 'CN'].map(roleId => {
    const account = accounts.find(row => row.roleId === roleId);
    return {
      id: roleId,
      level: account.level,
      title: account.positionTitle,
      personName: account.fullName,
      pin: account.pin,
      teamId: account.teamId,
      workerCode: account.workerCode
    };
  });

  const tasks = teams.map((team, index) => ({
    id: 'DEMO-TSK-' + (index + 1),
    projectId: team.projectId,
    teamId: team.id,
    title: team.dailyTargetTask,
    assignedBy: team.managerName,
    assignedToLeader: team.leader,
    requiredWorkers: 12 + index % 4,
    allowOvertimeHours: index % 2 * 2,
    status: 'DANG_THUC_HIEN',
    progressPercent: 25 + index * 10,
    date: demoDate
  }));

  const advances = [0, 19, 52, 90].map((workerIndex, index) => {
    const worker = workers[workerIndex];
    return {
      id: 'DEMO-ADV-' + (index + 1),
      workerCode: worker.code,
      workerName: worker.name,
      teamId: worker.teamId,
      projectId: worker.projectId,
      managerName: worker.managerName,
      leaderName: worker.leaderName,
      date: '2026-11-' + (12 + index),
      amount: 500000 + index * 200000,
      reason: 'Đề nghị tạm ứng mẫu',
      accruedSalaryAtRequest: worker.daysMonthApproved * worker.dailyWage,
      status: ['BGD_DA_DUYET', 'CHO_KT_KIEM_TRA', 'CHO_BGD_DUYET', 'CHO_KT_KIEM_TRA'][index],
      checkedByKt: index % 2 === 0 ? accountantName : '',
      approvedByBgd: index === 0 ? directorName : ''
    };
  });

  return {
    projects, teams, tasks, roles, accounts, staffAttendance, workers, advances,
    deleteRequests: [],
    auditLogs: [{
      id: 'DEMO-LOG-1', timestamp: demoDate + 'T08:30:00+07:00',
      workerCode: firstWorker.code, workerName: firstWorker.name, actor: accountantName,
      field: 'Ghi chú chấm công', oldValue: 'Chờ cập nhật', newValue: 'Đã đối chiếu',
      reason: 'Dữ liệu minh họa'
    }],
    payrollMonthStatus: 'CHO_BGD_DUYET',
    cutoffTimeStandard: '17:30'
  };
}

const demoAttendanceImage = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300">
  <rect width="480" height="300" fill="#132d50"/>
  <circle cx="240" cy="135" r="66" fill="#204673"/>
  <rect x="208" y="117" width="64" height="42" rx="9" fill="none" stroke="#c7dcf7" stroke-width="5"/>
  <path d="M222 117l6-9h24l6 9" fill="none" stroke="#c7dcf7" stroke-width="5"/>
  <circle cx="240" cy="138" r="11" fill="none" stroke="#c7dcf7" stroke-width="5"/>
  <text x="240" y="230" text-anchor="middle" fill="#c7dcf7" font-family="system-ui,sans-serif" font-size="17">Ảnh chấm công minh họa</text>
</svg>`;

function packageApp(seed) {
  let app = fs.readFileSync(path.join(publicDirectory, 'app.js'), 'utf8')
    .replaceAll('assets/sample-selfie-worker.png', 'assets/demo-attendance.svg')
    .replaceAll('NP ONE · LIVE CAMERA GPS', 'NP ONE · CHẤM CÔNG MẪU')
    .replace('GPS ±${worker.acc || 8}m HỢP LỆ', 'GPS ±${worker.acc || 8}m MẪU')
    .replaceAll('GĐ. Nguyễn Phát', directorName)
    .replaceAll('KTT. Lê Thị Thu Thảo', accountantName)
    .replaceAll("'admin'", JSON.stringify(seed.accounts[0].username))
    .replaceAll(/0905\.888\.(?:668|999)/g, noPhone)
    .replaceAll("pin: '9999'", "pin: ''")
    .replaceAll(/(?<=['"])0000(?=['"])/g, '7890')
    .replace("editing.pin : '1234'", "editing.pin : '7891'")
    .replaceAll('qlct_ct4 hoặc doitruong7', 'demo-quan-ly-4 hoặc demo-doi-truong-7')
    .replaceAll('KS. Nguyễn Hoàng Long', 'Lê Anh Bình');

  for (const [index, originalName] of ['KS. Trần Minh Hoàng', 'KS. Phạm Quốc Bảo', 'KS. Đặng Văn Hùng'].entries()) {
    const project = seed.projects[index];
    app = app.replaceAll('qlct_ct' + (index + 1), project.managerUsername)
      .replaceAll(originalName, project.manager);
  }
  return app;
}

const seed = buildDemoSeed();
const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'np-one-vercel-preview-'));

try {
  for (const relativePath of previewAssets) {
    const destination = path.join(outputDirectory, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(publicDirectory, relativePath), destination);
  }
  fs.writeFileSync(path.join(outputDirectory, 'app.js'), packageApp(seed));
  fs.writeFileSync(path.join(outputDirectory, 'seed.js'), 'window.NP_PREVIEW = true;\nwindow.NP_SEED = ' + JSON.stringify(seed) + ';\n');
  fs.writeFileSync(path.join(outputDirectory, 'assets/demo-attendance.svg'), demoAttendanceImage);
  if (process.argv[2] === '--vercel') {
    const buildDirectory = path.resolve(__dirname, '../dist-preview');
    fs.rmSync(buildDirectory, { recursive: true, force: true });
    fs.cpSync(outputDirectory, buildDirectory, { recursive: true });
    console.log(buildDirectory);
  } else {
    console.log(outputDirectory);
  }
} catch (error) {
  process.exitCode = 1;
  console.error(error);
} finally {
  if (process.exitCode || process.argv[2] === '--vercel') {
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
}
