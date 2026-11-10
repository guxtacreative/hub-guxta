/* Hub de Marketing · monta o relatório mensal.
   Usado pela página de impressão (relatorio.html) e pela aba Relatório do portal (index.html). */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dataBR=iso=>{if(!iso)return"";const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m+"/"+y};
  const ehVideo=u=>/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(u||"");
  const n2=n=>n==null?"":String(n).padStart(2,"0");
  const ST={recebido:"Recebido",producao:"Em produção",concluido:"Concluído",recusado:"Não aceito"};

  /* D = {ciclo, cliente, posts, dec:{post_id:decisao}, nRoteiros, nStories, pedidos, anuncios, ciclos}
     opt = {marca, plataforma, portal:true (sem logo e com aviso de atualização)} */
  function html(D,opt){
    opt=opt||{};
    const {ciclo,cliente}=D, posts=D.posts||[], dec=D.dec||{}, pedidos=D.pedidos||[], anuncios=D.anuncios||[], ciclos=D.ciclos||[];
    const GM=window.GlaraMetricas, GA=window.GlaraAnuncios;
    const MARCA=opt.marca||"GUXTA", PLAT=opt.plataforma||"Hub de Marketing";
    const aprovado=p=>{const d=dec[p.id];return d&&d.versao===p.versao&&d.decisao==="aprovado"};
    const nApr=posts.filter(aprovado).length;
    const nRot=D.nRoteiros||0, nSto=D.nStories||0;
    const nReels=Math.max(posts.filter(p=>p.formato==="Reels").length,nRot);
    const pedFeitos=pedidos.filter(x=>x.status==="concluido").length, pedExtra=pedidos.filter(x=>x.extra).length;
    const k=(t,v,s)=>`<div class="kpi"><span class="kpi-t">${esc(t)}</span><span class="kpi-v">${v}</span>${s?`<span class="kpi-s">${s}</span>`:""}</div>`;
    const lim=cliente.limites||{};
    const plano=Object.keys(lim).length&&cliente.plano_nome?` · plano ${esc(cliente.plano_nome)}`:"";
    const hoje=new Date().toLocaleDateString("pt-BR");

    let h=opt.portal?"":`<div class="brandbar"><img class="logo" src="logo.png" alt="" onerror="if(!this.dataset.t){this.dataset.t=1;this.src='logo.svg'}else{this.remove()}"><span class="eyebrow marca-tag">Onde estratégia, criação e gestão se encontram</span></div>`;
    h+=`
    <header class="hero capa">
      <span class="eyebrow">Relatório mensal · ${esc(MARCA)}</span>
      <h1>Relatório de <mark>${esc(cliente.nome)}</mark></h1>
      <p class="periodo">${esc(ciclo.titulo)}${ciclo.inicio?` · ${dataBR(ciclo.inicio)} a ${dataBR(ciclo.fim)}`:""}</p>
      <p class="gerado">${opt.portal?"Atualizado em tempo real · visto em "+hoje:"Gerado em "+hoje+" pelo "+esc(PLAT)+" · "+esc(MARCA)}</p>
    </header>

    <section class="sec"><h2>O mês em números</h2>
      <div class="kpis">
        ${k("Posts no feed",posts.length,`${nApr} aprovados${plano}`)}
        ${k("Carrosséis",posts.filter(p=>p.formato==="Carrossel").length,"")}
        ${k("Estáticos",posts.filter(p=>p.formato==="Estático").length,"")}
        ${k("Reels",nReels,nRot?nRot+" roteiros entregues":"")}
        ${k("Sequências de Stories",nSto,"")}
        ${k("Pedidos",pedidos.length,pedidos.length?`${pedFeitos} concluídos${pedExtra?" · "+pedExtra+" extras":""}`:"")}
      </div>
      ${ciclo.relatorio_resumo?`<p class="texto">${esc(ciclo.relatorio_resumo)}</p>`:""}
    </section>`;

    if(GM&&GM.temNumeros(ciclo)){
      h+=`<section class="sec quebra sec-insta"><h2>Instagram</h2>
        <p class="intro">Números no início do mês e 30 dias depois.</p>
        ${GM.cicloHTML(ciclo)}
        ${ciclos.filter(GM.temNumeros).length>1?`<h3>Balanço mês a mês</h3>${GM.balancoHTML(ciclos)}`:""}
      </section>`;
    }
    if(D.verba&&GA&&GA.verbaHTML){
      h+=`<section class="sec quebra sec-verba"><h2>Verba e campanhas</h2>
        <p class="intro">Quanto foi colocado para os anúncios, quanto já foi usado, o saldo e a situação de cada campanha.</p>
        ${GA.verbaHTML(D.verba,{relatorio:true})}
      </section>`;
    }
    if(anuncios.length&&GA){
      h+=`<section class="sec quebra"><h2>Anúncios</h2>
        <p class="intro">Investimento e resultados das campanhas no Meta Ads.</p>
        ${GA.painelHTML(anuncios,{semDias:true})}
      </section>`;
    }
    if(posts.length){
      h+=`<section class="sec quebra"><h2>Conteúdos do mês</h2>
        <div class="grade">${posts.map(p=>{const img=(p.slides||[]).find(u=>!ehVideo(u));
          return `<div class="peca"><div class="thumb">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:`<span>${esc(p.formato)}</span>`}</div>
            <span class="n">${p.dia!=null?"POST "+n2(p.dia):""}</span><span class="t">${esc(p.titulo)}</span>
            <span class="m">${esc(p.formato)}${p.data?" · "+dataBR(p.data):""}${aprovado(p)?" · aprovado":""}</span></div>`}).join("")}</div>
      </section>`;
    }
    if(pedidos.length){
      h+=`<section class="sec"><h2>Pedidos do mês</h2>
        <div class="table-scroll"><table class="bal ads"><thead><tr><th scope="col">Pedido</th><th scope="col">Tipo</th><th scope="col">Data</th><th scope="col">Status</th><th scope="col">Plano</th></tr></thead>
        <tbody>${pedidos.map(x=>`<tr><th scope="row">${esc(x.titulo)}</th><td>${esc(x.tipo)}</td><td>${dataBR(x.criado_em)}</td><td>${ST[x.status]||""}</td><td>${x.extra?"Extra":"Incluído"}</td></tr>`).join("")}</tbody></table></div>
      </section>`;
    }
    if(ciclo.relatorio_proximos){
      h+=`<section class="sec"><h2>Próximos passos</h2><p class="texto">${esc(ciclo.relatorio_proximos)}</p></section>`;
    }
    h+=`<footer class="rodape"><span>${esc(MARCA)} · Relatório mensal de ${esc(cliente.nome)}</span><span>${esc(ciclo.titulo)}</span></footer>`;
    return h;
  }

  /* converte a resposta de portal_relatorio no formato acima */
  function doPortal(r){
    const dec={};(r.posts||[]).forEach(p=>{if(p.decisao)dec[p.id]=p.decisao});
    return {ciclo:r.ciclo,cliente:r.cliente,posts:r.posts||[],dec,nRoteiros:r.n_roteiros||0,nStories:r.n_stories||0,
            pedidos:r.pedidos||[],anuncios:r.anuncios||[],ciclos:r.ciclos||[]};
  }

  window.GlaraRelatorio={html,doPortal};
})();
