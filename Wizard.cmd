@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" "%~dp0\.\wizard.js" %*
) ELSE (
  node "%~dp0\.\wizard.js" %*
)
