# Por qué Windows bloquea la aplicación y qué hacer

## Por qué Windows la bloquea

Windows **SmartScreen** (y a veces Defender) muestra advertencias o bloquea ejecutables cuando:

1. **No están firmados** con un certificado de firma de código reconocido.
2. **No tienen “reputación”**: es la primera vez que muchos usuarios la ejecutan (o nadie la ha reportado como segura).
3. Se **descargó desde internet** o se copió desde USB/OneDrive (Windows lo trata como origen no confiable).

Tu aplicación es **software privado** y no está firmada, por eso Windows muestra algo como:
- “Windows protegió tu PC”
- “La aplicación no reconocida podría poner en peligro tu PC”
- O la opción de “Enviar para revisión” / “Enviar para análisis”

**Importante:** No tienes que enviar el programa a Microsoft para usarlo. Esa opción es para quienes quieren que Microsoft marque el archivo como “conocido”. Para software privado de una empresa no es necesario ni recomendable.

---

## Cómo usar la aplicación ahora (sin enviar nada)

En el equipo donde quieras ejecutar **Resortes Puerto Montt**:

1. Cuando aparezca el aviso de Windows (“Windows protegió tu PC” o similar):
   - Haz clic en **“Más información”** (o “More info”).
   - Aparecerá el botón **“Ejecutar de todas formas”** (o “Run anyway”).
   - Haz clic ahí.

2. La aplicación se ejecutará con normalidad. Solo hace falta hacerlo **una vez por equipo** (o la primera vez que se instala/ejecuta desde esa ubicación).

Así puedes instalar y usar el programa en el notebook del cliente **sin enviar el .exe a nadie**.

---

## Firma gratuita con herramientas de Windows (certificado autofirmado)

Puedes **firmar el instalador** sin pagar a una autoridad de certificación, usando solo herramientas de Windows:

1. **Crear un certificado de firma** (una vez) con PowerShell.
2. **Firmar el .exe** con SignTool (incluido en Windows SDK).
3. **En el PC del cliente:** instalar el certificado como “de confianza” (una vez por equipo). Después de eso, Windows ya no mostrará la advertencia para tu aplicación.

### Paso 1: Crear el certificado (solo la primera vez)

En PowerShell, desde la carpeta del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\crear-certificado-firma.ps1
```

Te pedirá una **contraseña para el .pfx** (guárdala; la usarás al firmar). Se crearán:

- `release\certificado-firma\ResortesPuertoMontt-firma.pfx` → para firmar (no compartas este archivo).
- `release\certificado-firma\ResortesPuertoMontt-firma.cer` → para instalar en el PC del cliente.

### Paso 2: Firmar el instalador

Cada vez que generes un nuevo instalador:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\firmar-instalador.ps1
```

Te pedirá la contraseña del .pfx. El script firmará `release\Resortes Puerto Montt-Setup.exe`.

**Si no tienes SignTool:** viene con el **Windows SDK**. Opciones:

- Instalar [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/) (solo el componente “Signing Tools” si lo permite), o  
- En **Visual Studio Installer** → Modificar → “Desarrollo para el escritorio” → marcar **“Herramientas de firma para Windows”**.

### Paso 3: En el notebook del cliente (una vez por equipo)

Para que Windows **confíe** en tu firma y no muestre la advertencia:

1. Copia el archivo **`ResortesPuertoMontt-firma.cer`** al cliente (junto con el instalador o por separado).
2. Doble clic en el .cer → **“Instalar certificado…”**.
3. Ubicación: **“Equipo local”** (o “Usuario actual” si no tienes permisos de administrador).
4. Colocar en: **“Entidad emisora raíz de confianza”** (o “Trusted Root Certification Authorities”).
5. Siguiente → Finalizar. Aceptar la advertencia de seguridad.

A partir de ahí, al ejecutar **Resortes Puerto Montt-Setup.exe**, Windows reconocerá la firma y no debería mostrar “Windows protegió tu PC”.

---

## Solución de pago (certificado de una autoridad)

Si en el futuro quieres que **ningún cliente** tenga que instalar un certificado (por ejemplo, para distribuir a muchos equipos o empresas):

- Comprar un **certificado de firma de código** a una CA (DigiCert, Sectigo, SSL.com, etc.), desde ~70 USD/año.
- Firmar el .exe con ese certificado (signtool o electron-builder). Windows confiará en la firma sin instalar nada en el cliente.

---

## Resumen

| Situación | Qué hacer |
|-----------|------------|
| Usar la app ya (tú o el cliente) | En el aviso: **“Más información”** → **“Ejecutar de todas formas”**. No hace falta enviar nada. |
| Firma gratuita (herramientas Windows) | 1) `scripts\crear-certificado-firma.ps1` → 2) `scripts\firmar-instalador.ps1` → 3) En el cliente, instalar el .cer como “Entidad emisora raíz de confianza”. |
| Que nunca salga el aviso sin instalar nada en el cliente | Firmar con un certificado comprado a una CA (pago anual). |
| “Enviar para revisión” | No es necesario para software privado; puedes ignorar esa opción. |

Tu software es privado y no tienes que distribuirlo ni enviarlo a Microsoft para poder usarlo en los equipos de la empresa.
