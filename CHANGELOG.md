# Changelog

## 1.1.0 — Assistente de vendas de bastidor

- Adicionada a rota interna `/assistente` para coleta de contexto do cliente.
- Criado ranking determinístico por orçamento, objetivo, configuração e disponibilidade.
- Adicionada geração server-side de recomendação, argumentos, objeções e mensagem revisável.
- Incluído fallback sem IA para manter a funcionalidade disponível quando o serviço de linguagem não responder.
- Adicionados testes para orçamento, disponibilidade e perfil de jogos.
- Nenhuma tabela ou migration foi alterada.
