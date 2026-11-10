/* Tema único: escuro. O botão de alternar foi removido. */
(function(){
  var root=document.documentElement;
  root.setAttribute("data-tema","escuro");
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#111820");
  function tirar(){document.querySelectorAll("[data-tema-btn]").forEach(function(b){b.remove()});}
  document.addEventListener("DOMContentLoaded",tirar); tirar();
})();
