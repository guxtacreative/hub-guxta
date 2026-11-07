/* Hub de Marketing · Planos de serviço (assessoria, gestão de redes).
   Itens comuns a todos os planos; em cada plano o item tem quantidade, incluso ou não incluso.
   Página pública em planos.html e texto pronto para o WhatsApp. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const r2=v=>Math.round((N(v)+Number.EPSILON)*100)/100;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:N(v)%1?2:0});
  const num=v=>N(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const parseNum=s=>{s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
  const ic=p=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={mais:ic('<path d="M12 5v14M5 12h14"/>'),copia:ic('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    cima:ic('<path d="m18 15-6-6-6 6"/>'),baixo:ic('<path d="m6 9 6 6 6-6"/>'),lixo:ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>')};
  const tem=v=>v===true||(typeof v==="string"&&v.trim()!==""&&v.trim()!=="0");

  function criar(el,sb,ctx){
    let planos=[], itens=[], ed=null, mostraItens=false;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const link=p=>new URL("planos.html"+(p?"?p="+p.id:""),location.href).href;
    const textoWa=p=>{const v=p.valores||{};
      const linhas=itens.filter(it=>v[it.id]!==undefined&&v[it.id]!==null&&v[it.id]!=="").map(it=>{const x=v[it.id];return `${tem(x)?"✅":"❌"} ${typeof x==="string"&&x.trim()?x.trim()+" ":""}${it.nome}`});
      return [`*${p.nome}* · ${brl(p.preco)}/${p.periodo||"mês"}`+(p.descricao?`\n_${p.descricao}_`:""),linhas.join("\n"),p.obs||"",`Detalhes: ${link(p)}`].filter(Boolean).join("\n\n")};
    const textoTodos=()=>`Estes são os nossos planos de assessoria de marketing e gestão de redes sociais:\n\n${planos.filter(p=>p.ativo).map(p=>textoWa(p).replace(/\n\nDetalhes: .*$/,"")).join("\n\n— — —\n\n")}\n\nCompare os planos aqui: ${link()}`;

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando os planos…</div>`;
      const [a,b]=await Promise.all([sb.from("planos").select("*").order("ordem").order("preco"),sb.from("planos_itens").select("*").order("ordem").order("nome")]);
      if(a.error||b.error){el.innerHTML=`<div class="empty">Rode o arquivo 23 do banco no Supabase para criar os planos.</div>`;return}
      planos=a.data||[];itens=b.data||[];render();
    }
    function cardHTML(p){const v=p.valores||{};const its=itens.filter(it=>v[it.id]!==undefined&&v[it.id]!==null&&v[it.id]!=="");
      return `<article class="pl-card${p.destaque?" destaque":""}${p.ativo?"":" off"}">
        ${p.destaque?`<span class="pl-selo">Mais escolhido</span>`:""}
        <div class="pl-h"><div><b class="pl-nome">${esc(p.nome)}</b>${p.ativo?"":` <span class="status prod">Escondido</span>`}<small>${esc(p.descricao)}</small></div><b class="pl-preco">${brl(p.preco)}<small>/${esc(p.periodo||"mês")}</small></b></div>
        <ul class="pl-itens">${its.map(it=>{const x=v[it.id];return `<li class="${tem(x)?"sim":"nao"}"><span aria-hidden="true">${tem(x)?"✓":"✕"}</span>${typeof x==="string"&&x.trim()?`<b>${esc(x.trim())}</b> `:""}${esc(it.nome)}</li>`}).join("")||`<li class="nao">Nenhum item marcado ainda. Clique em Editar.</li>`}</ul>
        <div class="orc-st-bts"><button type="button" class="btn small" data-pl="editar" data-id="${p.id}">Editar</button>
          <button type="button" class="btn small ghost" data-pl="copiar" data-id="${p.id}">${I.copia} Copiar texto</button>
          <a class="btn small ghost" href="https://wa.me/?text=${encodeURIComponent(textoWa(p))}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
          <button type="button" class="btn small ghost" data-pl="link" data-id="${p.id}">Copiar link</button></div></article>`}
    function render(){
      el.innerHTML=`<section class="card tk-head">
          <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Planos de serviço</h2><p class="note" style="margin:4px 0 0">Monte cada plano com as quantidades e o que está incluso ou não. O cliente vê numa página bonita e você manda o texto pronto no WhatsApp.</p></div>
            <button class="btn primary" data-pl="novo">${I.mais} Novo plano</button></div>
          <div class="orc-st-bts"><a class="btn small ghost" href="${esc(link())}" target="_blank" rel="noopener">Ver a página dos planos</a>
            <button type="button" class="btn small ghost" data-pl="link-todos">Copiar link</button>
            ${planos.some(p=>p.ativo)?`<a class="btn small ghost" href="https://wa.me/?text=${encodeURIComponent(textoTodos())}" target="_blank" rel="noopener">Enviar todos no WhatsApp</a>`:""}
            <button type="button" class="btn small ghost" data-pl="itens" aria-expanded="${mostraItens}">Itens dos planos (${itens.length})</button></div>
          ${mostraItens?itensHTML():""}
        </section>
        <div class="pl-grade">${planos.map(cardHTML).join("")||`<div class="empty">Nenhum plano ainda. Clique em Novo plano.</div>`}</div>
        <dialog class="tk-dlg" id="pl-dlg"></dialog>`;
    }
    function itensHTML(){return `<fieldset class="orc-fs"><legend>Itens dos planos</legend>
      <p class="note" style="margin:0">São as linhas que aparecem em todos os planos (artes, vídeos, captação…). Em cada plano você diz a quantidade, se está incluso ou se não está.</p>
      <ul class="pl-it-lista">${itens.map((it,k)=>`<li><input type="text" value="${esc(it.nome)}" data-it-nome="${it.id}" aria-label="Nome do item">
        <button type="button" class="tk-x" data-pl="it-cima" data-id="${it.id}" ${k===0?"disabled":""} aria-label="Subir">${I.cima}</button>
        <button type="button" class="tk-x" data-pl="it-baixo" data-id="${it.id}" ${k===itens.length-1?"disabled":""} aria-label="Descer">${I.baixo}</button>
        <button type="button" class="tk-x" data-pl="it-apagar" data-id="${it.id}" aria-label="Apagar item">${I.lixo}</button></li>`).join("")}</ul>
      <form class="pl-it-novo" id="pl-it-novo"><input type="text" id="pl-it-n" placeholder="Novo item (ex.: Gestão de comentários)" maxlength="80"><button type="submit" class="btn small">${I.mais} Adicionar</button></form></fieldset>`}
    function formHTML(p){const novo=!p.id, v=p.valores||{};
      const estado=x=>x===undefined||x===null||x===""?"":x===true?"sim":x===false?"nao":"qtd";
      return `<form method="dialog" class="tk-form" id="pl-form">
        <div class="head"><h2>${novo?"Novo plano":"Editar plano"}</h2><button type="button" class="tk-x" data-pl="fechar" aria-label="Fechar">✕</button></div>
        <div class="grid2">
          <div><label class="label" for="pf-n">Nome do plano</label><input type="text" id="pf-n" required maxlength="60" value="${esc(p.nome||"")}" placeholder="Ex.: Essencial"></div>
          <div class="pl-preco-in"><div><label class="label" for="pf-p">Preço (R$)</label><input type="text" id="pf-p" inputmode="decimal" value="${p.preco!=null?num(p.preco):""}" placeholder="0,00"></div>
            <div><label class="label" for="pf-per">por</label><input type="text" id="pf-per" value="${esc(p.periodo||"mês")}" list="pl-pers"><datalist id="pl-pers"><option value="mês"><option value="trimestre"><option value="ano"><option value="projeto"></datalist></div></div>
        </div>
        <div><label class="label" for="pf-d">Frase curta</label><input type="text" id="pf-d" maxlength="140" value="${esc(p.descricao||"")}" placeholder="Ex.: Para quem está começando a postar com frequência"></div>
        <fieldset class="orc-fs"><legend>O que tem no plano</legend>
          <div class="pl-ed-it">${itens.map(it=>{const x=v[it.id], e=estado(x);return `<div class="pl-ed-row" data-it="${it.id}"><span class="pl-ed-nome">${esc(it.nome)}</span>
            <select data-est aria-label="${esc(it.nome)}"><option value="" ${e===""?"selected":""}>Não mostrar</option><option value="qtd" ${e==="qtd"?"selected":""}>Quantidade</option><option value="sim" ${e==="sim"?"selected":""}>✓ Incluso</option><option value="nao" ${e==="nao"?"selected":""}>✕ Não incluso</option></select>
            <input type="text" data-qtd value="${e==="qtd"?esc(x):""}" placeholder="Ex.: 12 por mês" ${e==="qtd"?"":"hidden"} aria-label="Quantidade de ${esc(it.nome)}"></div>`}).join("")||`<p class="note">Cadastre os itens primeiro em “Itens dos planos”.</p>`}</div></fieldset>
        <div><label class="label" for="pf-o">Observação (aparece no fim do plano)</label><input type="text" id="pf-o" maxlength="200" value="${esc(p.obs||"")}" placeholder="Ex.: Fidelidade de 3 meses. Verba de anúncios à parte."></div>
        <label class="check"><input type="checkbox" id="pf-dest" ${p.destaque?"checked":""}> Destacar como “Mais escolhido”</label>
        <label class="check"><input type="checkbox" id="pf-at" ${p.ativo!==false?"checked":""}> Mostrar na página dos planos</label>
        <div class="actions"><button type="submit" class="btn primary">${novo?"Criar plano":"Salvar"}</button><button type="button" class="btn ghost" data-pl="fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn small ghost" data-pl="duplicar">Duplicar</button><button type="button" class="btn danger small" data-pl="apagar" style="margin-left:auto">Apagar</button>`}</div></form>`}
    const dlg=()=>el.querySelector("#pl-dlg");
    function abrir(p){ed=JSON.parse(JSON.stringify(p));const d=dlg();d.innerHTML=formHTML(ed);if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","")}
    function fechar(){const d=dlg();if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open");ed=null}
    async function copiar(t,msg){try{await navigator.clipboard.writeText(t)}catch(_){}toast(msg)}
    async function moverItem(id,dir){const k=itens.findIndex(x=>x.id===id),j=k+dir;if(k<0||j<0||j>=itens.length)return;[itens[k],itens[j]]=[itens[j],itens[k]];
      itens.forEach((x,i)=>x.ordem=i+1);render();await Promise.all(itens.map(x=>sb.from("planos_itens").update({ordem:x.ordem}).eq("id",x.id)))}

    el.addEventListener("click",async e=>{
      const b=e.target.closest("[data-pl]");if(!b)return;const a=b.dataset.pl, id=b.dataset.id, p=planos.find(x=>x.id===id);
      if(a==="novo")return abrir({ativo:true,periodo:"mês",valores:{}});
      if(a==="editar"&&p)return abrir(p);
      if(a==="fechar")return fechar();
      if(a==="copiar"&&p)return copiar(textoWa(p),"Texto copiado. Cole no WhatsApp.");
      if(a==="link"&&p)return copiar(link(p),"Link do plano copiado.");
      if(a==="link-todos")return copiar(link(),"Link da página dos planos copiado.");
      if(a==="itens"){mostraItens=!mostraItens;render();return}
      if(a==="it-cima")return moverItem(id,-1);
      if(a==="it-baixo")return moverItem(id,1);
      if(a==="it-apagar"){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";toast("Clique de novo para apagar o item de todos os planos.");return}
        const {error}=await sb.from("planos_itens").delete().eq("id",id);if(error)return falha("apagar o item",error);itens=itens.filter(x=>x.id!==id);render();return}
      if(a==="duplicar"&&ed){const c=JSON.parse(JSON.stringify(ed));delete c.id;c.nome=c.nome+" (cópia)";c.destaque=false;fechar();abrir(c);return}
      if(a==="apagar"&&ed){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("planos").delete().eq("id",ed.id);if(error)return falha("apagar o plano",error);planos=planos.filter(x=>x.id!==ed.id);fechar();render();toast("Plano apagado.");return}
    });
    el.addEventListener("change",async e=>{const t=e.target;
      if(t.matches("[data-est]")){const q=t.closest(".pl-ed-row").querySelector("[data-qtd]");q.hidden=t.value!=="qtd";if(!q.hidden)q.focus();return}
      if(t.dataset.itNome){const nome=t.value.trim();if(!nome){render();return}const {error}=await sb.from("planos_itens").update({nome}).eq("id",t.dataset.itNome);
        if(error)return falha("renomear o item",error);const it=itens.find(x=>x.id===t.dataset.itNome);if(it)it.nome=nome;toast("Item renomeado.");return}});
    el.addEventListener("submit",async e=>{e.preventDefault();
      if(e.target.id==="pl-it-novo"){const i=el.querySelector("#pl-it-n"),nome=i.value.trim();if(!nome)return;
        const {data,error}=await sb.from("planos_itens").insert({nome,ordem:itens.length+1}).select().single();if(error)return falha("criar o item",error);itens.push(data);render();
        const n=el.querySelector("#pl-it-n");n&&n.focus();return}
      if(e.target.id==="pl-form"){const v=s=>el.querySelector(s).value.trim();const nome=v("#pf-n");if(!nome){toast("Dê um nome ao plano.");return}
        const valores={};el.querySelectorAll(".pl-ed-row").forEach(r=>{const est=r.querySelector("[data-est]").value, q=r.querySelector("[data-qtd]").value.trim();
          if(est==="sim")valores[r.dataset.it]=true;else if(est==="nao")valores[r.dataset.it]=false;else if(est==="qtd"&&q)valores[r.dataset.it]=q});
        const campos={nome,descricao:v("#pf-d"),preco:Math.max(0,r2(parseNum(v("#pf-p")))),periodo:v("#pf-per")||"mês",obs:v("#pf-o"),destaque:el.querySelector("#pf-dest").checked,ativo:el.querySelector("#pf-at").checked,valores,atualizado_em:new Date().toISOString()};
        if(!ed.id)campos.ordem=planos.length+1;
        const q=ed.id?sb.from("planos").update(campos).eq("id",ed.id):sb.from("planos").insert(campos);
        const {data,error}=await q.select().single();if(error)return falha("salvar o plano",error);
        const i=planos.findIndex(x=>x.id===data.id);if(i>=0)planos[i]=data;else planos.push(data);const novo=!ed.id;fechar();render();toast(novo?"Plano criado.":"Plano salvo.");return}
    });
    carregar();
    return {carregar};
  }
  window.GlaraPlanos={criar};
})();
