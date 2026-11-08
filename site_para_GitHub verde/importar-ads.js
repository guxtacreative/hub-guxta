/* Hub de Marketing · Importar relatório do Gerenciador de Anúncios da Meta (.csv ou .xlsx).
   Lê as colunas em português ou inglês e devolve um lançamento por dia e campanha. */
(function(){
  const sem=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\s+/g," ").trim();
  // nomes possíveis de cada coluna (sem acento, minúsculas); o primeiro que existir vale
  const COLS={
    dia:["dia","day","data"],
    ini:["inicio dos relatorios","reporting starts","inicio do relatorio"],
    fim:["encerramento dos relatorios","reporting ends","termino dos relatorios","fim dos relatorios"],
    campanha:["nome da campanha","campaign name","campanha","nome do conjunto de anuncios","ad set name","nome do anuncio","ad name"],
    investimento:["valor usado (brl)","amount spent (brl)","valor usado","amount spent","valor gasto (brl)","valor gasto","gasto"],
    impressoes:["impressoes","impressions"],
    alcance:["alcance","reach"],
    cliques:["cliques no link","link clicks","cliques (todos)","clicks (all)","cliques"],
    resultados:["resultados","results"],
    indicador:["indicador de resultados","result indicator","tipo de resultado","result type"]
  };
  function achar(cab){const h=cab.map(sem),m={};
    for(const k in COLS){for(const nome of COLS[k]){let i=h.indexOf(nome);if(i<0)i=h.findIndex(x=>x.startsWith(nome));if(i>=0){m[k]=i;break}}}
    return m}
  // número no formato do Brasil ou dos EUA
  function numero(v,inteiro){
    if(typeof v==="number")return isFinite(v)?v:0;
    let s=String(v??"").trim().replace(/[^\d,.-]/g,"");if(!s||s==="-")return 0;
    const pv=s.lastIndexOf(","),pp=s.lastIndexOf(".");
    if(pv>=0&&pp>=0){s=pv>pp?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"")}
    else if(pv>=0){s=/,\d{3}$/.test(s)&&inteiro?s.replace(/,/g,""):s.replace(/\./g,"").replace(",",".")}
    else if(pp>=0&&inteiro&&/\.\d{3}($|\.)/.test(s)){s=s.replace(/\./g,"")}
    const n=parseFloat(s);return isFinite(n)?n:0}
  // data: 2026-11-05, 05/11/2026, 11/05/2026 (en), número de série do Excel
  function data(v){
    if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
    if(typeof v==="number"&&v>30000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*864e5);return d.toISOString().slice(0,10)}
    const s=String(v??"").trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m){let [_,a,b,y]=m;y=y.length===2?"20"+y:y;let d=+a,mo=+b;if(mo>12&&d<=12){[d,mo]=[mo,d]}
      return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
    return ""}
  // traduz o indicador de resultado da Meta para um nome legível
  function tipo(ind){const s=sem(ind);if(!s)return "";
    if(/messaging_conversation_started|conversa|messaging/.test(s))return "Conversas iniciadas";
    if(/lead/.test(s))return "Leads (formulário)";
    if(/link_click|cliques no link/.test(s))return "Cliques no link";
    if(/profile_visit|visita/.test(s))return "Visitas ao perfil";
    if(/follow|like|seguidor/.test(s))return "Seguidores";
    if(/purchase|compra/.test(s))return "Compras";
    if(/landing_page_view/.test(s))return "Visualizações da página";
    if(/video_view|thruplay|visualiza/.test(s))return "Visualizações do vídeo";
    if(/reach|alcance/.test(s))return "Alcance";
    if(/post_engagement|engaj/.test(s))return "Engajamento";
    return String(ind).replace(/^actions:/,"").replace(/_/g," ")}
  // CSV com vírgula ou ponto e vírgula, aspas e quebras de linha dentro de aspas
  function csv(texto){texto=texto.replace(/^﻿/,"");
    const prim=texto.split(/\r?\n/)[0]||"", sep=(prim.match(/;/g)||[]).length>(prim.match(/,/g)||[]).length?";":(prim.match(/\t/g)||[]).length>(prim.match(/,/g)||[]).length?"\t":",";
    const linhas=[];let lin=[],campo="",q=false;
    for(let i=0;i<texto.length;i++){const ch=texto[i];
      if(q){if(ch==='"'){if(texto[i+1]==='"'){campo+='"';i++}else q=false}else campo+=ch}
      else if(ch==='"')q=true;else if(ch===sep){lin.push(campo);campo=""}
      else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&texto[i+1]==="\n")i++;lin.push(campo);campo="";if(lin.some(x=>x!==""))linhas.push(lin);lin=[]}
      else campo+=ch}
    lin.push(campo);if(lin.some(x=>x!==""))linhas.push(lin);return linhas}
  let xlsxCarregando=null;
  function carregarXLSX(){if(window.XLSX)return Promise.resolve();if(xlsxCarregando)return xlsxCarregando;
    xlsxCarregando=new Promise((ok,erro)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=ok;s.onerror=()=>{xlsxCarregando=null;erro(new Error("Não consegui carregar o leitor de Excel. Exporte em .csv."))};document.head.appendChild(s)});
    return xlsxCarregando}
  async function lerArquivo(arq){
    let linhas;
    if(/\.xlsx?$/i.test(arq.name)){await carregarXLSX();const wb=window.XLSX.read(await arq.arrayBuffer(),{type:"array",cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];linhas=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""})}
    else linhas=csv(await arq.text());
    // acha a linha do cabeçalho (às vezes vem um título antes)
    let hi=linhas.findIndex(l=>{const m=achar(l.map(String));return m.campanha!=null&&(m.investimento!=null||m.resultados!=null)});
    if(hi<0)throw new Error("Não achei as colunas de campanha e valor usado. Confira se é o relatório exportado do Gerenciador de Anúncios.");
    const m=achar(linhas[hi].map(String)), rows=[], avisos=new Set();
    if(m.dia==null&&m.ini==null)avisos.add("O arquivo não tem a coluna do dia. Use Detalhamento › Por tempo › Dia antes de exportar.");
    for(const l of linhas.slice(hi+1)){
      const camp=String(l[m.campanha]??"").trim();if(!camp||/^total|^resultados de/i.test(sem(camp)))continue;
      let dia=m.dia!=null?data(l[m.dia]):"";const ini=m.ini!=null?data(l[m.ini]):"", fim=m.fim!=null?data(l[m.fim]):"";
      if(!dia){if(ini&&fim&&ini!==fim){avisos.add("Algumas linhas somam vários dias juntos e vão entrar no último dia do período. Para ver dia a dia, exporte com Detalhamento › Por tempo › Dia.");dia=fim}else dia=ini||fim}
      if(!dia)continue;
      const r={data:dia,campanha:camp,investimento:Math.round(numero(m.investimento!=null?l[m.investimento]:0)*100)/100,
        impressoes:Math.round(numero(m.impressoes!=null?l[m.impressoes]:0,true)),alcance:Math.round(numero(m.alcance!=null?l[m.alcance]:0,true)),
        cliques:Math.round(numero(m.cliques!=null?l[m.cliques]:0,true)),resultados:Math.round(numero(m.resultados!=null?l[m.resultados]:0,true)),
        tipo_resultado:tipo(m.indicador!=null?l[m.indicador]:"")};
      if(!r.investimento&&!r.impressoes&&!r.resultados&&!r.cliques)continue; // campanha sem veiculação no dia
      rows.push(r)}
    // junta linhas repetidas do mesmo dia e campanha (ex.: relatório por conjunto de anúncios)
    const mapa=new Map();for(const r of rows){const k=r.data+"|"+r.campanha;const x=mapa.get(k);
      if(x){["investimento","impressoes","alcance","cliques","resultados"].forEach(f=>x[f]+=r[f]);x.investimento=Math.round(x.investimento*100)/100;if(!x.tipo_resultado)x.tipo_resultado=r.tipo_resultado}else mapa.set(k,{...r})}
    // situação, orçamento e datas das campanhas (se o relatório tiver essas colunas)
    const hx=linhas[hi].map(x=>sem(x)), col=nomes=>{for(const n of nomes){const i=hx.indexOf(n);if(i>=0)return i}return -1};
    const cSt=col(["veiculacao da campanha","campaign delivery","veiculacao","delivery"]),
          cOr=col(["orcamento da campanha","campaign budget","orcamento do conjunto de anuncios","ad set budget","orcamento","budget"]),
          cTo=col(["tipo de orcamento da campanha","campaign budget type","tipo de orcamento do conjunto de anuncios","ad set budget type","tipo de orcamento","budget type"]),
          cIn=col(["inicio","starts","data de inicio","start date"]), cFi=col(["termino","ends","data de termino","end date"]);
    const campanhas={};
    if(cSt>=0||cOr>=0||cIn>=0||cFi>=0){
      for(const l of linhas.slice(hi+1)){const camp=String(l[m.campanha]??"").trim();if(!camp||/^total|^resultados de/i.test(sem(camp)))continue;
        const o=campanhas[camp]||(campanhas[camp]={});
        if(cSt>=0){const v=sem(l[cSt]);const st=/inativ|inactive|nao esta|not deliver|not_deliver|desativ|off|pausad|paused/.test(v)?"pausada":/conclu|complet|encerr|ended/.test(v)?"encerrada":/agend|schedul/.test(v)?"agendada":/ativ|active|on\b/.test(v)?"ativa":"";if(st)o.status=st}
        if(cOr>=0){const tipoOr=cTo>=0?sem(l[cTo]):"";const val=numero(l[cOr]);if(val>0&&!/vital|lifetime|total/.test(tipoOr))o.orcamento_dia=Math.round(val*100)/100}
        if(cIn>=0){const d=data(l[cIn]);if(d)o.inicio=d}
        if(cFi>=0){const d=data(l[cFi]);if(d)o.fim=d}}
      Object.keys(campanhas).forEach(k=>{if(!Object.keys(campanhas[k]).length)delete campanhas[k]})}
    return {campanhas,rows:[...mapa.values()].sort((a,b)=>a.data.localeCompare(b.data)||a.campanha.localeCompare(b.campanha)),avisos:[...avisos]};
  }
  window.GlaraImportAds={lerArquivo,csv,numero,data,tipo};
})();
