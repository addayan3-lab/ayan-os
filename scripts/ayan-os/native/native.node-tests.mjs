#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const port=18831;
const origin="http://127.0.0.1:"+port;
const child=spawn(process.execPath,[resolve(here,"server.mjs")],{
 cwd:here, env:{...process.env,AYAN_NATIVE_PORT:String(port)},
 windowsHide:true,stdio:["ignore","pipe","pipe"]
});
let started="";
child.stdout.on("data",buffer=>{started+=buffer.toString()});
child.stderr.on("data",buffer=>{started+=buffer.toString()});
async function ready(){
 const deadline=Date.now()+12000;
 while(Date.now()<deadline){
  if(child.exitCode!==null)throw Error("Child stopped "+started);
  try{const r=await fetch(origin+"/api/health");if(r.ok)return}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error("Server failed to bind: "+started);
}
test("Windows Native dashboard: loopback, assets, allowed operations and receipts",async t=>{
 try{
  await ready();
  const health=await(await fetch(origin+"/api/health")).json();
  assert.equal(health.status,"ready");
  assert.equal(health.mode,"windows-native");
  assert.equal(health.version,"0.2.5");
  assert.equal(health.dockerRequired,false);
  const landing=await fetch(origin+"/",{redirect:"manual"});
  assert.equal(landing.status,302);
  assert.equal(landing.headers.get("location"),"/canvas/");
  for(const path of ["/native/","/native.js","/native.css","/ayan-mark-static.webp"]){
   const res=await fetch(origin+path);
   assert.equal(res.status,200,path);
   assert.equal(res.headers.get("x-content-type-options"),"nosniff");
   assert.ok((await res.text()).length>100);
  }
  const page=await fetch(origin+"/native/jobs/");
  assert.equal(page.status,200);
  assert.match(await page.text(),/任务中心/);
  const jobList=await(await fetch(origin+"/api/ayan/jobs")).json();
  assert.ok(Array.isArray(jobList.jobs));
  const blockedJob=await fetch(origin+"/api/ayan/jobs",{
    method:"POST",headers:{"content-type":"application/json","X-AYAN-Local":"1"},
    body:JSON.stringify({kind:"run-video"})
  });
  assert.equal(blockedJob.status,403);
  const unauthJob=await fetch(origin+"/api/ayan/jobs",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({kind:"h3-readonly-audit"})
  });
  assert.equal(unauthJob.status,403);
  const cap=await(await fetch(origin+"/api/capabilities")).json();
  assert.equal(cap.capabilities.length,5);
  const denied=await fetch(origin+"/api/probe",{
   method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({adapter:"comfyui",operation:"check"})
  });
  assert.equal(denied.status,403,"CSRF header required");
  const foreign=await fetch(origin+"/api/probe",{
   method:"POST",headers:{"content-type":"application/json","X-AYAN-Local":"1",origin:"https://evil.example"},
   body:JSON.stringify({adapter:"comfyui",operation:"check"})
  });
  assert.equal(foreign.status,403);
  const forbidden=await fetch(origin+"/api/probe",{
   method:"POST",headers:{"content-type":"application/json","X-AYAN-Local":"1"},
   body:JSON.stringify({adapter:"comfyui",operation:"generate"})
  });
  assert.equal(forbidden.status,403,"Generation blocked in the HTTP host");
  const allowed=await fetch(origin+"/api/probe",{
   method:"POST",headers:{"content-type":"application/json","X-AYAN-Local":"1"},
   body:JSON.stringify({adapter:"comfyui",operation:"queue-counts"})
  });
  assert.equal(allowed.status,200);
  const body=await allowed.json();
  assert.equal(body.ok,true);
  assert.equal(body.value.policy.gpu,false);
  assert.equal(body.value.policy.inference,false);
  assert.equal(body.value.state,"succeeded");
  const receipt=await(await fetch(origin+"/api/receipt/"+body.value.id)).json();
  assert.equal(receipt.id,body.value.id);
  const overview=await(await fetch(origin+"/api/overview")).json();
  assert.ok(overview.receipts.some(x=>x.id===body.value.id));
 }finally{
  child.kill();
  await new Promise(resolve=>{
   if(child.exitCode!==null)resolve();
   else{child.once("exit",resolve);setTimeout(resolve,1500)}
  });
 }
});
