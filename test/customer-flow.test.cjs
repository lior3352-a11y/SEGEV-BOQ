const {JSDOM,VirtualConsole}=require('jsdom');
const assert=require('node:assert/strict');
const path=require('node:path').join(__dirname,'..','customer.html');
const logs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>logs.push(e.message));
let session=false,revision=0,data=null,questions=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=await JSDOM.fromFile(path,{resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.fetch=async(input,options={})=>{
  const url=String(input),method=options.method||'GET';
  const send=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  if(url==='/api/session'&&method==='GET')return send(session?{email:'owner@example.com'}:{error:'Please sign in'},session?200:401);
  if(url==='/api/session'&&method==='POST'){session=true;return send({email:'owner@example.com'})}
  if(url==='/api/workspace'&&method==='GET')return send({data,revision});
  if(url==='/api/workspace'&&method==='PUT'){const body=JSON.parse(options.body);assert.equal(body.revision,revision);data=body.data;revision++;return send({revision})}
  if(url==='/api/assistant'&&method==='POST'){questions++;const body=JSON.parse(options.body);assert.match(body.question,/חריגה/);assert.ok(data?.segev_boq_work_v1);return send({answer:'יש חריגה בסעיף הראשון.'})}
  throw Error(url+' '+method)
 }}});
 const d=dom.window.document;await wait(100);
 assert.equal(d.getElementById('customerApp').hidden,true);
 d.getElementById('customerEmail').value='owner@example.com';d.getElementById('customerPassword').value='anything';d.getElementById('customerLogin').click();await wait(100);
 assert.equal(d.getElementById('customerApp').hidden,false);
 assert.match(d.getElementById('plist').textContent,/עדיין אין פרויקטים/);
 d.getElementById('pn').value='פרויקט בדיקה';d.getElementById('addp').click();await wait(100);
 assert.match(d.getElementById('sel').textContent,/פרויקט בדיקה/);
 dom.window.show('boq');d.getElementById('bd').value='בטון';d.getElementById('bq').value='10';d.getElementById('bp').value='500';d.getElementById('baq').value='10';d.getElementById('bac').value='600';d.getElementById('addb').click();await wait(100);
 d.getElementById('askAi').click();d.getElementById('aiQuestion').value='איפה יש חריגה?';d.getElementById('sendAi').click();await wait(100);
 assert.equal(questions,1);assert.match(d.getElementById('aiAnswer').textContent,/חריגה/);
 const saved=JSON.parse(data.segev_boq_work_v1);assert.equal(saved.projects[0].boq[0].d,'בטון');
 assert.deepEqual(logs,[]);console.log('UI flow passed: login -> empty -> project -> BOQ -> saved -> AI answer');dom.window.close();
})().catch(e=>{console.error('UI check failed',e,logs);process.exit(1)});
