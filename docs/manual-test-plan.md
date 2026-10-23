# Roteiro de testes manuais (E2E)

Bateria completa para validar a aplicação à mão, na mesma ordem dos fluxos do desafio.
Marque `[x]` em cada caso aprovado e anote o que divergir.

## Preparação

1. `npm install` e depois `npm run dev`. O app abre em <http://localhost:5173>.
2. Use o **Google Chrome**. O painel de navegador embutido do app Claude não registra service
   workers, então o MSW não funciona nele.
3. Abra o DevTools (F12). Você vai usar:
   - **Console**: comandos `__kurioMock` (lista abaixo);
   - **Device toolbar** (Ctrl/Cmd + Shift + M): larguras **390**, **768** e **1440**;
   - **Application → Local Storage**: inspecionar `kurio.*`.
4. **Estado limpo** antes de cada bloco: acesse `/?mock-reset`, que restaura os dados iniciais.
5. **Cenário**: acesse `/?scenario=<nome>` ou rode `__kurioMock.setScenario('<nome>')` no console.
   Volte com `__kurioMock.setScenario('default')`.

### Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana Lima | `ana@kurio.test` | `Kurio2026` |
| Bruno Costa | `bruno@kurio.test` | `Colecao2026` |

Cupons: `KURIO10` (10%), `GENESIS` (0.05 ETH), `VERAO2025` (expirado). Qualquer outro código é inválido.

### Comandos úteis no console

```js
__kurioMock.reset()                                   // restaura os dados iniciais
__kurioMock.setScenario('slow')                       // troca o cenário (ver docs/api.md)
__kurioMock.updateNft('ivory-baron-088', { price: '1.99' })                      // preço muda via Socket.IO
__kurioMock.updateNft('emerald-ape-042', { editions: { 'emerald-ape-042:1-50': 0 } }) // edição esgota
__kurioMock.expireSessions()                          // expira todas as sessões
__kurioMock.dropConnections()                         // derruba o socket (reconecta sozinho)
__kurioMock.replayEvent()                             // reenvia o último evento (duplicado)
__kurioMock.settlePendingOrders()                     // resolve pedidos pendentes agora
```

---

## 1. Início: catálogo, busca, filtros e URL

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 1.1 | Abrir `/` em 1440px | Hero com destaque, filtros à esquerda, grade 3×3 e paginação 1–4 | [ ] |
| 1.2 | Marcar **Música** e depois **Polygon** | URL ganha `collection` e `network`; só 2 NFTs aparecem; os contadores se ajustam | [ ] |
| 1.3 | Ordenar por **Menor preço** | Golden Frequency antes de Golden Beat; `sort=price-asc` na URL | [ ] |
| 1.4 | Botão **Voltar** do navegador duas vezes | A ordenação e depois o filtro de rede são desfeitos, e os checkboxes acompanham | [ ] |
| 1.5 | Ir para a **página 3** e marcar um filtro | A paginação volta para a página 1 (`page` sai da URL) | [ ] |
| 1.6 | Voltar para a página 3 e dar **F5** | Continua na página 3, com os mesmos itens | [ ] |
| 1.7 | Lupa do header → buscar `golden` | 3 resultados e o chip “golden” removível | [ ] |
| 1.8 | Faixa de preço: arrastar e **Aplicar** | `minPrice` e `maxPrice` na URL; o chip de preço aparece | [ ] |
| 1.9 | **Limpar filtros** | Volta ao catálogo completo | [ ] |
| 1.10 | Abas **Novos lançamentos** e **Em alta** | Resultados mudam; aba ativa sublinhada e anunciada como página atual | [ ] |
| 1.11 | `/?page=abc&sort=zzz` | Página carrega normalmente, ignorando os parâmetros inválidos | [ ] |
| 1.12 | Em 390px, digitar `em` na busca | Resultados filtram depois de uma pausa curta; o Voltar não guarda uma entrada por letra | [ ] |
| 1.13 | Em 390px, botão de filtros | Drawer abre por baixo, com o foco preso dentro; Esc fecha e o foco volta ao botão | [ ] |
| 1.14 | Em 768px | Barra lateral vira o botão **Filtros**; sem rolagem horizontal | [ ] |

