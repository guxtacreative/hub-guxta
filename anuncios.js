/* Hub de Marketing · dashboard de investimento em anúncios (Meta Ads).
   Totais, indicadores com comparação, gráfico diário, campanhas, histórico por mês
   e trilha de auditoria com exportação em CSV.
   Usado pelo painel (admin.html), pelo portal (index.html) e pelo relatório. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const int=v=>Math.round(N(v)).toLocaleString("pt-BR");
  const pct=v=>(v*100).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
  const dm=iso=>{const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const quando=iso=>{if(!iso)return"";try{const d=new Date(iso);return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"})+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
  const parseMoeda=s=>{s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?Math.round(n*100)/100:0};
  const parseInteiro=s=>{const d=String(s??"").replace(/\D/g,"");return d?parseInt(d,10):0};
  const addDias=(iso,n)=>{const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

  function somar(rows){
    const t={inv:0,imp:0,alc:0,cli:0,res:0,rec:0,dias:new Set(rows.map(r=>r.data)).size,n:rows.length};
    rows.forEach(r=>{t.inv+=N(r.investimento);t.imp+=N(r.impressoes);t.alc+=N(r.alcance);t.cli+=N(r.cliques);t.res+=N(r.resultados);t.rec+=N(r.receita)});
    t.inv=Math.round(t.inv*100)/100;t.rec=Math.round(t.rec*100)/100;
    t.ctr=t.imp?t.cli/t.imp:null; t.cpc=t.cli?t.inv/t.cli:null; t.cpm=t.imp?t.inv/t.imp*1000:null; t.cpr=t.res?t.inv/t.res:null;
    t.roas=t.inv&&t.rec?t.rec/t.inv:null; t.roi=t.inv&&t.rec?(t.rec-t.inv)/t.inv:null; t.mediaDia=t.dias?t.inv/t.dias:null;
    return t;
  }
  function tipoPrincipal(rows){const c={};rows.forEach(r=>{const k=r.tipo_resultado||"Resultados";c[k]=(c[k]||0)+1});return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||"Resultados"}

  /* variação contra o período anterior: bom = verde, ruim = verde */
  function delta(atual,ant,menorMelhor){
    if(atual==null||ant==null||!isFinite(atual)||!isFinite(ant)||ant===0)return "";
    const v=(atual-ant)/Math.abs(ant);if(Math.abs(v)<0.005)return `<span class="dl eq">= igual</span>`;
    const bom=menorMelhor==null?null:menorMelhor?v<0:v>0;
    return `<span class="dl ${bom==null?"neutro":bom?"up":"down"}" title="Comparado com o período anterior">${v>0?"▲":"▼"} ${Math.abs(v*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%</span>`;
  }

  /* ---------- versão simples (relatório em PDF) ---------- */
  function resumoHTML(rows){
    const t=somar(rows), tipo=tipoPrincipal(rows);
    const k=(rot,val,sub)=>`<div class="kpi"><span class="kpi-t">${esc(rot)}</span><span class="kpi-v">${val}</span>${sub?`<span class="kpi-s">${sub}</span>`:""}</div>`;
    return `<div class="kpis">
      ${k("Investido",brl(t.inv),rows.length?`${t.dias} dias com anúncio`:"")}
      ${k(tipo,int(t.res),"Resultados no período")}
      ${k("Custo por resultado",t.cpr!=null?brl(t.cpr):"–","Investido ÷ resultados")}
      ${k("Impressões",int(t.imp),t.cpm!=null?"CPM "+brl(t.cpm):"")}
      ${k("Alcance",int(t.alc),"Soma dos dias")}
      ${k("Cliques no link",int(t.cli),(t.ctr!=null?"CTR "+pct(t.ctr):"")+(t.cpc!=null?" · CPC "+brl(t.cpc):""))}
      ${t.rec?k("Receita atribuída",brl(t.rec),t.roas!=null?"ROAS "+t.roas.toLocaleString("pt-BR",{maximumFractionDigits:2})+"x":""):""}
    </div>`;
  }
  function campanhasTabela(rows){
    const g={};rows.forEach(r=>{(g[r.campanha]=g[r.campanha]||[]).push(r)});
    const ks=Object.keys(g).sort((a,b)=>somar(g[b]).inv-somar(g[a]).inv);if(!ks.length)return "";
    return `<div class="table-scroll"><table class="bal ads">
      <thead><tr><th scope="col">Campanha</th><th scope="col">Investido</th><th scope="col">Resultados</th><th scope="col">Custo/result.</th><th scope="col">Cliques</th><th scope="col">CTR</th></tr></thead>
      <tbody>${ks.map(k=>{const t=somar(g[k]);return `<tr><th scope="row">${esc(k)}</th><td>${brl(t.inv)}</td><td>${int(t.res)}</td><td>${t.cpr!=null?brl(t.cpr):"–"}</td><td>${int(t.cli)}</td><td>${t.ctr!=null?pct(t.ctr):"–"}</td></tr>`}).join("")}</tbody>
    </table></div>`;
  }
  function graficoSimples(rows){return graficoHTML(rows)}
  function painelHTML(rows,opt){
    opt=opt||{};
    if(!rows.length)return `<div class="empty">${opt.admin?"Nenhum lançamento neste mês. Use o formulário acima.":"Ainda não há resultados de anúncios neste mês."}</div>`;
    return resumoHTML(rows)+graficoSimples(rows)+`<h3>Por campanha</h3>`+campanhasTabela(rows);
  }

  /* ---------- gráfico diário: barras = investimento, linha = resultados ---------- */
  function graficoHTML(rows){
    const dias={};rows.forEach(r=>{const d=dias[r.data]||(dias[r.data]={inv:0,res:0});d.inv+=N(r.investimento);d.res+=N(r.resultados)});
    const ks=Object.keys(dias).sort();if(!ks.length)return "";
    const maxI=Math.max(1,...ks.map(k=>dias[k].inv)), maxR=Math.max(1,...ks.map(k=>dias[k].res));
    const step=Math.max(26,Math.min(64,Math.floor(980/ks.length))), bw=Math.round(Math.min(step*0.56,30)), padL=8, W=Math.max(300,ks.length*step+padL*2), H=210, y0=170, alt=130;
    const cx=i=>padL+i*step+step/2;
    const barras=ks.map((k,i)=>{const d=dias[k],h=Math.max(2,d.inv/maxI*alt),x=cx(i)-bw/2,ult=i===ks.length-1;
      return `<g><title>${dm(k)}: ${brl(d.inv)} investidos · ${int(d.res)} resultados</title>
        <rect x="${x}" y="${y0-h}" width="${bw}" height="${h}" rx="4" class="${ult?"ch-bar-r":"ch-bar"}"/>
        ${(i%Math.ceil(ks.length/10)===0||ult)?`<text x="${cx(i)}" y="${y0+18}" class="ch-m">${dm(k)}</text>`:""}</g>`}).join("");
    const pts=ks.map((k,i)=>[cx(i),y0-6-dias[k].res/maxR*(alt-10)]);
    const linha=pts.length>1?`<polyline points="${pts.map(p=>p.map(n=>n.toFixed(1)).join(",")).join(" ")}" class="ch-line"/>`:"";
    const pontos=pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" class="ch-dot"><title>${dm(ks[i])}: ${int(dias[ks[i]].res)} resultados</title></circle>${dias[ks[i]].res&&(ks.length<=16||i===ks.length-1)?`<text x="${p[0].toFixed(1)}" y="${(p[1]-9).toFixed(1)}" class="ch-l">${int(dias[ks[i]].res)}</text>`:""}`).join("");
    return `<figure class="chart"><figcaption class="ch-leg"><span><i class="lg-bar"></i>Investimento por dia</span><span><i class="lg-line"></i>Resultados por dia</span></figcaption>
      <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" class="ch-fluid" style="min-width:${Math.max(300,ks.length*30)}px" role="img" aria-label="Investimento diário em barras e resultados em linha">
      <line x1="0" x2="${W}" y1="${y0}" y2="${y0}" class="ch-axis"/>${barras}${linha}${pontos}</svg></div></figure>`;
  }

  /* ---------- dashboard completo ---------- */
  const PERIODOS=[["mes","Mês inteiro"],["15","Últimos 15 dias"],["7","Últimos 7 dias"]];
  function filtrar(rows,st){
    let r=rows;if(st.camp)r=r.filter(x=>x.campanha===st.camp);
    if(st.periodo!=="mes"&&r.length){const fim=r.reduce((m,x)=>x.data>m?x.data:m,"");const n=+st.periodo;
      const ini=addDias(fim,-(n-1)), antIni=addDias(fim,-(2*n-1)), antFim=addDias(fim,-n);
      return {atual:r.filter(x=>x.data>=ini),anterior:r.filter(x=>x.data>=antIni&&x.data<=antFim),rotulo:`${dm(ini)} a ${dm(fim)}`,comp:`vs. ${dm(antIni)} a ${dm(antFim)}`}}
    return {atual:r,anterior:null,rotulo:"",comp:""};
  }
  function kpisHTML(t,a,tipo,opt){
    const k=(rot,val,sub,dl,cls)=>`<div class="kpi${cls?" "+cls:""}"><span class="kpi-t">${esc(rot)}</span><span class="kpi-v">${val}</span><span class="kpi-s">${sub||""} ${dl||""}</span></div>`;
    const A=a||{};
    return `<div class="kpis kpis-dash">
      ${k("Investido",brl(t.inv),t.dias?`${t.dias} dias · média ${brl(t.mediaDia)}/dia`:"",delta(t.inv,A.inv,null),"destaque")}
      ${k(tipo,int(t.res),"resultados",delta(t.res,A.res,false))}
      ${k("Custo por resultado",t.cpr!=null?brl(t.cpr):"–","investido ÷ resultados",delta(t.cpr,A.cpr,true))}
      ${k("CTR",t.ctr!=null?pct(t.ctr):"–","cliques ÷ impressões",delta(t.ctr,A.ctr,false))}
      ${k("CPC",t.cpc!=null?brl(t.cpc):"–","custo por clique",delta(t.cpc,A.cpc,true))}
      ${k("CPM",t.cpm!=null?brl(t.cpm):"–","custo por mil impressões",delta(t.cpm,A.cpm,true))}
      ${k("Impressões",int(t.imp),`alcance somado ${int(t.alc)}`,delta(t.imp,A.imp,false))}
      ${k("Cliques no link",int(t.cli),"",delta(t.cli,A.cli,false))}
      ${t.rec?k("Receita atribuída",brl(t.rec),"informada pela equipe",delta(t.rec,A.rec,false),"verde"):""}
      ${t.rec?k("ROAS",t.roas.toLocaleString("pt-BR",{maximumFractionDigits:2})+"x",`retorno de ${brl(t.roas)} por R$ 1`,delta(t.roas,A.roas,false),"verde"):""}
      ${t.rec?k("ROI",(t.roi*100).toLocaleString("pt-BR",{maximumFractionDigits:0})+"%","(receita − investido) ÷ investido",delta(t.roi,A.roi,false),t.roi>=0?"verde":""):""}
    </div>`;
  }
  function campanhasHTML(rows){
    const g={};rows.forEach(r=>{(g[r.campanha]=g[r.campanha]||[]).push(r)});
    const ks=Object.keys(g).sort((a,b)=>somar(g[b]).inv-somar(g[a]).inv);if(!ks.length)return "";
    const tot=somar(rows).inv||1, cprs=ks.map(k=>somar(g[k]).cpr).filter(v=>v!=null), melhor=cprs.length>1?Math.min(...cprs):null;
    return `<div class="camp-list">${ks.map(k=>{const t=somar(g[k]),sh=t.inv/tot;
      return `<div class="camp"><div class="camp-top"><b>${esc(k)}</b>${melhor!=null&&t.cpr===melhor?'<span class="camp-tag">Menor custo por resultado</span>':""}<span>${brl(t.inv)} · ${pct(sh)}</span></div>
        <div class="bar"><i style="width:${(sh*100).toFixed(1)}%"></i></div>
        <div class="camp-m"><span><b>${int(t.res)}</b> resultados</span><span>Custo/result. <b>${t.cpr!=null?brl(t.cpr):"–"}</b></span><span>CTR <b>${t.ctr!=null?pct(t.ctr):"–"}</b></span><span>CPC <b>${t.cpc!=null?brl(t.cpc):"–"}</b></span>${t.rec?`<span>ROAS <b>${t.roas.toLocaleString("pt-BR",{maximumFractionDigits:2})}x</b></span>`:""}</div></div>`}).join("")}</div>`;
  }
  function mesesHTML(meses){
    if(!meses||meses.length<1)return "";
    let acum=0;
    const linhas=meses.map(m=>{acum+=N(m.inv);const cpr=N(m.res)?N(m.inv)/N(m.res):null;
      return `<tr><th scope="row">${esc(m.titulo)}</th><td>${brl(m.inv)}</td><td>${int(m.res)}</td><td>${cpr!=null?brl(cpr):"–"}</td><td>${N(m.receita)?brl(m.receita):"–"}</td><td>${brl(acum)}</td></tr>`}).join("");
    const tot=meses.reduce((s,m)=>s+N(m.inv),0), tres=meses.reduce((s,m)=>s+N(m.res),0), trec=meses.reduce((s,m)=>s+N(m.receita),0);
    return `<section class="dash-sec"><h3>Histórico do investimento</h3>
      <div class="kpis kpis-mini"><div class="kpi"><span class="kpi-t">Investido desde o início</span><span class="kpi-v">${brl(tot)}</span><span class="kpi-s">${meses.length} ${meses.length>1?"meses":"mês"}</span></div>
      <div class="kpi"><span class="kpi-t">Resultados somados</span><span class="kpi-v">${int(tres)}</span><span class="kpi-s">custo médio ${tres?brl(tot/tres):"–"}</span></div>
      ${trec?`<div class="kpi verde"><span class="kpi-t">Receita atribuída</span><span class="kpi-v">${brl(trec)}</span><span class="kpi-s">ROAS ${(trec/tot).toLocaleString("pt-BR",{maximumFractionDigits:2})}x</span></div>`:""}</div>
      <div class="table-scroll"><table class="bal ads"><thead><tr><th scope="col">Mês</th><th scope="col">Investido</th><th scope="col">Resultados</th><th scope="col">Custo/result.</th><th scope="col">Receita</th><th scope="col">Acumulado</th></tr></thead><tbody>${linhas}</tbody></table></div></section>`;
  }
  function auditoriaHTML(rows,t,opt){
    const rs=rows.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(a.campanha).localeCompare(String(b.campanha)));
    if(!rs.length)return "";
    const conf=Math.abs(rs.reduce((s,r)=>s+N(r.investimento),0)-t.inv)<0.01;
    return `<details class="dash-sec audit" ${opt.admin?"open":""}><summary>Trilha de auditoria · ${rs.length} lançamentos</summary>
      <p class="note">Cada número vem do Gerenciador de Anúncios da Meta e é lançado pela equipe, dia a dia e por campanha, com data e hora do lançamento. ${conf?'<span class="ok-txt">✓ Conferido: a soma dos lançamentos bate com o total exibido.</span>':""}</p>
      <div class="actions"><button class="btn small outline" data-ga="csv">Baixar planilha (CSV)</button></div>
      <div class="table-scroll"><table class="bal ads audit-t">
      <thead><tr><th scope="col">Dia</th><th scope="col">Campanha</th><th scope="col">Investido</th><th scope="col">Impressões</th><th scope="col">Alcance</th><th scope="col">Cliques</th><th scope="col">Resultados</th><th scope="col">Receita</th><th scope="col">Lançado em</th>${opt.admin?'<th scope="col"><span class="sr">Ações</span></th>':""}</tr></thead>
      <tbody>${rs.map(r=>{const ed=r.atualizado_em&&r.criado_em&&new Date(r.atualizado_em)-new Date(r.criado_em)>5000;
        return `<tr><th scope="row">${dm(r.data)}</th><td style="text-align:left">${esc(r.campanha)}</td><td>${brl(r.investimento)}</td><td>${int(r.impressoes)}</td><td>${int(r.alcance)}</td><td>${int(r.cliques)}</td><td>${int(r.resultados)} <small class="note">${esc(r.tipo_resultado)}</small></td><td>${N(r.receita)?brl(r.receita):"–"}</td><td><small>${quando(r.criado_em)}${ed?`<br>editado ${quando(r.atualizado_em)}`:""}</small></td>${opt.admin?`<td><button class="btn small danger" data-act="apagar-anuncio" data-id="${r.id}" aria-label="Apagar lançamento">✕</button></td>`:""}</tr>`}).join("")}</tbody>
      </table></div></details>`;
  }
  function csv(rows,nome){
    const f2=v=>N(v).toFixed(2).replace(".",","), q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
    const cab=["Dia","Campanha","Investido (R$)","Impressões","Alcance","Cliques no link","Resultados","Tipo de resultado","Receita atribuída (R$)","Lançado em","Atualizado em"];
    const linhas=rows.slice().sort((a,b)=>String(a.data).localeCompare(String(b.data))).map(r=>[r.data,q(r.campanha),f2(r.investimento),N(r.impressoes),N(r.alcance),N(r.cliques),N(r.resultados),q(r.tipo_resultado),f2(r.receita),q(quando(r.criado_em)),q(quando(r.atualizado_em))].join(";"));
    const blob=new Blob(["﻿"+cab.join(";")+"\n"+linhas.join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(nome||"anuncios")+".csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
  }

  /* monta o dashboard num elemento e cuida dos filtros */
  function montar(el,rows,opt){
    opt=opt||{};
    const st=el.__ga||(el.__ga={periodo:"mes",camp:""});
    el.__gaRows=rows;el.__gaOpt=opt;
    const desenhar=()=>{
      const rows=el.__gaRows||[], opt=el.__gaOpt||{};
      if(!rows.length){el.innerHTML=`<div class="empty">${opt.admin?"Nenhum lançamento neste mês. Use o formulário acima.":"Ainda não há resultados de anúncios neste mês."}</div>`+mesesHTML(opt.meses&&opt.meses.length>1?opt.meses:null);return}
      const camps=[...new Set(rows.map(r=>r.campanha))].sort();if(st.camp&&!camps.includes(st.camp))st.camp="";
      const f=filtrar(rows,st), t=somar(f.atual), a=f.anterior&&f.anterior.length?somar(f.anterior):null, tipo=tipoPrincipal(f.atual.length?f.atual:rows);
      const ultimo=rows.reduce((m,r)=>{const v=r.atualizado_em||r.criado_em||"";return v>m?v:m},"");
      el.innerHTML=`<div class="dash-top">
          <div class="live${opt.ao_vivo?" on":""}"><i aria-hidden="true"></i><span>${opt.ao_vivo?"Ao vivo":"Atualizado"} · último lançamento em ${quando(ultimo)||"–"}</span></div>
          <div class="dash-filtros">
            <div class="seg" role="group" aria-label="Período">${PERIODOS.map(([k,n])=>`<button type="button" data-ga="periodo" data-v="${k}" aria-pressed="${st.periodo===k}">${n}</button>`).join("")}</div>
            ${camps.length>1?`<select data-ga="camp" aria-label="Campanha"><option value="">Todas as campanhas</option>${camps.map(c=>`<option ${st.camp===c?"selected":""}>${esc(c)}</option>`).join("")}</select>`:""}
          </div></div>
        ${f.rotulo?`<p class="note dash-per">Período: <b>${f.rotulo}</b> · ${a?`comparado com ${f.comp.replace("vs. ","")}`:"sem dados do período anterior para comparar"}</p>`:""}
        ${kpisHTML(t,a,tipo,opt)}
        <section class="dash-sec">${graficoHTML(f.atual)}</section>
        <section class="dash-sec"><h3>Onde o dinheiro foi investido</h3>${campanhasHTML(f.atual)}</section>
        ${opt.meses&&opt.meses.length?mesesHTML(opt.meses):""}
        ${auditoriaHTML(f.atual,t,opt)}`;
    };
    if(!el.__gaLigado){el.__gaLigado=true;
      el.addEventListener("click",e=>{const b=e.target.closest("[data-ga]");if(!b)return;
        if(b.dataset.ga==="periodo"){st.periodo=b.dataset.v;desenhar()}
        if(b.dataset.ga==="csv"){csv(filtrar(el.__gaRows||[],st).atual,(el.__gaOpt||{}).arquivo||"anuncios")}});
      el.addEventListener("change",e=>{if(e.target.dataset.ga==="camp"){st.camp=e.target.value;desenhar()}});
    }
    desenhar();
  }

  /* ---------- verba (saldo) e situação das campanhas ---------- */
  const ST_CAMP={ativa:["Ativa","on"],pausada:["Pausada","pause"],encerrada:["Encerrada","off"],agendada:["Agendada","sched"]};
  const dataBR=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m+"/"+y};
  function verbaHTML(V,opt){
    opt=opt||{};if(!V)return "";
    const ap=N(V.aportado), gs=N(V.gasto), sd=N(V.saldo), md=N(V.media_dia), st=V.status||"ok";
    const usoPct=ap>0?Math.min(1,Math.max(0,gs/ap)):0;
    const dur=V.dias!=null&&sd>0?`${int(V.dias)} dia${N(V.dias)===1?"":"s"}`:sd>0?"–":"0 dias";
    const avisos={
      acabou:["A verba acabou","As campanhas param de rodar quando o saldo chega ao fim. Adicione mais verba para continuar aparecendo."],
      baixo:["A verba está acabando",`Pelo ritmo atual (${brl(md)} por dia), o saldo dura mais uns ${dur}. Adicione mais verba para as campanhas não pararem.`],
      sem_verba:["Nenhuma verba registrada ainda",opt.admin?"Registre a verba que o cliente colocou para acompanhar o saldo.":"Assim que a verba for adicionada, o saldo aparece aqui."]};
    const av=avisos[st];
    const pend=V.pendente&&opt.portal?`<div class="vb-pend"><span>Você tem um pedido de <b>${brl(V.pendente.valor)}</b> de verba aguardando pagamento.</span><a class="btn small primary" href="pagar.html?t=${esc(V.pendente.token)}">Pagar agora</a></div>`:"";
    const pedir=opt.portal&&V.pedir?`<div class="vb-pedir" id="vb-pedir"><span class="label">Adicionar verba</span>
        <div class="vb-chips">${[300,500,1000,2000].map(v=>`<button type="button" class="chip" data-verba="v" data-v="${v}">${brl(v).replace(",00","")}</button>`).join("")}</div>
        <div class="vb-pedir-row"><input type="text" inputmode="decimal" id="vb-valor" placeholder="Outro valor (R$)" aria-label="Valor da verba em reais"><button type="button" class="btn primary" data-verba="pedir">Gerar pagamento</button></div>
        <small class="note">Você paga por Pix, cartão ou boleto. Assim que o pagamento é confirmado, a verba entra no saldo.</small></div>`:"";
    const camps=(V.campanhas||[]).filter(c=>opt.admin||c.status!=="encerrada"||N(c.gasto)>0);
    return `<section class="vb vb-${st}">
      <div class="vb-head"><h3>Verba dos anúncios</h3>${V.ultimo_dia?`<span class="note">Atualizado até ${dataBR(V.ultimo_dia)}</span>`:""}</div>
      ${av?`<div class="vb-alerta vb-a-${st}" role="${st==="ok"?"status":"alert"}"><b>${esc(av[0])}</b><span>${esc(av[1])}</span></div>`:""}
      ${pend}
      <div class="kpis kpis-dash vb-kpis">
        <div class="kpi"><span class="kpi-t">Verba adicionada</span><span class="kpi-v">${brl(ap)}</span><span class="kpi-s">${(V.aportes||[]).length} ${(V.aportes||[]).length===1?"aporte":"aportes"}</span></div>
        <div class="kpi"><span class="kpi-t">Já usado</span><span class="kpi-v">${brl(gs)}</span><span class="kpi-s">${ap?pct(usoPct)+" da verba":""}</span></div>
        <div class="kpi destaque"><span class="kpi-t">Saldo</span><span class="kpi-v ${sd<=0?"neg":""}">${brl(sd)}</span><span class="kpi-s">${md?`média de ${brl(md)} por dia`:"sem gasto recente"}</span></div>
        <div class="kpi"><span class="kpi-t">Dura cerca de</span><span class="kpi-v">${dur}</span><span class="kpi-s">no ritmo dos últimos 7 dias</span></div>
      </div>
      ${ap?`<div class="vb-barra" role="img" aria-label="Usado ${pct(usoPct)} da verba"><i style="width:${(usoPct*100).toFixed(1)}%"></i></div>`:""}
      ${pedir}
      ${camps.length?`<h4 class="vb-sub">Campanhas</h4><div class="vb-camps">${camps.map(c=>{const s=ST_CAMP[c.status]||ST_CAMP.ativa;
        return `<div class="vb-camp"><div class="vb-camp-t"><b>${esc(c.nome)}</b><span class="vb-st vb-st-${s[1]}">${s[0]}</span></div>
          <div class="vb-camp-m">${c.orcamento_dia?`<span>Orçamento <b>${brl(c.orcamento_dia)}/dia</b></span>`:""}${c.inicio?`<span>Início <b>${dataBR(c.inicio)}</b></span>`:""}${c.fim?`<span>Término <b>${dataBR(c.fim)}</b></span>`:""}
            <span>Usado <b>${brl(c.gasto)}</b></span>${N(c.gasto_7)?`<span>Últimos 7 dias <b>${brl(c.gasto_7)}</b></span>`:""}${N(c.resultados)?`<span><b>${int(c.resultados)}</b> resultados</span>`:""}</div></div>`}).join("")}</div>`:""}
      ${(V.aportes||[]).length?`<details class="vb-aportes"><summary>Histórico da verba</summary><ul>${V.aportes.map(a=>`<li><span>${dataBR(a.data)}</span><span>${esc(a.descricao||"Verba adicionada")}</span><b class="${N(a.valor)<0?"neg":""}">${brl(a.valor)}</b>${opt.admin?`<button type="button" class="btn small danger" data-vb="apagar" data-id="${esc(a.id)}" aria-label="Apagar aporte">✕</button>`:""}</li>`).join("")}</ul></details>`:""}
    </section>`;
  }

  window.GlaraAnuncios={painelHTML,montar,somar,parseMoeda,parseInteiro,brl,csv,verbaHTML,ST_CAMP};
})();
