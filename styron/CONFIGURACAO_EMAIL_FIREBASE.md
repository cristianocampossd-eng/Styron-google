# Configuração de E-mail de Redefinição de Senha Profissional (Firebase)

Para garantir que os e-mails de redefinição de senha **nunca mais caiam na caixa de SPAM** dos seus usuários, e para que eles tenham um design extremamente profissional, moderno, em **Português**, com a sua logotipo e botões personalizados ao invés de links brutos, siga as duas etapas simples abaixo.

---

## 🚀 Passo 1: Evitar que os E-mails caiam no SPAM (Configuração de SMTP)

Por padrão, o Firebase envia e-mails através do subdomínio gratuito (`seu-projeto.firebaseapp.com`). Como esse domínio é compartilhado, os provedores de e-mail (como Gmail, Outlook e Yahoo) costumam classificar essas mensagens como **SPAM**.

Para resolver isso definitivamente:
1. Acesse o **[Firebase Console](https://console.firebase.google.com/)** e selecione o seu projeto.
2. No menu lateral esquerdo, clique em **Build** e depois em **Authentication**.
3. Vá para a aba **Templates** (Modelos) na parte superior.
4. Clique no ícone de lápis ✏️ ao lado do modelo **Password reset** (Redefinição de senha).
5. Clique em **Mudar domínio** (Change domain) ou **Configurar SMTP personalizado** (Custom SMTP configuration) no canto inferior/superior direito da seção.
6. Habilite a opção e preencha com as credenciais do seu servidor de e-mail corporativo ou serviço SMTP (como SendGrid, Mailgun, Locaweb ou Google Workspace).
   * **Host:** Endereço SMTP (ex: `smtp.sendgrid.net` ou `smtp.gmail.com`).
   * **Porta:** Geralmente `587` (TLS) ou `465` (SSL).
   * **Nome de usuário/Senha:** Suas credenciais de envio de e-mail corporativo.
7. Salve as alterações. Com isso, os e-mails serão enviados pelo seu próprio domínio corporativo homologado com chaves SPF/DKIM, **eliminando 100% dos envios para o SPAM**!

---

## 🎨 Passo 2: Traduzir e Personalizar o E-mail com Logo e Botões

O Firebase Console permite personalizar o assunto, o remetente e o modelo de e-mail nas configurações de modelos. Siga o passo a passo para colar o nosso design de alto padrão:

1. Na mesma aba **Templates** -> **Password reset** (Redefinição de senha).
2. Defina o **Assunto** (Subject) como:
   ```text
   Redefinição de Senha - STYRON
   ```
3. Defina o nome do remetente (Sender DNS name/Public name) como o nome da sua empresa (ex: `Suporte STYRON`).
4. Clique na opção **Editar HTML** (se disponível na interface de modelos avançados do Firebase) ou nos campos de personalização do corpo de e-mail. 
5. Se você estiver configurando o provedor do Firebase padrão, use o modelo formatado abaixo que traduz o conteúdo para português, substitui o link longo por um **botão altamente profissional** e insere de forma flexível sua identidade visual:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - STYRON</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f5f7;
      color: #1f2937;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f5f7;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #0f172a;
      padding: 32px;
      text-align: center;
    }
    .logo {
      height: 48px;
      max-width: 180px;
      object-fit: contain;
    }
    .title-text {
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      margin: 12px 0 0 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 32px;
      line-height: 1.6;
    }
    .welcome-text {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 16px 0;
    }
    .body-text {
      font-size: 15px;
      color: #4b5563;
      margin: 0 0 28px 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
      transition: background-color 0.2s;
    }
    .warning-text {
      font-size: 13px;
      color: #9ca3af;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      margin-top: 20px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
    }
    .footer-text {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Cabeçalho (Puxa a Logo do Sistema ou Nome) -->
      <div class="header">
        <!-- Substitua pelo link real da logo do sistema hospedado se desejar -->
        <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=180&auto=format&fit=crop&q=80" alt="STYRON Logo" class="logo">
        <div class="title-text">Sistema de Chamados STYRON</div>
      </div>
      
      <!-- Corpo do E-mail -->
      <div class="content">
        <p class="welcome-text">Olá,</p>
        <p class="body-text">
          Recebemos uma solicitação para redefinir a senha da sua conta de acesso ao portal do cliente **STYRON**. 
          Para escolher uma nova senha e restabelecer o seu acesso imediato, por favor clique no botão abaixo:
        </p>
        
        <!-- Botão Profissional no lugar do link bruto -->
        <div class="button-container">
          <a href="%LINK%" target="_blank" class="btn">Redefinir Minha Senha</a>
        </div>
        
        <p class="body-text">
          Este link de redefinição de senha expirará por questões de segurança. Caso você não tenha solicitado esta alteração, por favor ignore este e-mail com segurança.
        </p>
        
        <div class="warning-text">
          *Se o botão acima não funcionar, você pode alternativamente copiar e colar o link abaixo no seu navegador:<br>
          <span style="word-break: break-all; color: #3b82f6;">%LINK%</span>
        </div>
      </div>
      
      <!-- Rodapé -->
      <div class="footer">
        <p class="footer-text">© 2026 STYRON. Todos os direitos reservados.</p>
        <p class="footer-text" style="margin-top: 4px;">Este é um e-mail automático do sistema. Por favor, não responda diretamente.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

*Nota: O marcador `%LINK%` é automaticamente substituído pelo Firebase pelo link seguro de redefinição gerado para o usuário.*
