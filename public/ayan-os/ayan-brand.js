/* AYAN OS animated brand: display-only, no agent actions. */
(() => {
 "use strict";
 const base="/canvas/ayan-os/";
 const title="阿岩 OS · AYAN OS";
 function style() {
   if(document.getElementById("ayan-os-brand-style")) return;
   const css=document.createElement("style");
   css.id="ayan-os-brand-style";
   css.textContent=[
     "#ayan-os-brand{position:fixed;top:5px;left:8px;z-index:1000;width:170px;height:33px;display:flex;align-items:center;gap:8px;padding:2px 4px;box-sizing:border-box;background:#191919;border-radius:7px;pointer-events:none;user-select:none}",
     "#ayan-os-brand img{height:30px;width:30px;object-fit:contain;border-radius:7px}",
     "#ayan-os-brand .ayan-text{display:flex;flex-direction:column;align-items:flex-start;line-height:1.05;font-family:'Microsoft YaHei UI','Noto Sans CJK SC',system-ui,sans-serif}",
     "#ayan-os-brand .ayan-name{font-size:13px;font-weight:700;letter-spacing:.1em;color:#efcf9b}",
     "#ayan-os-brand .ayan-name-en{font-size:8px;letter-spacing:.22em;color:#aa9c87;margin-top:3px}",
     "@media (max-width:550px){#ayan-os-brand{width:40px;overflow:hidden}#ayan-os-brand .ayan-text{display:none}}"
   ].join("\n");
   document.head.appendChild(css);
 }
 function head() {
   if(document.title!==title) document.title=title;
   let ico=document.querySelector('link[rel="icon"]');
   if(!ico){ico=document.createElement("link");ico.rel="icon";document.head.appendChild(ico)}
   const path=base+"ayan-mark.svg";
   if(ico.getAttribute("href")!==path){ico.type="image/svg+xml";ico.href=path}
 }
 function badge(){
   if(document.getElementById("ayan-os-brand"))return;
   const el=document.createElement("div");
   el.id="ayan-os-brand";el.setAttribute("aria-label","阿岩 OS");
   const icon=document.createElement("img");icon.src=base+"ayan-mark.svg";icon.alt="";
   const words=document.createElement("span");words.className="ayan-text";
   const zh=document.createElement("span");zh.className="ayan-name";zh.textContent="阿岩 OS";
   const en=document.createElement("span");en.className="ayan-name-en";en.textContent="AYAN OS";
   words.append(zh,en);el.append(icon,words);document.body.appendChild(el);
 }
 function refresh(){style();if(document.body)badge();head()}
 function boot(){
   refresh();
   let scheduled=false;
   const update=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})};
   new MutationObserver(update).observe(document.documentElement,{childList:true,subtree:true});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();
