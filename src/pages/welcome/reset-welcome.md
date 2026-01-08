# Como ver a tela de boas-vindas novamente

Para testar a tela de boas-vindas, você precisa limpar o localStorage:

## No navegador (modo dev):
1. Abra o DevTools (F12)
2. Vá na aba "Console"
3. Digite: `localStorage.removeItem('upload-iasd-welcome-seen')`
4. Recarregue a página (F5)

## No app Tauri:
O localStorage é persistente. Para resetar:
1. Feche o app completamente
2. Abra o DevTools (se disponível) ou
3. Delete o arquivo de configuração do Tauri Store

