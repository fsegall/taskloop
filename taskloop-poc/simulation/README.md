"# TaskLoop - Simulação de Avaliação de Logomarcas

Ambiente isolado para testar o fluxo de votação do TaskLoop com usuários reais via Zoom.

## Como rodar

### 1. Instalar dependências

```bash
cd taskloop-poc/simulation
npm install
```

### 2. Configurar chave Deepseek (opcional)

Copie o arquivo de exemplo:

```bash
cp .env.example .env
# Edite .env com sua chave Deepseek: DEEPSEEK_API_KEY=sk-...
```

Se não configurar, o modo demo usa SVGs gerados manualmente (funciona sem chave).

### 3. Rodar

```bash
npm start
```

Acesse: http://localhost:3001

### 4. (Opcional) Compartilhar com Codespaces

Se estiver no GitHub Codespaces, as portas são expostas automaticamente. 
Clique em "Open in Browser" ou use o link gerado pelo Codespaces.

## Fluxo de teste (para o Zoom)

1. **Anfitrião** abre o link e clica em "Admin" para configurar
2. **Anfitrião** descreve o negócio (ex: "Cafeteria vegana") e gera logomarcas
3. **Anfitrião** abre a votação (senha: `admin123`) — um timer de 5 minutos começa
4. **Participantes** acessam o mesmo link, veem as logomarcas e votam
5. **Anfitrião** fecha a votação e mostra o resultado na tela

## Estrutura

```
simulation/
├── server.js            # Servidor Express (proxy Deepseek + API)
├── package.json         # Dependências
├── .env.example         # Template de configuração
├── README.md            # Este arquivo
└── public/
    ├── index.html       # App single-page
    ├── styles.css       # Design responsivo
    └── app.js           # Lógica do front-end
```

## Tecnologias

- **Backend**: Node.js + Express (>=18, sem dependências além do Express)
- **Frontend**: Vanilla JS, CSS Grid, fetch API
- **IA**: Deepseek Chat API (ou modo demo embutido)
- **SVG**: Logomarcas geradas como SVG inline pela IA
"