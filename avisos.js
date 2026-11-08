/* =====================================================================
   Hub de Marketing · Avisos automáticos (GlaraAvisos)
   - sino(): sino do painel com os avisos (aprovações, pedidos, propostas,
     pagamentos, lembretes) + alerta no navegador
   - criar(): página "Avisos e lembretes" (aprovações paradas, e-mail,
     configurações, histórico de envios)
   - rascunhoRelatorio(): texto automático do relatório do mês
   ===================================================================== */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const foneWa=t=>{let d=String(t||"").replace(/\D/g,"");if(!d)return "";if(d.startsWith("00"))d=d.slice(2);if(d.length===10||d.length===11)d="55"+d;return d.length>=12?d:""};
  const plural=(n,a,b)=>n+" "+(n===1?a:b);
  const ICONES={
    aprovado:["#0F8A4A",'<path d="M20 6 9 17l-5-5"/>'],
    pedido_aprovado:["#0F8A4A",'<path d="M20 6 9 17l-5-5"/>'],
    ajuste:["#E8780C",'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'],
    alteracao:["#E8780C",'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'],
    pedido:["#2F6BFF",'<path d="M12 5v14M5 12h14"/>'],
    proposta_vista:["#7A5AF8",'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'],
    proposta_assinada:["#0F8A4A",'<path d="M3 17c3 0 4-3 6-3s2 3 4 3 3-6 5-6 2 2 3 2"/><path d="M3 21h18"/>'],
    proposta_recusada:["#2383E2",'<path d="M18 6 6 18M6 6l12 12"/>'],
    pagamento_atrasado:["#2383E2",'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/>'],
    vence_hoje:["#E8780C",'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/>'],
    lembrete:["#2F6BFF",'<path d="M4 4h16v16H4z"/><path d="m4 6 8 7 8-7"/>'],
    lembrete_whatsapp:["#E8780C",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    relatorio:["#7A5AF8",'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    boleto_pedido:["#E8780C",'<path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14"/>'],
    cliente_pagou:["#0F8A4A",'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="m9 15 2 2 4-4"/>'],
    pagamento_recebido:["#0F8A4A",'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="m9 15 2 2 4-4"/>'],
    loja_pedido:["#0F8A4A",'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/>'],
    loja_abandono:["#E8780C",'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6"/>'],
    sistema:["#6B6B6B",'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>']
  };
  const icone=t=>{const [cor,p]=ICONES[t]||ICONES.sistema;
    return `<i class="av-ico" style="--c:${cor}" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg></i>`};
  const haQuanto=iso=>{const s=(Date.now()-new Date(iso).getTime())/1000;
    if(s<60)return "agora";if(s<3600)return Math.floor(s/60)+" min";if(s<86400)return Math.floor(s/3600)+" h";
    const d=Math.floor(s/86400);if(d===1)return "ontem";if(d<7)return d+" dias";
    return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})};
  const dataHora=iso=>{if(!iso)return "";const d=new Date(iso);return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
  const dias=iso=>iso?Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/86400000)):0;

  /* ---------- mensagem de WhatsApp para o cliente ---------- */
  function linkPortal(c){const base=new URL("index.html",location.href);
    if(c.link_ativo!==false&&c.token)base.searchParams.set("c",c.token);base.searchParams.set("aba","aprovar");return base.href}
  function waLembrete(p){
    const fone=foneWa(p.whatsapp||p.telefone_crm);if(!fone)return "";
    const n=(+p.posts||0)+(+p.pedidos||0);
    const txt=`Oi! Tudo bem? Passando para lembrar que ${n===1?"tem 1 conteúdo esperando":"tem "+n+" conteúdos esperando"} a sua aprovação no portal. Leva só 2 minutinhos e mantém as publicações em dia:\n${linkPortal({token:p.token,link_ativo:p.link_ativo})}`;
    return "https://wa.me/"+fone+"?text="+encodeURIComponent(txt)}

  /* =====================================================================
     SINO
     ===================================================================== */
  function sino(box,sb,ctx){
    let itens=[], naoLidas=0, vistos=null, aberto=false;
    box.innerHTML=`<button type="button" class="sino" id="av-sino" aria-expanded="false" aria-controls="av-pop" aria-label="Avisos"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="badge" id="av-n" hidden></span></button>
      <div class="sino-pop av-pop" id="av-pop" hidden role="dialog" aria-label="Avisos"></div>`;
    box.hidden=false;
    const $b=s=>box.querySelector(s), btn=$b("#av-sino"), pop=$b("#av-pop");
    const nomeCli=id=>{const c=(ctx.clientes()||[]).find(x=>x.id===id);return c?c.nome:""};

    function render(){
      const n=$b("#av-n");n.hidden=!naoLidas;n.textContent=naoLidas>99?"99+":naoLidas;
      btn.setAttribute("aria-label",naoLidas?`Avisos: ${naoLidas} não lido(s)`:"Avisos: nenhum novo");
      const podeNotif="Notification" in window&&Notification.permission==="default";
      pop.innerHTML=`<div class="sino-head"><b>Avisos</b>${naoLidas?`<button type="button" class="btn small ghost" data-av="lidas">Marcar todos como lidos</button>`:""}</div>
        ${itens.length?`<ul class="av-lista">${itens.map(a=>`<li><button type="button" class="av-item ${a.lida?"":"nova"}" data-av-id="${a.id}">
            ${icone(a.tipo)}<span class="av-txt"><b>${esc(a.titulo)}</b>${a.texto?`<small>${esc(a.texto)}</small>`:""}</span>
            <span class="av-quando">${esc(haQuanto(a.criada_em))}${a.lida?"":'<i class="sino-dot" aria-label="não lido"></i>'}</span></button></li>`).join("")}</ul>`
          :`<p class="note">Nada por aqui ainda. Quando um cliente aprovar, pedir ajuste, fizer um pedido ou assinar uma proposta, aparece aqui.</p>`}
        <div class="av-rodape">${podeNotif?`<button type="button" class="btn small ghost" data-av="navegador">Avisar também no navegador</button>`:""}
          <button type="button" class="btn small" data-av="config">Lembretes e e-mails</button></div>`;
    }
    async function atualizar(){
      const [l,c]=await Promise.all([
        sb.from("notificacoes").select("*").order("criada_em",{ascending:false}).limit(40),
        sb.from("notificacoes").select("id",{count:"exact",head:true}).eq("lida",false)]);
      if(l.error)return;
      itens=l.data||[];naoLidas=(c.error||c.count==null)?itens.filter(a=>!a.lida).length:c.count;
      // alerta do navegador só para o que chegou depois da última olhada
      const novos=vistos?itens.filter(a=>!a.lida&&!vistos.has(a.id)):[];
      vistos=new Set(itens.map(a=>a.id));
      if(novos.length&&"Notification" in window&&Notification.permission==="granted"&&document.hidden){
        try{const a=novos[0];const nt=new Notification(novos.length>1?novos.length+" avisos novos":a.titulo,{body:novos.length>1?novos.map(x=>x.titulo).slice(0,3).join("\n"):(a.texto||""),icon:"icone.png",tag:"hub-avisos"});
          nt.onclick=()=>{window.focus();abrir(true);nt.close()}}catch(e){}}
      render();if(ctx.mudou)ctx.mudou(naoLidas);
    }
    function abrir(v){aberto=v;pop.hidden=!v;btn.setAttribute("aria-expanded",String(v))}
    btn.addEventListener("click",e=>{e.stopPropagation();abrir(!aberto);if(aberto)atualizar()});
    document.addEventListener("click",e=>{if(aberto&&!box.contains(e.target))abrir(false)});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&aberto){abrir(false);btn.focus()}});
    pop.addEventListener("click",async e=>{
      const it=e.target.closest("[data-av-id]");
      if(it){const a=itens.find(x=>x.id===it.dataset.avId);abrir(false);
        if(a&&!a.lida){a.lida=true;naoLidas=Math.max(0,naoLidas-1);render();sb.from("notificacoes").update({lida:true}).eq("id",a.id).then(()=>{})}
        if(a)ctx.ir(Object.assign({},a.destino||{},{cliente:(a.destino||{}).cliente||a.cliente_id}));return}
      const b=e.target.closest("[data-av]");if(!b)return;
      if(b.dataset.av==="lidas"){const {error}=await sb.from("notificacoes").update({lida:true}).eq("lida",false);if(error)return ctx.falha("marcar como lidos",error);
        itens.forEach(a=>a.lida=true);naoLidas=0;render();if(ctx.mudou)ctx.mudou(0)}
      if(b.dataset.av==="navegador"){try{await Notification.requestPermission()}catch(e){}render();
        ctx.toast(Notification.permission==="granted"?"Pronto: com o painel aberto, os avisos novos aparecem também no canto da tela.":"O navegador não liberou os alertas.")}
      if(b.dataset.av==="config"){abrir(false);ctx.ir({vista:"avisos"})}
    });
    render();atualizar();
    return {atualizar,get naoLidas(){return naoLidas}};
  }

  /* =====================================================================
     PÁGINA: AVISOS E LEMBRETES
     ===================================================================== */
  const TIPO_ENVIO={resumo:"Resumo para você",lembrete:"Lembrete de aprovação",relatorio:"Relatório do mês",cobranca:"Cobrança",teste:"Teste",aviso:"Aviso"};
  // erros do Resend em português
  function erroHumano(e){e=String(e||"");
    if(/domain is not verified|verify your domain/i.test(e))return "O domínio ainda não foi verificado no Resend. Confira os registros DNS no registro.br e clique em Verify no Resend.";
    if(/api key is invalid|invalid api key|unauthorized|401/i.test(e))return "A chave do Resend não foi aceita. Crie uma nova chave e cole aqui.";
    if(/rate limit|429/i.test(e))return "Muitos envios de uma vez. O Resend pediu para esperar; clique em Reenviar daqui a pouco.";
    if(/testing emails|own email address/i.test(e))return "Conta do Resend em modo de teste: verifique o domínio para mandar para outras pessoas.";
    if(/invalid.*to|to.*invalid/i.test(e))return "Endereço de e-mail inválido.";
    return e.replace(/\s+/g," ").slice(0,140)}
  const STATUS_ENVIO={pendente:["Na fila","pend"],enviando:["Enviando","pend"],enviado:["Enviado","ok"],erro:["Erro","erro"],cancelado:["Cancelado","off"]};

  function criar(el,sb,ctx){
    let cfg=null, st=null, pend=[], envios=[], cobs=[], emp={}, lemCob={}, carregando=true, salvando=false;

    async function carregar(){
      const [c,s,p,e]=await Promise.all([
        sb.from("avisos_config").select("*").eq("id",1).maybeSingle(),
        sb.rpc("avisos_status"),
        sb.rpc("avisos_pendencias"),
        sb.from("envios").select("id,tipo,cliente_id,para,assunto,status,erro,criado_em,enviado_em").order("criado_em",{ascending:false}).limit(30)]);
      carregando=false;
      if(c.error||s.error){el.innerHTML=`<section class="card"><h2>Avisos e lembretes</h2><p class="aviso-inativo">Falta instalar esta parte no banco. Rode o arquivo <b>14_avisos.sql</b> no SQL Editor do Supabase e recarregue a página.</p><p class="note">${esc((c.error||s.error).message||"")}</p></section>`;return}
      cfg=c.data||{};st=s.data||{};pend=p.error?[]:(p.data||[]);envios=e.error?[]:(e.data||[]);
      await carregarCobrancas();render();
    }
    // pagamentos vencendo ou atrasados, para lembrar no WhatsApp
    async function carregarCobrancas(){
      const [l,e]=await Promise.all([
        sb.from("lancamentos").select("*").eq("tipo","entrada").eq("status","previsto"),
        sb.from("empresa").select("*").eq("id",1).maybeSingle()]);
      emp=e&&!e.error&&e.data?e.data:{};
      const lim=Math.max(1,+emp.cobranca_dias||5), hoje=hojeISO();
      cobs=(l&&!l.error?l.data||[]:[]).filter(x=>!x.cliente_pagou_em&&diasAte(x.data,hoje)<=lim&&diasAte(x.data,hoje)>=-90)
        .sort((a,b)=>String(a.data).localeCompare(String(b.data)));
      try{lemCob=JSON.parse(localStorage.getItem("guxta_wa_cobranca")||"{}")||{}}catch(_){lemCob={}}
    }
    const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
    const diasAte=(iso,hoje)=>Math.round((new Date(String(iso).slice(0,10)+"T12:00")-new Date(hoje+"T12:00"))/864e5);
    const brl=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    const dmS=iso=>{const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
    function atualizado(x){const d=-diasAte(x.data,hojeISO()), v=Number(x.valor)||0;
      if(d<=(+emp.atraso_carencia||0))return {total:v,multa:0,juros:0,dias:Math.max(0,d)};
      const multa=Math.round(v*(+emp.atraso_multa||0))/100, juros=Math.round(v*(+emp.atraso_juros_mes||0)/100/30*d*100)/100;
      return {total:Math.round((v+multa+juros)*100)/100,multa,juros,dias:d}}
    function waCobranca(x){
      const c=(ctx.clientes()||[]).find(k=>k.id===x.cliente_id)||{}, fone=foneWa(c.whatsapp), d=diasAte(x.data,hojeISO()), a=atualizado(x);
      const nome=String(c.nome||x.cliente_nome||"").trim().split(/\s+/)[0];
      const link=x.token?new URL("pagar.html?t="+x.token,location.href).href:"";
      const quando=d<0?`venceu em ${dmS(x.data)}`:d===0?"vence hoje":`vence em ${dmS(x.data)}`;
      const txt=`Oi${nome?", "+nome:""}! Tudo bem? Passando para lembrar do pagamento de ${x.descricao}: ${brl(a.total)}${a.total>Number(x.valor)?` (já com multa e juros de ${a.dias} dia${a.dias===1?"":"s"})`:""}, que ${quando}.${link?`\nDá para pagar pelo Pix (QR Code) ou no cartão por aqui: ${link}`:""}\nSe já pagou, pode desconsiderar. Obrigado!`;
      return {url:"https://wa.me/"+(fone||"")+"?text="+encodeURIComponent(txt),fone,nome:c.nome||x.cliente_nome||"Cliente",a,d}}
    function cobHTML(){
      return `<section class="card">
        <div class="head"><h3>Pagamentos para lembrar no WhatsApp</h3><span class="note">${cobs.length?plural(cobs.length,"cobrança","cobranças"):"Nada vencendo"}</span></div>
        ${cobs.length?`<ul class="av-pend">${cobs.map(x=>{const w=waCobranca(x), ult=lemCob[x.id];
          return `<li class="av-pend-i ${w.d<0?"atras":""}">
            <div class="av-pend-t"><b>${esc(w.nome)}</b>
              <span>${esc(x.descricao)} · ${brl(w.a.total)}${w.a.total>Number(x.valor)?` <small class="av-erro" style="display:inline">(com multa e juros)</small>`:""}</span>
              <small>${w.d<0?`Venceu em ${dmS(x.data)} · há ${plural(-w.d,"dia","dias")}`:w.d===0?"Vence hoje":`Vence em ${dmS(x.data)} · faltam ${plural(w.d,"dia","dias")}`}${ult?" · lembrado no WhatsApp em "+esc(dataHora(ult)):""}${w.fone?"":" · sem WhatsApp cadastrado"}</small></div>
            <div class="av-pend-a">
              <a class="btn small av-wa" href="${esc(w.url)}" target="_blank" rel="noopener" data-a="wa-cob" data-l="${x.id}" data-c="${x.cliente_id||""}">${w.fone?"Lembrar no WhatsApp":"WhatsApp (escolher contato)"}</a>
              ${x.cliente_id&&!w.fone?`<button class="btn small ghost" data-a="cadastrar-wa" data-c="${x.cliente_id}">+ WhatsApp</button>`:""}</div></li>`}).join("")}</ul>`
          :`<p class="note">Nenhum pagamento vencendo nos próximos ${plural(Math.max(1,+emp.cobranca_dias||5),"dia","dias")} nem atrasado.</p>`}
        <p class="note">A mensagem já vai com o valor (com multa e juros, se atrasou) e o link para pagar no Pix ou no cartão. Quem avisou que pagou sai da lista.</p>
      </section>`}

    const chip=(ok,sim,nao)=>`<span class="av-chip ${ok?"ok":"nao"}">${ok?"✓ ":""}${esc(ok?sim:nao)}</span>`;
    function statusHTML(){
      const emailOk=cfg.email_ativo&&st.chave&&st.net;
      return `<section class="card av-topo">
        <div class="head"><div><h2>Avisos e lembretes</h2>
          <p class="intro">O sistema avisa você quando o cliente aprova, pede ajuste, faz pedido ou mexe numa proposta, e lembra o cliente quando a aprovação fica parada.</p></div>
          <button class="btn small" data-a="rodar" title="Roda agora a checagem diária (lembretes, pagamentos e relatórios)">Checar agora</button></div>
        <div class="av-chips">
          ${chip(true,"Sino do painel","")}
          ${chip(emailOk,"E-mail ligado",!st.chave?"E-mail: falta a chave":!cfg.email_ativo?"E-mail desligado":"E-mail: falta pg_net")}
          ${chip(st.cron,"Rotina automática ativa","Rotina automática: falta pg_cron")}
          ${chip(cfg.lembrete_ativo,"Lembretes ligados","Lembretes desligados")}
          ${st.fila?`<span class="av-chip pend">${plural(st.fila,"e-mail na fila","e-mails na fila")}</span>`:""}
          ${st.erros?`<span class="av-chip nao">${plural(st.erros,"erro de envio","erros de envio")} (7 dias)</span>`:""}
        </div>
        ${!st.cron||!st.net?`<p class="aviso-inativo">Para os avisos rodarem sozinhos: no Supabase, abra <b>Database › Extensions</b>, ative <b>pg_cron</b> e <b>pg_net</b> e rode o arquivo <b>14_avisos.sql</b> de novo. Enquanto isso, use <b>Checar agora</b>.</p>`:""}
      </section>`;
    }

    function pendHTML(){
      return `<section class="card">
        <div class="head"><h3>Aprovações paradas</h3><span class="note">${pend.length?plural(pend.length,"cliente","clientes"):"Tudo em dia"}</span></div>
        ${pend.length?`<ul class="av-pend">${pend.map(p=>{const n=(+p.posts||0)+(+p.pedidos||0), d=dias(p.desde), wa=waLembrete(p);
          return `<li class="av-pend-i ${d>=(cfg.lembrete_dias||2)?"atras":""}">
            <div class="av-pend-t"><b>${esc(p.nome)}</b>
              <span>${plural(n,"item esperando","itens esperando")}${+p.pedidos?` (${plural(+p.pedidos,"pedido","pedidos")})`:""}${d?` · há ${plural(d,"dia","dias")}`:" · desde hoje"}</span>
              <small>${p.ultimo_lembrete?"Último lembrete: "+esc(dataHora(p.ultimo_lembrete)):"Nenhum lembrete ainda"}${+p.emails?"":" · sem e-mail cadastrado"}</small>
              ${(p.titulos||[]).length?`<small class="av-pend-tit">${(p.titulos||[]).slice(0,3).map(esc).join(" · ")}${n>3?" …":""}</small>`:""}</div>
            <div class="av-pend-a">
              <button class="btn small" data-a="lembrar" data-c="${p.cliente_id}" ${+p.emails?"":`disabled title="Este cliente não tem acesso com e-mail"`}>Lembrar por e-mail</button>
              ${wa?`<a class="btn small av-wa" href="${esc(wa)}" target="_blank" rel="noopener" data-a="wa" data-c="${p.cliente_id}">WhatsApp</a>`
                  :`<button class="btn small ghost" data-a="cadastrar-wa" data-c="${p.cliente_id}" title="Cadastre o WhatsApp nas configurações do cliente">+ WhatsApp</button>`}
              <button class="btn small ghost" data-a="abrir" data-c="${p.cliente_id}">Abrir</button></div></li>`}).join("")}</ul>`
          :`<p class="note">Nenhum cliente com post ou pedido esperando aprovação.</p>`}
        <p class="note">O lembrete automático sai às 9h para quem está com aprovação parada há ${plural(cfg.lembrete_dias||2,"dia","dias")} ou mais, no máximo ${plural(cfg.lembrete_max||3,"vez","vezes")} para o mesmo material.</p>
      </section>`;
    }

    function configHTML(){
      const sw=(id,on,txt,sub)=>`<label class="av-sw"><input type="checkbox" id="${id}" ${on?"checked":""}><span><b>${txt}</b>${sub?`<small>${sub}</small>`:""}</span></label>`;
      return `<section class="card">
        <div class="head"><h3>Configurações</h3></div>
        <div class="av-grid">
          ${sw("av-lem",cfg.lembrete_ativo,"Lembrar o cliente sozinho","Por e-mail, para quem tem acesso com login")}
          ${sw("av-rel",cfg.relatorio_lembrar,"Avisar quando o relatório do mês fechar","No dia 1, aparece no sino para você revisar e enviar")}
          ${sw("av-email",cfg.email_ativo,"Enviar e-mails","Precisa da chave do Resend, logo abaixo")}
          ${sw("av-resumo",cfg.resumo_admin,"Receber os avisos no meu e-mail","Junta tudo num e-mail só, a cada 5 minutos no máximo")}
        </div>
        <div class="grid2">
          <div><label class="label" for="av-dias">Lembrar depois de quantos dias parado</label><input type="number" min="1" max="30" id="av-dias" value="${esc(cfg.lembrete_dias||2)}"></div>
          <div><label class="label" for="av-max">Máximo de lembretes para o mesmo material</label><input type="number" min="1" max="10" id="av-max" value="${esc(cfg.lembrete_max||3)}"></div>
          <div><label class="label" for="av-admin">Seu e-mail para os avisos (vazio = e-mail de login)</label><input type="email" id="av-admin" value="${esc(cfg.email_admin||"")}" placeholder="${esc((st.admins||[]).join(", "))}"></div>
          <div><label class="label" for="av-rem">Remetente</label><input type="text" id="av-rem" value="${esc(cfg.remetente||"")}"></div>
          <div><label class="label" for="av-url">Endereço do portal (vai nos e-mails)</label><input type="url" id="av-url" value="${esc(cfg.site_url||"")}"></div>
        </div>
        <div class="actions"><button class="btn small primary" data-a="salvar" ${salvando?"disabled":""}>Salvar configurações</button></div>
      </section>`;
    }

    function emailHTML(){
      return `<section class="card">
        <div class="head"><h3>E-mail (Resend)</h3>${st.chave?`<span class="av-chip ok">Chave salva · termina em ${esc(st.chave_fim||"")}</span>`:`<span class="av-chip nao">Sem chave</span>`}</div>
        <p class="intro">Os e-mails saem pelo Resend, que é gratuito até 3.000 por mês. A chave fica guardada no banco e não volta para o navegador.</p>
        <div class="row"><div><label class="label" for="av-chave">${st.chave?"Trocar a chave":"Chave da API do Resend"}</label><input type="password" id="av-chave" autocomplete="off" spellcheck="false" placeholder="re_…"></div>
          <div style="flex:0 0 auto"><button class="btn small primary" data-a="chave">Salvar chave</button></div></div>
        <div class="actions">
          <button class="btn small" data-a="teste" ${st.chave&&cfg.email_ativo?"":"disabled title=\"Salve a chave e ligue Enviar e-mails\""}>Enviar e-mail de teste para mim</button>
          ${st.chave?`<button class="btn small ghost danger" data-a="tirar-chave">Remover chave</button>`:""}</div>
        <details class="av-passos"><summary>Como ligar o e-mail (uns 10 minutos, uma vez só)</summary><ol>
          <li>Crie uma conta grátis em <b>resend.com</b>.</li>
          <li>Em <b>Domains › Add Domain</b>, coloque <b>guxta.com.br</b>.</li>
          <li>O Resend mostra 3 ou 4 registros (TXT e MX). Cadastre cada um na zona DNS do <b>registro.br</b>, do jeito que aparece lá. Depois clique em <b>Verify</b>; pode levar alguns minutos.</li>
          <li>Em <b>API Keys › Create API Key</b>, crie uma chave com permissão <b>Sending access</b> e copie.</li>
          <li>Cole a chave no campo acima, clique em <b>Salvar chave</b>, ligue <b>Enviar e-mails</b> e salve as configurações.</li>
          <li>Clique em <b>Enviar e-mail de teste para mim</b>. Chegou? Pronto.</li></ol></details>
      </section>`;
    }

    function enviosHTML(){
      const nome=id=>{const c=(ctx.clientes()||[]).find(x=>x.id===id);return c?c.nome:""};
      return `<section class="card">
        <div class="head"><h3>Últimos e-mails</h3><span class="note">${st.enviados?plural(st.enviados,"enviado","enviados")+" em 30 dias":""}</span></div>
        ${envios.length?`<div class="av-tab-wrap"><table class="av-tab"><thead><tr><th>Quando</th><th>Tipo</th><th>Para</th><th>Status</th><th></th></tr></thead><tbody>
          ${envios.map(e=>{const [t,cls]=STATUS_ENVIO[e.status]||[e.status,""];
            return `<tr><td>${esc(dataHora(e.criado_em))}</td><td>${esc(TIPO_ENVIO[e.tipo]||e.tipo)}${nome(e.cliente_id)?`<small>${esc(nome(e.cliente_id))}</small>`:""}</td><td class="av-para">${esc(e.para)}</td>
              <td><span class="av-st ${cls}" ${e.erro?`title="${esc(e.erro)}"`:""}>${esc(t)}</span>${e.status==="erro"&&e.erro?`<small class="av-erro">${esc(erroHumano(e.erro))}</small>`:""}</td>
              <td>${e.status==="erro"||e.status==="cancelado"?`<button class="btn small ghost" data-a="reenviar" data-e="${e.id}">Reenviar</button>`:e.status==="pendente"?`<button class="btn small ghost" data-a="cancelar" data-e="${e.id}">Cancelar</button>`:""}</td></tr>`}).join("")}
          </tbody></table></div>`:`<p class="note">Nenhum e-mail ainda.</p>`}
      </section>`;
    }

    function render(){
      if(carregando){el.innerHTML=`<section class="card"><p class="note">Carregando…</p></section>`;return}
      el.innerHTML=statusHTML()+cobHTML()+pendHTML()+configHTML()+emailHTML()+enviosHTML();
    }

    el.addEventListener("click",async e=>{
      const b=e.target.closest("[data-a]");if(!b)return;const a=b.dataset.a, cid=b.dataset.c;
      if(a==="wa"){sb.rpc("lembrete_whatsapp",{p_cliente:cid}).then(()=>carregar());return}
      if(a==="wa-cob"){lemCob[b.dataset.l]=new Date().toISOString();try{localStorage.setItem("guxta_wa_cobranca",JSON.stringify(lemCob))}catch(_){}setTimeout(render,300);return}
      e.preventDefault();
      if(a==="abrir"){ctx.ir({vista:"cliente",cliente:cid,aba:"posts"});return}
      if(a==="cadastrar-wa"){ctx.ir({vista:"cliente",cliente:cid,aba:"posts",config:true});ctx.toast("Abra “Configurações do cliente” e preencha o WhatsApp.");return}
      if(a==="lembrar"){b.disabled=true;const {data,error}=await sb.rpc("lembrar_cliente",{p_cliente:cid});b.disabled=false;
        if(error)return ctx.falha("mandar o lembrete",error);
        ctx.toast(!data||!data.emails?"Este cliente não tem e-mail cadastrado.":cfg.email_ativo&&st.chave?`Lembrete enviado para ${plural(data.emails,"pessoa","pessoas")}.`:"Lembrete na fila: ele sai assim que o e-mail estiver ligado.");carregar();return}
      if(a==="rodar"){b.disabled=true;const {data,error}=await sb.rpc("avisos_diario");try{await sb.rpc("cobrancas_diario")}catch(_){}b.disabled=false;
        if(error)return ctx.falha("checar agora",error);ctx.toast(data&&data.lembretes?`Checado: ${plural(data.lembretes,"lembrete saiu","lembretes saíram")}.`:"Checado: nada novo para lembrar agora.");carregar();if(ctx.mudou)ctx.mudou();return}
      if(a==="salvar"){const v=id=>el.querySelector(id);
        const dados={lembrete_ativo:v("#av-lem").checked,relatorio_lembrar:v("#av-rel").checked,email_ativo:v("#av-email").checked,resumo_admin:v("#av-resumo").checked,
          lembrete_dias:Math.min(30,Math.max(1,parseInt(v("#av-dias").value,10)||2)),lembrete_max:Math.min(10,Math.max(1,parseInt(v("#av-max").value,10)||3)),
          email_admin:v("#av-admin").value.trim(),remetente:v("#av-rem").value.trim()||cfg.remetente,site_url:v("#av-url").value.trim().replace(/\/+$/,"")||cfg.site_url,atualizado_em:new Date().toISOString()};
        if(dados.email_admin&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email_admin)){ctx.toast("Confira o seu e-mail.");return}
        if(!/^https?:\/\//.test(dados.site_url)){ctx.toast("O endereço do portal precisa começar com https://");return}
        if(dados.email_ativo&&!st.chave)ctx.toast("Salvei. O e-mail só começa a sair depois que você colar a chave do Resend.");
        salvando=true;render();const {data,error}=await sb.from("avisos_config").update(dados).eq("id",1).select().single();salvando=false;
        if(error){render();return ctx.falha("salvar as configurações",error)}cfg=data;render();if(!(dados.email_ativo&&!st.chave))ctx.toast("Configurações salvas.");return}
      if(a==="chave"){const k=el.querySelector("#av-chave").value.trim();if(!k){ctx.toast("Cole a chave do Resend no campo.");return}
        const {data,error}=await sb.rpc("avisos_salvar_chave",{p_chave:k});if(error)return ctx.falha("salvar a chave",error);
        st.chave=true;st.chave_fim=data.chave_fim;render();ctx.toast(cfg.email_ativo?"Chave salva. Agora mande um e-mail de teste.":"Chave salva. Ligue “Enviar e-mails” e salve as configurações.");return}
      if(a==="tirar-chave"){if(!confirmar("Remover a chave? Os e-mails param de sair."))return;
        const {error}=await sb.rpc("avisos_salvar_chave",{p_chave:""});if(error)return ctx.falha("remover a chave",error);st.chave=false;render();ctx.toast("Chave removida.");return}
      if(a==="teste"){b.disabled=true;const {data,error}=await sb.rpc("avisos_testar");b.disabled=false;if(error)return ctx.falha("enviar o teste",error);
        ctx.toast(data&&data.emails?"Teste enviado. Confira sua caixa de entrada (e o spam) em 1 minuto.":"Não achei o seu e-mail.");setTimeout(carregar,4000);carregar();return}
      if(a==="reenviar"||a==="cancelar"){const {error}=await sb.from("envios").update(a==="reenviar"?{status:"pendente",tentativas:0,erro:"",criado_em:new Date().toISOString()}:{status:"cancelado",erro:"Cancelado por você."}).eq("id",b.dataset.e);
        if(error)return ctx.falha(a==="reenviar"?"reenviar":"cancelar",error);if(a==="reenviar")await sb.rpc("avisos_rodar");carregar();return}
    });
    function confirmar(msg){return window.confirm?window.confirm(msg):true}

    render();carregar();
    return {recarregar:carregar};
  }

  /* =====================================================================
     RELATÓRIO: rascunho automático do resumo e dos próximos passos
     ===================================================================== */
  function rascunhoRelatorio(d){
    const posts=d.posts||[], dec=d.decisoes||{}, pedidos=(d.pedidos||[]).filter(p=>p.ciclo_id===d.ciclo.id), ads=d.anuncios||[];
    const vig=p=>{const x=dec[p.id];return x&&x.versao===p.versao?x:null};
    const porFormato={};posts.forEach(p=>porFormato[p.formato]=(porFormato[p.formato]||0)+1);
    const aprov=posts.filter(p=>(vig(p)||{}).decisao==="aprovado").length;
    const publicados=posts.filter(p=>p.publicacao==="publicado").length;
    const fmtL=Object.entries(porFormato).map(([f,n])=>plural(n,f==="Carrossel"?"carrossel":f==="Estático"?"post estático":"Reels",f==="Carrossel"?"carrosséis":f==="Estático"?"posts estáticos":"Reels"));
    const lista=a=>a.length<=1?a.join(""):a.slice(0,-1).join(", ")+" e "+a[a.length-1];
    const P=[];
    if(posts.length){
      const prod=[`${plural(posts.length,"conteúdo para o feed","conteúdos para o feed")} (${lista(fmtL)})`];
      if((d.roteiros||[]).length)prod.push(plural(d.roteiros.length,"roteiro de Reels","roteiros de Reels"));
      if((d.stories||[]).length)prod.push(plural(d.stories.length,"sequência de Stories","sequências de Stories"));
      P.push(`Em ${d.ciclo.titulo} produzimos ${lista(prod)}.`);
      const st=[];if(aprov)st.push(`${aprov} ${aprov===1?"foi aprovado":"foram aprovados"}`);if(publicados)st.push(`${publicados} já ${publicados===1?"está publicado":"estão publicados"}`);
      if(st.length)P.push(st.join(" e ").replace(/^./,c=>c.toUpperCase())+".");
    }
    const conc=pedidos.filter(p=>p.status==="concluido").length, abertos=pedidos.filter(p=>!["concluido","recusado"].includes(p.status)).length;
    if(pedidos.length){const pa=[];if(conc)pa.push(plural(conc,"concluído","concluídos"));if(abertos)pa.push(abertos+" em andamento");
      P.push(`Recebemos ${plural(pedidos.length,"pedido extra","pedidos extras")} no mês`+(pa.length?`: ${lista(pa)}.`:"."))}
    const GA=window.GlaraAnuncios;
    if(ads.length&&GA){const t=GA.somar(ads), tipo=(ads.find(a=>a.tipo_resultado)||{}).tipo_resultado||"resultados";
      P.push(`Nos anúncios, investimos ${GA.brl(t.inv)} e tivemos ${t.res.toLocaleString("pt-BR")} ${tipo.charAt(0).toLowerCase()+tipo.slice(1)}`+(t.cpr?`, a ${GA.brl(t.cpr)} cada`:"")+`, com ${t.alc.toLocaleString("pt-BR")} pessoas alcançadas.`)}
    const m=(d.ciclo.metricas||{}), i=m.inicio||{}, f=m.fim||{}, n=v=>v==null||v===""||isNaN(v)?null:Number(v);
    const dif=(k,txt,pl)=>{const a=n(i[k]),b=n(f[k]);if(a==null||b==null||a===b)return "";const df=b-a, pc=a>0?Math.round(df/a*1000)/10:null;
      return `${txt} ${df>0?(pl?"cresceram":"cresceu"):(pl?"caíram":"caiu")} ${Math.abs(df).toLocaleString("pt-BR")}${pc!=null?` (${df>0?"+":"−"}${Math.abs(pc).toLocaleString("pt-BR")}%)`:""}`};
    const ins=[dif("seguidores","o número de seguidores"),dif("alcance","o alcance"),dif("interacoes","as interações",1),dif("visitas","as visitas ao perfil",1)].filter(Boolean);
    if(ins.length)P.push(`No Instagram, ${lista(ins)}.`);
    if(!P.length)P.push(`Resumo de ${d.ciclo.titulo}: escreva aqui os destaques do mês.`);
    P.push("Destaque do mês: [conte aqui qual conteúdo foi melhor e por quê].");
    const prox=[];
    const ajustes=posts.filter(p=>(vig(p)||{}).decisao==="ajuste").length, pend=posts.filter(p=>!vig(p)).length;
    if(pend)prox.push(`Fechar a aprovação dos ${plural(pend,"conteúdo pendente","conteúdos pendentes")}.`);
    if(ajustes)prox.push(`Concluir ${plural(ajustes,"ajuste pedido","ajustes pedidos")}.`);
    if(abertos)prox.push(`Entregar ${plural(abertos,"pedido em andamento","pedidos em andamento")}.`);
    prox.push("Planejar os temas do próximo mês com base no que teve mais resposta.");
    if(ads.length)prox.push("Revisar criativos e públicos dos anúncios para baixar o custo por resultado.");
    return {resumo:P.join(" "),proximos:prox.map(x=>"• "+x).join("\n")};
  }

  window.GlaraAvisos={sino,criar,rascunhoRelatorio,waLembrete,foneWa,linkPortal};
})();
