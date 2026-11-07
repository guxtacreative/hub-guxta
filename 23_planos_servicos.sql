-- =====================================================================
-- Hub de Marketing · Planos de serviço e serviços na loja
--   1) Produtos do tipo "serviço" (captação de vídeo, pacotes de posts,
--      edição de vídeo, criação de site): na loja não perguntam arte nem
--      entrega.
--   2) Planos de serviço (assessoria, gestão de redes): itens com
--      quantidade ou incluso / não incluso, página pública para mandar
--      ao cliente e texto pronto para o WhatsApp.
--   3) Faixa na loja falando dos planos, com link e WhatsApp.
-- Precisa dos arquivos 19 e 21. Pode rodar mais de uma vez.
-- =====================================================================
alter table public.produtos add column if not exists tipo text not null default 'grafico';
alter table public.produtos drop constraint if exists produtos_tipo_check;
alter table public.produtos add constraint produtos_tipo_check check (tipo in ('grafico', 'servico'));

alter table public.empresa add column if not exists loja_cta_ativo  boolean not null default true;
alter table public.empresa add column if not exists loja_cta_titulo text not null default 'Assessoria de marketing e gestão de redes sociais';
alter table public.empresa add column if not exists loja_cta_texto  text not null default 'Além do material gráfico, temos planos mensais completos: estratégia, artes, vídeos, gestão das redes sociais e anúncios. Fale com a gente para saber mais.';

-- ---------- planos de serviço ----------
create table if not exists public.planos_itens (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null,
  ordem  int not null default 0
);
alter table public.planos_itens enable row level security;
drop policy if exists admin_tudo on public.planos_itens;
create policy admin_tudo on public.planos_itens for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.planos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text not null default '',
  preco         numeric(12,2) not null default 0 check (preco >= 0),
  periodo       text not null default 'mês',
  destaque      boolean not null default false,
  ativo         boolean not null default true,
  ordem         int not null default 0,
  valores       jsonb not null default '{}',   -- {item_id: "12" | true | false}
  obs           text not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.planos enable row level security;
drop policy if exists admin_tudo on public.planos;
create policy admin_tudo on public.planos for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- itens comuns para começar (só se ainda não houver nenhum)
insert into public.planos_itens (nome, ordem)
select n, o from (values ('Artes para o feed', 1), ('Carrosséis', 2), ('Vídeos (Reels)', 3), ('Stories', 4),
                         ('Captação de vídeo', 5), ('Edição de vídeo', 6), ('Legendas e hashtags', 7),
                         ('Agendamento e publicação', 8), ('Gestão de anúncios (Meta e Google)', 9),
                         ('Relatório mensal', 10), ('Reunião de alinhamento', 11), ('Site ou página de captura', 12)) v(n, o)
 where not exists (select 1 from public.planos_itens);

create or replace function public.planos_ver()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'empresa', e.nome, 'telefone', e.telefone, 'email', e.email, 'site', e.site, 'documento', e.documento,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nome', i.nome) order by i.ordem, i.nome) from public.planos_itens i), '[]'),
    'planos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'preco', p.preco,
                          'periodo', p.periodo, 'destaque', p.destaque, 'valores', p.valores, 'obs', p.obs) order by p.ordem, p.preco)
                        from public.planos p where p.ativo), '[]'))
  from public.empresa e where e.id = 1
$$;
revoke all on function public.planos_ver() from public;
grant execute on function public.planos_ver() to anon, authenticated;

create or replace function public.loja_ver()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare e public.empresa;
begin
  select * into e from public.empresa where id = 1;
  if not coalesce(e.loja_ativa, true) then return jsonb_build_object('ativa', false, 'empresa', e.nome, 'telefone', e.telefone); end if;
  return jsonb_build_object(
    'ativa', true, 'empresa', e.nome, 'telefone', e.telefone, 'email', e.email, 'site', e.site, 'documento', e.documento,
    'titulo', e.loja_titulo, 'texto', e.loja_texto,
    'cta', case when e.loja_cta_ativo then jsonb_build_object('titulo', e.loja_cta_titulo, 'texto', e.loja_cta_texto) end,
    'tem_planos', exists (select 1 from public.planos where ativo),
    'identidade_valor', e.identidade_valor, 'identidade_info', e.identidade_info,
    'entrega', jsonb_build_object('ativa', e.entrega_ativa, 'valor', e.entrega_valor, 'info', e.entrega_info,
                                  'retirada_endereco', coalesce(nullif(e.retirada_endereco, ''), e.endereco), 'retirada_info', e.retirada_info),
    'online', public.cartao_disponivel(),
    'produtos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'categoria', p.categoria, 'unidade', p.unidade,
        'foto', p.foto, 'prazo', p.prazo, 'arte_valor', p.arte_valor, 'preco_tipo', p.preco_tipo, 'tipo', p.tipo,
        'preco_m2', case when p.preco_tipo = 'm2' then p.preco end, 'area_min', p.area_min,
        'faixas', (select coalesce(jsonb_agg(jsonb_build_object('qtd', f->'qtd', 'preco', f->'preco') order by (f->>'qtd')::numeric), '[]')
                     from jsonb_array_elements(p.faixas) f))
        order by p.categoria, p.ordem, p.nome)
      from public.produtos p where p.na_loja and ((p.preco_tipo = 'faixas' and jsonb_array_length(p.faixas) > 0) or (p.preco_tipo = 'm2' and p.preco > 0))), '[]'));
