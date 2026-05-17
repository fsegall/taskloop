# Checklist Telegram — Sprint 2 + Próximas Sprints

Objetivo:
Estruturar a trilha de distribuição e recebimento de tarefas via Telegram, detalhando o estado atual e o plano de implementação real com BotFather nas próximas sprints.

---

## Status na Sprint 2

Na Sprint 2, o canal Telegram está **estruturado como adapter mockado**.

O fluxo completo de task lifecycle (criar → enviar → receber submission → validar → pagar) já funciona ponta a ponta no backend e no frontend. O envio e recebimento via Telegram são simulados pelo adapter para garantir confiabilidade da demo sem depender de infraestrutura externa.

Essa decisão foi deliberada: o foco da Sprint 2 foi consolidar **payout real em Stellar Testnet**, **x402** e **Anchor/Etherfuse**. O Telegram ficou preparado como adapter pronto para ser substituído por implementação real.

---

## 1. Contrato atual do fluxo (Sprint 2 — concluído)
- [x] Canal-alvo do POC é Telegram.
- [x] Envio de task passa pelo `Task Agent`.
- [x] API chama o adapter de Telegram em `POST /tasks/:id/send`.
- [x] Estado de envio fica persistido em `task.distribution`.
- [x] Envio mockado para confiabilidade da demo.
- [x] Interface `TelegramService` definida como contrato do adapter.
- [x] Fallback mockado retorna `simulated: true` com recibo completo.

---

## 2. Plano de implementação real — BotFather (próximas sprints)

A implementação real será feita com a **Telegram Bot API** usando um bot registrado via **BotFather**.

### 2.1. Criação do bot

- [ ] Registrar bot no BotFather (`/newbot`).
- [ ] Definir nome e username do bot (ex: `@TaskLoopBot`).
- [ ] Salvar `TELEGRAM_BOT_TOKEN` gerado pelo BotFather.
- [ ] Configurar descrição e avatar do bot via BotFather.

### 2.2. Configuração de ambiente

- [ ] `TELEGRAM_BOT_TOKEN` — token gerado pelo BotFather (obrigatório para modo real).
- [ ] `TELEGRAM_CHAT_ID` — ID do grupo ou canal onde as tasks serão publicadas.
- [ ] `TELEGRAM_WEBHOOK_URL` — URL pública do backend para receber updates (se usar webhook mode).
- [ ] `TELEGRAM_WEBHOOK_SECRET` — secret para validar origem dos webhooks.
- [ ] Manter comportamento seguro: sem token, o adapter continua em mock.

### 2.3. Responsabilidades do bot

O bot do TaskLoop terá as seguintes responsabilidades:

**Distribuição de tarefas:**
- Receber a mensagem formatada pelo Task Agent.
- Publicar a tarefa em um grupo/canal ou enviar diretamente para workers registrados.
- Incluir informações da tarefa: título, instruções, reward, currency.
- Retornar recibo real com `messageId`, `recipientCount`, `sentAt`, `simulated: false`.

**Recebimento de respostas (submissions):**
- Escutar mensagens dos workers no grupo ou em conversa direta com o bot.
- Identificar a qual task a resposta se refere (via reply, comando ou contexto).
- Extrair: usuário (`from.first_name`), handle (`from.username`), conteúdo da resposta (`text`).
- Criar submission na API via `POST /tasks/:id/submit`.
- Confirmar recebimento para o worker no Telegram.

**Notificações de status:**
- Notificar o worker quando sua submission for aprovada.
- Notificar o worker quando o pagamento for executado (com txHash).
- Notificar o worker se a submission for rejeitada (com motivo).

**Comandos planejados:**
- `/start` — registro do worker e boas-vindas.
- `/tasks` — listar tarefas disponíveis.
- `/status <taskId>` — ver status de uma tarefa.
- `/wallet <address>` — registrar wallet Stellar para receber pagamentos.
- `/help` — ajuda e instruções.

---

## 3. Implementar envio real do bot

Arquivo alvo principal:
- `apps/api/src/services/telegram.ts`

Checklist:
- [ ] Manter a interface `TelegramService` como contrato principal.
- [ ] Implementar `BotFatherTelegramService` usando a API do Telegram Bot.
- [ ] Usar `sendMessage` da Bot API para enviar tasks.
- [ ] Receber destino(s) de envio via `TELEGRAM_CHAT_ID` ou lista de workers.
- [ ] Enviar a mensagem preparada pelo `Task Agent` com formatação Markdown.
- [ ] Retornar recibo com `messageId`, `recipientCount`, `sentAt` e `simulated=false`.
- [ ] Tratar falhas de rede/API do Telegram com mensagens claras.
- [ ] Manter fallback mockado quando `TELEGRAM_BOT_TOKEN` não estiver configurado.

---

## 4. Estruturar recebimento de respostas

Arquivos principais:
- `apps/api/src/routes/telegram.ts`
- `apps/api/src/services/telegram.ts`

Checklist:
- [ ] Implementar endpoint de webhook para receber updates do Telegram.
- [ ] Validar origem do webhook via `TELEGRAM_WEBHOOK_SECRET`.
- [ ] Extrair `from.username`, `from.first_name`, `text` e `message_id`.
- [ ] Mapear a resposta para `POST /tasks/:id/submit` internamente.
- [ ] Identificar a task via reply à mensagem original ou via comando.
- [ ] Tratar mensagens inválidas ou sem contexto de task.
- [ ] Confirmar recebimento com mensagem de resposta no Telegram.

---

## 5. Integrar ao lifecycle da task
- [ ] Envio real funciona com `POST /tasks/:id/send`.
- [ ] Respostas recebidas via webhook criam `submission` válida.
- [ ] Compatível com validação automática.
- [ ] Compatível com payout automático após aprovação.
- [ ] Fallback mockado continua disponível para dev/demo local.

---

## 6. Testes e validação
- [ ] Enviar uma task real para o grupo/canal no Telegram.
- [ ] Receber uma resposta real de um worker via bot.
- [ ] Confirmar criação da submission na API.
- [ ] Confirmar que a task muda para `submitted`.
- [ ] Confirmar que validação + payout automático funcionam.
- [ ] Testar notificação de aprovação e pagamento.
- [ ] Gravar vídeo do fluxo completo: task → Telegram → resposta → payout.

---

## 7. Documentação
- [ ] Atualizar `.env.example` com envs do Telegram.
- [ ] Registrar no README se Telegram está real ou mockado.
- [ ] Documentar comandos disponíveis do bot.
- [ ] Documentar fluxo de onboarding do worker via `/start` e `/wallet`.

---

## Frase-guia da trilha Telegram

O Telegram é o canal-alvo para distribuição de tarefas e recebimento de respostas humanas. Na Sprint 2, o adapter está mockado para confiabilidade da demo. Nas próximas sprints, será implementado com um bot real via BotFather, cobrindo distribuição, recebimento de submissions, notificações de status e registro de wallets dos workers.
