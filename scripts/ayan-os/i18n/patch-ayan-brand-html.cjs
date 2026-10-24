// Adds the AYAN brand overlay in the preverified Agent Canvas static HTML.
// Safe to repeat; retains original static HTML under a separate backup.
const fs=require("node:fs");
const file="/opt/agent-canvas/frontend/index.html";
const backup=file+".ayan-before-logo-branding";
const tag='<script defer src="/canvas/ayan-os/ayan-brand.js"></script>';
const needed=[
 "/opt/agent-canvas/frontend/ayan-os/ayan-brand.js",
 "/opt/agent-canvas/frontend/ayan-os/ayan-mark.svg",
 "/opt/agent-canvas/frontend/ayan-os/ayan-icon.png"
];
if(!fs.existsSync(file)||needed.some(x=>!fs.existsSync(x))){
 console.error("AYAN_LOGO_MISSING_INPUTS");process.exit(2);
}
const html=fs.readFileSync(file,"utf8");
if(html.includes(tag)){console.log("AYAN_LOGO_ALREADY_LINKED");process.exit(0);}
if(!html.includes("</body>")){console.error("AYAN_LOGO_UNEXPECTED_HTML");process.exit(3);}
if(!fs.existsSync(backup))fs.copyFileSync(file,backup);
fs.writeFileSync(file,html.replace("</body>",tag+"\n</body>"),"utf8");
console.log("AYAN_LOGO_WEB_LINKED");
