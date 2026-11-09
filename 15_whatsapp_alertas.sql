-- Alerta no WhatsApp sempre que o administrador altera conteúdos de um cliente
-- Rodar UMA vez no SQL Editor do Supabase.
-- Fluxo: gatilho grava na fila -> a cada minuto o agendador chama a função "enviar-whatsapp",
-- que junta tudo por cliente (uma mensagem só) e envia.

create table if not exists whatsapp_fila (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null,
  tabela      text not null,
  acao        text not null,
  titulo      text,
  criado_em   timestamptz not null default now(),
  enviado_em  timestamptz,
  tentativas  int not null default 0,
  erro        text
);
create index if not exists whatsapp_fila_pend_idx on whatsapp_fila (criado_em) where enviado_em is null;

alter table whatsapp_fila enable row level security;
drop policy if exists "fila whatsapp: admin lê" on whatsapp_fila;
create policy "fila whatsapp: admin lê" on whatsapp_fila for select to authenticated using (is_admin());

-- Só conta quando QUEM mexeu é o administrador (aprovações do cliente no portal não geram alerta)
create or replace function enfileirar_alteracao() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb; cli text; tit text;
begin
  if not is_admin() then return new; end if;
  j := to_jsonb(new);
  cli := j->>'cliente_id';
  if cli is null and (j->>'ciclo_id') is not null then
    select c.cliente_id::text into cli from ciclos c where c.id::text = j->>'ciclo_id';
  end if;
  if cli is null then return new; end if;
  tit := coalesce(j->>'titulo', j->>'nome', '');
  insert into whatsapp_fila (cliente_id, tabela, acao, titulo)
  values (cli::uuid, tg_table_name, lower(tg_op), left(tit, 120));
  return new;
end $$;

drop trigger if exists trg_alerta_posts    on posts;
drop trigger if exists trg_alerta_roteiros on roteiros;
drop trigger if exists trg_alerta_stories  on stories;
drop trigger if exists trg_alerta_pedidos  on pedidos;
create trigger trg_alerta_posts    after insert or update on posts    for each row execute function enfileirar_alteracao();
create trigger trg_alerta_roteiros after insert or update on roteiros for each row execute function enfileirar_alteracao();
create trigger trg_alerta_stories  after insert or update on stories  for each row execute function enfileirar_alteracao();
create trigger trg_alerta_pedidos  after update            on pedidos  for each row execute function enfileirar_alteracao();

-- Agendador (ative as extensões em Database > Extensions: pg_cron e pg_net).
-- Troque TROQUE-ESTE-SEGREDO pelo mesmo valor do segredo CRON_SECRET da função.
-- select cron.schedule('whatsapp-alertas', '* * * * *', $job$
--   select net.http_post(
--     url     := 'https://twysdmddthnvqhgdphhk.supabase.co/functions/v1/enviar-whatsapp',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','TROQUE-ESTE-SEGREDO'),
--     body    := '{}'::jsonb);
-- $job$);
