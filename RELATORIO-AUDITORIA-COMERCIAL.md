# Auditoria do catálogo C7 Store

**Data:** 29/09/2026  
**Escopo:** vitrine pública, painel administrativo, segurança, dados, operação e conversão comercial.

## Resumo executivo

O catálogo já tem uma base forte: identidade visual premium, filtros, comparação, galeria, compartilhamento, garantia, venda, locação, importação de planilha, histórico e controle de acesso.

Os próximos ganhos não devem vir de adicionar muitas funções novas. Devem vir de **reduzir riscos operacionais**, **melhorar a descoberta dos produtos**, **medir o interesse dos clientes** e **facilitar a conversa que termina em venda**.

### Prioridade recomendada

1. **P0 — Corrigir SEO real dos links individuais e medir os cliques comerciais.**
2. **P0 — Proteger locações, vendas e alterações concorrentes com transações e regras de acesso.**
3. **P1 — Melhorar a ficha comercial do produto e o CTA de WhatsApp.**
4. **P1 — Consolidar o CSS do painel para evitar novas regressões de desktop.**
5. **P2 — Criar métricas comerciais simples para saber quais produtos e campanhas geram contato.**

---

## 1. O que está bom hoje

### Vitrine pública

- Identidade visual diferenciada e coerente com uma loja de tecnologia.
- Proposta de valor clara: produto seminovo, revisado e com 1 ano de garantia.
- Filtros por marca, RAM, categoria, faixa de preço e finalidade.
- Alternância entre cards e lista.
- Comparação de até três produtos.
- Galeria com navegação, zoom e gesto no celular.
- Botão direto para WhatsApp com mensagem contextual.
- Compartilhamento por navegador e geração de card.
- Dados internos, como número de série, não são enviados para a vitrine pública.

### Painel

- Controle privado com perfis de visualização, vendedor e administrador.
- Cadastro com normalização de marca, geração, RAM, armazenamento e preço.
- Proteção contra duplicidade de número de série no fluxo normal.
- Separação entre disponíveis, locados e vendidos.
- Importação de planilha com prévia e validações.
- Galeria com foto principal, legendas e ordenação.
- Histórico de alterações.
- Registro de venda com forma de pagamento.
- Geração do termo de garantia.
- Área de locações e retorno do equipamento.
- Ferramentas de divulgação para um, dois ou três equipamentos.

---

## 2. Pontos que podem dar problema

## P0 — Riscos técnicos e operacionais

### 2.1 SEO individual ainda não está realmente server-side

**Evidência:** `client/index.html` possui apenas título e descrição genéricos. O servidor em `server/_core/vite.ts` injeta o HTML do Vite, mas não cria metadados específicos a partir do parâmetro `produto`.

**Risco:** ao compartilhar um produto, WhatsApp, Instagram e mecanismos de busca podem exibir apenas o título genérico da loja, sem foto, modelo e preço daquele equipamento.

**Melhor solução:**

- Criar URL amigável, por exemplo `/produto/dell-vostro-5402-123`.
- Resolver o produto no servidor antes de montar o HTML.
- Injetar `title`, `description`, `og:title`, `og:description`, `og:image`, `og:url` e `twitter:card`.
- Usar uma imagem social padronizada quando o produto não tiver foto.
- Manter o parâmetro antigo `?produto=123` funcionando por compatibilidade.

**Como validar:** colar três links diferentes no debugger de compartilhamento do Facebook/Meta e verificar se cada um mostra a foto e o produto corretos.

### 2.2 Locação sem transação ou bloqueio de concorrência

**Evidência:** `createRental` primeiro consulta se o produto está disponível, depois insere a locação e só então altera o produto para `rented`.

**Risco:** dois vendedores podem iniciar a locação do mesmo equipamento quase ao mesmo tempo. Ambos podem passar na verificação inicial.

**Melhor solução:**

- Usar transação de banco.
- Atualizar o produto para `rented` somente se o estado atual ainda for `available`.
- Confirmar que uma única linha foi atualizada antes de inserir a locação.
- Adicionar índice/regra para impedir mais de uma locação ativa por produto.

### 2.3 Retorno de locação pode sobrescrever o estado do equipamento

