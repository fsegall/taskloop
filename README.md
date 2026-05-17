# TaskLoop

> Pagamentos automatizados para colaboração entre humanos e IA.

TaskLoop é uma plataforma onde agentes de IA podem distribuir microtarefas para humanos e executar pagamentos automáticos após a validação das respostas utilizando a infraestrutura da Stellar.

O projeto está sendo desenvolvido durante a aceleração **Stellar 37º** com foco em:

- colaboração humano-IA
- micropagamentos globais
- integração com Telegram
- pagamentos automatizados
- arquitetura baseada em agentes
- APIs monetizadas via x402

---

## Visão geral

O crescimento da IA generativa aumentou significativamente a necessidade de validação humana em fluxos como:

- classificação de dados
- revisão de respostas
- moderação
- validação de conteúdo
- treinamento supervisionado

Hoje, grande parte desse trabalho é intermediado por plataformas centralizadas com:

- pagamentos lentos
- onboarding complexo
- baixa acessibilidade global
- pouca flexibilidade
- altos custos operacionais

O TaskLoop propõe um novo fluxo:

1. Empresas ou sistemas de IA criam tarefas.
2. Agentes distribuem tarefas para usuários.
3. Usuários executam microtarefas pelo celular.
4. Um agente de validação aprova ou rejeita a resposta.
5. O sistema executa pagamentos automáticos via Stellar.

---

## Objetivo do MVP

O MVP atual busca validar:

- distribuição de tarefas
- fluxo human-in-the-loop
- validação automatizada por agentes
- micropagamentos via Stellar Testnet
- integração inicial com Anchors
- monetização de APIs via x402

---

## Estrutura do repositório

```text
TaskLoop/
  README.md
  sandbox/
  taskloop-poc/
```

### Onde está o projeto principal

O POC principal desta entrega está em:

- `taskloop-poc/`

Documentação principal:

- `taskloop-poc/README.md`
- `taskloop-poc/docs/architecture.md`
- `taskloop-poc/docs/sprint2-delivery.md`
- `taskloop-poc/docs/anchor-etherfuse.md`
- `taskloop-poc/docs/x402-e2e-run.md`

---

## Stack demonstrada nesta entrega

- **Stellar Testnet** para payout real
- **x402 mínimo funcional** com `402 Payment Required`
- **Anchor / Etherfuse** estruturado como adapter
- **fallback mockado explícito** quando a integração externa ainda não está pronta

### Observação sobre Etherfuse

A integração com Etherfuse foi implementada como adapter no backend.

Nesta sprint, ela ficou documentada e operando em modo mock, porque a ativação real depende de credenciais obtidas via onboarding / bank account da Etherfuse, fluxo que ainda não conseguimos concluir para o nosso contexto no Brasil.

---

## Próximo passo para leitura

Para a visão completa do POC, leia:

- `taskloop-poc/README.md`

---

## Equipe

Projeto desenvolvido durante a aceleração Stellar 37º.

- Felipe Segall
- Paulo Marinato
- Conrado Niemeyer
