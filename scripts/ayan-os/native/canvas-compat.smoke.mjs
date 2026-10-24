#!/usr/bin/env node
/** Acceptance for original Canvas UI compatibility on port 18081.
 * Read-only, no authentication or paid model calls.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const native="http://127.0.0.1:18081";
const old="http://127.0.0.1:18080";
const get=async url=>{
 const res=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(12000)});
 const body=await res.arrayBuffer();
 return {status:res.status,headers:res.headers,body:Buffer.from(body)};
};
const landing=await get(native+"/");
assert.equal(landing.status,302);
assert.equal(landing.headers.get("location"),"/canvas/");
const [fromDocker,fromNative]=await Promise.all([
 get(old+"/canvas/"),get(native+"/canvas/")
]);
assert.equal(fromDocker.status,200);
assert.equal(fromNative.status,200);
const original=fromDocker.body.toString("utf8");
const forwarded=fromNative.body.toString("utf8");
assert.ok(original.includes("/canvas/assets/"));
assert.ok(original.includes("ayan-brand.js"));
assert.equal(createHash("sha256").update(fromDocker.body).digest("hex"),
 createHash("sha256").update(fromNative.body).digest("hex"),
 "Native entry serves byte-identical original Canvas HTML");
for(const route of ["/canvas/conversations",
 "/canvas/ayan-os/ayan-mark-static.webp","/canvas/ayan-os/ayan-brand.js"]){
 const res=await get(native+route);
 assert.equal(res.status,200,route);
 assert.ok(res.body.byteLength>50);
}
const script=(await get(native+"/canvas/ayan-os/ayan-brand.js")).body.toString("utf8");
assert.ok(script.includes("ayan-mark-static.webp"));
assert.ok(!script.includes("ayanBreath"));
const health=await(await fetch(native+"/api/health")).json();
assert.equal(health.version,"0.2.5");
assert.equal(health.mode,"windows-native");
assert.equal(health.canvasCompatibility.originalBackendRequiresDocker,true);
assert.equal((await get(native+"/native/")).status,200);
console.log(JSON.stringify({ok:true,version:health.version,
 originalCanvasHtmlMatch:true,staticLogo:true,windowsBridge:true,
 fullCanvasBackendStillUsesDocker:true},null,2));
