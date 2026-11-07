/* =====================================================================
   Hub de Marketing · Pagamentos no portal do cliente (GlaraPagamentos)
   - GlaraQR.svg(texto): QR Code em SVG (byte mode, correção M), sem
     biblioteca externa
   - GlaraPix.brcode({...}): código "Pix copia e cola" (padrão do Banco
     Central) com chave, valor, recebedor e cidade
   - GlaraPagamentos.criar(): faixa fixa de vencimento + aba Pagamentos
   ===================================================================== */
(function(){
  /* ---------------- QR Code (algoritmo do padrão ISO 18004) ---------------- */
  const ECC_M=[-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28];
  const BLK_M=[-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49];
  const rawModules=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
  const dataCodewords=v=>Math.floor(rawModules(v)/8)-ECC_M[v]*BLK_M[v];
  const gfMul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z&0xFF};
  function rsDivisor(deg){const r=new Array(deg).fill(0);r[deg-1]=1;let root=1;
    for(let i=0;i<deg;i++){for(let j=0;j<r.length;j++){r[j]=gfMul(r[j],root);if(j+1<r.length)r[j]^=r[j+1]}root=gfMul(root,2)}return r}
  function rsRemainder(data,div){const r=div.map(()=>0);
    for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>r[i]^=gfMul(c,f))}return r}
  function utf8(s){return Array.from(new TextEncoder().encode(s))}

  function qrMatrix(texto){
    const bytes=utf8(texto);let ver=1;
    for(;ver<=40;ver++){const cc=ver<10?8:16;if(4+cc+bytes.length*8<=dataCodewords(ver)*8)break}
    if(ver>40)throw new Error("Texto grande demais para QR Code");
    const bits=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1)};
    put(4,4);put(bytes.length,ver<10?8:16);bytes.forEach(b=>put(b,8));
    const cap=dataCodewords(ver)*8;put(0,Math.min(4,cap-bits.length));while(bits.length%8)bits.push(0);
    for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)put(p,8);
    const data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(""),2));
    // blocos + correção de erro + intercalação
    const nb=BLK_M[ver], ecl=ECC_M[ver], raw=Math.floor(rawModules(ver)/8), nShort=nb-raw%nb, shortLen=Math.floor(raw/nb), div=rsDivisor(ecl), blocks=[];
    for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+shortLen-ecl+(i<nShort?0:1));k+=d.length;const e=rsRemainder(d,div);if(i<nShort)d.push(0);blocks.push(d.concat(e))}
    const cw=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==shortLen-ecl||j>=nShort)cw.push(b[i])});
    // matriz
    const n=ver*4+17, M=[...Array(n)].map(()=>new Array(n).fill(false)), F=[...Array(n)].map(()=>new Array(n).fill(false));
    const fset=(x,y,v)=>{M[y][x]=v;F[y][x]=true};
    for(let i=0;i<n;i++){fset(6,i,i%2===0);fset(i,6,i%2===0)}
    [[3,3],[n-4,3],[3,n-4]].forEach(([cx,cy])=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<n&&y>=0&&y<n)fset(x,y,d!==2&&d!==4)}});
    if(ver>1){const na=Math.floor(ver/7)+2, step=ver===32?26:Math.ceil((ver*4+4)/(na*2-2))*2, pos=[6];for(let p=n-7;pos.length<na;p-=step)pos.splice(1,0,p);
      pos.forEach((a,i)=>pos.forEach((b,j)=>{if((i===0&&j===0)||(i===0&&j===na-1)||(i===na-1&&j===0))return;
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)fset(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}))}
    const formato=mask=>{const d=(0<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((d<<10)|r)^0x5412, g=i=>((b>>>i)&1)===1;
      for(let i=0;i<=5;i++)fset(8,i,g(i));fset(8,7,g(6));fset(8,8,g(7));fset(7,8,g(8));for(let i=9;i<15;i++)fset(14-i,8,g(i));
      for(let i=0;i<8;i++)fset(n-1-i,8,g(i));for(let i=8;i<15;i++)fset(8,n-15+i,g(i));fset(8,n-8,true)};
    formato(0);
    if(ver>=7){let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(ver<<12)|r;
      for(let i=0;i<18;i++){const v=((b>>>i)&1)===1,a=n-11+i%3,c=Math.floor(i/3);fset(a,c,v);fset(c,a,v)}}
    let i=0;for(let right=n-1;right>=1;right-=2){if(right===6)right=5;
      for(let vert=0;vert<n;vert++)for(let j=0;j<2;j++){const x=right-j, up=((right+1)&2)===0, y=up?n-1-vert:vert;
        if(!F[y][x]&&i<cw.length*8){M[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)===1;i++}}}
    const MASK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,
      (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const aplicar=k=>{for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!F[y][x]&&MASK[k](x,y))M[y][x]=!M[y][x]};
    const penal=()=>{let p=0,esc=0;
      for(let a=0;a<2;a++)for(let y=0;y<n;y++){let run=1;for(let x=1;x<=n;x++){const c=x<n&&(a?M[x][y]:M[y][x])===(a?M[x-1][y]:M[y][x-1]);if(c)run++;else{if(run>=5)p+=run-2;run=1}}}
      for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const c=M[y][x];if(c===M[y][x+1]&&c===M[y+1][x]&&c===M[y+1][x+1])p+=3}
      for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(M[y][x])esc++;
      return p+Math.floor(Math.abs(esc*20-n*n*10)/(n*n))*10};
    let melhor=0,menor=Infinity;
    for(let k=0;k<8;k++){aplicar(k);formato(k);const p=penal();if(p<menor){menor=p;melhor=k}aplicar(k)}
    aplicar(melhor);formato(melhor);
    return M;
  }
  function svg(texto,{borda=4,titulo="QR Code"}={}){
    const M=qrMatrix(texto), n=M.length, t=n+borda*2;let d="";
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(M[y][x])d+=`M${x+borda} ${y+borda}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="${titulo}"><rect width="${t}" height="${t}" fill="#FFFFFF"/><path d="${d}" fill="#000000"/></svg>`;
  }
  window.GlaraQR={svg,matriz:qrMatrix};

  /* ---------------- Pix copia e cola (BR Code) ---------------- */
  const semAcento=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"");
  const tlv=(id,v)=>id+String(v.length).padStart(2,"0")+v;
  function crc16(s){let c=0xFFFF;for(const b of utf8(s)){c^=b<<8;for(let i=0;i<8;i++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c.toString(16).toUpperCase().padStart(4,"0")}
  function chavePix(chave,tipo){let k=String(chave||"").trim();if(!k)return "";const dig=k.replace(/\D/g,"");
    tipo=String(tipo||"").toLowerCase();
    if(!tipo){if(k.includes("@"))tipo="email";else if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k))tipo="aleatoria";
      else if(k.startsWith("+"))tipo="telefone";else if(dig.length===14)tipo="cnpj";else if(dig.length===11)tipo="cpf";else tipo="aleatoria"}
    if(tipo==="cpf"||tipo==="cnpj")return dig;
    if(tipo==="telefone")return "+"+(dig.startsWith("55")&&dig.length>=12?dig:"55"+dig);
    if(tipo==="email")return k.toLowerCase();
    return k.toLowerCase()}
  function brcode({chave,tipo,nome,cidade,valor,txid}){
    const k=chavePix(chave,tipo);if(!k)return "";
    const nm=semAcento(nome||"RECEBEDOR").toUpperCase().replace(/[^A-Z0-9 ]/g,"").trim().slice(0,25)||"RECEBEDOR";
    const cd=semAcento(cidade||"SAO PAULO").toUpperCase().replace(/[^A-Z0-9 ]/g,"").trim().slice(0,15)||"SAO PAULO";
    const tx=(String(txid||"").replace(/[^A-Za-z0-9]/g,"").slice(0,25))||"***";
    let p=tlv("00","01")+tlv("26",tlv("00","br.gov.bcb.pix")+tlv("01",k))+tlv("52","0000")+tlv("53","986")
      +(Number(valor)>0?tlv("54",Number(valor).toFixed(2)):"")+tlv("58","BR")+tlv("59",nm)+tlv("60",cd)+tlv("62",tlv("05",tx))+"6304";
    return p+crc16(p)}
  window.GlaraPix={brcode,crc16,chavePix};

  /* ---------------- Portal e página pública: faixa fixa + cobranças ---------------- */
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const brl=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const hojeISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const dm=iso=>{const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m};
  const dmy=iso=>{const [y,m,d]=String(iso).slice(0,10).split("-");return d+"/"+m+"/"+y};
  const dias=iso=>Math.round((new Date(String(iso).slice(0,10)+"T12:00")-new Date(hojeISO()+"T12:00"))/864e5);
  const quando=iso=>{try{return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}catch(e){return""}};
  const pct=v=>(Number(v)||0).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
  const TIPO_CHAVE={cpf:"CPF",cnpj:"CNPJ",email:"e-mail",telefone:"telefone",aleatoria:"chave aleatória"};
  const ic=p=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={pix:ic('<path d="M12 2 4.5 9.5a3.5 3.5 0 0 0 0 5L12 22l7.5-7.5a3.5 3.5 0 0 0 0-5Z"/><path d="m8.5 12 3.5 3.5 3.5-3.5L12 8.5Z"/>'),
    boleto:ic('<path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14"/>'),cartao:ic('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    ok:ic('<path d="M20 6 9 17l-5-5"/>'),copiar:ic('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    alerta:ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>'),cal:ic('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>')};
  const total=it=>it.atualizado?Number(it.atualizado.total):Number(it.valor);

  function situacao(it){const d=dias(it.data);
    if(it.status==="pago")return {cls:"ok",txt:"Pago"+(it.pago_via?" · "+it.pago_via:"")};
    if(it.cliente_pagou_em)return {cls:"aviso",txt:"Você avisou que pagou em "+quando(it.cliente_pagou_em)};
    if(d<0)return {cls:"atraso",txt:`Venceu em ${dm(it.data)} · há ${-d} dia${d===-1?"":"s"}`};
    if(d===0)return {cls:"hoje",txt:"Vence hoje"};
    return {cls:d<=3?"perto":"futuro",txt:`Vence em ${d} dia${d===1?"":"s"} · ${dm(it.data)}`}}

  /* o.fonte: "portal" (aba Pagamentos) ou "publico" (pagar.html?t=) */
  function criar(o){
    const {sb,banner,tab,panel}=o, publico=o.fonte==="publico";let D=null, aberto=null, pagando=null, escolha={};
    const toast=o.toast||(m=>{}), logado=()=>!publico&&o.modo&&o.modo()==="login";
    const api={
      ver:()=>publico?sb.rpc("pagamento_ver",{p_token:o.token}):sb.rpc("portal_cobrancas",o.P()),
      cartao:(it,n)=>publico?sb.rpc("pagamento_cartao",{p_token:o.token,p_n:n}):sb.rpc("portal_cartao",{...o.P(),p_lanc:it.id,p_n:n}),
      avisar:(it,obs)=>publico?sb.rpc("pagamento_avisar",{p_token:o.token,p_obs:obs}):sb.rpc("portal_avisar_pago",{...o.P(),p_lanc:it.id,p_obs:obs}),
      boleto:it=>sb.rpc("portal_pedir_boleto",{...o.P(),p_lanc:it.id}),
      cupom:(it,c)=>publico?sb.rpc("pagamento_cupom",{p_token:o.token,p_codigo:c}):sb.rpc("portal_cupom",{...o.P(),p_lanc:it.id,p_codigo:c})};
    let cupomAberto=null, cupomErro={};
    const urgentes=()=>!D?[]:D.itens.filter(it=>it.status==="previsto"&&!it.cliente_pagou_em&&dias(it.data)<=(D.config.dias??5)).sort((a,b)=>a.data.localeCompare(b.data));
    const avisados=()=>!D?[]:D.itens.filter(it=>it.status==="previsto"&&it.cliente_pagou_em&&dias(it.data)<=(D.config.dias??5));

    async function carregar(){
      let r;try{r=await api.ver()}catch(e){r={error:e}}
      if(publico)D=r&&!r.error&&r.data&&r.data.item?{config:r.data.config,itens:[r.data.item],cliente:r.data.cliente}:null;
      else D=r&&!r.error&&r.data&&Array.isArray(r.data.itens)?r.data:null;
      render();if(o.carregou)o.carregou(D);
    }
    function renderBanner(){if(!banner)return;
      const u=urgentes(), av=avisados();
      if(!u.length&&!av.length){banner.hidden=true;banner.innerHTML="";return}
      const it=u[0]||av[0], s=situacao(it), mais=u.length>1?u.length-1:0;
      banner.hidden=false;banner.className="pg-faixa "+s.cls;
      banner.innerHTML=`<span class="pg-faixa-ico">${s.cls==="aviso"?I.ok:s.cls==="atraso"?I.alerta:I.cal}</span>
        <span class="pg-faixa-t"><b>${s.cls==="aviso"?"Pagamento em confirmação":esc(it.descricao)} · ${brl(total(it))}</b><small>${esc(s.txt)}${mais?` · e mais ${mais} em aberto`:""}${s.cls==="aviso"?" · vamos dar baixa em breve":""}</small></span>
        ${s.cls==="aviso"?"":`<button type="button" class="btn small primary pg-faixa-btn" data-pg="ir">Pagar agora</button>`}`;
    }
    function renderTab(){if(!tab)return;
      const tem=!!(D&&D.itens.length);tab.hidden=!tem;
      const b=tab.querySelector(".badge"),n=urgentes().length;if(b){b.hidden=!n;b.textContent=n}
      if(!tem&&tab.getAttribute("aria-selected")==="true"&&o.sair)o.sair();
    }
    function encargosHTML(it){const a=it.atualizado;if(!a||!(Number(a.total)>Number(it.valor)))return "";
      return `<p class="pg-encargos">${brl(it.valor)} + multa ${brl(a.multa)} + juros ${brl(a.juros)} <small>(${a.dias} dia${a.dias==1?"":"s"} de atraso)</small></p>`}
    function mpBtn(it,n,txt){const k=it.id+":"+n;return `<button type="button" class="btn pg-mp-btn" data-pg="mp" data-n="${n}" data-id="${it.id}" ${pagando===k?"disabled":""}>${pagando===k?"Abrindo o Mercado Pago…":txt}</button>`}
    function pixMpHTML(it,so){if(!D.config.mp_pix)return "";
      return `<div class="pg-mp-op"><p class="note">Clique para gerar o Pix de <b>${brl(total(it))}</b> pelo Mercado Pago. Pague com o QR Code ou o Pix copia e cola no app do seu banco: o pagamento é confirmado na hora, sem precisar avisar.</p>${mpBtn(it,-1,`${I.pix} Gerar Pix`)}</div>`}
    function pixHTML(it){const c=D.config;
      if(c.mp_pix)return `<div class="pg-meio pg-pix"><h4>${I.pix} Pix <span class="pg-tag">confirmação na hora</span></h4>${pixMpHTML(it,true)}</div>`;
      if(!c.pix)return "";
      const code=brcode({chave:c.pix,tipo:c.pix_tipo,nome:c.pix_nome,cidade:c.pix_cidade,valor:total(it),txid:it.id});let qr="";
      try{qr=svg(code,{titulo:"QR Code do Pix de "+brl(total(it))})}catch(e){}
      return `<div class="pg-meio pg-pix"><h4>${I.pix} Pix <span class="pg-tag">sem taxa</span></h4>
        <div class="pg-pix-g">${qr?`<div class="pg-qr">${qr}</div>`:""}
          <div class="pg-pix-t"><p class="note">Abra o app do banco, escolha <b>Pix › Ler QR Code</b> ou <b>Pix copia e cola</b>. O valor de <b>${brl(total(it))}</b> já vem preenchido.</p>
            <label class="label" for="pg-cc-${it.id}">Pix copia e cola</label>
            <div class="pg-copia"><input id="pg-cc-${it.id}" readonly value="${esc(code)}"><button type="button" class="btn small primary" data-pg="copiar" data-v="${esc(code)}" data-ok="Código Pix copiado">${I.copiar} Copiar</button></div>
            <p class="pg-chave">Chave ${esc(TIPO_CHAVE[String(c.pix_tipo||"").toLowerCase()]||"Pix")}: <b>${esc(c.pix)}</b> <button type="button" class="pg-link" data-pg="copiar" data-v="${esc(c.pix)}" data-ok="Chave Pix copiada">copiar chave</button><br><small>Recebedor: ${esc(c.pix_nome||c.empresa||"")}</small></p></div></div></div>`}
    function cartaoHTML(it){if(!it.cartao||!(it.parcelas||[]).length)return "";
      const ps=it.parcelas, n=escolha[it.id]||1, sel=ps.find(p=>p.n===n)||ps[0], semJ=ps.filter(p=>!p.juros).length;
      return `<div class="pg-meio pg-cartao"><h4>${I.cartao} Cartão de crédito</h4>
        <p class="note">${semJ>1?`Até ${semJ}x sem juros. `:""}${ps.length>semJ?`Em mais vezes, juros de ${pct(D.config.cartao_juros_mes)} ao mês. `:""}Escolha as parcelas e pague com segurança pelo Mercado Pago.</p>
        <div class="pg-parc" role="radiogroup" aria-label="Número de parcelas">${ps.map(p=>`<label class="pg-parc-op ${p.n===sel.n?"on":""}"><input type="radio" name="pg-n-${it.id}" value="${p.n}" data-pg-n="${it.id}" ${p.n===sel.n?"checked":""}>
          <b>${p.n}x</b><span>${brl(p.parcela)}</span><small>${p.juros?"total "+brl(p.total):p.n>1?"sem juros":"à vista"}</small></label>`).join("")}</div>
        ${mpBtn(it,sel.n,`Pagar ${sel.n}x de ${brl(sel.parcela)} no cartão`)}
        <small class="note">No Mercado Pago, confirme em <b>${sel.n}x</b>.</small></div>`}
    function boletoHTML(it){const c=D.config;
      if(it.boleto_linha||it.boleto)return `<div class="pg-meio pg-bol"><h4>${I.boleto} Boleto</h4>
        ${it.boleto_linha?`<label class="label" for="pg-bl-${it.id}">Código de barras (linha digitável)</label>
          <div class="pg-copia"><input id="pg-bl-${it.id}" readonly value="${esc(it.boleto_linha)}"><button type="button" class="btn small" data-pg="copiar" data-v="${esc(it.boleto_linha.replace(/\D/g,""))}" data-ok="Código do boleto copiado">${I.copiar} Copiar</button></div>`:""}
        ${it.boleto?(logado()?`<button type="button" class="btn small outline" data-pg="boleto" data-id="${it.id}">Baixar boleto em PDF</button>`
            :`<p class="note">O PDF do boleto abre no portal, para quem entra com e-mail e senha.${o.base&&!publico?` <a href="${esc(o.base())}">Entrar</a>`:""}</p>`):""}</div>`;
      if(c.mp_boleto)return `<div class="pg-meio pg-bol"><h4>${I.boleto} Boleto</h4>
        <p class="note">Gere o boleto agora pelo Mercado Pago, já com o valor de <b>${brl(total(it))}</b>. Você informa o CPF ou CNPJ e pode pagar em qualquer banco. A baixa aqui é automática (o boleto compensa em até 3 dias úteis).</p>
        ${mpBtn(it,0,`${I.boleto} Gerar boleto agora`)}</div>`;
      if(publico||!c.boleto_pedido)return "";
      return `<div class="pg-meio pg-bol"><h4>${I.boleto} Boleto</h4>${it.boleto_pedido_em
        ?`<p class="pg-pedido">${I.ok} Boleto pedido em ${esc(quando(it.boleto_pedido_em))}. Assim que ficar pronto, ele aparece aqui${logado()?" e chega no seu e-mail":""}.</p>`
        :`<p class="note">Prefere boleto? Peça aqui e a gente envia.</p><button type="button" class="btn small" data-pg="pedir" data-id="${it.id}">Pedir boleto</button>`}</div>`}
    function cupomHTML(it){
      if(it.cupom)return `<div class="pg-cupom ok"><span>🏷 Cupom <b>${esc(it.cupom)}</b>: − ${brl(it.desconto)} <small>(de ${brl(it.valor_bruto)})</small></span><button type="button" class="pg-link" data-pg="cupom-tira" data-id="${it.id}">tirar</button></div>`;
      if(!it.aceita_cupom)return "";
      if(cupomAberto!==it.id)return `<div class="pg-cupom"><button type="button" class="pg-link" data-pg="cupom-abre" data-id="${it.id}">Tem um cupom de desconto?</button></div>`;
      return `<form class="pg-cupom-f" data-cupom-f="${it.id}"><label class="label" for="pg-cp-${it.id}">Cupom de desconto</label>
        <div class="pg-copia"><input id="pg-cp-${it.id}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Digite o código" maxlength="40"><button type="submit" class="btn small primary">Aplicar</button></div>
        ${cupomErro[it.id]?`<p class="pg-cupom-erro" role="alert">${esc(cupomErro[it.id])}</p>`:""}</form>`}
    function cardHTML(it){const s=situacao(it);
      return `<article class="card pg-card ${s.cls}" id="pg-${it.id}">
        <header class="pg-head"><div><span class="pg-desc">${esc(it.descricao)}</span><b class="pg-valor">${brl(total(it))}</b>${encargosHTML(it)}</div>
          <span class="pg-st ${s.cls}">${esc(s.txt)}</span></header>
        ${cupomHTML(it)}
        ${it.cliente_pagou_em?`<p class="pg-avisou">${I.ok} Recebemos o seu aviso. Assim que o pagamento cair, damos baixa por aqui.</p>`:""}
        <div class="pg-formas">${pixHTML(it)}${cartaoHTML(it)}${boletoHTML(it)}</div>
        ${it.cliente_pagou_em||D.config.mp_pix?"":aberto===it.id?`<div class="pg-pago-form"><label class="label" for="pg-obs-${it.id}">Quer deixar um recado? (opcional)</label>
            <input type="text" id="pg-obs-${it.id}" maxlength="300" placeholder="Ex.: Paguei pelo Pix hoje às 10h">
            <div class="actions"><button type="button" class="btn small primary" data-pg="pago-ok" data-id="${it.id}">Confirmar: já paguei</button><button type="button" class="btn small ghost" data-pg="pago-x">Cancelar</button></div></div>`
          :`<div class="pg-rodape"><button type="button" class="btn small ghost" data-pg="pago" data-id="${it.id}">${I.ok} Já paguei pelo Pix</button></div>`}
      </article>`}
    function pagoHTML(it){return `<article class="card pg-card ok"><header class="pg-head"><div><span class="pg-desc">${esc(it.descricao)}</span><b class="pg-valor">${brl(it.valor_pago||it.valor)}</b></div>
      <span class="pg-st ok">${I.ok} Pago${it.pago_via?" · "+esc(it.pago_via):""}</span></header><p class="note" style="margin:0">Obrigado! Este pagamento já está registrado.</p></article>`}
    function render(){
      renderBanner();renderTab();
      if(!D||!D.itens.length){panel.innerHTML=publico?`<div class="empty">Não encontramos esta cobrança. Confira o link ou fale com a gente.</div>`:"";return}
      const abertos=D.itens.filter(it=>it.status==="previsto").sort((a,b)=>a.data.localeCompare(b.data)), pagos=D.itens.filter(it=>it.status==="pago").sort((a,b)=>b.data.localeCompare(a.data));
      if(publico){panel.innerHTML=(D.config.msg&&abertos.length?`<div class="tip pg-msg">${esc(D.config.msg)}</div>`:"")+(abertos.length?abertos.map(cardHTML).join(""):pagos.map(pagoHTML).join(""));return}
      panel.innerHTML=`${D.config.msg?`<div class="tip pg-msg">${esc(D.config.msg)}</div>`:""}
        ${abertos.length?abertos.map(cardHTML).join(""):`<div class="empty">Tudo em dia por aqui. Obrigado!</div>`}
        ${pagos.length?`<section class="card pg-hist"><h3>Pagamentos anteriores</h3><ul>${pagos.map(it=>`<li><span><b>${esc(it.descricao)}</b><small>Venc. ${dmy(it.data)}${it.pago_via?" · "+esc(it.pago_via):""}</small></span><span class="pg-hist-v">${brl(it.valor_pago||it.valor)}</span><span class="pg-st ok">Pago</span></li>`).join("")}</ul></section>`:""}`;
    }
    async function copiar(txt,okMsg){try{await navigator.clipboard.writeText(txt)}catch(e){const ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand("copy")}catch(_){}ta.remove()}toast(okMsg||"Copiado")}

    async function clique(e){
      const b=e.target.closest("[data-pg]");if(!b)return;const a=b.dataset.pg, id=b.dataset.id, it=D&&D.itens.find(x=>x.id===id);
      if(a==="ir"){o.abrir&&o.abrir();return}
      if(a==="cupom-abre"){cupomAberto=id;render();const i=document.getElementById("pg-cp-"+id);i&&i.focus();return}
      if(a==="cupom-tira"){b.disabled=true;aplicarCupom(id,"");return}
      if(a==="copiar"){copiar(b.dataset.v,b.dataset.ok);const t=b.innerHTML;if(b.classList.contains("btn")){b.innerHTML=I.ok+" Copiado";setTimeout(()=>{b.innerHTML=t},1800)}return}
      if(a==="pago"){aberto=id;render();const inp=document.getElementById("pg-obs-"+id);inp&&inp.focus();return}
      if(a==="pago-x"){aberto=null;render();return}
      if(a==="pago-ok"&&it){b.disabled=true;const obs=(document.getElementById("pg-obs-"+id)||{}).value||"";
        const {error}=await api.avisar(it,obs.trim());
        if(error){b.disabled=false;toast("Não deu para avisar agora. Tente de novo.");return}
        it.cliente_pagou_em=new Date().toISOString();aberto=null;render();toast("Obrigado! Avisamos a equipe.");return}
      if(a==="pedir"&&it){b.disabled=true;const {error}=await api.boleto(it);
        if(error){b.disabled=false;toast("Não deu para pedir agora. Tente de novo.");return}
        it.boleto_pedido_em=new Date().toISOString();render();toast("Pedido enviado. Avisamos quando o boleto estiver pronto.");return}
      if(a==="boleto"&&it){const {data,error}=await sb.storage.from("documentos").createSignedUrl(it.boleto_caminho,600,{download:it.boleto_nome||"boleto.pdf"});
        if(error||!data){toast("Não deu para abrir o boleto. Entre de novo e tente outra vez.");return}
        const l=document.createElement("a");l.href=data.signedUrl;l.download=it.boleto_nome||"boleto.pdf";document.body.appendChild(l);l.click();l.remove();return}
      if(a==="mp"&&it){const n=+b.dataset.n;
        const janela=window.open("","_blank");pagando=id+":"+n;render();
        for(let t=0;t<10;t++){
          const {data,error}=await api.cartao(it,n);
          if(error||!data){break}
          if(data.status==="pronto"&&data.link){pagando=null;render();if(janela)janela.location.href=data.link;else location.href=data.link;return}
          if(data.status==="pago"){pagando=null;janela&&janela.close();toast("Esta cobrança já está paga.");carregar();return}
          if(data.status!=="pendente"&&data.status!=="ocupado")break;
          await new Promise(r=>setTimeout(r,1500))}
        pagando=null;render();janela&&janela.close();toast("O Mercado Pago não respondeu agora. Use o Pix ou tente de novo em instantes.");return}
    }
    const erroCupom=m=>/cupom_invalido/.test(m)?"Cupom não encontrado. Confira o código.":/cupom_vencido/.test(m)?"Este cupom venceu.":/cupom_esgotado/.test(m)?"Este cupom já foi usado o máximo de vezes.":
      /cupom_minimo:([\d.]+)/.test(m)?"Este cupom vale para cobranças a partir de "+brl(m.match(/cupom_minimo:([\d.]+)/)[1])+".":/cupom_onde/.test(m)?"Este cupom não vale para esta cobrança.":
      /cupom_sem_margem/.test(m)?"Este cupom não pode ser usado nesta cobrança.":/cupom_tentativas/.test(m)?"Muitas tentativas. Fale com a gente.":/cupom_pago/.test(m)?"Esta cobrança já está paga.":"Não deu para aplicar agora. Tente de novo.";
    async function aplicarCupom(id,codigo){const it=D&&D.itens.find(x=>x.id===id);if(!it)return;
      const {data,error}=await api.cupom(it,codigo);
      if(error){cupomErro[id]=erroCupom(error.message||"");render();const i=document.getElementById("pg-cp-"+id);if(i){i.value=codigo;i.focus()}return}
      cupomErro[id]="";cupomAberto=null;await carregar();toast(codigo?`Cupom aplicado: − ${brl(data.desconto)}`:"Cupom retirado.")}
    function trocar(e){const r=e.target.closest("[data-pg-n]");if(!r)return;escolha[r.dataset.pgN]=+r.value;render()}
    [banner,panel].forEach(x=>{if(x){x.addEventListener("click",clique);x.addEventListener("change",trocar)}});
    panel&&panel.addEventListener("submit",e=>{const f=e.target.closest("[data-cupom-f]");if(!f)return;e.preventDefault();const i=f.querySelector("input"),c=(i.value||"").trim();
      if(!c){cupomErro[f.dataset.cupomF]="Digite o código do cupom.";render();return}f.querySelector("button").disabled=true;aplicarCupom(f.dataset.cupomF,c)});
    return {carregar,render,get dados(){return D}};
  }
  window.GlaraPagamentos={criar,situacao};
})();
