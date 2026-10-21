# Implantação do C7 Store em `catalogo.c7tecnologia.com`

Este pacote prepara o catálogo para rodar como aplicação Node.js no cPanel. Ele não altera DNS, cPanel, banco de dados ou o site principal `c7tecnologia.com`.

## O que o servidor precisa oferecer

- Node.js 20 ou superior;
- recurso **Setup Node.js App / Application Manager** no cPanel;
- acesso SSH ou terminal para instalar dependências;
- banco MySQL/TiDB de produção;
- TLS/SSL ativo para `catalogo.c7tecnologia.com`;
- variáveis de ambiente do arquivo `deploy/cpanel/production-env.template` preenchidas pelo responsável;
- acesso às APIs Manus usadas pelo OAuth e pelo storage de imagens/documentos.

A aplicação é full-stack. Portanto, não basta enviar somente `dist/public`: o servidor precisa executar `dist/index.js` para atender `/api/trpc`, login, banco, uploads e documentos de garantia.

## Preparação no cPanel

1. Crie ou confirme o subdomínio `catalogo.c7tecnologia.com` apontando para a pasta da aplicação. Não altere o domínio principal.
2. Crie uma aplicação Node.js com:
   - ambiente: `Production`;
   - versão: Node.js 20+;
   - application root: pasta do projeto enviado;
   - startup file: `dist/index.js`;
   - application URL: `https://catalogo.c7tecnologia.com`.
3. Envie o pacote de implantação e extraia-o na pasta da aplicação.
4. No terminal da aplicação, instale as dependências com o gerenciador disponível:

   ```bash
   corepack enable
   pnpm install --prod --frozen-lockfile
   ```

   Se o cPanel não disponibilizar `pnpm`, instale-o no ambiente Node da conta antes de iniciar a aplicação. Não use `npm install` misturado com `pnpm` sem regenerar o lockfile.

5. Configure as variáveis do `deploy/cpanel/production-env.template` no painel da aplicação ou em um `.env` fora do GitHub. Substitua todos os valores `COLOCAR_`, `SEU_` e `GERAR_`.
6. Garanta que `DATABASE_URL` aponta para o banco de produção correto. Não execute migrações automaticamente sem conferir o histórico de migrações e fazer backup.
7. Reinicie a aplicação Node.js pelo cPanel.

## Validação depois de iniciar

Teste, nesta ordem:

```text
https://catalogo.c7tecnologia.com/
https://catalogo.c7tecnologia.com/robots.txt
https://catalogo.c7tecnologia.com/sitemap.xml
https://catalogo.c7tecnologia.com/admin
```

Depois confira:

- catálogo público e detalhes de produtos;
- login do painel;
- criação/edição de produto;
- upload de foto;
- registro de venda com vendedor;
- criação do termo de garantia;
- acesso aos anexos por administrador/vendedor;
- bloqueio dos anexos para visitante sem login;
- layout em desktop e celular.

## Atenção sobre o domínio canônico

O sitemap e os metadados já usam `https://catalogo.c7tecnologia.com`. O certificado SSL desse subdomínio precisa estar válido antes do teste final. O site principal `https://c7tecnologia.com` não deve ser substituído nem redirecionado.

## Atenção sobre documentos de garantia

Os documentos assinados são privados. A versão local do código exige autenticação no proxy desses arquivos. Após publicar no cPanel, valide explicitamente que uma janela anônima não consegue abrir um documento de garantia.

## O que não está incluído no pacote

- senhas, chaves OAuth, `DATABASE_URL` ou chaves de storage reais;
- alteração de DNS;
- alteração do cPanel;
- execução de migrações no banco;
- alteração do site principal;
- dados de clientes ou documentos assinados.
