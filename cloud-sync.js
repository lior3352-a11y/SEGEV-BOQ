const cloudKeys = ['segevProProjects','segevProSuppliers','segevProClients','segevProTasks','segevProTeam','segevProAlerts','segevProQuestions','segevProActions','segevProLastSaved','segevFinanceSnapshot','segevMonthlyDraft','segevMonthlyHistory','segevSubBills'];
let cloudRevision = 0;
let cloudReady = false;
let saveTimer;
let savePending = false;
let saving = false;
function snapshot(){
  return Object.fromEntries(cloudKeys.flatMap(key => {
    const value = window.localStorage.getItem(key);
    return value === null ? [] : [[key, value]];
  }));
}
function cloudProblem(message) {
  cloudReady = false;
  const messageBox = document.getElementById('loginMsg');
  if (messageBox) messageBox.textContent = message;
  window.alert(message);
}
async function cloudRequest(path, options = {}) {
  const response = await fetch(path, {credentials: 'same-origin', cache: 'no-store', ...options});
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'שגיאת חיבור');
  return response.json();
}
async function flushCloud() {
  if (!cloudReady || saving || !savePending) return;
  saving = true;
  savePending = false;
  try {
    const result = await cloudRequest('/api/workspace', {method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({revision: cloudRevision, data: snapshot()})});
    cloudRevision = Number(result.revision);
  } catch (error) {
    cloudProblem(error.message.includes('changed') ? 'הנתונים עודכנו במכשיר אחר. שמור גיבוי מהמכשיר הזה, ואז רענן כדי לקבל את העדכון.' : 'השמירה בענן נכשלה. שמור גיבוי ונסה שוב.');
  } finally {
    saving = false;
    if (savePending && cloudReady) void flushCloud();
  }
}
const cloudStorage = {
  getItem(key) { return window.localStorage.getItem(key); },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
    if (cloudReady && cloudKeys.includes(key)) { savePending = true; clearTimeout(saveTimer); saveTimer = setTimeout(flushCloud, 700); }
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    if (cloudReady && cloudKeys.includes(key)) { savePending = true; clearTimeout(saveTimer); saveTimer = setTimeout(flushCloud, 700); }
  }
};
window.cloudSync = {
  async request(path, options) {return cloudRequest(path, options)},
  async load() {
    const remote = await cloudRequest('/api/workspace');
    cloudRevision = Number(remote.revision || 0);
    if (remote.data) {
      let changed = false;
      for (const key of cloudKeys) {
        const value = remote.data[key] ?? null;
        if (window.localStorage.getItem(key) === value) continue;
        changed = true;
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      }
      if (changed) { window.location.reload(); return false; }
    } else {
      const result = await cloudRequest('/api/workspace', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({revision:0,data:snapshot()})});
      cloudRevision = Number(result.revision);
    }
    cloudReady = true;
    return true;
  },
  stop() { cloudReady = false; clearTimeout(saveTimer); }
};