end $$;
revoke all on function public.loja_ver() from public;
grant execute on function public.loja_ver() to anon, authenticated;

create or replace function public.loja_calcular(p_itens jsonb, p_identidade text, p_entrega text, p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare it jsonb; p public.produtos; f jsonb; e public.empresa; out jsonb := '[]'; sub numeric := 0; artes numeric := 0;
        precisa_arte boolean := false; idv numeric := 0; frete numeric := 0; arte text; arq jsonb; m jsonb; l numeric; a numeric; q numeric;
        preco numeric; custo numeric; desc_ text; qtd numeric; un text; fisico boolean := false;
begin
  select * into e from public.empresa where id = 1;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'carrinho_vazio'; end if;
  if jsonb_array_length(p_itens) > 40 then raise exception 'carrinho_grande'; end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    select * into p from public.produtos where id = nullif(it->>'produto_id', '')::uuid and na_loja;
    if p.id is null then raise exception 'produto_indisponivel'; end if;
    m := null;
    if p.preco_tipo = 'm2' then
      l := nullif(it->>'largura', '')::numeric; a := nullif(it->>'altura', '')::numeric; q := coalesce(nullif(it->>'qtd', '')::numeric, 1);
      if l is null or a is null or l < 1 or a < 1 or l > 100000 or a > 100000 or q < 1 or q > 10000 or q <> trunc(q) then raise exception 'medida_invalida'; end if;
      if p.preco <= 0 then raise exception 'produto_indisponivel'; end if;
      m := public.m2_calcular(p, l, a, q);
      preco := (m->>'preco')::numeric; custo := (m->>'custo')::numeric; qtd := q; un := 'un';
      desc_ := concat_ws(' · ', trim(to_char(l, 'FM999999990.##')) || '×' || trim(to_char(a, 'FM999999990.##')) || ' cm (' ||
                 replace(trim(to_char((m->>'total_m2')::numeric, 'FM999990.00')), '.', ',') || ' m²)', nullif(p.descricao, ''));
    else
      select x into f from jsonb_array_elements(p.faixas) x where (x->>'qtd')::numeric = nullif(it->>'qtd', '')::numeric limit 1;
      if f is null then raise exception 'quantidade_indisponivel'; end if;
      preco := (f->>'preco')::numeric; custo := (f->>'custo')::numeric; qtd := (f->>'qtd')::numeric; un := p.unidade; desc_ := p.descricao;
    end if;
    arte := coalesce(it->>'arte', '');
    if arte not in ('', 'tem', 'criar') then arte := ''; end if;
    if p.tipo = 'servico' then arte := 'servico'; else fisico := true; end if;
    arq := case when jsonb_typeof(it->'arquivo') = 'object' and coalesce(it->'arquivo'->>'caminho', '') like p_token::text || '/%'
                then jsonb_build_object('caminho', left(it->'arquivo'->>'caminho', 300), 'nome', left(coalesce(it->'arquivo'->>'nome', ''), 160))
                else null end;
    if arte = 'criar' then precisa_arte := true; artes := artes + p.arte_valor; end if;
    sub := sub + preco;
    out := out || jsonb_build_array(jsonb_build_object(
      'produto_id', p.id, 'nome', p.nome, 'descricao', desc_, 'unidade', un, 'qtd', qtd,
      'preco', preco, 'custo', custo, 'arte', arte, 'preco_tipo', p.preco_tipo, 'tipo', p.tipo,
      'largura', case when m is not null then l end, 'altura', case when m is not null then a end,
      'area_m2', case when m is not null then (m->>'total_m2')::numeric end,
      'arte_valor', case when arte = 'criar' then p.arte_valor else 0 end, 'arquivo', arq));
  end loop;
  if precisa_arte and p_identidade = 'criar' then idv := e.identidade_valor; end if;
  if fisico and p_entrega = 'entrega' and e.entrega_ativa then frete := e.entrega_valor; end if;
  return jsonb_build_object('itens', out, 'subtotal', sub, 'artes_total', artes, 'precisa_identidade', precisa_arte,
                            'identidade', case when precisa_arte then coalesce(p_identidade, '') else '' end,
                            'identidade_valor', idv, 'entrega_valor', frete, 'precisa_entrega', fisico, 'total', sub + artes + idv + frete);
end $$;
revoke all on function public.loja_calcular(jsonb, text, text, uuid) from public, anon, authenticated;

create or replace function public.loja_fechar(p_token uuid)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare fisico boolean; lp public.loja_pedidos; o public.orcamentos; it jsonb; itens jsonb := '[]'; txt_end text := ''; obs text := '';
        e public.empresa; cobr jsonb;
begin
  select * into lp from public.loja_pedidos where token = p_token for update;
  if lp.id is null then raise exception 'nao_encontrado'; end if;
  if lp.status in ('fechado', 'pago') then
    return jsonb_build_object('ok', true, 'pagamento', public.orcamento_cobranca(lp.orcamento_id));
  end if;
  if lp.status = 'cancelado' then raise exception 'cancelado'; end if;
  select * into e from public.empresa where id = 1;
  fisico := exists (select 1 from jsonb_array_elements(lp.itens) x where coalesce(x->>'arte', '') <> 'servico');
  for it in select * from jsonb_array_elements(lp.itens) loop
    if coalesce(it->>'arte', '') = '' then raise exception 'arte_pendente'; end if;
    if it->>'arte' = 'tem' and it->'arquivo' is null then raise exception 'arquivo_pendente'; end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(lp.itens) x where x->>'arte' = 'criar') and lp.identidade = '' then raise exception 'identidade_pendente'; end if;
  if fisico and lp.entrega_tipo = '' then raise exception 'entrega_obrigatoria'; end if;
  if not fisico then lp.entrega_tipo := ''; lp.entrega_valor := 0; end if;
  if lp.entrega_tipo = 'entrega' then
    if length(lp.endereco->>'cep') <> 8 or coalesce(lp.endereco->>'rua', '') = '' or coalesce(lp.endereco->>'numero', '') = '' or coalesce(lp.endereco->>'cidade', '') = '' then
      raise exception 'endereco_entrega_incompleto';
    end if;
  end if;

  for it in select * from jsonb_array_elements(lp.itens) loop
    itens := itens || jsonb_build_array(jsonb_build_object('produto_id', it->>'produto_id',
      'nome', (it->>'nome') || ' · ' || replace(trim(to_char((it->>'qtd')::numeric, 'FM999G999G990')), ',', '.') || ' ' || (it->>'unidade'),
      'descricao', concat_ws(' · ', nullif(it->>'descricao', ''), case it->>'arte' when 'tem' then 'arte do cliente (revisar): ' || coalesce(it->'arquivo'->>'nome', '') when 'servico' then null else 'criação da arte incluída' end),
      'unidade', 'pedido', 'qtd', 1, 'custo', (it->>'custo')::numeric, 'lucro_tipo', 'valor',
      'lucro', (it->>'preco')::numeric - (it->>'custo')::numeric, 'preco', (it->>'preco')::numeric));
    if it->>'arte' = 'criar' and (it->>'arte_valor')::numeric > 0 then
      itens := itens || jsonb_build_array(jsonb_build_object('nome', 'Criação de arte · ' || (it->>'nome'), 'descricao', '', 'unidade', 'serviço',
        'qtd', 1, 'custo', 0, 'lucro_tipo', 'valor', 'lucro', (it->>'arte_valor')::numeric, 'preco', (it->>'arte_valor')::numeric));
    end if;
  end loop;
  if lp.identidade = 'criar' and lp.identidade_valor > 0 then
    itens := itens || jsonb_build_array(jsonb_build_object('nome', 'Criação de identidade visual', 'descricao', e.identidade_info, 'unidade', 'serviço',
      'qtd', 1, 'custo', 0, 'lucro_tipo', 'valor', 'lucro', lp.identidade_valor, 'preco', lp.identidade_valor));
  end if;
  if lp.entrega_tipo = 'entrega' then
    txt_end := (lp.endereco->>'rua') || ', ' || (lp.endereco->>'numero') || coalesce(' · ' || nullif(lp.endereco->>'complemento', ''), '')
               || coalesce(' · ' || nullif(lp.endereco->>'bairro', ''), '') || ' · ' || (lp.endereco->>'cidade') || coalesce('/' || nullif(lp.endereco->>'uf', ''), '')
               || ' · CEP ' || substr(lp.endereco->>'cep', 1, 5) || '-' || substr(lp.endereco->>'cep', 6);
  end if;
  obs := 'Pedido feito pela loja online.'
      || case when exists (select 1 from jsonb_array_elements(lp.itens) x where x->>'arte' = 'tem') then E'\nTem arte enviada pelo cliente: revisar antes de imprimir.' else '' end
      || case lp.identidade when 'tem' then E'\nO cliente já tem identidade visual.' when 'criar' then E'\nCriar a identidade visual.' else '' end;

  insert into public.orcamentos (contato_id, cliente_nome, cliente_contato, titulo, itens, desconto, validade, prazo_entrega,
                                 condicoes, observacoes, status, tem_entrega, entrega_tipo, entrega_valor, entrega_endereco,
                                 assinado_em, assinatura)
  values (lp.contato_id, coalesce(nullif(lp.empresa, ''), lp.nome), coalesce(nullif(lp.telefone, ''), lp.email), 'Pedido da loja online', itens, 0,
          null, coalesce((select string_agg(distinct p.prazo, ' · ') from public.produtos p where p.id in (select (x->>'produto_id')::uuid from jsonb_array_elements(lp.itens) x) and p.prazo <> ''), ''),
          'Pagamento integral pelo Mercado Pago.', obs, 'aprovado', fisico, lp.entrega_tipo, lp.entrega_valor,
          case when lp.entrega_tipo = 'entrega' then lp.endereco else '{}'::jsonb end,
          now(), jsonb_build_object('nome', lp.nome, 'documento', lp.documento, 'email', lp.email, 'telefone', lp.telefone,
                                    'empresa', lp.empresa, 'endereco', txt_end, 'em', now(), 'loja', true, 'total', lp.total))
  returning * into o;

  insert into public.lancamentos (tipo, descricao, categoria, valor, custo, data, status, forma, cliente_nome, orcamento_id, notas)
  values ('entrada', 'Loja online · pedido nº ' || o.numero || ' · ' || coalesce(nullif(lp.empresa, ''), lp.nome), 'Loja online',
          o.total + lp.entrega_valor, least(o.custo_total, o.total), (now() at time zone 'America/Sao_Paulo')::date, 'previsto', '',
          coalesce(nullif(lp.empresa, ''), lp.nome), o.id,
          'Pedido da loja online. Pagamento integral.'
            || case lp.entrega_tipo when 'retirada' then E'\nRetirada no endereço da empresa (sem custo).'
                                   when 'entrega' then E'\nEntrega (' || public.brl(lp.entrega_valor) || '): ' || txt_end else '' end);
  update public.orcamentos set lancado_em = now() where id = o.id;

  update public.loja_pedidos set status = 'fechado', fechado_em = now(), orcamento_id = o.id, abandonado_em = null, atualizado_em = now() where id = lp.id;
  if lp.contato_id is not null then
    insert into public.contato_eventos (contato_id, tipo, texto)
    values (lp.contato_id, 'carrinho', 'Fechou o pedido nº ' || lpad(o.numero::text, 4, '0') || ' na loja · ' || public.brl(o.total + lp.entrega_valor) || ' · aguardando pagamento');
    update public.contatos set etapa = 'orcamento', valor = greatest(valor, o.total + lp.entrega_valor) where id = lp.contato_id and etapa in ('novo', 'conversa');
  end if;
  perform public.notificar('loja_pedido', 'Novo pedido na loja: ' || coalesce(nullif(lp.empresa, ''), lp.nome),
    public.brl(o.total + lp.entrega_valor) || ' · ' || jsonb_array_length(lp.itens) || ' item(ns)'
      || case when exists (select 1 from jsonb_array_elements(lp.itens) x where x->>'arte' = 'tem') then ' · tem arte para revisar' else '' end
      || E'\nAguardando o pagamento.',
    null, jsonb_build_object('vista', 'orcamentos', 'orcamento', o.id), 'lojapedido:' || lp.id);
  cobr := public.orcamento_cobranca(o.id);
  return jsonb_build_object('ok', true, 'numero', o.numero, 'pagamento', cobr);
end $$;
revoke all on function public.loja_fechar(uuid) from public;
grant execute on function public.loja_fechar(uuid) to anon, authenticated;

-- a loja agora tem serviços também: troca o título padrão (só se ainda for o original)
update public.empresa set loja_titulo = 'Serviços e material gráfico' where loja_titulo = 'Material gráfico';
update public.empresa set loja_texto = 'Pacotes de posts, captação e edição de vídeo, sites e material gráfico. Escolha, envie sua arte (ou deixe que a gente cria) e pague online.'
 where loja_texto = 'Escolha os produtos, envie sua arte (ou deixe que a gente cria) e pague online.';
