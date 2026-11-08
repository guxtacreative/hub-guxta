/* Hub de Marketing · Anéis de progresso no estilo do Apple Card.
   progresso(): um arco grosso com degradê, bolinha no fim e trilho cinza.
   segmentos(): rosca em partes, com pontas arredondadas e espaço entre elas. */
(function(){
  // escala do Apple Card: vermelho → laranja → amarelo → verde
  const ESCALA=[[0,[255,59,48]],[.45,[255,149,0]],[.72,[255,204,0]],[1,[52,199,89]]];
  function corEscala(t){t=Math.max(0,Math.min(1,t));
    for(let i=1;i<ESCALA.length;i++){if(t<=ESCALA[i][0]){const [a,ca]=ESCALA[i-1],[b,cb]=ESCALA[i],k=(t-a)/((b-a)||1);
      return `rgb(${ca.map((v,j)=>Math.round(v+(cb[j]-v)*k)).join(",")})`}}
    return "rgb(52,199,89)"}
  const CX=70;
  function pt(r,f){const a=(f*360-90)*Math.PI/180;return [CX+r*Math.cos(a),CX+r*Math.sin(a)]}
  function arco(r,f0,f1){const [x0,y0]=pt(r,f0),[x1,y1]=pt(r,f1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${f1-f0>.5?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* o = {pct (0 a 1), cor:"auto" | "var" (usa --anel-a → --anel-b) | "#hex", centro, sub, rotulo, w} */
  function progresso(o){
    const pct=Math.max(0,Math.min(1,Number(o.pct)||0)), w=o.w||14, r=CX-w/2-6, auto=(o.cor||"auto")==="auto", fixa=o.cor&&o.cor!=="auto"&&o.cor!=="var"?o.cor:null;
    const t0=pct>=1?.8:Math.max(0,pct-.45);
    const corEm=k=>auto?corEscala(t0+(pct-t0)*k):fixa?fixa:`color-mix(in srgb,var(--anel-b,var(--accent)) ${Math.round(k*100)}%,var(--anel-a,var(--accent)))`;
    let arcoSvg="";
    if(pct>0){
      const n=Math.max(2,Math.ceil(pct*90)), passo=pct/n;
      arcoSvg+=`<circle cx="${pt(r,0)[0].toFixed(2)}" cy="${pt(r,0)[1].toFixed(2)}" r="${w/2}" style="fill:${corEm(0)}"/>`;
      for(let i=0;i<n;i++){const f0=i*passo,f1=Math.min(pct,(i+1)*passo+(i<n-1?.004:0));
        arcoSvg+=`<path d="${arco(r,f0,f1)}" fill="none" stroke-width="${w}" style="stroke:${corEm((i+.5)/n)}"/>`}
      const [kx,ky]=pt(r,pct), fim=corEm(1);
      arcoSvg+=`<circle class="anel-knob" cx="${kx.toFixed(2)}" cy="${ky.toFixed(2)}" r="${w/2+2.5}" style="fill:${fim}"/>`;
      if(pct>=1)arcoSvg+=`<path d="M${(kx-3.6).toFixed(2)} ${ky.toFixed(2)}l2.4 2.4l4.8-5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const inicio=pct<1?`<circle class="anel-ponto" cx="${pt(r,0)[0].toFixed(2)}" cy="${pt(r,0)[1].toFixed(2)}" r="3"/>`:"";
    const subCor=auto||fixa?` style="fill:${corEm(1)}"`:"";
    return `<svg class="anel-apple" viewBox="0 0 140 140"${o.rotulo?` role="img" aria-label="${esc(o.rotulo)}"`:` aria-hidden="true"`}>
      <circle cx="${CX}" cy="${CX}" r="${r}" fill="none" stroke-width="${w}" class="anel-trilho"/>${inicio}
      <g class="anel-arco">${arcoSvg}</g>
      ${o.centro!=null?`<text x="70" y="${o.sub?72:78}" text-anchor="middle" class="ini-rosca-n">${esc(o.centro)}</text>`:""}
      ${o.sub?`<text x="70" y="92" text-anchor="middle" class="anel-sub"${pct>0?subCor:""}>${esc(o.sub)}</text>`:""}</svg>`}

  /* seg = [[nome, valor, cor], ...]; o = {centro, sub, rotulo, w} */
  function segmentos(seg,o){
    o=o||{};const w=o.w||14, r=CX-w/2-6, C=2*Math.PI*r, tot=seg.reduce((a,x)=>a+(Number(x[1])||0),0), vivos=seg.filter(x=>Number(x[1])>0);
    const folga=vivos.length>1?(w+5)/C:0;let acc=0, partes="";
    for(const x of vivos){const f=x[1]/tot, f0=acc+folga/2, f1=acc+f-folga/2;acc+=f;
      if(vivos.length===1){partes+=`<circle cx="${CX}" cy="${CX}" r="${r}" fill="none" stroke-width="${w}" style="stroke:${x[2]}"><title>${esc(x[0])}: ${x[1]}</title></circle>`;continue}
      if(f1-f0<=.002){const [px,py]=pt(r,(f0+f1)/2);partes+=`<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${w/2}" style="fill:${x[2]}"><title>${esc(x[0])}: ${x[1]}</title></circle>`;continue}
      partes+=`<path d="${arco(r,f0,f1)}" fill="none" stroke-width="${w}" stroke-linecap="round" style="stroke:${x[2]}"><title>${esc(x[0])}: ${x[1]}</title></path>`}
    return `<svg class="anel-apple" viewBox="0 0 140 140" role="img" aria-label="${esc(o.rotulo||"")}">
      <circle cx="${CX}" cy="${CX}" r="${r}" fill="none" stroke-width="${w}" class="anel-trilho"/>
      <g class="anel-arco">${partes}</g>
      ${o.centro!=null?`<text x="70" y="72" text-anchor="middle" class="ini-rosca-n">${esc(o.centro)}</text>`:""}
      ${o.sub?`<text x="70" y="92" text-anchor="middle" class="anel-sub">${esc(o.sub)}</text>`:""}</svg>`}

  // barra reta no mesmo estilo: degradê pela porcentagem (0 a 1)
  function barraCores(pct){pct=Math.max(0,Math.min(1,Number(pct)||0));const t0=pct>=1?.8:Math.max(0,pct-.45);
    return `--c0:${corEscala(t0)};--c1:${corEscala(pct)}`}
  // pinta sozinho toda barra simples (.bar > i com largura em %) com o mesmo degradê
  function pintarBarras(root){(root||document).querySelectorAll(".bar:not(.bar-apple)>i").forEach(i=>{
    const w=parseFloat(i.style.width);if(isNaN(w))return;
    i.parentElement.classList.add("bar-apple","bar-auto");i.style.setProperty("--c0",corEscala(w>=100?.8:Math.max(0,w/100-.45)));i.style.setProperty("--c1",corEscala(w/100))})}
  let pend=false;
  function agendar(){if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;pintarBarras()})}
  if(typeof MutationObserver!=="undefined"&&typeof document!=="undefined"){
    const iniciar=()=>{pintarBarras();new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true})};
    if(document.body)iniciar();else document.addEventListener("DOMContentLoaded",iniciar)}
  window.GlaraAnel={progresso,segmentos,corEscala,barraCores,pintarBarras};
})();
