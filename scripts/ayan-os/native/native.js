"use strict";
const $=id=>document.getElementById(id);
const profiles={
 codex:{name:"Codex",icon:"◇",description:"Windows 官方 CLI 与 ChatGPT 登录状态；支持非推理协议检查。"},
 opencode:{name:"OpenCode",icon:"⌘",description:"检测 OpenCode CLI 和官方 ACP 握手能力。"},
 deepseek:{name:"DeepSeek Harness",icon:"⟡",description:"检测 DeepSeek Harness 桌面端与官方 ACP 连接。"},
 zzdh:{name:"字字动画",icon:"▧",description:"核对官方 Python 插件文档及隔离的分镜数据格式，不调用生成。"},
 comfyui:{name:"ComfyUI",icon:"⬡",description:"通过已验证的只读 MCP 检查服务状态与队列，不启动 GPU。"}
};
const messages={
 AUTH_REQUIRED:"需要在官方客户端登录",NOT_INSTALLED:"未找到工具安装路径",STATE_RUNTIME_UNAVAILABLE:"Codex 状态目录不可写",
 NETWORK_DENIED:"本地网络访问被拒绝",POLICY_DENIED:"安全策略拒绝",PROCESS_FAILED:"官方进程执行失败",
 PROTOCOL_ERROR:"协议握手不兼容",TIMEOUT:"检查超时",TOOL_FAILED:"只读工具执行失败",
 VALIDATION_FAILED:"格式校验失败"
};
const state={capabilities:[],latest:{},busy:false};
const elt=(tag,cls,txt)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(txt!==undefined)element.textContent=txt;
 return element;
};
const details=(adapter,operation)=>adapter+" · "+operation;
const stamp=value=>{
 if(!value)return "—";
 try{return new Date(value).toLocaleString("zh-CN",{hour12:false})}catch{return value}
};
function notify(message){
 const e=$("toast");e.textContent=message;e.classList.add("show");
 setTimeout(()=>e.classList.remove("show"),3300);
}
async function get(url){
 const res=await fetch(url,{cache:"no-store"});
 if(!res.ok)throw new Error("HTTP "+res.status);
 return res.json();
}
async function post(url,body){
 const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json","X-AYAN-Local":"1"},body:JSON.stringify(body)});
 const data=await res.json();
 if(!res.ok)throw new Error(data.error||"连接失败");
 return data.value;
}
function showReceipt(data){
 $("receipt-json").textContent=JSON.stringify(data,null,2);
 $("receipt-dialog").showModal();
}
function applyReceipt(receipt){
 if(!receipt)return;
 state.latest[receipt.adapter]=receipt;
 updateAgents();
}
function renderAgent(item){
 const profile=profiles[item.adapter]||{name:item.adapter,icon:"◈",description:"本地适配器"};
 const latest=state.latest[item.adapter];
 const card=elt("article","agent");
 const head=elt("div","agent-top");
 const logo=elt("span","agent-icon",profile.icon);
 const text=elt("div");
 text.append(elt("h3",null,profile.name),elt("span","meta",item.transport));
 head.append(logo,text);
 const desc=elt("p",null,profile.description);
 const footer=elt("div","agent-foot");
 const status=elt("span","state",latest?(latest.state==="succeeded"?"已验证":latest.state==="failed"?"检查未通过":"检查中"):"待检查");
 if(latest)status.classList.add(latest.state==="succeeded"?"ok":latest.state==="failed"?"fail":"busy");
 if(latest?.error)status.title=messages[latest.error.code]||latest.error.code;
 const buttons=elt("div");
 const btn=elt("button","ghost","检查");
 btn.disabled=state.busy;
 btn.addEventListener("click",()=>runOne(item.adapter,"check"));
 buttons.append(btn);
 if(item.adapter==="comfyui"){
  const queue=elt("button","ghost","看队列");
  queue.disabled=state.busy;
  queue.style.marginLeft="5px";
  queue.addEventListener("click",()=>runOne("comfyui","queue-counts"));
  buttons.append(queue);
 }
 footer.append(status,buttons);
 card.append(head,desc,footer);
 return card;
}
function updateAgents(){
 const grid=$("agent-grid");grid.replaceChildren(...state.capabilities.map(renderAgent));
 $("adapter-count").textContent=String(state.capabilities.length);
}
function setBusy(flag,message){
 state.busy=flag;
 $("refresh").disabled=flag;
 $("check-note").textContent=message||"可执行状态检查";
 updateAgents();
}
function setState(receipt){
 if(receipt)state.latest[receipt.adapter]=receipt;
}
async function runOne(adapter,operation){
 if(state.busy)return;
 setBusy(true,"正在检查 "+(profiles[adapter]?.name||adapter)+"…");
 try{
  const receipt=await post("/api/probe",{adapter,operation});
  applyReceipt(receipt);
  notify(receipt.state==="succeeded"?"连接检查通过":(messages[receipt.error?.code]||"检查未通过"));
  await loadOverview();
 }catch(e){notify(e.message)}
 finally{setBusy(false)}
}
async function runAll(){
 if(state.busy)return;
 setBusy(true,"正在按顺序核对 CLI、ACP、官方插件与 MCP…");
 try{
  const data=await post("/api/status",{});
  const checked=[...data.receipts,...data.protocolChecks];
  for(const receipt of checked)setState(receipt);
  updateAgents();
  $("passed-count").textContent=String(checked.filter(x=>x.state==="succeeded").length)+"/"+String(checked.length);
  $("checked-time").textContent=stamp(data.checkedAt);
  notify(data.allPassed?"全部连接检查通过":"连接检查已完成，部分适配器待处理");
  await loadOverview();
 }catch(e){notify(e.message)}
 finally{setBusy(false)}
}
async function loadOverview(){
 try{
  const data=await get("/api/overview");
  if(data.status){
    const checks=[...data.status.receipts,...data.status.protocolChecks];
    checks.forEach(setState);
    $("passed-count").textContent=String(checks.filter(x=>x.state==="succeeded").length)+"/"+checks.length;
    $("checked-time").textContent=stamp(data.checked);
    updateAgents();
  }
  renderReceipts(data.receipts||[]);
 }catch(e){notify("读取回执失败："+e.message)}
}
function renderReceipts(items){
 const list=$("receipts-body");
 if(!items.length){list.replaceChildren(elt("div","loading","暂时没有任务回执。点击“检查全部连接”开始验证。"));return}
 list.replaceChildren(...items.map(r=>{
  const row=elt("div","receipt-row");
  const name=elt("strong",null,details(profiles[r.adapter]?.name||r.adapter,r.operation));
  const id=elt("span",null,r.id.slice(0,8)+"…");
  const flag=elt("span","state "+(r.state==="succeeded"?"ok":r.state==="failed"?"fail":""),r.state==="succeeded"?"已完成":r.state==="failed"?"未通过":"执行中");
  flag.title=r.error?(messages[r.error.code]||r.error.code):"";
  const button=elt("button","ghost","查看回执");
  button.addEventListener("click",async()=>{
   try{showReceipt(await get("/api/receipt/"+encodeURIComponent(r.id)))}
   catch(e){notify(e.message)}
  });
  row.title=stamp(r.finishedAt||r.startedAt);
  row.append(name,id,flag,button);
  return row;
 }));
}
async function bootstrap(){
 $("refresh").addEventListener("click",runAll);
 $("reload-receipts").addEventListener("click",loadOverview);
 $("close-dialog").addEventListener("click",()=>$("receipt-dialog").close());
 $("copy-receipt").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText($("receipt-json").textContent);notify("回执 JSON 已复制")}
  catch{notify("请选中 JSON 手动复制")}
 });
 document.querySelectorAll("nav a").forEach(link=>link.addEventListener("click",()=>{
  document.querySelectorAll("nav a").forEach(x=>x.classList.toggle("active",x===link));
 }));
 const clock=()=>{$("clock").textContent=new Date().toLocaleTimeString("zh-CN",{hour12:false})};
 clock();setInterval(clock,1000);
 try{
  const health=await get("/api/health");
  if(health.mode!=="windows-native"||health.dockerRequired){throw Error("宿主模式校验失败")}
  document.querySelector(".mode-pill").textContent="Windows Native V"+health.version;
  $("footer-state").textContent="V"+health.version+" · 原生服务已连接 · 127.0.0.1:"+health.port;
  const data=await get("/api/capabilities");
  state.capabilities=data.capabilities;
  updateAgents();
  await loadOverview();
 }catch(e){
  $("footer-state").textContent="无法连接 Windows 原生服务";
  notify("服务连接失败："+e.message);
 }
}
bootstrap();
