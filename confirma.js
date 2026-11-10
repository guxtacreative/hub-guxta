/* Cartão de confirmação: aparece no portal quando uma ação é enviada com sucesso.
   Uso: GlaraConfirma.mostrar({titulo, texto, passos:[...], atual:0, ms:9000}) */
(function(){
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]})}
  var ICONE='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>';
  var ICONE_ERRO='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>';
  function mostrar(o){
    o=o||{};
    var box=document.getElementById("confirma-box");
    if(!box){
      box=document.createElement("div");box.id="confirma-box";box.className="confirma-box";
      box.setAttribute("role","status");box.setAttribute("aria-live","polite");
      document.body.appendChild(box);
    }
    var ICO=o.tipo==='erro'?ICONE_ERRO:ICONE;
    var passos=(o.passos||[]).map(function(p,i){return '<li class="'+(i<=(o.atual||0)?"ok":"")+(i===(o.atual||0)?" atual":"")+'">'+esc(p)+'</li>'}).join("");
    box.innerHTML='<div class="pd-ok confirma-card'+(o.tipo==='erro'?' erro':'')+'">'+
      '<div class="pd-ok-ico" aria-hidden="true">'+ICO+'</div>'+
      '<div class="pd-ok-txt"><h2>'+esc(o.titulo||"Pronto!")+'</h2>'+
      (o.texto?'<p>'+esc(o.texto)+'</p>':'')+
      (passos?'<ol class="ped-passos">'+passos+'</ol>':'')+
      '<div class="actions"><button type="button" class="btn outline small" data-fechar>Fechar</button></div></div></div>';
    box.hidden=false;
    clearTimeout(box._t);box._t=setTimeout(function(){box.hidden=true},o.ms||9000);
    box.querySelector("[data-fechar]").onclick=function(){box.hidden=true};
  }
  window.GlaraConfirma={mostrar:mostrar};
})();
