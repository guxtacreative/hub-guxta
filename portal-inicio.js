/* Hub de Marketing · Início do portal do cliente: tudo do mês num painel só.
   Usa os dados que o portal já carregou (posts, pedidos, plano, resultados, anúncios). */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const num=v=>v==null||v===""||isNaN(v)?null:Number(v);
  const int=v=>Math.round(N(v)).toLocaleString("pt-BR");
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:N(v)>=1000?0:2});
  const brlCurto=v=>{v=N(v);return v>=1e3?"R$ "+(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mil":"R$ "+Math.round(v).toLocaleString("pt-BR")};
  const curto=v=>{v=N(v);return v>=1e6?(v/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mi":v>=1e4?(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mil":Math.round(v).toLocaleString("pt-BR")};
  const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const dm=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const diaSemana=iso=>["dom","seg","ter","qua","qui","sex","sáb"][new Date(String(iso).slice(0,10)+"T12:00").getDay()];
  const ic=p=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={aprovar:ic('<path d="M20 6L9 17l-5-5"/>'),agenda:ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    pedidos:ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),plano:ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    seguidores:ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
    alcance:ic('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
    anuncio:ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),pub:ic('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>'),
    grafico:ic('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),alvo:ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    vivo:ic('<circle cx="12" cy="12" r="3"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>')};

  const vig=p=>p.decisao&&p.decisao.versao===p.versao?p.decisao:null;
  const est=p=>{const d=vig(p);return !d?"pend":d.decisao==="aprovado"?"ok":"adj"};
  const progPed=x=>{const l=x.checklist||[],f=l.filter(i=>i.ok).length;if(x.status==="concluido")return 100;if(x.status==="aprovacao")return 90;
    if(x.status==="alteracao")return l.length?Math.max(60,Math.min(85,Math.round(f/l.length*100))):70;
    if(l.length)return Math.max(x.status==="producao"?20:5,Math.min(85,Math.round(f/l.length*100)));return x.status==="producao"?50:10};
  const NOME_ST={recebido:"Recebido",producao:"Em produção",aprovacao:"Aguardando sua aprovação",alteracao:"Em alteração"};

  function card(o){const tag=o.ir?"button":"div";
    return `<${tag} ${o.ir?`type="button" data-ir-tab="${o.ir}"`:""} class="ini-card${o.ir?" clicavel":""}">
      <span class="ini-card-t">${esc(o.t)}</span><span class="ini-ico">${o.ico}</span>
      <span class="ini-num">${o.v}</span>${o.bar!=null?`<span class="pi-bar bar"><i style="width:${Math.max(0,Math.min(100,o.bar))}%" class="${o.bar>=100?"full-ok":""}"></i></span>`:""}
      <span class="ini-sub${o.alerta?" alerta":""}">${o.s||"&nbsp;"}</span></${tag}>`}

  function serieDados(D){
    const S={}, GM=window.GlaraMetricas;
    const rs=(D.resultados||[]).filter(r=>GM&&GM.temNumeros(r)).slice().sort((a,b)=>String(a.inicio||"").localeCompare(String(b.inicio||""))).slice(-6);
    const rot=r=>{if(r.inicio){const [y,m]=r.inicio.split("-");return MESES[m-1]}return String(r.titulo||"").slice(0,6)};
    const mens=k=>rs.map(r=>({l:rot(r),v:num(((r.metricas||{}).fim||{})[k])??num(((r.metricas||{}).inicio||{})[k])})).filter(x=>x.v!=null);
    const seg=mens("seguidores"), alc=mens("alcance"), vis=mens("visualizacoes");
    if(seg.length>=2)S.seguidores={t:"Seguidores",fmt:curto,pts:seg,leg:"por mês"};
    if(alc.length>=2)S.alcance={t:"Contas alcançadas",fmt:curto,pts:alc,leg:"por mês, últimos 30 dias"};
    if(vis.length>=2)S.visualizacoes={t:"Visualizações",fmt:curto,pts:vis,leg:"por mês, últimos 30 dias"};
    const ads=D.anuncios||[];
    if(ads.length){const por={};ads.forEach(a=>{por[a.data]=(por[a.data]||0)+N(a.investimento)});const dias=Object.keys(por).sort();
      if(dias.length>=2)S.investimento={t:"Investimento em anúncios",fmt:brlCurto,pts:dias.map(d=>({l:dm(d),v:por[d]})),leg:"por dia, neste mês"};
      const rpor={};ads.forEach(a=>{rpor[a.data]=(rpor[a.data]||0)+N(a.resultados)});
      if(dias.length>=2)S.resultados={t:"Resultados dos anúncios",fmt:int,pts:dias.map(d=>({l:dm(d),v:rpor[d]})),leg:"por dia, neste mês"};}
    return S;
  }
  function grafico(S,k){
    const s=S[k];if(!s)return "";
    const vals=s.pts.map(p=>p.v), mn=Math.min(...vals), mx=Math.max(...vals), base=k==="seguidores"&&mn>0?mn*0.97:0, max=(mx-base)*1.15||1;
    const W=640,H=220,pl=64,pr=16,pt=14,pb=32,w=W-pl-pr,h=H-pt-pb, n=vals.length;
    const X=i=>pl+(n>1?i*w/(n-1):w/2), Y=v=>pt+h-((v-base)/max)*h;
    const pts=vals.map((v,i)=>[X(i),Y(v)]);
    let d=`M${pts[0][0]},${pts[0][1]}`;for(let i=1;i<n;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],cx=(x0+x1)/2;d+=` C${cx},${y0} ${cx},${y1} ${x1},${y1}`}
    const area=d+` L${pts[n-1][0]},${pt+h} L${pts[0][0]},${pt+h} Z`;
    const grade=[0,.5,1].map(f=>{const v=base+max/1.15*f,y=Y(v);return `<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" class="ini-grade"/><text x="${pl-8}" y="${y+4}" class="ini-eixo" text-anchor="end">${s.fmt(v)}</text>`}).join("");
    const passo=Math.ceil(n/8);
    const rot=s.pts.map((p,i)=>i%passo===0||i===n-1?`<text x="${X(i)}" y="${H-9}" class="ini-eixo" text-anchor="middle">${esc(p.l)}</text>`:"").join("");
    const dots=pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${n>12?3:4.5}" class="ini-dot"><title>${esc(s.pts[i].l)}: ${s.fmt(vals[i])}</title></circle>`).join("");
    const ult=vals[n-1], prim=vals[0], tot=vals.reduce((a,b)=>a+b,0), cresc=k==="seguidores"||k==="alcance"||k==="visualizacoes";
    const resumo=cresc?`<b>${s.fmt(ult)}</b> agora${prim?` <span class="dl ${ult>=prim?"up":"down"}">${ult>=prim?"▲":"▼"} ${Math.abs((ult-prim)/prim*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}% no período</span>`:""}`
      :`<b>${k==="investimento"?brl(tot):int(tot)}</b> no mês <span class="note">· ${n} dias com anúncio</span>`;
    return `<section class="ini-box ini-graf"><header><span class="ini-ico">${I.grafico}</span><h3>${esc(s.t)}</h3><span class="note">${esc(s.leg)}</span></header>
      ${Object.keys(S).length>1?`<div class="seg" role="group" aria-label="O que mostrar no gráfico">${Object.entries(S).map(([kk,v])=>`<button type="button" data-pi-serie="${kk}" aria-pressed="${kk===k}">${esc(v.t.split(" ")[0])}</button>`).join("")}</div>`:""}
      <p class="ini-graf-tot">${resumo}</p>
      <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" class="ini-svg" role="img" aria-label="${esc(s.t)}">${grade}<path d="${area}" class="ini-area"/><path d="${d}" class="ini-linha"/>${dots}${rot}</svg></div></section>`;
  }
  function rosca(posts){
    const pub=posts.filter(p=>p.publicacao==="publicado").length, ag=posts.filter(p=>p.publicacao==="agendado").length;
    const ok=posts.filter(p=>est(p)==="ok"&&!p.publicacao).length, pend=posts.filter(p=>est(p)==="pend").length, adj=posts.filter(p=>est(p)==="adj").length;
    const seg=[["Publicados",pub,"var(--ok,#19A33B)"],["Agendados",ag,"#F59E0B"],["Aprovados",ok,"var(--ink)"],["Aguardando você",pend,"var(--alerta,#00C875)"],["Em ajuste",adj,"var(--muted)"]];
    const tot=posts.length, r=52, C=2*Math.PI*r;let acc=0;
    const arcos=tot?seg.filter(x=>x[1]).map(x=>{const len=x[1]/tot*C,a=`<circle cx="70" cy="70" r="${r}" fill="none" stroke="${x[2]}" stroke-width="16" stroke-dasharray="${Math.max(0,len-2)} ${C}" stroke-dashoffset="${-acc}" transform="rotate(-90 70 70)"><title>${esc(x[0])}: ${x[1]}</title></circle>`;acc+=len;return a}).join(""):`<circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>`;
    return `<section class="ini-box ini-rosca"><header><span class="ini-ico">${I.alvo}</span><h3>Conteúdo do mês</h3><span class="note">${tot} post${tot===1?"":"s"}</span></header>
      <div class="ini-rosca-c">${window.GlaraAnel?window.GlaraAnel.progresso({pct:tot?(pub+ag+ok)/tot:0,centro:(tot?Math.round((pub+ag+ok)/tot*100):0)+"%",sub:"aprovado",rotulo:(tot?Math.round((pub+ag+ok)/tot*100):0)+"% dos posts do mês aprovados"}):`<svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="${tot} posts no mês">${arcos}<text x="70" y="70" text-anchor="middle" class="ini-rosca-n">${tot?Math.round((pub+ag+ok)/tot*100):0}%</text><text x="70" y="90" text-anchor="middle" class="ini-eixo">aprovado</text></svg>`}
      <ul class="ini-leg">${seg.map(x=>`<li><i style="background:${x[2]}"></i><span>${esc(x[0])}</span><b>${x[1]}</b></li>`).join("")}</ul></div></section>`;
  }
  function lista(titulo,ico,itens,vazio,acao){
    return `<section class="ini-box"><header><span class="ini-ico">${ico}</span><h3>${titulo}</h3>${itens.length?`<span class="badge">${itens.length}</span>`:""}</header>
      ${itens.length?`<ul class="ini-lista">${itens.join("")}</ul>`:`<p class="note ini-vazio">${vazio}</p>`}${acao||""}</section>`}

  function html(D,opt){
    opt=opt||{};
    const posts=D.posts||[], peds=D.pedidos||[], cli=D.cliente||{}, uso=D.uso||{}, lim=cli.limites||{}, h=hojeISO();
    const nOk=posts.filter(p=>est(p)==="ok").length, nPend=posts.filter(p=>est(p)==="pend").length, nAdj=posts.filter(p=>est(p)==="adj").length;
    const nPub=posts.filter(p=>p.publicacao==="publicado").length, nAg=posts.filter(p=>p.publicacao==="agendado").length;
    const abertos=peds.filter(x=>["recebido","producao","aprovacao","alteracao"].includes(x.status)), concl=peds.filter(x=>x.status==="concluido").length;
    const tipos=Object.keys(lim).filter(t=>typeof lim[t]==="number"&&lim[t]>0), totLim=tipos.reduce((a,t)=>a+lim[t],0), totUso=tipos.reduce((a,t)=>a+N(uso[t]),0);
    const GM=window.GlaraMetricas, rAtual=(D.resultados||[]).find(r=>D.ciclo&&r.id===D.ciclo.id&&GM&&GM.temNumeros(r))||(D.resultados||[]).filter(r=>GM&&GM.temNumeros(r)).slice(-1)[0];
    const mi=((rAtual||{}).metricas||{}).inicio||{}, mf=((rAtual||{}).metricas||{}).fim||{};
    const seg=num(mf.seguidores)??num(mi.seguidores), segVar=num(mf.seguidores)!=null&&num(mi.seguidores)!=null?num(mf.seguidores)-num(mi.seguidores):null;
    const alc=num(mf.alcance)??num(mi.alcance);
    const ads=D.anuncios||[], inv=ads.reduce((a,x)=>a+N(x.investimento),0), res=ads.reduce((a,x)=>a+N(x.resultados),0);
    const prox=posts.filter(p=>p.data&&p.data>=h).sort((a,b)=>a.data.localeCompare(b.data))[0];
    const cards=[
      card({t:"Posts aprovados",ico:I.aprovar,v:`${nOk}<small> de ${posts.length}</small>`,bar:posts.length?nOk/posts.length*100:0,s:nPend?`${nPend} esperando sua aprovação`:nAdj?`${nAdj} em ajuste pela equipe`:"Tudo aprovado 🎉",alerta:nPend>0,ir:"aprovar"}),
      card({t:"Publicação",ico:I.pub,v:int(nPub),s:`publicado${nPub===1?"":"s"}${nAg?` · ${nAg} agendado${nAg===1?"":"s"}`:""}`}),
      card({t:"Pedidos em andamento",ico:I.pedidos,v:int(abertos.length),s:abertos.length?`média de ${Math.round(abertos.reduce((a,x)=>a+progPed(x),0)/abertos.length)}% concluído`:concl?`${concl} concluído${concl===1?"":"s"}`:"Faça um pedido quando precisar",ir:"pedidos"}),
      totLim?card({t:"Uso do plano",ico:I.plano,v:`${totUso}<small> de ${totLim}</small>`,bar:totUso/totLim*100,s:totUso>totLim?`${totUso-totLim} além do plano`:`${totLim-totUso} conteúdo${totLim-totUso===1?"":"s"} disponíve${totLim-totUso===1?"l":"is"}`,alerta:totUso>totLim,ir:"plano"}):"",
      seg!=null?card({t:"Seguidores",ico:I.seguidores,v:curto(seg),s:segVar!=null?`${segVar>=0?"+":"−"}${int(Math.abs(segVar))} no mês`:"no perfil",ir:"resultados"}):"",
      alc!=null?card({t:"Contas alcançadas",ico:I.alcance,v:curto(alc),s:"últimos 30 dias",ir:"resultados"}):"",
      ads.length?card({t:"Investido em anúncios",ico:I.anuncio,v:brlCurto(inv),s:res?`${int(res)} resultados · ${brl(inv/res)} cada`:"neste mês",ir:"anuncios"}):"",
      prox?card({t:"Próximo post",ico:I.agenda,v:`${dm(prox.data)}<small> ${diaSemana(prox.data)}</small>`,s:esc(prox.titulo),ir:"aprovar"}):""
    ].filter(Boolean);
    const S=serieDados(D), sk=S[opt.serie]?opt.serie:Object.keys(S)[0];
    const precisa=posts.filter(p=>est(p)==="pend").sort((a,b)=>String(a.data||"9").localeCompare(String(b.data||"9"))).slice(0,6).map(p=>`<li><button type="button" class="ini-item" data-pi-post="${p.id}">
      <span class="ini-tag pend">Aprovar</span><span class="ini-item-t"><b>${esc(p.titulo)}</b><small>${esc([p.formato,p.data?"para "+dm(p.data):""].filter(Boolean).join(" · "))}</small></span><span class="ini-seta" aria-hidden="true">›</span></button></li>`);
    const andamento=abertos.slice(0,6).map(x=>{const pc=progPed(x);return `<li><button type="button" class="ini-item pi-ped" data-ir-tab="pedidos">
      <span class="ini-item-t"><b>${esc(x.titulo)}</b><small>${esc(x.tipo)} · ${NOME_ST[x.status]||"Recebido"}</small><span class="bar pi-bar${window.GlaraAnel?" bar-apple":""}" data-etapa="${x.status}"><i style="width:${pc}%;${window.GlaraAnel?window.GlaraAnel.barraCores(pc/100):""}"></i></span></span><span class="pi-pc">${pc}%</span></button></li>`});
    const agenda=posts.filter(p=>p.data&&p.data>=h).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,7).map(p=>{const e=est(p);
      const st=p.publicacao==="publicado"?["Publicado","ok"]:p.publicacao==="agendado"?["Agendado","pub-ag"]:e==="ok"?["Aprovado","ok"]:e==="adj"?["Em ajuste","adj"]:["Aguardando você","pend"];
      return `<li><button type="button" class="ini-item" data-pi-post="${p.id}"><span class="ini-data"><b>${dm(p.data).split("/")[0]}</b><small>${diaSemana(p.data)}</small></span>
        <span class="ini-item-t"><b>${esc(p.titulo)}</b><small>${esc(p.formato)}</small></span><span class="status ${st[1]}">${st[0]}</span></button></li>`});
    return `<header class="pi-topo"><div><h2>Seu painel</h2><p class="note" style="margin:2px 0 0">${esc((D.ciclo||{}).titulo||"")}</p></div><span class="pi-vivo">${I.vivo} Atualizado em tempo real</span></header>
      <div class="ini-grid">${cards.join("")}</div>
      <div class="ini-duo${sk?"":" pi-uma"}">${sk?grafico(S,sk):""}${rosca(posts)}</div>
      <div class="ini-duo ini-duo-2">
        ${lista("Precisa de você",I.aprovar,precisa,"Nenhum post esperando a sua aprovação. 👏",nPend>6?`<div class="actions"><button type="button" class="btn small" data-ir-tab="aprovar">Ver todos (${nPend})</button></div>`:"")}
        ${lista("Pedidos em andamento",I.pedidos,andamento,"Nenhum pedido em andamento.",`<div class="actions"><button type="button" class="btn small" data-ir-tab="pedidos">Fazer um pedido</button></div>`)}
      </div>
      ${lista("Próximos posts",I.agenda,agenda,"Nenhum post com data daqui para frente neste mês.")}`;
  }
  window.GlaraPortalInicio={html};
})();
