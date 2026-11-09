/* Botão de contraste: escuro (padrão) ou claro. A escolha fica salva neste navegador. */
(function(){
  var KEY="guxta_tema",root=document.documentElement;
  function ler(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function salvar(v){try{localStorage.setItem(KEY,v)}catch(e){}}
  function aplicar(t){
    if(t==="claro")root.removeAttribute("data-tema");else root.setAttribute("data-tema","escuro");
    var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="claro"?"#F2F6F3":"#07100B");
    document.querySelectorAll("[data-tema-btn]").forEach(function(b){
      var esc=t!=="claro";b.setAttribute("aria-pressed",String(esc));
      b.setAttribute("aria-label",esc?"Mudar para fundo claro":"Mudar para fundo escuro");
      var tx=b.querySelector(".tema-txt");if(tx)tx.textContent=esc?"Fundo claro":"Fundo escuro";});
  }
  aplicar(ler()==="claro"?"claro":"escuro");
  var ICONES='<svg class="ic-lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="ic-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  document.addEventListener("DOMContentLoaded",function(){
    document.querySelectorAll("[data-tema-btn]").forEach(function(b){
      b.innerHTML=ICONES;b.addEventListener("click",function(){
        var novo=root.getAttribute("data-tema")==="escuro"?"claro":"escuro";salvar(novo);aplicar(novo);});
    });
    aplicar(root.getAttribute("data-tema")==="escuro"?"escuro":"claro");
  });
})();
