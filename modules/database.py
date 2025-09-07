import sqlite3
import os
from datetime import datetime

class Database:
    def __init__(self, db_name="taller_mecanico.db"):
        self.db_name = db_name
        self.conn = None
        self.connect()
    
    def connect(self):
        """Conectar a la base de datos"""
        try:
            self.conn = sqlite3.connect(self.db_name)
            self.conn.row_factory = sqlite3.Row
        except Exception as e:
            print(f"Error conectando a la base de datos: {e}")
    
    def execute(self, query, params=()):
        """Ejecutar consulta SQL"""
        try:
            cursor = self.conn.cursor()
            cursor.execute(query, params)
            self.conn.commit()
            return cursor
        except Exception as e:
            print(f"Error ejecutando consulta: {e}")
            return None
    
    def fetch_all(self, query, params=()):
        """Obtener todos los resultados"""
        cursor = self.execute(query, params)
        if cursor:
            return cursor.fetchall()
        return []
    
    def fetch_one(self, query, params=()):
        """Obtener un resultado"""
        cursor = self.execute(query, params)
        if cursor:
            return cursor.fetchone()
        return None
    
    def create_tables(self):
        """Crear todas las tablas del sistema"""
        try:
            # Tabla de usuarios
            self.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabla de proveedores
            self.execute("""
                CREATE TABLE IF NOT EXISTS suppliers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    contact_person TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    rut TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabla de productos/inventario
            self.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    lot TEXT,
                    supplier_id INTEGER,
                    unit_price REAL NOT NULL,
                    stock INTEGER DEFAULT 0,
                    min_stock INTEGER DEFAULT 0,
                    max_stock INTEGER DEFAULT 1000,
                    category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
                )
            """)
            
            # Tabla de clientes
            self.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    rut TEXT UNIQUE,
                    license_plate TEXT,
                    address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabla de trabajadores
            self.execute("""
                CREATE TABLE IF NOT EXISTS workers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    rut TEXT UNIQUE,
                    position TEXT,
                    hourly_rate REAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabla de máquinas/vehículos
            self.execute("""
                CREATE TABLE IF NOT EXISTS machines (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER,
                    license_plate TEXT,
                    brand TEXT,
                    model TEXT,
                    year INTEGER,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients (id)
                )
            """)
            
            # Tabla de órdenes de trabajo
            self.execute("""
                CREATE TABLE IF NOT EXISTS work_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER,
                    machine_id INTEGER,
                    description TEXT NOT NULL,
                    start_date TIMESTAMP,
                    end_date TIMESTAMP,
                    status TEXT DEFAULT 'pendiente',
                    total_cost REAL DEFAULT 0,
                    labor_cost REAL DEFAULT 0,
                    parts_cost REAL DEFAULT 0,
                    final_price REAL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients (id),
                    FOREIGN KEY (machine_id) REFERENCES machines (id)
                )
            """)
            
            # Tabla de trabajadores asignados a órdenes
            self.execute("""
                CREATE TABLE IF NOT EXISTS work_order_workers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    work_order_id INTEGER,
                    worker_id INTEGER,
                    hours_worked REAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (work_order_id) REFERENCES work_orders (id),
                    FOREIGN KEY (worker_id) REFERENCES workers (id),
                    UNIQUE(work_order_id, worker_id)
                )
            """)
            
            # Tabla de repuestos usados en trabajos
            self.execute("""
                CREATE TABLE IF NOT EXISTS work_order_parts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    work_order_id INTEGER,
                    product_id INTEGER,
                    quantity_used REAL NOT NULL,
                    unit_price REAL NOT NULL,
                    total_price REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (work_order_id) REFERENCES work_orders (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # Tabla de ventas
            self.execute("""
                CREATE TABLE IF NOT EXISTS sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER,
                    product_id INTEGER,
                    quantity_sold REAL NOT NULL,
                    quantity_used REAL NOT NULL,
                    quantity_remainder REAL DEFAULT 0,
                    unit_price REAL NOT NULL,
                    total_price REAL NOT NULL,
                    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    notes TEXT,
                    FOREIGN KEY (client_id) REFERENCES clients (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # Tabla de cotizaciones
            self.execute("""
                CREATE TABLE IF NOT EXISTS quotes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER,
                    quote_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT NOT NULL,
                    labor_cost REAL DEFAULT 0,
                    parts_cost REAL DEFAULT 0,
                    calculated_total REAL DEFAULT 0,
                    final_price REAL DEFAULT 0,
                    status TEXT DEFAULT 'Pendiente',
                    valid_until TIMESTAMP,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients (id)
                )
            """)
            
            # Tabla de items de cotizaciones
            self.execute("""
                CREATE TABLE IF NOT EXISTS quote_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    quote_id INTEGER,
                    product_id INTEGER,
                    quantity REAL NOT NULL,
                    unit_price REAL NOT NULL,
                    total_price REAL NOT NULL,
                    item_type TEXT DEFAULT 'part',
                    description TEXT,
                    FOREIGN KEY (quote_id) REFERENCES quotes (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # Tabla de órdenes de compra
            self.execute("""
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    supplier_id INTEGER,
                    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    delivery_date TIMESTAMP,
                    status TEXT DEFAULT 'pendiente',
                    total_amount REAL DEFAULT 0,
                    notes TEXT,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
                )
            """)
            
            # Tabla de items de órdenes de compra
            self.execute("""
                CREATE TABLE IF NOT EXISTS purchase_order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    purchase_order_id INTEGER,
                    product_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    total_price REAL NOT NULL,
                    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id)
                )
            """)
            
            # Tabla de pagos a proveedores
            self.execute("""
                CREATE TABLE IF NOT EXISTS supplier_payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    supplier_id INTEGER,
                    amount REAL NOT NULL,
                    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    payment_method TEXT,
                    reference TEXT,
                    notes TEXT,
                    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
                )
            """)
            
            # Tabla de sobrantes de materiales
            self.execute("""
                CREATE TABLE IF NOT EXISTS material_remainders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    original_sale_id INTEGER,
                    product_id INTEGER,
                    quantity_available REAL NOT NULL,
                    unit_price REAL NOT NULL,
                    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'available',
                    notes TEXT,
                    FOREIGN KEY (original_sale_id) REFERENCES sales (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # Tabla de análisis de productos estrella
            self.execute("""
                CREATE TABLE IF NOT EXISTS product_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    total_sold REAL DEFAULT 0,
                    total_revenue REAL DEFAULT 0,
                    avg_monthly_sales REAL DEFAULT 0,
                    last_sale_date TIMESTAMP,
                    star_rating INTEGER DEFAULT 0,
                    recommendation TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # Tabla de alertas de stock
            self.execute("""
                CREATE TABLE IF NOT EXISTS stock_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    priority INTEGER DEFAULT 1,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            """)
            
            # Insertar usuario administrador por defecto si no existe
            import hashlib
            admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
            self.execute("""
                INSERT OR IGNORE INTO users (username, password, role, full_name)
                VALUES ('admin', ?, 'administrador', 'Administrador del Sistema')
            """, (admin_password,))
            
            # Insertar usuario de taller por defecto
            taller_password = hashlib.sha256('taller123'.encode()).hexdigest()
            self.execute("""
                INSERT OR IGNORE INTO users (username, password, role, full_name)
                VALUES ('taller', ?, 'taller', 'Usuario Taller')
            """, (taller_password,))
            
            # Insertar usuario de bodega por defecto
            bodega_password = hashlib.sha256('bodega123'.encode()).hexdigest()
            self.execute("""
                INSERT OR IGNORE INTO users (username, password, role, full_name)
                VALUES ('bodega', ?, 'bodega', 'Usuario Bodega')
            """, (bodega_password,))
            
            # Insertar usuario de ventas por defecto
            ventas_password = hashlib.sha256('ventas123'.encode()).hexdigest()
            self.execute("""
                INSERT OR IGNORE INTO users (username, password, role, full_name)
                VALUES ('ventas', ?, 'ventas', 'Usuario Ventas')
            """, (ventas_password,))
            
            print("Tablas creadas exitosamente")
            
        except Exception as e:
            print(f"Error creando tablas: {e}")
    
    def close(self):
        """Cerrar conexión a la base de datos"""
        if self.conn:
            self.conn.close()
    
    def __del__(self):
        """Destructor para cerrar conexión"""
        self.close()
