# C7 Store — Catálogo e apoio comercial

Plataforma interna da C7 Store para cadastro, curadoria, apresentação e recomendação de computadores seminovos. O sistema preserva o catálogo público e oferece ferramentas de bastidor para a equipe de vendas.

## Assistente de vendas

A rota interna `/assistente` permite informar objetivo de uso, orçamento, jogos, programas e preferências do cliente. A aplicação primeiro filtra e ranqueia somente produtos disponíveis no catálogo. Em seguida, usa o modelo server-side configurado no ambiente para redigir uma recomendação, argumentos, objeções e uma mensagem de WhatsApp que a vendedora pode revisar.

A assistente não envia mensagens, não cria produtos e não inventa disponibilidade ou especificações. Caso o serviço de linguagem esteja indisponível, ela usa uma resposta determinística baseada nos dados reais do catálogo.

## Desenvolvimento

```bash
pnpm install
pnpm test
pnpm check
pnpm build
```

A aplicação usa React + Vite no frontend, Express + tRPC no backend e Drizzle ORM para acesso ao banco. As migrations existentes devem ser preservadas; a assistente comercial da primeira versão não exige alteração de schema.
