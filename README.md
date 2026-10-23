# AtendeJá — Guia de Execução

Aplicativo mobile de marketplace de serviços. Clientes encontram e contratam prestadores de serviço.

---

## Estrutura do Projeto

```
atendej_novo/
├── app_frontend/          ← React Native + Expo Router (TypeScript)
└── backend/
    └── back-end-gerenciamento de usuarios/   ← Node.js + Express + Sequelize + PostgreSQL
```

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+ rodando localmente
- Expo CLI: `npm install -g expo-cli`

---

## 1. Configurar o Backend

```bash
cd "backend/back-end-gerenciamento de usuarios"
```

### 1.1 Instalar dependências
```bash
npm install
```

### 1.2 Configurar variáveis de ambiente
Edite o arquivo `.env` com suas credenciais do PostgreSQL:
```
DB_NAME=atendeja
DB_USER=postgres
DB_PASS=SUA_SENHA
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=UMA_STRING_LONGA_E_ALEATORIA
```

### 1.3 Criar o banco de dados
```sql
-- No psql:
CREATE DATABASE atendeja;
```

O schema das tabelas é criado automaticamente pelo Sequelize ao iniciar o servidor.
Se preferir criar manualmente:
```bash
psql -U postgres -d atendeja -f ../../database_schema.sql
```

### 1.4 Iniciar o servidor
```bash
npm run dev      # desenvolvimento (nodemon)
# ou
node src/server.js  # produção
```

O servidor sobe em `http://localhost:3000`.  
Endpoint de saúde: `GET http://localhost:3000/health`

---

## 2. Configurar o Frontend

```bash
cd app_frontend
npm install
```

### 2.1 URL da API
O frontend descobre o IP do servidor automaticamente via `expo-constants` em desenvolvimento.  
Para apontar para um servidor fixo, crie `app_frontend/.env`:
```
EXPO_PUBLIC_API_URL=http://SEU_IP:3000
```

### 2.2 Iniciar o app
```bash
npm start        # abre o Expo DevTools
npm run android  # compila para Android
npm run ios      # compila para iOS (requer macOS)
npm run web      # versão web
```

---

## 3. Funcionalidades

| Área | Funcionalidade |
|---|---|
| Autenticação | Cadastro, login por email/senha, login Google, recuperação de senha por email |
| Clientes | Busca de prestadores, radar no mapa, pedidos de serviço, avaliações, favoritos, chat |
| Prestadores | Gerenciamento de pedidos, portfólio de fotos, disponibilidade online/offline |
| Perfil | Edição, foto, troca de senha, notificações, dispositivos, suporte |

---

## 4. Variáveis de Ambiente — Backend

| Variável | Descrição | Obrigatória |
|---|---|---|
| `DB_NAME` | Nome do banco PostgreSQL | ✅ |
| `DB_USER` | Usuário do banco | ✅ |
| `DB_PASS` | Senha do banco | ✅ |
| `DB_HOST` | Host do banco | ✅ |
| `DB_PORT` | Porta do banco (padrão: 5432) | ✅ |
| `JWT_SECRET` | Segredo para assinar tokens JWT | ✅ |
| `PORT` | Porta do servidor (padrão: 3000) | ❌ |
| `CORS_ORIGIN` | Origens CORS permitidas (vírgula). Vazio = todas | ❌ |
| `GOOGLE_CLIENT_IDS` | Client IDs do Google OAuth (vírgula) | ❌ |
| `SMTP_HOST` | Servidor SMTP para emails | ❌ |
| `SMTP_PORT` | Porta SMTP (padrão: 587) | ❌ |
| `SMTP_USER` | Usuário SMTP | ❌ |
| `SMTP_PASS` | Senha SMTP | ❌ |
| `SMTP_FROM` | Remetente dos emails | ❌ |
| `APP_RESET_PASSWORD_URL` | Deep link de redefinição de senha | ❌ |
