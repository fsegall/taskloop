# Checklist Telegram — Sprint 2

Objetivo:
Estruturar a trilha de distribuição e recebimento de tarefas via Telegram sem bloquear a demo principal caso o adapter continue mockado nesta fase.

## 1. Confirmar contrato atual do fluxo
- [x] Confirmar que o canal-alvo do POC é Telegram.
- [x] Confirmar que o envio de task hoje passa pelo `Task Agent`.
- [x] Confirmar que a API já chama o adapter de Telegram em `POST /tasks/:id/send`.
- [x] Confirmar que o estado de envio fica persistido em `task.distribution`.
- [x] Confirmar que o envio atual está mockado para confiabilidade da demo.

## 2. Revisar envs e configuração
- [ ] Confirmar uso de `TELEGRAM_BOT_TOKEN` no adapter real.
- [ ] Definir se será necessário `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` ou equivalente.
- [ ] Documentar claramente quais envs são obrigatórias no modo real.
- [ ] Manter comportamento seguro quando as envs não estiverem configuradas.

## 3. Implementar envio real do bot
Arquivo alvo principal:
- `apps/api/src/services/telegram.ts`

Checklist:
- [ ] Manter a interface `TelegramService` como contrato principal.
- [ ] Implementar cliente real da API do Telegram Bot.
- [ ] Receber destino(s) de envio de forma compatível com o POC.
- [ ] Enviar a mensagem preparada pelo `Task Agent`.
- [ ] Retornar recibo com `messageId`, `recipientCount`, `sentAt` e `simulated=false`.
- [ ] Tratar falhas de rede/API do Telegram com mensagens claras.
- [ ] Manter fallback mockado quando o bot real não estiver configurado.

## 4. Estruturar recebimento de respostas
Arquivos principais:
- `apps/api/src/routes/telegram.ts`
- `apps/api/src/services/telegram.ts`

Checklist:
- [ ] Definir formato mínimo do webhook do Telegram para o POC.
- [ ] Validar origem/autorização do webhook quando aplicável.
- [ ] Extrair usuário, handle e conteúdo da mensagem recebida.
- [ ] Mapear a resposta recebida para o fluxo de `submission` da task.
- [ ] Definir como a task será identificada na mensagem recebida.
- [ ] Tratar mensagens inválidas ou sem contexto de task.

## 5. Integrar ao lifecycle da task
- [ ] Confirmar que o envio real continua funcionando com `POST /tasks/:id/send`.
- [ ] Confirmar que respostas recebidas via Telegram criam `submission` válida.
- [ ] Confirmar compatibilidade com validação automática.
- [ ] Confirmar compatibilidade com payout automático após aprovação.
- [ ] Garantir que o fluxo mockado continue disponível para demo local se necessário.

## 6. Testes locais e demo
- [ ] Enviar uma task real para o Telegram.
- [ ] Receber uma resposta real do usuário no bot.
- [ ] Confirmar criação da submission na API.
- [ ] Confirmar que a task muda para `submitted`.
- [ ] Confirmar que o restante do lifecycle continua funcionando.
- [ ] Decidir se a demo final usará Telegram real ou mock documentado.

## 7. Documentação
- [ ] Atualizar `.env.example` se novas envs forem necessárias.
- [ ] Registrar no README/docs se Telegram está real ou mockado.
- [ ] Explicar claramente o fallback utilizado na demo, se houver.

## Frase-guia da trilha Telegram
A task é distribuída por adapter compatível com Telegram, sem acoplar a demo principal à disponibilidade do bot em tempo real.
