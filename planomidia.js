/* Hub de Marketing · Plano de mídia (só o administrador edita).
   Canais, verba, período e meta de cada linha; o PDF e o link do cliente saem de plano-midia.html. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const r2=v=>Math.round(N(v)*100)/100;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const parseNum=s=>{if(typeof s==="number")return s;s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
  const dmy=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m+"/"+y};
  const CANAIS=["Meta Ads (Instagram e Facebook)","Google Ads (pesquisa)","Google Ads (YouTube)","TikTok Ads","LinkedIn Ads","Impulsionamento de posts","Influenciadores","E-mail marketing","Rádio","Outdoor / mídia exterior","Panfletagem / impressos","Outro"];
  const OBJ=["Reconhecimento da marca","Alcance","Tráfego para o site","Mensagens no WhatsApp","Geração de leads","Vendas","Seguidores","Visualizações de vídeo","Engajamento"];
  const CORES=["#FF6B2C","#111111","#F59E0B","#2563EB","#16A34A","#8B5CF6","#DB2777","#0D9488","#6B7280","#0EA5E9","#B45309","#9CA3AF"];
  const corCanal=c=>CORES[Math.max(0,CANAIS.indexOf(c))%CORES.length];
  const linhaVazia=()=>({canal:CANAIS[0],formato:"",objetivo:OBJ[0],publico:"",inicio:"",fim:"",verba:0,meta:""});

  function criar(el,sb,ctx){
    let planos=[], atual=null, sujo=false;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const nomeCli=p=>{const c=clientes().find(x=>x.id===p.cliente_id);return p.cliente_nome||(c?c.nome:"")};
    const link=p=>new URL("plano-midia.html?t="+p.token,location.href).href;

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando os planos de mídia…</div>`;
      const {data,error}=await sb.from("planos_midia").select("*").order("atualizado_em",{ascending:false});
      if(error){el.innerHTML=`<div class="empty">${/planos_midia/.test(error.message||"")?"Rode o arquivo 13 do banco no Supabase para usar o plano de mídia.":esc(error.message)}</div>`;return}
      planos=data||[];if(ctx.abrirId){const p=planos.find(x=>x.id===ctx.abrirId);ctx.abrirId=null;if(p){abrir(p);return}}render();
    }
    function listaHTML(){
      return `<section class="card tk-head"><div class="head"><div><span class="eyebrow">Só você vê</span><h2>Planos de mídia</h2></div><button class="btn primary" data-pm="novo">+ Novo plano</button></div>
        <p class="note" style="margin:0">Monte a distribuição da verba por canal, período e meta. Sai em PDF com a sua marca e num link para o cliente.</p></section>
        <div class="orc-lista">${planos.map(p=>`<button type="button" class="orc-row" data-pm-id="${p.id}">
          <span class="orc-n">${(p.linhas||[]).length} canal${(p.linhas||[]).length===1?"":"is"}</span>
          <span class="orc-t"><b>${esc(nomeCli(p)||"Sem cliente")}</b><small>${esc(p.titulo)}${p.inicio?" · "+dmy(p.inicio)+(p.fim?" a "+dmy(p.fim):""):""}</small></span>
          <span class="orc-st">${p.publicado?'<span class="status ok">Link ativo</span>':'<span class="status pend">Rascunho</span>'}</span>
          <span class="orc-v"><b>${brl(N(p.verba_total)+N(p.taxa_gestao))}</b><small>mídia ${brl(p.verba_total)}</small></span></button>`).join("")||`<div class="empty">Nenhum plano de mídia ainda.</div>`}</div>`}
    function linhaHTML(l,k){
      return `<div class="pm-l" data-k="${k}" style="--pm:${corCanal(l.canal)}">
        <div class="pm-l-top"><span class="pm-n">${String(k+1).padStart(2,"0")}</span>
          <select data-c="canal" aria-label="Canal">${CANAIS.map(c=>`<option ${c===l.canal?"selected":""}>${esc(c)}</option>`).join("")}</select>
          <button type="button" class="tk-x" data-pm="rm" aria-label="Remover canal">✕</button></div>
        <div class="pm-l-grid">
          <div><label class="label">Formato / peças</label><input type="text" data-c="formato" value="${esc(l.formato)}" placeholder="Ex.: Reels e carrossel"></div>
          <div><label class="label">Objetivo</label><input type="text" data-c="objetivo" list="pm-obj" value="${esc(l.objetivo)}"></div>
          <div class="pm-largo"><label class="label">Público</label><input type="text" data-c="publico" value="${esc(l.publico)}" placeholder="Ex.: mães de 25 a 45 anos, Baixada Fluminense"></div>
          <div><label class="label">Início</label><input type="date" data-c="inicio" value="${esc(l.inicio||"")}"></div>
          <div><label class="label">Fim</label><input type="date" data-c="fim" value="${esc(l.fim||"")}"></div>
          <div><label class="label">Verba (R$)</label><input type="text" inputmode="decimal" data-c="verba" value="${N(l.verba)?N(l.verba).toLocaleString("pt-BR",{minimumFractionDigits:2}):""}" placeholder="0,00"></div>
          <div><label class="label">Meta</label><input type="text" data-c="meta" value="${esc(l.meta)}" placeholder="Ex.: 120 conversas"></div>
        </div></div>`}
    function resumoHTML(){
      const tot=atual.linhas.reduce((s,l)=>s+N(l.verba),0), taxa=N(atual.taxa_gestao), por={};
      atual.linhas.forEach(l=>{por[l.canal]=(por[l.canal]||0)+N(l.verba)});
      const ent=Object.entries(por).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
      return `<div class="pm-res" id="pm-res"><div class="pm-res-bar">${ent.map(([c,v])=>`<i style="width:${tot?v/tot*100:0}%;background:${corCanal(c)}" title="${esc(c)}: ${brl(v)}"></i>`).join("")}</div>
        <ul>${ent.map(([c,v])=>`<li><i style="background:${corCanal(c)}"></i>${esc(c)}<b>${brl(v)}</b><small>${tot?Math.round(v/tot*100):0}%</small></li>`).join("")||"<li>Coloque a verba de cada canal.</li>"}</ul>
        <div class="pm-tot"><span>Verba de mídia</span><b>${brl(tot)}</b></div>${taxa?`<div class="pm-tot"><span>Gestão</span><b>${brl(taxa)}</b></div>`:""}
        <div class="pm-tot t"><span>Investimento total</span><b>${brl(tot+taxa)}</b></div></div>`}
    function editorHTML(){
      const p=atual;
      return `<section class="card orc-ed">
        <div class="orc-ed-top"><button type="button" class="btn small ghost" data-pm="voltar">‹ Planos</button>
          <div class="orc-ed-tt"><span class="eyebrow">Plano de mídia</span><h2>${esc(nomeCli(p)||p.titulo||"Novo plano")}</h2></div>
          ${p.id?(p.publicado?'<span class="status ok">Link ativo</span>':'<span class="status pend">Rascunho</span>'):""}</div>
        <div class="orc-ed-grid"><div class="orc-ed-main">
          <fieldset class="orc-fs"><legend>Plano</legend><div class="grid2">
            <div><label class="label" for="pm-cli">Cliente</label><select id="pm-cli"><option value="">Outro</option>${clientes().map(c=>`<option value="${c.id}" ${p.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
            <div><label class="label" for="pm-cnome">Nome no plano</label><input type="text" id="pm-cnome" value="${esc(p.cliente_nome||"")}" placeholder="Usa o nome do cliente"></div>
            <div><label class="label" for="pm-tit">Título</label><input type="text" id="pm-tit" maxlength="120" value="${esc(p.titulo||"")}"></div>
            <div><label class="label" for="pm-taxa">Gestão (R$)</label><input type="text" inputmode="decimal" id="pm-taxa" value="${N(p.taxa_gestao)?N(p.taxa_gestao).toLocaleString("pt-BR",{minimumFractionDigits:2}):""}" placeholder="0,00"></div>
            <div><label class="label" for="pm-ini">Início</label><input type="date" id="pm-ini" value="${esc(p.inicio||"")}"></div>
            <div><label class="label" for="pm-fim">Fim</label><input type="date" id="pm-fim" value="${esc(p.fim||"")}"></div></div>
            <div><label class="label" for="pm-objetivo">Objetivo da campanha</label><textarea id="pm-objetivo" style="min-height:60px" placeholder="Ex.: gerar 300 conversas no WhatsApp para o atendimento de BPC">${esc(p.objetivo||"")}</textarea></div>
            <div><label class="label" for="pm-pub">Público principal</label><input type="text" id="pm-pub" value="${esc(p.publico||"")}"></div></fieldset>
          <fieldset class="orc-fs"><legend>Canais e verba</legend><div id="pm-linhas" class="pm-linhas">${p.linhas.map(linhaHTML).join("")}</div>
            <div class="orc-add"><button type="button" class="btn small" data-pm="add">+ Adicionar canal</button></div></fieldset>
          <fieldset class="orc-fs"><legend>Observações</legend><textarea id="pm-obs" style="min-height:70px" placeholder="Ex.: a verba é paga direto à plataforma, no cartão do cliente">${esc(p.observacoes||"")}</textarea></fieldset>
        </div>
        <aside class="orc-ed-side">${resumoHTML()}
          <div class="orc-acoes"><button type="button" class="btn primary" data-pm="salvar">Salvar</button><button type="button" class="btn" data-pm="pdf">Salvar e abrir o PDF</button>
            ${p.id?`<div class="orc-prop"><b>Link para o cliente</b>${p.publicado?`<div class="orc-prop-link"><input type="text" readonly value="${esc(link(p))}" id="pm-link" aria-label="Link do plano"><button type="button" class="btn small" data-pm="copiar">Copiar</button></div>
              <div class="orc-st-bts"><a class="btn small ghost" href="${esc(link(p))}" target="_blank" rel="noopener">Ver como o cliente</a><button type="button" class="btn small ghost" data-pm="pub" data-v="0">Desativar o link</button></div>`
              :`<p class="note">O cliente vê o plano numa página com a sua marca, sem precisar de senha.</p><button type="button" class="btn small" data-pm="pub" data-v="1">Ativar o link</button>`}</div>
            <div class="orc-st-bts"><button type="button" class="btn small ghost" data-pm="duplicar">Duplicar</button><button type="button" class="btn small danger" data-pm="apagar">Apagar</button></div>`:""}
          </div></aside></div></section>
        <datalist id="pm-obj">${OBJ.map(o=>`<option value="${esc(o)}">`).join("")}</datalist>`}
    function render(){el.innerHTML=atual?editorHTML():listaHTML()}
    function abrir(p){atual=JSON.parse(JSON.stringify(p));if(!atual.linhas||!atual.linhas.length)atual.linhas=[linhaVazia()];sujo=false;render();window.scrollTo({top:0})}
    function ler(){const v=s=>(el.querySelector(s)||{}).value||"";
      Object.assign(atual,{cliente_id:v("#pm-cli")||null,cliente_nome:v("#pm-cnome").trim(),titulo:v("#pm-tit").trim()||"Plano de mídia",taxa_gestao:r2(parseNum(v("#pm-taxa"))),
        inicio:v("#pm-ini")||null,fim:v("#pm-fim")||null,objetivo:v("#pm-objetivo").trim(),publico:v("#pm-pub").trim(),observacoes:v("#pm-obs").trim()});
      atual.linhas=[...el.querySelectorAll(".pm-l")].map(d=>{const g=c=>d.querySelector(`[data-c="${c}"]`).value;return {canal:g("canal"),formato:g("formato").trim(),objetivo:g("objetivo").trim(),publico:g("publico").trim(),inicio:g("inicio")||"",fim:g("fim")||"",verba:r2(parseNum(g("verba"))),meta:g("meta").trim()}})}
    async function salvar(extra){
      ler();if(!atual.cliente_id&&!atual.cliente_nome){toast("Escolha o cliente ou escreva o nome.");return null}
      const campos=Object.assign({cliente_id:atual.cliente_id,cliente_nome:atual.cliente_nome,titulo:atual.titulo,taxa_gestao:atual.taxa_gestao,inicio:atual.inicio,fim:atual.fim,
        objetivo:atual.objetivo,publico:atual.publico,observacoes:atual.observacoes,linhas:atual.linhas.filter(l=>l.canal&&(N(l.verba)||l.formato||l.meta))},extra||{});
      const q=atual.id?sb.from("planos_midia").update(campos).eq("id",atual.id):sb.from("planos_midia").insert(campos);
      const {data,error}=await q.select().single();if(error){falha("salvar o plano",error);return null}
      if(data.verba_total==null)data.verba_total=campos.linhas.reduce((s,l)=>s+N(l.verba),0);
      const i=planos.findIndex(x=>x.id===data.id);if(i>=0)planos[i]=data;else planos.unshift(data);atual=JSON.parse(JSON.stringify(data));if(!atual.linhas.length)atual.linhas=[linhaVazia()];sujo=false;render();return data}

    el.addEventListener("click",async e=>{
      const row=e.target.closest("[data-pm-id]");if(row){const p=planos.find(x=>x.id===row.dataset.pmId);if(p)abrir(p);return}
      const b=e.target.closest("[data-pm]");if(!b)return;const a=b.dataset.pm;
      if(a==="novo"){abrir({titulo:"Plano de mídia",linhas:[linhaVazia()],taxa_gestao:0});return}
      if(a==="voltar"){if(sujo&&b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Sair sem salvar?";return}atual=null;render();return}
      if(a==="add"){ler();atual.linhas.push(linhaVazia());render();const ls=el.querySelectorAll(".pm-l");ls[ls.length-1].querySelector("input").focus();sujo=true;return}
      if(a==="rm"){ler();atual.linhas.splice(+b.closest(".pm-l").dataset.k,1);if(!atual.linhas.length)atual.linhas.push(linhaVazia());render();sujo=true;return}
      if(a==="salvar"){const d=await salvar();if(d)toast("Plano salvo.");return}
      if(a==="pdf"){const w=window.open("","_blank");const d=await salvar();if(!d){w&&w.close();return}const u=new URL("plano-midia.html?id="+d.id,location.href).href;if(w)w.location=u;else location.href=u;return}
      if(a==="pub"){const d=await salvar({publicado:b.dataset.v==="1"});if(d)toast(d.publicado?"Link ativado. Copie e mande para o cliente.":"Link desativado.");return}
      if(a==="copiar"){const v=link(atual);try{await navigator.clipboard.writeText(v)}catch(_){const i=el.querySelector("#pm-link");i&&i.select();try{document.execCommand("copy")}catch(__){}}toast("Link copiado.");return}
      if(a==="duplicar"){ler();const c=JSON.parse(JSON.stringify(atual));["id","token","criado_em","atualizado_em","publicado"].forEach(k=>delete c[k]);c.titulo=c.titulo+" (cópia)";atual=c;sujo=true;render();toast("Cópia criada. Ajuste e salve.");return}
      if(a==="apagar"){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("planos_midia").delete().eq("id",atual.id);if(error)return falha("apagar",error);planos=planos.filter(x=>x.id!==atual.id);atual=null;render();toast("Plano apagado.");return}
    });
    el.addEventListener("input",e=>{if(!atual)return;sujo=true;if(e.target.dataset.c==="verba"||e.target.id==="pm-taxa"){ler();const r=el.querySelector("#pm-res"),t=document.createElement("div");t.innerHTML=resumoHTML();r.replaceWith(t.firstElementChild)}});
    el.addEventListener("change",e=>{if(!atual)return;sujo=true;if(e.target.dataset.c==="canal"){const l=e.target.closest(".pm-l");l.style.setProperty("--pm",corCanal(e.target.value));ler();const r=el.querySelector("#pm-res"),t=document.createElement("div");t.innerHTML=resumoHTML();r.replaceWith(t.firstElementChild)}});
    carregar();
    return {recarregar:carregar};
  }
  window.GlaraPlanoMidia={criar,CANAIS,corCanal};
})();
