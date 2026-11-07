/* Glara · números do Instagram: definição das métricas e balanço mês a mês.
   Usado pelo painel (admin.html) e pelo portal do cliente (index.html). */
(function(){
  const METRICAS=[
    {k:"seguidores",   t:"Seguidores",              d:"Total no perfil"},
    {k:"publicacoes",  t:"Publicações",              d:"Total no perfil"},
    {k:"alcance",      t:"Contas alcançadas",        d:"Últimos 30 dias"},
    {k:"visualizacoes",t:"Visualizações",            d:"Últimos 30 dias"},
    {k:"engajadas",    t:"Contas com engajamento",   d:"Últimos 30 dias"},
    {k:"interacoes",   t:"Interações",               d:"Curtidas, comentários, salvamentos e compartilhamentos, 30 dias"},
    {k:"visitas",      t:"Visitas ao perfil",        d:"Últimos 30 dias"},
    {k:"cliques",      t:"Toques no link e WhatsApp",d:"Últimos 30 dias"},
    {k:"contatos",     t:"Contatos recebidos",       d:"Directs e mensagens de possíveis clientes, 30 dias"}
  ];
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const num=v=>v==null||v===""||isNaN(v)?null:Number(v);
  const fmt=v=>num(v)==null?"–":Number(v).toLocaleString("pt-BR");
  const parse=s=>{const d=String(s??"").replace(/\D/g,"");return d===""?null:parseInt(d,10)};
  function variacao(a,b){
    a=num(a);b=num(b);if(a==null||b==null)return{txt:"",cls:""};
    const dif=b-a, pct=a>0?(dif/a*100):null;
    const sinal=dif>0?"+":dif<0?"−":"";
    const txt=sinal+Math.abs(dif).toLocaleString("pt-BR")+(pct!=null?` (${sinal}${Math.abs(pct).toLocaleString("pt-BR",{maximumFractionDigits:1})}%)`:"");
    const curto=pct!=null?sinal+Math.abs(pct).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%":sinal+Math.abs(dif).toLocaleString("pt-BR");
    return{txt,curto,cls:dif>0?"up":dif<0?"down":"flat"};
  }
  const mesCurto=c=>{if(c.inicio){const [y,m]=c.inicio.split("-");return ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][m-1]+"/"+y.slice(2)}return c.titulo};
  const M=c=>(c&&c.metricas)||{};
  const temNumeros=c=>{const m=M(c);return METRICAS.some(x=>num((m.fim||{})[x.k])!=null||num((m.inicio||{})[x.k])!=null)};

  /* Início × após 30 dias de um mês */
  function cicloHTML(c){
    const m=M(c), i=m.inicio||{}, f=m.fim||{};
    if(!temNumeros(c))return `<div class="empty">Os números deste mês ainda não foram preenchidos.</div>`;
    return `<div class="kpis">${METRICAS.map(x=>{const v=variacao(i[x.k],f[x.k]);
      return `<div class="kpi"><span class="kpi-t">${esc(x.t)}</span>
        <span class="kpi-v">${fmt(num(f[x.k])??i[x.k])}</span>
        <span class="kpi-s">Início: ${fmt(i[x.k])}${num(f[x.k])==null?" · após 30 dias: a preencher":""}</span>
        ${v.txt?`<span class="var ${v.cls}">${v.txt}</span>`:""}</div>`}).join("")}</div>
      ${m.obs?`<div class="tip"><b>Leitura do mês:</b> ${esc(m.obs)}</div>`:""}`;
  }

  /* Balanço mês a mês: ciclos em ordem cronológica */
  function balancoHTML(ciclos){
    const cs=ciclos.filter(temNumeros).slice().sort((a,b)=>String(a.inicio||"").localeCompare(String(b.inicio||"")));
    if(!cs.length)return `<div class="empty">Preencha os números de pelo menos um mês para ver o balanço.</div>`;
    const ult=cs.slice(-12);
    const valor=(c,k)=>{const m=M(c);return num((m.fim||{})[k])};
    const base=(c,k,idx)=>{const prev=ult[idx-1];return prev&&valor(prev,k)!=null?valor(prev,k):num((M(c).inicio||{})[k])};
    // gráfico: novos seguidores por mês
    const ganhos=ult.map(c=>{const m=M(c);const a=num((m.inicio||{}).seguidores),b=num((m.fim||{}).seguidores);return a!=null&&b!=null?b-a:null});
    const max=Math.max(1,...ganhos.map(g=>Math.abs(g||0)));
    const W=Math.max(320,ult.length*72),H=170,bw=34,y0=130,esc2=110/max;
    const barras=ult.map((c,ix)=>{const g=ganhos[ix],x=ix*72+19;if(g==null)return `<text x="${x+bw/2}" y="${y0-6}" class="ch-l">–</text><text x="${x+bw/2}" y="${y0+20}" class="ch-m">${esc(mesCurto(c))}</text>`;
      const h=Math.max(2,Math.abs(g)*esc2),y=g>=0?y0-h:y0;const ultimo=ix===ult.length-1;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" class="${g<0?"ch-bar neg":ultimo?"ch-bar-r":"ch-bar"}"/>
        <text x="${x+bw/2}" y="${g>=0?y-6:y+h+14}" class="ch-l">${g>0?"+":""}${g.toLocaleString("pt-BR")}</text>
        <text x="${x+bw/2}" y="${y0+20}" class="ch-m">${esc(mesCurto(c))}</text>`}).join("");
    const grafico=`<figure class="chart"><figcaption class="label">Novos seguidores por mês</figcaption>
      <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Novos seguidores por mês">
      <line x1="0" x2="${W}" y1="${y0}" y2="${y0}" class="ch-axis"/>${barras}</svg></div></figure>`;
    const tabela=`<div class="table-scroll"><table class="bal">
      <thead><tr><th scope="col">Métrica</th>${ult.map((c,ix)=>[c,ix]).reverse().map(([c])=>`<th scope="col">${esc(mesCurto(c))}</th>`).join("")}</tr></thead>
      <tbody>${METRICAS.map(x=>`<tr><th scope="row">${esc(x.t)}</th>${ult.map((c,ix)=>[c,ix]).reverse().map(([c,ix])=>{const v=valor(c,x.k),vr=variacao(base(c,x.k,ix),v);
        return `<td><span class="tv">${fmt(v)}</span>${vr.txt?`<span class="var ${vr.cls}">${vr.curto}</span>`:""}</td>`}).join("")}</tr>`).join("")}</tbody>
    </table></div>
    <p class="note">O mês mais recente vem primeiro. Cada mês mostra o número após 30 dias. A variação compara com o mês anterior (no primeiro mês, com o início).</p>`;
    return grafico+tabela;
  }

  window.GlaraMetricas={METRICAS,fmt,parse,variacao,cicloHTML,balancoHTML,temNumeros,mesCurto};
})();
