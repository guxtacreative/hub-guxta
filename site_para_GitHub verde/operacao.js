/* Hub de Marketing · Operação
   - Entregas do mês (meta dos planos x entregues) e saúde da operação, no Início
   - Meu dia: tudo que é para hoje
   - Aprovações: o que espera o cliente, ajustes pedidos e o que publicar, de todos os clientes
   - Onboarding do cliente: etapas de entrada com barra de progresso */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const N=v=>Number(v)||0, int=v=>Math.round(N(v)).toLocaleString("pt-BR");
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const dm=iso=>{if(!iso)return"";const [,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const ini=n=>String(n||"").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"?";
  const corOk=c=>/^#[0-9a-f]{3,8}$/i.test(c||"")?c:"";
  const av=(c,cls)=>`<span class="op-av${cls?" "+cls:""}" style="${corOk(c&&c.cor_destaque)?"background:"+c.cor_destaque:""}" title="${esc(c&&c.nome||"")}" aria-hidden="true">${esc(ini(c&&c.nome))}</span>`;
  const diasDesde=iso=>{if(!iso)return null;return Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/86400000))};
  const haTxt=n=>n==null?"":n===0?"hoje":n===1?"há 1 dia":`há ${n} dias`;
  const ehVideo=u=>/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u||"");
  const thumb=p=>{const u=(p.slides||[])[0];
    if(!u)return `<span class="op-thumb vazio" aria-hidden="true">${esc((p.formato||"P")[0])}</span>`;
    return ehVideo(u)?`<span class="op-thumb video"><video src="${esc(u)}#t=0.5" muted preload="metadata" playsinline></video><i aria-hidden="true">▶</i></span>`
      :`<span class="op-thumb"><img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()"></span>`};
  const I={
    sol:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    seta:'<span class="op-seta" aria-hidden="true">›</span>'};

  /* ---------- dados comuns: meses recentes, posts e decisões ---------- */
  async function base(sb){
    const lim=new Date(Date.now()-150*86400000).toISOString().slice(0,10);
    const c=await sb.from("ciclos").select("id,cliente_id,titulo,publicado,inicio").order("inicio",{ascending:false});
    const ciclos=(c.data||[]).filter(x=>!x.inicio||x.inicio>=lim);
    const ids=ciclos.map(x=>x.id);
    const p=ids.length?await sb.from("posts").select("id,ciclo_id,titulo,formato,data,slides,versao,criado_em,publicacao,agendado_para").in("ciclo_id",ids):{data:[]};
    const posts=p.data||[], pids=posts.map(x=>x.id);
    const d=pids.length?await sb.from("decisoes").select("*").in("post_id",pids):{data:[]};
    const dec={};(d.data||[]).forEach(x=>dec[x.post_id]=x);
    const cmap={};ciclos.forEach(x=>cmap[x.id]=x);
    return {ciclos,cmap,posts,dec}}
  function estado(p,dec,ciclo){
    if(p.publicacao==="publicado")return "publicado";
    const d=dec[p.id], atual=d&&new Date(d.versao).getTime()>=new Date(p.versao).getTime()-1000;
    if(d&&atual&&d.decisao==="aprovado")return "aprovado";
    if(d&&atual&&d.decisao==="ajuste")return "ajuste";
    return ciclo&&ciclo.publicado?"aguardando":"rascunho"}

  /* ---------- entregas do mês + saúde da operação (Início) ---------- */
  function entregas(el,sb,ctx){
    let mes=hojeISO().slice(0,7)+"-01", D=null;
    const mover=n=>{const [y,m]=mes.split("-").map(Number);const d=new Date(y,m-1+n,1);mes=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-01";carregar()};
    async function carregar(){
      el.innerHTML=`<section class="card ent"><p class="note">Carregando as entregas…</p></section>`;
      const {data,error}=await sb.rpc("painel_entregas",{p_mes:mes});
      if(error||!data){el.innerHTML=`<section class="card ent"><p class="note">Para ver as entregas do mês, rode o arquivo 27 no Supabase.</p></section>`;return}
      D=data;render()}
    function anel(pc){const r=52,c=2*Math.PI*r,v=Math.max(0,Math.min(1,pc));
      return `<svg viewBox="0 0 128 128" class="ent-anel" role="img" aria-label="${Math.round(v*100)}% entregue"><circle cx="64" cy="64" r="${r}" class="ent-anel-f"/><circle cx="64" cy="64" r="${r}" class="ent-anel-v" stroke-dasharray="${(c*v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 64 64)"/><text x="64" y="62" text-anchor="middle" class="ent-pc">${Math.round(v*100)}%</text><text x="64" y="82" text-anchor="middle" class="ent-pc-s">entregue</text></svg>`}
    function render(){
      const [y,m]=mes.split("-").map(Number), meta=N(D.meta), ent=N(D.entregues), falta=Math.max(0,meta-ent), s=D.saude||{};
      const pc=meta?ent/meta:0, dec=N(s.com_decisao), retr=dec?N(s.retrabalho)/dec:0, prim=N(D.entregues)?N(s.primeira)/N(D.entregues):0;
      const atual=mes.slice(0,7)===hojeISO().slice(0,7);
      const frase=!meta?"Cadastre quantos posts cada cliente tem por mês (Configurações do cliente) para medir as entregas."
        :pc>=1?"Meta do mês batida. Mandou bem!":atual?(pc>=.6?"Bom ritmo, vamos fechar o mês com tudo!":"Ainda dá tempo: foque nos clientes mais atrasados abaixo."):pc>=.8?"Mês fechado quase completo.":"Esse mês ficou abaixo da meta.";
      const cls=(D.clientes||[]).filter(c=>N(c.meta)||N(c.feitos));
      el.innerHTML=`<section class="card ent">
        <div class="ent-top">
          <div class="ent-tit"><span class="ent-eyebrow">Entregas</span><h2>Entregas de ${MESES[m-1]}${y!==new Date().getFullYear()?" de "+y:""}</h2><p class="note">${esc(frase)}</p>
            <div class="ent-nav"><button type="button" data-ent="-1" aria-label="Mês anterior">‹</button><span>${MESES[m-1][0].toUpperCase()+MESES[m-1].slice(1)} ${y}</span><button type="button" data-ent="1" aria-label="Próximo mês">›</button></div></div>
          ${anel(pc)}
        </div>
        <div class="ent-nums">
          <div><b>${int(D.clientes_ativos)}</b><span>Clientes ativos</span></div>
          <div><b>${int(meta)}</b><span>Meta do mês</span></div>
          <div class="ok"><b>${int(ent)}</b><span>Entregues</span></div>
          <div class="${falta?"alerta":""}"><b>${int(falta)}</b><span>Faltam</span></div>
          <div><b>${int(D.aguardando)}</b><span>Com o cliente</span></div>
          <div class="${N(D.ajustes)?"alerta":""}"><b>${int(D.ajustes)}</b><span>Em ajuste</span></div>
        </div>
        <div class="ent-saude"><h3>Saúde da operação</h3>
          <div class="ent-saude-g">
            <div><span>Lead time médio</span><b>${s.lead_time!=null?String(s.lead_time).replace(".",",")+" d":"–"}</b><small>da criação à aprovação</small></div>
            <div><span>Retrabalho</span><b class="${retr>.3?"neg":""}">${dec?Math.round(retr*100)+"%":"–"}</b><small>posts que voltaram para ajuste</small></div>
            <div><span>Aprovados de primeira</span><b class="${prim>=.7?"pos":""}">${N(D.entregues)?Math.round(prim*100)+"%":"–"}</b><small>sem nenhum ajuste</small></div>
          </div></div>
        ${cls.length?`<div class="ent-cli"><h3>Por cliente</h3>${cls.map(c=>{const mt=N(c.meta),e=N(c.entregues),p=mt?Math.min(1,e/mt):0;
          return `<button type="button" class="ent-cli-l" data-ent-cli="${esc(c.id)}">${av({nome:c.nome,cor_destaque:c.cor})}<span class="ent-cli-n"><b>${esc(c.nome)}</b><small>${int(e)} de ${mt?int(mt):"–"} entregues${N(c.ajustes)?` · ${int(c.ajustes)} em ajuste`:""}${N(c.aguardando)?` · ${int(c.aguardando)} com o cliente`:""}</small></span><span class="ent-bar"><i style="width:${(p*100).toFixed(0)}%"></i></span>${I.seta}</button>`}).join("")}</div>`:""}
      </section>`}
    el.addEventListener("click",e=>{const b=e.target.closest("[data-ent]");if(b){mover(+b.dataset.ent);return}
      const c=e.target.closest("[data-ent-cli]");if(c&&ctx.abrirCliente)ctx.abrirCliente(c.dataset.entCli,"posts")});
    carregar();return {recarregar:carregar}}

  /* ---------- Aprovações (todos os clientes) ---------- */
  function aprovacoes(el,sb,ctx){
    let B=null, filtro="", aba=null;
    async function carregar(){el.innerHTML=`<div class="empty">Carregando as aprovações…</div>`;
      try{B=await base(sb)}catch(e){el.innerHTML=`<div class="empty">Não consegui carregar agora.</div>`;return}render()}
    function lista(){const cl=ctx.clientes(), cm={};cl.forEach(c=>cm[c.id]=c);const hoje=hojeISO();
      const it=B.posts.map(p=>{const ci=B.cmap[p.ciclo_id]||{}, c=cm[ci.cliente_id];return {p,ci,c,st:estado(p,B.dec,ci),d:B.dec[p.id]}}).filter(x=>x.c&&x.c.ativo!==false&&(!filtro||x.c.id===filtro));
      const g={
        ajuste:it.filter(x=>x.st==="ajuste").sort((a,b)=>String(a.d.em).localeCompare(String(b.d.em))),
        aguardando:it.filter(x=>x.st==="aguardando").sort((a,b)=>String(a.p.versao).localeCompare(String(b.p.versao))),
        publicar:it.filter(x=>x.st==="aprovado").sort((a,b)=>String(a.p.data||"9").localeCompare(String(b.p.data||"9"))),
        aprovados:it.filter(x=>(x.st==="aprovado"||x.st==="publicado")&&x.d&&diasDesde(x.d.em)<=7).sort((a,b)=>String(b.d.em).localeCompare(String(a.d.em)))};
      g.publicar=g.publicar.filter(x=>!x.p.data||x.p.data>=hoje.slice(0,8)+"01");
      return g}
    function linha(x){const p=x.p,c=x.c,d=x.d, wa=x.st==="aguardando"&&ctx.foneWa?ctx.foneWa(c.whatsapp):"";
      const msg=wa?`Oi${c.nome?", "+c.nome.split(" ")[0]:""}! Tem conteúdo esperando a sua aprovação no portal: ${ctx.portalURL?ctx.portalURL(c.token):""}`:"";
      const info=x.st==="ajuste"?`Ajuste pedido ${haTxt(diasDesde(d.em))}`:x.st==="aguardando"?`Enviado ${haTxt(diasDesde(p.versao))}`:x.st==="aprovado"?(p.publicacao==="agendado"?"Agendado":"Pronto para publicar"):`Aprovado ${haTxt(diasDesde(d&&d.em))}`;
      return `<li class="ap-l ap-${x.st}">${thumb(p)}
        <span class="ap-t"><b>${esc(p.titulo)}</b><small>${av(c,"mini")} ${esc(c.nome)} · ${esc(p.formato||"")}${p.data?" · "+dm(p.data):""}</small>
          <span class="ap-info">${esc(info)}</span>${x.st==="ajuste"&&d.comentario?`<q>${esc(d.comentario)}</q>`:""}</span>
        <span class="ap-acoes">${wa?`<a class="btn small outline" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Lembrar</a>`:""}<button type="button" class="btn small" data-ap-abrir="${esc(c.id)}">Abrir</button></span></li>`}
    function render(){const g=lista(), cl=ctx.clientes().filter(c=>c.ativo!==false);
      if(!aba)aba=g.ajuste.length?"ajuste":"aguardando";
      const abas=[["ajuste","Ajustes pedidos"],["aguardando","Esperando o cliente"],["publicar","Para publicar"],["aprovados","Aprovados (7 dias)"]];
      const vazio={ajuste:"Nenhum ajuste pedido. 👏",aguardando:"Nada esperando o cliente agora.",publicar:"Nenhum post aprovado esperando publicação.",aprovados:"Nenhuma aprovação nos últimos 7 dias."};
      el.innerHTML=`<section class="card ap">
        <div class="head"><h2>Aprovações</h2><select id="ap-cli" aria-label="Filtrar por cliente"><option value="">Todos os clientes</option>${cl.map(c=>`<option value="${esc(c.id)}" ${filtro===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
        <div class="ap-abas" role="tablist">${abas.map(([k,t])=>`<button type="button" role="tab" data-ap-aba="${k}" aria-selected="${aba===k}" class="${k==="ajuste"&&g[k].length?"tem":""}">${t}<span>${g[k].length}</span></button>`).join("")}</div>
        ${g[aba].length?`<ul class="ap-lista">${g[aba].map(linha).join("")}</ul>`:`<p class="empty">${vazio[aba]}</p>`}
      </section>`}
    el.addEventListener("click",e=>{const a=e.target.closest("[data-ap-aba]");if(a){aba=a.dataset.apAba;render();return}
      const o=e.target.closest("[data-ap-abrir]");if(o){ctx.abrirCliente(o.dataset.apAbrir,"posts")}});
    el.addEventListener("change",e=>{if(e.target.id==="ap-cli"){filtro=e.target.value;render()}});
    carregar();return {recarregar:carregar}}

  /* ---------- Meu dia ---------- */
  function meuDia(el,sb,ctx){
    async function carregar(){el.innerHTML=`<div class="empty">Montando o seu dia…</div>`;
      const hoje=hojeISO();let B,tk,pd,lc,ag;
      try{[B,tk,pd,lc,ag]=await Promise.all([base(sb),sb.from("tarefas").select("*"),sb.from("pedidos").select("*").eq("status","recebido"),
        sb.from("lancamentos").select("id,descricao,valor,data,status,tipo,cliente_id,cliente_nome").eq("tipo","entrada").eq("status","previsto"),sb.from("agenda_eventos").select("*").eq("data",hoje)])}
      catch(e){el.innerHTML=`<div class="empty">Não consegui montar o seu dia agora.</div>`;return}
      const cm={};ctx.clientes().forEach(c=>cm[c.id]=c);
      const tarefas=(tk.data||[]).filter(t=>t.status!=="feito"&&t.prazo&&t.prazo<=hoje).sort((a,b)=>String(a.prazo).localeCompare(String(b.prazo)));
      const publicar=B.posts.filter(p=>{const ci=B.cmap[p.ciclo_id]||{};return p.data===hoje&&p.publicacao!=="publicado"&&cm[ci.cliente_id]}).map(p=>({p,c:cm[B.cmap[p.ciclo_id].cliente_id],st:estado(p,B.dec,B.cmap[p.ciclo_id])}));
      const chegou=B.posts.map(p=>({p,d:B.dec[p.id],c:cm[(B.cmap[p.ciclo_id]||{}).cliente_id]})).filter(x=>x.d&&x.c&&diasDesde(x.d.em)<1).sort((a,b)=>String(b.d.em).localeCompare(String(a.d.em)));
      const pedidos=(pd.data||[]).filter(x=>cm[x.cliente_id]);
      const cobr=(lc.data||[]).filter(l=>l.data&&l.data<=hoje).sort((a,b)=>String(a.data).localeCompare(String(b.data)));
      const agenda=(ag.data||[]).sort((a,b)=>String(a.hora||"").localeCompare(String(b.hora||"")));
      const total=tarefas.length+publicar.length+chegou.length+pedidos.length+cobr.length+agenda.length;
      const bloco=(t,n,html,vazio)=>`<section class="card md-b"><div class="head"><h3>${t}</h3>${n?`<span class="md-n">${n}</span>`:""}</div>${n?`<ul class="md-l">${html}</ul>`:`<p class="note">${vazio}</p>`}</section>`;
      const item=(attrs,tag,tit,sub,extra)=>`<li><button type="button" class="md-i" ${attrs}>${extra||""}<span class="md-t"><b>${esc(tit)}</b><small>${esc(sub)}</small></span>${tag?`<span class="md-tag ${tag[1]}">${esc(tag[0])}</span>`:""}${I.seta}</button></li>`;
      const d=new Date();const sauda=d.getHours()<12?"Bom dia":d.getHours()<18?"Boa tarde":"Boa noite";
      el.innerHTML=`<header class="md-head"><span class="md-ico" aria-hidden="true">${I.sol}</span><div><h2>${sauda}${ctx.nome?", "+esc(ctx.nome):""}</h2><p class="note">${d.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})} · ${total?`${total} ${total===1?"coisa":"coisas"} para hoje`:"dia tranquilo por aqui"}</p></div></header>
        <div class="md-grid">
          ${bloco("Agenda de hoje",agenda.length,agenda.map(a=>item('data-md-ir="agenda"',null,a.titulo,[a.hora?String(a.hora).slice(0,5):"Dia todo",cm[a.cliente_id]&&cm[a.cliente_id].nome,a.local].filter(Boolean).join(" · "))).join(""),"Nenhum compromisso marcado.")}
          ${bloco("Tarefas",tarefas.length,tarefas.map(t=>item('data-md-ir="tarefas"',t.prazo<hoje?["Atrasada","late"]:["Hoje","hoje"],t.titulo,[t.categoria,(cm[t.cliente_id]||{}).nome||t.cliente_nome].filter(Boolean).join(" · "))).join(""),"Nada vence hoje.")}
          ${bloco("Publicar hoje",publicar.length,publicar.map(x=>item(`data-md-cli="${esc(x.c.id)}" data-md-aba="posts"`,x.st==="aprovado"?(x.p.publicacao==="agendado"?["Agendado","ok"]:["Aprovado","ok"]):x.st==="ajuste"?["Em ajuste","late"]:["Sem aprovação","hoje"],x.p.titulo,`${x.c.nome} · ${x.p.formato||""}`,thumb(x.p))).join(""),"Nenhum post marcado para hoje.")}
          ${bloco("Chegou do cliente (24 h)",chegou.length+pedidos.length,chegou.map(x=>item(`data-md-cli="${esc(x.c.id)}" data-md-aba="posts"`,x.d.decisao==="aprovado"?["Aprovado","ok"]:["Ajuste","late"],x.p.titulo,x.c.nome+(x.d.comentario?" · “"+x.d.comentario+"”":""),thumb(x.p))).join("")+pedidos.map(x=>item(`data-md-cli="${esc(x.cliente_id)}" data-md-aba="pedidos"`,["Pedido novo","hoje"],x.titulo,`${cm[x.cliente_id].nome} · ${x.tipo}${x.prazo?" · para "+dm(x.prazo):""}`)).join(""),"Nenhuma novidade dos clientes.")}
          ${bloco("Cobranças de hoje e atrasadas",cobr.length,cobr.map(l=>item('data-md-ir="financeiro"',l.data<hoje?["Vencida","late"]:["Hoje","hoje"],l.descricao,`${(cm[l.cliente_id]||{}).nome||l.cliente_nome||""} · ${brl(l.valor)} · ${dm(l.data)}`)).join(""),"Nenhuma cobrança para hoje.")}
        </div>`}
    el.addEventListener("click",e=>{const i=e.target.closest("[data-md-ir]");if(i){ctx.ir(i.dataset.mdIr);return}
      const c=e.target.closest("[data-md-cli]");if(c)ctx.abrirCliente(c.dataset.mdCli,c.dataset.mdAba)});
    carregar();return {recarregar:carregar}}

  /* ---------- Onboarding do cliente ---------- */
  const ETAPAS=[
    ["contrato","Contrato assinado e anexado"],
    ["briefing","Briefing inicial (objetivos, público, tom de voz)"],
    ["acessos","Acessos às redes (Instagram, Facebook, Meta Business)"],
    ["identidade","Identidade visual recebida (logo, cores, fontes)"],
    ["plano","Plano do mês configurado (posts, Reels e Stories)"],
    ["portal","Cliente com acesso ao portal"],
    ["planejamento","Planejamento do primeiro mês"],
    ["primeiro","Primeiro conteúdo aprovado"]];
  function onboardingHTML(c,dados){
    dados=dados||{};const o=c.onboarding||{};
    const auto={contrato:(dados.documentos||[]).length>0,plano:Object.values(c.limites||{}).some(v=>typeof v==="number"&&v>0),portal:(dados.acessos||[]).length>0,planejamento:(dados.ciclos||[]).length>0};
    const lista=ETAPAS.map(([k,t])=>({k,t,ok:!!o[k]||!!auto[k],auto:!o[k]&&!!auto[k]})), feitos=lista.filter(x=>x.ok).length, pc=Math.round(feitos/lista.length*100);
    return `<section class="card onb${feitos===lista.length?" onb-ok":""}"><details ${feitos===lista.length?"":"open"}>
      <summary><span class="onb-tit"><b>Onboarding</b><span class="note">${feitos===lista.length?"Concluído ✓":`${feitos} de ${lista.length} etapas`}</span></span><span class="onb-bar" aria-hidden="true"><i style="width:${pc}%"></i></span><span class="onb-pc">${pc}%</span></summary>
      <ul class="onb-l">${lista.map(x=>`<li><label class="check"><input type="checkbox" data-onb="${x.k}" ${x.ok?"checked":""} ${x.auto?"disabled":""}> <span>${esc(x.t)}${x.auto?' <small class="note">(automático)</small>':""}</span></label></li>`).join("")}</ul>
    </details></section>`}

  window.GlaraOperacao={base,estado,entregas,aprovacoes,meuDia,onboardingHTML,ETAPAS};
})();
