/* Hub de Marketing · Agenda única (só o administrador vê).
   Junta num calendário os posts (data e agendamento), prazos de pedidos e tarefas,
   retornos do CRM, contas a receber e a pagar e os seus compromissos.
   Exporta o mês em .ics para o Google Agenda. */
(function(){
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const pad=n=>String(n).padStart(2,"0");
  const isoLocal=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
  const hojeISO=()=>isoLocal(new Date());
  const N=v=>Number(v)||0;
  const brl=v=>N(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const SEM=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const SEM_L=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
  const somaMes=(ym,d)=>{let [y,m]=ym.split("-").map(Number);m+=d;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return y+"-"+pad(m)};
  const hora=iso=>{if(!iso)return"";const d=new Date(iso);return pad(d.getHours())+":"+pad(d.getMinutes())};

  const TIPOS={
    compromisso:{nome:"Compromissos",cor:"#E30613",ico:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'},
    post:{nome:"Posts",cor:"#8B5CF6",ico:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/>'},
    pedido:{nome:"Pedidos",cor:"#F59E0B",ico:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'},
    tarefa:{nome:"Tarefas",cor:"#2563EB",ico:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'},
    crm:{nome:"Retornos do CRM",cor:"#16A34A",ico:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'},
    financeiro:{nome:"Financeiro",cor:"#0D9488",ico:'<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/>'}
  };
  const ic=(k,s=14)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TIPOS[k].ico}</svg>`;

  function criar(el,sb,ctx){
    let mes=hojeISO().slice(0,7), dia=hojeISO(), vista=window.matchMedia("(max-width:720px)").matches?"lista":"mes", ev=[], ed=null;
    let ligados=JSON.parse((()=>{try{return localStorage.getItem("guxta_agenda_tipos")}catch(_){return null}})()||"null")||Object.keys(TIPOS);
    const toast=ctx.toast||(m=>console.log(m)), falha=ctx.falha||((a,e)=>toast("Não deu para "+a+"."));
    const clientes=()=>(ctx.clientes&&ctx.clientes())||[];
    const nomeCli=id=>{const c=clientes().find(x=>x.id===id);return c?c.nome:""};

    async function carregar(){
      el.innerHTML=`<div class="empty">Montando a sua agenda…</div>`;
      const q=(t,cols)=>sb.from(t).select(cols||"*");
      const [po,ci,pe,ta,co,la,ag]=await Promise.all([q("posts","id,titulo,formato,data,agendado_para,publicacao,ciclo_id"),q("ciclos","id,cliente_id"),q("pedidos"),q("tarefas"),q("contatos"),q("lancamentos"),q("agenda_eventos")]);
      const falt=ag.error&&/agenda_eventos/.test(ag.error.message||"");
      const cicloCli={};(ci.data||[]).forEach(c=>cicloCli[c.id]=c.cliente_id);
      ev=[];
      (po.data||[]).forEach(p=>{const cli=nomeCli(cicloCli[p.ciclo_id]);
        if(p.agendado_para){ev.push({tipo:"post",data:isoLocal(new Date(p.agendado_para)),hora:hora(p.agendado_para),titulo:p.titulo||"Post",sub:[cli,p.formato,p.publicacao==="publicado"?"publicado":"agendado"].filter(Boolean).join(" · "),cliente_id:cicloCli[p.ciclo_id],ok:p.publicacao==="publicado",ref:p.id})}
        else if(p.data){ev.push({tipo:"post",data:String(p.data).slice(0,10),titulo:p.titulo||"Post",sub:[cli,p.formato,"no calendário"].filter(Boolean).join(" · "),cliente_id:cicloCli[p.ciclo_id],ref:p.id})}});
      (pe.data||[]).forEach(p=>{if(!p.prazo||p.status==="recusado")return;ev.push({tipo:"pedido",data:String(p.prazo).slice(0,10),titulo:(p.tipo?p.tipo+": ":"")+p.titulo,sub:[nomeCli(p.cliente_id),"prazo do pedido"].filter(Boolean).join(" · "),cliente_id:p.cliente_id,ok:p.status==="concluido",ref:p.id})});
      (ta.data||[]).forEach(t=>{if(!t.prazo||t.pedido_id)return;ev.push({tipo:"tarefa",data:String(t.prazo).slice(0,10),titulo:t.titulo,sub:[nomeCli(t.cliente_id)||t.cliente_nome,t.responsavel].filter(Boolean).join(" · "),ok:t.status==="feito",ref:t.id})});
      (co.data||[]).forEach(c=>{if(!c.proxima_data||c.etapa==="fechado"||c.etapa==="perdido")return;ev.push({tipo:"crm",data:String(c.proxima_data).slice(0,10),titulo:c.proxima_acao||"Retornar o contato",sub:[c.nome,c.empresa].filter(Boolean).join(" · "),ref:c.id})});
      (la.data||[]).forEach(l=>{if(l.status!=="previsto")return;ev.push({tipo:"financeiro",data:String(l.data).slice(0,10),titulo:(l.tipo==="entrada"?"Receber: ":"Pagar: ")+l.descricao,sub:[nomeCli(l.cliente_id)||l.cliente_nome,brl(l.valor)].filter(Boolean).join(" · "),entrada:l.tipo==="entrada",ref:l.id})});
      (ag.data||[]).forEach(a=>ev.push({tipo:"compromisso",data:String(a.data).slice(0,10),hora:a.hora?String(a.hora).slice(0,5):"",titulo:a.titulo,sub:[nomeCli(a.cliente_id),a.local].filter(Boolean).join(" · "),ref:a.id,raw:a}));
      ev.sort((a,b)=>a.data.localeCompare(b.data)||(a.hora||"99").localeCompare(b.hora||"99"));
      render(falt);
    }
    const vis=()=>ev.filter(e=>ligados.includes(e.tipo));
    const doDia=d=>vis().filter(e=>e.data===d);

    function cabecalho(falt){
      const h=hojeISO(), sem=new Date(h+"T12:00");sem.setDate(sem.getDate()+7);const ate=isoLocal(sem);
      const prox=vis().filter(e=>e.data>=h&&e.data<=ate&&!e.ok).length, hoje=vis().filter(e=>e.data===h&&!e.ok).length;
      return `<section class="card tk-head">
        <div class="head"><div><span class="eyebrow">Só você vê</span><h2>Agenda</h2></div>
          <div class="actions"><button class="btn primary" data-ag="novo">+ Compromisso</button><button class="btn outline" data-ag="ics" title="Baixar o mês para importar no Google Agenda">Exportar para o Google Agenda</button></div></div>
        ${falt?`<p class="note" style="margin:0">Para criar compromissos, rode o arquivo 13 do banco no Supabase. Posts, prazos e cobranças já aparecem.</p>`:""}
        <div class="ag-top">
          <div class="fin-mes"><button type="button" class="tk-x" data-ag="mes" data-d="-1" aria-label="Mês anterior">‹</button><b>${MESES[+mes.slice(5)-1].replace(/^./,c=>c.toUpperCase())} de ${mes.slice(0,4)}</b><button type="button" class="tk-x" data-ag="mes" data-d="1" aria-label="Próximo mês">›</button>
            ${mes!==h.slice(0,7)?`<button type="button" class="btn small ghost" data-ag="hoje">Hoje</button>`:""}</div>
          <span class="ag-resumo"><b>${hoje}</b> hoje · <b>${prox}</b> nos próximos 7 dias</span>
          <div class="seg" role="group" aria-label="Visualização"><button type="button" data-ag="vista" data-v="mes" aria-pressed="${vista==="mes"}">Mês</button><button type="button" data-ag="vista" data-v="lista" aria-pressed="${vista==="lista"}">Lista</button></div>
        </div>
        <div class="ag-tipos" role="group" aria-label="Mostrar na agenda">${Object.entries(TIPOS).map(([k,t])=>`<button type="button" class="chip ag-tipo" data-ag="tipo" data-t="${k}" aria-pressed="${ligados.includes(k)}" style="--ag:${t.cor}"><i aria-hidden="true"></i>${t.nome} <b>${ev.filter(e=>e.tipo===k&&e.data.slice(0,7)===mes).length}</b></button>`).join("")}</div>
      </section>`;
    }
    function itemHTML(e,compacto){const t=TIPOS[e.tipo];
      return `<button type="button" class="ag-ev${e.ok?" ok":""}${compacto?" mini":""}" style="--ag:${t.cor}" data-ag="abrir" data-tipo="${e.tipo}" data-ref="${esc(e.ref)}" title="${esc(e.titulo)}${e.sub?" · "+esc(e.sub):""}">
        ${compacto?`<i aria-hidden="true"></i><span>${e.hora?`<b>${esc(e.hora)}</b> `:""}${esc(e.titulo)}</span>`
          :`<span class="ag-ico" aria-hidden="true">${ic(e.tipo,15)}</span><span class="ag-txt"><b>${e.hora?esc(e.hora)+" · ":""}${esc(e.titulo)}</b>${e.sub?`<small>${esc(e.sub)}</small>`:""}</span><span class="ag-tag">${e.ok?"feito":esc(t.nome.replace(/s$/,"").replace("Retornos do CRM","Retorno"))}</span>`}</button>`}
    function mesHTML(){
      const [y,m]=mes.split("-").map(Number), ini=new Date(y,m-1,1), off=ini.getDay(), dias=new Date(y,m,0).getDate(), h=hojeISO();
      const cel=[];for(let i=0;i<off;i++)cel.push(`<div class="ag-cel fora" aria-hidden="true"></div>`);
      for(let d=1;d<=dias;d++){const iso=y+"-"+pad(m)+"-"+pad(d), ls=doDia(iso);
        cel.push(`<div class="ag-cel${iso===h?" hoje":""}${iso===dia?" sel":""}" role="gridcell"><button type="button" class="ag-dia" data-ag="dia" data-d="${iso}" aria-label="${d} de ${MESES[m-1]}, ${ls.length} item(ns)">${d}</button>
          <div class="ag-cel-ls">${ls.slice(0,3).map(e=>itemHTML(e,true)).join("")}${ls.length>3?`<button type="button" class="ag-mais" data-ag="dia" data-d="${iso}">+${ls.length-3}</button>`:""}</div></div>`)}
      while(cel.length%7)cel.push(`<div class="ag-cel fora" aria-hidden="true"></div>`);
      return `<section class="card ag-mes"><div class="ag-grade" role="grid">${SEM.map(s=>`<div class="ag-sem" role="columnheader">${s}</div>`).join("")}${cel.join("")}</div></section>${diaHTML()}`;
    }
    function diaHTML(){
      const ls=doDia(dia), d=new Date(dia+"T12:00");
      return `<section class="card ag-diabox"><div class="head"><h3>${dia===hojeISO()?"Hoje, ":""}${SEM_L[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}</h3><button type="button" class="btn small ghost" data-ag="novo" data-d="${dia}">+ Compromisso neste dia</button></div>
        <div class="ag-lista">${ls.map(e=>itemHTML(e)).join("")||`<p class="note">Nada marcado.</p>`}</div></section>`;
    }
    function listaHTML(){
      const ls=vis().filter(e=>e.data.slice(0,7)===mes), por={};ls.forEach(e=>(por[e.data]=por[e.data]||[]).push(e));
      const h=hojeISO();
      return `<section class="card ag-listabox">${Object.keys(por).sort().map(d=>{const dt=new Date(d+"T12:00");
        return `<div class="ag-grupo${d===h?" hoje":""}${d<h?" passado":""}"><h3><b>${dt.getDate()}</b><span>${SEM_L[dt.getDay()]}${d===h?" · hoje":""}</span></h3><div class="ag-lista">${por[d].map(e=>itemHTML(e)).join("")}</div></div>`}).join("")||`<p class="note">Nada neste mês com os filtros escolhidos.</p>`}</section>`;
    }
    function render(falt){el.innerHTML=cabecalho(falt)+(vista==="mes"?mesHTML():listaHTML())+`<dialog class="tk-dlg" id="ag-dlg"></dialog>`}

    function form(a){
      return `<form method="dialog" class="tk-form" id="ag-form">
        <div class="head"><h2>${a.id?"Editar compromisso":"Novo compromisso"}</h2><button type="button" class="tk-x" data-ag="fechar" aria-label="Fechar">✕</button></div>
        <div><label class="label" for="ag-tit">O quê</label><input type="text" id="ag-tit" maxlength="160" value="${esc(a.titulo||"")}" placeholder="Ex.: Reunião de pauta com a Dra. Franciane" required></div>
        <div class="grid2">
          <div><label class="label" for="ag-data">Dia</label><input type="date" id="ag-data" value="${esc(a.data||dia)}" required></div>
          <div><label class="label" for="ag-hora">Horário</label><input type="time" id="ag-hora" value="${esc(a.hora?String(a.hora).slice(0,5):"")}"></div>
          <div><label class="label" for="ag-dur">Duração</label><select id="ag-dur">${[[15,"15 min"],[30,"30 min"],[60,"1 hora"],[90,"1h30"],[120,"2 horas"],[240,"4 horas"],[480,"O dia todo"]].map(([v,t])=>`<option value="${v}" ${N(a.duracao_min||60)===v?"selected":""}>${t}</option>`).join("")}</select></div>
          <div><label class="label" for="ag-cli">Cliente</label><select id="ag-cli"><option value="">Nenhum</option>${clientes().map(c=>`<option value="${c.id}" ${a.cliente_id===c.id?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>
        </div>
        <div><label class="label" for="ag-local">Local ou link</label><input type="text" id="ag-local" value="${esc(a.local||"")}" placeholder="Ex.: Google Meet, escritório da cliente…"></div>
        <div><label class="label" for="ag-notas">Anotações</label><textarea id="ag-notas" style="min-height:70px">${esc(a.notas||"")}</textarea></div>
        <div class="actions"><button type="submit" class="btn primary">${a.id?"Salvar":"Criar"}</button><button type="button" class="btn ghost" data-ag="fechar">Cancelar</button>
          ${a.id?`<button type="button" class="btn danger small" data-ag="apagar" style="margin-left:auto">Apagar</button>`:""}</div></form>`}
    const dlg=()=>el.querySelector("#ag-dlg");
    function abrirDlg(h){const d=dlg();d.innerHTML=h;if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");setTimeout(()=>{const i=d.querySelector("#ag-tit");i&&i.focus()},30)}
    function fecharDlg(){const d=dlg();if(!d)return;if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open");ed=null}
    async function salvar(){
      const v=s=>el.querySelector(s).value, titulo=v("#ag-tit").trim();if(!titulo){toast("Escreva o compromisso.");return}
      const campos={titulo,data:v("#ag-data"),hora:v("#ag-hora")||null,duracao_min:N(v("#ag-dur"))||60,cliente_id:v("#ag-cli")||null,local:v("#ag-local").trim(),notas:v("#ag-notas").trim()};
      if(!campos.data){toast("Escolha o dia.");return}
      const q=ed&&ed.id?sb.from("agenda_eventos").update(campos).eq("id",ed.id):sb.from("agenda_eventos").insert(campos);
      const {error}=await q.select().single();if(error)return falha("salvar o compromisso",error);
      const novo=!(ed&&ed.id);dia=campos.data;mes=campos.data.slice(0,7);fecharDlg();toast(novo?"Compromisso criado.":"Compromisso salvo.");carregar();
    }
    // .ics: o Google Agenda importa em Configurações › Importar
    function ics(){
      const ls=vis().filter(e=>e.data.slice(0,7)===mes);if(!ls.length){toast("Nada para exportar neste mês.");return}
      const z=s=>String(s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/([,;])/g,"\\$1");
      const dt=(d,h)=>d.replace(/-/g,"")+(h?"T"+h.replace(":","")+"00":"");
      const prox=d=>{const x=new Date(d+"T12:00");x.setDate(x.getDate()+1);return isoLocal(x).replace(/-/g,"")};
      const fim=(d,h,min)=>{const x=new Date(d+"T"+h+":00");x.setMinutes(x.getMinutes()+(min||60));return isoLocal(x).replace(/-/g,"")+"T"+pad(x.getHours())+pad(x.getMinutes())+"00"};
      const agora=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
      const linhas=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GUXTA//Hub de Marketing//PT-BR","CALSCALE:GREGORIAN","X-WR-CALNAME:Hub de Marketing","X-WR-TIMEZONE:America/Sao_Paulo"];
      ls.forEach(e=>{const t=TIPOS[e.tipo];linhas.push("BEGIN:VEVENT","UID:"+e.tipo+"-"+e.ref+"-"+e.data+"@hub-guxta","DTSTAMP:"+agora,
        ...(e.hora?["DTSTART;TZID=America/Sao_Paulo:"+dt(e.data,e.hora),"DTEND;TZID=America/Sao_Paulo:"+fim(e.data,e.hora,e.raw&&e.raw.duracao_min)]:["DTSTART;VALUE=DATE:"+dt(e.data),"DTEND;VALUE=DATE:"+prox(e.data)]),
        "SUMMARY:"+z((e.tipo==="compromisso"?"":t.nome.replace(/s$/,"").replace("Retornos do CRM","Retorno")+": ")+e.titulo),...(e.sub?["DESCRIPTION:"+z(e.sub)]:[]),...(e.raw&&e.raw.local?["LOCATION:"+z(e.raw.local)]:[]),"END:VEVENT")});
      linhas.push("END:VCALENDAR");
      const blob=new Blob([linhas.join("\r\n")],{type:"text/calendar;charset=utf-8"}),a=document.createElement("a");
      a.href=URL.createObjectURL(blob);a.download=`agenda-${mes}.ics`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
      toast(`${ls.length} item(ns) exportado(s). No Google Agenda: Configurações › Importar e exportar › Importar.`);
    }

    el.addEventListener("click",async e=>{
      const b=e.target.closest("[data-ag]");if(!b)return;const a=b.dataset.ag;
      if(a==="mes"){mes=somaMes(mes,+b.dataset.d);dia=mes===hojeISO().slice(0,7)?hojeISO():mes+"-01";render();return}
      if(a==="hoje"){mes=hojeISO().slice(0,7);dia=hojeISO();render();return}
      if(a==="vista"){vista=b.dataset.v;render();return}
      if(a==="tipo"){const t=b.dataset.t;ligados=ligados.includes(t)?ligados.filter(x=>x!==t):[...ligados,t];try{localStorage.setItem("guxta_agenda_tipos",JSON.stringify(ligados))}catch(_){}render();return}
      if(a==="dia"){dia=b.dataset.d;render();const box=el.querySelector(".ag-diabox");if(box&&window.matchMedia("(max-width:900px)").matches)box.scrollIntoView({behavior:"smooth",block:"start"});return}
      if(a==="novo"){ed={data:b.dataset.d||dia};abrirDlg(form(ed));return}
      if(a==="fechar"){fecharDlg();return}
      if(a==="ics"){ics();return}
      if(a==="apagar"&&ed&&ed.id){if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Clique de novo para apagar";return}
        const {error}=await sb.from("agenda_eventos").delete().eq("id",ed.id);if(error)return falha("apagar",error);fecharDlg();toast("Compromisso apagado.");carregar();return}
      if(a==="abrir"){const t=b.dataset.tipo,ref=b.dataset.ref,x=ev.find(y=>y.tipo===t&&String(y.ref)===ref);if(!x)return;
        if(t==="compromisso"){ed={...x.raw};abrirDlg(form(ed));return}
        if((t==="post"||t==="pedido")&&x.cliente_id&&ctx.abrirCliente){ctx.abrirCliente(x.cliente_id,t==="post"?"posts":"pedidos");return}
        if(ctx.ir)ctx.ir(t==="tarefa"?"tarefas":t==="crm"?"crm":t==="financeiro"?"financeiro":"inicio");return}
    });
    el.addEventListener("submit",e=>{if(e.target.id==="ag-form"){e.preventDefault();salvar()}});
    carregar();
    return {recarregar:carregar};
  }
  window.GlaraAgenda={criar};
})();
