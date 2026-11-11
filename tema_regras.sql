-- Regras de cor por elemento (qualquer página do hub e da loja). Rodar uma vez no SQL Editor.
create table if not exists tema_regras (
  id          bigserial primary key,
  pagina      text not null default 'todas',   -- 'todas' ou host+caminho (ex.: cliente.guxta.com.br/planos.html)
  seletor     text not null,
  propriedade text not null,                   -- color | background-color | border-color
  valor       text not null,
  criado_em   timestamptz not null default now()
);
create index if not exists tema_regras_pagina_idx on tema_regras (pagina);

alter table tema_regras enable row level security;
drop policy if exists "regras: todos leem" on tema_regras;
create policy "regras: todos leem" on tema_regras for select to anon, authenticated using (true);
drop policy if exists "regras: admin tudo" on tema_regras;
create policy "regras: admin tudo" on tema_regras for all to authenticated using (is_admin()) with check (is_admin());
grant select on tema_regras to anon, authenticated;
grant insert, update, delete on tema_regras to authenticated;
