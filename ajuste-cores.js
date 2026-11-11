/* Editor visual de cores do hub (todas as páginas, inclusive a loja).
   - Todos: aplicam as cores salvas (paleta + regras por elemento).
   - Administrador: vê o botão "Editar cores", clica em um elemento e escolhe a cor.
   Requer config.js (window.GLARA_CONFIG) e as tabelas tema_cores e tema_regras. */
(function(){
  var cfg=window.GLARA_CONFIG||{};
  var URL_=String(cfg.supabaseUrl||"").trim(), KEY_=String(cfg.supabaseAnonKey||"").trim();
  var V4={fundo:"#0A0A0A",cartao:"#141414",texto:"#FFFFFF",textoSec:"#A3A3A3",bordas:"#262626",campo:"#141414",botao:"#1877F2",textoBotao:"#FFFFFF",destaque:"#1877F2"};
  var PAGINA=location.host+location.pathname;
  var sb=null, regrasLocais=[];

  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]})}
  function gerarPaleta(c){
    return "html,body{background:"+c.fundo+"!important;color:"+c.texto+"!important}"+
    ".card,.box,.kpi,.caption,.tk-card,.pl-card,.ped-card,.lj-card,.pr-card,.tk-col,.arte-item{background:"+c.cartao+"!important;border-color:"+c.bordas+"!important}"+
    ".btn.primary,.btn.yel,.btn.amarelo{background:"+c.botao+"!important;border-color:"+c.botao+"!important;color:"+c.textoBotao+"!important}"+
    ".btn.primary *,.btn.yel *,.btn.amarelo *{color:"+c.textoBotao+"!important}"+
    ".note,small,.muted{color:"+c.textoSec+"!important}"+
    "input,select,textarea{background:"+c.campo+"!important;color:"+c.texto+"!important;border-color:"+c.bordas+"!important}"+
    ".cli[aria-current=\"true\"],.tab[aria-selected=\"true\"],.tab.active,.chip.on,.chip[aria-pressed=\"true\"],.vis-seg button[aria-pressed=\"true\"],.seg button[aria-pressed=\"true\"]{background:"+c.destaque+"!important;color:"+c.textoBotao+"!important}"+
    "mark,.eyebrow,.kpi .v,.box .v{color:"+c.destaque+"!important}";
  }
  function escreverCSS(css){
    var st=document.getElementById("cores-usuario");
    if(!st){st=document.createElement("style");st.id="cores-usuario";document.head.appendChild(st)}
    st.textContent=css;
  }
  function cssRegras(regras){
    var m={};
    regras.forEach(function(r){(m[r.seletor]=m[r.seletor]||[]).push(r.propriedade+":"+r.valor+"!important")});
    return Object.keys(m).map(function(s){return s+"{"+m[s].join(";")+"}"}).join("");
  }
  function garantirSupabase(){
    return new Promise(function(ok){
      if(window.supabase){ok();return}
      var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
      s.onload=ok;s.onerror=ok;document.head.appendChild(s);
    });
  }
  function clienteSb(){
    if(window.__sbAdmin) return window.__sbAdmin;
    if(!window.supabase||!URL_||!KEY_) return null;
    if(!sb) sb=window.supabase.createClient(URL_,KEY_,{auth:{persistSession:true,storageKey:"guxta-editor",autoRefreshToken:true,detectSessionInUrl:false}});
    return sb;
  }
  function carregarTudo(){
    if(!URL_||!KEY_) return Promise.resolve();
    var h={apikey:KEY_,Authorization:"Bearer "+KEY_};
    var p1=fetch(URL_+"/rest/v1/tema_cores?id=eq.1&select=cores",{headers:h}).then(function(r){return r.ok?r.json():[]}).catch(function(){return []});
    var p2=fetch(URL_+"/rest/v1/tema_regras?or=(pagina.eq.todas,pagina.eq."+encodeURIComponent(PAGINA)+")&select=seletor,propriedade,valor",{headers:h}).then(function(r){return r.ok?r.json():[]}).catch(function(){return []});
    return Promise.all([p1,p2]).then(function(res){
      var cores=(res[0]&&res[0][0]&&res[0][0].cores)||{};
      var pal=Object.assign({},V4,cores);
      regrasLocais=res[1]||[];
      escreverCSS(gerarPaleta(pal)+cssRegras(regrasLocais));
    });
  }

  /* ---------- modo de edição (só administrador) ---------- */
  function seletorDe(el){
    var partes=[];
    while(el&&el.nodeType===1&&el!==document.body&&el!==document.documentElement){
      var p=el.tagName.toLowerCase();
      if(el.id&&!/^\d/.test(el.id)){partes.unshift(p+"#"+el.id);break}
      var cls=(el.className&&typeof el.className==="string")?el.className.trim().split(/\s+/).filter(function(c){return c&&!/^(is|has|ce-)/.test(c)}).slice(0,2):[];
      if(cls.length) p+="."+cls.join(".");
      var pai=el.parentElement; if(pai){var irmaos=Array.prototype.filter.call(pai.children,function(c){return c.tagName===el.tagName});if(irmaos.length>1)p+=":nth-of-type("+(irmaos.indexOf(el)+1)+")"}
      partes.unshift(p); el=el.parentElement;
    }
    return partes.join(" > ");
  }
  function botaoLogin(){
    var b=document.createElement("button");
    b.id="ce-abrir";b.type="button";b.textContent="Editar cores";
    b.style.cssText="position:fixed;right:16px;bottom:16px;z-index:2147483646;border:1px solid #2A2A2A;background:#141414;color:#fff;border-radius:999px;padding:10px 16px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)";
    b.addEventListener("click",function(){pedirLogin()});
    document.body.appendChild(b);
  }
  function montarEditor(){
    var painelEd=null, alvo=null, hover=null;
    var btn=document.createElement("button");
    btn.id="ce-abrir"; btn.type="button"; btn.textContent="Editar cores";
    btn.style.cssText="position:fixed;right:16px;bottom:16px;z-index:2147483646;border:1px solid #2A2A2A;background:#141414;color:#fff;border-radius:999px;padding:10px 16px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)";
    document.body.appendChild(btn);
    var ativo=false;
    function marcar(el){if(hover&&hover!==el)hover.style.outline="";if(el){el.style.outline="2px dashed #1877F2";el.style.outlineOffset="2px"}hover=el}
    function ignorar(el){return !el||el.closest("[id^='ce-']")||el===document.body||el===document.documentElement}
    function mover(e){if(!ativo)return;var el=document.elementFromPoint(e.clientX,e.clientY);if(ignorar(el)){marcar(null);return}marcar(el)}
    function clicar(e){
      if(!ativo)return;
      var el=document.elementFromPoint(e.clientX,e.clientY); if(ignorar(el))return;
      e.preventDefault();e.stopPropagation();
      abrirPainel(el);
    }
    function abrirPainel(el){
      alvo=el;
      if(!painelEd){
        painelEd=document.createElement("div");painelEd.id="ce-painel";
        painelEd.style.cssText="position:fixed;right:16px;bottom:64px;z-index:2147483647;width:min(340px,calc(100vw - 32px));background:#141414;color:#fff;border:1px solid #2A2A2A;border-radius:14px;padding:16px;font:14px Inter,system-ui,sans-serif;box-shadow:0 18px 40px rgba(0,0,0,.5)";
        document.body.appendChild(painelEd);
      }
      var cs=getComputedStyle(el);
      painelEd.innerHTML='<strong id="ce-t" style="display:block;margin-bottom:10px">Elemento selecionado</strong>'+
        '<div style="font-size:12px;color:#A3A3A3;margin-bottom:10px;word-break:break-all">'+esc(el.tagName.toLowerCase())+(el.className&&typeof el.className==="string"?"."+esc(el.className.trim().split(/\s+/).slice(0,2).join(".")):"")+'</div>'+
        linha("Cor do texto","color",cor(cs.color))+linha("Cor do fundo","background-color",cor(cs.backgroundColor))+linha("Cor da borda","border-color",cor(cs.borderTopColor))+
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" data-a="salvar" style="flex:1;border:0;background:#1877F2;color:#fff;border-radius:10px;padding:10px;font-weight:700;cursor:pointer">Salvar para todos</button>'+
        '<button type="button" data-a="limpar" style="flex:1;border:1px solid #2A2A2A;background:transparent;color:#fff;border-radius:10px;padding:10px;cursor:pointer">Limpar</button></div>'+
        '<button type="button" data-a="v4" style="width:100%;margin-top:8px;border:0;background:transparent;color:#A3A3A3;padding:8px;cursor:pointer;font-size:12px">Voltar tudo ao padrão V4</button>'+
        '<p data-m style="margin:10px 0 0;font-size:12px;color:#A3A3A3"></p>';
      painelEd.querySelectorAll("input[data-p],input[data-t]").forEach(function(i){i.addEventListener("input",function(){
        var prop=i.getAttribute("data-p")||i.getAttribute("data-t");
        var tv=painelEd.querySelector('[data-tv="'+prop+'"]'); var t=painelEd.querySelector('input[data-t="'+prop+'"]');
        if(tv) tv.textContent=t.value+"%";
        el.style.setProperty(prop,valorDe(prop),"important");
      })});
      painelEd.onclick=function(ev){var a=ev.target.getAttribute("data-a");if(!a)return;ev.stopPropagation();acao(a)};
    }
    function cor(v){
      var m=String(v).match(/\d+/g); if(!m) return "#000000";
      return "#"+m.slice(0,3).map(function(n){return ("0"+parseInt(n,10).toString(16)).slice(-2)}).join("");
    }
    function linha(rot,prop,val){return '<label style="display:flex;justify-content:space-between;align-items:center;margin:8px 0;gap:8px"><span style="min-width:90px">'+rot+'</span><span style="display:flex;align-items:center;gap:8px"><input type="color" data-p="'+prop+'" value="'+val+'" style="width:40px;height:30px;border:0;background:none;cursor:pointer"><input type="range" min="0" max="100" value="100" data-t="'+prop+'" title="Transparência: 0 = invisível, 100 = sólido" style="width:90px;accent-color:#1877F2;cursor:pointer"><span data-tv="'+prop+'" style="font-size:12px;color:#A3A3A3;width:34px">100%</span></span></label>'}
    function hexRgba(hex,pct){
      var h=String(hex||"#000000").replace("#","");
      if(h.length===3) h=h.split("").map(function(c){return c+c}).join("");
      var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
      if(pct>=100) return "#"+h.toUpperCase();
      return "rgba("+r+","+g+","+b+","+(Math.max(0,pct)/100).toFixed(2)+")";
    }
    function valorDe(prop){
      var c=painelEd.querySelector('input[data-p="'+prop+'"]'), t=painelEd.querySelector('input[data-t="'+prop+'"]');
      return hexRgba(c.value, t?parseInt(t.value,10):100);
    }
    function msg(t){var m=painelEd&&painelEd.querySelector("[data-m]");if(m)m.textContent=t}
    async function acao(a){
      var c=clienteSb();
      if(a==="limpar"){alvo.removeAttribute("style");msg("Ajuste deste elemento removido (salve para valer para todos).");return}
      if(a==="v4"){
        msg("Voltando ao padrão V4…");
        var r=await c.from("tema_regras").delete().or("pagina.eq.todas,pagina.eq."+PAGINA);
        if(r.error){msg("Erro: "+r.error.message);return}
        await c.from("tema_cores").upsert({id:1,cores:{},atualizado_em:new Date().toISOString()},{onConflict:"id"});
        location.reload();return;
      }
      if(a==="salvar"){
        var seletor=seletorDe(alvo);
        var linhas=[];
        painelEd.querySelectorAll("input[data-p]").forEach(function(i){var p=i.getAttribute("data-p");linhas.push({pagina:PAGINA,seletor:seletor,propriedade:p,valor:valorDe(p)})});
        msg("Salvando…");
        // troca só as regras deste seletor nesta página
        await c.from("tema_regras").delete().eq("pagina",PAGINA).eq("seletor",seletor);
        var ins=await c.from("tema_regras").insert(linhas);
        if(ins.error){msg("Erro: "+ins.error.message);return}
        msg("Salvo. Todos já veem essa cor.");
        carregarTudo();
      }
    }
    function alternar(){
      ativo=!ativo;
      btn.textContent=ativo?"Sair da edição":"Editar cores";
      btn.style.background=ativo?"#1877F2":"#141414";
      if(!ativo){marcar(null);if(painelEd){painelEd.remove();painelEd=null}}
    }
    btn.addEventListener("click",alternar);
    document.addEventListener("mousemove",mover,true);
    document.addEventListener("click",clicar,true);
  }

  /* ---------- entrada do administrador (em qualquer página) ---------- */
  async function verificarAdmin(){
    var c=clienteSb(); if(!c) return false;
    var s=await c.auth.getSession();
    if(!s.data||!s.data.session) return false;
    var r=await c.rpc("is_admin");
    return !r.error && r.data===true;
  }
  function pedirLogin(){
    var c=clienteSb(); if(!c) return;
    var box=document.createElement("div");
    box.id="ce-login";
    box.style.cssText="position:fixed;right:16px;bottom:16px;z-index:2147483646;width:min(300px,calc(100vw - 32px));background:#141414;color:#fff;border:1px solid #2A2A2A;border-radius:14px;padding:14px;font:14px Inter,system-ui,sans-serif";
    box.innerHTML='<strong style="display:block;margin-bottom:8px">Entrar para editar cores</strong>'+
      '<input id="ce-em" type="email" placeholder="e-mail" style="width:100%;padding:9px;border-radius:8px;border:1px solid #2A2A2A;background:#0A0A0A;color:#fff;margin-bottom:6px">'+
      '<input id="ce-sn" type="password" placeholder="senha" style="width:100%;padding:9px;border-radius:8px;border:1px solid #2A2A2A;background:#0A0A0A;color:#fff">'+
      '<button id="ce-ok" type="button" style="width:100%;margin-top:8px;border:0;background:#1877F2;color:#fff;border-radius:8px;padding:10px;font-weight:700;cursor:pointer">Entrar</button>'+
      '<p id="ce-er" style="margin:8px 0 0;font-size:12px;color:#A3A3A3"></p>';
    document.body.appendChild(box);
    box.querySelector("#ce-ok").onclick=async function(){
      var r=await c.auth.signInWithPassword({email:box.querySelector("#ce-em").value.trim(),password:box.querySelector("#ce-sn").value});
      if(r.error){box.querySelector("#ce-er").textContent="E-mail ou senha incorretos.";return}
      box.remove(); iniciarAdmin();
    };
  }
  async function iniciarAdmin(){
    if(await verificarAdmin()) montarEditor();
  }

  window.AjusteCores={carregar:carregarTudo,editor:iniciarAdmin,login:pedirLogin};
  document.addEventListener("keydown",function(e){if(e.ctrlKey&&e.shiftKey&&(e.key==="E"||e.key==="e")){pedirLogin()}});
  garantirSupabase().then(function(){
    carregarTudo();
    document.addEventListener("DOMContentLoaded",function(){
      clienteSb();
      verificarAdmin().then(function(ok){
        if(ok) montarEditor(); else botaoLogin();
      });
    });
  });
})();
