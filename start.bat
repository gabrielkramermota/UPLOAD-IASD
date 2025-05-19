@echo off
title Auto Instalador e Iniciador de Projeto

:MENU
echo ==============================================
echo Bem-vindo ao UPLOAD IASD! - versao 1.6.1
echo ==============================================
echo.
echo Escolha uma das opcoes abaixo para Instalacao:
echo.
echo 1 - Instalar as dependencias do Aplicativo
echo 2 - Criar atalhos das pastas na area de trabalho (caso as pastas ja existem)
echo 3 - Atualizar o Projeto com a ultima versao do GitHub
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

if "%opcao%"=="1" goto INSTALL_DEPS
if "%opcao%"=="2" goto CREATE_SHORTCUTS
if "%opcao%"=="3" goto UPDATE_APP
if "%opcao%"=="4" goto START_WEB
if "%opcao%"=="5" goto START_WHATSAPP
if "%opcao%"=="6" goto EXIT

echo Opcao invalida! Por favor, escolha uma opcao valida.
goto MENU

:INSTALL_DEPS
echo ==============================================
echo Instalando dependencias do Aplicativo...
echo Isso pode levar alguns minutos. Aguarde.
echo ==============================================
echo.

:: Executa a instalação das dependências
call :SHOW_PROGRESS "npm install"

if %ERRORLEVEL% neq 0 (
    echo ==============================================
    echo [ERRO] Falha ao instalar as dependencias.
    echo ==============================================
    pause
    goto MENU
) else (
    echo ==============================================
    echo [SUCESSO] Dependencias instaladas com sucesso!
    echo ==============================================
    pause
    goto MENU
)

:SHOW_PROGRESS
:: Função para monitorar o progresso da execução de um comando
setlocal
set "COMMAND=%~1"

:: Inicia o comando e registra a saída em um arquivo de log
%COMMAND% > install_log.tmp 2>&1 & 
set "PID=%!"

:: Loop para exibir mensagens de progresso
:PROGRESS_LOOP
timeout /t 5 > nul
tasklist /fi "pid eq %PID%" > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Instalando dependencias, aguarde...
    goto PROGRESS_LOOP
)

:: Quando terminar, verifica se houve erros
type install_log.tmp | find /i "error" > nul
if %ERRORLEVEL% EQU 0 (
    del install_log.tmp > nul 2>&1
    exit /b 1
)

:: Limpeza e retorno ao script principal
del install_log.tmp
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

:UPDATE_APP
echo ==============================================
echo Atualizando o Projeto com a ultima versão do GitHub...
echo ==============================================

:: Verificar se o Git está instalado
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Git não encontrado, instalando...
    call :INSTALL_GIT
) else (
    echo Git já está instalado.
)

:: Criação da pasta temporária
set "repoUrl=https://github.com/gabrielkramermota/UPLOAD-IASD"
set "tempDir=%~dp0temp"

:: Verificar se a pasta temp existe e removê-la
if exist "%tempDir%" rd /s /q "%tempDir%"

:: Clonar o repositório
echo Clonando repositório...
mkdir "%tempDir%"
cd "%tempDir%"
git clone %repoUrl%

:: Substituir os arquivos da pasta atual pelos novos do repositório clonado
echo Substituindo arquivos...
xcopy /s /e /y "%tempDir%\UPLOAD-IASD\*" "%~dp0"
xcopy /y "%tempDir%\UPLOAD-IASD\start.bat" "%~dp0"

:: Limpar pasta temporária
rd /s /q "%tempDir%"

echo Atualização concluída com sucesso!
pause
goto MENU

:START_WEB
if not exist "%~dp0node_modules" (
    echo A pasta "node_modules" nao foi encontrada.
    echo Por favor, escolha a opcao 1 para instalar as dependencias.
    pause
    goto MENU
)

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
if not exist "%~dp0node_modules" (
    echo A pasta "node_modules" nao foi encontrada.
    echo Por favor, escolha a opcao 1 para instalar as dependencias.
    pause
    goto MENU
)
npm run start:zap
if %ERRORLEVEL% neq 0 (
    echo Falha ao iniciar o Bot WhatsApp.
)
pause
goto MENU

:EXIT
echo Saindo...
exit
