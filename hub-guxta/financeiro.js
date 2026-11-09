/* Hub de Marketing · Financeiro (só o administrador vê).
   Entradas e saídas, previsto x pago, lucro dos materiais separado do custo,
   planos recorrentes com lembrete de gerar boleto antes do vencimento. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const r2=v=>Math.round((N(v)+Number.EPSILON)*100)/100;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const brlCurto=v=>{v=N(v);const s=v<0?"−":"";v=Math.abs(v);return s+(v>=1e3?"R$ "+(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mil":"R$ "+Math.round(v).toLocaleString("pt-BR"))};
  const num=v=>N(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const parseNum=s=>{s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const dm=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const dmy=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m+"/"+y};
  const dias=(a,b)=>Math.round((new Date(a+"T12:00")-new Date(b+"T12:00"))/864e5);
  const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const MES_C=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const mesNome=ym=>{const [y,m]=ym.split("-");const t=MESES[+m-1];return t[0].toUpperCase()+t.slice(1)+" de "+y};
  const somaMes=(ym,n)=>{let [y,m]=ym.split("-").map(Number);m+=n;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return y+"-"+String(m).padStart(2,"0")};
  const CAT_E=["Plano recorrente","Materiais gráficos","Identidade visual","Site","Tráfego pago","Social media","Vídeo","Outros"];
  const CAT_S=["Gráfica / fornecedor","Ferramentas e assinaturas","Impostos","Anúncios","Equipamentos","Freelancers","Pró-labore","Outros"];
  const FORMAS=["Pix","Boleto","Cartão de crédito","Transferência","Dinheiro"];
  const ic=p=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={mais:ic('<path d="M12 5v14M5 12h14"/>'),menos:ic('<path d="M5 12h14"/>'),boleto:ic('<path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14"/>'),
    ok:ic('<path d="M20 6L9 17l-5-5"/>'),pix:ic('<path d="M12 2 4.5 9.5a3.5 3.5 0 0 0 0 5L12 22l7.5-7.5a3.5 3.5 0 0 0 0-5Z"/><path d="m8.5 12 3.5 3.5 3.5-3.5L12 8.5Z"/>'),wa:ic('<path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12Z"/>'),csv:ic('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),rec:ic('<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>')};

  function criar(el,sb,ctx){
    let EMP={}, CST=null, L=[], R=[], mes=hojeISO().slice(0,7), filtro="todos", busca="", sub="lanc", ed=null, edR=null;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const nomeCli=x=>{const c=clientes().find(y=>y.id===x.cliente_id);return c?c.nome:(x.cliente_nome||"")};

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando o financeiro…</div>`;
      await sb.rpc("gerar_recorrencias"); // cria as mensalidades do mês (sem duplicar)
      try{await sb.rpc("cobrancas_rodar")}catch(_){} // confere pagamentos do Mercado Pago
      const [a,b,c]=await Promise.all([sb.from("lancamentos").select("*").order("data",{ascending:false}).order("criado_em",{ascending:false}),sb.from("recorrencias").select("*").order("dia_vencimento"),sb.from("empresa").select("*").eq("id",1).maybeSingle()]);
      EMP=c&&!c.error&&c.data?c.data:{};
      const err=a.error||b.error;
      if(err){el.innerHTML=`<div class="empty">Não consegui carregar o financeiro. ${/lancamentos|recorrencias/.test(err.message||"")?"Rode o arquivo 07 do banco no Supabase.":esc(err.message)}</div>`;return}
      L=a.data||[];R=b.data||[];render();
      if(ctx.abrirId){const l=L.find(x=>x.id===ctx.abrirId);ctx.abrirId=null;if(l){mes=String(l.data).slice(0,7);render();ed={...l};abrirDlg(form(ed))}}
    }
    const doMes=l=>String(l.data).slice(0,7)===mes;
    const vencido=l=>l.status==="previsto"&&l.data<hojeISO();
    const recDe=l=>l.recorrencia_id&&R.find(r=>r.id===l.recorrencia_id);
    const temBoleto=l=>!!(l.boleto_caminho||l.boleto_linha);
    const boletos=()=>L.filter(l=>{const r=recDe(l);if(l.tipo!=="entrada"||l.status!=="previsto")return false;
      if(l.boleto_pedido_em&&!temBoleto(l))return true;return r&&!l.boleto_em&&dias(l.data,hojeISO())<=N(r.aviso_dias)}).sort((a,b)=>a.data.localeCompare(b.data));
    const avisaram=()=>L.filter(l=>l.tipo==="entrada"&&l.status==="previsto"&&l.cliente_pagou_em);

    function calc(ls){
      const e=ls.filter(l=>l.tipo==="entrada"), s=ls.filter(l=>l.tipo==="saida"), P=x=>x.filter(l=>l.status==="pago"), soma=(x,k="valor")=>r2(x.reduce((t,l)=>t+N(l[k]),0));
      const ep=P(e), sp=P(s), mat=ep.filter(l=>N(l.custo)>0);
      return {ent:soma(ep),entPrev:soma(e.filter(l=>l.status==="previsto")),sai:soma(sp),saiPrev:soma(s.filter(l=>l.status==="previsto")),
        matVend:soma(mat),matCusto:soma(mat,"custo"),matLucro:r2(soma(mat)-soma(mat,"custo")),serv:soma(ep.filter(l=>!N(l.custo))),
        saldo:r2(soma(ep)-soma(sp)),custoTot:soma(ep,"custo")};
    }
    function boletosHTML(){
      const bs=boletos();if(!bs.length)return "";const h=hojeISO();
      return `<section class="card fin-bol"><div class="head"><div><span class="eyebrow">${I.boleto} Lembrete</span><h2>Gerar boleto${bs.length>1?"s":""}</h2></div><span class="badge">${bs.length}</span></div>
        <ul class="fin-bol-l">${bs.map(l=>{const d=dias(l.data,h);return `<li data-l="${l.id}">
          <span class="fin-bol-t"><b>${esc(nomeCli(l)||"Cliente")}</b><small>${esc(l.descricao)} · ${esc(l.forma||"Boleto")}${l.boleto_pedido_em&&!temBoleto(l)?` · <span class="fin-tag pediu">pediu o boleto em ${dm(l.boleto_pedido_em)}</span>`:""}</small></span>
          <span class="fin-bol-d ${d<0?"late":d<=2?"soon":""}">${d<0?`Venceu há ${-d} dia${d===-1?"":"s"}`:d===0?"Vence hoje":`Vence em ${d} dia${d===1?"":"s"} · ${dm(l.data)}`}</span>
          <b class="fin-bol-v">${brl(l.valor)}</b>
          <span class="fin-bol-a"><button type="button" class="btn small primary" data-f="editar">${I.boleto} Anexar boleto</button><button type="button" class="btn small" data-f="boleto">${I.ok} Boleto gerado</button><button type="button" class="btn small ghost" data-f="pago">Já recebi</button></span></li>`}).join("")}</ul></section>`;
    }
    function avisaramHTML(){const as=avisaram();if(!as.length)return "";
      return `<section class="card fin-bol fin-avisou"><div class="head"><div><span class="eyebrow">${I.ok} Confirmar</span><h2>Cliente avisou que pagou</h2></div><span class="badge">${as.length}</span></div>
        <ul class="fin-bol-l">${as.map(l=>`<li data-l="${l.id}">
          <span class="fin-bol-t"><b>${esc(nomeCli(l)||"Cliente")}</b><small>${esc(l.descricao)} · avisou em ${dm(l.cliente_pagou_em)}${l.cliente_pagou_obs?` · “${esc(l.cliente_pagou_obs)}”`:""}</small></span>
          <span class="fin-bol-d">Venc. ${dm(l.data)}</span><b class="fin-bol-v">${brl(l.valor)}</b>
          <span class="fin-bol-a"><button type="button" class="btn small primary" data-f="pago">${I.ok} Confirmar recebimento</button><button type="button" class="btn small ghost" data-f="nao-caiu">Ainda não caiu</button></span></li>`).join("")}</ul>
        <p class="note">Confira no extrato do banco antes de confirmar. “Ainda não caiu” tira o aviso e o cliente volta a ver a cobrança em aberto.</p></section>`}
    // mensalidades do mês: quem já pagou e quem falta
    function pagaramHTML(){
      const ms=L.filter(l=>l.recorrencia_id&&l.tipo==="entrada"&&String(l.competencia||l.data).slice(0,7)===mes).sort((a,b)=>String(a.data).localeCompare(String(b.data)));
      if(!ms.length)return "";
      const pg=ms.filter(l=>l.status==="pago"), tot=ms.reduce((t,l)=>t+N(l.valor),0), rec=pg.reduce((t,l)=>t+N(l.valor),0), pc=tot?Math.round(rec/tot*100):0;
      return `<section class="card fin-pag"><div class="head"><div><span class="eyebrow">Mensalidades de ${mesNome(mes).split(" ")[0].toLowerCase()}</span><h2>Quem já pagou</h2></div>
          <span class="fin-pag-tot"><b>${pg.length} de ${ms.length}</b><small>${brl(rec)} de ${brl(tot)}</small></span></div>
        <div class="bar fin-pag-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pc}"><i style="width:${pc}%"></i></div>
        <ul class="fin-pag-l">${ms.map(l=>{const ok=l.status==="pago",ven=!ok&&vencido(l);return `<li data-l="${l.id}" class="${ok?"ok":ven?"venc":""}">
          <span class="tk-av" style="--av:${ok?"#19A33B":ven?"#E30613":"#9A9A9A"}">${esc((nomeCli(l)||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase())}</span>
          <span class="fin-pag-t"><b>${esc(nomeCli(l)||"Cliente")}</b><small>${ok?"Pago":ven?"Venceu "+dm(l.data):"Vence "+dm(l.data)} · ${esc(l.forma||"")}${!ok&&l.recorrencia_id?(l.boleto_em?" · boleto gerado":" · sem boleto"):""}</small></span>
          <b class="fin-pag-v">${brl(l.valor)}</b>
          <button type="button" class="fin-sw-btn" role="switch" aria-checked="${ok}" data-f="status" aria-label="${esc(nomeCli(l)||"Cliente")}: ${ok?"pago":"não pago"}"><i></i></button></li>`}).join("")}</ul></section>`;
    }
    function graficoHTML(){
      const ms=Array.from({length:6},(_,i)=>somaMes(mes,i-5)), dados=ms.map(m=>calc(L.filter(l=>String(l.data).slice(0,7)===m)));
      const max=Math.max(1,...dados.map(d=>Math.max(d.ent,d.sai)))*1.12, W=640,H=210,pl=64,pr=10,pt=12,pb=30,w=W-pl-pr,h=H-pt-pb,g=w/6,bw=Math.min(22,g/3.2);
      const Y=v=>pt+h-(v/max)*h;
      const grade=[0,.5,1].map(f=>{const v=max/1.12*f;return `<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" class="ini-grade"/><text x="${pl-8}" y="${Y(v)+4}" class="ini-eixo" text-anchor="end">${brlCurto(v)}</text>`}).join("");
      const barras=dados.map((d,i)=>{const cx=pl+g*i+g/2;return `<rect x="${cx-bw-2}" y="${Y(d.ent)}" width="${bw}" height="${pt+h-Y(d.ent)}" rx="4" class="fin-b-e"><title>Entradas: ${brl(d.ent)}</title></rect>
        <rect x="${cx+2}" y="${Y(d.sai)}" width="${bw}" height="${pt+h-Y(d.sai)}" rx="4" class="fin-b-s"><title>Saídas: ${brl(d.sai)}</title></rect>
        <text x="${cx}" y="${H-9}" class="ini-eixo${ms[i]===mes?" fin-eixo-on":""}" text-anchor="middle">${MES_C[+ms[i].split("-")[1]-1]}</text>`}).join("");
      return `<section class="ini-box fin-graf"><header><h3>Entradas e saídas pagas</h3><span class="ch-leg"><span><i class="fin-sw e"></i>Entradas</span><span><i class="fin-sw s"></i>Saídas</span></span></header>
        <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" class="ini-svg" role="img" aria-label="Entradas e saídas dos últimos 6 meses">${grade}${barras}</svg></div></section>`;
    }
    function resumoHTML(){
      const c=calc(L.filter(doMes)), aReceber=L.filter(l=>l.tipo==="entrada"&&l.status==="previsto"), aPagar=L.filter(l=>l.tipo==="saida"&&l.status==="previsto");
      const venR=aReceber.filter(vencido).length, venP=aPagar.filter(vencido).length;
      const k=(cls,v,t,s)=>`<div class="tk-kpi ${cls}"><b>${v}</b><span>${t}</span>${s?`<small>${s}</small>`:""}</div>`;
      const partes=c.ent?[["c",c.custoTot/c.ent*100],["l",c.matLucro/c.ent*100],["sv",c.serv/c.ent*100]]:[];
      return `<div class="tk-kpis fin-kpis">
          ${k("ok",brl(c.ent),"Entradas pagas",c.entPrev?brl(c.entPrev)+" ainda previsto":"")}
          ${k("late-txt",brl(c.sai),"Saídas pagas",c.saiPrev?brl(c.saiPrev)+" ainda previsto":"")}
          ${k(c.saldo<0?"late":"money",brl(c.saldo),"Saldo do mês","entradas − saídas")}
          ${k("ok",brl(c.matLucro),"Lucro dos materiais",c.matVend?`de ${brl(c.matVend)} vendidos (custo ${brl(c.matCusto)})`:"sem venda de material no mês")}
          ${k(venR?"late":"",brl(aReceber.reduce((s,l)=>s+N(l.valor),0)),"A receber",venR?`${venR} vencido${venR>1?"s":""}`:`${aReceber.length} lançamento${aReceber.length===1?"":"s"}`)}
          ${k(venP?"late":"",brl(aPagar.reduce((s,l)=>s+N(l.valor),0)),"A pagar",venP?`${venP} vencido${venP>1?"s":""}`:`${aPagar.length} lançamento${aPagar.length===1?"":"s"}`)}
        </div>
        ${c.ent?`<div class="fin-split"><div class="fin-split-bar">${partes.map(([cl,p])=>p>0?`<i class="${cl}" style="width:${p}%"></i>`:"").join("")}</div>
          <p><span><i class="fin-sw c"></i>Custo de materiais (repasse) <b>${brl(c.custoTot)}</b></span><span><i class="fin-sw l"></i>Lucro dos materiais <b>${brl(c.matLucro)}</b></span><span><i class="fin-sw sv"></i>Serviços e planos <b>${brl(c.serv)}</b></span></p></div>`:""}`;
    }
    function lancHTML(){
      const q=busca.trim().toLowerCase(), h=hojeISO();
      const base=mes==="tudo"?L:L.filter(doMes);
      const vis=[...base].sort((x,y)=>String(y.data).localeCompare(String(x.data))).filter(l=>(filtro==="todos"||(filtro==="previsto"?l.status==="previsto":l.tipo===filtro))&&(!q||(l.descricao+" "+nomeCli(l)+" "+l.categoria+" "+l.forma).toLowerCase().includes(q)));
      const cont=f=>base.filter(l=>f==="todos"||(f==="previsto"?l.status==="previsto":l.tipo===f)).length;
      return `<div class="tk-bar">
          <div class="summary" role="group" aria-label="Filtrar">${[["todos","Tudo"],["entrada","Entradas"],["saida","Saídas"],["previsto","A receber / a pagar"]].map(([k,t])=>`<button class="chip" data-f-f="${k}" aria-pressed="${filtro===k}">${t} <b>${cont(k)}</b></button>`).join("")}</div>
          <div class="tk-tools"><input type="search" id="fin-busca" placeholder="Buscar" value="${esc(busca)}" aria-label="Buscar lançamento"><button type="button" class="btn small ghost" data-f="csv">${I.csv} CSV</button></div>
        </div>
        <div class="fin-lista">${vis.map(l=>{const e=l.tipo==="entrada", lu=e&&N(l.custo)?r2(N(l.valor)-N(l.custo)):null, ven=vencido(l);
          return `<div class="fin-row ${e?"e":"s"}" data-l="${l.id}">
            <span class="fin-dt"><b>${dm(l.data).split("/")[0]}</b><small>${MES_C[+String(l.data).slice(5,7)-1]}</small></span>
            <button type="button" class="fin-t" data-f="editar"><b>${esc(l.descricao)}</b><small>${esc([nomeCli(l),l.categoria,l.forma].filter(Boolean).join(" · "))}${lu!=null?` · <span class="ok-txt">lucro ${brl(lu)}</span> <span class="note">(custo ${brl(l.custo)})</span>`:""}</small></button>
            <button type="button" class="fin-st ${l.status==="pago"?"pago":ven?"venc":"prev"}" data-f="status" title="${l.status==="pago"?"Marcar como previsto":"Marcar como pago"}">${l.status==="pago"?(e?"Recebido":"Pago"):ven?"Vencido":"Previsto"}${l.recorrencia_id&&l.status==="previsto"?(l.boleto_em?" · boleto ok":" · sem boleto"):""}</button>
            ${l.status==="pago"&&l.valor_pago!=null&&N(l.valor_pago)>N(l.valor)?`<span class="fin-tag pagou" title="Recebido com juros e encargos">recebido ${brl(l.valor_pago)}</span>`:""}${l.status==="previsto"&&l.cliente_pagou_em?`<span class="fin-tag pagou" title="O cliente avisou que pagou">avisou que pagou</span>`:l.status==="previsto"&&l.boleto_pedido_em&&!temBoleto(l)?`<span class="fin-tag pediu">pediu boleto</span>`:l.pago_via?`<span class="fin-tag via">${esc(l.pago_via)}</span>`:""}
            <b class="fin-v">${e?"+":"−"} ${brl(l.valor)}</b></div>`}).join("")||`<div class="empty">${L.length?"Nada neste filtro.":"Nenhum lançamento ainda. Use Nova entrada e Nova saída, ou lance um orçamento aprovado."}</div>`}</div>`;
    }
    function recHTML(){
      const tot=R.filter(r=>r.ativo).reduce((s,r)=>s+N(r.valor),0);
      return `<div class="tk-bar"><p class="note" style="margin:0">Cada plano gera a mensalidade do mês e a do próximo. Você recebe o lembrete de gerar o boleto alguns dias antes do vencimento.</p>
          <button type="button" class="btn small primary" data-f="rec-novo">${I.mais} Novo plano recorrente</button></div>
        ${R.length?`<p class="fin-rec-tot">Receita recorrente: <b>${brl(tot)}</b> por mês · ${R.filter(r=>r.ativo).length} plano${R.filter(r=>r.ativo).length===1?"":"s"} ativo${R.filter(r=>r.ativo).length===1?"":"s"}</p>`:""}
        <div class="fin-lista">${R.map(r=>`<button type="button" class="orc-row fin-rec${r.ativo?"":" off"}" data-r="${r.id}">
            <span class="fin-dt"><b>${r.dia_vencimento}</b><small>dia</small></span>
            <span class="orc-t"><b>${esc(nomeCli(r)||"Cliente")}</b><small>${esc(r.descricao)} · ${esc(r.forma)} · lembrete ${r.aviso_dias} dia${r.aviso_dias===1?"":"s"} antes${r.ativo?"":" · pausado"}</small></span>
            <span class="orc-v"><b>${brl(r.valor)}</b><small>por mês</small></span></button>`).join("")||`<div class="empty">Nenhum plano recorrente. Cadastre os clientes que pagam mensalidade para não esquecer de gerar os boletos.</div>`}</div>`;
    }
    function render(){
      el.innerHTML=`<section class="card tk-head">
          <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Financeiro</h2></div>
            <div class="actions"><button class="btn primary" data-f="nova" data-tipo="entrada">${I.mais} Nova entrada</button><button class="btn outline" data-f="nova" data-tipo="saida">${I.menos} Nova saída</button><button class="btn ghost" data-f="cobranca">${I.pix} Pix e cobrança</button></div></div>
          <div class="fin-mes"><button type="button" class="tk-x" data-f="mes" data-d="-1" aria-label="Mês anterior">‹</button><b>${mes==="tudo"?"Todos os meses":mesNome(mes)}</b><button type="button" class="tk-x" data-f="mes" data-d="1" aria-label="Próximo mês">›</button>
            ${mes!==hojeISO().slice(0,7)?`<button type="button" class="btn small ghost" data-f="hoje">Mês atual</button>`:""}${mes!=="tudo"?`<button type="button" class="btn small ghost" data-f="tudo">Ver todos os meses</button>`:""}</div>
          ${mes==="tudo"?"":resumoHTML()}
        </section>
        ${avisaramHTML()}
        ${boletosHTML()}
        ${mes==="tudo"?"":pagaramHTML()}
        ${mes==="tudo"?"":graficoHTML()}
        <div class="seg orc-seg" role="group" aria-label="Seção"><button type="button" data-f-sub="lanc" aria-pressed="${sub==="lanc"}">Lançamentos</button><button type="button" data-f-sub="rec" aria-pressed="${sub==="rec"}">${I.rec} Planos recorrentes <b>${R.filter(r=>r.ativo).length}</b></button></div>
        ${sub==="rec"?recHTML():lancHTML()}
        <dialog class="tk-dlg" id="fin-dlg"></dialog>
        <datalist id="fin-formas">${FORMAS.map(x=>`<option value="${x}">`).join("")}</datalist>`;
    }
    function form(l){
      const novo=!l.id, e=l.tipo==="entrada", cli=clientes();
      return `<form method="dialog" class="tk-form" id="fin-form">
        <div class="head"><h2>${novo?(e?"Nova entrada":"Nova saída"):(e?"Editar entrada":"Editar saída")}</h2><button type="button" class="tk-x" data-f="fechar" aria-label="Fechar">✕</button></div>
        <div class="seg" role="radiogroup" aria-label="Tipo"><button type="button" data-f="tipo" data-tipo="entrada" aria-pressed="${e}">Entrada</button><button type="button" data-f="tipo" data-tipo="saida" aria-pressed="${!e}">Saída</button></div>
        <div><label class="label" for="ff-desc">Descrição</label><input type="text" id="ff-desc" required maxlength="200" value="${esc(l.descricao||"")}" placeholder="${e?"Ex.: Banner do congresso":"Ex.: Gráfica Rio Print"}"></div>
        <div class="grid2">
          <div><label class="label" for="ff-valor">Valor (R$)</label><input type="text" id="ff-valor" inputmode="decimal" value="${l.valor!=null?num(l.valor):""}" placeholder="0,00" required></div>
          ${e?`<div><label class="label" for="ff-custo">Custo de material (R$)</label><input type="text" id="ff-custo" inputmode="decimal" value="${N(l.custo)?num(l.custo):""}" placeholder="0,00 se for serviço"></div>`:""}
          <div><label class="label" for="ff-data">${e?"Data de recebimento / vencimento":"Data do pagamento / vencimento"}</label><input type="date" id="ff-data" value="${esc(l.data||hojeISO())}"></div>
          <div><label class="label" for="ff-status">Situação</label><select id="ff-status"><option value="pago" ${l.status!=="previsto"?"selected":""}>${e?"Recebido":"Pago"}</option><option value="previsto" ${l.status==="previsto"?"selected":""}>Previsto</option></select></div>
          <div><label class="label" for="ff-cat">Categoria</label><input type="text" id="ff-cat" list="ff-cats" value="${esc(l.categoria||"")}"><datalist id="ff-cats">${(e?CAT_E:CAT_S).map(x=>`<option value="${x}">`).join("")}</datalist></div>
          <div><label class="label" for="ff-forma">Forma</label><input type="text" id="ff-forma" list="fin-formas" value="${esc(l.forma||"")}"></div>
          <div><label class="label" for="ff-cli">Cliente</label><select id="ff-cli"><option value="">Nenhum / outro</option>${cli.map(c=>`<option value="${c.id}" ${l.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
          <div><label class="label" for="ff-clin">${e?"Ou nome de quem pagou":"Fornecedor / quem recebeu"}</label><input type="text" id="ff-clin" value="${esc(l.cliente_id?"":l.cliente_nome||"")}"></div>
        </div>
        ${e?`<p class="orc-calc" id="ff-calc"></p>`:""}
        ${l.recorrencia_id?`<label class="check"><input type="checkbox" id="ff-boleto" ${l.boleto_em?"checked":""}> Boleto já gerado e enviado</label>`:""}
        ${cobrancaHTML(l)}
        <div><label class="label" for="ff-notas">Anotações</label><textarea id="ff-notas" style="min-height:60px">${esc(l.notas||"")}</textarea></div>
        <div class="actions"><button type="submit" class="btn primary">${novo?"Lançar":"Salvar"}</button><button type="button" class="btn ghost" data-f="fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn danger small" data-f="apagar" style="margin-left:auto">Apagar</button>`}</div></form>`;
    }
    // cobrança do cliente: boleto, Mercado Pago e WhatsApp
    function cobrancaHTML(l){
      if(l.tipo!=="entrada"||!l.id)return "";
      const c=clientes().find(x=>x.id===l.cliente_id)||{}, wa=foneWa(c.whatsapp), link=l.token?new URL("pagar.html?t="+l.token,location.href).href:"";
      const msg=`Oi! Segue o link para pagamento: ${l.descricao}, ${brl(l.valor)}, vencimento ${dmy(l.data)}. Dá para pagar no Pix (QR Code) ou no cartão${EMP.mp_ativo&&N(EMP.cartao_parcelas)>1?` em até ${EMP.cartao_parcelas}x`:""}:\n${link}`;
      if(l.status==="pago")return `<fieldset class="fin-cob"><legend>${I.pix} Recebimento</legend>
        <div class="grid2"><div><label class="label" for="ff-vpago">Valor recebido (com juros e encargos)</label><input type="text" id="ff-vpago" inputmode="decimal" value="${l.valor_pago!=null?num(l.valor_pago):""}" placeholder="${num(l.valor)}"></div>
        <div><span class="label">Como pagou</span><p class="fin-cob-st" style="margin:0">${esc(l.pago_via||l.forma||"—")}${l.parcelas>1?` · ${l.parcelas}x`:""}</p></div></div></fieldset>`;
      return `<fieldset class="fin-cob"><legend>${I.pix} Cobrança</legend>
        ${link?`<div><span class="label">Link de pagamento (Pix${EMP.mp_ativo?" e cartão":""}, com multa e juros se atrasar)</span><div class="fin-cob-link"><input type="text" readonly value="${esc(link)}" aria-label="Link de pagamento"><button type="button" class="btn small" data-f="copiar" data-v="${esc(link)}">Copiar</button><a class="btn small ghost" href="${esc(link)}" target="_blank" rel="noopener">Abrir</a></div></div>`:""}
        ${l.cliente_id?"":`<p class="note fin-cob-nota">Sem cliente do hub: mande o link acima. Escolhendo um cliente, a cobrança aparece também no portal dele.</p>`}
        ${l.cliente_pagou_em?`<p class="fin-cob-st pagou">${I.ok} O cliente avisou que pagou em ${dm(l.cliente_pagou_em)}${l.cliente_pagou_obs?`: “${esc(l.cliente_pagou_obs)}”`:""}</p>`:""}
        ${l.boleto_pedido_em&&!temBoleto(l)?`<p class="fin-cob-st pediu">O cliente pediu o boleto em ${dm(l.boleto_pedido_em)}.</p>`:""}
        ${l.pago_via?`<p class="fin-cob-st">Pago via ${esc(l.pago_via)}.</p>`:""}
        ${l.cliente_id?`<div><label class="label" for="ff-linha">Código do boleto (linha digitável)</label><input type="text" id="ff-linha" inputmode="numeric" value="${esc(l.boleto_linha||"")}" placeholder="Cole aqui o código de barras do boleto"></div>
        <div><label class="label" for="ff-bolpdf">Boleto em PDF</label>
          ${l.boleto_caminho?`<p class="fin-cob-arq">${I.boleto} ${esc(l.boleto_nome||"boleto.pdf")} <label class="check" style="display:inline-flex;margin-left:8px"><input type="checkbox" id="ff-boltira"> remover</label></p>`:""}
          <input type="file" id="ff-bolpdf" accept="application/pdf,image/png,image/jpeg"></div>
        <label class="check"><input type="checkbox" id="ff-bolavisa" checked> Avisar o cliente por e-mail quando eu anexar o boleto</label>`:""}
        ${l.mp_erro?`<small class="neg">Mercado Pago: ${esc(l.mp_erro)}</small>`:""}
        <div class="actions" style="margin:0"><a class="btn small av-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${I.wa} ${wa?"Mandar no WhatsApp":"Mandar no WhatsApp (escolher contato)"}</a></div>
      </fieldset>`}
    const foneWa=t=>{let d=String(t||"").replace(/\D/g,"");if(!d)return "";if(d.startsWith("00"))d=d.slice(2);if(d.length===10||d.length===11)d="55"+d;return d.length>=12?d:""};
    // configuração do Pix, mensagem e Mercado Pago
    function cobFormHTML(){const e=EMP, st=CST||{};
      const TIPOS=[["","Detectar sozinho"],["cnpj","CNPJ"],["cpf","CPF"],["email","E-mail"],["telefone","Telefone"],["aleatoria","Chave aleatória"]];
      return `<form method="dialog" class="tk-form" id="cob-form">
        <div class="head"><h2>Pix e cobrança</h2><button type="button" class="tk-x" data-f="fechar" aria-label="Fechar">✕</button></div>
        <p class="note" style="margin:0">Aparece no portal de cada cliente, numa faixa fixa quando o vencimento chega e na aba <b>Pagamentos</b>, com QR Code do Pix já com o valor.</p>
        <div class="grid2">
          <div><label class="label" for="cf-pix">Chave Pix</label><input type="text" id="cf-pix" value="${esc(e.pix||"")}" placeholder="CNPJ, CPF, e-mail, telefone ou aleatória"></div>
          <div><label class="label" for="cf-tipo">Tipo da chave</label><select id="cf-tipo">${TIPOS.map(([v,t])=>`<option value="${v}" ${String(e.pix_tipo||"")===v?"selected":""}>${t}</option>`).join("")}</select></div>
          <div><label class="label" for="cf-nome">Nome de quem recebe (como no banco)</label><input type="text" id="cf-nome" maxlength="25" value="${esc(e.pix_nome||e.nome||"")}"></div>
          <div><label class="label" for="cf-cidade">Cidade</label><input type="text" id="cf-cidade" maxlength="15" value="${esc(e.pix_cidade||"")}"></div>
          <div><label class="label" for="cf-dias">Mostrar o aviso quantos dias antes</label><input type="number" id="cf-dias" min="0" max="30" value="${esc(e.cobranca_dias??5)}"></div>
        </div>
        <div><label class="label" for="cf-msg">Mensagem fixa para o cliente</label><textarea id="cf-msg" style="min-height:70px">${esc(e.cobranca_msg||"")}</textarea></div>
        <label class="check"><input type="checkbox" id="cf-email" ${e.cobranca_email!==false?"checked":""}> Mandar e-mail ao cliente ${N(e.cobranca_dias??5)||5} dias antes, no dia e 3 dias depois do vencimento</label>
        <label class="check"><input type="checkbox" id="cf-bol" ${e.boleto_pedido!==false?"checked":""}> O cliente pode pedir boleto pelo portal</label>
        <fieldset class="fin-cob"><legend>Atraso</legend>
          <div class="grid2">
            <div><label class="label" for="cf-multa">Multa (%)</label><input type="number" id="cf-multa" min="0" max="20" step="0.01" value="${esc(e.atraso_multa??2)}"></div>
            <div><label class="label" for="cf-jatr">Juros ao mês (%), por dia de atraso</label><input type="number" id="cf-jatr" min="0" max="20" step="0.01" value="${esc(e.atraso_juros_mes??1)}"></div>
            <div><label class="label" for="cf-car">Dias de tolerância</label><input type="number" id="cf-car" min="0" max="60" value="${esc(e.atraso_carencia??0)}"></div>
          </div>
          <p class="note" style="margin:0">Entra sozinho no Pix, no cartão e nos e-mails depois do vencimento. Para pessoa física (consumidor), a multa máxima é 2%.</p>
        </fieldset>
        <fieldset class="fin-cob"><legend>Cartão de crédito (Mercado Pago)</legend>
          <label class="check"><input type="checkbox" id="cf-mp" ${e.mp_ativo?"checked":""}> Aceitar cartão de crédito parcelado pelo Mercado Pago, com baixa automática</label>
          <div class="grid2">
            <div><label class="label" for="cf-pmax">Parcelar em até</label><select id="cf-pmax">${[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>`<option value="${n}" ${N(e.cartao_parcelas||12)===n?"selected":""}>${n}x</option>`).join("")}</select></div>
            <div><label class="label" for="cf-psj">Sem juros até</label><select id="cf-psj">${[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>`<option value="${n}" ${N(e.cartao_sem_juros||1)===n?"selected":""}>${n===1?"só à vista":n+"x"}</option>`).join("")}</select></div>
            <div><label class="label" for="cf-pj">Seus juros ao mês (%)</label><input type="number" id="cf-pj" min="0" max="20" step="0.01" value="${esc(e.cartao_juros_mes??2.99)}"></div>
            <div><label class="label" for="cf-pmin">Parcela mínima (R$)</label><input type="text" id="cf-pmin" inputmode="decimal" value="${num(e.cartao_parcela_min??50)}"></div>
          </div>
          <div class="fin-sim" id="cf-sim" aria-live="polite"></div>
          <p class="note" style="margin:0">Importante: na sua conta do Mercado Pago, ative o <b>parcelamento sem juros</b> até o mesmo número de parcelas. Assim o cliente paga só os seus juros (que já cobrem a taxa do Mercado Pago), e não os do Mercado Pago por cima.</p>
          <p class="note" style="margin:0">${st.mp_token?`Access Token salvo, termina em <b>${esc(st.mp_fim||"")}</b>${st.mp_teste?" (modo de teste)":""}.`:"Sem Access Token ainda."} No Mercado Pago: <b>Seu negócio › Configurações › Credenciais</b> (ou developers.mercadopago.com.br › Suas integrações) e copie o <b>Access Token de produção</b>.</p>
          <div class="row"><div><label class="label" for="cf-mptok">${st.mp_token?"Trocar o Access Token":"Access Token"}</label><input type="password" id="cf-mptok" autocomplete="off" spellcheck="false" placeholder="APP_USR-…"></div>
            <div style="flex:0 0 auto"><button type="button" class="btn small" data-f="mp-token">Salvar token</button></div></div>
          ${st.mp_token?`<button type="button" class="btn small ghost danger" data-f="mp-tira" style="align-self:flex-start">Remover token</button>`:""}
        </fieldset>
        <div class="actions"><button type="submit" class="btn primary">Salvar</button><button type="button" class="btn ghost" data-f="fechar">Cancelar</button></div></form>`}
    // simulação da tabela do cartão (mesma conta do banco)
    function simular(){const box=el.querySelector("#cf-sim");if(!box)return;const v=id=>el.querySelector(id).value;
      const max=+v("#cf-pmax")||12, sj=+v("#cf-psj")||1, i=parseNum(v("#cf-pj"))/100, min=parseNum(v("#cf-pmin")), base=1000, ps=[];
      for(let n=1;n<=max;n++){const p=(n<=sj||!i)?Math.ceil(base/n*100)/100:Math.ceil(base*i/(1-Math.pow(1+i,-n))*100)/100;if(n>1&&p<min)break;ps.push({n,p,t:Math.round(p*n*100)/100,j:n>sj&&i>0})}
      box.innerHTML=`<span class="label">Como fica uma cobrança de ${brl(base)}</span><div class="fin-sim-g">${ps.map(x=>`<span class="${x.j?"j":""}"><b>${x.n}x</b> ${brl(x.p)}<small>${x.j?"total "+brl(x.t):x.n>1?"sem juros":"à vista"}</small></span>`).join("")}</div>`}
    // redesenha o formulário de cobrança sem perder o que já foi digitado
    function redesenharCob(){const f=el.querySelector("#cob-form");const val={};
      f.querySelectorAll("input,select,textarea").forEach(i=>{if(i.id&&i.id!=="cf-mptok")val[i.id]=i.type==="checkbox"?i.checked:i.value});
      dlg().innerHTML=cobFormHTML();Object.entries(val).forEach(([id,v])=>{const i=el.querySelector("#"+id);if(i){if(i.type==="checkbox")i.checked=v;else i.value=v}});simular()}
    function calcForm(){const c=el.querySelector("#ff-calc");if(!c)return;const v=parseNum(el.querySelector("#ff-valor").value),k=parseNum(el.querySelector("#ff-custo").value);
      c.innerHTML=k?(k>v?`<span class="neg">O custo é maior que o valor recebido.</span>`:`Seu lucro nesta entrada: <b class="ok-txt">${brl(v-k)}</b> (${v?Math.round((v-k)/v*100):0}% do valor). O restante, ${brl(k)}, paga o material.`):"Sem custo: o valor inteiro é seu (serviço ou plano)."}
    function recForm(r){
      const novo=!r.id, cli=clientes();
      return `<form method="dialog" class="tk-form" id="rec-form">
        <div class="head"><h2>${novo?"Novo plano recorrente":"Editar plano recorrente"}</h2><button type="button" class="tk-x" data-f="fechar" aria-label="Fechar">✕</button></div>
        <div class="grid2">
          <div><label class="label" for="rf-cli">Cliente</label><select id="rf-cli"><option value="">Outro (escreva ao lado)</option>${cli.map(c=>`<option value="${c.id}" ${r.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
          <div><label class="label" for="rf-clin">Nome (se não for cliente do hub)</label><input type="text" id="rf-clin" value="${esc(r.cliente_id?"":r.cliente_nome||"")}"></div>
          <div><label class="label" for="rf-desc">Descrição</label><input type="text" id="rf-desc" value="${esc(r.descricao||"Plano mensal")}"></div>
          <div><label class="label" for="rf-valor">Valor mensal (R$)</label><input type="text" id="rf-valor" inputmode="decimal" value="${r.valor!=null?num(r.valor):""}" required></div>
          <div><label class="label" for="rf-dia">Dia do vencimento</label><input id="rf-dia" type="number" min="1" max="31" value="${r.dia_vencimento||10}" required></div>
          <div><label class="label" for="rf-forma">Forma</label><input type="text" id="rf-forma" list="fin-formas" value="${esc(r.forma||"Boleto")}"></div>
          <div><label class="label" for="rf-aviso">Lembrar quantos dias antes</label><input id="rf-aviso" type="number" min="0" max="30" value="${r.aviso_dias??5}"></div>
          <div><label class="label" for="rf-ini">Começa em</label><input type="month" id="rf-ini" value="${esc(String(r.inicio||hojeISO()).slice(0,7))}"></div>
        </div>
        <label class="check"><input type="checkbox" id="rf-ativo" ${r.ativo!==false?"checked":""}> Plano ativo</label>
        <p class="note" style="margin:0">Se o mês tiver menos dias (ex.: dia 31 em fevereiro), o vencimento vai para o último dia do mês. Mudanças valem para as mensalidades ainda não criadas.</p>
        <div class="actions"><button type="submit" class="btn primary">${novo?"Criar plano":"Salvar"}</button><button type="button" class="btn ghost" data-f="fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn danger small" data-f="rec-apagar" style="margin-left:auto">Apagar plano</button>`}</div></form>`;
    }
    const dlg=()=>el.querySelector("#fin-dlg");
    function abrirDlg(html){const d=dlg();d.innerHTML=html;if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");calcForm()}
    function fecharDlg(){const d=dlg();if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open");ed=null;edR=null}
    async function atualizar(id,campos,msg){
      const {data,error}=await sb.from("lancamentos").update(campos).eq("id",id).select().single();
      if(error)return falha("atualizar",error);
      const i=L.findIndex(x=>x.id===id);if(i>=0)L[i]=data;render();if(msg)toast(msg);ctx.mudou&&ctx.mudou();
    }
    function csv(){
      const base=mes==="tudo"?L:L.filter(doMes), q=v=>`"${String(v??"").replace(/"/g,'""')}"`, n=v=>N(v).toFixed(2).replace(".",",");
      const linhas=[["Data","Tipo","Descrição","Cliente / fornecedor","Categoria","Forma","Situação","Valor","Custo","Lucro"].map(q).join(";")]
        .concat(base.map(l=>[dmy(l.data),l.tipo==="entrada"?"Entrada":"Saída",l.descricao,nomeCli(l),l.categoria,l.forma,l.status==="pago"?"Pago":"Previsto",n(l.valor),n(l.custo),l.tipo==="entrada"?n(N(l.valor)-N(l.custo)):""].map((v,i)=>i>=7?v:q(v)).join(";")));
      const blob=new Blob(["﻿"+linhas.join("\r\n")],{type:"text/csv;charset=utf-8"}), a=document.createElement("a");
      a.href=URL.createObjectURL(blob);a.download="financeiro_"+(mes==="tudo"?"completo":mes)+".csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
    }

    el.addEventListener("click",async e=>{
      const fs=e.target.closest("[data-f-sub]");if(fs){sub=fs.dataset.fSub;render();return}
      const ff=e.target.closest("[data-f-f]");if(ff){filtro=ff.dataset.fF;render();return}
      const rr=e.target.closest("[data-r]");if(rr){edR=R.find(x=>x.id===rr.dataset.r);abrirDlg(recForm(edR));return}
      const b=e.target.closest("[data-f]");if(!b)return;
      const a=b.dataset.f, row=b.closest("[data-l]"), l=row&&L.find(x=>x.id===row.dataset.l);
      if(a==="mes"){const d=+b.dataset.d;mes=mes==="tudo"?hojeISO().slice(0,7):somaMes(mes,d);render();return}
      if(a==="hoje"){mes=hojeISO().slice(0,7);render();return}
      if(a==="tudo"){mes="tudo";render();return}
      if(a==="nova"){ed={tipo:b.dataset.tipo,status:"pago"};abrirDlg(form(ed));setTimeout(()=>{const i=el.querySelector("#ff-desc");i&&i.focus()},30);return}
      if(a==="tipo"){const d=el.querySelector("#fin-form");const keep={descricao:d.querySelector("#ff-desc").value,valor:parseNum(d.querySelector("#ff-valor").value)||null,data:d.querySelector("#ff-data").value};
        ed={...ed,...keep,tipo:b.dataset.tipo,custo:b.dataset.tipo==="saida"?0:ed.custo};dlg().innerHTML=form(ed);calcForm();return}
      if(a==="editar"&&l){ed={...l};abrirDlg(form(ed));return}
      if(a==="status"&&l){const p=l.status!=="pago";return atualizar(l.id,{status:p?"pago":"previsto"},p?(l.tipo==="entrada"?"Marcado como recebido.":"Marcado como pago."):"Voltou para previsto.")}
      if(a==="boleto"&&l)return atualizar(l.id,{boleto_em:new Date().toISOString()},"Boleto marcado como gerado.");
      if(a==="pago"&&l)return atualizar(l.id,{status:"pago",data:l.data>hojeISO()?hojeISO():l.data,boleto_em:l.boleto_em||new Date().toISOString(),pago_via:l.pago_via||(l.cliente_pagou_em?"aviso do cliente":"")},"Recebido!");
      if(a==="fechar"){fecharDlg();return}
      if(a==="cobranca"){const r=await sb.rpc("cobranca_status");CST=r.error?{}:r.data;abrirDlg(cobFormHTML());simular();return}
      if(a==="mp-token"){const k=el.querySelector("#cf-mptok").value.trim();if(!k){toast("Cole o Access Token no campo.");return}
        const {data,error}=await sb.rpc("mp_salvar_token",{p_token:k});if(error)return falha("salvar o token",error);
        CST={...(CST||{}),mp_token:true,mp_fim:data.fim,mp_teste:data.teste};redesenharCob();
        toast(data.teste?"Token de TESTE salvo: os pagamentos não são reais.":"Token salvo. Marque a opção do Mercado Pago e clique em Salvar.");return}
      if(a==="mp-tira"){const {error}=await sb.rpc("mp_salvar_token",{p_token:""});if(error)return falha("remover o token",error);CST={...(CST||{}),mp_token:false};redesenharCob();toast("Token removido.");return}
      if(a==="copiar"){try{await navigator.clipboard.writeText(b.dataset.v)}catch(_){}toast("Link copiado.");return}
      if(a==="mp-link"&&ed&&ed.id){b.disabled=true;b.textContent="Gerando…";
        for(let t=0;t<8;t++){const {data,error}=await sb.rpc("mp_gerar_link",{p_lanc:ed.id});
          if(error){b.disabled=false;b.textContent="Gerar link de pagamento";return falha("gerar o link",error)}
          if(data.link){const r=await sb.from("lancamentos").select("*").eq("id",ed.id).single();if(r.data){ed={...ed,...r.data};const i=L.findIndex(x=>x.id===ed.id);if(i>=0)L[i]=r.data}
            const fs=el.querySelector(".fin-cob");if(fs){const tmp=document.createElement("div");tmp.innerHTML=cobrancaHTML(ed);fs.replaceWith(tmp.firstElementChild)}toast("Link do Mercado Pago pronto.");return}
          if(data.status==="sem_token"){b.disabled=false;b.textContent="Gerar link de pagamento";toast("Salve o Access Token em Pix e cobrança.");return}
          if(data.status!=="pendente"||data.erro){b.disabled=false;b.textContent="Gerar link de pagamento";toast("O Mercado Pago recusou: "+(data.erro||data.status));return}
          await new Promise(r=>setTimeout(r,1500))}
        b.disabled=false;b.textContent="Gerar link de pagamento";toast("O Mercado Pago não respondeu ainda. Tente de novo em instantes.");return}
      if(a==="nao-caiu"&&l)return atualizar(l.id,{cliente_pagou_em:null,cliente_pagou_obs:""},"Aviso retirado. O cliente volta a ver a cobrança em aberto.");
      if(a==="csv"){csv();return}
      if(a==="apagar"&&ed&&ed.id){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("lancamentos").delete().eq("id",ed.id);if(error)return falha("apagar",error);
        L=L.filter(x=>x.id!==ed.id);fecharDlg();render();toast("Lançamento apagado.");ctx.mudou&&ctx.mudou();return}
      if(a==="rec-novo"){edR={};abrirDlg(recForm(edR));return}
      if(a==="rec-apagar"&&edR&&edR.id){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("recorrencias").delete().eq("id",edR.id);if(error)return falha("apagar o plano",error);
        fecharDlg();toast("Plano apagado. As mensalidades já lançadas continuam no financeiro.");carregar();ctx.mudou&&ctx.mudou();return}
    });
    el.addEventListener("input",e=>{
      if(e.target.id==="fin-busca"){busca=e.target.value;const x=el.querySelector(".fin-lista"),tmp=document.createElement("div");tmp.innerHTML=lancHTML();x.replaceWith(tmp.querySelector(".fin-lista"));return}
      if(e.target.closest("#fin-form"))calcForm();
      if(e.target.closest("#cob-form"))simular();
    });
    el.addEventListener("submit",async e=>{
      e.preventDefault();const v=s=>{const x=el.querySelector(s);return x?x.value:""};
      if(e.target.id==="cob-form"){
        const dados={pix:v("#cf-pix").trim(),pix_tipo:v("#cf-tipo"),pix_nome:v("#cf-nome").trim().slice(0,25),pix_cidade:v("#cf-cidade").trim().slice(0,15),
          cobranca_dias:Math.min(30,Math.max(0,parseInt(v("#cf-dias"))||0)),cobranca_msg:v("#cf-msg").trim(),cobranca_email:el.querySelector("#cf-email").checked,
          boleto_pedido:el.querySelector("#cf-bol").checked,mp_ativo:el.querySelector("#cf-mp").checked,
          atraso_multa:Math.min(20,Math.max(0,parseNum(v("#cf-multa")))),atraso_juros_mes:Math.min(20,Math.max(0,parseNum(v("#cf-jatr")))),atraso_carencia:Math.min(60,Math.max(0,parseInt(v("#cf-car"))||0)),
          cartao_parcelas:+v("#cf-pmax")||12,cartao_sem_juros:Math.min(+v("#cf-psj")||1,+v("#cf-pmax")||12),cartao_juros_mes:Math.min(20,Math.max(0,parseNum(v("#cf-pj")))),cartao_parcela_min:Math.max(0,r2(parseNum(v("#cf-pmin"))))};
        if(dados.mp_ativo&&!(CST||{}).mp_token){toast("Salve o Access Token do Mercado Pago antes de ligar.");return}
        if(dados.pix&&window.GlaraPix&&!window.GlaraPix.brcode({chave:dados.pix,tipo:dados.pix_tipo,nome:dados.pix_nome,cidade:dados.pix_cidade,valor:1})){toast("Confira a chave Pix.");return}
        const {data,error}=await sb.from("empresa").update(dados).eq("id",1).select().single();if(error)return falha("salvar o Pix",error);
        EMP=data;fecharDlg();render();toast(dados.pix?"Pronto: os clientes já veem o Pix no portal.":"Salvo. Sem chave Pix, o portal mostra só boleto e aviso.");return}
      if(e.target.id==="fin-form"){
        const desc=v("#ff-desc").trim(), valor=r2(parseNum(v("#ff-valor"))), entrada=ed.tipo==="entrada", custo=entrada?r2(parseNum(v("#ff-custo"))):0;
        if(!desc){toast("Escreva uma descrição.");return}if(!valor){toast("Informe o valor.");return}if(custo>valor){toast("O custo não pode ser maior que o valor.");return}
        const cid=v("#ff-cli")||null, c=clientes().find(x=>x.id===cid);
        const campos={tipo:ed.tipo,descricao:desc,valor,custo,data:v("#ff-data")||hojeISO(),status:v("#ff-status"),categoria:v("#ff-cat").trim(),forma:v("#ff-forma").trim(),
          cliente_id:cid,cliente_nome:c?c.nome:v("#ff-clin").trim(),notas:v("#ff-notas").trim()};
        const bx=el.querySelector("#ff-boleto");if(bx)campos.boleto_em=bx.checked?(ed.boleto_em||new Date().toISOString()):null;
        // boleto anexado (código e/ou PDF)
        const vp=el.querySelector("#ff-vpago");if(vp)campos.valor_pago=vp.value.trim()?r2(parseNum(vp.value)):null;
        let novoBoleto=false;const linha=el.querySelector("#ff-linha"), arq=el.querySelector("#ff-bolpdf"), tira=el.querySelector("#ff-boltira");
        if(linha){campos.boleto_linha=linha.value.trim();if(campos.boleto_linha&&campos.boleto_linha!==(ed.boleto_linha||""))novoBoleto=true}
        if(tira&&tira.checked){campos.boleto_caminho=null;campos.boleto_nome=""}
        if(arq&&arq.files&&arq.files[0]){const f=arq.files[0];if(f.size>10485760){toast("O arquivo passa de 10 MB.");return}
          const ext=(f.name.split(".").pop()||"pdf").toLowerCase().replace(/[^a-z0-9]/g,"")||"pdf", cam=`${cid||ed.cliente_id}/boletos/${(crypto.randomUUID?crypto.randomUUID():Date.now())}.${ext}`;
          toast("Enviando o boleto…");const up=await sb.storage.from("documentos").upload(cam,f,{contentType:f.type||"application/pdf",upsert:false});
          if(up.error)return falha("enviar o boleto",up.error);campos.boleto_caminho=cam;campos.boleto_nome=f.name;novoBoleto=true}
        if(novoBoleto){campos.boleto_em=new Date().toISOString();campos.boleto_pedido_em=null}
        const avisar=novoBoleto&&el.querySelector("#ff-bolavisa")&&el.querySelector("#ff-bolavisa").checked&&campos.status==="previsto";
        const q=ed.id?sb.from("lancamentos").update(campos).eq("id",ed.id):sb.from("lancamentos").insert(campos);
        const {data,error}=await q.select().single();if(error)return falha("salvar o lançamento",error);
        const i=L.findIndex(x=>x.id===data.id);if(i>=0)L[i]=data;else L.unshift(data);L.sort((a,b)=>String(b.data).localeCompare(String(a.data)));
        const novo=!ed.id;if(novo&&String(data.data).slice(0,7)!==mes&&mes!=="tudo")mes=String(data.data).slice(0,7);
        fecharDlg();render();
        if(avisar){const r=await sb.rpc("cobranca_boleto_avisar",{p_lanc:data.id});toast(r.error?"Boleto salvo. O e-mail não saiu: "+r.error.message:r.data&&r.data.emails?(r.data.email_ativo?"Boleto salvo e enviado por e-mail ao cliente.":"Boleto salvo. O e-mail sai quando você ligar os e-mails em Avisos."):"Boleto salvo. O cliente já vê no portal (ele não tem e-mail cadastrado).")}
        else toast(novo?(entrada?"Entrada lançada.":"Saída lançada."):"Lançamento salvo.");ctx.mudou&&ctx.mudou();return}
      if(e.target.id==="rec-form"){
        const cid=v("#rf-cli")||null, c=clientes().find(x=>x.id===cid), nome=c?c.nome:v("#rf-clin").trim(), valor=r2(parseNum(v("#rf-valor")));
        if(!cid&&!nome){toast("Escolha o cliente ou escreva o nome.");return}if(!valor){toast("Informe o valor mensal.");return}
        const campos={cliente_id:cid,cliente_nome:nome,descricao:v("#rf-desc").trim()||"Plano mensal",valor,dia_vencimento:Math.min(31,Math.max(1,parseInt(v("#rf-dia"))||10)),
          forma:v("#rf-forma").trim()||"Boleto",aviso_dias:Math.min(30,Math.max(0,parseInt(v("#rf-aviso"))||0)),inicio:(v("#rf-ini")||hojeISO().slice(0,7))+"-01",ativo:el.querySelector("#rf-ativo").checked};
        const q=edR.id?sb.from("recorrencias").update(campos).eq("id",edR.id):sb.from("recorrencias").insert(campos);
        const {error}=await q.select().single();if(error)return falha("salvar o plano",error);
        const novo=!edR.id;fecharDlg();toast(novo?"Plano criado. As mensalidades já aparecem nos lançamentos.":"Plano salvo.");await carregar();ctx.mudou&&ctx.mudou();return}
    });

    carregar();
    return {recarregar:carregar};
  }
  window.GlaraFinanceiro={criar};
})();
