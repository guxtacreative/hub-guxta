/* Hub de Marketing · Notas por cliente e modelos de checklist (só o administrador vê). */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const CORES={amarelo:"#FFF4B8",rosa:"#E6F9EE",azul:"#D6E9FF",verde:"#D8F5D0",lilas:"#E9DDFF",cinza:"#EEEEEE"};
  const quando=iso=>{if(!iso)return"";const d=new Date(iso),h=new Date();const ms=h-d;if(ms<36e5)return "agora há pouco";if(d.toDateString()===h.toDateString())return "hoje";const o=new Date(h);o.setDate(o.getDate()-1);if(d.toDateString()===o.toDateString())return "ontem";return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})};
  const linkar=t=>esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');

  function criar(el,sb,ctx){
    let notas=[], modelos=[], sub=ctx.sub||"notas", fCli=ctx.cliente||"", busca="", ed=null, cor="amarelo";
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const nomeCli=id=>{const c=clientes().find(x=>x.id===id);return c?c.nome:""};

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando…</div>`;
      const [a,b]=await Promise.all([sb.from("notas").select("*").order("atualizado_em",{ascending:false}),sb.from("checklist_modelos").select("*").order("nome")]);
      if(a.error){el.innerHTML=`<div class="empty">${/notas/.test(a.error.message||"")?"Rode o arquivo 13 do banco no Supabase para usar as notas.":esc(a.error.message)}</div>`;return}
      notas=a.data||[];modelos=b.data||[];render();
    }
    function topoHTML(){
      return `<section class="card tk-head"><div class="head"><div><span class="eyebrow">Só você vê</span><h2>Notas</h2></div></div>
        <div class="seg orc-seg" role="group" aria-label="Seção"><button type="button" data-nt="sub" data-s="notas" aria-pressed="${sub==="notas"}">Notas <b>${notas.length}</b></button><button type="button" data-nt="sub" data-s="modelos" aria-pressed="${sub==="modelos"}">Modelos de checklist <b>${modelos.length}</b></button></div></section>`}
    function notasHTML(){
      const q=busca.trim().toLowerCase();
      const ls=notas.filter(n=>(!fCli||(fCli==="geral"?!n.cliente_id:n.cliente_id===fCli))&&(!q||(n.titulo+" "+n.texto+" "+nomeCli(n.cliente_id)).toLowerCase().includes(q)))
        .sort((a,b)=>(b.fixada-a.fixada)||String(b.atualizado_em).localeCompare(String(a.atualizado_em)));
      return `<section class="card nt-nova">
          <textarea id="nt-texto" placeholder="Escreva uma nota… (ideia de pauta, combinado com o cliente, senha do Wi-Fi não!)" rows="3"></textarea>
          <div class="nt-nova-bar">
            <select id="nt-cli" aria-label="Cliente da nota"><option value="">Nota geral</option>${clientes().map(c=>`<option value="${c.id}" ${fCli===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select>
            <div class="nt-cores" role="radiogroup" aria-label="Cor">${Object.entries(CORES).map(([k,v])=>`<button type="button" class="nt-cor" role="radio" aria-checked="${cor===k}" aria-label="${k}" data-nt="cor" data-c="${k}" style="--nt:${v}"></button>`).join("")}</div>
            <button type="button" class="btn primary small" data-nt="criar">Guardar nota</button></div></section>
        <div class="tk-bar"><div class="summary"><select id="nt-filtro" aria-label="Filtrar por cliente"><option value="">Todas as notas</option><option value="geral" ${fCli==="geral"?"selected":""}>Só gerais</option>${clientes().map(c=>`<option value="${c.id}" ${fCli===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
          <div class="tk-tools"><input type="search" id="nt-busca" placeholder="Buscar nas notas" value="${esc(busca)}" aria-label="Buscar nas notas"></div></div>
        <div class="nt-grade">${ls.map(n=>`<article class="nt" style="--nt:${CORES[n.cor]||CORES.amarelo}" data-id="${n.id}">
            <div class="nt-top">${n.cliente_id?`<span class="nt-cli">${esc(nomeCli(n.cliente_id))}</span>`:`<span class="nt-cli geral">Geral</span>`}
              <button type="button" class="nt-pin" data-nt="fixar" aria-pressed="${n.fixada}" title="${n.fixada?"Desafixar":"Fixar no topo"}" aria-label="${n.fixada?"Desafixar":"Fixar no topo"}">📌</button></div>
            ${n.titulo?`<h3>${esc(n.titulo)}</h3>`:""}<p>${linkar(n.texto)}</p>
            <div class="nt-pe"><small>${quando(n.atualizado_em)}</small><button type="button" class="btn small ghost" data-nt="editar">Editar</button></div></article>`).join("")||`<div class="empty">${notas.length?"Nenhuma nota com esse filtro.":"Nenhuma nota ainda. Escreva a primeira aí em cima."}</div>`}</div>`}
    function modelosHTML(){
      return `<section class="card"><p class="note" style="margin:0">Os modelos aparecem em <b>Minhas tarefas</b> › editar tarefa › <b>Aplicar um modelo</b>. Escreva uma etapa por linha.</p>
        <div class="actions"><button type="button" class="btn primary small" data-nt="mod-novo">+ Novo modelo</button></div></section>
        <div class="nt-mods">${modelos.map(m=>`<section class="card nt-mod" data-id="${m.id}">
          <input type="text" class="nt-mod-nome" value="${esc(m.nome)}" aria-label="Nome do modelo" maxlength="60">
          <textarea class="nt-mod-itens" rows="${Math.min(10,Math.max(3,(m.itens||[]).length+1))}" aria-label="Etapas do modelo">${esc((m.itens||[]).join("\n"))}</textarea>
          <div class="actions"><button type="button" class="btn small" data-nt="mod-salvar">Salvar</button><button type="button" class="btn small danger" data-nt="mod-apagar">Apagar</button><small class="note">${(m.itens||[]).length} etapa(s)</small></div></section>`).join("")||`<div class="empty">Nenhum modelo ainda.</div>`}</div>`}
    function render(){el.innerHTML=topoHTML()+(sub==="modelos"?modelosHTML():notasHTML())+`<dialog class="tk-dlg" id="nt-dlg"></dialog>`}
    const dlg=()=>el.querySelector("#nt-dlg");
    function editar(n){ed=n;const d=dlg();
      d.innerHTML=`<form method="dialog" class="tk-form" id="nt-form"><div class="head"><h2>Editar nota</h2><button type="button" class="tk-x" data-nt="fechar" aria-label="Fechar">✕</button></div>
        <div><label class="label" for="ne-tit">Título (opcional)</label><input type="text" id="ne-tit" maxlength="120" value="${esc(n.titulo||"")}"></div>
        <div><label class="label" for="ne-txt">Nota</label><textarea id="ne-txt" rows="8">${esc(n.texto||"")}</textarea></div>
        <div class="grid2"><div><label class="label" for="ne-cli">Cliente</label><select id="ne-cli"><option value="">Nota geral</option>${clientes().map(c=>`<option value="${c.id}" ${n.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
          <div><label class="label" for="ne-cor">Cor</label><select id="ne-cor">${Object.keys(CORES).map(k=>`<option value="${k}" ${n.cor===k?"selected":""}>${k==="lilas"?"lilás":k}</option>`).join("")}</select></div></div>
        <div class="actions"><button type="submit" class="btn primary">Salvar</button><button type="button" class="btn ghost" data-nt="fechar">Cancelar</button><button type="button" class="btn danger small" data-nt="apagar" style="margin-left:auto">Apagar</button></div></form>`;
      if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","")}
    function fechar(){const d=dlg();if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open");ed=null}
    async function upd(id,campos,msg){const {data,error}=await sb.from("notas").update(campos).eq("id",id).select().single();if(error)return falha("salvar a nota",error);
      const i=notas.findIndex(x=>x.id===id);if(i>=0)notas[i]=data;render();if(msg)toast(msg)}

    el.addEventListener("click",async e=>{
      const b=e.target.closest("[data-nt]");if(!b)return;const a=b.dataset.nt, card=b.closest(".nt,.nt-mod"), id=card&&card.dataset.id;
      if(a==="sub"){sub=b.dataset.s;render();return}
      if(a==="cor"){cor=b.dataset.c;el.querySelectorAll(".nt-cor").forEach(x=>x.setAttribute("aria-checked",String(x===b)));return}
      if(a==="criar"){const t=el.querySelector("#nt-texto").value.trim();if(!t){toast("Escreva a nota primeiro.");el.querySelector("#nt-texto").focus();return}
        const linhas=t.split("\n"), titulo=linhas.length>1&&linhas[0].length<=80?linhas[0].trim():"", texto=titulo?linhas.slice(1).join("\n").trim():t;
        const {data,error}=await sb.from("notas").insert({texto,titulo,cor,cliente_id:el.querySelector("#nt-cli").value||null}).select().single();
        if(error)return falha("guardar a nota",error);notas.unshift(data);render();toast("Nota guardada.");return}
      if(a==="fixar"&&id){const n=notas.find(x=>x.id===id);return upd(id,{fixada:!n.fixada},n.fixada?"Nota desafixada.":"Nota fixada no topo.")}
      if(a==="editar"&&id){editar({...notas.find(x=>x.id===id)});return}
      if(a==="fechar"){fechar();return}
      if(a==="apagar"&&ed){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("notas").delete().eq("id",ed.id);if(error)return falha("apagar",error);notas=notas.filter(x=>x.id!==ed.id);fechar();render();toast("Nota apagada.");return}
      if(a==="mod-novo"){const {data,error}=await sb.from("checklist_modelos").insert({nome:"Novo modelo",itens:["Primeira etapa"]}).select().single();if(error)return falha("criar o modelo",error);
        modelos.push(data);render();const c=el.querySelector(`.nt-mod[data-id="${data.id}"] .nt-mod-nome`);c&&(c.focus(),c.select());return}
      if(a==="mod-salvar"&&id){const nome=card.querySelector(".nt-mod-nome").value.trim()||"Modelo",itens=card.querySelector(".nt-mod-itens").value.split("\n").map(x=>x.trim()).filter(Boolean);
        const {data,error}=await sb.from("checklist_modelos").update({nome,itens}).eq("id",id).select().single();if(error)return falha("salvar o modelo",error);
        const i=modelos.findIndex(x=>x.id===id);modelos[i]=data;modelos.sort((x,y)=>x.nome.localeCompare(y.nome));render();toast("Modelo salvo.");return}
      if(a==="mod-apagar"&&id){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo";return}
        const {error}=await sb.from("checklist_modelos").delete().eq("id",id);if(error)return falha("apagar o modelo",error);modelos=modelos.filter(x=>x.id!==id);render();toast("Modelo apagado.");return}
    });
    el.addEventListener("change",e=>{if(e.target.id==="nt-filtro"){fCli=e.target.value;render()}});
    el.addEventListener("input",e=>{if(e.target.id==="nt-busca"){busca=e.target.value;const g=el.querySelector(".nt-grade"),tmp=document.createElement("div");tmp.innerHTML=notasHTML();g.replaceWith(tmp.querySelector(".nt-grade"))}});
    el.addEventListener("keydown",e=>{if(e.target.id==="nt-texto"&&e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();el.querySelector('[data-nt="criar"]').click()}});
    el.addEventListener("submit",e=>{if(e.target.id!=="nt-form"||!ed)return;e.preventDefault();const v=s=>el.querySelector(s).value;
      const id=ed.id;fechar();upd(id,{titulo:v("#ne-tit").trim(),texto:v("#ne-txt").trim(),cliente_id:v("#ne-cli")||null,cor:v("#ne-cor")},"Nota salva.")});
    carregar();
    return {recarregar:carregar};
  }
  window.GlaraNotas={criar};
})();
