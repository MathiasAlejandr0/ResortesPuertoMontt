import * as sqlite3 from 'sqlite3';
import * as path from 'path';

// Interfaces que coinciden exactamente con el software original
export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  password: string;
  rol: string;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface Cliente {
  id?: number;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string;
  direccion?: string;
  fechaRegistro?: string;
  activo?: boolean;
}

export interface Vehiculo {
  id?: number;
  clienteId: number;
  marca: string;
  modelo: string;
  año: number;
  patente: string;
  color?: string;
  kilometraje?: number;
  observaciones?: string;
  activo?: boolean;
}

export interface Servicio {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracionEstimada: number;
  activo?: boolean;
}

export interface Repuesto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock?: number;
  stockMinimo?: number;
  categoria: string;
  marca?: string;
  activo?: boolean;
}

export interface OrdenTrabajo {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fechaIngreso?: string;
  fechaEntrega?: string;
  estado: string;
  descripcion: string;
  observaciones?: string;
  total?: number;
  kilometrajeEntrada?: number;
  kilometrajeSalida?: number;
}

export interface DetalleOrden {
  id?: number;
  ordenId: number;
  tipo: string;
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface Cotizacion {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fecha?: string;
  validaHasta: string;
  estado: string;
  descripcion: string;
  observaciones?: string;
  total?: number;
}

export interface DetalleCotizacion {
  id?: number;
  cotizacionId: number;
  tipo: string;
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface Configuracion {
  id?: number;
  clave: string;
  valor: string;
  descripcion?: string;
}

export class DatabaseService {
  private db: sqlite3.Database;

  constructor() {
    console.log('🔧 DatabaseService: Iniciando constructor');
    const dbPath = path.join(__dirname, '../../data/resortes.db');
    console.log('🔧 DatabaseService: Ruta de base de datos:', dbPath);
    this.db = new sqlite3.Database(dbPath);
    console.log('✅ DatabaseService: Base de datos creada');
    this.initializeDatabase();
    console.log('✅ DatabaseService: Base de datos inicializada');
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      // Tabla de usuarios (sistema de autenticación)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT NOT NULL,
          rol TEXT NOT NULL,
          activo BOOLEAN DEFAULT 1,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de clientes
      this.db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          rut TEXT NOT NULL,
          telefono TEXT NOT NULL,
          email TEXT,
          direccion TEXT,
          fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
          activo BOOLEAN DEFAULT 1
        )
      `);

      // Tabla de vehículos (con color y kilometraje como en el original)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS vehiculos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clienteId INTEGER NOT NULL,
          marca TEXT NOT NULL,
          modelo TEXT NOT NULL,
          año INTEGER NOT NULL,
          patente TEXT NOT NULL,
          color TEXT,
          kilometraje INTEGER,
          observaciones TEXT,
          activo BOOLEAN DEFAULT 1,
          FOREIGN KEY (clienteId) REFERENCES clientes(id)
        )
      `);

