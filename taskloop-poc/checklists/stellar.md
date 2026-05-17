# Checklist Stellar — Sprint 2

Ordem de execução recomendada para a Sprint 2:

## 1. Portar a lógica da Sprint 1 para o backend TypeScript
- [x] Revisar `sandbox/first_transaction.py` e listar os passos equivalentes no backend.
- [x] Escolher o SDK Node/TypeScript para Stellar Testnet.
- [x] Confirmar uso de `Asset.native()` / XLM como fluxo principal do POC.
- [x] Definir quais dados do pagamento precisam voltar para a API:
  - [x] `provider`
  - [x] `status`
  - [x] `txHash`
  - [x] `processedAt`

## 2. Preparar variáveis de ambiente do backend
- [ ] Manter `PORT=3000`.
- [x] Manter `STELLAR_NETWORK=testnet`.
- [x] Manter `STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org`.
- [x] Adicionar `STELLAR_SOURCE_SECRET=`.
- [x] Adicionar `STELLAR_SOURCE_PUBLIC=`.
- [x] Verificar nomenclatura dos webhooks no código:
  - [x] `TASK_AGENT_WEBHOOK_URL`
  - [x] `VALIDATION_AGENT_WEBHOOK_URL`
- [x] Decidir se `CREWAI_*` ficará apenas como nomenclatura futura/roadmap.

## 3. Implementar cliente Stellar real no backend
Arquivo alvo principal:
- `apps/api/src/services/stellar.ts`

Checklist:
- [x] Remover o mock atual como implementação principal.
- [x] Criar cliente real para Horizon Testnet.
- [x] Carregar conta-fonte usando `STELLAR_SOURCE_PUBLIC`.
- [x] Assinar transação com `STELLAR_SOURCE_SECRET`.
- [x] Enviar pagamento XLM real para a `walletAddress` da submission.
- [x] Incluir memo identificando task/submission.
- [x] Retornar `txHash` real da transação.
- [x] Tratar falhas de Horizon/rede com mensagens claras.
- [x] Manter possibilidade de fallback mockado, se necessário para segurança da demo.

## 4. Integrar o payout automático ao fluxo da task
Arquivos principais:
- `apps/api/src/services/payout-service.ts`
- `apps/api/src/routes/tasks.ts`

Checklist:
- [x] Aprovação já dispara payout automático.
- [x] Confirmar que o payout automático usa o cliente Stellar real.
- [x] Confirmar persistência de:
  - [x] `submission.payout`
  - [x] `submission.payoutId`
  - [x] `submission.txHash`
  - [x] `task.payouts[]`
  - [x] `task.status`
- [x] Validar fallback de retry via `POST /tasks/:id/payout`.

## 5. Criar um script TypeScript equivalente ao da Sprint 1
Objetivo:
Reproduzir localmente uma transação real em Testnet fora do fluxo completo da API.

Checklist:
- [x] Criar script em `scripts/` para pagamento Testnet via Node/TS.
- [x] Reutilizar as mesmas envs do backend.
- [x] Financiar conta de teste via Friendbot quando aplicável.
- [x] Imprimir `txHash`.
- [x] Imprimir link do explorer.
- [x] Confirmar que o script funciona isoladamente.

## 6. Testar o fluxo ponta a ponta local
Ambiente esperado:
- frontend em `http://localhost:8080`
- API em `http://localhost:3000`

Checklist:
- [x] Criar task pelo frontend ou API.
- [x] Acionar `send`.
- [x] Simular `submit` com `walletAddress` válida.
- [x] Acionar `approve`.
- [x] Confirmar pagamento real na Testnet.
- [x] Confirmar `txHash` exibido no frontend.
- [x] Abrir a transação no explorer e validar.

## 7. Implementar x402 mínimo funcional
Objetivo:
Usar HTTP `402 Payment Required` com prova de pagamento em Stellar Testnet.

Checklist:
- [x] Criar rota dedicada: `POST /x402/distribution/unlock`.
- [x] Responder `402 Payment Required` sem prova de pagamento.
- [x] Retornar instruções de pagamento:
  - [x] `amount`
  - [x] `destination`
  - [x] `memo` ou `requestId`
  - [x] `asset`
- [x] Implementar cliente/script de teste para consumir a rota.
- [x] Reenviar requisição com `txHash` após pagamento.
- [x] Consultar Horizon para verificar a transação.
- [x] Validar destino, valor e memo antes de liberar o recurso.
- [x] Retornar `200` quando a prova for válida.

## 8. Estruturar integração Anchor / Etherfuse como adapter
Objetivo:
Não bloquear a demo principal por possível instabilidade do sandbox.

Checklist:
- [x] Preencher adapter Etherfuse em `apps/api/src/services/etherfuse-adapter.ts`.
- [x] Definir interface mínima do adapter:
  - [x] criar quote
  - [x] criar payout/order
  - [x] consultar status
- [ ] Usar integração real se o sandbox responder.
- [x] Implementar fallback mockado com o mesmo contrato.
- [x] Documentar claramente quando o fluxo estiver mockado.

Observação desta sprint:
- [x] Implementação mantida em modo mock por ausência de credenciais reais da Etherfuse.
- [x] Limitação documentada: fluxo atual de onboarding / bank account não pôde ser concluído para o nosso contexto no Brasil.
- [ ] Validar credenciais reais em sprint futura.

## 9. Alinhar documentação e discurso da entrega
- [ ] Atualizar `.env.example` com as variáveis reais usadas.
- [x] Ajustar README se necessário.
- [x] Registrar que o payout principal da Sprint 2 ocorre em Stellar Testnet real.
- [x] Registrar que Anchor/Etherfuse está estruturado via adapter.
- [x] Registrar que CrewAI ficou em roadmap e os agentes do POC são simples/local-first.
- [x] Registrar que o x402 usa `402 Payment Required` + verificação de pagamento na Testnet.

## 10. Checklist final para demo
- [x] Frontend local funcionando.
- [x] API local funcionando.
- [x] Task Agent funcional.
- [x] Validation Agent funcional.
- [x] Pagamento automático funcional.
- [x] `txHash` real disponível.
- [x] Explorer abrindo a transação.
- [x] Rota x402 respondendo `402`.
- [x] Prova de pagamento liberando recurso premium.
- [x] Anchor documentado como adapter real/mock conforme disponibilidade.

## Frase-guia da Sprint 2
Após a resposta humana ser validada por agente, o sistema executa automaticamente o pagamento.
