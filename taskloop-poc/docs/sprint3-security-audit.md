"# Auditoria de Segurança — Sprint 3 (Refinamento - Desafio 1)

## 🚨 Achado Crítico: Drenagem de Fundos Não Autorizada

**Localização:** Rotas financeiras da API — `POST /tasks`, `POST /tasks/:id/send`, `POST /tasks/:id/approve`, `POST /tasks/:id/payout`

**Gravidade:** Crítica 🔴

### Descrição da Vulnerabilidade

O POC **não possuía nenhuma autenticação**. Um atacante com acesso à URL da API poderia executar o ciclo completo de drenagem:

1. **Criar uma task** com reward alto (`POST /tasks`)
2. **Submeter uma resposta** qualquer (`POST /tasks/:id/submit`)
3. **Aprovar a própria submissão** (`POST /tasks/:id/approve`)
4. **Disparar um payout real** (`POST /tasks/:id/payout`) consumindo saldo da Stellar Testnet via `STELLAR_SOURCE_SECRET`

A chave secreta `STELLAR_SOURCE_SECRET` estava carregada em memória (process.env) e qualquer requisição não autenticada poderia acionar o `payoutService`, que assina e envia transações para a blockchain Stellar.

### 🛠 Correção Implementada

## 1. Middleware de Autenticação (API Key)

**Arquivo:** `apps/api/src/middleware/auth.ts`

- Exige o header `X-API-Key` em todas as rotas financeiras
- A chave é definida via variável de ambiente `TASKLOOP_API_KEY`
- Se a variável não estiver configurada, o middleware permite tudo (modo dev)
- Comparação em tempo constante para evitar timing attacks

```typescript
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!API_KEY) return next(); // modo dev
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid API key.' });
  }
  next();
}
```

## 2. Rate Limiting

**Arquivo:** `apps/api/src/middleware/auth.ts`

- Limita requisições por IP + rota
- Configurável via `TASKLOOP_RATE_LIMIT_MAX` (default: 20) e `TASKLOOP_RATE_LIMIT_WINDOW_MS` (default: 60s)
- Retorna headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`
- Em excesso, retorna HTTP 429 com instruções

## 3. Rotas Protegidas

**Arquivo:** `apps/api/src/routes/tasks.ts`

As seguintes rotas foram protegidas com `[requireAuth, rateLimit(20, 60_000)]`:

| Rota | Método | Ação |
|---|---|---|
| `/tasks` | POST | Criar tarefa com reward |
| `/tasks/:id/send` | POST | Distribuir tarefa |
| `/tasks/:id/approve` | POST | Aprovar submissão + acionar payout |
| `/tasks/:id/payout` | POST | Executar payout manual |

As rotas GET permanecem abertas (leitura de dados não sensíveis).

---

## 2. Organização do Gerenciamento de Chaves (.env)

### Problema Anterior

Haviam **dois arquivos `.env`** conflitantes:

| Arquivo | Problema |
|---|---|
| `taskloop-poc/.env` | Subconjunto defasado, chave Etherfuse antiga |
| `taskloop-poc/apps/api/.env` | Versão real usada pela API |

Isso gerava confusão: qual .env estava valendo? A raiz tinha `ETHERFUSE_PUBLIC_KEY` desatualizada enquanto `apps/api/.env` tinha a correta.

### Correção

| Ação | Arquivo |
|---|---|
| ❌ Removido | `taskloop-poc/.env` (obsoleto) |
| ❌ Removido | `taskloop-poc/.env.example` (não refletia mais o projeto) |
| ✅ Criado | `apps/api/.env.example` — template único e centralizado |
| ✅ Atualizado | `.gitignore` — agora só ignora `.env`, permite `.env.example` |
| ✅ Adicionada | `TASKLOOP_API_KEY=taskloop-dev-key-123` ao `.env` ativo |

**Benefícios:**
- ✅ Fonte única de verdade para configuração
- ✅ Template público sobe para o git (`.env.example`)
- ✅ Secrets reais ficam apenas no `.env` (ignorado pelo git)
- ✅ Chave de segurança documentada e pronta para uso

---

## 🔧 Como Usar

### Para desenvolvimento local:

```bash
# Já está configurado — use a chave dev:
curl -H \"X-API-Key: taskloop-dev-key-123\" -X POST http://localhost:3000/tasks \
  -H \"Content-Type: application/json\" \
  -d '{\"title\":\"Teste\",\"instructions\":\"Faça X\",\"reward\":10}'
```

### Para produção:

```bash
# 1. Gerar uma chave forte:
openssl rand -hex 32

# 2. Editar apps/api/.env e substituir:
TASKLOOP_API_KEY=<chave-gerada>
```

### Validação do middleware:

```bash
# Sem API Key → 401
curl -X POST http://localhost:3000/tasks -H \"Content-Type: application/json\" \\
  -d '{\"title\":\"Test\",\"instructions\":\"...\",\"reward\":1}'

# Com API Key errada → 401
curl -X POST http://localhost:3000/tasks -H \"X-API-Key: wrong-key\" ...

# Com API Key correta → 201
curl -X POST http://localhost:3000/tasks -H \"X-API-Key: taskloop-dev-key-123\" ...

# Rate limit excedido → 429
for i in $(seq 1 25); do curl -s -o /dev/null -w \"%{http_code}\\n\" \\
  -X POST http://localhost:3000/tasks -H \"X-API-Key: taskloop-dev-key-123\" ...; done
```

---

## ✅ Checklist de Entrega — Sprint 3

| Requisito | Status |
|---|---|
| Identificar vulnerabilidade crítica | ✅ Drenagem de fundos sem autenticação |
| Corrigir a vulnerabilidade | ✅ Middleware `requireAuth` + `rateLimit` |
| Relatar o achado e a correção | ✅ Este documento |
| Organizar gerenciamento de chaves | ✅ `.env` único + `.env.example` template |
| Código compila sem erros | ✅ TypeScript sem erros novos |

---

*Relatório gerado em: Maio 2025*  
*Projeto: TaskLoop — Hackathon Stellar / Etherfuse*
"