      // Tabla de servicios (servicios predefinidos)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS servicios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio REAL NOT NULL,
          duracionEstimada INTEGER NOT NULL,
          activo BOOLEAN DEFAULT 1
        )
      `);

      // Tabla de repuestos (inventario)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS repuestos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT NOT NULL,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          precio REAL NOT NULL,
          stock INTEGER DEFAULT 0,
          stockMinimo INTEGER DEFAULT 0,
          categoria TEXT NOT NULL,
          marca TEXT,
          activo BOOLEAN DEFAULT 1
        )
      `);

      // Tabla de órdenes de trabajo
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ordenes_trabajo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL,
          clienteId INTEGER NOT NULL,
          vehiculoId INTEGER NOT NULL,
          fechaIngreso DATETIME DEFAULT CURRENT_TIMESTAMP,
          fechaEntrega DATETIME,
          estado TEXT NOT NULL DEFAULT 'pendiente',
          descripcion TEXT NOT NULL,
          observaciones TEXT,
          total REAL DEFAULT 0,
          kilometrajeEntrada INTEGER,
          kilometrajeSalida INTEGER,
          FOREIGN KEY (clienteId) REFERENCES clientes(id),
          FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
        )
      `);

      // Tabla de detalles de orden
      this.db.run(`
        CREATE TABLE IF NOT EXISTS detalles_orden (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ordenId INTEGER NOT NULL,
          tipo TEXT NOT NULL,
          servicioId INTEGER,
          repuestoId INTEGER,
          cantidad INTEGER NOT NULL,
          precio REAL NOT NULL,
          subtotal REAL NOT NULL,
          descripcion TEXT NOT NULL,
          FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id),
          FOREIGN KEY (servicioId) REFERENCES servicios(id),
          FOREIGN KEY (repuestoId) REFERENCES repuestos(id)
        )
      `);

      // Tabla de cotizaciones
      this.db.run(`
        CREATE TABLE IF NOT EXISTS cotizaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL,
          clienteId INTEGER NOT NULL,
          vehiculoId INTEGER NOT NULL,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
          validaHasta DATETIME NOT NULL,
          estado TEXT NOT NULL DEFAULT 'pendiente',
          descripcion TEXT NOT NULL,
          observaciones TEXT,
          total REAL DEFAULT 0,
          FOREIGN KEY (clienteId) REFERENCES clientes(id),
          FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
        )
      `);

      // Tabla de detalles de cotización
      this.db.run(`
        CREATE TABLE IF NOT EXISTS detalles_cotizacion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cotizacionId INTEGER NOT NULL,
          tipo TEXT NOT NULL,
          servicioId INTEGER,
          repuestoId INTEGER,
          cantidad INTEGER NOT NULL,
          precio REAL NOT NULL,
          subtotal REAL NOT NULL,
          descripcion TEXT NOT NULL,
          FOREIGN KEY (cotizacionId) REFERENCES cotizaciones(id),
          FOREIGN KEY (servicioId) REFERENCES servicios(id),
          FOREIGN KEY (repuestoId) REFERENCES repuestos(id)
        )
      `);

      // Tabla de configuración
      this.db.run(`
        CREATE TABLE IF NOT EXISTS configuracion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clave TEXT NOT NULL,
          valor TEXT NOT NULL,
          descripcion TEXT
        )
      `);

      // Insertar datos iniciales
      this.insertInitialData();
    });
  }

  private insertInitialData(): void {
    // Insertar usuario administrador
    this.db.run(`
      INSERT OR IGNORE INTO usuarios (nombre, email, password, rol, activo) 
      VALUES ('Administrador', 'admin@resortespm.cl', 'admin123', 'admin', 1)
    `);

    // Insertar servicios predefinidos
    this.db.run(`
      INSERT OR IGNORE INTO servicios (nombre, descripcion, precio, duracionEstimada, activo) 
      VALUES 
        ('Frenos', 'Revisión y reparación de sistema de frenos', 35000, 90, 1),
        ('Suspensión', 'Revisión y reparación de suspensión', 40000, 120, 1),
        ('Revisión General', 'Revisión completa del vehículo', 25000, 60, 1)
    `);

    // Insertar configuración inicial
    this.db.run(`
      INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) 
      VALUES 
        ('empresa_nombre', 'Resortes Puerto Montt', 'Nombre de la empresa'),
        ('empresa_telefono', '+56 9 1234 5678', 'Teléfono de la empresa'),
        ('empresa_direccion', 'Av. Principal 123, Puerto Montt', 'Dirección de la empresa')
    `);

    console.log('✅ Datos iniciales insertados');
  }

  // Métodos para usuarios
  async getAllUsuarios(): Promise<Usuario[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM usuarios ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Usuario[]);
      });
    });
  }

  async saveUsuario(usuario: Usuario): Promise<Usuario> {
    const id = usuario.id || Date.now();
    const usuarioToSave = { ...usuario, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO usuarios (id, nombre, email, password, rol, activo, fechaCreacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, usuarioToSave.nombre, usuarioToSave.email, usuarioToSave.password, 
         usuarioToSave.rol, usuarioToSave.activo, usuarioToSave.fechaCreacion || new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(usuarioToSave);
        }
      );
    });
  }

  // Métodos para clientes
  async getAllClientes(): Promise<Cliente[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM clientes ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Cliente[]);
      });
    });
  }

  async saveCliente(cliente: Cliente): Promise<Cliente> {
    const id = cliente.id || Date.now();
    const clienteToSave = { ...cliente, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO clientes (id, nombre, rut, telefono, email, direccion, fechaRegistro)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, clienteToSave.nombre, clienteToSave.rut, clienteToSave.telefono, 
         clienteToSave.email, clienteToSave.direccion, clienteToSave.fechaRegistro || new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(clienteToSave);
        }
      );
    });
  }

  // Métodos para vehículos
  async getAllVehiculos(): Promise<Vehiculo[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM vehiculos ORDER BY marca, modelo', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Vehiculo[]);
      });
    });
  }

  async saveVehiculo(vehiculo: Vehiculo): Promise<Vehiculo> {
    const id = vehiculo.id || Date.now();
    const vehiculoToSave = { ...vehiculo, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO vehiculos (id, clienteId, marca, modelo, año, patente, color, kilometraje, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, vehiculoToSave.clienteId, vehiculoToSave.marca, vehiculoToSave.modelo, 
         vehiculoToSave.año, vehiculoToSave.patente, vehiculoToSave.color, 
         vehiculoToSave.kilometraje, vehiculoToSave.observaciones],
        function(err) {
          if (err) reject(err);
          else resolve(vehiculoToSave);
        }
      );
    });
  }

  // Métodos para servicios
  async getAllServicios(): Promise<Servicio[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM servicios ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Servicio[]);
      });
    });
  }

  async saveServicio(servicio: Servicio): Promise<Servicio> {
    const id = servicio.id || Date.now();
    const servicioToSave = { ...servicio, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO servicios (id, nombre, descripcion, precio, duracionEstimada, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, servicioToSave.nombre, servicioToSave.descripcion, servicioToSave.precio, 
         servicioToSave.duracionEstimada, servicioToSave.activo],
        function(err) {
          if (err) reject(err);
          else resolve(servicioToSave);
        }
      );
    });
  }

  // Métodos para repuestos
  async getAllRepuestos(): Promise<Repuesto[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM repuestos ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Repuesto[]);
      });
    });
  }

  async saveRepuesto(repuesto: Repuesto): Promise<Repuesto> {
    const id = repuesto.id || Date.now();
    const repuestoToSave = { ...repuesto, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO repuestos (id, codigo, nombre, descripcion, precio, stock, stockMinimo, categoria, marca, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, repuestoToSave.codigo, repuestoToSave.nombre, repuestoToSave.descripcion,
         repuestoToSave.precio, repuestoToSave.stock, repuestoToSave.stockMinimo,
         repuestoToSave.categoria, repuestoToSave.marca, repuestoToSave.activo],
        function(err) {
          if (err) reject(err);
          else resolve(repuestoToSave);
        }
      );
    });
  }

  // Métodos para órdenes de trabajo
  async getAllOrdenesTrabajo(): Promise<OrdenTrabajo[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM ordenes_trabajo ORDER BY fechaIngreso DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as OrdenTrabajo[]);
      });
    });
  }

  async saveOrdenTrabajo(orden: OrdenTrabajo): Promise<OrdenTrabajo> {
    const id = orden.id || Date.now();
    const ordenToSave = { ...orden, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO ordenes_trabajo (id, numero, clienteId, vehiculoId, fechaIngreso, fechaEntrega, estado, descripcion, observaciones, total, kilometrajeEntrada, kilometrajeSalida)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ordenToSave.numero, ordenToSave.clienteId, ordenToSave.vehiculoId,
         ordenToSave.fechaIngreso, ordenToSave.fechaEntrega, ordenToSave.estado,
         ordenToSave.descripcion, ordenToSave.observaciones, ordenToSave.total,
         ordenToSave.kilometrajeEntrada, ordenToSave.kilometrajeSalida],
        function(err) {
          if (err) reject(err);
          else resolve(ordenToSave);
        }
      );
    });
  }

  // Métodos para cotizaciones
  async getAllCotizaciones(): Promise<Cotizacion[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM cotizaciones ORDER BY fecha DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Cotizacion[]);
      });
    });
  }

  async saveCotizacion(cotizacion: Cotizacion): Promise<Cotizacion> {
    const id = cotizacion.id || Date.now();
    const cotizacionToSave = { ...cotizacion, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO cotizaciones (id, numero, clienteId, vehiculoId, fecha, validaHasta, estado, descripcion, observaciones, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, cotizacionToSave.numero, cotizacionToSave.clienteId, cotizacionToSave.vehiculoId,
         cotizacionToSave.fecha, cotizacionToSave.validaHasta, cotizacionToSave.estado,
         cotizacionToSave.descripcion, cotizacionToSave.observaciones, cotizacionToSave.total],
        function(err) {
          if (err) reject(err);
          else resolve(cotizacionToSave);
        }
      );
    });
  }

  // Métodos para configuración
  async getAllConfiguracion(): Promise<Configuracion[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM configuracion ORDER BY clave', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Configuracion[]);
      });
    });
  }

  async saveConfiguracion(config: Configuracion): Promise<Configuracion> {
    const id = config.id || Date.now();
    const configToSave = { ...config, id };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO configuracion (id, clave, valor, descripcion)
         VALUES (?, ?, ?, ?)`,
        [id, configToSave.clave, configToSave.valor, configToSave.descripcion],
        function(err) {
          if (err) reject(err);
          else resolve(configToSave);
        }
      );
    });
  }
}
