#!/bin/bash
# Script de migración completa de seguridad
# Resortes Puerto Montt v1.1.2
# OWASP/GDPR/ISO 27001 Compliance

echo "🔒 Iniciando migración de seguridad completa..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paso 1: Desinstalar dependencias vulnerables
echo -e "${YELLOW}📦 Paso 1: Desinstalando dependencias vulnerables...${NC}"
npm uninstall sqlite3
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ sqlite3 desinstalado${NC}"
else
    echo -e "${RED}❌ Error desinstalando sqlite3${NC}"
    exit 1
fi

npm uninstall xlsx
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ xlsx desinstalado${NC}"
else
    echo -e "${YELLOW}⚠️  xlsx no estaba instalado (ya migrado)${NC}"
fi

echo ""

# Paso 2: Instalar dependencias seguras
echo -e "${YELLOW}📦 Paso 2: Instalando dependencias seguras...${NC}"

npm install @journeyapps/sqlcipher
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ @journeyapps/sqlcipher instalado${NC}"
else
    echo -e "${RED}❌ Error instalando @journeyapps/sqlcipher${NC}"
    exit 1
fi

# Verificar si exceljs ya está instalado
if npm list exceljs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ exceljs ya está instalado${NC}"
else
    echo -e "${YELLOW}📦 Instalando exceljs...${NC}"
    npm install exceljs
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ exceljs instalado${NC}"
    else
        echo -e "${RED}❌ Error instalando exceljs${NC}"
        exit 1
    fi
fi

npm install --save-dev @types/node
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ @types/node instalado${NC}"
else
    echo -e "${YELLOW}⚠️  @types/node ya estaba instalado${NC}"
fi

echo ""

# Paso 3: Verificar instalación
echo -e "${YELLOW}🔍 Paso 3: Verificando instalación...${NC}"

if npm list @journeyapps/sqlcipher > /dev/null 2>&1; then
    echo -e "${GREEN}✅ @journeyapps/sqlcipher verificado${NC}"
    npm list @journeyapps/sqlcipher | grep sqlcipher
else
    echo -e "${RED}❌ @journeyapps/sqlcipher NO encontrado${NC}"
    exit 1
fi

if npm list exceljs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ exceljs verificado${NC}"
    npm list exceljs | grep exceljs
else
    echo -e "${RED}❌ exceljs NO encontrado${NC}"
    exit 1
fi

# Verificar que sqlite3 y xlsx NO estén instalados
if npm list sqlite3 > /dev/null 2>&1; then
    echo -e "${RED}❌ sqlite3 todavía está instalado${NC}"
    exit 1
else
    echo -e "${GREEN}✅ sqlite3 correctamente desinstalado${NC}"
fi

if npm list xlsx > /dev/null 2>&1; then
    echo -e "${RED}❌ xlsx todavía está instalado${NC}"
    exit 1
else
    echo -e "${GREEN}✅ xlsx correctamente desinstalado${NC}"
fi

echo ""

# Paso 4: Compilar proyecto
echo -e "${YELLOW}🔨 Paso 4: Compilando proyecto...${NC}"
npm run build:main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Compilación exitosa${NC}"
else
    echo -e "${RED}❌ Error en compilación${NC}"
    echo -e "${YELLOW}⚠️  Revisa los errores de TypeScript arriba${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Migración de seguridad completada exitosamente!${NC}"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ejecutar: npm run dev"
echo "2. Verificar que la aplicación inicia correctamente"
echo "3. Verificar logs: 'SQLCipher activo' debe aparecer"
echo "4. Probar importación de Excel"
echo "5. Verificar que logs no contengan PII (RUTs, emails, etc.)"
echo ""
echo "📚 Documentación completa: MIGRACION_SEGURIDAD_COMPLETA.md"