## 2. Carregamento, vazio, erro e respostas fora de ordem

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 2.1 | `/?scenario=slow` | Skeletons com brilho animado no lugar dos cards e do hero, sem pulos de layout | [ ] |
| 2.2 | Sistema com **reduzir movimento** ligado (ou DevTools → Rendering → prefers-reduced-motion) | Skeletons sem animação | [ ] |
| 2.3 | `/?scenario=empty` | “Nenhum NFT encontrado” | [ ] |
| 2.4 | `/?scenario=catalog-unavailable` | Depois das novas tentativas automáticas: “Não foi possível carregar o catálogo” e **Tentar novamente** | [ ] |
| 2.5 | `setScenario('default')` e clicar em **Tentar novamente** | Catálogo carrega | [ ] |
| 2.6 | `/?scenario=catalog-error` | Carrega sozinho depois de 2 falhas (retry automático) | [ ] |
| 2.7 | `/?scenario=out-of-order`, em 390px digitar `eme` rápido | O resultado final corresponde a `eme`, mesmo com respostas antigas chegando depois | [ ] |
| 2.8 | `/?scenario=offline` | Erro de conexão; o header mostra “Reconectando…” | [ ] |
| 2.9 | Trocar filtros no cenário `slow` | Resultados anteriores ficam esmaecidos com “Atualizando…” até os novos chegarem | [ ] |

## 3. Detalhe do NFT

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 3.1 | Acessar `/nft/emerald-ape-042` direto | Galeria, edições, preço, abas e “Mais desta coleção” | [ ] |
| 3.2 | `/nft/nao-existe` | “NFT não encontrado” e link para o catálogo | [ ] |
| 3.3 | `/nft/emerald-ape-042?edicao=1-1` | Edição 1/1 riscada; “Edição indisponível”; **Comprar** desabilitado | [ ] |
| 3.4 | Edição **1/10**, clicar **+** várias vezes | Para em 3 (estoque) | [ ] |
| 3.5 | Miniaturas e lupa | Imagem troca; zoom abre em diálogo e fecha com Esc | [ ] |
| 3.6 | Com a página aberta: `updateNft('emerald-ape-042', { price: '1.49' })` | Preço vira 1.49 ETH com “Preço atualizado agora” | [ ] |
| 3.7 | Setas ← → nas edições (teclado) | A seleção muda e a URL `edicao` acompanha | [ ] |
| 3.8 | Em 390px | Barra superior (voltar, zoom, coração) e barra de compra fixa; sem tab bar | [ ] |

## 4. Cadastro, login e sessão

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 4.1 | Deslogado, acessar `/checkout` | Vai para o login com `redirect=/checkout` | [ ] |
| 4.2 | Enviar o login vazio | Erros abaixo dos campos e foco no primeiro inválido | [ ] |
| 4.3 | Senha errada | Alerta “E-mail ou senha incorretos.” | [ ] |
| 4.4 | Login correto (Ana) | Volta para `/checkout` | [ ] |
| 4.5 | Logado, acessar `/login` | Redireciona para o destino (ou `/`) | [ ] |
| 4.6 | Cadastro com usuário `x`, senha `abc` e confirmação diferente | Erros de cada campo, incluindo “As senhas não coincidem” | [ ] |
| 4.7 | Cadastro com `ana@kurio.test` | “Este e-mail já está cadastrado.” no campo | [ ] |
| 4.8 | Cadastro com usuário `ana.lima` | “Este nome de usuário já está em uso.” | [ ] |
| 4.9 | Cadastro válido | Logado com o novo usuário no header | [ ] |
| 4.10 | Logado, dar **F5** | Sessão continua | [ ] |
| 4.11 | Numa tela privada, rodar `expireSessions()` e fazer qualquer ação | Login com “Sua sessão expirou”; depois de entrar, volta à mesma tela | [ ] |
| 4.12 | `/?scenario=session-expired`, logar e esperar 20s numa tela privada | Mesmo comportamento do 4.11, sem precisar de ação | [ ] |
| 4.13 | `/login?redirect=https://google.com`, logar | Fica no Kurio (vai para `/`) | [ ] |
| 4.14 | Logout (Perfil → **Sair**) numa tela privada | Vai para `/`; `kurio.session` some do localStorage | [ ] |
| 4.15 | Trocar de usuário (Ana → sair → Bruno) | Nada da Ana aparece: carrinho, favoritos e pedidos | [ ] |
| 4.16 | Duas abas logadas; sair em uma | A outra percebe e limpa os dados privados | [ ] |
| 4.17 | Em 390px, `/login` | Página inteira com o logo KURIO, sem header nem tab bar | [ ] |

