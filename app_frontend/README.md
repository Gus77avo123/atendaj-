# Atende Já

Aplicativo mobile em Expo + React Native para conectar clientes a profissionais de serviços próximos.

## Executar

```bash
npm install
npx expo start
```

Use Expo Go para testar as telas. No Radar, permita o acesso à localização para centralizar o mapa na posição atual e acompanhar mudanças enquanto a tela estiver aberta. Sem permissão, o app usa a localização demonstrativa de Brasília. A versão web exibe um mapa ilustrativo, sem tiles cartográficos reais.

## Backend e banco de dados

O backend Express usa PostgreSQL. A configuração local fica em `backend/back-end-gerenciamento de usuarios/.env`; defina `DB_NAME=atendeja`, usuário, senha, host e porta do PostgreSQL. Não compartilhe nem versione esse arquivo.

Inicie a API em outro terminal no PowerShell:

```powershell
cd "backend\back-end-gerenciamento de usuarios"
npm run dev
```

A API inicia na porta 3000 e oferece `GET /health`. O frontend usa essa porta por padrão. Para sobrescrever o endereço, copie `.env.example` para `.env` no frontend e configure `EXPO_PUBLIC_API_URL`, por exemplo `http://192.168.1.10:3000` usando o IP local do computador. Em aparelho físico, computador e celular precisam estar na mesma rede e o Firewall do Windows deve permitir conexões na porta 3000. Reinicie o Expo após mudar o `.env`.

O `.env` local deste projeto está configurado com `EXPO_PUBLIC_API_URL=http://192.168.0.2:3000`. Se o IP do computador mudar, atualize esse valor e reinicie o Expo. O backend escuta em `0.0.0.0`; confirme também que o Firewall do Windows permite conexões de entrada na porta 3000.

O backend conecta ao banco `atendeja` existente e sincroniza tabelas sem apagar os dados. Cadastro e login usam a tabela `users`; cadastros profissionais também criam o perfil relacionado nas tabelas `providers` e `provider_stats`. Ao iniciar, o Sequelize adiciona somente colunas ausentes previstas nos modelos, incluindo `users.notifications_enabled`, `reviews.request_id` e os indicadores da localização cadastrada. Coordenadas antigas sem esse indicador são descartadas para não exibir posições de GPS ou padrões como se fossem pontos escolhidos pelo profissional; não é necessário recriar o banco.

## Configurar login social, e-mail e push

- **Google:** crie OAuth Client IDs para Web, Android e iOS no Google Cloud. Os identificadores de pacote/bundle provisórios são `com.atendeja.app` em ambas as plataformas; substitua-os antes de publicar se usar outros IDs. Defina os três `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` no `.env` do frontend e informe os mesmos IDs, separados por vírgula, em `GOOGLE_CLIENT_IDS` no `.env` do backend. O backend valida assinatura, audiência e e-mail verificado do token Google antes de criar ou autenticar uma conta.
- **Recuperação de senha:** configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e, opcionalmente, `SMTP_FROM` no `.env` do backend. O link expira em 20 minutos e abre `atendeja://reset-password`; personalize `APP_RESET_PASSWORD_URL` se o esquema do app mudar. Sem SMTP configurado, a API informa o erro e não simula o envio.
- **Notificações push:** configure o projeto com EAS e preencha `EXPO_PUBLIC_EAS_PROJECT_ID` no `.env` do frontend. Configure as credenciais de push Android/iOS nas credenciais do projeto EAS e gere um development build nativo. Tokens dos aparelhos são associados à conta autenticada; o backend envia as notificações persistidas usando o Expo Push Service.
- **Localização profissional:** o profissional escolhe e salva no perfil um ponto fixo da área de atendimento. Esse ponto permanece no mapa até ser alterado no perfil; ficar online não ativa nem transmite o GPS do profissional.

## Fluxos do aplicativo

- Tela de apresentação do Atende Já com Radar, conversa, avaliações e acompanhamento de pedidos; o botão de início abre login, cadastro ou modo visitante.
- Cliente: profissionais, pedidos, avaliações, favoritos e notificações são carregados da API. Pedidos, mensagens do chat, avaliações, histórico de atendimentos concluídos e preferência de notificações são persistidos no PostgreSQL.
- O endereço do atendimento fica oculto para o profissional enquanto o pedido está pendente. Após aceitar, o profissional pode abrir a rota até o endereço informado pelo cliente no Google Maps; não há rastreamento contínuo do cliente.
- O Radar usa o ponto cadastrado pelo profissional para colocar seu marcador no mapa. A localização do aparelho do cliente é usada para calcular a distância e ordenar profissionais próximos; a posição do profissional não é rastreada em tempo real.
- Profissional: pedidos recebidos, aceitar/recusar, iniciar/concluir atendimento, avaliações, notificações e disponibilidade são conectados à API. O app aproxima clientes e profissionais; valores e condições são combinados diretamente entre eles, sem controle de pagamentos ou ganhos no aplicativo.
- Visitantes acessam somente Início e Radar em modo de consulta. As demais abas, rotas e ações ficam bloqueadas até o cadastro ou a autenticação.
- Cadastro e login são feitos pela API; a senha é armazenada apenas como hash no backend, e o token de sessão é mantido localmente. Os dados básicos do perfil são sincronizados com o servidor. Fotos de perfil podem ser tiradas com a câmera ou escolhidas na galeria; são enviadas ao backend e exibidas nos perfis e nas áreas relacionadas a pedidos, conversas e avaliações.
- A edição do perfil fica disponível após o cadastro. Sair encerra a sessão local e retorna à tela inicial.
- O perfil tem abas de resumo e segurança; a troca de senha valida a senha atual e a grava no backend. A tela inicial oferece login Google e recuperação por e-mail, com token de uso único que expira em 20 minutos.
- Pedidos, mensagens e avaliações exigem uma conta autenticada; o backend valida a participação do usuário no chamado e restringe alterações e leituras à conta proprietária.

## Google Maps

No Android sem `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, o Radar usa OpenStreetMap via Leaflet em um WebView e funciona no Expo Go sem chave nativa do Google Maps. O WebView precisa de internet para carregar Leaflet e os tiles do mapa. Para usar Google Maps nativo no Android/iOS, configure a variável no `.env` do frontend e gere novamente o build nativo. Restrinja a chave por aplicativo no Google Cloud. No iOS, o mapa usa Apple Maps quando a chave do Google não está configurada.

Login Google, redefinição de senha e notificações push estão implementados; Google Cloud, SMTP e credenciais de push do EAS precisam ser configurados para ativar os respectivos serviços. O cliente precisa permitir a localização durante o uso para ver distâncias com base na própria posição. Não inclua credenciais no código-fonte.
