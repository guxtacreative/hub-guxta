/* Aprovação de arte/orçamento pelo hub, com aceites (arquivo + variação de cor de até 30%).
   Portal: GlaraArtes.portal(sb, el)
   Painel: GlaraArtes.admin(sb, el, { clientes:()=>[...], portalURL:(token)=>url }) */
(function(){
  var BUCKET="artes";
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]})}
  function foneWa(t){return window.GlaraAvisos?window.GlaraAvisos.foneWa(t):""}
  function cofirma(o){if(window.GlaraConfirma)GlaraConfirma.mostrar(o)}
  function dataBR(iso){return iso?new Date(iso).toLocaleDateString("pt-BR"):""}
  function nomeSeguro(n){return String(n||"arquivo").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-").slice(0,80)}

  /* ---------------- PORTAL (cliente) ---------------- */
  async function portal(sb,el){
    if(!el||!sb)return;
    var r=await sb.from("artes_orcamento").select("*").order("enviado_em",{ascending:false});
    var artes=(r&&r.data)||[];
    if(!artes.length){el.innerHTML="";return}
    var itens=await Promise.all(artes.map(async function(a){
      var s=await sb.storage.from(BUCKET).createSignedUrl(a.arquivo_path,3600);
      return {a:a,url:s&&s.data?s.data.signedUrl:""};
    }));
    el.innerHTML='<section class="card artes-box"><h2>Artes para aprovar</h2>'+
      '<p class="note">Confira o arquivo. Só aprove depois de marcar os dois aceites.</p>'+
      itens.map(function(x){return cartaoPortal(x.a,x.url)}).join("")+'</section>';
    el.querySelectorAll(".arte-item").forEach(function(box){
      var id=box.getAttribute("data-id");
      var cks=box.querySelectorAll("[data-aceite]"), btn=box.querySelector('[data-acao="aprovar"]');
      function ver(){if(btn)btn.disabled=!(cks[0].checked&&cks[1].checked)}
      cks.forEach(function(c){c.addEventListener("change",ver)});
      box.querySelectorAll("[data-acao]").forEach(function(b){
        b.addEventListener("click",function(){acaoPortal(sb,el,id,b.getAttribute("data-acao"),box)});
      });
    });
  }
  function cartaoPortal(a,url){
    var pendente=a.status==="enviado";
    var estado=a.status==="producao"?'<span class="tag">Aprovada · em produção</span>':a.status==="ajuste"?'<span class="tag">Ajuste pedido</span>':'';
    var aceites=pendente?
      '<div class="arte-aceites">'+
      '<label class="check"><input type="checkbox" data-aceite="arquivo"> <span>Li e conferi o arquivo e estou de acordo com ele.</span></label>'+
      '<label class="check"><input type="checkbox" data-aceite="cor"> <span>Entendo que a cor pode variar cerca de 30% para mais clara ou mais escura na impressão, por causa da calibragem de cada tela, e aceito essa variação.</span></label>'+
      '<textarea data-motivo placeholder="O que precisa mudar? (preencha só se for pedir ajuste)" rows="2"></textarea>'+
      '<div class="actions"><button type="button" class="btn primary" data-acao="aprovar" disabled>Aprovar e enviar para produção</button>'+
      '<button type="button" class="btn outline" data-acao="ajuste">Pedir ajuste</button></div></div>':'';
    return '<div class="arte-item" data-id="'+esc(a.id)+'">'+
      '<div class="arte-head"><b>'+esc(a.titulo)+'</b> '+(a.orcamento_numero?'<span class="note">Orçamento '+esc(a.orcamento_numero)+'</span> ':'')+estado+'</div>'+
      (url?'<a class="btn small outline" href="'+esc(url)+'" target="_blank" rel="noopener">Abrir arquivo</a>':'')+
      aceites+'</div>';
  }
  async function acaoPortal(sb,el,id,acao,box){
    var msgEl=box.querySelector("[data-motivo]");
    var titulo=box.querySelector("b")?box.querySelector("b").textContent:"Arte";
    if(acao==="aprovar"){
      var r1=await sb.rpc("arte_confirmar",{p_id:id,p_arquivo:true,p_cor:true});
      if(r1.error){alert("Não deu para aprovar agora: "+(r1.error.message||"erro"));return}
      cofirma({titulo:"Arte aprovada!",texto:"“"+titulo+"” foi aprovada. A equipe já foi avisada e a produção começa agora.",passos:["Aprovado","Em produção","Concluído"],atual:1});
      await portal(sb,el);
    }else{
      var motivo=(msgEl&&msgEl.value||"").trim();
      if(!motivo){alert("Escreva o que precisa mudar antes de pedir ajuste.");return}
      var r2=await sb.rpc("arte_pedir_ajuste",{p_id:id,p_motivo:motivo});
      if(r2.error){alert("Não deu para enviar agora: "+(r2.error.message||"erro"));return}
      cofirma({titulo:"Pedido de ajuste enviado!",texto:"A equipe vai ajustar “"+titulo+"” e mandar uma nova versão para você aprovar.",passos:["Enviado","Ajuste","Nova aprovação"],atual:1});
      await portal(sb,el);
    }
  }

  /* ---------------- PAINEL (administrador) ---------------- */
  async function admin(sb,el,opts){
    if(!el||!sb)return;
    opts=opts||{};
    var clientes=(opts.clientes&&opts.clientes())||[];
    var r=await sb.from("artes_orcamento").select("*").order("enviado_em",{ascending:false}).limit(30);
    var artes=(r&&r.data)||[];
    var mapa={};clientes.forEach(function(c){mapa[c.id]=c});
    var recentes=artes;
    var opcoes='<option value="">Cliente avulso (só orçamento)</option>'+clientes.map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.nome)+'</option>'}).join("");
    el.innerHTML='<section class="card arte-admin"><h2>Enviar arte para aprovação</h2>'+
      '<p class="note">O cliente vê no portal, confere o arquivo e aprova com os dois aceites.</p>'+
      '<form class="arte-form" id="arte-form"><div class="grid2">'+
      '<div><label class="label" for="af-cli">Cliente</label><select id="af-cli" required>'+opcoes+'</select></div>'+
      '<div><label class="label" for="af-num">Nº do orçamento</label><input id="af-num" maxlength="30" placeholder="Ex.: 2026-014"></div></div>'+
      '<div id="af-avulso" class="grid2" hidden><div><label class="label" for="af-nome">Nome do cliente</label><input id="af-nome" maxlength="80"></div><div><label class="label" for="af-wa">WhatsApp</label><input id="af-wa" type="tel" maxlength="30" placeholder="(00) 00000-0000"></div></div>'+
      '<div><label class="label" for="af-tit">Título da arte</label><input id="af-tit" required maxlength="120" placeholder="Ex.: Banner lona 90x120"></div>'+
      '<div><label class="label" for="af-file">Arquivo (PDF, PNG, JPG)</label><input id="af-file" type="file" accept=".pdf,image/png,image/jpeg,image/webp" required></div>'+
      '<p class="note" id="af-msg" role="status"></p>'+
      '<div class="actions"><button type="submit" class="btn primary" id="af-enviar">Enviar arte ao cliente</button></div></form>'+
      (recentes.length?'<h3 style="margin-top:18px">Andamento das artes</h3>'+recentes.map(function(a){return linhaAviso(a,mapa[a.cliente_id],opts)}).join(""):'')+
      '</section>';
    el.querySelector("#af-cli").addEventListener("change",function(){el.querySelector("#af-avulso").hidden=this.value!==""});
    el.querySelector("#arte-form").addEventListener("submit",async function(e){
      e.preventDefault();
      var msg=el.querySelector("#af-msg"), btn=el.querySelector("#af-enviar");
      var file=el.querySelector("#af-file").files[0];
      var selId=el.querySelector("#af-cli").value, avulso=selId==="";
      var cli=avulso?null:clientes.find(function(c){return String(c.id)===selId});
      var nomeAv=(el.querySelector("#af-nome").value||"").trim(), waAv=(el.querySelector("#af-wa").value||"").trim();
      var titulo=el.querySelector("#af-tit").value.trim(), num=el.querySelector("#af-num").value.trim();
      if(!file||(!cli&&!avulso)||(avulso&&!nomeAv)){msg.textContent="Escolha o cliente (ou preencha o nome) e o arquivo.";return}
      btn.disabled=true;msg.textContent="Enviando…";
      try{
        var token=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2));
        var pasta=avulso?token:String(cli.id);
        var caminho=pasta+"/"+Date.now()+"-"+nomeSeguro(file.name);
        var up=await sb.storage.from(BUCKET).upload(caminho,file,{contentType:file.type||"application/octet-stream",upsert:false});
        if(up.error)throw up.error;
        var ins=await sb.from("artes_orcamento").insert({
          cliente_id:avulso?null:String(cli.id),
          nome_cliente:avulso?nomeAv:(cli.nome||null),
          whatsapp:avulso?(waAv||null):(cli.whatsapp||null),
          token:token,titulo:titulo,orcamento_numero:num||null,arquivo_path:caminho,status:"enviado"});
        if(ins.error)throw ins.error;
        var link=new URL("aprovar.html?t="+token,location.href).href;
        var prim=String(avulso?nomeAv:cli.nome).trim().split(/\s+/)[0];
        var txt="Oi"+(prim?", "+prim:"")+"! A arte \""+titulo+"\" já está pronta para você conferir e aprovar: "+link;
        var fone=foneWa(avulso?waAv:cli.whatsapp);
        msg.innerHTML=fone?'<a class="btn small primary" target="_blank" rel="noopener" href="https://wa.me/'+fone+'?text='+encodeURIComponent(txt)+'">Avisar o cliente no WhatsApp</a>':'Arte enviada. Preencha o WhatsApp para usar o botão de aviso. Link: '+esc(link);
        cofirma({titulo:"Arte enviada para aprovação!",texto:"O cliente já pode ver e aprovar “"+titulo+"”.",passos:["Enviado","Aprovação","Produção"],atual:0});
        el.querySelector("#arte-form").reset();el.querySelector("#af-avulso").hidden=true;
      }catch(err){msg.textContent="Não deu para enviar: "+(err.message||"erro")}
      btn.disabled=false;
    });
  }
  function linhaAviso(a,c,opts){
    var nome=a.nome_cliente||(c?c.nome:"Cliente");var fone=foneWa(a.whatsapp||(c?c.whatsapp:""));
    var prim=String(nome).trim().split(/\s+/)[0];
    var txt;
    if(a.status==="enviado"){
      var link=new URL("aprovar.html?t="+a.token,location.href).href;
      txt="Oi"+(prim?", "+prim:"")+"! A arte \""+a.titulo+"\" está aguardando a sua aprovação: "+link;
      var tag='<span class="tag">Aguardando o cliente</span>';
    }else if(a.status==="producao"){
      txt="Oi"+(prim?", "+prim:"")+"! Recebemos a sua aprovação da arte \""+a.titulo+"\". Já iniciamos a produção.";
      var tag='<span class="tag">Aprovada · em produção</span>';
    }else{
      txt="Oi"+(prim?", "+prim:"")+"! Recebemos o seu pedido de ajuste na arte \""+a.titulo+"\". Vamos ajustar e enviar uma nova versão.";
      var tag='<span class="tag">Ajuste pedido</span>';
    }
    var quando=dataBR(a.aprovado_em||a.ajuste_em||a.enviado_em);
    return '<div class="arte-aviso"><div><b>'+esc(nome)+'</b> · '+esc(a.titulo)+' '+tag+' <span class="note">'+quando+'</span>'+
      (a.ajuste_motivo?'<div class="note">Pediu: “'+esc(a.ajuste_motivo)+'”</div>':'')+'</div>'+
      (fone?'<a class="btn small outline" target="_blank" rel="noopener" href="https://wa.me/'+fone+'?text='+encodeURIComponent(txt)+'">Responder no WhatsApp</a>':'')+'</div>';
  }

  window.GlaraArtes={portal:portal,admin:admin};
})();
