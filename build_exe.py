#!/usr/bin/env python3
"""
Script para empaquetar la aplicación Taller Mecánico como ejecutable .exe
Usando PyInstaller para crear un archivo ejecutable independiente
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_pyinstaller():
    """Verificar si PyInstaller está instalado"""
    try:
        import PyInstaller
        print("✅ PyInstaller encontrado")
        return True
    except ImportError:
        print("❌ PyInstaller no encontrado")
        return False

def install_pyinstaller():
    """Instalar PyInstaller si no está disponible"""
    print("📦 Instalando PyInstaller...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("✅ PyInstaller instalado correctamente")
        return True
    except subprocess.CalledProcessError:
        print("❌ Error instalando PyInstaller")
        return False

def create_spec_file():
    """Crear archivo .spec para PyInstaller"""
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'tkinter',
        'tkinter.ttk',
        'tkinter.messagebox',
        'tkinter.filedialog',
        'sqlite3',
        'datetime',
        'os',
        'sys'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='TallerMecanico',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
    version_file=None,
)
'''
    
    with open('TallerMecanico.spec', 'w', encoding='utf-8') as f:
        f.write(spec_content)
    
    print("✅ Archivo .spec creado")

def build_executable():
    """Construir el ejecutable usando PyInstaller"""
    print("🔨 Construyendo ejecutable...")
    
    try:
        # Usar el archivo .spec personalizado
        subprocess.check_call([
            sys.executable, "-m", "PyInstaller",
            "--clean",
            "TallerMecanico.spec"
        ])
        print("✅ Ejecutable construido correctamente")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error construyendo ejecutable: {e}")
        return False

def create_installer_package():
    """Crear paquete de instalación"""
    print("📦 Creando paquete de instalación...")
    
    # Directorio de distribución
    dist_dir = Path("dist")
    if not dist_dir.exists():
        print("❌ Directorio dist no encontrado")
        return False
    
    # Crear directorio para el paquete
    package_dir = Path("TallerMecanico_Package")
    if package_dir.exists():
        shutil.rmtree(package_dir)
    
    package_dir.mkdir()
    
    # Copiar ejecutable
    exe_file = dist_dir / "TallerMecanico.exe"
    if exe_file.exists():
        shutil.copy2(exe_file, package_dir)
        print("✅ Ejecutable copiado")
    else:
        print("❌ Ejecutable no encontrado")
        return False
    
    # Copiar README
    readme_file = Path("README.md")
    if readme_file.exists():
        shutil.copy2(readme_file, package_dir)
        print("✅ README copiado")
    
    # Crear archivo de instalación
    install_bat = package_dir / "Instalar.bat"
    install_content = '''@echo off
echo Instalando Sistema de Gestion Taller Mecanico...
echo.
echo El sistema se instalara en el directorio actual.
echo.
echo Presione cualquier tecla para continuar...
pause >nul
echo.
echo Instalacion completada!
echo.
echo Para ejecutar el sistema, haga doble clic en TallerMecanico.exe
echo.
pause
'''
    
    with open(install_bat, 'w', encoding='utf-8') as f:
        f.write(install_content)
    
    print("✅ Archivo de instalación creado")
    
    # Crear archivo de desinstalación
    uninstall_bat = package_dir / "Desinstalar.bat"
    uninstall_content = '''@echo off
echo Desinstalando Sistema de Gestion Taller Mecanico...
echo.
echo ¿Está seguro de que desea desinstalar el sistema? (S/N)
set /p confirm=
if /i "%confirm%"=="S" (
    echo.
    echo Eliminando archivos...
    del TallerMecanico.exe
    del README.md
    del Instalar.bat
    del Desinstalar.bat
    echo.
    echo Sistema desinstalado correctamente.
) else (
    echo.
    echo Desinstalacion cancelada.
)
echo.
pause
'''
    
    with open(uninstall_bat, 'w', encoding='utf-8') as f:
        f.write(uninstall_content)
    
    print("✅ Archivo de desinstalación creado")
    
    # Crear archivo de información
    info_txt = package_dir / "INFORMACION.txt"
    info_content = '''SISTEMA DE GESTIÓN PARA TALLER MECÁNICO
================================================

ARCHIVOS INCLUIDOS:
- TallerMecanico.exe: Aplicación principal
- README.md: Documentación del sistema
- Instalar.bat: Script de instalación
- Desinstalar.bat: Script de desinstalación

INSTRUCCIONES DE INSTALACIÓN:
1. Ejecutar "Instalar.bat" para la instalación automática
2. O copiar manualmente los archivos a la ubicación deseada
3. Ejecutar "TallerMecanico.exe" para iniciar el sistema

USUARIOS POR DEFECTO:
- Administrador: admin / admin123
- Taller: taller / taller123
- Bodega: bodega / bodega123
- Ventas: ventas / ventas123

NOTAS:
- El sistema crea automáticamente la base de datos en la primera ejecución
- No requiere instalación de Python ni dependencias adicionales
- Funciona en Windows 10/11 sin requisitos especiales

SOPORTE:
Para soporte técnico, contactar al equipo de desarrollo.
'''
    
    with open(info_txt, 'w', encoding='utf-8') as f:
        f.write(info_content)
    
    print("✅ Archivo de información creado")
    
    return True

def main():
    """Función principal"""
    print("🚀 INICIANDO PROCESO DE EMPAQUETADO")
    print("=" * 50)
    
    # Verificar PyInstaller
    if not check_pyinstaller():
        if not install_pyinstaller():
            print("❌ No se pudo instalar PyInstaller. Abortando...")
            return False
    
    # Crear archivo .spec
    create_spec_file()
    
    # Construir ejecutable
    if not build_executable():
        print("❌ Error en la construcción. Abortando...")
        return False
    
    # Crear paquete de instalación
    if not create_installer_package():
        print("❌ Error creando paquete. Abortando...")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 EMPAQUETADO COMPLETADO EXITOSAMENTE!")
    print("=" * 50)
    print("\nArchivos generados:")
    print("📁 dist/TallerMecanico.exe - Ejecutable principal")
    print("📁 TallerMecanico_Package/ - Paquete completo de instalación")
    print("\nEl paquete está listo para distribución.")
    print("Copie la carpeta 'TallerMecanico_Package' a la máquina destino.")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        if success:
            print("\n✅ Proceso completado. Presione Enter para salir...")
        else:
            print("\n❌ Proceso falló. Presione Enter para salir...")
        input()
    except KeyboardInterrupt:
        print("\n\n⚠️ Proceso interrumpido por el usuario.")
        print("Presione Enter para salir...")
        input()
    except Exception as e:
        print(f"\n\n💥 Error inesperado: {e}")
        print("Presione Enter para salir...")
        input()
