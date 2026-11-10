-- Cores do hub salvas no banco (valem para todos). Rodar uma vez no SQL Editor do Supabase.
create table if not exists tema_cores (
  id            integer primary key default 1 check (id = 1),
  cores         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
insert into tema_cores (id) values (1) on conflict (id) do nothing;

alter table tema_cores enable row level security;

-- todos podem LER (para aplicar as cores na página do cliente)
drop policy if exists "tema: todos leem" on tema_cores;
create policy "tema: todos leem" on tema_cores for select to anon, authenticated using (true);

-- só o administrador pode ALTERAR
drop policy if exists "tema: admin altera" on tema_cores;
create policy "tema: admin altera" on tema_cores for all to authenticated using (is_admin()) with check (is_admin());

grant select on tema_cores to anon, authenticated;
grant insert, update on tema_cores to authenticated;
