# 🔧 Sistema de Gestión - Resortes Puerto Montt

Sistema integral de gestión empresarial para taller mecánico desarrollado en Python con interfaz gráfica moderna.

## 📋 Descripción

Sistema completo de gestión empresarial diseñado específicamente para talleres mecánicos, que incluye módulos para:

- 👥 **Gestión de Clientes**
- 📦 **Control de Inventario**
- 📋 **Cotizaciones y Ventas**
- 🔧 **Gestión de Taller**
- 👷 **Recursos Humanos**
- 📊 **Reportes y Analytics**

## ✨ Características

### 🎨 Interfaz Moderna
- **Sidebar lateral** para navegación intuitiva
- **Dashboard** con métricas en tiempo real
- **Diseño responsivo** y centrado
- **Colores corporativos** (Rojo Bermellón #A51611)

### 🚀 Funcionalidades Principales
- **Autenticación segura** con roles de usuario
- **Base de datos SQLite** integrada
- **Formularios dinámicos** con validación
- **Búsqueda avanzada** en todos los módulos
- **Sistema de respaldos** automático
- **Logs detallados** del sistema

### 📦 Módulos Incluidos
- **Clientes**: Gestión completa de información de clientes
- **Inventario**: Control de stock y productos
- **Cotizaciones**: Creación y seguimiento de cotizaciones
- **Taller**: Gestión de servicios y reparaciones
- **Proveedores**: Administración de proveedores
- **Trabajadores**: Recursos humanos
- **Reportes**: Análisis y reportes del negocio

## 🛠️ Tecnologías Utilizadas

- **Python 3.12+**
- **Tkinter** - Interfaz gráfica
- **SQLite3** - Base de datos
- **Pandas** - Análisis de datos
- **Matplotlib** - Gráficos y reportes

## 📦 Instalación

### Requisitos Previos
- Python 3.12 o superior
- pip (gestor de paquetes de Python)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/MathiasAlejandr0/ResortesPuertoMontt.git
   cd ResortesPuertoMontt
   ```

2. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar el sistema**
   ```bash
   python main.py
   ```
   
   O usar el script de Windows:
   ```bash
   run_app.bat
   ```

## 🔐 Acceso al Sistema

### Credenciales por Defecto
- **Usuario**: `admin`
- **Contraseña**: `admin123`

> ⚠️ **Importante**: Cambiar las credenciales por defecto en el primer uso.

## 📁 Estructura del Proyecto

```
ResortesPuertoMontt/
├── main.py                    # Archivo principal
├── modules/                   # Módulos del sistema
│   ├── auth.py               # Autenticación
│   ├── clients.py            # Gestión de clientes
│   ├── inventory.py          # Control de inventario
│   ├── quotes.py             # Cotizaciones
│   ├── styles.py             # Estilos y colores
│   └── ...                   # Otros módulos
├── assets/                   # Recursos del sistema
├── backups/                  # Respaldos automáticos
├── logs/                     # Logs del sistema
├── requirements.txt          # Dependencias
└── README.md                # Este archivo
```

## 🚀 Uso del Sistema

### 1. Inicio de Sesión
- Ejecutar `python main.py`
- Ingresar credenciales de usuario
- El sistema mostrará el dashboard principal

### 2. Navegación
- Usar el **sidebar lateral** para cambiar entre módulos
- El **dashboard** muestra métricas en tiempo real
- Cada módulo tiene su propia interfaz especializada

### 3. Gestión de Datos
- **Agregar**: Usar botones "Nuevo" en cada módulo
- **Editar**: Seleccionar elemento y usar botón "Editar"
- **Eliminar**: Seleccionar elemento y usar botón "Eliminar"
- **Buscar**: Usar campos de búsqueda en cada módulo

## 🔧 Configuración

### Personalización de Colores
Los colores del sistema se pueden modificar en `modules/styles.py`:

```python
COLORS = {
    'primary': '#A51611',       # Rojo bermellón principal
    'primary_light': '#C41E3A', # Rojo bermellón claro
    'primary_dark': '#8B0000',  # Rojo bermellón oscuro
    # ... otros colores
}
```

### Base de Datos
- La base de datos SQLite se crea automáticamente
- Ubicación: `taller_mecanico.db`
- Se incluyen respaldos automáticos en `backups/`

## 📊 Características Técnicas

- **Arquitectura**: Modular y escalable
- **Base de Datos**: SQLite3 con esquema optimizado
- **Interfaz**: Tkinter con diseño moderno
- **Seguridad**: Autenticación con hash SHA-256
- **Logs**: Sistema de logging completo
- **Respaldos**: Automáticos y manuales

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Desarrollador

**Mathias Alejandro**
- GitHub: [@MathiasAlejandr0](https://github.com/MathiasAlejandr0)
- Proyecto: [ResortesPuertoMontt](https://github.com/MathiasAlejandr0/ResortesPuertoMontt)

## 📞 Soporte

Para soporte técnico o consultas:
- Crear un issue en GitHub
- Contactar al desarrollador

---

**Sistema de Gestión - Resortes Puerto Montt**  
*Desarrollado con ❤️ en Python*