**Evidência:** `returnRental` marca a locação como retornada e define o produto como `available` sem verificar se existe outra locação ativa ou outra operação posterior.

**Risco:** em caso de operação simultânea, o equipamento pode voltar para disponível incorretamente.

**Melhor solução:** fazer o retorno em transação e revalidar o estado do produto e da locação no mesmo comando lógico.

### 2.4 Dados de locação sensíveis disponíveis para perfil de visualização

**Evidência:** `rentals.list` usa `inventoryProcedure`, que permite `viewer`, e retorna nome do cliente e forma de pagamento.

**Risco:** um usuário somente de consulta pode acessar dados operacionais e pessoais que talvez não precise ver.

**Melhor solução:**

- Para `viewer`, retornar somente produto, status e datas resumidas.
- Reservar cliente, pagamento e histórico completo para `seller` e `admin`.
- Registrar no histórico quem consultou ou exportou dados sensíveis, se isso for necessário para a operação.

### 2.5 Fluxos críticos não são atômicos

A venda, restauração, criação de locação, retorno e atualização de galeria realizam várias operações sucessivas. Se uma etapa falhar no meio, o banco pode ficar parcialmente atualizado.

**Melhor solução:** envolver as sequências críticas em transações e criar testes de falha intermediária.

### 2.6 Upload aceita metadados controlados pelo cliente

**Evidência:** o endpoint recebe `mimeType`, nome e base64 e usa o MIME informado para armazenar o arquivo.

**Risco:** arquivo com extensão ou tipo enganoso, imagens muito grandes em dimensões, consumo de memória e vídeos pesados. O tamanho em bytes é limitado, mas a dimensão e o conteúdo não são validados.

**Melhor solução:**

- Inspecionar magic bytes/conteúdo real no servidor.
- Validar dimensões máximas e proporção.
- Reencodar imagens para WebP/JPEG no servidor.
- Gerar miniaturas para cards e uma versão original para galeria.
- Criar limpeza de arquivos órfãos quando uma foto for substituída ou removida.

### 2.7 O CSS do painel está muito acumulado

**Evidência:** `client/src/index.css` tem mais de 2.000 linhas e vários blocos posteriores redefinem os mesmos seletores, especialmente `.inventory-row`, `.admin-content` e `.inventory-table`.

**Risco:** uma pequena alteração em desktop pode quebrar tablet ou mobile, como ocorreu na última revisão. A ordem dos blocos passa a ser mais importante que a intenção do componente.

**Melhor solução:**

- Não refatorar tudo de uma vez.
- Primeiro congelar o layout atual com screenshots de referência em 375, 768, 1280 e 1920px.
- Depois consolidar somente os seletores do painel em um bloco único.
- Separar CSS público e CSS administrativo em arquivos próprios.
- Remover regras duplicadas após cada validação visual.
- Criar uma matriz de regressão antes de publicar cada mudança.

### 2.8 Preços como texto dificultam métricas futuras

**Evidência:** `price`, `originalPrice`, `promoPrice` e `soldPrice` são armazenados como `varchar`.

**Risco:** relatórios de margem, ticket médio, vendas por faixa e ofertas podem ficar frágeis quando os formatos variam.

**Melhor solução:** manter os campos atuais para compatibilidade, mas adicionar campos numéricos em centavos para novas operações. A interface continua exibindo BRL formatado.

### 2.9 Falta de testes de interface e de concorrência

Os 12 testes existentes cobrem regras importantes do servidor e da normalização, mas não cobrem suficientemente:

- overflow real em viewports;
- fluxo de compartilhamento;
- metadados de produto;
- upload inválido;
- dupla locação simultânea;
- retorno de locação concorrente;
- impressão do termo;
- permissões visuais por perfil.

**Melhor solução:** adicionar testes de integração para as regras P0 e, depois, poucos testes de browser para os fluxos críticos.

---

## P1 — Melhorias de experiência e confiabilidade

### 2.10 Produto sem foto reduz conversão

A vitrine possui fallback visual quando o produto não tem foto. Isso evita quebra de layout, mas não vende tão bem quanto uma foto real.

**Regra comercial recomendada:** produto não entra como “pronto para venda” enquanto não tiver:

