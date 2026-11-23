'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

const document = { addEventListener() {}, querySelector() { return null; } };
const sandbox = vm.createContext({ window: {}, document, structuredClone, crypto: { randomUUID }, Blob, TextEncoder });
for (const file of ['workspace', 'people', 'attendance', 'payroll', 'finance', 'report']) {
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../public/v2-' + file + '.js'), 'utf8'), sandbox, { filename: file });
}
const { NPWorkspace, NPPeople, NPAttendance, NPPayroll, NPFinance, NPReport } = sandbox.window;

const run = (module, role, action, fields) => module.handle(action, new Map(Object.entries(fields)), context(role));
const scenarios = [];

const projects = [{ id: 'CT1', name: 'Công trình A' }, { id: 'CT2', name: 'Công trình B' }];
const teams = [{ id: 'D1', name: 'Đội A', projectId: 'CT1' }, { id: 'D2', name: 'Đội B', projectId: 'CT2' }];
const workers = [
  { id: 'W1', code: 'CN-01', name: 'Người chuyển đội', teamId: 'D1', projectId: 'CT1' },
  { id: 'W2', code: 'CN-02', name: 'Người xin nghỉ', teamId: 'D1', projectId: 'CT1' },
  { id: 'W3', code: 'CN-03', name: 'Riêng đội B', teamId: 'D2', projectId: 'CT2' }
];
const state = { workers, teams, projects, accounts: [], advances: [
  { id:'ADV-1', workerCode:'CN-01', projectId:'CT1', date:'2026-11-02', amount:10000, status:'BGD_DA_DUYET' }
] };
const data = {};
const accountOverrides = {
  DT1: { teamId:'D1', projectId:'CT1' }, CN: { workerCode:'CN-02', projectId:'CT1' }, KT: { projectId:'ALL' }
};

function context(role) {
  return {
    role, state, data, account: { roleId:role, id:role, fullName:role, ...accountOverrides[role] },
    save() {}, refresh() {}, attendanceMode:'period', esc:NPWorkspace.esc, money:String
  };
}
function filter(role, teamId, projectId, extra={}) {
  run(NPAttendance, role, 'filter', { month:'2026-11', teamId, projectId, half:'first', day:'5', ...extra });
}
const sheet = (team, half='first') => data.attendance.periods[`2026-11/${team}/${half}`];
const prove = (id, fn) => { fn(); scenarios.push(id); };
const staffAttendance = () => NPAttendance.render('v2-finance-attendance', context('KT'));

