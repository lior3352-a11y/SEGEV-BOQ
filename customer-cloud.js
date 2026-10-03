let customerRevision = 0;
let customerSaveTimer;
let customerPending = false;
let customerSaving = false;
let customerReady = false;
const customerKey = 'segev_boq_work_v1';
async function customerRequest(path, options={}) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const result=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(result.error || 'שגיאת חיבור');
  return result;
}
function status(text){document.getElementById('cloudStatus').textContent=text}
async function persistCustomer() {
  if (!customerReady || customerSaving || !customerPending) return;
  customerSaving=true; customerPending=false; status('שומר...');
  try {
    const data={[customerKey]:JSON.stringify(S)};
    const result=await customerRequest('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:customerRevision,data})});
    customerRevision=Number(result.revision);status('נשמר בענן');
  } catch(error) {
    customerReady=false;
    status('שגיאת שמירה');
    alert(error.message.includes('changed')?'הנתונים עודכנו במכשיר אחר. שמור גיבוי לפני רענון.':'לא ניתן לשמור כעת. שמור גיבוי ונסה שוב.');
  } finally {customerSaving=false;if(customerPending&&customerReady)void persistCustomer()}
}
window.customerCloudSave=()=>{
  if(!customerReady)return;
  customerPending=true;clearTimeout(customerSaveTimer);
  customerSaveTimer=setTimeout(persistCustomer,500);
};
async function loadCustomer(){
  const remote=await customerRequest('/api/workspace');
  customerRevision=Number(remote.revision||0);
  if(remote.data?.[customerKey]){
    const parsed=JSON.parse(remote.data[customerKey]);
    if(!Array.isArray(parsed.projects))throw new Error('נתוני החשבון אינם תקינים');
    S=parsed;
  } else S={projects:[],selected:null};
  render();customerReady=true;
  document.getElementById('customerGate').hidden=true;
  document.getElementById('customerApp').hidden=false;
  status('מחובר');
}
document.addEventListener('DOMContentLoaded',()=>{
  const gate=document.getElementById('customerGate');
  const error=document.getElementById('customerLoginError');
  const login=document.getElementById('customerLogin');
  customerRequest('/api/session').then(loadCustomer).catch(()=>{gate.hidden=false});
  login.onclick=async()=>{
    login.disabled=true;error.textContent='מתחבר...';
    try{
      await customerRequest('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('customerEmail').value,password:document.getElementById('customerPassword').value})});
      document.getElementById('customerPassword').value='';
      await loadCustomer();error.textContent='';
    }catch(e){error.textContent=e.message==='Wrong email or password'?'אימייל או סיסמה אינם נכונים':'לא ניתן להתחבר. בדוק את החיבור ונסה שוב.'}
    finally{login.disabled=false}
  };
  document.getElementById('customerLogout').onclick=async()=>{customerReady=false;await customerRequest('/api/session',{method:'DELETE'}).catch(()=>{});document.getElementById('customerApp').hidden=true;S={projects:[],selected:null};render();gate.hidden=false};
  const ai=document.getElementById('aiDialog');
  document.getElementById('askAi').onclick=()=>{ai.hidden=false;document.getElementById('aiQuestion').focus()};
  document.getElementById('closeAi').onclick=()=>ai.hidden=true;
  document.getElementById('sendAi').onclick=async()=>{
    const question=document.getElementById('aiQuestion').value.trim();if(!question)return;
    const button=document.getElementById('sendAi');const answer=document.getElementById('aiAnswer');
    button.disabled=true;answer.textContent='בודק את נתוני הפרויקטים...';
    try{
      clearTimeout(customerSaveTimer);await persistCustomer();
      if(!customerReady)throw new Error('שמירה נכשלה');
      const result=await customerRequest('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
      answer.textContent=result.answer;
    }catch(e){answer.textContent=e.message==='AI service is not configured'?'AI עדיין לא חובר לחשבון הזה.':'לא הצלחתי לקבל תשובה כרגע. נסה שוב.'}
    finally{button.disabled=false}
  };
  document.getElementById('aiQuestion').onkeydown=e=>{if(e.key==='Enter')document.getElementById('sendAi').click()};
});
