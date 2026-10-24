/**
 * Localhost-only compatibility layer for original Agent Canvas frontend.
 * Transitional: the original UI/backend still lives on 127.0.0.1:18080.
 * The Windows Native Bridge lives on 18081 and does not need Docker itself.
 * No tokens or responses are written to disk; no arbitrary proxy target.
 */
import http from "node:http";
const UPSTREAM="http://127.0.0.1:18080";
const HOP=new Set(["connection","proxy-connection","keep-alive","transfer-encoding","upgrade","te","trailer"]);
function headersForUpstream(req,websocket=false){
 const result={};
 for(const [name,value] of Object.entries(req.headers)){
  if(HOP.has(name) && !(websocket && name==="connection")) continue;
  if(name==="host")continue;
  if(name==="origin" && value==="http://127.0.0.1:18081"){result[name]=UPSTREAM;continue}
  if(name==="referer" && typeof value==="string"){
    result[name]=value.replace(/^http:\/\/127\.0\.0\.1:18081(?=\/|$)/,UPSTREAM);continue
  }
  result[name]=value;
 }
 result.host="127.0.0.1:18080";
 return result;
}
function responseHeaders(src){
 const obj={...src};
 if(typeof obj.location==="string"){
  obj.location=obj.location.replace(/^http:\/\/127\.0\.0\.1:18080(?=\/|$)/,
    "http://127.0.0.1:18081");
 }
 return obj;
}
export function proxyHttp(req,res){
 const target=http.request({
  hostname:"127.0.0.1",port:18080,path:req.url,
  method:req.method,headers:headersForUpstream(req)
 },upstream=>{
  res.writeHead(upstream.statusCode||502, responseHeaders(upstream.headers));
  upstream.pipe(res);
 });
 target.setTimeout(65000,()=>target.destroy(new Error("UPSTREAM_TIMEOUT")));
 target.on("error",()=>{
  if(!res.headersSent)res.writeHead(503,{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"});
  if(!res.writableEnded)res.end("Agent Canvas compatibility backend unavailable. Windows Bridge: /native/");
 });
 req.pipe(target);
}
export function proxyUpgrade(req,socket,head){
 const headers=headersForUpstream(req,true);
 headers.connection="Upgrade";
 headers.upgrade=req.headers.upgrade||"websocket";
 const upstream=http.request({
  hostname:"127.0.0.1",port:18080,path:req.url,
  method:"GET",headers
 });
 upstream.on("upgrade",(res,upstreamSocket,upstreamHead)=>{
  let h="HTTP/1.1 101 Switching Protocols\r\n";
  for(const [key,value] of Object.entries(res.headers)){
    if(value!==undefined)h+=key+": "+value+"\r\n";
  }
  socket.write(h+"\r\n");
  if(head?.length)upstreamSocket.write(head);
  if(upstreamHead?.length)socket.write(upstreamHead);
  upstreamSocket.pipe(socket);socket.pipe(upstreamSocket);
  upstreamSocket.on("error",()=>socket.destroy());
  socket.on("error",()=>upstreamSocket.destroy());
 });
 upstream.on("response",response=>{
  socket.end("HTTP/1.1 "+(response.statusCode||503)+" Upstream Error\r\nConnection: close\r\n\r\n");
  response.resume();
 });
 upstream.on("error",()=>socket.destroy());
 upstream.end();
}