prove('UAT-01', () => {
  run(NPPeople,'NS','create-worker',{code:'NEW-11', name:'Tái tuyển', joinedOn:'2026-01-01'});
  run(NPPeople,'NS','update-profile',{workerCode:'NEW-11',status:'left',joinedOn:'2026-01-01',leftOn:'2026-04-01',reason:'Kết thúc đợt 1'});
  run(NPPeople,'NS','update-profile',{workerCode:'NEW-11',status:'rehired',joinedOn:'2026-01-01',leftOn:'2026-04-01',rehiredOn:'2026-05-01',reason:'Tái tuyển'});
  assert.equal(data.people.employees.filter(item=>item.code==='NEW-11').length,1);
  assert.equal(data.people.profiles['NEW-11'].spells.length,2);
  assert.throws(()=>run(NPPeople,'NS','create-worker',{code:'NEW-11',name:'Trùng'}), /đã được sử dụng/);
});
prove('UAT-02', () => {
  run(NPPeople,'NS','assign',{workerCode:'CN-01',teamId:'D2',start:'2026-11-10',end:'2026-11-30'});
  const assignment = data.people.assignments[0];
  assert.equal(NPWorkspace.assignmentAt(data,workers[0],'2026-11-10').teamId,'D1');
  assert.throws(()=>run(NPPeople,'NS','confirm-assignment',{id:assignment.id}),/ngoài phạm vi/);
  assert.throws(()=>run(NPPeople,'DT1','confirm-assignment',{id:assignment.id}),/ngoài phạm vi/);
  const manager = context('DT1');
  manager.account = { ...manager.account, id:'DT2', teamId:'D2', projectId:'CT2' };
  NPPeople.handle('confirm-assignment', new Map([['id',assignment.id]]), manager);
  assert.equal(NPWorkspace.assignmentAt(data,workers[0],'2026-11-09').teamId,'D1');
  assert.equal(NPWorkspace.assignmentAt(data,workers[0],'2026-11-10').teamId,'D2');
  filter('KT','D1','CT1');
  assert.equal((staffAttendance().match(/title="Ngoài phân công"/g)||[]).length,6);
  filter('KT','D2','CT2');
  assert.equal((staffAttendance().match(/title="Ngoài phân công"/g)||[]).length,9);
});
prove('UAT-03', () => {
  assert.throws(()=>run(NPPeople,'NS','assign',{workerCode:'CN-01',teamId:'D1',start:'2026-11-11',end:'2026-11-15'}),/trùng phân công/);
});
prove('UAT-04', () => {
  filter('DT1','D2','CT2');
  filter('DT1','D1','CT1');
  const html = NPAttendance.render('v2-team-attendance',context('DT1'));
  assert.match(html,/CN-01/);
  assert.doesNotMatch(html,/CN-03/);
});
prove('UAT-05', () => {
  run(NPPeople,'CN','create-leave',{start:'2026-11-05',end:'2026-11-05',reason:'Nghỉ',type:'unpaid'});
  const item=data.people.leave[0];
  run(NPPeople,'DT1','confirm-leave',{id:item.id});
  run(NPPeople,'NS','approve-leave',{id:item.id});
  assert.equal(item.status,'approved');
  assert.match(NPAttendance.render('v2-team-attendance',context('DT1')),/Nghỉ/);
});
prove('UAT-06', () => {
  run(NPAttendance,'DT1','submit',{id:'first'});
  assert.equal(sheet('D1').status,'submitted');
  filter('KT','D1','CT1');
  run(NPAttendance,'KT','return',{id:'first',reason:'Đối chiếu ngày 5'});
  assert.equal(sheet('D1').status,'returned');
  run(NPAttendance,'DT1','submit',{id:'first'});
  run(NPAttendance,'KT','confirm',{id:'first'});
  run(NPAttendance,'KT','lock',{id:'first'});
  assert.equal(sheet('D1').status,'locked');
  assert.equal(sheet('D1').snapshot.cells['cell:W2:5'],'N');
  assert.equal(sheet('D1','second'),undefined);
});
prove('UAT-07', () => {
  const original = JSON.stringify(sheet('D1').snapshot);
  run(NPAttendance,'CN','propose-correction',{version:sheet('D1').snapshot.version,workerId:'W2',day:'5',code:'4',reason:'Có bổ sung ca',evidence:'BC-01'});
  const item=data.attendance.corrections[0];
  run(NPAttendance,'KT','review-correction',{id:item.id});
  run(NPAttendance,'BGD','approve-correction',{id:item.id});
  assert.equal(item.status,'approved');
  assert.equal(item.before,'N');
  assert.equal(item.after,'4');
  assert.equal(JSON.stringify(sheet('D1').snapshot),original);
});
prove('UAT-08', () => {
  for (const [workerId, effective, regular] of [['W1','2026-11-01','10000'],['W1','2026-11-06','15000'],['W2','2026-11-01','10000']]) {
    run(NPPayroll,'KT','rate',{workerId, effective, regular, overtime:'25000',contract:'HD-1'});
  }
  run(NPPayroll,'KT','calculate',{source:sheet('D1').snapshot.version});
  const runItem = data.payroll.runs[0];
  assert.equal(runItem.lines.find(item=>item.workerId==='W1' && item.date==='2026-11-05').gross,80000);
  assert.equal(runItem.lines.find(item=>item.workerId==='W1' && item.date==='2026-11-06').gross,120000);
  assert.equal(runItem.lines.find(item=>item.workerId==='W2' && item.date==='2026-11-05').gross,40000);
});
prove('UAT-09', () => {
  const runItem = data.payroll.runs[0];
  const inputs = {runId:runItem.id,advanceId:'ADV-1',reference:'CT-1',deduction:'6000'};
  run(NPPayroll,'KT','deduct',inputs);
  assert.throws(()=>run(NPPayroll,'KT','deduct',inputs),/số dư/);
  assert.equal(runItem.deductions.length,1);
  assert.equal(state.advances[0].amount-runItem.deductions[0].amount,4000);
  run(NPPayroll,'KT','publish',{id:runItem.id});
  run(NPPayroll,'KT','payment',{runId:runItem.id,due:'2026-11-30'});
});
prove('UAT-10', () => {
  const row=data.finance.rows.find(item=>item.id===data.payroll.runs[0].paymentId);
  for (const action of ['check','qualify','submit','approve']) run(NPFinance,'KT',action,{id:row.id});
  assert.equal(row.status,'pending');
  run(NPFinance,'BGD','approve',{id:row.id});
  assert.equal(row.status,'approved');
});
prove('UAT-11', () => {
  const row=data.finance.rows.find(item=>item.id===data.payroll.runs[0].paymentId);
  const fields={id:row.id,amount:'30000',reference:'CHUYEN-01',verified:'on'};
  run(NPFinance,'KT','transfer',fields);
  run(NPFinance,'KT','transfer',fields);
  assert.equal(row.status,'partial');
  assert.equal(row.transactions.length,1);
  assert.equal(NPFinance.summary(context('KT')).payable,
    data.finance.rows.filter(row=>row.kind==='payable'&&['approved','partial'].includes(row.status)).reduce((sum,row)=>sum+row.amount,0)-30000);
});

(async () => {
  const captured = [];
  sandbox.window.NPReport.download = (rows,name)=>captured.push({ rows,name });
  prove('UAT-12', () => {
    run(NPAttendance,'KT','export',{});
    run(NPPayroll,'KT','export',{id:data.payroll.runs[0].id});
    const [hours, payroll] = captured.map(item=>item.rows);
    assert.equal(hours.length,3);
    assert.equal(payroll.length,3);
    assert.equal(hours[1].at(-2),72);
    assert.equal(payroll[1].at(-1),data.payroll.runs[0].lines.filter(item=>item.workerId==='W1').reduce((sum,item)=>sum+item.gross,0)-6000);
  });
  const result = Buffer.from(await NPReport.workbook(captured[1].rows).arrayBuffer());
  assert.equal(result.readUInt32LE(),0x04034b50);
  if(process.argv[2]) fs.writeFileSync(process.argv[2],result);
  console.log('PASS ' + scenarios.join(', '));
})().catch(error => { console.error(error); process.exitCode=1; });
