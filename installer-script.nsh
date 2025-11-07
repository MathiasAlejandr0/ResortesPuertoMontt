!include "MUI2.nsh"
!include "LogicLib.nsh"

; sin variables globales para evitar warnings

!macro customUnInstall
  ; Preguntar al usuario si desea borrar los datos al desinstalar
  MessageBox MB_ICONQUESTION|MB_YESNO "¿Desea eliminar también los datos de usuario (base de datos, backups y logs)?" IDYES doDelete IDNO noDelete
  doDelete:
    RMDir /r "$APPDATA\${PRODUCT_NAME}"
    RMDir /r "$LOCALAPPDATA\${PRODUCT_NAME}"
    RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
    Goto noDelete
  noDelete:
!macroend

; customUnInstallDelete no es necesario al borrar directamente en customUnInstall

; Script de instalación personalizado para Resortes Puerto Montt v1.1.2
; Autor: Mathias Jara <mathias.jara@hotmail.com>

; Forzar instalación para toda la máquina (más profesional)
RequestExecutionLevel admin

; Establecer el directorio de instalación por defecto
!define INSTALL_DIR "C:\Program Files\Resortes Puerto Montt"
InstallDir "${INSTALL_DIR}"

!macro preInit
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customInstall
  ; Crear directorio de datos si no existe
  CreateDirectory "$APPDATA\ResortesPuertoMontt"
  CreateDirectory "$APPDATA\ResortesPuertoMontt\data"
  CreateDirectory "$APPDATA\ResortesPuertoMontt\backups"
  
  ; Crear archivo de configuración inicial
  FileOpen $0 "$APPDATA\ResortesPuertoMontt\config.json" w
  FileWrite $0 '{"version":"1.1.0","firstRun":true,"backupEnabled":true}'
  FileClose $0
  
  ; Crear acceso directo en el escritorio
  CreateShortCut "$DESKTOP\Resortes Puerto Montt.lnk" "$INSTDIR\Resortes Puerto Montt.exe" "" "$INSTDIR\assets\icon.ico"
  
  ; Crear entrada en el menú de inicio
  CreateDirectory "$SMPROGRAMS\Resortes Puerto Montt"
  CreateShortCut "$SMPROGRAMS\Resortes Puerto Montt\Resortes Puerto Montt.lnk" "$INSTDIR\Resortes Puerto Montt.exe" "" "$INSTDIR\assets\icon.ico"
  CreateShortCut "$SMPROGRAMS\Resortes Puerto Montt\Desinstalar.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\assets\icon.ico"
!macroend

; Nota: macro customUnInstall ya definida arriba para mostrar la página de opciones

; Configuración simplificada para una instalación más profesional y automática
