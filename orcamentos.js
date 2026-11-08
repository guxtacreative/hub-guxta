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
    let orcs=[], produtos=[], empresa={}, sub="lista", filtro="abertos", busca="", buscaP="", atual=null, salvarCatalogo=true, sujo=false;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const nomeCli=o=>{const c=clientes().find(x=>x.id===o.cliente_id);return c?c.nome:(o.cliente_nome||"")};

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando orçamentos…</div>`;
      const [a,b,c]=await Promise.all([
        sb.from("orcamentos").select("*").order("criado_em",{ascending:false}),
        sb.from("produtos").select("*").order("nome"),
        sb.from("empresa").select("*").eq("id",1).maybeSingle()]);
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
    function topoHTML(){
      return `<section class="card tk-head">
        <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Orçamentos</h2></div>
          <button class="btn primary" data-o="novo">${I.mais} Novo orçamento</button></div>
        ${kpisHTML()}
        <div class="seg orc-seg" role="group" aria-label="Seção">
          <button type="button" data-o-sub="lista" aria-pressed="${sub==="lista"}">Orçamentos</button>
          <button type="button" data-o-sub="produtos" aria-pressed="${sub==="produtos"}">Produtos salvos <b>${produtos.length}</b></button>
          <button type="button" data-o-sub="empresa" aria-pressed="${sub==="empresa"}">Dados no PDF</button>
        </div></section>`;
    }
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
            <span class="orc-st"><span class="status ${st[1]}">${st[0]}</span>${o.status==="aprovado"&&!o.lancado_em?'<span class="orc-flag">Lançar no financeiro</span>':""}${o.assinado_em?'<span class="orc-tag-ass">Assinada online</span>':o.status==="enviado"&&o.visto_em?'<span class="orc-tag-vis">Cliente abriu</span>':""}</span>
            <span class="orc-v"><b>${brl(o.total)}</b><small>lucro ${brl(o.lucro_total)}${N(o.total)?" · "+pct(mg):""}</small></span>
          </button>`}).join("")||`<div class="empty">${orcs.length?"Nenhum orçamento neste filtro.":"Nenhum orçamento ainda. Clique em Novo orçamento: os produtos que você usar ficam salvos com custo e lucro para os próximos."}</div>`}</div>`;
    }

    /* ---------- produtos salvos ---------- */
    function produtosHTML(){
      const q=buscaP.trim().toLowerCase(), vis=produtos.filter(p=>!q||(p.nome+" "+p.descricao+" "+p.fornecedor+" "+p.categoria).toLowerCase().includes(q));
      return `<div class="tk-bar"><p class="note" style="margin:0">Custo e lucro ficam guardados aqui. Ao salvar um orçamento, produtos novos entram sozinhos e os valores alterados são atualizados.</p>
          <div class="tk-tools"><input type="search" id="prod-busca" placeholder="Buscar produto" value="${esc(buscaP)}" aria-label="Buscar produto"><button class="btn small primary" data-o="prod-novo">${I.mais} Novo produto</button></div></div>
        <div class="orc-lista">${vis.map(p=>{const lucroR=r2(N(p.preco)-N(p.custo));return `<button type="button" class="orc-row prod-row" data-p-id="${p.id}">
            <span class="orc-t"><b>${esc(p.nome)}</b><small>${esc([p.descricao,p.fornecedor&&("Fornecedor: "+p.fornecedor)].filter(Boolean).join(" · ")||"Sem especificação")}</small></span>
            <span class="prod-c"><small>Custo</small><b>${brl(p.custo)}</b></span>
            <span class="prod-c"><small>Lucro</small><b class="ok-txt">${p.lucro_tipo==="pct"?pct(p.lucro):brl(p.lucro)}</b></span>
            <span class="orc-v"><b>${brl(p.preco)}</b><small>por ${esc(p.unidade)} · +${brl(lucroR)}</small></span></button>`}).join("")||`<div class="empty">${produtos.length?"Nenhum produto encontrado.":"Nenhum produto salvo ainda."}</div>`}</div>
        <dialog class="tk-dlg" id="orc-dlg"></dialog>`;
    }
    function prodForm(p){
      const novo=!p.id;
      return `<form method="dialog" class="tk-form" id="prod-form">
        <div class="head"><h2>${novo?"Novo produto":"Editar produto"}</h2><button type="button" class="tk-x" data-o="dlg-fechar" aria-label="Fechar">✕</button></div>
        <div><label class="label" for="pf-nome">Produto</label><input type="text" id="pf-nome" required maxlength="160" value="${esc(p.nome||"")}" placeholder="Ex.: Cartão de visita 1000 un"></div>
        <div><label class="label" for="pf-desc">Especificação (aparece no PDF)</label><input type="text" id="pf-desc" maxlength="300" value="${esc(p.descricao||"")}" placeholder="Ex.: 9x5 cm, couché 300 g, 4x4 cores, laminação fosca"></div>
        <div class="grid2">
          <div><label class="label" for="pf-un">Unidade</label><input type="text" id="pf-un" list="orc-unid" value="${esc(p.unidade||"un")}"></div>
          <div><label class="label" for="pf-forn">Fornecedor / gráfica</label><input type="text" id="pf-forn" value="${esc(p.fornecedor||"")}"></div>
          <div><label class="label" for="pf-custo">Custo (R$)</label><input type="text" id="pf-custo" inputmode="decimal" value="${p.custo!=null?num(p.custo):""}" placeholder="0,00"></div>
          <div><label class="label" for="pf-lucro">Lucro</label><div class="orc-lucro"><input type="text" id="pf-lucro" inputmode="decimal" value="${p.lucro!=null?String(p.lucro).replace(".",","):String(N(empresa.lucro_padrao)||40).replace(".",",")}">
            <select id="pf-tipo" aria-label="Tipo de lucro"><option value="pct" ${(p.lucro_tipo||"pct")==="pct"?"selected":""}>%</option><option value="valor" ${p.lucro_tipo==="valor"?"selected":""}>R$</option></select></div></div>
        </div>
        <p class="orc-calc" id="pf-calc"></p>
        <div class="actions"><button type="submit" class="btn primary" data-o="prod-salvar">${novo?"Salvar produto":"Salvar"}</button><button type="button" class="btn ghost" data-o="dlg-fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn danger small" data-o="prod-apagar" data-id="${p.id}" style="margin-left:auto">Apagar</button>`}</div></form>`;
    }
    function calcProdForm(){const v=s=>el.querySelector(s).value;const c=parseNum(v("#pf-custo")),t=v("#pf-tipo"),l=parseNum(v("#pf-lucro")),p=precoDe(c,t,l);
      el.querySelector("#pf-calc").innerHTML=`Preço de venda: <b>${brl(p)}</b> por ${esc(v("#pf-un")||"un")} · lucro de <b class="ok-txt">${brl(p-c)}</b>${p?` (margem de ${pct((p-c)/p*100)} do preço)`:""}`}

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
          ${f("lucro","Lucro padrão para itens novos (%)",e.lucro_padrao??40,"40",'inputmode="decimal"')}
        </div>
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
    function itemHTML(i,k){
      const lucroItem=r2(N(i.qtd)*(N(i.preco)-N(i.custo))), tot=r2(N(i.qtd)*N(i.preco)), noCat=produtos.some(p=>p.id===i.produto_id||p.nome.toLowerCase()===String(i.nome||"").trim().toLowerCase());
      return `<div class="oi" data-k="${k}">
        <div class="oi-a">
          <div class="oi-nome"><label class="label" for="oi-n${k}">Produto ${k+1}${noCat?` <span class="oi-cat" title="Está nos produtos salvos">${I.salvo} salvo</span>`:""}</label><input type="text" id="oi-n${k}" data-f="nome" list="orc-prods" value="${esc(i.nome)}" placeholder="Digite ou escolha um produto salvo" autocomplete="off"></div>
          <div class="oi-desc"><label class="label" for="oi-d${k}">Especificação</label><input type="text" id="oi-d${k}" data-f="descricao" value="${esc(i.descricao)}" placeholder="Medida, papel, cores, acabamento"></div>
          <button type="button" class="oi-rm" data-o="item-rm" aria-label="Remover produto ${k+1}">${I.lixo}</button>
        </div>
        <div class="oi-b">
          <div><label class="label" for="oi-q${k}">Qtd</label><input type="text" id="oi-q${k}" data-f="qtd" inputmode="decimal" value="${String(N(i.qtd)).replace(".",",")}"></div>
          <div><label class="label" for="oi-u${k}">Unidade</label><input type="text" id="oi-u${k}" data-f="unidade" list="orc-unid" value="${esc(i.unidade||"un")}"></div>
          <div><label class="label" for="oi-c${k}">Custo un.</label><input type="text" id="oi-c${k}" data-f="custo" inputmode="decimal" value="${num(i.custo)}"></div>
          <div><label class="label" for="oi-l${k}">Lucro</label><div class="orc-lucro"><input type="text" id="oi-l${k}" data-f="lucro" inputmode="decimal" value="${String(r2(i.lucro)).replace(".",",")}"><select data-f="lucro_tipo" aria-label="Tipo de lucro do produto ${k+1}"><option value="pct" ${i.lucro_tipo!=="valor"?"selected":""}>%</option><option value="valor" ${i.lucro_tipo==="valor"?"selected":""}>R$</option></select></div></div>
          <div><label class="label" for="oi-p${k}">Preço un.</label><input type="text" id="oi-p${k}" data-f="preco" inputmode="decimal" value="${num(i.preco)}" class="oi-preco"></div>
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
                <div><label class="label" for="oe-val">Válido até</label><input type="date" id="oe-val" value="${esc(o.validade||"")}"></div>
                <div><label class="label" for="oe-prazo">Prazo de entrega</label><input type="text" id="oe-prazo" value="${esc(o.prazo_entrega||"")}" placeholder="Ex.: 5 dias úteis após a aprovação da arte"></div>
              </div>
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
    function propostaHTML(o){
      const a=o.assinatura||{}, link=linkProposta(o);
      if(!o.token)return `<div class="orc-prop"><b>Proposta online</b><p class="note">Rode o arquivo 13 do banco no Supabase para liberar o link de assinatura.</p></div>`;
      if(o.status==="rascunho")return `<div class="orc-prop"><b>Proposta online</b><p class="note">O cliente abre o link, aceita, preenche os dados e assina. Ao assinar, o orçamento fica aprovado e a entrada vai para o financeiro.</p>
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
      el.innerHTML=topoHTML()+(sub==="produtos"?produtosHTML():sub==="empresa"?empresaHTML():listaHTML()+`<dialog class="tk-dlg" id="orc-dlg"></dialog>`)+listas;
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
        validade:v("#oe-val")||null,prazo_entrega:v("#oe-prazo").trim(),condicoes:v("#oe-cond").trim(),observacoes:v("#oe-obs").trim(),desconto:r2(parseNum(v("#oe-desc")))});
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
      const campos={contato_id:atual.contato_id||null,cliente_id:atual.cliente_id,cliente_nome:atual.cliente_nome,cliente_contato:atual.cliente_contato,titulo:atual.titulo,itens:atual.itens,desconto:atual.desconto,
        validade:atual.validade,prazo_entrega:atual.prazo_entrega,condicoes:atual.condicoes,observacoes:atual.observacoes,status:atual.status};
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
        <div><span class="label">Como o cliente vai pagar?</span>
          <div class="seg" role="radiogroup" aria-label="Forma de pagamento" id="lf-modo">
            <button type="button" data-modo="1" aria-pressed="false">À vista</button>
            <button type="button" data-modo="2" aria-pressed="true">50% + 50%</button>
            <button type="button" data-modo="n" aria-pressed="false">Parcelado</button></div></div>
        <div class="grid2">
          <div id="lf-n-box" hidden><label class="label" for="lf-n">Parcelas</label><input id="lf-n" type="number" min="2" max="24" value="3"></div>
          <div><label class="label" for="lf-data">Primeiro pagamento</label><input type="date" id="lf-data" value="${h}"></div>
          <div><label class="label" for="lf-forma">Forma</label><input type="text" id="lf-forma" list="fin-formas" value="Pix"></div>
          <div><label class="label" for="lf-int">Intervalo entre parcelas (dias)</label><input id="lf-int" type="number" min="1" value="30"></div>
        </div>
        <label class="check"><input type="checkbox" id="lf-pago" checked> O primeiro pagamento já entrou</label>
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
      const d=el.querySelector("#lanc-form");const modo=(d.querySelector("#lf-modo [aria-pressed=true]")||{}).dataset?.modo||"1";
      const n=modo==="1"?1:modo==="2"?2:Math.max(2,Math.min(24,parseInt(d.querySelector("#lf-n").value)||2));
      const t=totais(atual.itens,atual.desconto), base=Math.floor(t.total/n*100)/100, baseC=Math.floor(t.custo/n*100)/100, int_=parseInt(d.querySelector("#lf-int").value)||30;
      const ini=d.querySelector("#lf-data").value||hojeISO();
      return Array.from({length:n},(_,k)=>({k,valor:k===n-1?r2(t.total-base*(n-1)):base,custo:k===n-1?r2(t.custo-baseC*(n-1)):baseC,data:somaDias(ini,k*int_)}));
    }
    function prevLanc(){const ps=parcelas();el.querySelector("#lf-prev").innerHTML=ps.map(p=>`${p.k+1}ª: <b>${brl(p.valor)}</b> em ${dmy(p.data)} <span class="note">(lucro ${brl(p.valor-p.custo)})</span>`).join("<br>")}
    async function lancar(){
      const d=el.querySelector("#lanc-form"), o=atual, t=totais(o.itens,o.desconto), ps=parcelas(), n=ps.length;
      const forma=d.querySelector("#lf-forma").value.trim(), pago1=d.querySelector("#lf-pago").checked;
      const base={tipo:"entrada",categoria:"Materiais gráficos",forma,cliente_id:o.cliente_id,cliente_nome:nomeCli(o),orcamento_id:o.id};
      const rows=ps.map(p=>({...base,descricao:`Orçamento Nº ${nro(o.numero)}${o.titulo?" · "+o.titulo:""}${n>1?` (${p.k+1}/${n})`:""}`,valor:p.valor,custo:p.custo,data:p.data,status:p.k===0&&pago1?"pago":"previsto"}));
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
      const row=e.target.closest("[data-o-id]");if(row){const o=orcs.find(x=>x.id===row.dataset.oId);if(o)abrir(o);return}
      const pr=e.target.closest("[data-p-id]");if(pr){prodEd=produtos.find(x=>x.id===pr.dataset.pId);abrirDlg(prodForm(prodEd));calcProdForm();return}
      const md=e.target.closest("#lf-modo [data-modo]");if(md){el.querySelectorAll("#lf-modo button").forEach(b=>b.setAttribute("aria-pressed",String(b===md)));el.querySelector("#lf-n-box").hidden=md.dataset.modo!=="n";prevLanc();return}
      const b=e.target.closest("[data-o]");if(!b)return;
      const a=b.dataset.o;
      if(a==="novo")return novo();
      if(a==="voltar"){if(sujo&&b.dataset.confirm!=="1"){b.dataset.confirm="1";b.innerHTML="Sair sem salvar?";toast("Há mudanças não salvas. Clique de novo para sair sem salvar.");return}
        atual=null;sub="lista";render();return}
      if(a==="item-add"){lerCabecalho();atual.itens.push(itemVazio());const box=el.querySelector("#orc-itens");box.insertAdjacentHTML("beforeend",itemHTML(atual.itens[atual.itens.length-1],atual.itens.length-1));box.lastElementChild.querySelector("input").focus();sujo=true;return}
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
      if(a==="prod-novo"){prodEd={};abrirDlg(prodForm(prodEd));calcProdForm();return}
      if(a==="prod-salvar"){e.preventDefault();
        const v=s=>el.querySelector(s).value, nome=v("#pf-nome").trim();if(!nome){toast("Dê um nome ao produto.");return}
        const dup=produtos.find(p=>p.nome.toLowerCase()===nome.toLowerCase()&&p.id!==prodEd.id);if(dup){toast("Já existe um produto com esse nome.");return}
        const campos={nome,descricao:v("#pf-desc").trim(),unidade:v("#pf-un").trim()||"un",fornecedor:v("#pf-forn").trim(),custo:r2(parseNum(v("#pf-custo"))),lucro_tipo:v("#pf-tipo"),lucro:r2(parseNum(v("#pf-lucro")))};
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
      const div=t.closest(".oi");if(div&&t.dataset.f){if(t.dataset.f==="nome"){const k=+div.dataset.k;atual.itens[k].nome=t.value;
          const p=produtos.find(x=>x.nome.toLowerCase()===t.value.trim().toLowerCase());if(p&&atual.itens[k].produto_id!==p.id&&!N(atual.itens[k].custo)){aplicarProduto(k,p);const i=el.querySelector(`#oi-n${k}`);if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}return}
          if(atual.itens[k].produto_id&&!(produtos.find(x=>x.id===atual.itens[k].produto_id)||{}).nome?.toLowerCase().startsWith(t.value.trim().toLowerCase()))atual.itens[k].produto_id=null;
          sujo=true;return}
        lerItem(div,t.dataset.f);return}
      if(t.id==="oe-desc"){atual.desconto=r2(parseNum(t.value));sujo=true;atualizarResumo();return}
      if(t.closest(".orc-ed"))sujo=true;
    });
    el.addEventListener("change",e=>{
      const t=e.target;
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
          validade_dias:Math.max(1,parseInt(v("#em-val"))||15),lucro_padrao:r2(parseNum(v("#em-lucro"))),condicoes:v("#em-cond"),observacoes:v("#em-obs")};
        const {data,error}=await sb.from("empresa").upsert(campos).select().single();if(error)return falha("salvar os dados",error);
        empresa=data;toast("Dados do PDF salvos.");return}
      if(e.target.id==="prod-form"){el.querySelector('[data-o="prod-salvar"]').click();return}
      if(e.target.id==="lanc-form"){lancar();return}
    });

    carregar();
    return {recarregar:carregar,novo:()=>{if(orcs)novo()}};
  }
  window.GlaraOrcamentos={criar,totais,precoDe};
})();
