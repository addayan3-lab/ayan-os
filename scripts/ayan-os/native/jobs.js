"use strict";
const $=id=>document.getElementById(id);
let selected=null;
let refreshing=false;
function el(tag,cls,text){
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(text!==undefined)x.textContent=text;return x;
}
function status(state){return ({
 queued:"排队中",running:"进行中",succeeded:"已完成",
 partial:"部分完成",failed:"未完成",interrupted:"异常中断"
})[state]||state}
function notice(message){$("feedback").textContent=message}
async function list(){
 if(refreshing)return;refreshing=true;
 try{
  const res=await fetch("/api/ayan/jobs",{cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const data=await res.json();
  $("job-count").textContent=String(data.jobs.length);
  $("active").textContent=data.active?"1":"0";
  $("create").disabled=Boolean(data.active);
  const cards=data.jobs.map(j=>{
   const card=el("article","agent");
   const title=el("h3",null,"H3 工作流只读体检");
   const time=el("span","meta",new Date(j.createdAt).toLocaleString("zh-CN"));
   const desc=el("p",null,j.id);
   const foot=el("div","agent-foot");
   const state=el("span","state "+(j.state==="succeeded"?"ok":j.state==="failed"?"fail":""),status(j.state));
   const btn=el("button","ghost","查看详情");
   btn.addEventListener("click",()=>select(j.id));
   foot.append(state,btn);
   const head=el("div","agent-top"),block=el("div");
   block.append(title,time);head.append(el("span","agent-icon","▤"),block);
   card.append(head,desc,foot);return card;
  });
  $("jobs").replaceChildren(...(cards.length?cards:[el("div","loading","还没有执行过任务。点击“下发体检任务”开始。")]));
  if(!selected&&data.jobs[0])selected=data.jobs[0].id;
  if(selected)await select(selected);
  $("footer-status").textContent=data.active?"任务执行中":"原生服务已连接";
 }catch(e){notice("任务列表读取失败："+e.message)}
 finally{refreshing=false}
}
async function select(id){
 selected=id;
 try{
  const res=await fetch("/api/ayan/jobs/"+encodeURIComponent(id),{cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const job=await res.json();
  const rows=job.stages.map((s,i)=>{
   const row=el("div","receipt-row");
   const name=el("strong",null,String(i+1)+". "+s.name);
   const result=el("span","state "+(s.state==="succeeded"?"ok":s.state==="failed"?"fail":""),status(s.state));
   const extra=el("span","meta",s.data?.id?"Bridge: "+s.data.id.slice(0,8):s.errorCode||"");
   row.append(name,extra,result);
   return row;
  });
  $("detail").replaceChildren(
   el("div","loading","任务 "+job.id+" · "+status(job.state)),
   ...(rows.length?rows:[el("div","loading","任务等待开始…")])
  );
  $("get-report").disabled=!job.stages.some(s=>s.data?.report==="report.md");
 }catch(e){notice("任务详情读取失败："+e.message)}
}
async function create(){
 $("create").disabled=true;notice("正在下发只读审核任务…");
 try{
  const res=await fetch("/api/ayan/jobs",{method:"POST",
   headers:{"content-type":"application/json","X-AYAN-Local":"1"},
   body:JSON.stringify({kind:"h3-readonly-audit"})});
  const data=await res.json();
  if(!res.ok)throw Error(data.error||"提交失败");
  selected=data.job.id;
  notice(data.deduplicated?"已有相同任务执行中，已关联其回执":"任务已创建，正在依次检查");
  await list();
 }catch(e){notice("任务下发失败："+e.message)}
 finally{$("create").disabled=false}
}
async function report(){
 if(!selected)return;
 try{
  const res=await fetch("/api/ayan/jobs/"+encodeURIComponent(selected)+"/report",{cache:"no-store"});
  if(!res.ok)throw Error("HTTP "+res.status);
  $("report-text").textContent=await res.text();
 }catch(e){notice("报告读取失败："+e.message)}
}
$("refresh").addEventListener("click",list);
$("create").addEventListener("click",create);
$("get-report").addEventListener("click",report);
list();
setInterval(list,3000);