- foto principal;
- preço definido ou indicação clara de orçamento;
- processador;
- RAM;
- armazenamento;
- condição estética;
- garantia.

Pode existir um estado interno “rascunho/incompleto” que não aparece publicamente.

### 2.11 Produto sem estoque visualmente separado

Quando poucos produtos estão disponíveis, a página poderia mostrar de forma mais forte:

- “Disponível agora”;
- “Últimas unidades” somente quando for verdadeiro;
- “Consulte disponibilidade” quando o dado estiver desatualizado.

Não usar urgência falsa. A confiança é mais importante que uma pressão artificial.

### 2.12 Formulário de cadastro ainda pode ser mais rápido

O cadastro tem muitos campos e recursos avançados. Para o vendedor, o fluxo ideal deve começar com cinco campos:

1. marca;
2. modelo;
3. processador;
4. RAM;
5. armazenamento;
6. preço;
7. foto principal.

O restante deve ficar em “Detalhes técnicos” e “Informações internas”.

### 2.13 Falta de rascunho seguro

Se o vendedor fechar ou recarregar o cadastro antes de salvar, pode perder dados.

**Melhor solução:** salvar um rascunho local temporário por produto e mostrar “Rascunho recuperado” ao retornar. Nunca publicar o rascunho automaticamente.

### 2.14 Modais importantes precisam de foco e escape padronizados

O sistema tem modais para card, garantia, edição de foto e confirmação. Eles devem ter o mesmo comportamento:

- foco inicial no título ou primeiro campo;
- fechar com Escape;
- devolver foco ao botão que abriu;
- bloquear rolagem do fundo;
- impedir foco escapar para trás do modal.

### 2.15 Botões de ícone devem ser auditados

A vitrine já usa `aria-label` em vários botões, mas todos os botões de ícone do painel e dos designers devem passar pela mesma verificação. O usuário deve entender a ação por texto, tooltip ou nome acessível.

### 2.16 Links de compartilhamento precisam de fallback explícito

O compartilhamento usa `navigator.share` quando disponível e abre WhatsApp como fallback. É importante mostrar uma confirmação clara:

- “Link copiado”;
- “WhatsApp aberto”;
- “Não foi possível compartilhar; copie o link”.

Também vale revogar URLs temporárias somente depois que o download tiver sido iniciado com segurança.

---

## 3. O que fazer comercialmente para vender mais

## Prioridade comercial 1 — Melhorar a ficha do produto

Cada produto deve responder rapidamente:

- O que é?
- Para quem serve?
- Quanto custa?
- Por que confiar?
- Como comprar agora?

### Estrutura recomendada

**Título comercial**  
`Dell Vostro 5402 — i7, 16 GB RAM e SSD 512 GB`

**Resumo de uma frase**  
`Ideal para trabalho profissional, estudos avançados e multitarefa.`

**Três benefícios visíveis**

- Revisado e testado pela C7.
- 1 ano de garantia.
- Pronto para uso.

**CTA principal**  
`Tenho interesse neste computador`

**CTA secundário**  
`Comparar com outro`

### Evitar

- Exibir muitos detalhes antes do preço.
- Usar “Bom estado” sem explicar o que isso significa.
- Deixar o cliente descobrir sozinho se serve para estudo, trabalho ou jogos.

## Prioridade comercial 2 — Transformar o assistente em captador de oportunidade

O assistente já pergunta objetivo, mobilidade, orçamento e prioridade. O próximo passo comercial deve ser:

1. recomendar até três produtos;
2. explicar por que cada um combina com a pessoa;
3. mostrar o melhor custo-benefício;
4. gerar uma mensagem de WhatsApp com as respostas do cliente;
5. permitir solicitar uma configuração personalizada quando nada servir.

Exemplo de mensagem:

> Olá, C7! Procuro um notebook para trabalho, com mobilidade, até R$ 2.500. Aceito a recomendação do catálogo e gostaria de saber as opções disponíveis.

Isso transforma uma ferramenta de navegação em um **lead qualificado**.

## Prioridade comercial 3 — Instrumentar todos os contatos

Medir pelo menos:

