import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { AuditRunner, inspectWorkflows } from "./audit-runner.mjs";

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),"ayan-jobs-test-"));
 const workflows=join(root,"workflows");await mkdir(workflows);
 await writeFile(join(workflows,"h3.json"),JSON.stringify({nodes:[{type:"LoadImage"},{type:"SaveImage"}]}));
 const calls=[];
 const bridge={async task({adapter,operation,handoff}){
  calls.push({adapter,operation,handoff});
  return {id:randomUUID(),adapter,operation,state:"succeeded",data:
   adapter==="zzdh"?{handoff:{ok:true,totalSeconds:60,shotCount:6}}:
   adapter==="comfyui"?{online:true,version:"1.0.0"}:
   adapter==="codex"?{initialized:true}:{acp:{initialized:true},version:"1.2.3"}};
 }};
 const runner=new AuditRunner({root:join(root,"jobs"),workflows,bridge});
 await runner.init();
 return {root,workflows,calls,runner};
}
async function completed(runner,id){
 for(let i=0;i<130;i++){
  const j=runner.get(id);
  if(["succeeded","partial","failed"].includes(j.state))return j;
  await new Promise(resolve=>setTimeout(resolve,40));
 }
 throw Error("Timed out");
}
test("read-only workflow inventory collects nodes and hashes, not prompt text",async()=>{
 const f=await fixture();const v=await inspectWorkflows(f.workflows);
 assert.equal(v.total,1);assert.equal(v.valid,1);assert.equal(v.files[0].nodes,2);
 assert.match(v.files[0].sha256,/^[a-f0-9]{64}$/);
});
test("task allowlist refuses arbitrary kinds with zero bridge calls",async()=>{
 const f=await fixture();
 assert.equal((await f.runner.submit("run-prompt")).error,"POLICY_DENIED");
 assert.equal(f.calls.length,0);
});
test("single audit fans out through five adapters and creates durable report",async()=>{
 const f=await fixture();const req=await f.runner.submit("h3-readonly-audit");
 assert.equal(req.deduplicated,false);
 const j=await completed(f.runner,req.job.id);
 assert.equal(j.state,"succeeded");assert.equal(j.stages.length,7);
 assert.deepEqual(f.calls.map(x=>x.adapter),["codex","opencode","deepseek","comfyui","zzdh"]);
 assert.equal(f.calls.at(-1).handoff.shots.reduce((v,x)=>v+x.duration,0),60);
 assert.equal(j.policy.gpu,false);assert.equal(j.policy.inference,false);
 const report=await f.runner.report(j.id);assert.match(report,/H3/);
 assert.ok(report.includes("h3.json"));
 assert.ok(!report.includes("未通过"),"Successful report must not mark itself failed");
 assert.equal(JSON.parse(await readFile(join(f.runner.root,j.id,"receipt.json"),"utf8")).state,"succeeded");
});
test("concurrent submission deduplicates an active job",async()=>{
 const f=await fixture();let release;
 const gate=new Promise(resolve=>release=resolve);
 const original=f.runner.bridge.task;
 f.runner.bridge.task=async input=>{await gate;return original(input)};
 const a=await f.runner.submit("h3-readonly-audit");
 const b=await f.runner.submit("h3-readonly-audit");
 assert.equal(b.deduplicated,true);assert.equal(a.job.id,b.job.id);
 release();assert.equal((await completed(f.runner,a.job.id)).state,"succeeded");
});
test("partial audit leaves inspectable per-stage failures and no generation",async()=>{
 const f=await fixture();const original=f.runner.bridge.task;
 f.runner.bridge.task=async input=>input.adapter==="deepseek"?
 {id:randomUUID(),adapter:"deepseek",operation:"check",state:"failed",error:{code:"NOT_INSTALLED"}}:
 original(input);
 const a=await f.runner.submit("h3-readonly-audit");
 const j=await completed(f.runner,a.job.id);
 assert.equal(j.state,"partial");
 assert.ok(j.stages.some(s=>s.state==="failed"));
 assert.equal(j.stages.at(-1).state,"succeeded");
 assert.match(await f.runner.report(j.id),/未通过/);
});
test("restart marks in-flight jobs interrupted without repeating adapter actions",async()=>{
 const f=await fixture();const id=randomUUID();
 const dir=join(f.runner.root,id);await mkdir(dir);
 await writeFile(join(dir,"receipt.json"),JSON.stringify({
  id,kind:"h3-readonly-audit",createdAt:new Date().toISOString(),state:"running",
  stages:[{name:"previous",state:"running"}]}));
 const restored=new AuditRunner({root:f.runner.root,workflows:f.workflows,bridge:f.runner.bridge});
 await restored.init();
 assert.equal(restored.get(id).state,"interrupted");
 assert.equal(restored.get(id).stages[0].state,"interrupted");
 assert.equal(f.calls.length,0);
});
