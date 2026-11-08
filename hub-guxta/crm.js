/* Hub de Marketing · CRM (só o administrador vê).
   Contatos em funil, valor em negociação, próxima ação, histórico e botão de WhatsApp.
   O WhatsApp abre no seu app (wa.me) com a mensagem pronta; a conversa fica registrada no histórico. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const N=v=>Number(v)||0;
  const r2=v=>Math.round((N(v)+Number.EPSILON)*100)/100;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const brlCurto=v=>{v=N(v);return v>=1e4?"R$ "+(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mil":brl(v)};
  const num=v=>N(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const parseNum=s=>{s=String(s??"").trim().replace(/[^\d,.-]/g,"");if(!s)return 0;if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isFinite(n)?n:0};
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const somaDias=(iso,n)=>{const d=new Date(iso+"T12:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  const dm=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const quando=ts=>{const d=new Date(ts);return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
  const diasEntre=(a,b)=>Math.round((new Date(a+"T12:00")-new Date(b+"T12:00"))/864e5);
  const ETAPAS=[["novo","Novo contato"],["conversa","Em conversa"],["orcamento","Orçamento enviado"],["fechado","Fechado"],["perdido","Perdido"]];
  const NOME_ETAPA=Object.fromEntries(ETAPAS);
  const ORIGENS=["Instagram","WhatsApp","Indicação","Anúncio","Site","Google","Evento","Cliente antigo","Outro"];
  const INTERESSES=["Social media","Identidade visual","Site","Tráfego pago","Materiais gráficos","Vídeo","Consultoria","Plano mensal"];
  const PERDAS=["Preço","Fechou com outro","Sem resposta","Adiou o projeto","Não era o perfil"];
  const TIPOS={nota:"Nota",whatsapp:"WhatsApp",ligacao:"Ligação",reuniao:"Reunião",email:"E-mail",etapa:"Etapa",orcamento:"Orçamento"};
  const ic=p=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={mais:ic('<path d="M12 5v14M5 12h14"/>'),wa:`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>`,
    orc:ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),cli:ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
    cal:ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),lista:ic('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),funil:ic('<path d="M3 4h18l-7 8v6l-4 2v-8z"/>')};

  // telefone brasileiro para o link do WhatsApp (55 + DDD + número)
  const foneWa=t=>{let d=String(t||"").replace(/\D/g,"");if(!d)return "";if(d.startsWith("00"))d=d.slice(2);if(d.length===10||d.length===11)d="55"+d;return d.length>=12?d:""};

  function criar(el,sb,ctx){
    let C=[], eventos={}, orcsDe={}, vista="funil", busca="", origemF="", soAcao=false, ed=null, arrastando=null;
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const cfg=ctx.cfg||{}, eu=(cfg.nomeAdmin||"Gustavo"), marca=(cfg.marca||"GUXTA");
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const MODELOS=[
      ["primeiro","Primeiro contato",c=>`Olá, ${pn(c)}! Aqui é o ${eu}, da ${marca}. ${c.interesse?`Vi que você tem interesse em ${c.interesse.toLowerCase()}. `:""}Posso te fazer algumas perguntas rápidas para entender o que você precisa?`],
      ["proposta","Enviar proposta",c=>`Olá, ${pn(c)}! Preparei a proposta${c.interesse?` de ${c.interesse.toLowerCase()}`:""} que conversamos. Vou te mandar aqui. Qualquer dúvida, me chama.`],
      ["followup","Retorno do orçamento",c=>`Olá, ${pn(c)}! Tudo bem? Passando para saber se você conseguiu ver o orçamento que te enviei. Se quiser ajustar alguma coisa, fico à disposição.`],
      ["retomar","Retomar contato",c=>`Olá, ${pn(c)}! Tudo bem? Lembrei de você e queria saber se ainda faz sentido conversarmos${c.interesse?` sobre ${c.interesse.toLowerCase()}`:""}.`],
      ["boasvindas","Boas-vindas (fechou)",c=>`Olá, ${pn(c)}! Que bom ter você com a gente na ${marca}. Já vou te mandar os próximos passos.`],
      ["livre","Mensagem livre",c=>""]];
    function pn(c){return String(c.nome||"").replace(/^(dra?\.?|sr\.?|sra\.?)\s+/i,m=>m).split(" ").slice(0,2).join(" ")}
    const modeloPadrao=c=>({novo:"primeiro",conversa:"proposta",orcamento:"followup",fechado:"boasvindas",perdido:"retomar"}[c.etapa]||"livre");

    async function carregar(){
      el.innerHTML=`<div class="empty">Carregando o CRM…</div>`;
      const a=await sb.from("contatos").select("*").order("atualizado_em",{ascending:false});
      if(a.error){el.innerHTML=`<div class="empty">Não consegui carregar o CRM. ${/contatos/.test(a.error.message||"")?"Rode o arquivo 09 do banco no Supabase.":esc(a.error.message)}</div>`;return}
      C=a.data||[];render();
    }
    const aberto=c=>c.etapa!=="fechado"&&c.etapa!=="perdido";
    const atrasada=c=>aberto(c)&&c.proxima_data&&c.proxima_data<hojeISO();
    const hoje_=c=>aberto(c)&&c.proxima_data===hojeISO();
    function filtrados(){const q=busca.trim().toLowerCase();
      return C.filter(c=>(!origemF||c.origem===origemF)&&(!soAcao||(aberto(c)&&c.proxima_data&&c.proxima_data<=hojeISO()))&&
        (!q||[c.nome,c.empresa,c.telefone,c.email,c.interesse,c.origem,c.proxima_acao].join(" ").toLowerCase().includes(q)))}

    function kpisHTML(){
      const mes=hojeISO().slice(0,7), ab=C.filter(aberto), fm=C.filter(c=>c.etapa==="fechado"&&String(c.fechado_em||"").slice(0,7)===mes);
      const fech=C.filter(c=>c.etapa==="fechado").length, perd=C.filter(c=>c.etapa==="perdido").length, acao=C.filter(c=>atrasada(c)||hoje_(c)).length;
      const k=(cls,v,t,s)=>`<div class="tk-kpi ${cls}"><b>${v}</b><span>${t}</span>${s?`<small>${s}</small>`:""}</div>`;
      return `<div class="tk-kpis orc-kpis">
        ${k("",ab.length,"Em aberto",`${C.filter(c=>c.etapa==="novo").length} novo${C.filter(c=>c.etapa==="novo").length===1?"":"s"}`)}
        ${k("money",brlCurto(ab.reduce((s,c)=>s+N(c.valor),0)),"Em negociação","soma dos contatos em aberto")}
        ${k("ok",brlCurto(fm.reduce((s,c)=>s+N(c.valor),0)),"Fechado no mês",`${fm.length} contato${fm.length===1?"":"s"}`)}
        ${k("",fech+perd?Math.round(fech/(fech+perd)*100)+"%":"–","Conversão",fech+perd?`${fech} fechado${fech===1?"":"s"} · ${perd} perdido${perd===1?"":"s"}`:"")}
        ${k(acao?"late":"",acao,"Para fazer hoje",acao?"retornos de hoje ou atrasados":"nenhum retorno pendente")}
      </div>`;
    }
    function cardHTML(c){
      const late=atrasada(c), hj=hoje_(c), wa=foneWa(c.telefone);
      return `<article class="crm-card${late?" late":""}" draggable="true" data-c="${c.id}" tabindex="0" aria-label="${esc(c.nome)}">
        <header><b>${esc(c.nome)}</b>${wa?`<button type="button" class="crm-wa" data-k="wa-rapido" title="Abrir no WhatsApp" aria-label="Abrir conversa com ${esc(c.nome)} no WhatsApp">${I.wa}</button>`:""}</header>
        ${c.empresa||c.interesse?`<small>${esc([c.empresa,c.interesse].filter(Boolean).join(" · "))}</small>`:""}
        <div class="crm-card-m">${c.origem?`<span class="crm-or">${esc(c.origem)}</span>`:""}${N(c.valor)?`<span class="crm-val">${brl(c.valor)}</span>`:""}</div>
        ${aberto(c)&&(c.proxima_acao||c.proxima_data)?`<p class="crm-prox${late?" late":hj?" hoje":""}">${I.cal}<span>${c.proxima_data?(late?`Atrasado · ${dm(c.proxima_data)}`:hj?"Hoje":dm(c.proxima_data))+(c.proxima_acao?" · ":""):""}${esc(c.proxima_acao)}</span></p>`:""}
        ${c.etapa==="perdido"&&c.motivo_perda?`<p class="crm-prox">${esc(c.motivo_perda)}</p>`:""}
        ${c.cliente_id?`<span class="crm-cli">${I.cli} Cliente do Hub</span>`:""}
      </article>`;
    }
    function funilHTML(lista){
      return `<div class="crm-funil">${ETAPAS.map(([k,t])=>{const cs=lista.filter(c=>c.etapa===k).sort((a,b)=>(a.proxima_data||"9999").localeCompare(b.proxima_data||"9999"));
        const soma=cs.reduce((s,c)=>s+N(c.valor),0);
        return `<section class="crm-col crm-${k}" data-etapa="${k}" aria-label="${t}">
          <header><h3>${t}</h3><span class="crm-n">${cs.length}</span>${soma?`<small>${brlCurto(soma)}</small>`:""}</header>
          <div class="crm-drop">${cs.map(cardHTML).join("")||`<p class="crm-vazio">${k==="novo"?"Nenhum contato novo. Clique em Novo contato.":"Arraste um contato para cá."}</p>`}</div></section>`}).join("")}</div>`;
    }
    function listaHTML(lista){
      const ord=[...lista].sort((a,b)=>(aberto(b)-aberto(a))||(a.proxima_data||"9999").localeCompare(b.proxima_data||"9999"));
      return `<div class="orc-lista">${ord.map(c=>`<button type="button" class="orc-row crm-row" data-c="${c.id}">
          <span class="orc-t"><b>${esc(c.nome)}</b><small>${esc([c.empresa,c.interesse,c.origem,c.telefone].filter(Boolean).join(" · "))}</small></span>
          <span class="crm-prox${atrasada(c)?" late":hoje_(c)?" hoje":""}">${aberto(c)&&c.proxima_data?`${I.cal}<span>${atrasada(c)?"Atrasado · ":hoje_(c)?"Hoje · ":""}${dm(c.proxima_data)}${c.proxima_acao?" · "+esc(c.proxima_acao):""}</span>`:""}</span>
          <span class="orc-st"><span class="status ${{fechado:"ok",perdido:"adj",orcamento:"pend"}[c.etapa]||"prod"}">${NOME_ETAPA[c.etapa]}</span></span>
          <span class="orc-v"><b>${N(c.valor)?brl(c.valor):"–"}</b></span></button>`).join("")||`<div class="empty">Nenhum contato encontrado.</div>`}</div>`;
    }
    function render(){
      const lista=filtrados(), origens=[...new Set(C.map(c=>c.origem).filter(Boolean))].sort();
      el.innerHTML=`<section class="card tk-head">
          <div class="head"><div><span class="eyebrow">Só você vê</span><h2>CRM · Contatos</h2></div>
            <button class="btn primary" data-k="novo">${I.mais} Novo contato</button></div>
          ${kpisHTML()}
          <div class="tk-bar">
            <div class="summary" role="group" aria-label="Filtrar">
              <button class="chip" data-k="acao" aria-pressed="${soAcao}">Para fazer hoje <b>${C.filter(c=>atrasada(c)||hoje_(c)).length}</b></button>
              ${origens.length?`<select id="crm-origem" aria-label="Filtrar por origem"><option value="">Todas as origens</option>${origens.map(o=>`<option ${o===origemF?"selected":""}>${esc(o)}</option>`).join("")}</select>`:""}
            </div>
            <div class="tk-tools"><input type="search" id="crm-busca" placeholder="Buscar nome, telefone, empresa" value="${esc(busca)}" aria-label="Buscar contato">
              <div class="seg" role="group" aria-label="Visualização"><button type="button" data-k="vista" data-v="funil" aria-pressed="${vista==="funil"}">${I.funil} Funil</button><button type="button" data-k="vista" data-v="lista" aria-pressed="${vista==="lista"}">${I.lista} Lista</button></div></div>
          </div>
        </section>
        <div id="crm-corpo">${vista==="lista"?listaHTML(lista):funilHTML(lista)}</div>
        <dialog class="tk-dlg crm-dlg" id="crm-dlg"></dialog>
        <datalist id="crm-origens">${ORIGENS.map(o=>`<option value="${o}">`).join("")}</datalist>
        <datalist id="crm-interesses">${INTERESSES.map(o=>`<option value="${o}">`).join("")}</datalist>
        <datalist id="crm-perdas">${PERDAS.map(o=>`<option value="${o}">`).join("")}</datalist>`;
    }
    const corpo=()=>{const x=el.querySelector("#crm-corpo");if(x){const l=filtrados();x.innerHTML=vista==="lista"?listaHTML(l):funilHTML(l)}};

    /* ---------- ficha do contato ---------- */
    function fichaHTML(c){
      const novo=!c.id, wa=foneWa(c.telefone), m=modeloPadrao(c), modelo=MODELOS.find(x=>x[0]===m);
      return `<form method="dialog" class="tk-form crm-form" id="crm-form">
        <div class="head"><h2>${novo?"Novo contato":esc(c.nome)}</h2><button type="button" class="tk-x" data-k="fechar" aria-label="Fechar">✕</button></div>
        <div class="seg crm-etapas" role="radiogroup" aria-label="Etapa do funil">${ETAPAS.map(([k,t])=>`<button type="button" data-k="etapa" data-e="${k}" aria-pressed="${(c.etapa||"novo")===k}">${t}</button>`).join("")}</div>
        <div id="cf-perda-box" ${c.etapa==="perdido"?"":"hidden"}><label class="label" for="cf-perda">Por que perdeu?</label><input type="text" id="cf-perda" list="crm-perdas" value="${esc(c.motivo_perda||"")}"></div>
        <div class="grid2">
          <div><label class="label" for="cf-nome">Nome</label><input type="text" id="cf-nome" required maxlength="120" value="${esc(c.nome||"")}" placeholder="Ex.: Dra. Ana Souza"></div>
          <div><label class="label" for="cf-tel">WhatsApp</label><input type="text" id="cf-tel" inputmode="tel" autocomplete="tel" value="${esc(c.telefone||"")}" placeholder="(21) 99999-0000"></div>
          <div><label class="label" for="cf-emp">Empresa / escritório</label><input type="text" id="cf-emp" value="${esc(c.empresa||"")}"></div>
          <div><label class="label" for="cf-email">E-mail</label><input type="email" id="cf-email" value="${esc(c.email||"")}"></div>
          <div><label class="label" for="cf-origem">Como chegou</label><input type="text" id="cf-origem" list="crm-origens" value="${esc(c.origem||"")}" placeholder="Instagram, indicação…"></div>
          <div><label class="label" for="cf-int">Interesse</label><input type="text" id="cf-int" list="crm-interesses" value="${esc(c.interesse||"")}" placeholder="Social media, site…"></div>
          <div><label class="label" for="cf-valor">Valor em negociação (R$)</label><input type="text" id="cf-valor" inputmode="decimal" value="${N(c.valor)?num(c.valor):""}" placeholder="0,00"></div>
          <div><label class="label" for="cf-data">Próximo retorno</label><input type="date" id="cf-data" value="${esc(c.proxima_data||"")}"></div>
        </div>
        <div><label class="label" for="cf-acao">O que fazer no retorno</label><input type="text" id="cf-acao" value="${esc(c.proxima_acao||"")}" placeholder="Ex.: mandar proposta, ligar para fechar"></div>
        <div class="crm-atalhos" aria-label="Atalhos de data">${[["Hoje",0],["Amanhã",1],["Em 3 dias",3],["Em 1 semana",7]].map(([t,d])=>`<button type="button" class="chip" data-k="data" data-d="${d}">${t}</button>`).join("")}</div>
        ${novo?"":`<fieldset class="orc-fs crm-wa-box"><legend>${I.wa} WhatsApp</legend>
          ${wa?`<div><label class="label" for="cf-modelo">Mensagem</label><select id="cf-modelo">${MODELOS.map(x=>`<option value="${x[0]}" ${x[0]===m?"selected":""}>${x[1]}</option>`).join("")}</select></div>
          <textarea id="cf-msg" style="min-height:96px">${esc(modelo[2](c))}</textarea>
          <div class="actions"><a class="btn primary crm-wa-bt" id="cf-wa" target="_blank" rel="noopener" href="https://wa.me/${wa}">${I.wa} Abrir no WhatsApp</a><span class="note">Abre no seu WhatsApp com a mensagem pronta e anota no histórico.</span></div>`
          :`<p class="note" style="margin:0">Coloque o número de WhatsApp com DDD para abrir a conversa daqui.</p>`}</fieldset>`}
        <div class="actions"><button type="submit" class="btn primary">${novo?"Criar contato":"Salvar"}</button><button type="button" class="btn ghost" data-k="fechar">Cancelar</button>
          ${novo?"":`<button type="button" class="btn small" data-k="orcamento">${I.orc} Criar orçamento</button>
          ${c.cliente_id?`<span class="crm-cli">${I.cli} Já é cliente do Hub</span>`:`<button type="button" class="btn small" data-k="cliente">${I.cli} Virar cliente do Hub</button>`}
          <button type="button" class="btn danger small" data-k="apagar" style="margin-left:auto">Apagar</button>`}</div>
        ${novo?"":`<div class="crm-orcs" id="cf-orcs"></div>
        <fieldset class="orc-fs"><legend>Histórico</legend>
          <div class="crm-nota"><select id="cf-tipo" aria-label="Tipo de registro">${["nota","whatsapp","ligacao","reuniao","email"].map(t=>`<option value="${t}">${TIPOS[t]}</option>`).join("")}</select>
            <input type="text" id="cf-nota" placeholder="O que foi conversado?" aria-label="Anotação"><button type="button" class="btn small" data-k="nota">Anotar</button></div>
          <ol class="crm-hist" id="cf-hist"><li class="note">Carregando…</li></ol></fieldset>`}
      </form>`;
    }
    async function carregarFicha(c){
      const [ev,oc]=await Promise.all([sb.from("contato_eventos").select("*").eq("contato_id",c.id).order("criado_em",{ascending:false}),
        sb.from("orcamentos").select("id,numero,total,status,titulo").eq("contato_id",c.id).order("criado_em",{ascending:false})]);
      eventos[c.id]=ev.data||[];orcsDe[c.id]=oc.data||[];histHTML(c);
    }
    function histHTML(c){
      const h=el.querySelector("#cf-hist");if(!h)return;const ev=eventos[c.id]||[];
      h.innerHTML=ev.map(e=>`<li class="crm-ev ${e.tipo}"><span class="crm-ev-t">${TIPOS[e.tipo]||e.tipo}</span><p>${esc(e.texto)}</p><time>${quando(e.criado_em)}</time></li>`).join("")+`<li class="crm-ev"><span class="crm-ev-t">Criado</span><p>Contato cadastrado${c.origem?" · "+esc(c.origem):""}</p><time>${quando(c.criado_em)}</time></li>`;
      const o=el.querySelector("#cf-orcs"), os=orcsDe[c.id]||[], ST={rascunho:"Rascunho",enviado:"Enviado",aprovado:"Aprovado",recusado:"Recusado"};
      if(o)o.innerHTML=os.length?`<span class="label">Orçamentos</span>${os.map(x=>`<button type="button" class="chip" data-k="abrir-orc" data-id="${x.id}">Nº ${String(x.numero).padStart(4,"0")} · ${brl(x.total)} · ${ST[x.status]||x.status}</button>`).join("")}`:"";
    }
    const dlg=()=>el.querySelector("#crm-dlg");
    function abrir(c){ed=JSON.parse(JSON.stringify(c));const d=dlg();d.innerHTML=fichaHTML(ed);if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
      if(ed.id)carregarFicha(ed);else setTimeout(()=>{const i=el.querySelector("#cf-nome");i&&i.focus()},30);atualizarWa()}
    function fechar(){const d=dlg();if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open");ed=null}
    function atualizarWa(){const a=el.querySelector("#cf-wa"), t=el.querySelector("#cf-msg");if(!a||!ed)return;const n=foneWa(ed.telefone);a.href=`https://wa.me/${n}${t&&t.value.trim()?"?text="+encodeURIComponent(t.value.trim()):""}`}
    function lerFicha(){const v=s=>{const x=el.querySelector(s);return x?x.value.trim():""};
      return {nome:v("#cf-nome"),telefone:v("#cf-tel"),empresa:v("#cf-emp"),email:v("#cf-email"),origem:v("#cf-origem"),interesse:v("#cf-int"),valor:r2(parseNum(v("#cf-valor"))),
        proxima_data:v("#cf-data")||null,proxima_acao:v("#cf-acao"),etapa:ed.etapa||"novo",motivo_perda:ed.etapa==="perdido"?v("#cf-perda"):""}}
    async function salvar(fecharDepois=true){
      const campos=lerFicha();if(!campos.nome){toast("Escreva o nome do contato.");el.querySelector("#cf-nome").focus();return null}
      const q=ed.id?sb.from("contatos").update(campos).eq("id",ed.id):sb.from("contatos").insert(campos);
      const {data,error}=await q.select().single();if(error){falha("salvar o contato",error);return null}
      const i=C.findIndex(x=>x.id===data.id);if(i>=0)C[i]=data;else C.unshift(data);
      const novo=!ed.id;if(fecharDepois){fechar();render();toast(novo?"Contato criado.":"Contato salvo.")}else{ed=JSON.parse(JSON.stringify(data));corpo()}
      ctx.mudou&&ctx.mudou();return data;
    }
    async function mover(id,etapa,motivo){
      const c=C.find(x=>x.id===id);if(!c||c.etapa===etapa)return;
      const campos={etapa};if(etapa==="perdido"&&motivo!=null)campos.motivo_perda=motivo;
      const {data,error}=await sb.from("contatos").update(campos).eq("id",id).select().single();if(error)return falha("mover o contato",error);
      Object.assign(c,data);render();toast(`${c.nome} → ${NOME_ETAPA[etapa]}.`);ctx.mudou&&ctx.mudou();
    }
    async function anotar(id,tipo,texto){
      const {data,error}=await sb.from("contato_eventos").insert({contato_id:id,tipo,texto}).select().single();if(error){falha("anotar",error);return}
      (eventos[id]=eventos[id]||[]).unshift(data);
      await sb.from("contatos").update({atualizado_em:new Date().toISOString()}).eq("id",id);
      if(ed&&ed.id===id)histHTML(ed);
    }

    el.addEventListener("click",async e=>{
      const card=e.target.closest("[data-c]");
      const b=e.target.closest("[data-k]");
      if(b&&b.dataset.k==="wa-rapido"&&card){e.stopPropagation();const c=C.find(x=>x.id===card.dataset.c);if(!c)return;
        const msg=(MODELOS.find(x=>x[0]===modeloPadrao(c))||MODELOS[5])[2](c);
        window.open(`https://wa.me/${foneWa(c.telefone)}${msg?"?text="+encodeURIComponent(msg):""}`,"_blank","noopener");
        anotar(c.id,"whatsapp","Abriu a conversa no WhatsApp"+(msg?": “"+msg.slice(0,80)+(msg.length>80?"…":"")+"”":""));return}
      if(!b&&card&&!e.target.closest("dialog")){const c=C.find(x=>x.id===card.dataset.c);if(c)abrir(c);return}
      if(!b)return;const k=b.dataset.k;
      if(k==="novo")return abrir({etapa:"novo",origem:"",proxima_data:somaDias(hojeISO(),1),proxima_acao:"Primeiro contato"});
      if(k==="vista"){vista=b.dataset.v;render();return}
      if(k==="acao"){soAcao=!soAcao;render();return}
      if(k==="fechar"){fechar();return}
      if(k==="etapa"){ed.etapa=b.dataset.e;el.querySelectorAll(".crm-etapas button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));el.querySelector("#cf-perda-box").hidden=ed.etapa!=="perdido";
        const sel=el.querySelector("#cf-modelo");if(sel){sel.value=modeloPadrao(ed);sel.dispatchEvent(new Event("change",{bubbles:true}))}return}
      if(k==="data"){el.querySelector("#cf-data").value=somaDias(hojeISO(),+b.dataset.d);return}
      if(k==="nota"&&ed&&ed.id){const t=el.querySelector("#cf-nota").value.trim();if(!t){el.querySelector("#cf-nota").focus();return}
        await anotar(ed.id,el.querySelector("#cf-tipo").value,t);el.querySelector("#cf-nota").value="";return}
      if(k==="orcamento"&&ed&&ed.id){const c=await salvar(false);if(!c)return;fechar();ctx.novoOrcamento&&ctx.novoOrcamento(c);return}
      if(k==="abrir-orc"){fechar();ctx.abrirOrcamento&&ctx.abrirOrcamento(b.dataset.id);return}
      if(k==="cliente"&&ed&&ed.id){const c=await salvar(false);if(!c)return;
        const nome=c.empresa||c.nome;const ex=clientes().find(x=>x.nome.toLowerCase()===nome.toLowerCase());
        let cid=ex&&ex.id;if(!cid){const r=ctx.criarCliente?await ctx.criarCliente(nome):null;if(!r)return;cid=r.id}
        const {data,error}=await sb.from("contatos").update({cliente_id:cid,etapa:"fechado"}).eq("id",c.id).select().single();if(error)return falha("ligar ao cliente",error);
        const i=C.findIndex(x=>x.id===c.id);if(i>=0)C[i]=data;await anotar(c.id,"nota",`Virou cliente do Hub: ${nome}`);fechar();render();toast(`${nome} agora é cliente do Hub. Libere o acesso na página do cliente.`);ctx.mudou&&ctx.mudou();return}
      if(k==="apagar"&&ed&&ed.id){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("contatos").delete().eq("id",ed.id);if(error)return falha("apagar",error);C=C.filter(x=>x.id!==ed.id);fechar();render();toast("Contato apagado.");ctx.mudou&&ctx.mudou();return}
    });
    // o botão do WhatsApp da ficha: o link abre sozinho; aqui só anota no histórico
    el.addEventListener("click",e=>{const a=e.target.closest("#cf-wa");if(!a||!ed||!ed.id)return;const t=(el.querySelector("#cf-msg")||{}).value||"";
      anotar(ed.id,"whatsapp","Abriu a conversa no WhatsApp"+(t.trim()?": “"+t.trim().slice(0,80)+(t.trim().length>80?"…":"")+"”":""));});
    el.addEventListener("keydown",e=>{const card=e.target.closest&&e.target.closest(".crm-card");if(card&&(e.key==="Enter"||e.key===" ")&&e.target===card){e.preventDefault();const c=C.find(x=>x.id===card.dataset.c);if(c)abrir(c)}
      if(e.target.id==="cf-nota"&&e.key==="Enter"){e.preventDefault();el.querySelector('[data-k="nota"]').click()}});
    el.addEventListener("input",e=>{const t=e.target;
      if(t.id==="crm-busca"){busca=t.value;corpo();return}
      if(t.id==="cf-tel"&&ed){ed.telefone=t.value;atualizarWa();return}
      if(t.id==="cf-msg"){atualizarWa();return}
      if(["cf-nome","cf-int"].includes(t.id)&&ed){ed.nome=el.querySelector("#cf-nome").value;ed.interesse=el.querySelector("#cf-int").value}});
    el.addEventListener("change",e=>{const t=e.target;
      if(t.id==="crm-origem"){origemF=t.value;render();return}
      if(t.id==="cf-modelo"&&ed){Object.assign(ed,{nome:el.querySelector("#cf-nome").value,interesse:el.querySelector("#cf-int").value});const m=MODELOS.find(x=>x[0]===t.value);el.querySelector("#cf-msg").value=m?m[2](ed):"";atualizarWa();return}});
    el.addEventListener("submit",e=>{e.preventDefault();if(e.target.id==="crm-form")salvar(true)});
    // arrastar entre as colunas do funil
    el.addEventListener("dragstart",e=>{const c=e.target.closest&&e.target.closest(".crm-card");if(!c)return;arrastando=c.dataset.c;c.classList.add("arrastando");e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",arrastando)}catch(_){}});
    el.addEventListener("dragend",e=>{el.querySelectorAll(".arrastando,.sobre").forEach(x=>x.classList.remove("arrastando","sobre"));arrastando=null});
    el.addEventListener("dragover",e=>{const col=e.target.closest&&e.target.closest(".crm-col");if(!col||!arrastando)return;e.preventDefault();el.querySelectorAll(".crm-col.sobre").forEach(x=>x!==col&&x.classList.remove("sobre"));col.classList.add("sobre")});
    el.addEventListener("drop",e=>{const col=e.target.closest&&e.target.closest(".crm-col");if(!col||!arrastando)return;e.preventDefault();const id=arrastando;arrastando=null;col.classList.remove("sobre");
      const et=col.dataset.etapa;if(et==="perdido"){const c=C.find(x=>x.id===id);if(c){abrir({...c,etapa:"perdido"});toast("Escolha o motivo e clique em Salvar.");return}}mover(id,et)});

    carregar();
    return {recarregar:carregar};
  }
  window.GlaraCRM={criar,foneWa};
})();
