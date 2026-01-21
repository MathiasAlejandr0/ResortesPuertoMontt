#!/bin/bash

# Script para eliminar base de datos corrupta y recrearla
# Uso: ./fix-corrupt-db.sh

echo "🔧 Script de reparación de base de datos corrupta"
echo "=================================================="
echo ""

# Directorios
ELECTRON_DATA_DIR="$HOME/Library/Application Support/Electron/data"
APP_DATA_DIR="$HOME/Library/Application Support/ResortesPuertoMontt/data"
KEYS_DIR="$HOME/Library/Application Support/ResortesPuertoMontt/keys"

# Backup
BACKUP_DIR="$HOME/Desktop/resortes_db_backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📦 Creando backups..."

# Backup de BD en Electron
if [ -f "$ELECTRON_DATA_DIR/resortes.db" ]; then
    echo "  → Backup de: $ELECTRON_DATA_DIR/resortes.db"
    cp "$ELECTRON_DATA_DIR/resortes.db" "$BACKUP_DIR/resortes_electron_$TIMESTAMP.db"
fi

# Backup de BD en App Data
if [ -f "$APP_DATA_DIR/resortes.db" ]; then
    echo "  → Backup de: $APP_DATA_DIR/resortes.db"
    cp "$APP_DATA_DIR/resortes.db" "$BACKUP_DIR/resortes_app_$TIMESTAMP.db"
fi

# Backup de claves
if [ -d "$KEYS_DIR" ]; then
    echo "  → Backup de claves de encriptación"
    cp -r "$KEYS_DIR" "$BACKUP_DIR/keys_$TIMESTAMP"
fi

echo ""
echo "🗑️  Eliminando base de datos corrupta..."

# Eliminar BD corrupta
if [ -f "$ELECTRON_DATA_DIR/resortes.db" ]; then
    rm "$ELECTRON_DATA_DIR/resortes.db"
    echo "  ✅ Eliminada: $ELECTRON_DATA_DIR/resortes.db"
fi

if [ -f "$APP_DATA_DIR/resortes.db" ]; then
    rm "$APP_DATA_DIR/resortes.db"
    echo "  ✅ Eliminada: $APP_DATA_DIR/resortes.db"
fi

# Eliminar claves (se regenerarán automáticamente)
if [ -d "$KEYS_DIR" ]; then
    rm -rf "$KEYS_DIR"
    echo "  ✅ Eliminadas claves (se regenerarán automáticamente)"
fi

echo ""
echo "✅ Proceso completado!"
echo ""
echo "📁 Backups guardados en: $BACKUP_DIR"
echo ""
echo "🚀 Ahora ejecuta: npm run dev"
echo "   La aplicación creará una nueva base de datos encriptada automáticamente."
