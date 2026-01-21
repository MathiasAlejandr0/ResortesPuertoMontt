# 🔧 Fix: Errores SQLITE_NOTADB en SQLCipher

## Problema
Error `SQLITE_NOTADB: file is not a database` al ejecutar PRAGMAs después de configurar la clave de encriptación.

## Causa Raíz
1. Los PRAGMAs se ejecutaban antes de verificar que la BD estaba completamente abierta
2. `PRAGMA journal_mode = WAL` puede causar problemas con SQLCipher
3. Algunos PRAGMAs no son compatibles con SQLCipher

## Solución Implementada

### 1. Verificación de Acceso
```typescript
// Verificar que la BD está abierta antes de ejecutar PRAGMAs
this.db!.get('SELECT 1 as test', (err, row) => {
  // Si esto falla, la BD no está lista
  // Continuar con PRAGMAs solo si esta consulta tiene éxito
});
```

### 2. Cambio de WAL a DELETE
```typescript
// ANTES (causaba errores):
PRAGMA journal_mode = WAL

// DESPUÉS (compatible con SQLCipher):
PRAGMA journal_mode = DELETE
```

### 3. PRAGMAs Eliminados/Modificados
- ❌ `PRAGMA mmap_size` - Eliminado (no compatible con SQLCipher)
- ✅ `PRAGMA journal_mode = DELETE` - Cambiado de WAL a DELETE
- ✅ Todos los PRAGMAs ahora se ejecutan secuencialmente

## Si el Problema Persiste

### Opción 1: Verificar si la BD está corrupta
```bash
# Verificar tamaño del archivo
ls -lh resortes.db

# Si es 0 bytes o muy pequeño, está corrupta
```

### Opción 2: Eliminar y recrear la BD
```bash
# Hacer backup primero
cp resortes.db resortes.db.backup

# Eliminar BD corrupta
rm resortes.db

# La aplicación creará una nueva automáticamente
```

### Opción 3: Verificar la clave de encriptación
```bash
# La clave debe estar en:
# ~/Library/Application Support/ResortesPuertoMontt/keys/db.key

# Si la clave está corrupta, eliminar y dejar que se regenere
rm -rf ~/Library/Application\ Support/ResortesPuertoMontt/keys/
```

## Orden Correcto de PRAGMAs

1. ✅ `PRAGMA key` (establecer clave)
2. ✅ `SELECT 1` (verificar acceso)
3. ✅ `PRAGMA cipher_version` (verificar encriptación)
4. ✅ `PRAGMA cipher_default_kdf_iter`
5. ✅ `PRAGMA foreign_keys = ON`
6. ✅ `PRAGMA journal_mode = DELETE` (no WAL)
7. ✅ `PRAGMA synchronous = NORMAL`
8. ✅ `PRAGMA cache_size`
9. ✅ `PRAGMA temp_store`
10. ✅ `PRAGMA busy_timeout`
11. ✅ `createTables()`
12. ✅ `PRAGMA optimize` (después de crear tablas)

## Estado
✅ Código corregido y compilado
⚠️ Si el problema persiste, puede ser BD corrupta - ver Opción 2
