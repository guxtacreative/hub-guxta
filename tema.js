/* Tema fixo: fundo escuro. O botão de alternar claro/escuro foi removido. */
(function(){
  var root=document.documentElement;
  root.setAttribute("data-tema","escuro");
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#07100B");
  function tirarBotoes(){document.querySelectorAll("[data-tema-btn]").forEach(function(b){b.remove()});}
  document.addEventListener("DOMContentLoaded",tirarBotoes);
  tirarBotoes();
})();
