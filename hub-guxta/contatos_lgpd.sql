-- Contatos da loja com consentimento LGPD (termos + marketing) e registro das decisões
-- Rodar UMA vez no SQL Editor do Supabase.

create table if not exists contatos (
  id                 uuid primary key default gen_random_uuid(),
  nome               text,
  email              text not null,
  email_norm         text generated always as (lower(trim(email))) stored,
  telefone           text,
  termos_versao      text not null,
  termos_aceitos_em  timestamptz not null default now(),
  marketing_ok       boolean not null default false,
  marketing_em       timestamptz,
  descadastrado_em   timestamptz,
  origem             text,
  token              uuid not null default gen_random_uuid() unique,
  criado_em          timestamptz not null default now(),
  constraint contatos_email_unico unique (email_norm)
);

create table if not exists consentimentos_log (
  id          bigserial primary key,
  contato_id  uuid references contatos(id) on delete cascade,
  tipo        text not null,           -- 'termos' | 'marketing'
  acao        text not null check (acao in ('aceitou','revogou')),
  versao      text,
  origem      text,
  em          timestamptz not null default now()
);

alter table contatos enable row level security;
alter table consentimentos_log enable row level security;

-- Ninguém escreve direto na tabela: só pelas funções abaixo.
-- O administrador pode ler (para ver a base e o histórico de consentimento).
drop policy if exists "contatos: admin lê" on contatos;
create policy "contatos: admin lê" on contatos for select to authenticated using (is_admin());
drop policy if exists "log: admin lê" on consentimentos_log;
create policy "log: admin lê" on consentimentos_log for select to authenticated using (is_admin());

-- Cadastro feito na loja (sem login). Grava termos sempre; marketing só se a pessoa marcou.
create or replace function loja_cadastrar_contato(
  p_nome text, p_email text, p_telefone text,
  p_marketing boolean, p_versao text, p_origem text
) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_mkt boolean;
begin
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email_invalido';
  end if;
  if p_versao is null or p_versao = '' then
    raise exception 'versao_termos_obrigatoria';
  end if;

  insert into contatos (nome, email, telefone, termos_versao, termos_aceitos_em, origem)
  values (nullif(trim(p_nome),''), trim(p_email), nullif(trim(p_telefone),''), p_versao, now(), left(p_origem,60))
  on conflict (email_norm) do update set
    nome = coalesce(nullif(excluded.nome,''), contatos.nome),
    telefone = coalesce(nullif(excluded.telefone,''), contatos.telefone),
    termos_versao = excluded.termos_versao,
    termos_aceitos_em = now()
  returning id, marketing_ok into v_id, v_mkt;

  insert into consentimentos_log (contato_id, tipo, acao, versao, origem)
  values (v_id, 'termos', 'aceitou', p_versao, left(p_origem,60));

  if coalesce(p_marketing,false) and not v_mkt then
    update contatos set marketing_ok = true, marketing_em = now(), descadastrado_em = null where id = v_id;
    insert into consentimentos_log (contato_id, tipo, acao, versao, origem)
    values (v_id, 'marketing', 'aceitou', p_versao, left(p_origem,60));
  end if;

  return json_build_object('ok', true);
end;
$$;

-- Link "sair" que vai em todo e-mail de marketing
create or replace function contato_descadastrar(p_token uuid) returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  update contatos set marketing_ok = false, descadastrado_em = now()
  where token = p_token and marketing_ok
  returning id into v_id;
  if v_id is null then return false; end if;
  insert into consentimentos_log (contato_id, tipo, acao, origem)
  values (v_id, 'marketing', 'revogou', 'link de descadastro');
  return true;
end;
$$;

grant execute on function loja_cadastrar_contato(text,text,text,boolean,text,text) to anon, authenticated;
grant execute on function contato_descadastrar(uuid) to anon, authenticated;