## 5. Favoritos

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 5.1 | Deslogado, clicar no coração | Vai para o login | [ ] |
| 5.2 | Logado, favoritar no detalhe | Botão vira “Favoritado” na hora; persiste após F5 | [ ] |
| 5.3 | `setScenario('favorite-error')` e favoritar | O coração muda e **volta** sozinho, com aviso de erro (rollback) | [ ] |

## 6. Carrinho

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 6.1 | Deslogado, adicionar 2 itens e dar F5 | Carrinho mantido | [ ] |
| 6.2 | Fazer login | Os itens de visitante continuam no carrinho | [ ] |
| 6.3 | Clicar **+** 3× rápido | Um único PATCH (aba Network) com o valor final; total recalculado pela API | [ ] |
| 6.4 | Remover um item | Aviso, e foco vai para o título “Carrinho” | [ ] |
| 6.5 | Cupom `NADA` / `VERAO2025` | “inválido” / “expirou” abaixo do campo | [ ] |
| 6.6 | Cupom `KURIO10` | Desconto e total novos; dá para remover | [ ] |
| 6.7 | Com o carrinho aberto: `updateNft('ivory-baron-088', { price: '1.99' })` | Aviso, “Preço alterado” na linha, botão de finalizar bloqueado até **Aceitar novos preços** | [ ] |
| 6.8 | Esgotar uma edição do carrinho via `updateNft` | Mensagem de estoque e finalizar bloqueado até ajustar | [ ] |
| 6.9 | Remover tudo | “Seu carrinho está vazio” | [ ] |
| 6.10 | Em 390px | Cards no lugar da tabela; resumo abaixo | [ ] |

## 7. Pagamento e confirmação

Logue como Ana com itens no carrinho e vá em **Conectar e finalizar**.

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 7.1 | Abrir `/checkout` | Formulário pré-preenchido; carteira MetaMask selecionada; resumo igual ao do carrinho | [ ] |
| 7.2 | Apagar “Nome de exibição” e **Confirmar compra** | Erro no campo, com foco | [ ] |
| 7.3 | **Confirmar compra** sem conectar | “Conecte a carteira selecionada antes de confirmar.” | [ ] |
| 7.4 | `setScenario('wallet-rejected')` → **Conectar carteira** | “A carteira recusou a conexão” e **Tentar de novo** | [ ] |
| 7.5 | Voltar ao `default` e conectar; trocar a rede para Polygon | Conexão cai; taxa muda para 0.002 ETH | [ ] |
| 7.6 | Conectar → **Confirmar compra** → **Confirmar e pagar** (duplo clique) | Um único `POST /orders`; tela “Aguardando confirmação da rede” | [ ] |
| 7.7 | Aguardar | Recibo igual ao Figma: ID da transação, data, itens, taxa, total, “Ver no Etherscan” | [ ] |
| 7.8 | Ver o carrinho | Só os itens comprados saíram | [ ] |
| 7.9 | `updateNft` no item comprado e dar F5 no recibo | Valores do recibo não mudam | [ ] |
| 7.10 | `setScenario('price-change')` e confirmar | “Os valores do pedido mudaram” com total antigo e novo; aceitar e confirmar de novo | [ ] |
| 7.11 | `setScenario('sold-out')` e confirmar | “Algum item ficou indisponível” com link para o carrinho | [ ] |
| 7.12 | `setScenario('order-timeout')` e confirmar | Depois de ~15s, “Verificando…” e então o mesmo pedido, sem duplicar | [ ] |
| 7.13 | `setScenario('payment-declined')` e confirmar | “Pagamento recusado”; carrinho intacto; **Tentar novamente** | [ ] |
| 7.14 | Pedido pendente (`setScenario('default', { paymentDelayMs: 60000 })`): dar F5 | Continua “Aguardando…” | [ ] |
| 7.15 | Ainda pendente: `setScenario('offline'); dropConnections()` | “Sem conexão em tempo real: verificando periodicamente” | [ ] |
| 7.16 | `settlePendingOrders(); setScenario('default')` | Recibo aparece sozinho depois da reconexão | [ ] |
| 7.17 | Com pedido pendente, abrir `/checkout` | Banner “pedido aguardando confirmação” ou ida direta ao pedido; nunca uma 2ª compra | [ ] |
| 7.18 | Digitar uma observação → `expireSessions()` → ação → login | Volta ao checkout com a observação preservada | [ ] |
| 7.19 | Abrir o pedido da Ana logado como Bruno | “Este pedido pertence a outra conta”, sem dados | [ ] |
| 7.20 | `/orders/ord_inexistente` | “Pedido não encontrado” | [ ] |

