-- Notas internas dos pedidos dos clientes (só o administrador vê)
-- Rodar UMA vez no SQL Editor do Supabase.

do $$
declare tp text;
begin
  select format_type(a.atttypid, a.atttypmod) into tp
    from pg_attribute a
   where a.attrelid = 'public.pedidos'::regclass and a.attname = 'id' and not a.attisdropped;

  execute format($f$
    create table if not exists pedido_notas (
      id          uuid primary key default gen_random_uuid(),
      pedido_id   %s not null references pedidos(id) on delete cascade,
      cliente_id  uuid,
      texto       text not null check (length(btrim(texto)) > 0),
      autor       text,
      criado_por  uuid default auth.uid(),
      criado_em   timestamptz not null default now()
    )$f$, tp);
end $$;

create index if not exists pedido_notas_pedido_idx  on pedido_notas (pedido_id, criado_em desc);
create index if not exists pedido_notas_cliente_idx on pedido_notas (cliente_id);

alter table pedido_notas enable row level security;

drop policy if exists "pedido_notas: admin" on pedido_notas;
create policy "pedido_notas: admin" on pedido_notas
  for all to authenticated
  using (is_admin()) with check (is_admin());
