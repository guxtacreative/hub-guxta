/* Hub de Marketing · Orçamentos de materiais gráficos (só o administrador vê).
   Catálogo de produtos com custo + lucro, orçamento com cálculo automático,
   PDF para o cliente (orcamento.html) e lançamento no financeiro. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const r2=v=>Math.round((N(v)+Number.EPSILON)*100)/100;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const num=v=>N(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=v=>N(v).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%";
  const parseNum=s=>{s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const somaDias=(iso,n)=>{const d=new Date(iso+"T12:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  const dmy=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m+"/"+y};
  const nro=n=>String(n||0).padStart(4,"0");
  const ST={rascunho:["Rascunho","prod"],enviado:["Enviado","pend"],aprovado:["Aprovado","ok"],recusado:["Recusado","adj"]};
  const UNID=["un","milheiro","cento","m²","metro","pacote","bloco","kit","hora","serviço"];
  const ic=p=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={pdf:ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>'),
    voltar:ic('<path d="M15 18l-6-6 6-6"/>'),mais:ic('<path d="M12 5v14M5 12h14"/>'),lixo:ic('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
    copia:ic('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),caixa:ic('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    salvo:ic('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>')};

  // preço = custo + lucro (lucro em % sobre o custo ou em reais)
  const precoDe=(custo,tipo,lucro)=>r2(N(custo)+(tipo==="pct"?N(custo)*N(lucro)/100:N(lucro)));
  const totais=(itens,desconto)=>{let sub=0,custo=0;(itens||[]).forEach(i=>{sub+=r2(N(i.qtd)*N(i.preco));custo+=r2(N(i.qtd)*N(i.custo))});
    sub=r2(sub);custo=r2(custo);const total=Math.max(r2(sub-N(desconto)),0);return {sub,custo,total,lucro:r2(total-custo)}};

  function criar(el,sb,ctx){
    const LOJA=ctx.modo==="loja";
    let orcs=[], produtos=[], empresa={}, pedidos=null, lancOrc=[], cupons=null, nOfertas=0, cupEd=null, filtroL="todos", filtroP=LOJA?"loja":"todos", sub=LOJA?"produtos":"lista", filtro="abertos", busca="", buscaP="", atual=null, salvarCatalogo=true, sujo=false;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const nomeCli=o=>{const c=clientes().find(x=>x.id===o.cliente_id);return c?c.nome:(o.cliente_nome||"")};

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando orçamentos…</div>`;
      const [a,b,c]=await Promise.all([
        sb.from("orcamentos").select("*").order("criado_em",{ascending:false}),
        sb.from("produtos").select("*").order("nome"),
        sb.from("empresa").select("*").eq("id",1).maybeSingle()]);
      const lo=await sb.from("lancamentos").select("orcamento_id,status,tipo");lancOrc=lo.error?[]:(lo.data||[]).filter(l=>l.orcamento_id);
      const cp=await sb.from("cupons").select("*").order("criado_em",{ascending:false});cupons=cp.error?null:(cp.data||[]);
      const no=await sb.from("contatos").select("id,email,aceita_ofertas").eq("aceita_ofertas",true);nOfertas=no.error?0:(no.data||[]).filter(c=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email||"")).length;
      const lp=await sb.from("loja_pedidos").select("*").order("atualizado_em",{ascending:false}).limit(300);pedidos=lp.error?null:(lp.data||[]);
      const err=a.error||b.error||c.error;
      if(err){el.innerHTML=`<div class="empty">Não consegui carregar os orçamentos. ${/orcamentos|produtos|empresa/.test(err.message||"")?"Rode o arquivo 07 do banco no Supabase.":esc(err.message)}</div>`;return}
      orcs=a.data||[];produtos=b.data||[];empresa=c.data||{};render();
      if(ctx.abrirId){const o=orcs.find(x=>x.id===ctx.abrirId);ctx.abrirId=null;if(o)abrir(o)}else if(ctx.prefill){const pf=ctx.prefill;ctx.prefill=null;novo(pf)}
    }

    /* ---------- lista ---------- */
    function kpisHTML(){
      const mes=hojeISO().slice(0,7), ab=orcs.filter(o=>o.status==="rascunho"||o.status==="enviado");
      const apMes=orcs.filter(o=>o.status==="aprovado"&&String(o.aprovado_em||"").slice(0,7)===mes);
      const dec=orcs.filter(o=>o.status==="aprovado"||o.status==="recusado"), taxa=dec.length?orcs.filter(o=>o.status==="aprovado").length/dec.length*100:null;
      const semResp=orcs.filter(o=>o.status==="enviado"&&o.enviado_em&&(Date.now()-new Date(o.enviado_em))>3*864e5).length;
      const k=(cls,n,t,s)=>`<div class="tk-kpi ${cls}"><b>${n}</b><span>${t}</span>${s?`<small>${s}</small>`:""}</div>`;
      return `<div class="tk-kpis orc-kpis">
        ${k("money",brl(ab.reduce((s,o)=>s+N(o.total),0)),"Em aberto",`${ab.length} orçamento${ab.length===1?"":"s"}`)}
        ${k(semResp?"late":"",orcs.filter(o=>o.status==="enviado").length,"Aguardando resposta",semResp?`${semResp} há mais de 3 dias: cobre retorno`:"")}
        ${k("ok",brl(apMes.reduce((s,o)=>s+N(o.total),0)),"Aprovado no mês",`${apMes.length} orçamento${apMes.length===1?"":"s"}`)}
        ${k("ok",brl(apMes.reduce((s,o)=>s+N(o.lucro_total),0)),"Lucro aprovado no mês","já sem o custo")}
        ${k("",taxa==null?"–":pct(taxa),"Taxa de aprovação",dec.length?`${dec.length} respondido${dec.length===1?"":"s"}`:"")}
      </div>`;
    }
    function topoLojaHTML(){
      const naLoja=produtos.filter(p=>p.na_loja).length, aguard=pedidos?pedidos.filter(x=>x.status==="fechado").length:0, aband=pedidos?pedidos.filter(x=>x.status==="abandonado").length:0;
      const mes=hojeISO().slice(0,7), pagosMes=pedidos?pedidos.filter(x=>x.status==="pago"&&String(x.pago_em||"").slice(0,7)===mes):[];
      const k=(cls,n,t,s)=>`<div class="tk-kpi ${cls}"><b>${n}</b><span>${t}</span>${s?`<small>${s}</small>`:""}</div>`;
      return `<section class="card tk-head">
        <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Loja</h2></div>
          <div class="orc-st-bts"><a class="btn small ghost" href="${esc(linkLoja())}" target="_blank" rel="noopener">Ver a loja</a><button class="btn primary" data-o="prod-novo">${I.mais} Novo produto</button></div></div>
        <div class="tk-kpis orc-kpis">
          ${k("",naLoja,"Produtos na loja",`${produtos.length} cadastrado${produtos.length===1?"":"s"} no total`)}
          ${k("money",brl(pagosMes.reduce((s,x)=>s+N(x.total),0)),"Vendido no mês",`${pagosMes.length} pedido${pagosMes.length===1?"":"s"}`)}
          ${k("",aguard,"Aguardando pagamento","")}
          ${k(aband?"late":"",aband,"Carrinhos abandonados",aband?"vale chamar no WhatsApp":"")}
        </div>
        <div class="seg orc-seg" role="group" aria-label="Seção">
          <button type="button" data-o-sub="produtos" aria-pressed="${sub==="produtos"}">Produtos <b>${naLoja}</b></button>
          <button type="button" data-o-sub="loja" aria-pressed="${sub==="loja"}">Pedidos e link${aguard?` <b>${aguard}</b>`:""}</button>
          <button type="button" data-o-sub="cupons" aria-pressed="${sub==="cupons"}">Cupons</button>
          <button type="button" data-o-sub="empresa" aria-pressed="${sub==="empresa"}">Entrega e retirada</button>
        </div></section>`;
    }
    function topoHTML(){if(LOJA)return topoLojaHTML();
      return `<section class="card tk-head">
        <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Orçamentos</h2></div>
          <button class="btn primary" data-o="novo">${I.mais} Novo orçamento</button></div>
        ${kpisHTML()}
        <div class="seg orc-seg" role="group" aria-label="Seção">
          <button type="button" data-o-sub="lista" aria-pressed="${sub==="lista"}">Orçamentos</button>
          <button type="button" data-o-sub="produtos" aria-pressed="${sub==="produtos"}">Produtos salvos <b>${produtos.length}</b></button>
          <button type="button" data-o-sub="loja" aria-pressed="${sub==="loja"}">Loja online${pedidos&&pedidos.filter(x=>x.status==="fechado").length?` <b>${pedidos.filter(x=>x.status==="fechado").length}</b>`:""}</button>
          <button type="button" data-o-sub="cupons" aria-pressed="${sub==="cupons"}">Cupons${cupons&&cupons.filter(c=>cupomVale(c)).length?` <b>${cupons.filter(c=>cupomVale(c)).length}</b>`:""}</button>
          <button type="button" data-o-sub="empresa" aria-pressed="${sub==="empresa"}">Dados no PDF</button>
        </div></section>`;
    }
    // quando o orçamento vai ser excluído por falta de pagamento (igual ao banco)
    function expiraEm(o){const dias=empresa.orcamento_expira_dias==null?15:N(empresa.orcamento_expira_dias);if(!dias||!o.id)return null;
      const ls=lancOrc.filter(l=>l.orcamento_id===o.id&&l.tipo==="entrada");if(ls.some(l=>l.status==="pago"))return null;
      if(o.status==="enviado")return somaDias(o.validade||somaDias(String(o.criado_em).slice(0,10),dias),1);
      if(o.status==="aprovado"&&ls.some(l=>l.status==="previsto")){const b=new Date(o.assinado_em||o.aprovado_em||o.criado_em);const iso=new Date(b.getTime()-3*3600e3).toISOString().slice(0,10);return somaDias(iso,dias+1)}
      return null}
    const diasAte=iso=>Math.round((new Date(iso+"T12:00")-new Date(hojeISO()+"T12:00"))/864e5);
    function expiraTag(o){const e=expiraEm(o);if(!e)return "";const d=diasAte(e);
      return `<span class="orc-exp${d<=3?" perto":""}" title="Sem pagamento, este orçamento é excluído sozinho">${d<=0?"Exclui hoje":d===1?"Exclui amanhã":"Exclui em "+d+" dias"}</span>`}
    function listaHTML(){
      const cont=f=>orcs.filter(o=>f==="todos"||(f==="abertos"?(o.status==="rascunho"||o.status==="enviado"):o.status===f)).length;
      const q=busca.trim().toLowerCase();
      const vis=orcs.filter(o=>(filtro==="todos"||(filtro==="abertos"?(o.status==="rascunho"||o.status==="enviado"):o.status===filtro))
        &&(!q||(nro(o.numero)+" "+nomeCli(o)+" "+o.titulo+" "+(o.itens||[]).map(i=>i.nome).join(" ")).toLowerCase().includes(q)));
      return `<div class="tk-bar">
          <div class="summary" role="group" aria-label="Filtrar">
            ${[["abertos","Em aberto"],["aprovado","Aprovados"],["recusado","Recusados"],["todos","Todos"]].map(([k,t])=>`<button class="chip" data-o-f="${k}" aria-pressed="${filtro===k}">${t} <b>${cont(k)}</b></button>`).join("")}
          </div>
          <div class="tk-tools"><input type="search" id="orc-busca" placeholder="Buscar cliente, produto ou nº" value="${esc(busca)}" aria-label="Buscar orçamento"></div>
        </div>
        <div class="orc-lista">${vis.map(o=>{const st=ST[o.status]||ST.rascunho, mg=N(o.total)?N(o.lucro_total)/N(o.total)*100:0;
          return `<button type="button" class="orc-row" data-o-id="${o.id}">
            <span class="orc-n">Nº ${nro(o.numero)}</span>
            <span class="orc-t"><b>${esc(nomeCli(o)||"Sem cliente")}</b><small>${esc(o.titulo||(o.itens||[]).map(i=>i.nome).filter(Boolean).slice(0,3).join(", ")||"Sem itens")} · ${dmy(String(o.criado_em).slice(0,10))}</small></span>
            <span class="orc-st"><span class="status ${st[1]}">${st[0]}</span>${o.status==="aprovado"&&!o.lancado_em?'<span class="orc-flag">Lançar no financeiro</span>':""}${o.assinado_em?'<span class="orc-tag-ass">Assinada online</span>':o.status==="enviado"&&o.visto_em?'<span class="orc-tag-vis">Cliente abriu</span>':""}${expiraTag(o)}</span>
            <span class="orc-v"><b>${brl(o.total)}</b><small>lucro ${brl(o.lucro_total)}${N(o.total)?" · "+pct(mg):""}</small></span>
          </button>`}).join("")||`<div class="empty">${orcs.length?"Nenhum orçamento neste filtro.":"Nenhum orçamento ainda. Clique em Novo orçamento: os produtos que você usar ficam salvos com custo e lucro para os próximos."}</div>`}</div>`;
    }

    /* ---------- produtos salvos ---------- */
    function produtosHTML(){
      const q=buscaP.trim().toLowerCase(), vis=produtos.filter(p=>(filtroP==="todos"||(filtroP==="loja"?p.na_loja:!p.na_loja))&&(!q||(p.nome+" "+p.descricao+" "+p.fornecedor+" "+p.categoria).toLowerCase().includes(q)));
      return `<div class="tk-bar">${LOJA?`<div class="summary" role="group" aria-label="Filtrar produtos">${[["loja","Na loja",produtos.filter(p=>p.na_loja).length],["fora","Fora da loja",produtos.filter(p=>!p.na_loja).length],["todos","Todos",produtos.length]].map(([v,t,n])=>`<button class="chip" data-p-f="${v}" aria-pressed="${filtroP===v}">${t} <b>${n}</b></button>`).join("")}</div>`
          :`<p class="note" style="margin:0">Custo e lucro ficam guardados aqui. Ao salvar um orçamento, produtos novos entram sozinhos e os valores alterados são atualizados.</p>`}
          <div class="tk-tools"><input type="search" id="prod-busca" placeholder="Buscar produto" value="${esc(buscaP)}" aria-label="Buscar produto"><button class="btn small primary" data-o="prod-novo">${I.mais} Novo produto</button></div></div>
        <div class="orc-lista">${vis.map(p=>{const lucroR=r2(N(p.preco)-N(p.custo));return `<button type="button" class="orc-row prod-row" data-p-id="${p.id}">
            <span class="orc-t"><b>${esc(p.nome)}${p.na_loja?` <span class="badge-loja">Na loja</span>`:""}${p.preco_tipo==="m2"?` <span class="badge-loja m2">por m²</span>`:""}${p.tipo==="servico"?` <span class="badge-loja m2">serviço</span>`:""}</b><small>${esc([p.descricao,p.fornecedor&&("Fornecedor: "+p.fornecedor),(p.faixas||[]).length?(p.faixas.length+" faixa"+(p.faixas.length>1?"s":"")+" de quantidade"):""].filter(Boolean).join(" · ")||"Sem especificação")}</small></span>
            <span class="prod-c"><small>Custo</small><b>${brl(p.custo)}</b></span>
            <span class="prod-c"><small>Lucro</small><b class="ok-txt">${p.lucro_tipo==="pct"?pct(p.lucro):brl(p.lucro)}</b></span>
            <span class="orc-v"><b>${brl(p.preco)}</b><small>por ${esc(p.unidade)} · +${brl(lucroR)}</small></span></button>`}).join("")||`<div class="empty">${LOJA&&filtroP==="loja"?"Nenhum produto na loja ainda. Clique em Novo produto, ou em “Fora da loja” para escolher um produto que você já tem e marcar “Mostrar este produto na loja”.":produtos.length?"Nenhum produto encontrado.":"Nenhum produto salvo ainda."}</div>`}</div>
        <dialog class="tk-dlg" id="orc-dlg"></dialog>`;
    }
    function prodForm(p){
      const novo=!p.id;
      return `<form method="dialog" class="tk-form" id="prod-form">
        <div class="head"><h2>${novo?"Novo produto":"Editar produto"}</h2><button type="button" class="tk-x" data-o="dlg-fechar" aria-label="Fechar">✕</button></div>
        <div><label class="label" for="pf-nome">Produto</label><input type="text" id="pf-nome" required maxlength="160" value="${esc(p.nome||"")}" placeholder="Ex.: Cartão de visita 1000 un"></div>
        <div><label class="label" for="pf-desc">Especificação (aparece no PDF)</label><input type="text" id="pf-desc" maxlength="300" value="${esc(p.descricao||"")}" placeholder="Ex.: 9x5 cm, couché 300 g, 4x4 cores, laminação fosca"></div>
        <div><span class="label">Como cobra</span><div class="seg" role="radiogroup" aria-label="Como cobra" id="pf-ptipo">
          <button type="button" data-ptipo="faixas" aria-pressed="${(p.preco_tipo||"faixas")!=="m2"}">Por quantidade (faixas)</button><button type="button" data-ptipo="m2" aria-pressed="${p.preco_tipo==="m2"}">Por m² (lona, adesivo)</button></div></div>
        <div class="grid2">
          <div><label class="label" for="pf-un">Unidade</label><input type="text" id="pf-un" list="orc-unid" value="${esc(p.unidade||"un")}"></div>
          <div><label class="label" for="pf-forn">Fornecedor / gráfica</label><input type="text" id="pf-forn" value="${esc(p.fornecedor||"")}"></div>
          <div><label class="label" for="pf-custo"><span class="pf-m2-on">Custo do m² (R$)</span><span class="pf-m2-off">Custo (R$)</span></label><input type="text" id="pf-custo" inputmode="decimal" value="${p.custo!=null?num(p.custo):""}" placeholder="0,00"></div>
          <div><label class="label" for="pf-lucro">Lucro</label><div class="orc-lucro"><input type="text" id="pf-lucro" inputmode="decimal" value="${p.lucro!=null?String(p.lucro).replace(".",","):String(N(empresa.lucro_padrao)||40).replace(".",",")}">
            <select id="pf-tipo" aria-label="Tipo de lucro"><option value="pct" ${(p.lucro_tipo||"pct")==="pct"?"selected":""}>%</option><option value="valor" ${p.lucro_tipo==="valor"?"selected":""}>R$</option></select></div></div>
        </div>
        <p class="orc-calc" id="pf-calc"></p>
        <fieldset class="orc-fs"><legend>Loja online</legend>
          <label class="check"><input type="checkbox" id="pf-loja" ${p.na_loja?"checked":""}> Mostrar este produto na loja</label>
          <div><span class="label">Tipo</span><div class="seg" role="radiogroup" aria-label="Tipo de produto" id="pf-tipoprod">
            <button type="button" data-tp="grafico" aria-pressed="${(p.tipo||"grafico")!=="servico"}">Material gráfico</button><button type="button" data-tp="servico" aria-pressed="${p.tipo==="servico"}">Serviço (vídeo, posts, site…)</button></div>
            <small class="note">Serviço não pergunta arte nem entrega na loja. Use as faixas para os pacotes (ex.: 4, 8 ou 12 posts).</small></div>
          <div class="grid2">
            <div><label class="label" for="pf-cat">Categoria</label><input type="text" id="pf-cat" list="pf-cats" value="${esc(p.categoria||"")}" placeholder="Ex.: Cartões, Banners, Panfletos"><datalist id="pf-cats">${[...new Set(produtos.map(x=>x.categoria).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join("")}</datalist></div>
            <div><label class="label" for="pf-prazo">Prazo de produção</label><input type="text" id="pf-prazo" value="${esc(p.prazo||"")}" placeholder="Ex.: 5 dias úteis após aprovar a arte"></div>
            <div class="pf-graf"><label class="label" for="pf-arte">Valor da criação da arte (R$)</label><input type="text" id="pf-arte" inputmode="decimal" value="${num(p.arte_valor||0)}"><small class="note">Somado quando o cliente não tem a arte pronta.</small></div>
            <div><span class="label">Foto</span><div class="pf-foto">${p.foto?`<img src="${esc(p.foto)}" alt="" id="pf-foto-img">`:`<span class="pf-foto-vazia" id="pf-foto-img">Sem foto</span>`}
              <label class="btn small">Escolher foto<input type="file" id="pf-foto-arq" accept="image/jpeg,image/png,image/webp" hidden></label>${p.foto?`<button type="button" class="btn small ghost" data-o="foto-tira">Tirar</button>`:""}</div>
              <input type="hidden" id="pf-foto" value="${esc(p.foto||"")}"></div>
          </div>
          <div class="pf-m2-on"><label class="label" for="pf-amin">Área mínima cobrada por peça (m²)</label><input type="text" id="pf-amin" inputmode="decimal" value="${String(N(p.area_min)||"").replace(".",",")}" placeholder="Ex.: 0,5 (vazio = sem mínimo)"><small class="note">Na loja o cliente digita largura × altura em cm e a quantidade. Preço = m² × preço do m² acima.</small></div>
          <div class="pf-m2-off"><span class="label">Faixas de quantidade (o preço de cada uma sai do custo + o seu lucro)</span>
            <div class="fx-lista" id="pf-faixas">${(p.faixas&&p.faixas.length?p.faixas:[{qtd:"",custo:""}]).map(fxRow).join("")}</div>
            <button type="button" class="btn small" data-o="fx-add" style="margin-top:8px">${I.mais} Adicionar faixa</button></div>
        </fieldset>
        <div class="actions"><button type="submit" class="btn primary" data-o="prod-salvar">${novo?"Salvar produto":"Salvar"}</button><button type="button" class="btn ghost" data-o="dlg-fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn danger small" data-o="prod-apagar" data-id="${p.id}" style="margin-left:auto">Apagar</button>`}</div></form>`;
    }
    const pfTipo=()=>{const b=el.querySelector("#pf-ptipo [aria-pressed=true]");return b?b.dataset.ptipo:"faixas"};
    const pfTp=()=>{const b=el.querySelector("#pf-tipoprod [aria-pressed=true]");return b?b.dataset.tp:"grafico"};
    const pfTipoAplica=()=>{const f=el.querySelector("#prod-form");if(f){f.classList.toggle("pf-m2",pfTipo()==="m2");f.classList.toggle("pf-serv",pfTp()==="servico")}};
    function fxRow(f){return `<div class="fx-row"><div><label class="label">Quantidade</label><input type="text" inputmode="numeric" data-fx="qtd" value="${f.qtd!==""&&f.qtd!=null?String(f.qtd):""}" placeholder="Ex.: 500"></div>
      <div><label class="label">Seu custo (R$)</label><input type="text" inputmode="decimal" data-fx="custo" value="${f.custo!==""&&f.custo!=null?num(f.custo):""}" placeholder="0,00"></div>
      <span class="fx-p"><small>Preço na loja</small><b>–</b></span><button type="button" class="tk-x" data-o="fx-rm" aria-label="Tirar esta faixa">✕</button></div>`}
    const lerFaixas=()=>[...el.querySelectorAll("#pf-faixas .fx-row")].map(r=>({qtd:parseNum(r.querySelector('[data-fx="qtd"]').value),custo:r2(parseNum(r.querySelector('[data-fx="custo"]').value))})).filter(f=>f.qtd>0);
    function calcProdForm(){const v=s=>el.querySelector(s).value;const c=parseNum(v("#pf-custo")),t=v("#pf-tipo"),l=parseNum(v("#pf-lucro")),p=precoDe(c,t,l);
      el.querySelectorAll("#pf-faixas .fx-row").forEach(r=>{const q=parseNum(r.querySelector('[data-fx="qtd"]').value),fc=parseNum(r.querySelector('[data-fx="custo"]').value),fp=precoDe(fc,t,l);
        r.querySelector(".fx-p b").textContent=q&&fc?brl(fp):"–";r.querySelector(".fx-p small").textContent=q&&fc?`Preço na loja · ${brl(fp/q)} cada`:"Preço na loja"});
      el.querySelector("#pf-calc").innerHTML=`Preço de venda: <b>${brl(p)}</b> por ${esc(v("#pf-un")||"un")} · lucro de <b class="ok-txt">${brl(p-c)}</b>${p?` (margem de ${pct((p-c)/p*100)} do preço)`:""}`}


    /* ---------- loja online ---------- */
    const linkLoja=()=>new URL("loja.html",location.href).href;
    const STL={carrinho:["Carrinho aberto","pend"],abandonado:["Abandonou","adj"],fechado:["Aguardando pagamento","pend"],pago:["Pago","ok"],cancelado:["Cancelado","prod"]};
    function lojaHTML(){
      if(!pedidos)return `<div class="empty">Rode o arquivo 19 do banco no Supabase para ligar a loja online.</div>`;
      const e=empresa, link=linkLoja(), mes=hojeISO().slice(0,7), naLoja=produtos.filter(p=>p.na_loja&&(p.faixas||[]).length);
      const pagosMes=pedidos.filter(x=>x.status==="pago"&&String(x.pago_em||"").slice(0,7)===mes);
      const vis=pedidos.filter(x=>filtroL==="todos"||x.status===filtroL);
      const msg=encodeURIComponent(`Olá! Monte seu pedido de material gráfico por aqui: escolha os produtos, envie sua arte (ou deixe que a gente cria) e pague online. ${link}`);
      const k=(cls,n,t,s)=>`<div class="tk-kpi ${cls}"><b>${n}</b><span>${t}</span>${s?`<small>${s}</small>`:""}</div>`;
      const fone=x=>window.GlaraCRM&&window.GlaraCRM.foneWa?window.GlaraCRM.foneWa(x):String(x||"").replace(/\D/g,"").replace(/^(?!55)(\d{10,11})$/,"55$1");
      const wa=x=>{const f=fone(x.telefone);if(!f)return "";const t=x.status==="abandonado"||x.status==="carrinho"?`Olá, ${x.nome.split(" ")[0]}! Vi que você montou um pedido na nossa loja e não finalizou. Posso te ajudar com alguma dúvida? ${link}`:`Olá, ${x.nome.split(" ")[0]}! Sobre o seu pedido na nossa loja:`;
        return `<a class="btn small ghost" href="https://wa.me/${f}?text=${encodeURIComponent(t)}" target="_blank" rel="noopener">WhatsApp</a>`};
      return `<section class="card orc-loja">
        <div class="head"><div><h2>Loja online</h2><p class="note" style="margin:4px 0 0">${naLoja.length} produto${naLoja.length===1?"":"s"} na loja. Marque “Mostrar na loja” em Produtos salvos e cadastre as faixas de quantidade.</p></div></div>
        <div class="orc-prop-link"><input type="text" readonly value="${esc(link)}" aria-label="Link da loja" id="lj-link"><button type="button" class="btn small" data-o="loja-copiar">Copiar</button></div>
        <div class="orc-st-bts"><a class="btn small ghost" href="https://wa.me/?text=${msg}" target="_blank" rel="noopener">Enviar no WhatsApp</a><a class="btn small ghost" href="${esc(link)}" target="_blank" rel="noopener">Ver a loja</a></div>
        <p class="note" style="margin:0">Dica: para saber de onde veio o cliente, acrescente <b>?origem=instagram</b> (ou outro nome) no fim do link. Aparece no CRM.</p>
        <div class="tk-kpis orc-kpis">
          ${k("money",brl(pagosMes.reduce((s,x)=>s+N(x.total),0)),"Vendido no mês",`${pagosMes.length} pedido${pagosMes.length===1?"":"s"} pago${pagosMes.length===1?"":"s"}`)}
          ${k("",pedidos.filter(x=>x.status==="fechado").length,"Aguardando pagamento","")}
          ${k(pedidos.filter(x=>x.status==="abandonado").length?"late":"",pedidos.filter(x=>x.status==="abandonado").length,"Carrinhos abandonados","vale chamar no WhatsApp")}
          ${k("",pedidos.filter(x=>x.status==="carrinho").length,"Montando agora","")}
        </div></section>
      <section class="card">
        <div class="tk-bar"><h3 style="margin:0">Pedidos e carrinhos</h3>
          <div class="seg" role="group" aria-label="Filtrar pedidos">${[["todos","Todos"],["fechado","Aguardando pagamento"],["pago","Pagos"],["abandonado","Abandonados"],["carrinho","Carrinhos"]].map(([v,t])=>`<button type="button" data-l-f="${v}" aria-pressed="${filtroL===v}">${t}</button>`).join("")}</div></div>
        <div class="lj-lista">${vis.map(x=>{const st=STL[x.status]||[x.status,""];const artes=(x.itens||[]).filter(i=>i.arquivo&&i.arquivo.caminho);
          return `<article class="lj-ped"><div class="lj-ped-h"><div><b>${esc(x.empresa||x.nome)}</b><small>${esc([x.empresa?x.nome:"",x.telefone,x.email].filter(Boolean).join(" · "))}${x.origem?` · origem: ${esc(x.origem)}`:""}</small></div>
              <div class="lj-ped-v"><b>${brl(x.total)}</b><span class="status ${st[1]}">${st[0]}</span></div></div>
            <ul>${(x.itens||[]).map(i=>`<li>${esc(i.nome)} · ${N(i.qtd).toLocaleString("pt-BR")} ${esc(i.unidade||"")}${i.preco_tipo==="m2"&&i.largura?` · ${N(i.largura).toLocaleString("pt-BR")}×${N(i.altura).toLocaleString("pt-BR")} cm (${N(i.area_m2).toLocaleString("pt-BR",{maximumFractionDigits:2})} m²)`:""} <small>${i.arte==="tem"?"arte do cliente (revisar)":i.arte==="criar"?"criar a arte":"arte não escolhida"}</small></li>`).join("")}
              ${x.identidade==="criar"?`<li>Criação de identidade visual</li>`:""}${x.entrega_tipo?`<li>${x.entrega_tipo==="entrega"?"Entrega":"Retirada"}${N(x.entrega_valor)?" · "+brl(x.entrega_valor):""}</li>`:""}</ul>
            <div class="orc-st-bts"><small class="note">${x.status==="pago"&&x.pago_em?"Pago em "+dmy(String(x.pago_em).slice(0,10)):"Atualizado em "+dmy(String(x.atualizado_em).slice(0,10))}</small>
              ${artes.map(i=>`<button type="button" class="btn small" data-o="arte-baixar" data-c="${esc(i.arquivo.caminho)}" data-n="${esc(i.arquivo.nome||"arte")}">Baixar arte: ${esc(i.arquivo.nome||"arquivo")}</button>`).join("")}
              ${x.orcamento_id?`<button type="button" class="btn small ghost" data-o="ped-orc" data-id="${x.orcamento_id}">Ver pedido nº ${nro((orcs.find(o=>o.id===x.orcamento_id)||{}).numero)}</button>`:""}${wa(x)}</div></article>`}).join("")||`<div class="empty">Nenhum pedido ${filtroL==="todos"?"ainda. Mande o link da loja para os clientes":"neste filtro"}.</div>`}</div></section>
      <form class="card orc-emp" id="loja-form">
        <div class="head"><h2>Configurações da loja</h2></div>
        <label class="check"><input type="checkbox" id="lj-ativa" ${e.loja_ativa!==false?"checked":""}> Loja aberta</label>
        <div class="grid2">
          <div><label class="label" for="lj-tit">Título</label><input type="text" id="lj-tit" value="${esc(e.loja_titulo||"Serviços e material gráfico")}"></div>
          <div><label class="label" for="lj-idv">Valor da criação de identidade visual (R$)</label><input type="text" id="lj-idv" inputmode="decimal" value="${num(e.identidade_valor||0)}"></div>
        </div>
        <div><label class="label" for="lj-txt">Texto de abertura</label><textarea id="lj-txt" style="min-height:60px">${esc(e.loja_texto||"")}</textarea></div>
        <fieldset class="orc-fs"><legend>Faixa dos planos de assessoria</legend>
          <label class="check"><input type="checkbox" id="lj-cta" ${e.loja_cta_ativo!==false?"checked":""}> Mostrar na loja a faixa falando dos planos (com “Ver os planos” e WhatsApp)</label>
          <div><label class="label" for="lj-ctat">Título</label><input type="text" id="lj-ctat" value="${esc(e.loja_cta_titulo||"Assessoria de marketing e gestão de redes sociais")}"></div>
          <div><label class="label" for="lj-ctax">Texto</label><textarea id="lj-ctax" style="min-height:56px">${esc(e.loja_cta_texto||"")}</textarea></div>
          <p class="note" style="margin:0">Os planos você monta em <b>Planos e mídia</b>. O WhatsApp usa o telefone de Dados no PDF.</p></fieldset>
        <div><label class="label" for="lj-idi">O que vem na identidade visual</label><input type="text" id="lj-idi" value="${esc(e.identidade_info||"")}"></div>
        <p class="note" style="margin:0">Retirada, entrega e valor do frete ficam em <b>Dados no PDF</b>. O valor da arte é de cada produto. O cliente paga tudo de uma vez pelo Mercado Pago.</p>
        <div class="actions"><button type="submit" class="btn primary">Salvar configurações</button></div></form>`;
    }

    /* ---------- cupons de desconto ---------- */
    const cupomVale=c=>c.ativo&&(!c.valido_ate||c.valido_ate>=hojeISO())&&(c.usos_max==null||N(c.usos)<N(c.usos_max));
    const ONDE={tudo:"Qualquer cobrança",loja:"Só pedidos da loja",orcamentos:"Orçamentos e propostas",mensalidades:"Só mensalidades"};
    const cupomTxt=c=>c.tipo==="pct"?`${String(N(c.valor)).replace(".",",")}% de desconto`:`${brl(c.valor)} de desconto`;
    const cupomMsg=c=>`Olá! Separei um cupom para você: *${c.codigo}* – ${cupomTxt(c)}${N(c.minimo)?` em compras a partir de ${brl(c.minimo)}`:""}${c.valido_ate?`, válido até ${dmy(c.valido_ate)}`:""}. É só digitar o código na hora do pagamento.${c.onde==="mensalidades"?"":` Monte seu pedido aqui: ${linkLoja()}`}`;
    function cuponsHTML(){
      if(!cupons)return `<div class="empty">Rode o arquivo 22 do banco no Supabase para criar cupons.</div>`;
      return `<section class="card">
        <div class="tk-bar"><div><h2 style="margin:0">Cupons de desconto</h2><p class="note" style="margin:4px 0 0">O cliente digita o código na tela de pagamento e o valor cai na hora. O desconto nunca deixa a cobrança abaixo do custo (impressão + entrega).</p></div>
          <button type="button" class="btn small primary" data-o="cup-novo">${I.mais} Novo cupom</button></div>
        <div class="cup-lista">${cupons.map(c=>{const v=cupomVale(c), m=encodeURIComponent(cupomMsg(c));
          const motivo=!c.ativo?"Pausado":c.valido_ate&&c.valido_ate<hojeISO()?"Venceu":c.usos_max!=null&&N(c.usos)>=N(c.usos_max)?"Esgotado":"Ativo";
          return `<article class="cup${v?"":" off"}"><div class="cup-h"><div><b class="cup-cod">${esc(c.codigo)}</b><span class="status ${v?"ok":"prod"}">${motivo}</span>
              <small>${esc(cupomTxt(c))} · ${esc(ONDE[c.onde]||c.onde)}${N(c.minimo)?" · mínimo "+brl(c.minimo):""}${c.valido_ate?" · até "+dmy(c.valido_ate):" · sem validade"} · usado ${N(c.usos)}${c.usos_max!=null?" de "+c.usos_max:""} vez${N(c.usos)===1?"":"es"}${c.descricao?" · "+esc(c.descricao):""}</small></div>
              <button type="button" class="btn small ghost" data-o="cup-editar" data-id="${c.id}">Editar</button></div>
            ${v?`<div class="orc-st-bts"><button type="button" class="btn small" data-o="cup-copiar" data-id="${c.id}">${I.copia} Copiar mensagem</button>
              <a class="btn small ghost" href="https://wa.me/?text=${m}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
              <a class="btn small ghost" href="mailto:?subject=${encodeURIComponent("Cupom de desconto: "+c.codigo)}&body=${m}">Enviar por e-mail</a>
              ${nOfertas?`<button type="button" class="btn small ghost" data-o="cup-massa" data-id="${c.id}">E-mail para quem aceita ofertas (${nOfertas})</button>`:""}</div>`:""}</article>`}).join("")||`<div class="empty">Nenhum cupom ainda. Crie um e mande para os clientes.</div>`}</div>
        <dialog class="tk-dlg" id="orc-dlg"></dialog></section>`;
    }
    function cupomForm(c){const novo=!c.id;
      return `<form method="dialog" class="tk-form" id="cup-form">
        <div class="head"><h2>${novo?"Novo cupom":"Editar cupom"}</h2><button type="button" class="tk-x" data-o="dlg-fechar" aria-label="Fechar">✕</button></div>
        <div class="grid2">
          <div><label class="label" for="cp-cod">Código</label><input type="text" id="cp-cod" maxlength="30" required value="${esc(c.codigo||"")}" placeholder="Ex.: BEMVINDO10" style="text-transform:uppercase"></div>
          <div><label class="label" for="cp-desc">Descrição (só você vê)</label><input type="text" id="cp-desc" value="${esc(c.descricao||"")}" placeholder="Ex.: Campanha de novembro"></div>
          <div><span class="label">Desconto</span><div class="orc-lucro"><input type="text" id="cp-val" inputmode="decimal" value="${c.valor!=null?String(c.valor).replace(".",","):""}" placeholder="10"><select id="cp-tipo" aria-label="Tipo de desconto"><option value="pct" ${(c.tipo||"pct")==="pct"?"selected":""}>%</option><option value="valor" ${c.tipo==="valor"?"selected":""}>R$</option></select></div></div>
          <div><label class="label" for="cp-onde">Vale para</label><select id="cp-onde">${Object.entries(ONDE).map(([k,t])=>`<option value="${k}" ${(c.onde||"tudo")===k?"selected":""}>${t}</option>`).join("")}</select></div>
          <div><label class="label" for="cp-ate">Válido até</label><input type="date" id="cp-ate" value="${esc(c.valido_ate||"")}"><small class="note">Vazio = sem validade</small></div>
          <div><label class="label" for="cp-max">Limite de usos</label><input type="text" id="cp-max" inputmode="numeric" value="${c.usos_max??""}" placeholder="Vazio = sem limite"></div>
          <div><label class="label" for="cp-min">Valor mínimo da cobrança (R$)</label><input type="text" id="cp-min" inputmode="decimal" value="${N(c.minimo)?num(c.minimo):""}" placeholder="0,00"></div>
        </div>
        <label class="check"><input type="checkbox" id="cp-ativo" ${c.ativo!==false?"checked":""}> Cupom ativo</label>
        <div class="actions"><button type="submit" class="btn primary">${novo?"Criar cupom":"Salvar"}</button><button type="button" class="btn ghost" data-o="dlg-fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn danger small" data-o="cup-apagar" data-id="${c.id}" style="margin-left:auto">Apagar</button>`}</div></form>`}

    /* ---------- dados da empresa ---------- */
    function empresaHTML(){
      const e=empresa, f=(id,l,v,ph,extra)=>`<div><label class="label" for="em-${id}">${l}</label><input type="text" id="em-${id}" value="${esc(v??"")}" placeholder="${esc(ph||"")}" ${extra||""}></div>`;
      return `<form class="card orc-emp" id="emp-form">
        <div class="head"><div><h2>Dados que aparecem no PDF</h2><p class="note" style="margin:4px 0 0">O logo do PDF é o mesmo do painel.</p></div></div>
        <div class="grid2">
          ${f("nome","Nome da empresa",e.nome,"GUXTA")}${f("doc","CNPJ ou CPF",e.documento,"00.000.000/0001-00")}
          ${f("tel","WhatsApp / telefone",e.telefone,"(21) 90000-0000")}${f("email","E-mail",e.email,"contato@guxta.com.br")}
          ${f("site","Site ou Instagram",e.site,"@guxta")}${f("end","Cidade / endereço",e.endereco,"Duque de Caxias · RJ")}
          ${f("pix","Chave Pix",e.pix,"")}${f("val","Validade padrão (dias)",e.validade_dias??15,"15",'inputmode="numeric"')}
          ${f("lucro","Lucro padrão para itens novos (%)",e.lucro_padrao??40,"40",'inputmode="decimal"')}${f("exp","Excluir orçamento sem pagamento após (dias)",e.orcamento_expira_dias??15,"15",'inputmode="numeric"')}
        </div>
        <fieldset class="orc-fs"><legend>Retirada e entrega do material</legend>
          <p class="note" style="margin:0">Na proposta online, o cliente preenche o cadastro e escolhe: retirar no seu endereço, sem custo, ou receber em casa, pagando o valor da entrega junto com o pedido.</p>
          <div class="grid2">
            ${f("ret","Endereço para retirada",e.retirada_endereco,"Rua, número, bairro · cidade")}${f("reti","Horário e instruções da retirada",e.retirada_info,"Seg a sex, 9h às 18h. Avise antes de vir.")}
          </div>
          <label class="check"><input type="checkbox" id="em-entr" ${e.entrega_ativa!==false?"checked":""}> Oferecer entrega no endereço do cliente</label>
          <div class="grid2">
            ${f("entv","Valor cobrado do cliente pela entrega (R$)",num(e.entrega_valor??0),"0,00",'inputmode="decimal"')}${f("entc","Quanto você paga pela entrega (R$)",e.entrega_custo!=null?num(e.entrega_custo):"","Vazio = o mesmo valor cobrado",'inputmode="decimal"')}${f("enti","Informação da entrega",e.entrega_info,"Ex.: Só Baixada Fluminense e Rio. Até 2 dias úteis após a produção.")}
          </div>
        </fieldset>
        <div><label class="label" for="em-cond">Condições de pagamento padrão</label><textarea id="em-cond" style="min-height:70px">${esc(e.condicoes||"")}</textarea></div>
        <div><label class="label" for="em-obs">Observações padrão (rodapé)</label><textarea id="em-obs" style="min-height:70px" placeholder="Ex.: Valores para arte já aprovada. Alterações após a aprovação da prova podem gerar custo.">${esc(e.observacoes||"")}</textarea></div>
        <div class="actions"><button type="submit" class="btn primary">Salvar dados</button></div></form>`;
    }

    /* ---------- editor ---------- */
    const itemVazio=()=>({nome:"",descricao:"",unidade:"un",qtd:1,custo:0,lucro_tipo:"pct",lucro:N(empresa.lucro_padrao)||40,preco:0});
    function novo(pf){
      pf=pf&&pf.nome?pf:null;
      atual={status:"rascunho",contato_id:pf?pf.id:null,contato_nome:pf?pf.nome:"",cliente_id:pf&&pf.cliente_id||null,cliente_nome:pf?(pf.empresa||pf.nome):"",cliente_contato:pf?(pf.telefone||pf.email||""):"",titulo:pf&&pf.interesse||"",itens:[itemVazio()],desconto:0,
        validade:somaDias(hojeISO(),N(empresa.validade_dias)||15),prazo_entrega:"",condicoes:empresa.condicoes||"",observacoes:empresa.observacoes||""};
      sub="editor";sujo=false;render();setTimeout(()=>{const i=el.querySelector("#oe-cli");i&&i.focus()},30);
    }
    function abrir(o){atual=JSON.parse(JSON.stringify(o));atual.itens=atual.itens&&atual.itens.length?atual.itens:[itemVazio()];sub="editor";sujo=false;render();window.scrollTo({top:0})}
    // troca entre "por unidade" e "por m²" sem redesenhar o item (o cursor continua onde estava)
    function modoItem(div,m2){const k=div.dataset.k, q=s=>div.querySelector(s);
      div.classList.toggle("oi-em-m2",m2);q(".oi-m2").hidden=!m2;
      div.querySelectorAll('[data-o="item-modo"]').forEach(x=>x.setAttribute("aria-pressed",String((x.dataset.v==="m2")===m2)));
      const u=q('[data-f="unidade"]');if(u){u.value=m2?"m²":(/m²|m2/i.test(u.value)?"un":u.value);u.closest("div").hidden=m2}
      q(`label[for="oi-q${k}"]`).textContent=m2?"Área total (m²)":"Qtd";q(`label[for="oi-c${k}"]`).textContent=m2?"Custo do m²":"Custo un.";q(`label[for="oi-p${k}"]`).textContent=m2?"Preço do m²":"Preço un."}
    function itemHTML(i,k){
      const lucroItem=r2(N(i.qtd)*(N(i.preco)-N(i.custo))), tot=r2(N(i.qtd)*N(i.preco)), noCat=produtos.some(p=>p.id===i.produto_id||p.nome.toLowerCase()===String(i.nome||"").trim().toLowerCase());
      const m2=/m²|m2/i.test(i.unidade||"");
      return `<div class="oi${m2?" oi-em-m2":""}" data-k="${k}">
        <div class="oi-a">
          <div class="oi-nome"><label class="label" for="oi-n${k}">Produto ${k+1}${noCat?` <span class="oi-cat" title="Está nos produtos salvos">${I.salvo} salvo</span>`:""}</label><input type="text" id="oi-n${k}" data-f="nome" list="orc-prods" value="${esc(i.nome)}" placeholder="Digite ou escolha um produto salvo" autocomplete="off"></div>
          <div class="oi-desc"><label class="label" for="oi-d${k}">Especificação</label><input type="text" id="oi-d${k}" data-f="descricao" value="${esc(i.descricao)}" placeholder="Medida, papel, cores, acabamento"></div>
          <button type="button" class="oi-rm" data-o="item-rm" aria-label="Remover produto ${k+1}">${I.lixo}</button>
        </div>
        <div class="oi-modo" role="group" aria-label="Como cobrar o produto ${k+1}"><span class="label">Cobrar</span>
          <button type="button" data-o="item-modo" data-v="un" aria-pressed="${!m2}">Por unidade</button>
          <button type="button" data-o="item-modo" data-v="m2" aria-pressed="${m2}">Por m² (lona, adesivo, banner)</button></div>
        <div class="oi-m2"${m2?"":" hidden"}><span class="label">Medida de cada peça</span>
          <input type="text" data-m2="l" inputmode="decimal" value="${i.largura?String(i.largura).replace(".",","):""}" placeholder="Largura (cm)" aria-label="Largura em cm"><span>×</span>
          <input type="text" data-m2="a" inputmode="decimal" value="${i.altura?String(i.altura).replace(".",","):""}" placeholder="Altura (cm)" aria-label="Altura em cm"><span>×</span>
          <input type="text" data-m2="q" inputmode="numeric" value="${i.pecas||""}" placeholder="Peças" aria-label="Quantidade de peças">
          <small class="note" data-m2-res>${i.largura&&i.altura&&i.pecas?`= ${String(Math.round(i.largura*i.altura/10000*i.pecas*10000)/10000).replace(".",",")} m²`:"a área total vai para a Qtd (m²)"}</small></div>
        <div class="oi-b">
          <div><label class="label" for="oi-q${k}">${m2?"Área total (m²)":"Qtd"}</label><input type="text" id="oi-q${k}" data-f="qtd" inputmode="decimal" value="${String(N(i.qtd)).replace(".",",")}"></div>
          <div${m2?" hidden":""}><label class="label" for="oi-u${k}">Unidade</label><input type="text" id="oi-u${k}" data-f="unidade" list="orc-unid" value="${esc(i.unidade||"un")}"></div>
          <div><label class="label" for="oi-c${k}">${m2?"Custo do m²":"Custo un."}</label><input type="text" id="oi-c${k}" data-f="custo" inputmode="decimal" value="${num(i.custo)}"></div>
          <div><label class="label" for="oi-l${k}">Lucro</label><div class="orc-lucro"><input type="text" id="oi-l${k}" data-f="lucro" inputmode="decimal" value="${String(r2(i.lucro)).replace(".",",")}"><select data-f="lucro_tipo" aria-label="Tipo de lucro do produto ${k+1}"><option value="pct" ${i.lucro_tipo!=="valor"?"selected":""}>%</option><option value="valor" ${i.lucro_tipo==="valor"?"selected":""}>R$</option></select></div></div>
          <div><label class="label" for="oi-p${k}">${m2?"Preço do m²":"Preço un."}</label><input type="text" id="oi-p${k}" data-f="preco" inputmode="decimal" value="${num(i.preco)}" class="oi-preco"></div>
          <div class="oi-tot"><span class="label">Total</span><b data-tot>${brl(tot)}</b><small class="ok-txt" data-luc>+ ${brl(lucroItem)} de lucro</small></div>
        </div></div>`;
    }
    function resumoHTML(){
      const t=totais(atual.itens,atual.desconto), mg=t.total?t.lucro/t.total*100:0, sob=t.custo?t.lucro/t.custo*100:0;
      const parteC=t.total?Math.min(100,t.custo/t.total*100):0;
      return `<div class="orc-resumo" id="orc-resumo">
        <h3>Resumo</h3>
        <dl>
          <div><dt>Subtotal</dt><dd>${brl(t.sub)}</dd></div>
          <div class="orc-desc"><dt><label for="oe-desc">Desconto (R$)</label></dt><dd><input type="text" id="oe-desc" inputmode="decimal" value="${num(atual.desconto)}"></dd></div>
          <div class="orc-total"><dt>Total para o cliente</dt><dd>${brl(t.total)}</dd></div>
        </dl>
        <div class="orc-split" title="Do total, quanto paga o custo e quanto é lucro"><i style="width:${parteC}%"></i></div>
        <dl class="orc-int">
          <div><dt><i class="sw c"></i>Custo (paga a gráfica)</dt><dd>${brl(t.custo)}</dd></div>
          <div><dt><i class="sw l"></i>Seu lucro</dt><dd class="${t.lucro<0?"neg":"ok-txt"}">${brl(t.lucro)}</dd></div>
          <div><dt>Margem</dt><dd>${pct(mg)} do preço${t.custo?` · ${pct(sob)} sobre o custo`:""}</dd></div>
        </dl>
        <p class="note">Custo e lucro só aparecem aqui. O PDF do cliente mostra apenas os preços.</p>
      </div>`;
    }
    function editorHTML(){
      const o=atual, st=ST[o.status]||ST.rascunho, cli=clientes();
      return `<section class="card orc-ed">
        <div class="orc-ed-top">
          <button type="button" class="btn small ghost" data-o="voltar">${I.voltar} Orçamentos</button>
          <div class="orc-ed-tt"><span class="eyebrow">${o.id?"Orçamento Nº "+nro(o.numero):"Novo orçamento"}${o.contato_id?" · contato do CRM":""}</span><h2>${esc(nomeCli(o)||o.titulo||"Novo orçamento")}</h2></div>
          <span class="status ${st[1]}">${st[0]}</span>
        </div>
        <div class="orc-ed-grid">
          <div class="orc-ed-main">
            <fieldset class="orc-fs"><legend>Cliente</legend>
              <div class="grid2">
                <div><label class="label" for="oe-cli">Cliente do hub</label><select id="oe-cli"><option value="">Outro / novo contato</option>${cli.map(c=>`<option value="${c.id}" ${o.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
                <div><label class="label" for="oe-nome">Nome no orçamento</label><input type="text" id="oe-nome" value="${esc(o.cliente_nome||"")}" placeholder="${o.cliente_id?"Usa o nome do cliente":"Ex.: Dra. Ana Souza"}"></div>
                <div><label class="label" for="oe-cont">Contato (WhatsApp ou e-mail)</label><input type="text" id="oe-cont" value="${esc(o.cliente_contato||"")}"></div>
                <div><label class="label" for="oe-tit">Título do orçamento</label><input type="text" id="oe-tit" maxlength="140" value="${esc(o.titulo||"")}" placeholder="Ex.: Material gráfico do congresso"></div>
              </div></fieldset>
            <fieldset class="orc-fs"><legend>Produtos</legend>
              <div id="orc-itens" class="oi-lista">${o.itens.map(itemHTML).join("")}</div>
              <div class="orc-add">
                <button type="button" class="btn small" data-o="item-add">${I.mais} Adicionar produto</button>
                ${produtos.length?`<select id="oe-docat" aria-label="Adicionar um produto salvo"><option value="">+ Produto salvo…</option>${produtos.map(p=>`<option value="${p.id}">${esc(p.nome)} · ${brl(p.preco)}</option>`).join("")}</select>`:""}
              </div>
              <label class="check"><input type="checkbox" id="oe-salvacat" ${salvarCatalogo?"checked":""}> Salvar produtos novos e valores alterados nos produtos salvos</label>
            </fieldset>
            <fieldset class="orc-fs"><legend>Condições</legend>
              <div class="grid2">
                <div><label class="label" for="oe-val">Válido até</label><input type="date" id="oe-val" value="${esc(o.validade||"")}">${expiraEm(o)?`<small class="note">Sem pagamento, é excluído sozinho em ${dmy(expiraEm(o))}.</small>`:""}</div>
                <div><label class="label" for="oe-prazo">Prazo de entrega</label><input type="text" id="oe-prazo" value="${esc(o.prazo_entrega||"")}" placeholder="Ex.: 5 dias úteis após a aprovação da arte"></div>
              </div>
              <label class="check"><input type="checkbox" id="oe-entrega" ${o.tem_entrega!==false?"checked":""}> Tem material para retirar ou entregar (o cliente escolhe na proposta)</label>
              ${o.entrega_tipo?`<p class="note orc-entrega">${o.entrega_tipo==="retirada"?"📦 O cliente vai <b>retirar</b> no seu endereço.":`🚚 <b>Entrega</b> (${brl(o.entrega_valor)}): ${esc(endTxt(o.entrega_endereco))}`}</p>`:""}
              <div><label class="label" for="oe-cond">Condições de pagamento</label><textarea id="oe-cond" style="min-height:64px">${esc(o.condicoes||"")}</textarea></div>
              <div><label class="label" for="oe-obs">Observações</label><textarea id="oe-obs" style="min-height:64px">${esc(o.observacoes||"")}</textarea></div>
            </fieldset>
          </div>
          <aside class="orc-ed-side">${resumoHTML()}
            <div class="orc-acoes">
              <button type="button" class="btn primary" data-o="salvar">Salvar</button>
              <button type="button" class="btn" data-o="pdf">${I.pdf} Salvar e abrir o PDF</button>
              ${o.id?`<div class="orc-st-bts" role="group" aria-label="Mudar situação">
                ${o.status!=="enviado"?`<button type="button" class="btn small ghost" data-o="st" data-st="enviado">Marcar como enviado</button>`:""}
                ${o.status!=="aprovado"?`<button type="button" class="btn small ghost" data-o="st" data-st="aprovado">Cliente aprovou</button>`:""}
                ${o.status!=="recusado"?`<button type="button" class="btn small ghost" data-o="st" data-st="recusado">Cliente recusou</button>`:""}
                ${o.status!=="rascunho"?`<button type="button" class="btn small ghost" data-o="st" data-st="rascunho">Voltar para rascunho</button>`:""}
              </div>`:""}
              ${o.id?propostaHTML(o):""}
              ${o.id&&o.status==="aprovado"?(o.lancado_em?`<p class="note orc-lanc">${I.caixa} Lançado no financeiro em ${dmy(String(o.lancado_em).slice(0,10))}.</p>`:`<button type="button" class="btn primary" data-o="lancar">${I.caixa} Lançar no financeiro</button>`):""}
              ${o.id?`<div class="orc-st-bts"><button type="button" class="btn small ghost" data-o="duplicar">${I.copia} Duplicar</button><button type="button" class="btn small danger" data-o="apagar">Apagar</button></div>`:""}
            </div>
          </aside>
        </div>
      </section>
      <dialog class="tk-dlg" id="orc-dlg"></dialog>`;
    }

    /* ---------- proposta online: link para o cliente aceitar e assinar ---------- */
    const linkProposta=o=>o.token?new URL("proposta.html?t="+o.token,location.href).href:"";
    const quando=iso=>{if(!iso)return"";const d=new Date(iso);return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" às "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
    const endTxt=a=>{a=a||{};const c=String(a.cep||"");return [[a.rua,a.numero].filter(Boolean).join(", "),a.complemento,a.bairro,[a.cidade,a.uf].filter(Boolean).join("/"),c?"CEP "+c.slice(0,5)+"-"+c.slice(5):"",a.referencia?"ref.: "+a.referencia:""].filter(Boolean).join(" · ")};
    function propostaHTML(o){
      const a=o.assinatura||{}, link=linkProposta(o);
      if(!o.token)return `<div class="orc-prop"><b>Proposta online</b><p class="note">Rode o arquivo 13 do banco no Supabase para liberar o link de assinatura.</p></div>`;
      if(o.status==="rascunho")return `<div class="orc-prop"><b>Proposta online</b><p class="note">O cliente abre o link, aceita, preenche o cadastro, escolhe retirada ou entrega, assina e paga o valor integral pelo Mercado Pago (Pix, cartão ou boleto). A cobrança vai sozinha para o financeiro e a baixa é automática.</p>
        <button type="button" class="btn small" data-o="prop-gerar">Gerar link da proposta</button></div>`;
      const fone=window.GlaraCRM&&window.GlaraCRM.foneWa?window.GlaraCRM.foneWa(o.cliente_contato):"";
      const msg=encodeURIComponent(`Olá${o.cliente_nome?", "+o.cliente_nome.split(" ")[0]:""}! Segue a proposta Nº ${nro(o.numero)}${o.titulo?" ("+o.titulo+")":""}. Você pode ver, aceitar e assinar por aqui: ${link}`);
      const sit=o.status==="aprovado"&&o.assinado_em?`<p class="orc-prop-ok">✓ Assinada por <b>${esc(a.nome||"")}</b>${a.documento?" ("+esc(a.documento.length===14?"CNPJ":"CPF")+" final "+esc(a.documento.slice(-4))+")":""} em ${quando(o.assinado_em)}${a.ip?" · IP "+esc(a.ip):""}</p>`
        :o.status==="recusado"&&a.recusada?`<p class="orc-prop-no">Recusada pelo cliente em ${quando(a.em)}${a.motivo?`:<q>${esc(a.motivo)}</q>`:"."}</p>`
        :`<p class="note">${o.visto_em?"👀 O cliente abriu em "+quando(o.visto_em)+".":"O cliente ainda não abriu o link."}</p>`;
      return `<div class="orc-prop"><b>Proposta online</b>${sit}
        <div class="orc-prop-link"><input type="text" readonly value="${esc(link)}" aria-label="Link da proposta" id="oe-link"><button type="button" class="btn small" data-o="prop-copiar">Copiar</button></div>
        <div class="orc-st-bts"><a class="btn small ghost" href="${fone?"https://wa.me/"+fone+"?text="+msg:"https://wa.me/?text="+msg}" target="_blank" rel="noopener">Enviar no WhatsApp</a><a class="btn small ghost" href="${esc(link)}" target="_blank" rel="noopener">Ver como o cliente</a></div></div>`;
    }
    function render(){
      const listas=`<datalist id="orc-prods">${produtos.map(p=>`<option value="${esc(p.nome)}">${esc(p.descricao||"")} · ${brl(p.preco)}</option>`).join("")}</datalist><datalist id="orc-unid">${UNID.map(u=>`<option value="${u}">`).join("")}</datalist>`;
      if(sub==="editor"&&atual){el.innerHTML=editorHTML()+listas;return}
      el.innerHTML=topoHTML()+(sub==="produtos"?produtosHTML():sub==="empresa"?empresaHTML():sub==="loja"?lojaHTML():sub==="cupons"?cuponsHTML():listaHTML()+`<dialog class="tk-dlg" id="orc-dlg"></dialog>`)+listas;
    }

    /* lê e recalcula um item a partir do que foi digitado */
    function lerItem(div,campo){
      const k=+div.dataset.k, it=atual.itens[k], g=f=>div.querySelector(`[data-f="${f}"]`);
      it.nome=g("nome").value;it.descricao=g("descricao").value;it.unidade=g("unidade").value||"un";
      it.qtd=parseNum(g("qtd").value);it.custo=r2(parseNum(g("custo").value));it.lucro_tipo=g("lucro_tipo").value;
      if(campo==="preco"){ // digitou o preço: o lucro se ajusta
        it.preco=r2(parseNum(g("preco").value));
        if(it.lucro_tipo==="pct"&&it.custo>0)it.lucro=r2((it.preco/it.custo-1)*100);
        else{it.lucro_tipo="valor";it.lucro=r2(it.preco-it.custo);g("lucro_tipo").value="valor"}
        g("lucro").value=String(it.lucro).replace(".",",");
      }else{
        if(campo==="lucro_tipo"){ // troca % ⇄ R$ mantendo o mesmo preço
          it.lucro=it.lucro_tipo==="pct"?(it.custo>0?r2((it.preco/it.custo-1)*100):0):r2(it.preco-it.custo);g("lucro").value=String(it.lucro).replace(".",",");
        }else it.lucro=parseNum(g("lucro").value);
        it.preco=precoDe(it.custo,it.lucro_tipo,it.lucro);
        if(campo!=="preco"&&document.activeElement!==g("preco"))g("preco").value=num(it.preco);
      }
      div.querySelector("[data-tot]").textContent=brl(r2(it.qtd*it.preco));
      div.querySelector("[data-luc]").textContent="+ "+brl(r2(it.qtd*(it.preco-it.custo)))+" de lucro";
      sujo=true;atualizarResumo();
    }
    function atualizarResumo(){const r=el.querySelector("#orc-resumo");if(!r)return;const foco=document.activeElement&&document.activeElement.id==="oe-desc";
      if(foco){ // não redesenha o campo que está sendo digitado
        const tmp=document.createElement("div");tmp.innerHTML=resumoHTML();tmp.querySelector(".orc-desc dd").replaceWith(r.querySelector(".orc-desc dd"));r.replaceWith(tmp.firstElementChild);
      }else r.outerHTML=resumoHTML()}
    function aplicarProduto(k,p){const it=atual.itens[k];Object.assign(it,{produto_id:p.id,nome:p.nome,descricao:p.descricao,unidade:p.unidade,custo:N(p.custo),lucro_tipo:p.lucro_tipo,lucro:N(p.lucro),preco:N(p.preco)});
      const div=el.querySelector(`.oi[data-k="${k}"]`);if(div)div.outerHTML=itemHTML(it,k);atualizarResumo();sujo=true}
    function lerCabecalho(){
      const v=s=>{const x=el.querySelector(s);return x?x.value:""};
      Object.assign(atual,{cliente_id:v("#oe-cli")||null,cliente_nome:v("#oe-nome").trim(),cliente_contato:v("#oe-cont").trim(),titulo:v("#oe-tit").trim(),
        validade:v("#oe-val")||null,prazo_entrega:v("#oe-prazo").trim(),condicoes:v("#oe-cond").trim(),observacoes:v("#oe-obs").trim(),desconto:r2(parseNum(v("#oe-desc"))),tem_entrega:!!(el.querySelector("#oe-entrega")||{checked:true}).checked});
      if(atual.cliente_id&&!atual.cliente_nome){const c=clientes().find(x=>x.id===atual.cliente_id);if(c)atual.cliente_nome=c.nome}
    }
    async function guardarCatalogo(itens){
      let novos=0,atualizados=0;
      for(const it of itens){
        const nome=String(it.nome||"").trim();if(!nome)continue;
        const p=produtos.find(x=>x.id===it.produto_id)||produtos.find(x=>x.nome.toLowerCase()===nome.toLowerCase());
        const campos={nome,descricao:it.descricao||"",unidade:it.unidade||"un",custo:N(it.custo),lucro_tipo:it.lucro_tipo==="valor"?"valor":"pct",lucro:r2(it.lucro),usado_em:new Date().toISOString()};
        if(p){
          const mudou=N(p.custo)!==campos.custo||p.lucro_tipo!==campos.lucro_tipo||N(p.lucro)!==campos.lucro||(p.descricao||"")!==campos.descricao||(p.unidade||"")!==campos.unidade||p.nome!==nome;
          const {data,error}=await sb.from("produtos").update(mudou?campos:{usado_em:campos.usado_em}).eq("id",p.id).select().single();
          if(!error&&data){Object.assign(p,data);it.produto_id=p.id;if(mudou)atualizados++}
        }else{
          const {data,error}=await sb.from("produtos").insert(campos).select().single();
          if(!error&&data){produtos.push(data);it.produto_id=data.id;novos++}
        }
      }
      produtos.sort((a,b)=>a.nome.localeCompare(b.nome));
      return {novos,atualizados};
    }
    async function salvar(){
      lerCabecalho();
      const itens=atual.itens.filter(i=>String(i.nome||"").trim()||N(i.preco));
      if(!itens.length){toast("Adicione pelo menos um produto com nome e preço.");return null}
      if(!atual.cliente_id&&!atual.cliente_nome){toast("Escolha o cliente ou escreva o nome dele.");el.querySelector("#oe-nome").focus();return null}
      let cat={novos:0,atualizados:0};
      if(salvarCatalogo)cat=await guardarCatalogo(itens);
      atual.itens=itens.map(i=>({produto_id:i.produto_id||null,nome:String(i.nome||"").trim(),descricao:i.descricao||"",unidade:i.unidade||"un",qtd:N(i.qtd),custo:r2(i.custo),lucro_tipo:i.lucro_tipo==="valor"?"valor":"pct",lucro:r2(i.lucro),preco:r2(i.preco)}));
      const campos={contato_id:atual.contato_id||null,cliente_id:atual.cliente_id,cliente_nome:atual.cliente_nome,cliente_contato:atual.cliente_contato,titulo:atual.titulo,itens:atual.itens.map(({_modo,...x})=>x),desconto:atual.desconto,
        validade:atual.validade,prazo_entrega:atual.prazo_entrega,condicoes:atual.condicoes,observacoes:atual.observacoes,status:atual.status,tem_entrega:atual.tem_entrega!==false};
      const q=atual.id?sb.from("orcamentos").update(campos).eq("id",atual.id):sb.from("orcamentos").insert(campos);
      const {data,error}=await q.select().single();
      if(error){falha("salvar o orçamento",error);return null}
      const i=orcs.findIndex(x=>x.id===data.id);if(i>=0)orcs[i]=data;else orcs.unshift(data);
      atual=JSON.parse(JSON.stringify(data));sujo=false;render();
      toast("Orçamento Nº "+nro(data.numero)+" salvo."+(cat.novos?` ${cat.novos} produto(s) novo(s) salvo(s).`:"")+(cat.atualizados?` ${cat.atualizados} valor(es) atualizado(s).`:""));
      ctx.mudou&&ctx.mudou();
      return data;
    }
    async function mudarStatus(st){
      if(sujo){const d=await salvar();if(!d)return}
      const {data,error}=await sb.from("orcamentos").update({status:st}).eq("id",atual.id).select().single();
      if(error)return falha("mudar a situação",error);
      const i=orcs.findIndex(x=>x.id===data.id);if(i>=0)orcs[i]=data;atual=JSON.parse(JSON.stringify(data));render();
      toast({enviado:"Marcado como enviado.",aprovado:"Aprovado! Agora você pode lançar no financeiro.",recusado:"Marcado como recusado.",rascunho:"Voltou para rascunho."}[st]);ctx.mudou&&ctx.mudou();
    }

    /* ---------- lançar no financeiro ---------- */
    function lancarForm(){
      const o=atual, t=totais(o.itens,o.desconto), h=hojeISO();
      return `<form method="dialog" class="tk-form" id="lanc-form">
        <div class="head"><h2>Lançar no financeiro</h2><button type="button" class="tk-x" data-o="dlg-fechar" aria-label="Fechar">✕</button></div>
        <p class="note" style="margin:0">Orçamento Nº ${nro(o.numero)} · ${esc(nomeCli(o))} · total <b>${brl(t.total)}</b>, custo ${brl(t.custo)}, lucro <b class="ok-txt">${brl(t.lucro)}</b>.</p>
        <p class="note" style="margin:0">Pagamento integral${N(o.entrega_valor)?`, com a entrega (${brl(o.entrega_valor)})`:""}. Se ainda não pagou, ele recebe o link e paga pelo Mercado Pago (Pix, cartão ou boleto), com baixa automática.</p>
        <div class="grid2">
          <div><label class="label" for="lf-data">Vencimento</label><input type="date" id="lf-data" value="${h}"></div>
          <div><label class="label" for="lf-forma">Forma (se já pagou)</label><input type="text" id="lf-forma" list="fin-formas" value=""></div>
        </div>
        <label class="check"><input type="checkbox" id="lf-pago"> O cliente já pagou</label>
        <fieldset class="orc-fs"><legend>Pagamento à gráfica / fornecedor (saída)</legend>
          <label class="check"><input type="checkbox" id="lf-saida" ${t.custo>0?"checked":""}> Lançar também a saída do custo (${brl(t.custo)})</label>
          <div class="grid2"><div><label class="label" for="lf-sdata">Data</label><input type="date" id="lf-sdata" value="${h}"></div>
            <div><label class="label" for="lf-sforn">Para quem</label><input type="text" id="lf-sforn" value="${esc([...new Set(o.itens.map(i=>{const p=produtos.find(x=>x.id===i.produto_id);return p&&p.fornecedor}).filter(Boolean))].join(", ")||"Gráfica")}"></div></div>
          <label class="check"><input type="checkbox" id="lf-spago"> Já paguei a gráfica</label>
        </fieldset>
        <p class="orc-calc" id="lf-prev"></p>
        <datalist id="fin-formas">${["Pix","Boleto","Cartão de crédito","Transferência","Dinheiro"].map(x=>`<option value="${x}">`).join("")}</datalist>
        <div class="actions"><button type="submit" class="btn primary" data-o="lancar-ok">Lançar</button><button type="button" class="btn ghost" data-o="dlg-fechar">Cancelar</button></div></form>`;
    }
    function parcelas(){
      const d=el.querySelector("#lanc-form"), t=totais(atual.itens,atual.desconto);
      return [{k:0,valor:r2(t.total+N(atual.entrega_valor)),custo:t.custo,data:d.querySelector("#lf-data").value||hojeISO()}];
    }
    function prevLanc(){const ps=parcelas();el.querySelector("#lf-prev").innerHTML=ps.map(p=>`Cobrança: <b>${brl(p.valor)}</b> com vencimento em ${dmy(p.data)} <span class="note">(impressão ${brl(p.custo)}${N(atual.entrega_valor)?` · entrega ${brl(empresa.entrega_custo!=null?N(empresa.entrega_custo):N(atual.entrega_valor))}`:""} · lucro ${brl(p.valor-p.custo-(N(atual.entrega_valor)?(empresa.entrega_custo!=null?N(empresa.entrega_custo):N(atual.entrega_valor)):0))})</span>`).join("<br>")}
    async function lancar(){
      const d=el.querySelector("#lanc-form"), o=atual, t=totais(o.itens,o.desconto), ps=parcelas(), n=ps.length;
      const forma=d.querySelector("#lf-forma").value.trim(), pago1=d.querySelector("#lf-pago").checked;
      const base={tipo:"entrada",categoria:"Materiais gráficos",forma,cliente_id:o.cliente_id,cliente_nome:nomeCli(o),orcamento_id:o.id};
      const rows=ps.map(p=>({...base,custo_entrega:N(o.entrega_valor)?Math.min(empresa.entrega_custo!=null?N(empresa.entrega_custo):N(o.entrega_valor),r2(p.valor-p.custo)):0,descricao:`Orçamento Nº ${nro(o.numero)}${o.titulo?" · "+o.titulo:""}${N(o.entrega_valor)?" + entrega":""}`,valor:p.valor,custo:p.custo,data:p.data,status:p.k===0&&pago1?"pago":"previsto"}));
      if(d.querySelector("#lf-saida").checked&&t.custo>0)rows.push({tipo:"saida",categoria:"Gráfica / fornecedor",descricao:`${d.querySelector("#lf-sforn").value.trim()||"Gráfica"} · orçamento Nº ${nro(o.numero)}`,
        valor:t.custo,custo:0,data:d.querySelector("#lf-sdata").value||hojeISO(),status:d.querySelector("#lf-spago").checked?"pago":"previsto",forma:"",cliente_id:o.cliente_id,cliente_nome:nomeCli(o),orcamento_id:o.id});
      const {error}=await sb.from("lancamentos").insert(rows);
      if(error)return falha("lançar no financeiro",error);
      const r=await sb.from("orcamentos").update({lancado_em:new Date().toISOString()}).eq("id",o.id).select().single();
      if(!r.error){const i=orcs.findIndex(x=>x.id===o.id);if(i>=0)orcs[i]=r.data;atual=JSON.parse(JSON.stringify(r.data))}
      fecharDlg();render();toast(`Lançado: ${n} entrada${n>1?"s":""}${rows.length>n?" e 1 saída":""}. Veja em Financeiro.`);ctx.mudou&&ctx.mudou();
    }

    const dlg=()=>el.querySelector("#orc-dlg");
    function abrirDlg(html){const d=dlg();d.innerHTML=html;if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","")}
    function fecharDlg(){const d=dlg();if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open")}
    let prodEd=null;

    el.addEventListener("click",async e=>{
      const sb_=e.target.closest("[data-o-sub]");if(sb_){sub=sb_.dataset.oSub;render();return}
      const f=e.target.closest("[data-o-f]");if(f){filtro=f.dataset.oF;render();return}
      if(e.target.closest("#pf-ptipo [data-ptipo]")){const bt=e.target.closest("[data-ptipo]");el.querySelectorAll("#pf-ptipo button").forEach(x=>x.setAttribute("aria-pressed",String(x===bt)));
        if(bt.dataset.ptipo==="m2"){const u=el.querySelector("#pf-un");if(u&&!/m/i.test(u.value))u.value="m²"}pfTipoAplica();calcProdForm();return}
      const tp_=e.target.closest("#pf-tipoprod [data-tp]");if(tp_){el.querySelectorAll("#pf-tipoprod button").forEach(x=>x.setAttribute("aria-pressed",String(x===tp_)));
        if(tp_.dataset.tp==="servico"){const c=el.querySelector("#pf-cat");if(c&&!c.value)c.value="Serviços"}pfTipoAplica();return}
      const pf_=e.target.closest("[data-p-f]");if(pf_){filtroP=pf_.dataset.pF;render();return}
      const lf=e.target.closest("[data-l-f]");if(lf){filtroL=lf.dataset.lF;render();return}
      const row=e.target.closest("[data-o-id]");if(row){const o=orcs.find(x=>x.id===row.dataset.oId);if(o)abrir(o);return}
      const pr=e.target.closest("[data-p-id]");if(pr){prodEd=produtos.find(x=>x.id===pr.dataset.pId);abrirDlg(prodForm(prodEd));pfTipoAplica();calcProdForm();return}
      const b=e.target.closest("[data-o]");if(!b)return;
      const a=b.dataset.o;
      if(a==="novo")return novo();
      if(a==="voltar"){if(sujo&&b.dataset.confirm!=="1"){b.dataset.confirm="1";b.innerHTML="Sair sem salvar?";toast("Há mudanças não salvas. Clique de novo para sair sem salvar.");return}
        atual=null;sub=LOJA?"loja":"lista";render();return}
      if(a==="item-add"){lerCabecalho();atual.itens.push(itemVazio());const box=el.querySelector("#orc-itens");box.insertAdjacentHTML("beforeend",itemHTML(atual.itens[atual.itens.length-1],atual.itens.length-1));box.lastElementChild.querySelector("input").focus();sujo=true;return}
      if(a==="item-modo"){const div=b.closest(".oi"), k=+div.dataset.k;lerCabecalho();const it=atual.itens[k];it._modo=true;
        it.unidade=b.dataset.v==="m2"?"m²":(/m²|m2/i.test(it.unidade||"")?"un":(it.unidade||"un"));
        modoItem(div,b.dataset.v==="m2");if(b.dataset.v==="m2"){const l=div.querySelector('[data-m2="l"]');l&&l.focus()}
        atualizarResumo();sujo=true;return}
      if(a==="item-rm"){const div=b.closest(".oi"), k=+div.dataset.k;lerCabecalho();atual.itens.splice(k,1);if(!atual.itens.length)atual.itens.push(itemVazio());el.querySelector("#orc-itens").innerHTML=atual.itens.map(itemHTML).join("");atualizarResumo();sujo=true;return}
      if(a==="salvar")return salvar();
      if(a==="pdf"){const w=window.open("","_blank");const d=await salvar();if(!d){w&&w.close();return}
        const url=new URL("orcamento.html?id="+d.id,location.href).href;if(w)w.location=url;else location.href=url;return}
      if(a==="st")return mudarStatus(b.dataset.st);
      if(a==="prop-gerar")return mudarStatus("enviado");
      if(a==="prop-copiar"){const v=linkProposta(atual);try{await navigator.clipboard.writeText(v)}catch(_){const i=el.querySelector("#oe-link");i&&i.select();try{document.execCommand("copy")}catch(__){}}toast("Link copiado. Mande para o cliente.");return}
      if(a==="lancar"){if(sujo){const d=await salvar();if(!d)return}abrirDlg(lancarForm());prevLanc();return}
      if(a==="lancar-ok"){e.preventDefault();return lancar()}
      if(a==="duplicar"){const c=JSON.parse(JSON.stringify(atual));["id","numero","criado_em","atualizado_em","enviado_em","aprovado_em","lancado_em","token","visto_em","assinado_em","assinatura"].forEach(k=>delete c[k]);
        c.status="rascunho";c.validade=somaDias(hojeISO(),N(empresa.validade_dias)||15);atual=c;sujo=true;render();toast("Cópia criada. Ajuste e salve.");return}
      if(a==="apagar"){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("orcamentos").delete().eq("id",atual.id);if(error)return falha("apagar",error);
        orcs=orcs.filter(x=>x.id!==atual.id);atual=null;sub="lista";render();toast("Orçamento apagado.");ctx.mudou&&ctx.mudou();return}
      if(a==="dlg-fechar"){fecharDlg();return}
      if(a==="cup-novo"){cupEd={};abrirDlg(cupomForm(cupEd));setTimeout(()=>{const i=el.querySelector("#cp-cod");i&&i.focus()},30);return}
      if(a==="cup-editar"){cupEd=cupons.find(x=>x.id===b.dataset.id)||{};abrirDlg(cupomForm(cupEd));return}
      if(a==="cup-copiar"){const c=cupons.find(x=>x.id===b.dataset.id);try{await navigator.clipboard.writeText(cupomMsg(c).replace(/\*/g,""))}catch(_){}toast("Mensagem copiada. Cole no WhatsApp, e-mail ou Instagram.");return}
      if(a==="cup-massa"){const c=cupons.find(x=>x.id===b.dataset.id);if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent=`Confirmar: mandar para ${nOfertas} contato${nOfertas===1?"":"s"}`;return}
        b.disabled=true;const texto=`Olá, {nome}! Separamos um cupom para você: {cupom} – ${cupomTxt(c)}${N(c.minimo)?` em compras a partir de ${brl(c.minimo)}`:""}${c.valido_ate?`, válido até ${dmy(c.valido_ate)}`:""}. É só digitar o código na hora do pagamento.`;
        const {data,error}=await sb.rpc("cupom_enviar_ofertas",{p_cupom:c.id,p_assunto:`Cupom ${c.codigo}: ${cupomTxt(c)}`,p_texto:texto});
        if(error){b.disabled=false;return falha("enviar os e-mails",error)}toast(`${data.enviados} e-mail${data.enviados===1?"":"s"} na fila. Saem pelo Resend nos próximos minutos (se o envio de e-mails estiver ligado em Avisos e lembretes).`);render();return}
      if(a==="cup-apagar"){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("cupons").delete().eq("id",b.dataset.id);if(error)return falha("apagar o cupom",error);cupons=cupons.filter(x=>x.id!==b.dataset.id);fecharDlg();render();toast("Cupom apagado.");return}
      if(a==="fx-add"){const l=el.querySelector("#pf-faixas");l.insertAdjacentHTML("beforeend",fxRow({qtd:"",custo:""}));l.lastElementChild.querySelector("input").focus();return}
      if(a==="fx-rm"){const r=b.closest(".fx-row");if(el.querySelectorAll("#pf-faixas .fx-row").length>1)r.remove();else r.querySelectorAll("input").forEach(i=>i.value="");calcProdForm();return}
      if(a==="foto-tira"){el.querySelector("#pf-foto").value="";const im=el.querySelector("#pf-foto-img");im.outerHTML=`<span class="pf-foto-vazia" id="pf-foto-img">Sem foto</span>`;b.remove();return}
      if(a==="loja-copiar"){const v=linkLoja();try{await navigator.clipboard.writeText(v)}catch(_){const i=el.querySelector("#lj-link");i&&i.select();try{document.execCommand("copy")}catch(__){}}toast("Link da loja copiado.");return}
      if(a==="arte-baixar"){const {data,error}=await sb.storage.from("loja-artes").createSignedUrl(b.dataset.c,600,{download:b.dataset.n||true});
        if(error||!data)return falha("abrir a arte",error||{});const l=document.createElement("a");l.href=data.signedUrl;l.target="_blank";l.rel="noopener";document.body.appendChild(l);l.click();l.remove();return}
      if(a==="ped-orc"){const o=orcs.find(x=>x.id===b.dataset.id);if(o)abrir(o);return}
      if(a==="prod-novo"){prodEd=LOJA?{na_loja:true}:{};if(sub!=="produtos"){sub="produtos";render()}abrirDlg(prodForm(prodEd));pfTipoAplica();calcProdForm();return}
      if(a==="prod-salvar"){e.preventDefault();
        const v=s=>el.querySelector(s).value, nome=v("#pf-nome").trim();if(!nome){toast("Dê um nome ao produto.");return}
        const dup=produtos.find(p=>p.nome.toLowerCase()===nome.toLowerCase()&&p.id!==prodEd.id);if(dup){toast("Já existe um produto com esse nome.");return}
        const campos={nome,descricao:v("#pf-desc").trim(),unidade:v("#pf-un").trim()||"un",fornecedor:v("#pf-forn").trim(),custo:r2(parseNum(v("#pf-custo"))),lucro_tipo:v("#pf-tipo"),lucro:r2(parseNum(v("#pf-lucro"))),
          na_loja:el.querySelector("#pf-loja").checked,tipo:pfTp(),preco_tipo:pfTipo(),area_min:Math.max(0,parseNum(v("#pf-amin"))),categoria:v("#pf-cat").trim()||"Gráfica",prazo:v("#pf-prazo").trim(),arte_valor:Math.max(0,r2(parseNum(v("#pf-arte")))),foto:v("#pf-foto"),faixas:lerFaixas()};
        if(campos.preco_tipo==="m2"&&!/m/i.test(campos.unidade))campos.unidade="m²";
        if(campos.na_loja&&campos.preco_tipo==="faixas"&&!campos.faixas.length){toast("Para mostrar na loja, cadastre pelo menos uma faixa de quantidade com custo.");return}
        if(campos.na_loja&&campos.preco_tipo==="m2"&&!(campos.custo>0)){toast("Informe o custo do m² para mostrar na loja.");return}
        const q=prodEd.id?sb.from("produtos").update(campos).eq("id",prodEd.id):sb.from("produtos").insert(campos);
        const {data,error}=await q.select().single();if(error)return falha("salvar o produto",error);
        const i=produtos.findIndex(x=>x.id===data.id);if(i>=0)produtos[i]=data;else produtos.push(data);produtos.sort((x,y)=>x.nome.localeCompare(y.nome));
        fecharDlg();render();toast("Produto salvo.");return}
      if(a==="prod-apagar"){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("produtos").delete().eq("id",b.dataset.id);if(error)return falha("apagar o produto",error);
        produtos=produtos.filter(x=>x.id!==b.dataset.id);fecharDlg();render();toast("Produto apagado.");return}
    });
    el.addEventListener("input",e=>{
      const t=e.target;
      if(t.id==="orc-busca"){busca=t.value;const l=el.querySelector(".orc-lista");const tmp=document.createElement("div");tmp.innerHTML=listaHTML();l.replaceWith(tmp.querySelector(".orc-lista"));return}
      if(t.id==="prod-busca"){buscaP=t.value;const l=el.querySelector(".orc-lista");const tmp=document.createElement("div");tmp.innerHTML=produtosHTML();l.replaceWith(tmp.querySelector(".orc-lista"));return}
      if(t.closest("#prod-form")){calcProdForm();return}
      if(t.closest("#lanc-form")){prevLanc();return}
      if(t.dataset.m2){const d=t.closest(".oi"),k=+d.dataset.k,it=atual.itens[k],g=x=>parseNum(d.querySelector(`[data-m2="${x}"]`).value);
        it.largura=g("l");it.altura=g("a");it.pecas=Math.max(0,Math.round(g("q")));
        if(it.largura&&it.altura&&it.pecas){const q=Math.round(it.largura*it.altura/10000*it.pecas*10000)/10000;d.querySelector('[data-f="qtd"]').value=String(q).replace(".",",");
          {const de=d.querySelector('[data-f="descricao"]'), resto=de.value.replace(/^[\d.,]+×[\d.,]+ cm · \d+ peças?( · )?/,"");de.value=`${String(it.largura).replace(".",",")}×${String(it.altura).replace(".",",")} cm · ${it.pecas} peça${it.pecas>1?"s":""}`+(resto?" · "+resto:"")}
          lerItem(d,"qtd")}
        {const r=d.querySelector('[data-m2-res]');if(r)r.textContent=it.largura&&it.altura&&it.pecas?`= ${String(Math.round(it.largura*it.altura/10000*it.pecas*10000)/10000).replace(".",",")} m²`:"a área total vai para a Qtd (m²)"}sujo=true;return}
      if(t.dataset.f==="unidade"){const d=t.closest(".oi");const h=d&&d.querySelector(".oi-m2");if(h)h.hidden=!/m²|m2/i.test(t.value)}
      const div=t.closest(".oi");if(div&&t.dataset.f){if(t.dataset.f==="nome"){const k=+div.dataset.k;atual.itens[k].nome=t.value;
          const p=produtos.find(x=>x.nome.toLowerCase()===t.value.trim().toLowerCase());if(p&&atual.itens[k].produto_id!==p.id&&!N(atual.itens[k].custo)){aplicarProduto(k,p);const i=el.querySelector(`#oi-n${k}`);if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}return}
          if(atual.itens[k].produto_id&&!(produtos.find(x=>x.id===atual.itens[k].produto_id)||{}).nome?.toLowerCase().startsWith(t.value.trim().toLowerCase()))atual.itens[k].produto_id=null;
          {const it=atual.itens[k];if(!it._modo&&(it.unidade||"un")==="un"&&/\b(lona|adesivo|banner|vinil|faixa|backdrop|envelopamento|wind ?banner)\b/i.test(t.value)){
            it.unidade="m²";modoItem(div,true);toast("Esse produto é cobrado por m²: preencha a largura, a altura e as peças.")}}
          sujo=true;return}
        lerItem(div,t.dataset.f);return}
      if(t.id==="oe-desc"){atual.desconto=r2(parseNum(t.value));sujo=true;atualizarResumo();return}
      if(t.closest(".orc-ed"))sujo=true;
    });
    el.addEventListener("change",async e=>{
      const t=e.target;
      if(t.id==="pf-foto-arq"&&t.files&&t.files[0]){const f=t.files[0];if(f.size>5*1024*1024){toast("A foto passa de 5 MB. Use uma menor.");return}
        const nome=f.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w.\-]+/g,"_").slice(-60), caminho=`produtos/${Date.now()}-${nome}`;
        toast("Enviando a foto…");const {error}=await sb.storage.from("loja").upload(caminho,f,{upsert:false,contentType:f.type});
        if(error)return falha("enviar a foto",error);const url=sb.storage.from("loja").getPublicUrl(caminho).data.publicUrl;
        el.querySelector("#pf-foto").value=url;const im=el.querySelector("#pf-foto-img");im.outerHTML=`<img src="${esc(url)}" alt="" id="pf-foto-img">`;toast("Foto pronta. Clique em Salvar.");return}
      if(t.id==="oe-docat"&&t.value){const p=produtos.find(x=>x.id===t.value);if(p){lerCabecalho();let k=atual.itens.findIndex(i=>!String(i.nome||"").trim()&&!N(i.preco));
        if(k<0){atual.itens.push(itemVazio());k=atual.itens.length-1;el.querySelector("#orc-itens").insertAdjacentHTML("beforeend",itemHTML(atual.itens[k],k))}aplicarProduto(k,p)}t.value="";return}
      if(t.id==="oe-salvacat"){salvarCatalogo=t.checked;return}
      if(t.id==="oe-cli"){const c=clientes().find(x=>x.id===t.value);const n=el.querySelector("#oe-nome");if(c&&(!n.value||clientes().some(x=>x.nome===n.value)))n.value=c.nome;sujo=true;return}
      const div=t.closest(".oi");if(div&&t.dataset.f==="lucro_tipo"){lerItem(div,"lucro_tipo");return}
      if(div&&t.dataset.f==="nome"){const k=+div.dataset.k;const p=produtos.find(x=>x.nome.toLowerCase()===t.value.trim().toLowerCase());if(p&&atual.itens[k].produto_id!==p.id)aplicarProduto(k,p);return}
      if(div&&t.dataset.f==="preco"){t.value=num(atual.itens[+div.dataset.k].preco);return}
      if(t.id==="pf-tipo"){calcProdForm();return}
      if(t.closest("#lanc-form")){prevLanc();return}
    });
    el.addEventListener("focusout",e=>{const t=e.target, div=t.closest&&t.closest(".oi");if(div&&["custo","preco"].includes(t.dataset.f))t.value=num(atual.itens[+div.dataset.k][t.dataset.f])});
    el.addEventListener("submit",async e=>{
      e.preventDefault();
      if(e.target.id==="emp-form"){const v=s=>el.querySelector(s).value.trim();
        const campos={id:1,nome:v("#em-nome")||"GUXTA",documento:v("#em-doc"),telefone:v("#em-tel"),email:v("#em-email"),site:v("#em-site"),endereco:v("#em-end"),pix:v("#em-pix"),
          validade_dias:Math.max(1,parseInt(v("#em-val"))||15),orcamento_expira_dias:Math.max(0,parseInt(v("#em-exp"))||0),lucro_padrao:r2(parseNum(v("#em-lucro"))),condicoes:v("#em-cond"),observacoes:v("#em-obs"),
          retirada_endereco:v("#em-ret"),retirada_info:v("#em-reti"),entrega_ativa:el.querySelector("#em-entr").checked,entrega_valor:Math.max(0,r2(parseNum(v("#em-entv")))),entrega_custo:v("#em-entc")?Math.max(0,r2(parseNum(v("#em-entc")))):null,entrega_info:v("#em-enti")};
        const {data,error}=await sb.from("empresa").upsert(campos).select().single();if(error)return falha("salvar os dados",error);
        empresa=data;toast("Dados do PDF salvos.");return}
      if(e.target.id==="cup-form"){const v=s=>el.querySelector(s).value.trim();
        const campos={codigo:v("#cp-cod").toUpperCase().replace(/\s/g,""),descricao:v("#cp-desc"),tipo:v("#cp-tipo"),valor:r2(parseNum(v("#cp-val"))),onde:v("#cp-onde"),
          valido_ate:v("#cp-ate")||null,usos_max:v("#cp-max")?Math.max(1,parseInt(v("#cp-max"))||1):null,minimo:Math.max(0,r2(parseNum(v("#cp-min")))),ativo:el.querySelector("#cp-ativo").checked};
        if(campos.codigo.length<3){toast("O código precisa ter pelo menos 3 letras ou números.");return}
        if(!(campos.valor>0)){toast("Informe o valor do desconto.");return}if(campos.tipo==="pct"&&campos.valor>100){toast("Percentual até 100%.");return}
        if(cupons.some(x=>x.codigo===campos.codigo&&x.id!==cupEd.id)){toast("Já existe um cupom com esse código.");return}
        const q=cupEd.id?sb.from("cupons").update(campos).eq("id",cupEd.id):sb.from("cupons").insert(campos);
        const {data,error}=await q.select().single();if(error)return falha("salvar o cupom",error);
        const i=cupons.findIndex(x=>x.id===data.id);if(i>=0)cupons[i]=data;else cupons.unshift(data);fecharDlg();render();toast(cupEd.id?"Cupom salvo.":"Cupom criado. Agora é só mandar.");return}
      if(e.target.id==="loja-form"){const v=s=>el.querySelector(s).value;
        const campos={loja_ativa:el.querySelector("#lj-ativa").checked,loja_titulo:v("#lj-tit").trim()||"Material gráfico",loja_texto:v("#lj-txt").trim(),
          identidade_valor:Math.max(0,r2(parseNum(v("#lj-idv")))),identidade_info:v("#lj-idi").trim(),
          loja_cta_ativo:el.querySelector("#lj-cta").checked,loja_cta_titulo:v("#lj-ctat").trim(),loja_cta_texto:v("#lj-ctax").trim()};
        const {data,error}=await sb.from("empresa").update(campos).eq("id",1).select().single();if(error)return falha("salvar a loja",error);
        empresa=data;toast("Loja salva.");render();return}
      if(e.target.id==="prod-form"){el.querySelector('[data-o="prod-salvar"]').click();return}
      if(e.target.id==="lanc-form"){lancar();return}
    });

    carregar();
    return {recarregar:carregar,novo:()=>{if(orcs)novo()}};
  }
  window.GlaraOrcamentos={criar,totais,precoDe};
})();