## 8. Tempo real (Socket.IO)

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 8.1 | Catálogo aberto: `updateNft('sage-nomad-009', { price: '2.10' })` | Preço do card muda sem recarregar | [ ] |
| 8.2 | `replayEvent()` | Nada muda (duplicado ignorado) | [ ] |
| 8.3 | `dropConnections()` | “Reconectando…” no header por instantes, depois some | [ ] |
| 8.4 | Durante a desconexão (`setScenario('offline')`), mudar um preço e voltar ao `default` | Ao reconectar, o preço novo aparece (reconciliação via REST) | [ ] |
| 8.5 | `setScenario('live-market')` com item no carrinho | A cada 20s o preço muda e o carrinho avisa | [ ] |

## 9. Perfil e carteiras

> Telas em desenvolvimento. Os casos serão adicionados quando estiverem prontas.

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 9.1 | Editar nome, usuário e e-mail; F5 | Alterações persistem | [ ] |
| 9.2 | Usuário/e-mail de outro usuário | Erro de conflito no campo | [ ] |
| 9.3 | Avatar: enviar e remover | Aparece no header; some ao remover | [ ] |
| 9.4 | Senha atual errada / nova senha fraca | Erros nos campos | [ ] |
| 9.5 | Cadastrar e editar carteira principal e secundária | Validação de endereço 0x; aparecem no checkout | [ ] |

## 10. Acessibilidade e responsividade

| # | Passos | Esperado | OK |
| --- | --- | --- | --- |
| 10.1 | Na Início, apertar **Tab** uma vez | “Pular para o conteúdo” aparece; Enter leva ao conteúdo | [ ] |
| 10.2 | Navegar só com Tab/Shift+Tab/Enter/Espaço por catálogo → detalhe → carrinho → checkout | Tudo alcançável, com foco sempre visível | [ ] |
| 10.3 | Diálogos (login, busca, zoom, revisão) | Foco preso dentro; Esc fecha; foco volta ao botão de origem | [ ] |
| 10.4 | Leitor de tela (VoiceOver: Cmd+F5) num erro de formulário | O erro é lido junto com o campo | [ ] |
| 10.5 | Aviso de preço alterado / pedido confirmado | Anunciado pelo leitor de tela (região “Notificações”) | [ ] |
| 10.6 | Zoom do navegador em 200% | Nenhum conteúdo cortado nem rolagem horizontal | [ ] |
| 10.7 | 390, 768 e 1440 em todas as telas | Sem rolagem horizontal; layout coerente | [ ] |
| 10.8 | Links fora do escopo (Criadores, Aprenda, Google, “Esqueceu a senha?”) | Página “Em breve”, dizendo que nada foi executado | [ ] |
| 10.9 | Newsletter | Aviso “indisponível”, sem fingir sucesso | [ ] |

## Registro de execução

| Data | Navegador | Resultado | Observações |
| --- | --- | --- | --- |
| | | | |
