-- Meu perfil · foto e dados de cada pessoa que entra no painel ou no portal
-- Rodar UMA vez no SQL Editor do Supabase.
-- Cada pessoa lê e altera só o próprio perfil e a própria foto.

create table if not exists perfis (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  nome         text,
  cargo        text,
  telefone     text,
  cidade       text,
  bio          text,
  avatar_path  text,
  atualizado_em timestamptz default now()
);

alter table perfis enable row level security;

drop policy if exists "perfil: ler o próprio" on perfis;
drop policy if exists "perfil: criar o próprio" on perfis;
drop policy if exists "perfil: editar o próprio" on perfis;

create policy "perfil: ler o próprio" on perfis
  for select to authenticated using (auth.uid() = user_id);
create policy "perfil: criar o próprio" on perfis
  for insert to authenticated with check (auth.uid() = user_id);
create policy "perfil: editar o próprio" on perfis
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bucket privado para as fotos (cada pessoa só acessa a própria pasta: <user_id>/...)
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', false)
on conflict (id) do nothing;

drop policy if exists "avatar: ler o próprio" on storage.objects;
drop policy if exists "avatar: enviar o próprio" on storage.objects;
drop policy if exists "avatar: trocar o próprio" on storage.objects;
drop policy if exists "avatar: apagar o próprio" on storage.objects;

create policy "avatar: ler o próprio" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar: enviar o próprio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar: trocar o próprio" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar: apagar o próprio" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
