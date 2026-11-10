/* Ajuste de cores do hub.
   - Todos veem as cores salvas (lidas do banco, tabela tema_cores).
   - Só o administrador vê o botão "Cores" (aparece apenas no painel) e só ele salva.
   Carregar no fim da página. */
(function(){
  var PADRAO={fundo:"#111820",cartao:"#1A2430",texto:"#F2F4F7",textoSec:"#9AA7B4",bordas:"#2A3644",campo:"#111820",botao:"#FF6B2C",textoBotao:"#FFFFFF",destaque:"#FF6B2C"};
  var ROTULOS=[["fundo","Fundo da página"],["cartao","Cartões e painéis"],["bordas","Bordas"],["campo","Campos de texto"],["texto","Texto principal"],["textoSec","Texto secundário"],["botao","Botões principais"],["textoBotao","Texto dos botões"],["destaque","Destaques (menu, abas, seleção)"]];
  var cfg=window.GLARA_CONFIG||{};
  var ATUAL=Object.assign({},PADRAO);

  function gerarCSS(c){
    return "html,body{background:"+c.fundo+"!important;color:"+c.texto+"!important}"+
    ".card,.box,.kpi,.caption,.tk-card,.pl-card,.ped-card,.lj-card,.pr-card,.tk-col,.arte-item{background:"+c.cartao+"!important;border-color:"+c.bordas+"!important}"+
    ".hero{border-color:"+c.bordas+"!important}"+
    ".btn.primary,.btn.yel,.btn.amarelo{background:"+c.botao+"!important;border-color:"+c.botao+"!important;color:"+c.textoBotao+"!important}"+
    ".btn.primary *,.btn.yel *,.btn.amarelo *{color:"+c.textoBotao+"!important}"+
    ".btn:not(.primary):not(.yel):not(.amarelo):not(.danger){border-color:"+c.bordas+"!important;color:"+c.texto+"!important}"+
    ".note,small,.muted,.kpi .k,.kpi .label,.kpi .d,.box .d{color:"+c.textoSec+"!important}"+
    "input,select,textarea{background:"+c.campo+"!important;color:"+c.texto+"!important;border-color:"+c.bordas+"!important}"+
    ".cli[aria-current=\"true\"],.tab[aria-selected=\"true\"],.tab.active,.chip.on,.chip[aria-pressed=\"true\"],.vis-seg button[aria-pressed=\"true\"],.seg button[aria-pressed=\"true\"]{background:"+c.destaque+"!important;color:"+c.textoBotao+"!important}"+
    "mark,.eyebrow,.kpi .v,.box .v{color:"+c.destaque+"!important}"+
    ".eyebrow::before{background:"+c.destaque+"!important}";
  }
  function aplicar(c){
    ATUAL=Object.assign({},PADRAO,c||{});
    var st=document.getElementById("cores-usuario");
    if(!st){st=document.createElement("style");st.id="cores-usuario";document.head.appendChild(st)}
    st.textContent=gerarCSS(ATUAL);
  }
  // lê as cores salvas no banco (qualquer pessoa pode ler)
  function carregarGlobal(){
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey) return Promise.resolve();
    var url=String(cfg.supabaseUrl).trim()+"/rest/v1/tema_cores?id=eq.1&select=cores";
    return fetch(url,{headers:{apikey:cfg.supabaseAnonKey,Authorization:"Bearer "+cfg.supabaseAnonKey}})
      .then(function(r){return r.ok?r.json():[]})
      .then(function(d){if(d&&d[0]&&d[0].cores&&Object.keys(d[0].cores).length)aplicar(d[0].cores);else aplicar({})})
      .catch(function(){aplicar({})});
  }

  // ----- painel: só existe no painel do administrador -----
  function montarPainel(sb){
    var btn=document.createElement("button");
    btn.type="button";btn.id="cores-abrir";btn.textContent="Cores";
    btn.style.cssText="position:fixed;right:16px;bottom:16px;z-index:9998;border:1px solid #2A3644;background:#1A2430;color:#F2F4F7;border-radius:999px;padding:10px 16px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)";
    var box=document.createElement("div");
    box.id="cores-painel";box.hidden=true;
    box.style.cssText="position:fixed;right:16px;bottom:64px;z-index:9999;width:min(340px,calc(100vw - 32px));max-height:72vh;overflow:auto;background:#1A2430;color:#F2F4F7;border:1px solid #2A3644;border-radius:16px;padding:16px;font:14px Inter,system-ui,sans-serif;box-shadow:0 18px 40px rgba(0,0,0,.45)";
    var html='<strong style="display:block;margin-bottom:10px;font-size:15px">Cores do hub</strong>';
    ROTULOS.forEach(function(r){
      html+='<label style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0"><span>'+r[1]+'</span>'+
        '<input type="color" data-k="'+r[0]+'" value="'+ATUAL[r[0]]+'" style="width:44px;height:30px;border:0;background:none;padding:0;cursor:pointer"></label>';
    });
    html+='<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">'+
      '<button type="button" data-a="salvar" style="flex:1;border:0;background:#FF6B2C;color:#fff;border-radius:10px;padding:10px;font-weight:700;cursor:pointer">Salvar para todos</button>'+
      '<button type="button" data-a="padrao" style="flex:1;border:1px solid #2A3644;background:transparent;color:#F2F4F7;border-radius:10px;padding:10px;font-weight:600;cursor:pointer">Padrão</button>'+
      '<button type="button" data-a="fechar" style="border:0;background:transparent;color:#9AA7B4;padding:10px;cursor:pointer">Fechar</button></div>'+
      '<p data-msg style="margin:10px 0 0;font-size:12px;color:#9AA7B4">As cores aparecem para todos depois de salvar. Alertas em vermelho não mudam.</p>';
    box.innerHTML=html;
    document.body.appendChild(btn);document.body.appendChild(box);
    var msg=box.querySelector("[data-msg]");
    function coletar(){var c={};box.querySelectorAll("input[data-k]").forEach(function(i){c[i.getAttribute("data-k")]=i.value});return c}
    function gravar(c){
      return sb.from("tema_cores").upsert({id:1,cores:c,atualizado_em:new Date().toISOString()},{onConflict:"id"})
        .then(function(r){if(r.error)throw r.error;return true});
    }
    btn.addEventListener("click",function(){box.hidden=!box.hidden});
    box.addEventListener("input",function(e){var k=e.target.getAttribute("data-k");if(!k)return;var c=coletar();aplicar(c)});
    box.addEventListener("click",function(e){
      var a=e.target.getAttribute("data-a");if(!a)return;
      if(a==="fechar"){box.hidden=true;return}
      if(a==="padrao"){
        box.querySelectorAll("input[data-k]").forEach(function(i){i.value=PADRAO[i.getAttribute("data-k")]});
        aplicar({});
        gravar({}).then(function(){msg.textContent="Padrão restaurado para todos."}).catch(function(){msg.textContent="Não consegui salvar. Tente de novo."});
        return;
      }
      if(a==="salvar"){
        var c=coletar();
        msg.textContent="Salvando…";
        gravar(c).then(function(){msg.textContent="Salvo. Todos já veem as novas cores."}).catch(function(err){msg.textContent="Não consegui salvar: "+(err.message||"erro")});
      }
    });
  }

  window.AjusteCores={aplicar:aplicar,padrao:PADRAO,carregarGlobal:carregarGlobal,montarPainel:montarPainel};
  // 1) todos: aplica as cores salvas
  carregarGlobal();
  // 2) só o administrador (página do painel expõe o cliente logado em window.__sbAdmin): mostra o botão
  document.addEventListener("DOMContentLoaded",function(){
    if(window.__sbAdmin) montarPainel(window.__sbAdmin);
  });
})();
