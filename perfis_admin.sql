-- Fotos dos clientes na lista do painel (o administrador vê os perfis de todos)
-- Rodar UMA vez no SQL Editor do Supabase, depois do perfis_usuarios.sql.

alter table perfis add column if not exists email text;
create index if not exists perfis_email_idx on perfis (lower(email));

-- Administrador pode LER os perfis e as fotos de todos (sem alterar nada)
drop policy if exists "perfil: admin lê todos" on perfis;
create policy "perfil: admin lê todos" on perfis
  for select to authenticated using (is_admin());

drop policy if exists "avatar: admin lê todos" on storage.objects;
create policy "avatar: admin lê todos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and is_admin());
