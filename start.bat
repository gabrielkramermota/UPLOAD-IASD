@echo off
title Auto Instalador e Iniciador de Projeto

:MENU
echo ==============================================
echo Bem-vindo ao UPLOAD IASD! - versao 1.4.0
echo ==============================================
echo.
echo Escolha uma das opcoes abaixo para Instalacao:
echo.
echo 1 - Instalar NODEJS silenciosamente
echo 2 - Instalar as dependencias do Aplicativo
echo 3 - Criar atalhos das pastas na area de trabalho (caso as pastas ja existem)
echo.
echo ==============================================
echo.
echo Escolha uma das opcoes abaixo para iniciar:
echo.
echo 4 - Iniciar App Web 
echo 5 - Iniciar Bot WhatsApp
echo 6 - Sair
echo.
echo ==============================================
set /p opcao=Digite o numero da opcao desejada: 

if "%opcao%"=="1" goto INSTALL_NODEJS
if "%opcao%"=="2" goto INSTALL_DEPS
if "%opcao%"=="3" goto CREATE_SHORTCUTS
if "%opcao%"=="4" goto START_WEB
if "%opcao%"=="5" goto START_WHATSAPP
if "%opcao%"=="6" goto EXIT

echo Opcao invalida! Por favor, escolha uma opcao valida.
goto MENU

:INSTALL_NODEJS
echo Verificando se o Node.js esta instalado...

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Node.js ja esta instalado.
    echo Removendo pasta de instalacao...
    rd /s /q "%~dp0instalacao"
) else (
    echo Instalando NODEJS silenciosamente...
    set "nodeInstaller=%~dp0instalacao\node-v20.17.0-x64.msi"
    if exist "%nodeInstaller%" (
        msiexec /i "%nodeInstaller%" /qn /norestart
        if %ERRORLEVEL% neq 0 (
            echo Falha ao instalar o Node.js.
        ) else (
            echo Node.js instalado com sucesso!
        )
        rd /s /q "%~dp0instalacao"
    ) else (
        echo Instalador do Node.js nao encontrado.
    )
)
pause
goto MENU

:INSTALL_DEPS
echo Instalando dependencias do Aplicativo...
npm install
if %ERRORLEVEL% neq 0 (
    echo Falha ao instalar as dependencias.
) else (
    echo Dependencias instaladas com sucesso!
)
pause
goto MENU

:CREATE_SHORTCUTS
echo Criando atalhos na area de trabalho...

set "projectDir=%~dp0"
set "downloads=%projectDir%downloads"
set "uploads=%projectDir%uploads"
set "desktop=%USERPROFILE%\Desktop"

powershell -command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%desktop%\Downloads.lnk'); $sc.TargetPath = '%downloads%'; $sc.Save()"
powershell -command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%desktop%\Uploads.lnk'); $sc.TargetPath = '%uploads%'; $sc.Save()"

echo Atalhos criados na area de trabalho com sucesso!
pause
goto MENU

:START_WEB
echo Iniciando App Web...
npm start
if %ERRORLEVEL% neq 0 (
    echo Falha ao iniciar o App Web.
)
pause
goto MENU

:START_WHATSAPP
echo.
echo Iniciando Bot WhatsApp... Aguarde!
npm run start:zap
if %ERRORLEVEL% neq 0 (
    echo Falha ao iniciar o Bot WhatsApp.
)
pause
goto MENU

:EXIT
echo Saindo...
exit
