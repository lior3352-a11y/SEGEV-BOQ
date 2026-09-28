document.addEventListener('DOMContentLoaded',()=>{
  const key='segev_boq_preview_only';
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Array.isArray(saved.projects)){S=saved;render()}}catch{}
  window.customerCloudSave=()=>localStorage.setItem(key,JSON.stringify(S));
  document.getElementById('customerLogout').hidden=true;
  document.getElementById('cloudStatus').textContent='תצוגה מקומית';
  const dialog=document.getElementById('aiDialog');
  document.getElementById('askAi').onclick=()=>{dialog.hidden=false;document.getElementById('aiQuestion').focus()};
  document.getElementById('closeAi').onclick=()=>dialog.hidden=true;
  document.getElementById('sendAi').onclick=()=>{document.getElementById('aiAnswer').textContent='ה־AI עדיין לא פעיל בתצוגה הזו. בגרסה המחוברת הוא ינתח את נתוני הפרויקט וכתב הכמויות שתזין.'};
});
