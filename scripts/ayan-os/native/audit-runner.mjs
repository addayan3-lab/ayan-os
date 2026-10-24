/**
 * AYAN OS G07 — explicitly allowlisted multi-agent read-only workflow audit.
 * Does not accept user paths, commands, prompts, model requests, or write to film assets.
 */
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readdir, lstat, realpath, readFile, writeFile, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Bridge } from "../bridge/bridge.mjs";

export const DEFAULT_WORKFLOW_DIR = "C:\\AI\\ComfyUI-aki-h3\\ComfyUI\\user\\default\\workflows";
export const DEFAULT_JOB_ROOT = "C:\\AI\\ayan-os-runtime\\windows-native\\jobs";
const uuid = x => typeof x==="string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x);
function errorCode(error) {
  if (["ENOENT","EACCES","EPERM"].includes(error?.code)) return error.code;
  return "AUDIT_STAGE_FAILED";
}
const stamp=()=>new Date().toISOString();
const compactReceipt = r => ({
  id:r.id, adapter:r.adapter, operation:r.operation, state:r.state,
  errorCode:r.error?.code||null,
  data:r.state==="succeeded"?projectData(r):undefined
});
function projectData(r) {
  if(r.adapter==="codex")return {initialized:r.data?.initialized===true};
  if(r.adapter==="opencode"||r.adapter==="deepseek")
    return {acpInitialized:r.data?.acp?.initialized===true,version:r.data?.version};
  if(r.adapter==="comfyui")return {online:r.data?.online===true,
    version:r.data?.version,runningJobs:r.data?.runningJobs,pendingJobs:r.data?.pendingJobs};
  if(r.adapter==="zzdh")return {ok:r.data?.handoff?.ok===true,
    seconds:r.data?.handoff?.totalSeconds,shots:r.data?.handoff?.shotCount,
    hostExecutionVerified:false};
  return {};
}
function safeHandoff() {
  return {schemaVersion:1,taskId:"ayan-native-g07-offline-60s",
    shots:Array.from({length:6},(_,i)=>({
      id:"audit-"+String(i+1).padStart(2,"0"),
      duration:10,prompt:"Offline structured handoff validation only. No generation."}))};
}
export async function inspectWorkflows(directory) {
  const root=resolve(directory);
  const real=await realpath(root);
  if(root.toLowerCase()!==real.toLowerCase()) throw new Error("Workflow directory is a link");
  const entries=(await readdir(root,{withFileTypes:true}))
    .filter(e=>e.name.toLowerCase().endsWith(".json"))
    .sort((a,b)=>a.name.localeCompare(b.name,"zh-CN"));
  if(entries.length>80)throw new Error("Too many workflow files");
  const files=[];
  for(const entry of entries) {
    const path=join(root,entry.name);
    const stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000) {
      files.push({name:entry.name,valid:false,reason:"UNSUPPORTED_FILE"});continue;
    }
    try {
      const bytes=await readFile(path);
      const value=JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/,""));
      let nodes=[],format="";
      if(Array.isArray(value.nodes)) {
        nodes=value.nodes;format="ui-workflow";
      }else if(value && typeof value==="object"&&!Array.isArray(value)) {
        nodes=Object.values(value).filter(n=>n&&typeof n.class_type==="string");
        format="api-workflow";
      }
      if(!nodes.length)throw new Error("No workflow nodes");
      files.push({name:entry.name,valid:true,format,nodes:nodes.length,
        sha256:createHash("sha256").update(bytes).digest("hex")});
    }catch{
      files.push({name:entry.name,valid:false,reason:"INVALID_WORKFLOW_JSON"});
    }
  }
  return {total:files.length,valid:files.filter(f=>f.valid).length,files};
}
async function persist(root,job) {
  const directory=join(root,job.id);
  const tmp=join(directory,"receipt.pending.json");
  await writeFile(tmp,JSON.stringify(job,null,2)+"\n");
  await rename(tmp,join(directory,"receipt.json"));
}
export class AuditRunner {
  constructor({root=DEFAULT_JOB_ROOT,workflows=DEFAULT_WORKFLOW_DIR,bridge=new Bridge()}={}){
    this.root=resolve(root);this.workflows=resolve(workflows);
    this.bridge=bridge;this.jobs=new Map();this.active=null;
  }
  async init(){
    await mkdir(this.root,{recursive:true});
    const entries=(await readdir(this.root,{withFileTypes:true}))
      .filter(e=>e.isDirectory()&&uuid(e.name)).slice(-200);
    for(const entry of entries) {
      try{
        const j=JSON.parse(await readFile(join(this.root,entry.name,"receipt.json"),"utf8"));
        if(j.id!==entry.name||j.kind!=="h3-readonly-audit"||!Array.isArray(j.stages))continue;
        if(j.state==="queued"||j.state==="running"){
          j.state="interrupted";j.finishedAt=stamp();j.errorCode="RECOVERED_INTERRUPTION";
          for(const stage of j.stages)if(stage.state==="running")stage.state="interrupted";
          await persist(this.root,j);
        }
        this.jobs.set(j.id,j);
      }catch{/* Ignore bad receipts; never use them as executable tasks. */}
    }
  }
  list(){return [...this.jobs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
    .slice(0,20).map(j=>({id:j.id,kind:j.kind,state:j.state,createdAt:j.createdAt,
      finishedAt:j.finishedAt,stages:j.stages.map(s=>({name:s.name,state:s.state})),errorCode:j.errorCode||null}));}
  get(id){const j=uuid(id)&&this.jobs.get(id);return j?structuredClone(j):null;}
  async submit(kind){
    if(kind!=="h3-readonly-audit")return {error:"POLICY_DENIED"};
    if(this.active)return {job:this.get(this.active),deduplicated:true};
    const j={schema:"ayan-audit-receipt/v1",id:randomUUID(),kind,state:"queued",
      createdAt:stamp(),startedAt:null,finishedAt:null,
      policy:{inference:false,paidApi:false,gpu:false,productionAssetWrites:false},
      stages:[],errorCode:null};
    await mkdir(join(this.root,j.id));
    this.jobs.set(j.id,j);this.active=j.id;
    try{await persist(this.root,j)}catch(err){this.jobs.delete(j.id);this.active=null;throw err}
    queueMicrotask(()=>{void this.run(j)});
    return {job:this.get(j.id),deduplicated:false};
  }
  async run(j){
    j.state="running";j.startedAt=stamp();
    try{
      await persist(this.root,j);
      const stage=async(name,callback)=>{
        const s={name,state:"running",startedAt:stamp(),finishedAt:null};
        j.stages.push(s);await persist(this.root,j);
        try{s.data=await callback();s.state="succeeded";}
        catch(e){s.state="failed";s.errorCode=errorCode(e)}
        s.finishedAt=stamp();await persist(this.root,j);
      };
      for(const adapter of ["codex","opencode","deepseek","comfyui"]) {
        await stage(adapter+" 只读连接检查",async()=>{
          const r=await this.bridge.task({adapter,operation:adapter==="codex"?"protocol-check":"check"});
          if(r.state!=="succeeded")throw new Error("BRIDGE_CHECK_FAILED");
          return compactReceipt(r);
        });
      }
      await stage("字字动画交接格式校验",async()=>{
        const r=await this.bridge.task({adapter:"zzdh",operation:"handoff-check",handoff:safeHandoff()});
        if(r.state!=="succeeded")throw new Error("HANDOFF_VALIDATION_FAILED");
        return compactReceipt(r);
      });
      await stage("H3 本机工作流盘点",()=>inspectWorkflows(this.workflows));
      await stage("可验收报告",async()=>{
        const lines=["# 阿岩 OS · H3 工作流只读审核","",
          "- 任务编号："+j.id,"- 执行时间："+stamp(),
          "- 无模型推理、无 GPU 生成、无付费接口、无正式素材写入。",
          "- 字字动画仅做交接格式校验，不代表已通过软件内部插件验收。","",
          "## 任务步骤"];
        // The report stage itself is still running while this text is written.
        // Do not mislabel report generation as a failed validation.
        for(const s of j.stages.filter(x=>x.name!=="可验收报告"))
          lines.push("- "+s.name+"："+(s.state==="succeeded"?"通过":"未通过"+(s.errorCode?" ["+s.errorCode+"]":"")));
        const f=j.stages.find(s=>s.name==="H3 本机工作流盘点")?.data;
        lines.push("","## H3 工作流");
        if(f) {
          lines.push("- 文件数："+f.total+"；JSON 有效："+f.valid);
          for(const x of f.files)lines.push("- "+x.name+"："+(x.valid?x.nodes+" 节点，"+x.format:x.reason));
        }else lines.push("- 检查未完成");
        lines.push("","## 下一步","- 对已列出的工作流逐一进行节点兼容性检查，保持只读。");
        await writeFile(join(this.root,j.id,"report.md"),lines.join("\n")+"\n",{flag:"wx"});
        return {report:"report.md"};
      });
      j.state=j.stages.some(s=>s.state!=="succeeded")?"partial":"succeeded";
    }catch(e){j.state="failed";j.errorCode=errorCode(e)}
    finally {
      j.finishedAt=stamp();
      try{await persist(this.root,j)}finally{if(this.active===j.id)this.active=null}
    }
  }
  async report(id) {
    const j=this.get(id);
    if(!j?.stages.some(s=>s.data?.report==="report.md"))return null;
    return readFile(join(this.root,id,"report.md"),"utf8");
  }
}