- clique em “Tenho interesse”;
- clique em WhatsApp do cabeçalho;
- compartilhamento de produto;
- cópia do link;
- abertura de detalhes;
- uso do assistente;
- conclusão do assistente;
- comparação iniciada;
- produto mais clicado;
- filtros mais usados;
- card baixado pelo painel.

Sem esses dados, a empresa não sabe se vende mais por preço, marca, configuração ou campanha.

## Prioridade comercial 4 — Criar campanhas por finalidade

Em vez de divulgar somente “notebooks disponíveis”, criar chamadas por necessidade:

- **Notebooks para estudo**;
- **Computadores para trabalho**;
- **Opções até R$ 1.500**;
- **Máquinas para edição**;
- **Desktops para jogos**;
- **Equipamentos com 1 ano de garantia**.

Cada campanha deve levar para um filtro ou seleção específica, não apenas para a home genérica.

## Prioridade comercial 5 — Melhorar confiança

Adicionar uma seção curta e objetiva com:

- como os equipamentos são revisados;
- o que a garantia cobre;
- formas de pagamento aceitas;
- retirada ou entrega;
- localização/atendimento;
- como funciona o suporte pós-venda.

A garantia deve aparecer, mas sem repetir a mesma mensagem em excesso.

## Prioridade comercial 6 — Criar prova social real

Quando houver autorização dos clientes, incluir:

- avaliações curtas;
- fotos de clientes com o equipamento;
- quantidade de equipamentos vendidos ou atendidos;
- empresas atendidas;
- depoimentos sobre suporte.

Não inventar números nem depoimentos. Começar com três relatos reais já é suficiente.

## Prioridade comercial 7 — Criar uma rotina de estoque comercial

Toda semana, revisar:

- produtos sem foto;
- produtos sem preço;
- produtos com poucos cliques;
- produtos mais acessados sem contato;
- produtos parados há mais tempo;
- produtos com desconto possível;
- produtos recém-cadastrados.

Para cada produto parado, escolher uma ação: melhorar foto, reduzir preço, criar card, alterar chamada ou retirar da vitrine.

---

## 4. Plano recomendado em fases

### Fase A — Segurança e conversão básica

1. SEO server-side individual com Open Graph.
2. Eventos de WhatsApp, compartilhamento e assistente.
3. Transação para locação e retorno.
4. Regra de acesso para dados de locação.
5. Bloqueio de publicação de produto incompleto.
6. Teste de abertura de link individual em WhatsApp.

### Fase B — Venda assistida

1. Ficha comercial com “ideal para”.
2. Recomendação do assistente em até três opções.
3. Mensagem de WhatsApp baseada no questionário.
4. Campanhas por finalidade e faixa de preço.
5. Informações de pagamento, entrega e suporte.

### Fase C — Operação do vendedor

1. Consolidar CSS do painel com testes visuais de referência.
2. Cadastro rápido com etapas.
3. Rascunho local seguro.
4. Alertas de estoque incompleto e produto parado.
5. Exportação de relatório comercial simples.

### Fase D — Inteligência comercial

1. Ticket médio e vendas por categoria.
2. Produtos mais vistos e mais compartilhados.
3. Conversão de clique em WhatsApp por produto.
4. Comparação entre campanhas.
5. Sugestão de preço baseada no histórico interno, se desejado.

---

## 5. O que eu não recomendo fazer agora

- Adicionar mais filtros antes de medir o uso dos filtros atuais.
- Criar um checkout completo enquanto a operação fecha pelo WhatsApp.
- Refazer toda a identidade visual.
- Reescrever todo o CSS em uma única grande mudança.
- Adicionar urgência artificial, contadores falsos ou avaliações inventadas.
- Criar controle financeiro completo, já que o foco declarado é estoque e venda de equipamentos.

## Conclusão

O catálogo já está em nível suficiente para vender. O próximo salto não é visual; é de **confiabilidade e conversão**. A ordem mais inteligente é:

1. garantir que cada link compartilhado mostre o produto correto;
2. evitar inconsistências em locação e estoque;
3. medir quais produtos geram interesse;
4. melhorar a ficha comercial e a recomendação;
5. usar os dados para criar campanhas melhores.

Isso reduz retrabalho no painel e aumenta a chance de cada visitante virar uma conversa qualificada no WhatsApp.
