/* Hub de Marketing · Minhas tarefas (só o administrador vê).
   Quadro com A fazer / Fazendo / Aguardando / Feito, checklist por tarefa,
   prazos, prioridade e valor para orçamentos. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const dm=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const brl=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const parseMoeda=s=>{s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return null;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?Math.round(n*100)/100:null};

  const ICO={
    "Orçamento":'<path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/>',
    "Identidade visual":'<path d="M12 20l7-7a3 3 0 0 0-4.2-4.2l-7 7L7 20z"/><path d="M14 8l2 2M4 20h4"/>',
    "Gráfica":'<path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>',
    "Conteúdo":'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    "Site":'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
    "Tráfego":'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    "Reunião":'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    "Financeiro":'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
    "Outro":'<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>'
  };
  const CATS={
    "Orçamento":{cor:"#F59E0B",etapas:["Entender o pedido (briefing)","Calcular horas e custos","Montar a proposta","Enviar ao cliente","Fazer follow-up","Resposta: aprovado ou recusado"]},
    "Identidade visual":{cor:"#8B5CF6",etapas:["Briefing e questionário","Pesquisa e moodboard","Rascunhos e conceito","Apresentação ao cliente","Ajustes","Manual da marca","Entrega dos arquivos finais"]},
    "Gráfica":{cor:"#0EA5E9",etapas:["Arte final aprovada pelo cliente","Conferir medidas, sangria e CMYK","Orçar com a gráfica","Enviar o arquivo (PDF de impressão)","Aprovar a prova","Produção","Retirar e entregar"]},
    "Conteúdo":{cor:"#2383E2",etapas:["Pauta","Texto","Design ou edição","Revisão","Agendar"]},
    "Site":{cor:"#2563EB",etapas:["Briefing","Estrutura das páginas","Layout","Desenvolvimento","Testes no celular","Publicação"]},
    "Tráfego":{cor:"#16A34A",etapas:["Objetivo e verba","Criativos","Público","Subir a campanha","Acompanhar e otimizar"]},
    "Reunião":{cor:"#2383E2",etapas:["Confirmar horário","Preparar a pauta","Reunião","Enviar o resumo"]},
    "Financeiro":{cor:"#0D9488",etapas:["Emitir cobrança","Enviar ao cliente","Confirmar pagamento"]},
    "Outro":{cor:"#6B7280",etapas:[]}
  };
  const COLS=[["ideia","Ideias"],["a_fazer","A fazer"],["fazendo","Em produção"],["aguardando","Aprovação / retorno"],["feito","Concluído"]];
  // etiquetas: cada nome sempre ganha a mesma cor
  const CORES_ET=[["#E7F3FD","#2383E2"],["#FFEDD5","#9A4A00"],["#FEF3C7","#8A6100"],["#DCFCE7","#166534"],["#DBEAFE","#1E40AF"],["#EDE9FE","#5B21B6"],["#FCE7F3","#1B6EC2"],["#E0F2FE","#075985"]];
  const corEt=t=>{let h=0;for(const ch of String(t).toLowerCase())h=(h*31+ch.charCodeAt(0))>>>0;return CORES_ET[h%CORES_ET.length]};
  const etHTML=t=>{const [bg,fg]=corEt(t);return `<span class="tk-et" style="--et-bg:${bg};--et-fg:${fg}">${esc(t)}</span>`};
  const iniciais=n=>String(n||"").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("");
  const corPessoa=n=>corEt("p:"+n)[1];
  const PRI={alta:"Alta",media:"Média",baixa:"Baixa"};
  const icone=c=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[c]||ICO.Outro}</svg>`;

  function prazoInfo(t){
    if(!t.prazo||t.status==="feito")return t.prazo?{cls:"",txt:dm(t.prazo)}:null;
    const h=hojeISO();
    if(t.prazo<h)return {cls:"late",txt:"Atrasada · "+dm(t.prazo)};
    if(t.prazo===h)return {cls:"today",txt:"Hoje"};
    const d=(new Date(t.prazo+"T12:00")-new Date(h+"T12:00"))/864e5;
    return {cls:d<=3?"soon":"",txt:d===1?"Amanhã":dm(t.prazo)};
  }
  const progresso=t=>{const l=t.checklist||[];const f=l.filter(i=>i.ok).length;return {f,n:l.length,pc:l.length?Math.round(f/l.length*100):0}};

  function criar(el,sb,ctx){
    let tarefas=[], filtro="todas", busca="", cliF="", verFeitas=false, editando=null, modelos=[], pessoa="", arrastando=null;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>ctx.clientes()||[];
    const nomeCliente=t=>{const c=clientes().find(x=>x.id===t.cliente_id);return c?c.nome:(t.cliente_nome||"")};

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando suas tarefas…</div>`;
      const {data,error}=await sb.from("tarefas").select("*").order("prazo",{nullsFirst:false}).order("criado_em");
      if(error){el.innerHTML=`<div class="empty">Não consegui carregar as tarefas. ${/tarefas/.test(error.message||"")?"Rode o arquivo 05 do banco no Supabase.":esc(error.message)}</div>`;return}
      tarefas=data;render();
      const m=await sb.from("checklist_modelos").select("*").order("nome");if(!m.error)modelos=m.data||[];
    }
    function resumoHTML(){
      const ab=tarefas.filter(t=>t.status!=="feito"), h=hojeISO();
      const sem=new Date(h+"T12:00");sem.setDate(sem.getDate()+7);const semISO=sem.toISOString().slice(0,10);
      const mes=h.slice(0,7);
      const late=ab.filter(t=>t.prazo&&t.prazo<h).length, hoje=ab.filter(t=>t.prazo===h).length, semana=ab.filter(t=>t.prazo&&t.prazo>h&&t.prazo<=semISO).length;
      const feitasMes=tarefas.filter(t=>t.status==="feito"&&String(t.concluido_em||"").slice(0,7)===mes).length;
      const orc=ab.filter(t=>t.categoria==="Orçamento");const valor=orc.reduce((s,t)=>s+(Number(t.valor)||0),0);
      const k=(cls,n,t,s)=>`<div class="tk-kpi ${cls}"><b>${n}</b><span>${t}</span>${s?`<small>${s}</small>`:""}</div>`;
      return `<div class="tk-kpis">
        ${k(late?"late":"",late,"Atrasadas",late?"resolva primeiro":"nada atrasado")}
        ${k(hoje?"today":"",hoje,"Para hoje","")}
        ${k("",semana,"Próximos 7 dias","")}
        ${k("",ab.length,"Em aberto",ab.filter(t=>t.status==="aguardando").length+" aguardando retorno")}
        ${k("ok",feitasMes,"Feitas no mês","")}
        ${k("money",orc.length,"Orçamentos abertos",valor?brl(valor)+" em propostas":"")}
      </div>${cargaHTML(ab)}`;
    }
    function cargaHTML(ab){
      const m={};ab.filter(t=>t.status!=="ideia").forEach(t=>{const r=(t.responsavel||"").trim();if(!r)return;m[r]=(m[r]||0)+1});
      const ls=Object.entries(m).sort((a,b)=>b[1]-a[1]);if(!ls.length)return "";
      const max=ls[0][1];
      return `<div class="tk-carga"><span class="label">Quem está com mais demandas</span><div class="tk-carga-ls">${ls.map(([n,q])=>`<button type="button" class="tk-carga-i" data-tk-pessoa="${esc(n)}" aria-pressed="${pessoa===n}"><span class="tk-av" style="--av:${corPessoa(n)}">${esc(iniciais(n))}</span><b>${esc(n)}</b><span class="tk-carga-bar"><i style="width:${Math.round(q/max*100)}%"></i></span><small>${q}</small></button>`).join("")}</div></div>`}
    function filtrosHTML(){
      const cont=c=>tarefas.filter(t=>t.status!=="feito"&&(c==="todas"||t.categoria===c)).length;
      const usadas=Object.keys(CATS).filter(c=>cont(c)||c===filtro);
      return `<div class="tk-bar">
        <div class="summary" role="group" aria-label="Filtrar por tipo">
          <button class="chip" data-tk-f="todas" aria-pressed="${filtro==="todas"}">Todas <b>${cont("todas")}</b></button>
          ${usadas.map(c=>`<button class="chip" data-tk-f="${esc(c)}" aria-pressed="${filtro===c}"><i class="tk-dot" style="background:${CATS[c].cor}"></i>${esc(c)} <b>${cont(c)}</b></button>`).join("")}
        </div>
        <div class="tk-tools">
          ${pessoa?`<button type="button" class="chip" data-tk-pessoa="" aria-pressed="true">${esc(pessoa)} ✕</button>`:""}
          <select id="tk-fcli" aria-label="Filtrar por cliente"><option value="">Todos os clientes</option>${clientes().filter(c=>c.ativo!==false).map(c=>`<option value="${esc(c.id)}" ${cliF===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select>
          <input type="search" id="tk-busca" placeholder="Buscar tarefa, cliente ou etiqueta" value="${esc(busca)}" aria-label="Buscar tarefa">
          <label class="check"><input type="checkbox" id="tk-feitas" ${verFeitas?"checked":""}> Mostrar feitas</label>
        </div>
      </div>`;
    }
    function cardHTML(t){
      const c=CATS[t.categoria]||CATS.Outro, p=prazoInfo(t), g=progresso(t), cli=nomeCliente(t);
      const prox={ideia:"a_fazer",a_fazer:"fazendo",fazendo:"aguardando",aguardando:"feito"}[t.status];
      return `<article class="tk-card${t.status==="feito"?" done":""}${t.capa?" com-capa":""}" style="--cat:${c.cor}" data-tk="${t.id}" draggable="true">
        ${t.capa?`<button type="button" class="tk-capa" data-tk-act="abrir" aria-label="Abrir ${esc(t.titulo)}"><img src="${esc(t.capa)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></button>`:""}
        <div class="tk-top">
          <span class="tk-cat">${icone(t.categoria)}${esc(t.categoria)}</span>
          ${t.prioridade==="alta"?'<span class="tk-pri" title="Prioridade alta">Alta</span>':""}
          <button class="tk-check" data-tk-act="feito" aria-label="${t.status==="feito"?"Reabrir tarefa":"Marcar como feita"}" aria-pressed="${t.status==="feito"}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg></button>
        </div>
        <button class="tk-title" data-tk-act="abrir">${esc(t.titulo)}</button>
        ${cli?`<span class="tk-cli">${(()=>{const c=clientes().find(x=>x.id===t.cliente_id);const ini=String(cli).trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();return `<i class="tk-cli-av" style="${c&&/^#[0-9a-f]{3,8}$/i.test(c.cor_destaque||"")?"background:"+c.cor_destaque:""}" aria-hidden="true">${esc(ini)}</i>`})()}${esc(cli)}</span>`:""}
        ${(t.etiquetas||[]).length?`<div class="tk-ets">${t.etiquetas.map(etHTML).join("")}</div>`:""}
        ${t.pedido_id?`<button type="button" class="tk-ped" data-tk-act="pedido" data-cli="${esc(t.cliente_id||"")}" title="Abrir o pedido na página do cliente">Pedido do cliente ↗</button>`:""}
        ${g.n?`<div class="tk-prog" title="${g.f} de ${g.n} etapas"><div class="bar"><i style="width:${g.pc}%"></i></div><small>${g.f}/${g.n}</small></div>`:""}
        <div class="tk-foot">
          ${p?`<span class="tk-prazo ${p.cls}">${esc(p.txt)}</span>`:`<span class="tk-prazo">Sem prazo</span>`}
          ${t.valor!=null&&t.categoria==="Orçamento"?`<span class="tk-valor">${brl(t.valor)}</span>`:""}
          ${t.responsavel?`<span class="tk-av" style="--av:${corPessoa(t.responsavel)}" title="Responsável: ${esc(t.responsavel)}">${esc(iniciais(t.responsavel))}</span>`:""}
          ${prox?`<button class="tk-move" data-tk-act="mover" data-para="${prox}" title="Mover para ${COLS.find(x=>x[0]===prox)[1]}" aria-label="Mover para ${COLS.find(x=>x[0]===prox)[1]}">→</button>`:""}
        </div>
      </article>`;
    }
    function quadroHTML(){
      const q=busca.trim().toLowerCase();
      const vis=tarefas.filter(t=>(filtro==="todas"||t.categoria===filtro)&&(!cliF||t.cliente_id===cliF)&&(!pessoa||(t.responsavel||"").trim()===pessoa)
        &&(!q||(t.titulo+" "+nomeCliente(t)+" "+t.notas+" "+(t.responsavel||"")+" "+(t.etiquetas||[]).join(" ")).toLowerCase().includes(q)));
      const ordem=(a,b)=>{const pa=a.prazo||"9999",pb=b.prazo||"9999";const pr={alta:0,media:1,baixa:2};return pa.localeCompare(pb)||pr[a.prioridade]-pr[b.prioridade]};
      const cols=COLS.filter(([k])=>k!=="feito"||verFeitas);
      return `<div class="tk-board" style="--cols:${cols.length}">${cols.map(([k,nome])=>{
        let ls=vis.filter(t=>t.status===k).sort(ordem);if(k==="feito")ls=ls.sort((a,b)=>String(b.concluido_em).localeCompare(String(a.concluido_em))).slice(0,30);
        return `<section class="tk-col" data-col="${k}"><header><h3>${nome}</h3><span class="tk-n">${ls.length}</span></header>
          <div class="tk-list">${ls.map(cardHTML).join("")||`<p class="tk-vazio">${k==="ideia"?"Anote ideias aqui e arraste quando for produzir.":k==="a_fazer"?"Nada por aqui. Crie uma tarefa.":"Vazio"}</p>`}</div>
          ${k==="feito"?"":`<button type="button" class="tk-add-ideia tk-add-col" data-tk-act="nova-col" data-col="${k}">+ ${k==="ideia"?"Nova ideia":"Nova demanda"}</button>`}</section>`}).join("")}</div>`;
    }
    function render(){
      el.innerHTML=`<section class="card tk-head">
          <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Minhas tarefas</h2></div>
            <button class="btn primary" data-tk-act="nova">Nova tarefa</button></div>
          ${resumoHTML()}
        </section>
        ${filtrosHTML()}
        ${quadroHTML()}
        <dialog class="tk-dlg" id="tk-dlg" aria-labelledby="tk-dlg-t"></dialog>`;
    }
    function formHTML(t){
      const novo=!t.id, cat=t.categoria||"Orçamento";
      return `<form method="dialog" class="tk-form" id="tk-form">
        <div class="head"><h2 id="tk-dlg-t">${novo?"Nova tarefa":"Editar tarefa"}</h2><button type="button" class="tk-x" data-tk-act="fechar" aria-label="Fechar">✕</button></div>
        ${t.pedido_id?`<p class="tk-ped-aviso">Esta tarefa veio de um <b>pedido do cliente</b>. Etapa, prazo e checklist andam juntos com o pedido: o cliente acompanha pelo portal. <button type="button" class="btn small ghost" data-tk-act="pedido" data-cli="${esc(t.cliente_id||"")}">Abrir o pedido ↗</button></p>`:""}
        <div><span class="label">Tipo</span><div class="tk-cats" role="radiogroup" aria-label="Tipo da tarefa">${Object.keys(CATS).map(c=>`<label class="tk-catopt" style="--cat:${CATS[c].cor}"><input type="radio" name="tk-cat" value="${esc(c)}" ${c===cat?"checked":""}>${icone(c)}<span>${esc(c)}</span></label>`).join("")}</div></div>
        <div><label class="label" for="tk-titulo">O que precisa ser feito?</label><input type="text" id="tk-titulo" maxlength="200" value="${esc(t.titulo||"")}" placeholder="Ex.: Orçamento de identidade visual para a Dra. Ana" required></div>
        <div class="grid2">
          <div><label class="label" for="tk-cli">Cliente</label><select id="tk-cli"><option value="">Nenhum / outro</option>${clientes().map(c=>`<option value="${c.id}" ${t.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
          <div><label class="label" for="tk-cli-nome">Ou nome de quem pediu</label><input type="text" id="tk-cli-nome" value="${esc(t.cliente_nome||"")}" placeholder="Ex.: Dra. Ana (indicação)"></div>
          <div><label class="label" for="tk-prazo">Prazo</label><input type="date" id="tk-prazo" value="${esc(t.prazo||"")}"></div>
          <div><label class="label" for="tk-pri">Prioridade</label><select id="tk-pri">${Object.entries(PRI).map(([k,v])=>`<option value="${k}" ${(t.prioridade||"media")===k?"selected":""}>${v}</option>`).join("")}</select></div>
          <div><label class="label" for="tk-status">Andamento</label><select id="tk-status">${COLS.map(([k,v])=>`<option value="${k}" ${(t.status||"a_fazer")===k?"selected":""}>${v}</option>`).join("")}</select></div>
          <div><label class="label" for="tk-resp">Responsável</label><input type="text" id="tk-resp" list="tk-pessoas" maxlength="60" value="${esc(t.responsavel||"")}" placeholder="Quem vai fazer">
            <datalist id="tk-pessoas">${[...new Set(tarefas.map(x=>(x.responsavel||"").trim()).filter(Boolean))].map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
          <div><label class="label" for="tk-ets">Etiquetas</label><input type="text" id="tk-ets" value="${esc((t.etiquetas||[]).join(", "))}" placeholder="Ex.: urgente, Instagram, campanha" list="tk-ets-ls">
            <datalist id="tk-ets-ls">${[...new Set(tarefas.flatMap(x=>x.etiquetas||[]))].map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
          <div class="tk-valor-box"><label class="label" for="tk-valor">Valor (R$)</label><input type="text" inputmode="decimal" id="tk-valor" value="${t.valor!=null?Number(t.valor).toLocaleString("pt-BR",{minimumFractionDigits:2}):""}" placeholder="0,00"></div>
        </div>
        <div class="tk-capa-box"><span class="label">Capa (a arte ou referência)</span>
          <div class="tk-capa-ed">${t.capa?`<img src="${esc(t.capa)}" alt="Capa atual" id="tk-capa-img">`:`<span class="tk-capa-vazia" id="tk-capa-img">Sem imagem</span>`}
            <div class="tk-capa-bts"><label class="btn small">Enviar imagem<input type="file" id="tk-capa-arq" accept="image/*" hidden></label>
              <input type="url" id="tk-capa" value="${esc(t.capa||"")}" placeholder="ou cole o link da imagem">
              ${t.capa?`<button type="button" class="btn small ghost" data-tk-act="capa-rm">Tirar a capa</button>`:""}</div></div></div>
        <div><span class="label">Checklist</span>
          <ul class="ck-list" id="tk-ck">${(t.checklist||[]).map((i,k)=>ckItem(i,k)).join("")}</ul>
          <div class="ck-add"><input type="text" id="tk-ck-novo" placeholder="Adicionar etapa e apertar Enter" aria-label="Nova etapa"><button type="button" class="btn small" data-tk-act="ck-add">Adicionar</button>
          <button type="button" class="btn small ghost" data-tk-act="ck-padrao">Usar etapas padrão</button></div>
          <div class="ck-modelos"><select id="tk-modelo" aria-label="Aplicar um modelo de checklist"><option value="">Aplicar um modelo…</option>${modelos.map(m=>`<option value="${m.id}">${esc(m.nome)} (${(m.itens||[]).length})</option>`).join("")}</select>
            <button type="button" class="btn small ghost" data-tk-act="modelo-salvar">Salvar esta lista como modelo</button></div></div>
        <div><label class="label" for="tk-notas">Anotações</label><textarea id="tk-notas" style="min-height:80px" placeholder="Contatos, medidas, links, combinados…">${esc(t.notas||"")}</textarea></div>
        <div class="actions"><button type="submit" class="btn primary" data-tk-act="salvar">${novo?"Criar tarefa":"Salvar"}</button>
          <button type="button" class="btn ghost" data-tk-act="fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn danger small" data-tk-act="apagar" style="margin-left:auto">Apagar</button>`}</div>
      </form>`;
    }
    const ckItem=(i,k)=>`<li class="ck-item${i.ok?" ok":""}"><label><input type="checkbox" data-ck="${k}" ${i.ok?"checked":""}><span>${esc(i.t)}</span></label><button type="button" class="ck-rm" data-tk-act="ck-rm" data-k="${k}" aria-label="Remover etapa">✕</button></li>`;
    function lerChecklist(){return [...el.querySelectorAll("#tk-ck .ck-item")].map(li=>({t:li.querySelector("span").textContent,ok:li.querySelector("input").checked}))}
    function abrir(t,extra){
      editando=t?{...t}:Object.assign({categoria:filtro!=="todas"?filtro:"Orçamento",checklist:CATS[filtro!=="todas"?filtro:"Orçamento"].etapas.map(x=>({t:x,ok:false})),prioridade:"media",status:"a_fazer",responsavel:pessoa||""},extra||{});
      const d=el.querySelector("#tk-dlg");d.innerHTML=formHTML(editando);
      atualizarValor();
      if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
      setTimeout(()=>{const i=d.querySelector("#tk-titulo");i&&i.focus()},30);
    }
    function fechar(){const d=el.querySelector("#tk-dlg");if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open");editando=null}
    function atualizarValor(){const c=(el.querySelector('input[name="tk-cat"]:checked')||{}).value;const b=el.querySelector(".tk-valor-box");if(b)b.hidden=!(c==="Orçamento"||c==="Financeiro"||c==="Gráfica"||c==="Identidade visual"||c==="Site")}
    async function salvar(){
      const v=s=>el.querySelector(s).value;
      const titulo=v("#tk-titulo").trim();if(!titulo){toast("Escreva o que precisa ser feito.");el.querySelector("#tk-titulo").focus();return}
      const campos={titulo,categoria:(el.querySelector('input[name="tk-cat"]:checked')||{}).value||"Outro",cliente_id:v("#tk-cli")||null,
        cliente_nome:v("#tk-cli-nome").trim(),prazo:v("#tk-prazo")||null,prioridade:v("#tk-pri"),status:v("#tk-status"),
        valor:parseMoeda(v("#tk-valor")),notas:v("#tk-notas").trim(),checklist:lerChecklist(),
        responsavel:v("#tk-resp").trim(),capa:v("#tk-capa").trim(),etiquetas:[...new Set(v("#tk-ets").split(",").map(x=>x.trim()).filter(Boolean))].slice(0,8)};
      const q=editando&&editando.id?sb.from("tarefas").update(campos).eq("id",editando.id):sb.from("tarefas").insert(campos);
      const {data,error}=await q.select().single();
      if(error)return falha("salvar a tarefa",error);
      const i=tarefas.findIndex(x=>x.id===data.id);if(i>=0)tarefas[i]=data;else tarefas.push(data);
      const novo=!(editando&&editando.id);fechar();render();toast(novo?"Tarefa criada.":"Tarefa salva.");ctx.mudou&&ctx.mudou();
    }
    async function atualizar(id,campos,msg){
      const t=tarefas.find(x=>x.id===id);if(!t)return;const antes={...t};Object.assign(t,campos);render();
      const {data,error}=await sb.from("tarefas").update(campos).eq("id",id).select().single();
      if(error){Object.assign(t,antes);render();return falha("atualizar a tarefa",error)}
      Object.assign(t,data);render();if(msg)toast(msg);ctx.mudou&&ctx.mudou();
    }

    el.addEventListener("click",async e=>{
      const f=e.target.closest("[data-tk-f]");if(f){filtro=f.dataset.tkF;render();return}
      const pp=e.target.closest("[data-tk-pessoa]");if(pp){pessoa=pessoa===pp.dataset.tkPessoa?"":pp.dataset.tkPessoa;render();return}
      const b=e.target.closest("[data-tk-act]");if(!b)return;
      const a=b.dataset.tkAct, card=b.closest("[data-tk]"), t=card&&tarefas.find(x=>x.id===card.dataset.tk);
      if(a==="nova"){abrir(null);return}
      if(a==="nova-ideia"){abrir(null,{status:"ideia",checklist:[]});return}
      if(a==="nova-col"){const st=b.dataset.col;abrir(null,Object.assign(st==="ideia"?{status:"ideia",checklist:[]}:{status:st},cliF?{cliente_id:cliF}:{}));return}
      if(a==="capa-rm"){el.querySelector("#tk-capa").value="";const im=el.querySelector("#tk-capa-img");if(im)im.outerHTML=`<span class="tk-capa-vazia" id="tk-capa-img">Sem imagem</span>`;b.remove();return}
      if(a==="modelo-salvar"){const itens=lerChecklist().map(i=>i.t);if(!itens.length){toast("Monte a checklist primeiro.");return}
        const nome=(el.querySelector("#tk-titulo").value||"").replace(/^Pedido · /,"").trim().slice(0,60)||"Meu modelo";
        const {data,error}=await sb.from("checklist_modelos").insert({nome,itens}).select().single();if(error)return falha("salvar o modelo",error);
        modelos.push(data);modelos.sort((x,y)=>x.nome.localeCompare(y.nome));const sel=el.querySelector("#tk-modelo");if(sel)sel.insertAdjacentHTML("beforeend",`<option value="${data.id}">${esc(data.nome)} (${itens.length})</option>`);
        toast(`Modelo "${nome}" salvo. Renomeie em Notas › Modelos se quiser.`);return}
      if(a==="pedido"){fechar();ctx.abrirPedido&&ctx.abrirPedido(b.dataset.cli);return}
      if(a==="abrir"&&t){abrir(t);return}
      if(a==="fechar"){fechar();return}
      if(a==="feito"&&t){const feito=t.status!=="feito";
        if(feito&&(t.checklist||[]).length)t.checklist=t.checklist.map(i=>({...i,ok:true}));
        return atualizar(t.id,{status:feito?"feito":"a_fazer",checklist:t.checklist||[]},feito?"Feito! Bom trabalho.":"Tarefa reaberta.")}
      if(a==="mover"&&t){const para=b.dataset.para;return atualizar(t.id,{status:para},"Movida para "+COLS.find(x=>x[0]===para)[1]+".")}
      if(a==="salvar"){e.preventDefault();return salvar()}
      if(a==="apagar"&&editando&&editando.id){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("tarefas").delete().eq("id",editando.id);if(error)return falha("apagar",error);
        tarefas=tarefas.filter(x=>x.id!==editando.id);fechar();render();toast("Tarefa apagada.");ctx.mudou&&ctx.mudou();return}
      if(a==="ck-add"){addEtapa();return}
      if(a==="ck-rm"){b.closest(".ck-item").remove();return}
      if(a==="ck-padrao"){const c=(el.querySelector('input[name="tk-cat"]:checked')||{}).value;const atual=lerChecklist().map(i=>i.t);
        const ul=el.querySelector("#tk-ck");(CATS[c]||CATS.Outro).etapas.filter(x=>!atual.includes(x)).forEach(x=>ul.insertAdjacentHTML("beforeend",ckItem({t:x,ok:false},ul.children.length)));
        if(!(CATS[c]||CATS.Outro).etapas.length)toast("Este tipo não tem etapas padrão. Escreva as suas.");return}
    });
    function addEtapa(){const i=el.querySelector("#tk-ck-novo");const v=i.value.trim();if(!v)return;const ul=el.querySelector("#tk-ck");ul.insertAdjacentHTML("beforeend",ckItem({t:v,ok:false},ul.children.length));i.value="";i.focus()}
    el.addEventListener("keydown",e=>{if(e.target.id==="tk-ck-novo"&&e.key==="Enter"){e.preventDefault();addEtapa()}});
    el.addEventListener("change",e=>{
      if(e.target.id==="tk-fcli"){cliF=e.target.value;render();return}
      if(e.target.id==="tk-feitas"){verFeitas=e.target.checked;render();return}
      if(e.target.name==="tk-cat"){atualizarValor();
        // tarefa nova sem etapas marcadas: troca as etapas pelo padrão do novo tipo
        if(editando&&!editando.id&&!lerChecklist().some(i=>i.ok)){const ul=el.querySelector("#tk-ck");ul.innerHTML=(CATS[e.target.value]||CATS.Outro).etapas.map((x,k)=>ckItem({t:x,ok:false},k)).join("")}return}
      if(e.target.dataset.ck!=null){e.target.closest(".ck-item").classList.toggle("ok",e.target.checked)}
      if(e.target.id==="tk-modelo"&&e.target.value){const m=modelos.find(x=>x.id===e.target.value);e.target.value="";if(!m)return;
        const atual=lerChecklist().map(i=>i.t),ul=el.querySelector("#tk-ck");(m.itens||[]).filter(x=>!atual.includes(x)).forEach(x=>ul.insertAdjacentHTML("beforeend",ckItem({t:x,ok:false},ul.children.length)));toast(`Modelo "${m.nome}" aplicado.`);return}
      if(e.target.id==="tk-capa-arq"&&e.target.files[0]){enviarCapa(e.target.files[0]);return}
      if(e.target.id==="tk-capa"){const u=e.target.value.trim(),im=el.querySelector("#tk-capa-img");if(im&&/^https?:\/\//.test(u))im.outerHTML=`<img src="${esc(u)}" alt="Capa" id="tk-capa-img">`}
    });
    async function enviarCapa(f){
      if(!/^image\//.test(f.type)){toast("Escolha uma imagem (JPG, PNG ou WebP).");return}
      if(f.size>8*1024*1024){toast("A imagem passa de 8 MB. Use uma menor.");return}
      toast("Enviando a imagem…");
      const ext=(f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,5)||"jpg", path=`tarefas/${crypto.randomUUID()}.${ext}`;
      const {error}=await sb.storage.from("artes").upload(path,f,{contentType:f.type,upsert:false});
      if(error)return falha("enviar a imagem",error);
      const url=sb.storage.from("artes").getPublicUrl(path).data.publicUrl;
      const i=el.querySelector("#tk-capa");if(i)i.value=url;const im=el.querySelector("#tk-capa-img");if(im)im.outerHTML=`<img src="${esc(url)}" alt="Capa" id="tk-capa-img">`;
      toast("Imagem pronta. Clique em Salvar.");
    }
    // arrastar os cartões entre as colunas
    el.addEventListener("dragstart",e=>{const c=e.target.closest&&e.target.closest(".tk-card");if(!c)return;arrastando=c.dataset.tk;c.classList.add("arrastando");e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",arrastando)}catch(_){}});
    el.addEventListener("dragend",()=>{el.querySelectorAll(".arrastando,.sobre").forEach(x=>x.classList.remove("arrastando","sobre"));arrastando=null});
    el.addEventListener("dragover",e=>{const col=e.target.closest&&e.target.closest(".tk-col");if(!col||!arrastando)return;e.preventDefault();el.querySelectorAll(".tk-col.sobre").forEach(x=>x!==col&&x.classList.remove("sobre"));col.classList.add("sobre")});
    el.addEventListener("drop",e=>{const col=e.target.closest&&e.target.closest(".tk-col");if(!col||!arrastando)return;e.preventDefault();const id=arrastando;arrastando=null;col.classList.remove("sobre");
      const t=tarefas.find(x=>x.id===id),para=col.dataset.col;if(!t||t.status===para)return;
      const campos={status:para};if(para==="feito"&&(t.checklist||[]).length)campos.checklist=t.checklist.map(i=>({...i,ok:true}));
      atualizar(id,campos,"Movida para "+COLS.find(x=>x[0]===para)[1]+".")});
    el.addEventListener("input",e=>{if(e.target.id==="tk-busca"){busca=e.target.value;const pos=e.target.selectionStart;
      el.querySelector(".tk-board").outerHTML=quadroHTML();}});
    el.addEventListener("submit",e=>{e.preventDefault();salvar()});
    el.addEventListener("close",e=>{if(e.target.id==="tk-dlg")editando=null},true);

    carregar();
    return {recarregar:carregar};
  }

  window.GlaraTarefas={criar,CATS};
})();
