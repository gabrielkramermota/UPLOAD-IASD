<div align="center">

# Upload IASD Desktop

![Upload IASD Logo](./public/logo.svg)

**Versão 2.0.0**

Um aplicativo desktop desenvolvido para facilitar o upload e download de arquivos, especialmente voltado para sonoplastas e técnicos de som de igrejas.

[![Windows](https://img.shields.io/badge/Windows-10+-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![Version](https://img.shields.io/badge/Version-2.0.0-green.svg)](https://github.com/gabrielkramermota/UPLOAD-IASD/releases)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[📥 Download](#-instalação) • [📖 Documentação](#-funcionalidades) • [🐛 Suporte](#-problemas-e-suporte)

</div>

---

## 📋 Índice

- [✨ Funcionalidades](#-funcionalidades)
- [📸 Documentação Visual](#-documentação-visual)
- [📥 Instalação](#-instalação)
- [🎯 Funcionalidades Detalhadas](#-funcionalidades-detalhadas)
- [🛠️ Desenvolvimento](#️-desenvolvimento)
- [👤 Autor](#-autor)

---

## ✨ Funcionalidades

### 🎬 Download do YouTube
Baixe vídeos e áudios do YouTube em diferentes qualidades, com interface intuitiva e organização automática.

### 💬 Bot WhatsApp Integrado
Receba arquivos via WhatsApp automaticamente. Conecte facilmente escaneando o QR Code e receba arquivos enviados para o bot.

### 📤 Servidor de Upload Local
Servidor HTTP local para receber uploads via navegador. Acesse de qualquer dispositivo na mesma rede e faça upload de múltiplos arquivos.

### 🎨 Interface Moderna
Interface intuitiva, responsiva e totalmente personalizável. Configure cores, logo e pastas de destino.

### ⚙️ Configurações Personalizáveis
Personalize o sistema conforme sua necessidade: altere o nome da igreja, escolha a cor do tema e adicione o logo.

---

## 📸 Documentação Visual

### Tela Inicial
![Tela Inicial](./public/upload-iasd-01.jpeg)

A tela inicial permite iniciar o servidor de upload para receber arquivos enviados pelo navegador do celular ou computador.

### Bot WhatsApp
![Bot WhatsApp](./public/upload-iasd-02.jpeg)

Interface para gerenciar o bot do WhatsApp, visualizar QR Code e monitorar o status da conexão.

### Download de Vídeo do YouTube
![Download YouTube](./public/upload-iasd-03.jpeg)

Baixe vídeos e músicas do YouTube facilmente, escolhendo a qualidade desejada.

### Configurações
![Configurações](./public/upload-iasd-04.jpeg)

Personalize o sistema: nome da igreja, cor do tema, logo e pastas de destino.

### Sobre o Sistema
![Sobre](./public/upload-iasd-05.jpeg)

Informações sobre o sistema, versão e desenvolvedor.

---

## 📥 Instalação

### Requisitos do Sistema

- **Windows 10 ou superior**
- **Node.js 18+** (necessário apenas para o bot WhatsApp)
  - Download: https://nodejs.org/
  - ⚠️ O app funciona sem Node.js, mas o bot WhatsApp não estará disponível

### Opções de Instalação

#### 🎯 Opção 1 - Instalador MSI (Recomendado)

1. Baixe o arquivo `uploadiasddesktop_2.0.0_x64_en-US.msi` da [página de releases](https://github.com/gabrielkramermota/UPLOAD-IASD/releases)
2. Execute o arquivo baixado
3. Siga o assistente de instalação
4. O app aparecerá no menu Iniciar do Windows

#### 📦 Opção 2 - Instalador NSIS

1. Baixe o arquivo `uploadiasddesktop_2.0.0_x64-setup.exe` da [página de releases](https://github.com/gabrielkramermota/UPLOAD-IASD/releases)
2. Execute o arquivo e siga o assistente de instalação

#### 💾 Opção 3 - Executável Portátil

1. Baixe o arquivo `uploadiasddesktop.exe` da [página de releases](https://github.com/gabrielkramermota/UPLOAD-IASD/releases)
2. Execute diretamente (não requer instalação)
3. Pode ser executado de qualquer pasta

### ⚠️ Aviso do Windows Defender

Na primeira execução, o Windows pode exibir um aviso de segurança:
> "Windows protegeu seu PC"

**Isso é normal** para aplicativos não assinados digitalmente. Para executar:
1. Clique em "Mais informações"
2. Clique em "Executar mesmo assim"

---

## 🎯 Funcionalidades Detalhadas

### 🎬 Download do YouTube

- ✅ Baixe vídeos em múltiplas qualidades (240p até 2160p)
- ✅ Extraia apenas o áudio em formato MP3
- ✅ Visualize informações do vídeo antes de baixar
- ✅ Organize downloads em pasta configurável
- ✅ Interface intuitiva e amigável

### 💬 Bot WhatsApp

- ✅ Receba arquivos via WhatsApp automaticamente
- ✅ QR Code para conectar sua conta facilmente
- ✅ Cache limpo automaticamente ao encerrar
- ✅ Mensagens de status em tempo real

**Comandos disponíveis:**
- `!upload [nome]` ou `!arquivo [nome]` - Faz upload da mídia anexada
- `!links [nome] [link1] [link2] ...` - Salva links em arquivo de texto
- `!ajuda` - Mostra lista de comandos

### 📤 Servidor de Upload Local

- ✅ Servidor HTTP na porta 8080
- ✅ Interface web para upload de arquivos
- ✅ Receba uploads de qualquer dispositivo na mesma rede
- ✅ Suporte para múltiplos arquivos simultâneos
- ✅ Visualização do IP local para acesso

### 📋 Funcionalidades por Requisito

#### ✅ Funciona SEM Node.js
- Download de vídeos do YouTube
- Servidor de upload local
- Interface e configurações
- Todas as funcionalidades básicas

#### ✅ Funciona COM Node.js
- Todas as funcionalidades acima
- **+ Bot WhatsApp integrado**

---

## 🛠️ Desenvolvimento

### Pré-requisitos

- Node.js 18+
- Rust (instalado automaticamente pelo Tauri)
- Git

### Instalação para Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/gabrielkramermota/UPLOAD-IASD.git
cd upload.iasd.desktop

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run tauri dev
```

### Build para Produção

```bash
# Build do frontend
npm run build

# Build do executável
npm run tauri build
```

Os arquivos gerados estarão em:
- **Executável**: `src-tauri/target/release/uploadiasddesktop.exe`
- **Instalador MSI**: `src-tauri/target/release/bundle/msi/`
- **Instalador NSIS**: `src-tauri/target/release/bundle/nsis/`

---

## 📝 Notas Importantes

- **Primeira execução**: Tela de boas-vindas e tutorial interativo
- **yt-dlp**: Será baixado automaticamente na primeira vez que usar o download do YouTube
- **Cache do Bot**: É limpo automaticamente ao parar o bot WhatsApp
- **Pastas padrão**: 
  - Uploads: `%LocalAppData%\UploadIASD\uploads`
  - Vídeos: `%UserProfile%\Downloads\UploadIASD`

---

## 🐛 Problemas e Suporte

Se encontrar algum problema:

1. Verifique se atende aos requisitos do sistema
2. Verifique se o Node.js está instalado (para o bot WhatsApp)
3. Consulte a seção de [Notas Importantes](#-notas-importantes)
4. Abra uma [issue no GitHub](https://github.com/gabrielkramermota/UPLOAD-IASD/issues)

---

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

---

## 👤 Autor

<div align="center">

**Gabriel Kramer Mota**

[![GitHub](https://img.shields.io/badge/GitHub-gabrielkramermota-181717?logo=github)](https://github.com/gabrielkramermota)
[![Email](https://img.shields.io/badge/Email-kramermota55%40gmail.com-D14836?logo=gmail)](mailto:kramermota55@gmail.com)

Desenvolvido com ❤️ para a comunidade

</div>

---

## 🙏 Agradecimentos

- [Tauri](https://tauri.app/) - Framework para aplicativos desktop
- [React](https://react.dev/) - Biblioteca JavaScript
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Ferramenta de download do YouTube
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - Biblioteca do WhatsApp

---

<div align="center">

**Versão 2.0.0** • **Última atualização:** 2026

[⬆️ Voltar ao topo](#-upload-iasd-desktop)

</div>
