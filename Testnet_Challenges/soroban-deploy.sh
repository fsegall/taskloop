#!/usr/bin/env bash
# ============================================================
# TaskLoop — Testnet War Room · Trilha Contratos
# Soroban: init → build → deploy → invoke no Stellar Testnet
#
# STATUS: script pronto, NÃO testado em execução.
#
# Motivo: Soroban não faz parte do produto TaskLoop atual e
# não havia tempo para montar o setup do toolchain (Rust +
# stellar-cli) durante a Sprint 4. O script serve como
# referência E2E caso Soroban seja incorporado ao projeto.
#
# Pré-requisitos (ainda não instalados no ambiente):
#   - stellar-cli  →  cargo install --locked stellar-cli --features opt
#   - cargo + target wasm32v1-none  →  rustup target add wasm32v1-none
#   - keypair testnet financiado  →  https://friendbot.stellar.org?addr=<PUBLIC_KEY>
#
# Executar (quando o ambiente estiver pronto):
#   bash soroban-deploy.sh
# ============================================================

set -e  # para em qualquer erro

# ──────────────────────────────────────────────────────────
# Configuração
# ──────────────────────────────────────────────────────────
CONTRACT_NAME="taskloop-hello"
NETWORK="testnet"

# Carrega .env se existir
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

SECRET_KEY="${STELLAR_SECRET_KEY:-}"
PUBLIC_KEY="${STELLAR_PUBLIC_KEY:-}"

# ──────────────────────────────────────────────────────────
# Verificar pré-requisitos
# ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  0. Verificando pré-requisitos"
echo "══════════════════════════════════════════════"

if ! command -v stellar &> /dev/null; then
  echo "❌ stellar-cli não encontrado."
  echo "   Instale: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  echo "            cargo install --locked stellar-cli --features opt"
  exit 1
fi
echo "✅ stellar-cli: $(stellar --version 2>&1 | head -1)"

if ! command -v cargo &> /dev/null; then
  echo "❌ cargo não encontrado. Instale Rust: https://rustup.rs"
  exit 1
fi
echo "✅ cargo: $(cargo --version)"

if ! rustup target list --installed | grep -q "wasm32v1-none"; then
  echo "⚠️  Target wasm32v1-none ausente. Instalando..."
  rustup target add wasm32v1-none
fi
echo "✅ wasm32v1-none instalado"

if [ -z "$SECRET_KEY" ] || [ -z "$PUBLIC_KEY" ]; then
  echo "❌ STELLAR_SECRET_KEY e STELLAR_PUBLIC_KEY ausentes no .env"
  echo "   Gere um keypair testnet e financie no Friendbot:"
  echo "   curl 'https://friendbot.stellar.org?addr=<SEU_PUBLIC_KEY>'"
  exit 1
fi
echo "✅ Keypair configurado: ${PUBLIC_KEY:0:10}..."

# ──────────────────────────────────────────────────────────
# 1. Configurar rede testnet no stellar-cli
# ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  1. Configurar rede testnet"
echo "══════════════════════════════════════════════"

stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  2>/dev/null || true

stellar keys add deployer --secret-key "$SECRET_KEY" 2>/dev/null || true
echo "✅ Rede testnet configurada"
echo "✅ Identidade 'deployer' registrada"

# ──────────────────────────────────────────────────────────
# 2. Inicializar contrato hello-world
# ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  2. Inicializar contrato $CONTRACT_NAME"
echo "══════════════════════════════════════════════"

if [ -d "$CONTRACT_NAME" ]; then
  echo "   Diretório $CONTRACT_NAME já existe — reutilizando."
else
  stellar contract init "$CONTRACT_NAME"
  echo "✅ Contrato inicializado em ./$CONTRACT_NAME"
fi

cd "$CONTRACT_NAME"

# ──────────────────────────────────────────────────────────
# 3. Build
# ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  3. Build (cargo → .wasm)"
echo "══════════════════════════════════════════════"

stellar contract build
WASM_PATH=$(find target/wasm32v1-none/release -name "*.wasm" | head -1)
echo "✅ WASM gerado: $WASM_PATH"

# ──────────────────────────────────────────────────────────
# 4. Deploy
# ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  4. Deploy no Stellar Testnet"
echo "══════════════════════════════════════════════"

CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source deployer \
  --network "$NETWORK")

echo "✅ Contract ID: $CONTRACT_ID"
echo "   Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"

# ──────────────────────────────────────────────────────────
# 5. Invoke
# ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  5. Invoke hello('TaskLoop')"
echo "══════════════════════════════════════════════"

INVOKE_RESULT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source deployer \
  --network "$NETWORK" \
  -- hello \
  --to TaskLoop)

echo "✅ Resultado: $INVOKE_RESULT"

# ──────────────────────────────────────────────────────────
# Resultado final
# ──────────────────────────────────────────────────────────
echo ""
echo "🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆"
echo "  TRILHA CONTRATOS CONCLUÍDA!"
echo ""
echo "  Contract ID (submeter na plataforma):"
echo "  $CONTRACT_ID"
echo ""
echo "  Explorer:"
echo "  https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆"
