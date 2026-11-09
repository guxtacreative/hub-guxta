# Hub de Marketing · GUXTA

Site estático do Hub de Marketing (portal do cliente e painel), publicado pelo GitHub Pages em https://cliente.guxta.com.br.

- `index.html`: portal do cliente
- `admin.html`: painel
- `pagar.html`, `proposta.html`, `orcamento.html`, `plano-midia.html`, `relatorio.html`: páginas públicas
- `config.js`: endereço do Supabase e a chave pública (anon). Ela é pública por natureza; quem protege os dados são as regras do banco.

Para atualizar: troque os arquivos e faça commit na branch `main`. O GitHub Pages publica sozinho em 1 ou 2 minutos.

## Notas nos pedidos e alerta de WhatsApp
1. Rodar no SQL Editor do Supabase: `14_pedido_notas.sql` e `15_whatsapp_alertas.sql`.
2. Publicar a função: `supabase functions deploy enviar-whatsapp --no-verify-jwt`.
3. Segredos: `supabase secrets set CRON_SECRET=... ZAPI_INSTANCE=... ZAPI_TOKEN=... ZAPI_CLIENT_TOKEN=...` (opcional: `ADMIN_WHATSAPP`, `PORTAL_URL`).
4. Ativar `pg_cron` e `pg_net` e descomentar o `cron.schedule` no fim do arquivo 15 (com o mesmo CRON_SECRET).
