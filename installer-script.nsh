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
  ; No crear carpetas en AppData aquí: la aplicación las crea al abrirse
  ; con el usuario actual, así se evitan problemas de permisos (instalador como admin).
  ; Crear acceso directo en el escritorio
  CreateShortCut "$DESKTOP\Resortes Puerto Montt.lnk" "$INSTDIR\Resortes Puerto Montt.exe" "" ""
  ; Crear entrada en el menú de inicio
  CreateDirectory "$SMPROGRAMS\Resortes Puerto Montt"
  CreateShortCut "$SMPROGRAMS\Resortes Puerto Montt\Resortes Puerto Montt.lnk" "$INSTDIR\Resortes Puerto Montt.exe" "" ""
  CreateShortCut "$SMPROGRAMS\Resortes Puerto Montt\Desinstalar.lnk" "$INSTDIR\Uninstall.exe" "" ""
!macroend

; Nota: macro customUnInstall ya definida arriba para mostrar la página de opciones

; Configuración simplificada para una instalación más profesional y automática
