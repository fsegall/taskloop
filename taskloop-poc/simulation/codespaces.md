# TaskLoop Simulation — Deploy no GitHub Codespaces

## Setup inicial

1. No GitHub, clique em **Code → Codespaces → Create codespace on main**
2. Aguarde o ambiente carregar (1–2 min)

## Instalar dependências e configurar

No terminal do Codespace:

```bash
cd taskloop-poc/simulation
npm install
cp .env.example .env
```

Edite o `.env` com os valores reais (ícone de lápis no explorador de arquivos):

```env
STELLAR_SECRET_KEY=S...          # secret key da treasury
STELLAR_PAYMENT_AMOUNT=0.5
MAX_VOTES_PER_SESSION=5
TREASURY_MIN_RESERVE=2
ORGANIZER_PASSWORD=...           # senha para gerar as logos
```

## Subir o servidor

```bash
npm start
```

## Expor a porta publicamente

1. Clique na aba **Ports** (barra inferior)
2. Localize a porta **3001**
3. Botão direito → **Port Visibility → Public**
4. Copie a URL gerada (formato `https://xxxx-3001.app.github.dev`)

Essa é a URL para compartilhar com os participantes.

## Fluxo da demo

| Passo | Quem | Ação |
|-------|------|------|
| 1 | Organizador | Abre a URL, digita descrição do negócio + senha, clica **Gerar Logomarcas** |
| 2 | Organizador | Compartilha a URL no grupo/telão |
| 3 | Participantes | Abrem a URL, já veem as logos, selecionam a favorita |
| 4 | Participantes | Informam nome + chave pública Stellar, clicam **Votar e Receber XLM** |
| 5 | Sistema | Envia 0.5 XLM na Mainnet, exibe tx hash com link para stellar.expert |
| 6 | Organizador | Clica **Encerrar Votação** para revelar o resultado |

## Atenção durante a demo

- **Não feche o Codespace** — o estado é em memória, reiniciar apaga os votos
- O Codespace dorme após ~30 min de inatividade — mantenha a aba aberta
- A URL muda se você recriar o Codespace — gere antes da apresentação
- Treasury configurada com reserva mínima de 2 XLM e limite de 5 votos por sessão

## Gerar wallets de teste

Para criar 5 wallets de teste antes da demo:

```bash
node generate-wallets.js
```

Cada wallet gerada precisa receber pelo menos **1 XLM** para existir na Mainnet
antes de ser usada na votação.

## Verificar saldo da treasury

```bash
curl -s https://horizon.stellar.org/accounts/SEU_PUBLIC_KEY | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); \
  const b=JSON.parse(d).balances?.find(x=>x.asset_type==='native'); \
  console.log('Saldo:', b?.balance, 'XLM')"
```
