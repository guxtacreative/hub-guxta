/* Meu perfil · foto e dados de quem está logado (cliente ou administrador).
   Uso: GlaraPerfil.iniciar(sb, session, { botao, av, nome, sidebar })
   Cada pessoa vê e edita só o próprio perfil (regras no arquivo perfis_usuarios.sql). */
(function(){
  const BUCKET="avatares";
  const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const iniciais=(t)=>{const p=String(t||"").trim().split(/\s+/).filter(Boolean);return ((p[0]||"?")[0]+(p.length>1?p[p.length-1][0]:"")).toUpperCase()};

  function redimensionar(file){return new Promise((res,rej)=>{
    const img=new Image(), u=URL.createObjectURL(file);
    img.onload=()=>{const s=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=256;
      c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,256,256);
      c.toBlob(b=>{URL.revokeObjectURL(u);b?res(b):rej(new Error("imagem"))},"image/jpeg",0.9)};
    img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("arquivo"))};
    img.src=u;});}

  async function urlFoto(sb,path){
    if(!path)return "";
    const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(path,3600);
    return error?"":data.signedUrl;
  }

  function pintarAvatar(el,nome,url){
    if(!el)return;
    el.innerHTML=url?`<img src="${esc(url)}" alt="Foto de ${esc(nome)}">`:esc(iniciais(nome));
  }

  function dialogo(){
    let d=document.getElementById("perfil-dlg");
    if(!d){d=document.createElement("dialog");d.id="perfil-dlg";d.className="tk-dlg";document.body.appendChild(d)}
    return d;
  }

  async function abrir(sb,session,opts){
    const uid=session.user.id, d=dialogo();
    const {data:p}=await sb.from("perfis").select("*").eq("user_id",uid).maybeSingle();
    const dados=p||{};
    let novaFoto=null, removerFoto=false;
    const fotoAtual=await urlFoto(sb,dados.avatar_path);
    d.innerHTML=`<form method="dialog" class="tk-form" id="perfil-form">
      <div class="head"><h2>Meu perfil</h2><button type="button" class="tk-x" data-fechar aria-label="Fechar">✕</button></div>
      <div class="perfil-foto">
        <span class="perfil-av" id="pf-av">${fotoAtual?`<img src="${esc(fotoAtual)}" alt="">`:esc(iniciais(dados.nome||session.user.email))}</span>
        <div><label class="btn small" for="pf-foto" style="cursor:pointer">Trocar foto</label>
          <input type="file" id="pf-foto" accept="image/*" hidden>
          ${dados.avatar_path?`<button type="button" class="btn small ghost" id="pf-rem">Remover foto</button>`:""}
          <p class="note" style="margin:6px 0 0">JPG ou PNG. A imagem é cortada em quadrado.</p></div>
      </div>
      <div class="grid2">
        <div><label class="label" for="pf-nome">Seu nome</label><input type="text" id="pf-nome" maxlength="80" value="${esc(dados.nome||"")}" placeholder="Como você quer ser chamado"></div>
        <div><label class="label" for="pf-cargo">Cargo ou função</label><input type="text" id="pf-cargo" maxlength="80" value="${esc(dados.cargo||"")}" placeholder="Ex.: Diretora de marketing"></div>
      </div>
      <div class="grid2">
        <div><label class="label" for="pf-tel">Telefone / WhatsApp</label><input type="tel" id="pf-tel" maxlength="30" value="${esc(dados.telefone||"")}" placeholder="(00) 00000-0000"></div>
        <div><label class="label" for="pf-cidade">Cidade</label><input type="text" id="pf-cidade" maxlength="80" value="${esc(dados.cidade||"")}"></div>
      </div>
      <div><label class="label" for="pf-bio">Sobre você (opcional)</label><textarea id="pf-bio" maxlength="300" placeholder="Uma frase sobre você ou sua função">${esc(dados.bio||"")}</textarea></div>
      <div><label class="label">E-mail de acesso</label><input type="text" value="${esc(session.user.email)}" disabled></div>
      <p class="note" id="pf-msg" style="margin:0" role="status"></p>
      <div class="actions"><button type="submit" class="btn primary" id="pf-salvar">Salvar perfil</button><button type="button" class="btn ghost" data-fechar>Cancelar</button></div>
    </form>`;
    const msg=t=>{d.querySelector("#pf-msg").textContent=t};
    const av=d.querySelector("#pf-av");
    if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");

    d.querySelector("#pf-foto").addEventListener("change",async e=>{
      const f=e.target.files&&e.target.files[0]; if(!f)return;
      try{novaFoto=await redimensionar(f);removerFoto=false;
        const u=URL.createObjectURL(novaFoto);av.innerHTML=`<img src="${u}" alt="">`;msg("Foto pronta. Clique em Salvar perfil.");}
      catch(_){msg("Não consegui usar essa imagem. Tente outra.")}
    });
    const rem=d.querySelector("#pf-rem");
    if(rem)rem.addEventListener("click",()=>{novaFoto=null;removerFoto=true;av.textContent=iniciais(d.querySelector("#pf-nome").value||session.user.email);msg("A foto será removida ao salvar.")});

    d.addEventListener("click",e=>{if(e.target.closest("[data-fechar]")){fechar()}});
    function fechar(){if(d.open&&typeof d.close==="function")d.close();d.removeAttribute("open")}

    d.querySelector("#perfil-form").addEventListener("submit",async e=>{
      e.preventDefault();
      const btn=d.querySelector("#pf-salvar"); btn.disabled=true; msg("Salvando…");
      let path=dados.avatar_path||null;
      try{
        if(removerFoto&&path){await sb.storage.from(BUCKET).remove([path]);path=null}
        if(novaFoto){
          path=`${uid}/avatar.jpg`;
          const {error:eu}=await sb.storage.from(BUCKET).upload(path,novaFoto,{upsert:true,contentType:"image/jpeg"});
          if(eu)throw eu;
        }
        const campos={user_id:uid,email:String(session.user.email||"").toLowerCase(),nome:d.querySelector("#pf-nome").value.trim(),cargo:d.querySelector("#pf-cargo").value.trim(),
          telefone:d.querySelector("#pf-tel").value.trim(),cidade:d.querySelector("#pf-cidade").value.trim(),
          bio:d.querySelector("#pf-bio").value.trim(),avatar_path:path,atualizado_em:new Date().toISOString()};
        const {error}=await sb.from("perfis").upsert(campos,{onConflict:"user_id"});
        if(error)throw error;
        await aplicar(sb,session,opts);
        fechar();
        if(opts&&opts.aoSalvar)opts.aoSalvar(campos);
      }catch(err){msg("Não deu para salvar: "+(err.message||"erro")+". Tente de novo.");btn.disabled=false}
    });
  }

  async function aplicar(sb,session,opts){
    opts=opts||{};
    const {data:p}=await sb.from("perfis").select("*").eq("user_id",session.user.id).maybeSingle();
    const dados=p||{};
    const nome=dados.nome||"";
    const url=await urlFoto(sb,dados.avatar_path);
    pintarAvatar(opts.av&&document.querySelector(opts.av),nome||session.user.email,url);
    if(opts.nome){const el=document.querySelector(opts.nome);if(el&&nome)el.textContent=nome.split(" ")[0]}
    if(opts.sidebar){const el=document.querySelector(opts.sidebar);if(el){if(url)el.innerHTML=`<img src="${esc(url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;else el.textContent=iniciais(nome||session.user.email)}}
  }

  // Fotos dos clientes para a lista do painel: pega a primeira pessoa de cada cliente que tenha perfil
  async function fotosDosClientes(sb,clientes){
    const mapa={};
    if(!clientes||!clientes.length)return mapa;
    const {data:usuarios}=await sb.from("cliente_usuarios").select("cliente_id,email").order("criado_em");
    const emails=[...new Set((usuarios||[]).map(u=>String(u.email||"").toLowerCase()).filter(Boolean))];
    if(!emails.length)return mapa;
    const {data:perfis}=await sb.from("perfis").select("email,nome,avatar_path").in("email",emails);
    const porEmail={};(perfis||[]).forEach(p=>{porEmail[String(p.email||"").toLowerCase()]=p});
    for(const u of (usuarios||[])){
      if(mapa[u.cliente_id])continue;
      const p=porEmail[String(u.email||"").toLowerCase()];
      if(!p)continue;
      const url=await urlFoto(sb,p.avatar_path);
      mapa[u.cliente_id]={nome:p.nome||"",url};
    }
    return mapa;
  }

  function iniciar(sb,session,opts){
    opts=opts||{};
    // guarda o e-mail no perfil (sem mexer nos outros dados) para o painel achar a foto
    sb.from("perfis").upsert({user_id:session.user.id,email:String(session.user.email||"").toLowerCase()},{onConflict:"user_id"}).then(()=>{}).catch(()=>{});
    if(opts.botao){const b=document.querySelector(opts.botao);if(b){b.hidden=false;b.onclick=()=>abrir(sb,session,{...opts,aoSalvar:()=>{}})}}
    return aplicar(sb,session,opts).catch(()=>{});
  }

  window.GlaraPerfil={iniciar,abrir,aplicar,fotosDosClientes};
})();
