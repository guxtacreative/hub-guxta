/* Hub de Marketing · Início do painel (dashboard geral de todos os clientes). */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:N(v)>=1000?0:2});
  const brlCurto=v=>{v=N(v);return v>=1e6?"R$ "+(v/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mi":v>=1e3?"R$ "+(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mil":"R$ "+Math.round(v).toLocaleString("pt-BR")};
  const int=v=>Math.round(N(v)).toLocaleString("pt-BR");
  const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const MESES_L=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const dm=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const diaSemana=iso=>{const d=new Date(String(iso).slice(0,10)+"T12:00");return ["dom","seg","ter","qua","qui","sex","sáb"][d.getDay()]};
  const ic=p=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={
    clientes:ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
    aprovar:ic('<path d="M20 6L9 17l-5-5"/>'),
    pedidos:ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    tarefas:ic('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
    orcamento:ic('<path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/>'),
    contrato:ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>'),
    anuncio:ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    feito:ic('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
    foguete:ic('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'),
    grafico:ic('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
    alvo:ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    sino:ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    caixa:ic('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    agenda:ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>')
  };
  const PASSOS=[
    ["cliente","Cadastre o primeiro cliente","no campo Novo cliente, à esquerda"],
    ["plano","Cadastre o plano de um cliente","em Configurações do cliente: quantos posts, Reels e Stories por mês"],
    ["acesso","Libere o acesso de um cliente com e-mail e senha","em Acessos com e-mail e senha, e envie o convite"],
    ["publicado","Publique o primeiro mês para um cliente","no mês do cliente, clique em Publicar para o cliente"],
    ["numeros","Lance números do Instagram ou anúncios","nas abas Números do Instagram ou Anúncios"],
    ["contrato","Anexe um contrato assinado","em Contrato e documentos, no cliente"]];

  function criar(el,sb,ctx){
    let D=null, serie="investido";
    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando o seu painel…</div>`;
      const {data,error}=await sb.rpc("admin_dashboard");
      if(error||!data){el.innerHTML=`<div class="empty">Não consegui montar o Início. ${error&&/admin_dashboard/.test(error.message||"")?"Rode o arquivo 07 do banco no Supabase.":esc(error?error.message:"")}</div>`;return}
      D=data;render();
    }
    function card(o){
      const tag=o.ir?"button":"div";
      return `<${tag} ${o.ir?`type="button" data-ini-ir="${o.ir}"`:""} class="ini-card${o.cls?" "+o.cls:""}${o.ir?" clicavel":""}">
        <span class="ini-card-t">${esc(o.t)}</span><span class="ini-ico">${o.ico}</span>
        <span class="ini-num">${o.v}</span><span class="ini-sub${o.alerta?" alerta":""}">${o.s||"&nbsp;"}</span></${tag}>`;
    }
    function passosHTML(){
      const p=D.passos||{}, feitos=PASSOS.filter(x=>p[x[0]]).length;if(feitos===PASSOS.length)return "";
      let fechado=false;try{fechado=localStorage.getItem("guxta_passos_ok")==="1"}catch(e){}if(fechado)return "";
      const prox=PASSOS.find(x=>!p[x[0]]);
      return `<section class="ini-passos"><span class="ini-ico">${I.foguete}</span>
        <b>Primeiros passos</b><span class="ini-passos-n">${feitos} de ${PASSOS.length}</span>
        <div class="bar"><i style="width:${Math.round(feitos/PASSOS.length*100)}%"></i></div>
        <span class="ini-passos-prox">Próximo: <b>${esc(prox[1])}</b> <span class="note">${esc(prox[2])}</span></span>
        <button type="button" class="ini-x" data-ini="fechar-passos" aria-label="Esconder primeiros passos">✕</button></section>`;
    }
    function graficoHTML(){
      const s=D.serie||[], cfgS={investido:["Investimento em anúncios",v=>brlCurto(v)],posts:["Posts no calendário",int],pedidos:["Pedidos recebidos",int],resultados:["Resultados dos anúncios",int]};
      const vals=s.map(x=>N(x[serie])), max=Math.max(1,...vals)*1.15, W=640, H=230, pl=72, pr=16, pt=16, pb=34, w=W-pl-pr, h=H-pt-pb;
      const X=i=>pl+(s.length>1?i*w/(s.length-1):w/2), Y=v=>pt+h-(v/max)*h;
      const pts=vals.map((v,i)=>[X(i),Y(v)]);
      let d=`M${pts[0][0]},${pts[0][1]}`;for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],cx=(x0+x1)/2;d+=` C${cx},${y0} ${cx},${y1} ${x1},${y1}`}
      const area=d+` L${pts[pts.length-1][0]},${pt+h} L${pts[0][0]},${pt+h} Z`;
      const grade=[0,.5,1].map(f=>{const v=max/1.15*f,y=Y(v);return `<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" class="ini-grade"/><text x="${pl-8}" y="${y+4}" class="ini-eixo" text-anchor="end">${cfgS[serie][1](v)}</text>`}).join("");
      const rot=s.map((x,i)=>{const [y,m]=x.mes.split("-");return `<text x="${X(i)}" y="${H-10}" class="ini-eixo" text-anchor="middle">${MESES[+m-1]}</text>`}).join("");
      const dots=pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" class="ini-dot"><title>${MESES_L[+s[i].mes.split("-")[1]-1]}: ${cfgS[serie][1](vals[i])}</title></circle>`).join("");
      const tot=vals.reduce((a,b)=>a+b,0), ult=vals[vals.length-1], ant=vals[vals.length-2];
      const var_=ant?((ult-ant)/ant):null;
      return `<section class="ini-box ini-graf"><header><span class="ini-ico">${I.grafico}</span><h3>${cfgS[serie][0]}</h3><span class="note">últimos 6 meses</span></header>
        <div class="seg" role="group" aria-label="O que mostrar no gráfico">${Object.entries(cfgS).map(([k,v])=>`<button type="button" data-ini-serie="${k}" aria-pressed="${serie===k}">${v[0].split(" ")[0]==="Investimento"?"Investimento":v[0].split(" ")[0]}</button>`).join("")}</div>
        <p class="ini-graf-tot"><b>${serie==="investido"?brl(ult):cfgS[serie][1](ult)}</b> neste mês${var_!=null&&isFinite(var_)?` <span class="dl ${serie==="investido"?"neutro":var_>=0?"up":"down"}">${var_>=0?"▲":"▼"} ${Math.abs(var_*100).toLocaleString("pt-BR",{maximumFractionDigits:0})}% vs. mês anterior</span>`:""} <span class="note">· ${cfgS[serie][1](tot)} em 6 meses</span></p>
        <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" class="ini-svg" role="img" aria-label="${esc(cfgS[serie][0])} por mês">${grade}<path d="${area}" class="ini-area"/><path d="${d}" class="ini-linha"/>${dots}${rot}</svg></div></section>`;
    }
    function rosca(){
      const p=D.pedidos||{}, t=D.tarefas||{};
      const seg=[["Pedidos novos",N(p.recebidos),"var(--seg1,var(--alerta,#10B981))"],["Pedidos em produção",N(p.producao),"var(--seg2,var(--accent))"],["Tarefas a fazer",N(t.a_fazer),"var(--seg3,var(--ink))"],["Tarefas fazendo",N(t.fazendo),"var(--seg4,var(--muted))"],["Aguardando retorno",N(t.aguardando),"var(--seg5,var(--line))"]];
      const tot=seg.reduce((a,x)=>a+x[1],0), r=52, C=2*Math.PI*r;let acc=0;
      const arcos=tot?seg.filter(x=>x[1]).map(x=>{const len=x[1]/tot*C, a=`<circle cx="70" cy="70" r="${r}" fill="none" stroke="${x[2]}" stroke-width="16" stroke-dasharray="${Math.max(0,len-2)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 70 70)"><title>${esc(x[0])}: ${x[1]}</title></circle>`;acc+=len;return a}).join(""):`<circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>`;
      return `<section class="ini-box ini-rosca"><header><span class="ini-ico">${I.alvo}</span><h3>Demandas</h3><span class="note">em aberto</span></header>
        <div class="ini-rosca-c">${window.GlaraAnel?window.GlaraAnel.segmentos(seg,{centro:tot,sub:"abertas",rotulo:tot+" demandas em aberto"}):`<svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="${tot} demandas em aberto">${arcos}<text x="70" y="70" text-anchor="middle" class="ini-rosca-n">${tot}</text><text x="70" y="90" text-anchor="middle" class="ini-eixo">abertas</text></svg>`}
        <ul class="ini-leg">${seg.map(x=>`<li><i style="background:${x[2]}"></i><span>${esc(x[0])}</span><b>${x[1]}</b></li>`).join("")}</ul></div>
        <div class="actions"><button type="button" class="btn small" data-ini-ir="tarefas">Abrir minhas tarefas</button></div></section>`;
    }
    function listaHTML(titulo,ico,itens,vazio){
      return `<section class="ini-box"><header><span class="ini-ico">${ico}</span><h3>${titulo}</h3>${itens.length?`<span class="badge">${itens.length}</span>`:""}</header>
        ${itens.length?`<ul class="ini-lista">${itens.join("")}</ul>`:`<p class="note ini-vazio">${vazio}</p>`}</section>`;
    }
    function render(){
      const f=D.financeiro||{}, c=D.clientes||{}, a=D.aprovacoes||{}, p=D.pedidos||{}, t=D.tarefas||{}, o=D.orcamentos||{}, k=D.contratos||{}, an=D.anuncios||{};
      const hoje=new Date(String(D.hoje)+"T12:00"), mesL=MESES_L[hoje.getMonth()];
      const dataL=hoje.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
      const nome=ctx.nome||"";
      const atencao=(D.atencao||[]).map(x=>{const tag={boleto:["Gerar boleto","late"],pedido:["Pedido novo","pend"],ajuste:["Ajuste pedido","adj"],tarefa:[x.detalhe&&/atrasada/.test(x.detalhe)?"Atrasada":"Hoje","late"]}[x.tipo]||["",""];
        return `<li><button type="button" class="ini-item" ${x.tipo==="tarefa"?'data-ini-ir="tarefas"':x.tipo==="boleto"?'data-ini-ir="financeiro"':x.cliente_id?`data-ini-cli="${esc(x.cliente_id)}" data-ini-aba="${x.tipo==="pedido"?"pedidos":"posts"}"`:""}>
          <span class="ini-tag ${tag[1]}">${tag[0]}</span><span class="ini-item-t"><b>${esc(x.titulo)}</b><small>${esc([x.cliente,x.tipo==="tarefa"?x.detalhe.split(" · ")[0]:x.detalhe].filter(Boolean).join(" · "))}</small></span><span class="ini-seta" aria-hidden="true">›</span></button></li>`});
      const agenda=(D.agenda||[]).map(x=>{const st={pendente:["Aguardando aprovação","pend"],aprovado:["Aprovado","ok"],ajuste:["Ajuste","adj"],a_fazer:["A fazer","prod"],fazendo:["Fazendo","prod"],aguardando:["Aguardando","prod"],entrada:["A receber","ok"],saida:["A pagar","adj"]}[x.estado]||["",""];
        return `<li><button type="button" class="ini-item" ${x.tipo==="tarefa"?'data-ini-ir="tarefas"':x.tipo==="financeiro"?'data-ini-ir="financeiro"':x.cliente_id?`data-ini-cli="${esc(x.cliente_id)}" data-ini-aba="posts"`:""}>
          <span class="ini-data"><b>${dm(x.data).split("/")[0]}</b><small>${diaSemana(x.data)}</small></span><span class="ini-item-t"><b>${esc(x.titulo)}</b><small>${esc([x.cliente,x.tipo==="post"?x.detalhe:x.detalhe].filter(Boolean).join(" · "))}</small></span><span class="status ${st[1]}">${st[0]}</span></button></li>`});
      el.innerHTML=`<header class="ini-ola"><h1>Olá${nome?", "+esc(nome):""} <span class="ini-aceno" aria-hidden="true">👋</span></h1><p class="intro">${esc(ctx.plataforma||"Hub de Marketing")} · ${esc(dataL)}</p></header>
        ${passosHTML()}
        <div id="ini-ent"></div>
        <div class="ini-grid">
          ${card({t:"Clientes ativos",ico:I.clientes,v:int(c.ativos),s:N(c.novos_mes)?`${c.novos_mes} ${N(c.novos_mes)>1?"novos":"novo"} em ${mesL}`:`Nenhum novo em ${mesL}`})}
          ${card({t:"Aprovações pendentes",ico:I.aprovar,v:int(a.pendentes),s:N(a.ajustes)?`${a.ajustes} ${N(a.ajustes)>1?"ajustes pedidos":"ajuste pedido"}`:`${int(a.aprovados)} aprovados no mês atual`,alerta:N(a.ajustes)>0})}
          ${card({t:"Pedidos em aberto",ico:I.pedidos,v:int(N(p.recebidos)+N(p.producao)),s:N(p.recebidos)?`${p.recebidos} ${N(p.recebidos)>1?"novos esperando você":"novo esperando você"}`:`${int(p.producao)} em produção`,alerta:N(p.recebidos)>0})}
          ${card({t:"Minhas tarefas",ico:I.tarefas,v:int(t.abertas),s:N(t.atrasadas)?`${t.atrasadas} ${N(t.atrasadas)>1?"atrasadas":"atrasada"}${N(t.hoje)?" · "+t.hoje+" para hoje":""}`:N(t.hoje)?`${t.hoje} para hoje`:"Nada atrasado",alerta:N(t.atrasadas)>0,ir:"tarefas"})}
          ${card({t:"Orçamentos em aberto",ico:I.orcamento,v:int(o.abertos),s:N(o.valor)?`${brlCurto(o.valor)} em negociação`:N(o.aprovados_mes)?`${o.aprovados_mes} aprovado(s) em ${mesL}`:"Nenhum valor lançado",ir:"orcamentos"})}
          ${card({t:"Contratos ativos",ico:I.contrato,v:int(k.ativos),s:N(k.sem_contrato)?`${k.sem_contrato} ${N(k.sem_contrato)>1?"clientes sem contrato anexado":"cliente sem contrato anexado"}`:"Todos com contrato",alerta:N(k.sem_contrato)>0})}
          ${card({t:"Anúncios em "+mesL,ico:I.anuncio,v:brlCurto(an.investido_mes),s:`${int(an.resultados_mes)} resultados · ${int(an.clientes_mes)} ${N(an.clientes_mes)===1?"cliente":"clientes"}`})}
          ${card({t:"Caixa em "+mesL,ico:I.caixa,v:brlCurto(N(f.entradas_mes)-N(f.saidas_mes)),s:N(f.lucro_materiais_mes)?`${brlCurto(f.lucro_materiais_mes)} de lucro em materiais`:N(f.a_receber)?`${brlCurto(f.a_receber)} a receber`:"Entradas menos saídas pagas",cls:N(f.entradas_mes)-N(f.saidas_mes)<0?"neg":"",ir:"financeiro"})}
        </div>
        <div class="ini-duo">${graficoHTML()}${rosca()}</div>
        <div class="ini-duo ini-duo-2">${listaHTML("Precisa da sua atenção",I.sino,atencao,"Tudo em dia: nenhum pedido novo, ajuste, boleto ou tarefa atrasada.")}${listaHTML("Próximos 7 dias",I.agenda,agenda,"Nada marcado para os próximos 7 dias.")}</div>`;
      if(ctx.depois)ctx.depois(el);
    }
    el.addEventListener("click",e=>{
      const s=e.target.closest("[data-ini-serie]");if(s){serie=s.dataset.iniSerie;const g=el.querySelector(".ini-graf");if(g)g.outerHTML=graficoHTML();return}
      if(e.target.closest('[data-ini="fechar-passos"]')){try{localStorage.setItem("guxta_passos_ok","1")}catch(_){}const b=el.querySelector(".ini-passos");b&&b.remove();return}
      const ir=e.target.closest("[data-ini-ir]");if(ir){const d=ir.dataset.iniIr;if(ctx.ir)ctx.ir(d);else if(d==="tarefas"&&ctx.abrirTarefas)ctx.abrirTarefas();return}
      const cl=e.target.closest("[data-ini-cli]");if(cl){ctx.abrirCliente&&ctx.abrirCliente(cl.dataset.iniCli,cl.dataset.iniAba);return}
    });
    carregar();
    return {recarregar:carregar};
  }
  window.GlaraInicio={criar};
})();
