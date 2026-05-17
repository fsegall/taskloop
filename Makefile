# TaskLoop — local development & demo commands
# Everything runs locally. No external infrastructure required.

.PHONY: help install dev api web build typecheck \
        demo-seed demo-reset demo-payout demo-x402 demo-x402-e2e \
        test-api test-web test clean

# ──────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────

help: ## Show available commands
	@echo ""
	@echo "TaskLoop — local development & demo"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ──────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────

install: ## Install all dependencies (api + web + scripts)
	cd taskloop-poc && npm install
	cd taskloop-poc/apps/api && npm install
	cd taskloop-poc/apps/taskloop-web && npm install

env: ## Create .env from .env.example (if not exists)
	@if [ ! -f taskloop-poc/.env ]; then \
		cp taskloop-poc/.env.example taskloop-poc/.env; \
		echo "Created taskloop-poc/.env — fill in your Stellar keys."; \
	else \
		echo "taskloop-poc/.env already exists."; \
	fi

# ──────────────────────────────────────────────
# Development servers
# ──────────────────────────────────────────────

api: ## Start the API server (port 3000)
	cd taskloop-poc/apps/api && npm run dev

web: ## Start the frontend dev server
	cd taskloop-poc/apps/taskloop-web && npm run dev

dev: ## Start API and frontend together (requires two terminals)
	@echo "Run in separate terminals:"
	@echo "  make api"
	@echo "  make web"

# ──────────────────────────────────────────────
# Build & typecheck
# ──────────────────────────────────────────────

build: ## Build frontend for production
	cd taskloop-poc/apps/taskloop-web && npm run build

typecheck: typecheck-api typecheck-web ## Typecheck API and frontend

typecheck-api: ## Typecheck API
	cd taskloop-poc/apps/api && npx tsc --noEmit

typecheck-web: ## Typecheck frontend
	cd taskloop-poc/apps/taskloop-web && npx tsc --noEmit

# ──────────────────────────────────────────────
# Demo commands (require API running on port 3000)
# ──────────────────────────────────────────────

demo-seed: ## Load demo seed data via API
	@curl -s -X POST http://localhost:3000/dev/seed | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Loaded',r.count,'tasks')})"

demo-reset: ## Clear all in-memory data via API
	@curl -s -X POST http://localhost:3000/dev/reset | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).message))"

demo-health: ## Check API health
	@curl -s http://localhost:3000/health | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r.status==='ok'?'✅ API is running':'❌ API issue')})"

demo-lifecycle: ## Run full task lifecycle via API (create → send → submit → approve/pay)
	@echo "=== Creating task ===" && \
	TASK=$$(curl -s -X POST http://localhost:3000/tasks \
		-H 'Content-Type: application/json' \
		-d '{"title":"Demo task","instructions":"Classify this image","reward":0.5,"currency":"XLM","required":1}') && \
	TASK_ID=$$(echo $$TASK | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).task.id))") && \
	echo "Task created: $$TASK_ID" && \
	echo "" && \
	echo "=== Sending to Telegram ===" && \
	curl -s -X POST http://localhost:3000/tasks/$$TASK_ID/send | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Status:',r.task.status,'| Delivered:',r.task.telegramDelivered)})" && \
	echo "" && \
	echo "=== Simulating submission ===" && \
	curl -s -X POST http://localhost:3000/tasks/$$TASK_ID/submit \
		-H 'Content-Type: application/json' \
		-d '{"user":"Demo Worker","handle":"@demo","walletAddress":"GDUIPC7QY3EPLAHSQRFHWZKAK6GDPRUQKH7PKMXWPVTDF2SVKMFJOD74","response":"Color: blue. Category: electronics."}' | \
		node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Status:',r.task.status,'| Submission:',r.submission.id)})" && \
	echo "" && \
	echo "=== Validating & paying ===" && \
	curl -s -X POST http://localhost:3000/tasks/$$TASK_ID/approve \
		-H 'Content-Type: application/json' \
		-d '{}' | \
		node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Status:',r.task.status);console.log('Validation:',r.validation.approved?'approved':'rejected','| Score:',r.validation.score);if(r.payout){console.log('Payout:',r.payout.status,'| txHash:',r.payout.txHash);console.log('Explorer: https://stellar.expert/explorer/testnet/tx/'+r.payout.txHash)}})" && \
	echo "" && \
	echo "=== Done ==="

demo-anchor: ## Run Etherfuse anchor flow via API (assets → quote → order)
	@echo "=== Listing rampable assets ===" && \
	curl -s "http://localhost:3000/anchor/etherfuse/assets?wallet=GDEMO&blockchain=stellar&currency=mxn" | \
		node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Provider:',r.provider,'| Assets:',r.assets.length);r.assets.forEach(a=>console.log(' ',a.symbol,'-',a.name))})" && \
	echo "" && \
	echo "=== Creating off-ramp quote ===" && \
	QUOTE=$$(curl -s -X POST http://localhost:3000/anchor/etherfuse/quote \
		-H 'Content-Type: application/json' \
		-d '{"customerId":"demo-customer","blockchain":"stellar","type":"offramp","sourceAsset":"USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN","targetAsset":"MXN","sourceAmount":"50"}') && \
	QUOTE_ID=$$(echo $$QUOTE | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).quote.quoteId))") && \
	echo $$QUOTE | node -e "process.stdin.on('data',d=>{const q=JSON.parse(d).quote;console.log('Quote:',q.sourceAmount,'USDC →',q.destinationAmount,'MXN | Rate:',q.exchangeRate)})" && \
	echo "" && \
	echo "=== Creating anchor order ===" && \
	curl -s -X POST http://localhost:3000/anchor/etherfuse/order \
		-H 'Content-Type: application/json' \
		-d "{\"bankAccountId\":\"demo-bank\",\"quoteId\":\"$$QUOTE_ID\",\"useAnchor\":true}" | \
		node -e "process.stdin.on('data',d=>{const o=JSON.parse(d).order;console.log('Order:',o.orderId);console.log('Type:',o.orderType,'| Anchor:',o.isAnchorOrder);if(o.withdrawAnchorAccount)console.log('Anchor account:',o.withdrawAnchorAccount);if(o.withdrawMemo)console.log('Memo:',o.withdrawMemo)})" && \
	echo "" && \
	echo "=== Done ==="

demo-payout: ## Run standalone Stellar payout demo
	cd taskloop-poc && npm run demo:payout:stellar

demo-x402: ## Run x402 demo (semi-manual, requires API running)
	cd taskloop-poc && npm run demo:x402

demo-x402-e2e: ## Run x402 end-to-end demo (automated payment + verification)
	cd taskloop-poc && npm run demo:x402:e2e

# ──────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────

test: typecheck demo-health ## Run typecheck + API health check
	@echo ""
	@echo "✅ All checks passed."

# ──────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────

clean: ## Remove build artifacts and node_modules
	rm -rf taskloop-poc/apps/taskloop-web/dist
	rm -rf taskloop-poc/apps/taskloop-web/node_modules
	rm -rf taskloop-poc/apps/api/dist
	rm -rf taskloop-poc/apps/api/node_modules
	rm -rf taskloop-poc/node_modules
