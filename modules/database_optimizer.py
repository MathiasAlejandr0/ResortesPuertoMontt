"""
Sistema de Optimización de Base de Datos 2025
"""

import sqlite3
import time
import threading
from datetime import datetime, timedelta
from modules.styles import create_styled_label, create_styled_frame, COLORS, FONTS

class DatabaseOptimizer:
    def __init__(self, db_connection):
        self.db = db_connection
        self.query_cache = {}
        self.cache_ttl = 300  # 5 minutos
        self.connection_pool = []
        self.max_connections = 10
        self.optimization_stats = {
            'queries_executed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_query_time': 0,
            'slow_queries': []
        }
        self.setup_optimization()
    
    def setup_optimization(self):
        """Configurar optimizaciones de base de datos"""
        try:
            # Habilitar WAL mode para mejor concurrencia
            self.db.execute("PRAGMA journal_mode=WAL")
            
            # Optimizar para memoria
            self.db.execute("PRAGMA cache_size=10000")
            self.db.execute("PRAGMA temp_store=MEMORY")
            
            # Configurar timeouts
            self.db.execute("PRAGMA busy_timeout=30000")
            
            # Crear índices para optimizar consultas frecuentes
            self.create_performance_indexes()
            
            # Configurar análisis automático
            self.db.execute("PRAGMA analysis_limit=1000")
            
        except Exception as e:
            print(f"Error configurando optimizaciones: {e}")
    
    def create_performance_indexes(self):
        """Crear índices para optimizar consultas frecuentes"""
        indexes = [
            # Índices para clientes
            "CREATE INDEX IF NOT EXISTS idx_clients_rut ON clients(rut)",
            "CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)",
            "CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)",
            
            # Índices para productos
            "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)",
            "CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)",
            "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)",
            "CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock)",
            "CREATE INDEX IF NOT EXISTS idx_products_min_stock ON products(min_stock)",
            
            # Índices para órdenes de trabajo
            "CREATE INDEX IF NOT EXISTS idx_work_orders_client ON work_orders(client_id)",
            "CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)",
            "CREATE INDEX IF NOT EXISTS idx_work_orders_date ON work_orders(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority)",
            
            # Índices para cotizaciones
            "CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id)",
            "CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)",
            "CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number)",
            
            # Índices para ventas
            "CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)",
            "CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id)",
            "CREATE INDEX IF NOT EXISTS idx_sales_total ON sales(total_amount)",
            
            # Índices para proveedores
            "CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)",
            "CREATE INDEX IF NOT EXISTS idx_suppliers_rut ON suppliers(rut)",
            
            # Índices para notificaciones
            "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at)",
            
            # Índices para logs del sistema
            "CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)",
            "CREATE INDEX IF NOT EXISTS idx_system_logs_date ON system_logs(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_system_logs_module ON system_logs(module)"
        ]
        
        for index_sql in indexes:
            try:
                self.db.execute(index_sql)
            except Exception as e:
                print(f"Error creando índice: {e}")
    
    def execute_optimized_query(self, query, params=None, use_cache=True):
        """Ejecutar consulta optimizada con caché"""
        start_time = time.time()
        
        # Generar clave de caché
        cache_key = f"{query}_{str(params) if params else ''}"
        
        # Verificar caché si está habilitado
        if use_cache and cache_key in self.query_cache:
            cache_data = self.query_cache[cache_key]
            if time.time() - cache_data['timestamp'] < self.cache_ttl:
                self.optimization_stats['cache_hits'] += 1
                return cache_data['result']
            else:
                # Eliminar entrada expirada
                del self.query_cache[cache_key]
        
        # Ejecutar consulta
        try:
            if params:
                result = self.db.fetch_all(query, params)
            else:
                result = self.db.fetch_all(query)
            
            # Calcular tiempo de ejecución
            execution_time = time.time() - start_time
            
            # Actualizar estadísticas
            self.optimization_stats['queries_executed'] += 1
            self.optimization_stats['cache_misses'] += 1
            
            # Actualizar tiempo promedio
            total_queries = self.optimization_stats['queries_executed']
            current_avg = self.optimization_stats['avg_query_time']
            self.optimization_stats['avg_query_time'] = (
                (current_avg * (total_queries - 1) + execution_time) / total_queries
            )
            
            # Registrar consultas lentas (>1 segundo)
            if execution_time > 1.0:
                self.optimization_stats['slow_queries'].append({
                    'query': query,
                    'params': params,
                    'execution_time': execution_time,
                    'timestamp': datetime.now().isoformat()
                })
            
            # Guardar en caché si está habilitado
            if use_cache:
                self.query_cache[cache_key] = {
                    'result': result,
                    'timestamp': time.time()
                }
            
            return result
            
        except Exception as e:
            print(f"Error ejecutando consulta optimizada: {e}")
            return []
    
    def clear_cache(self):
        """Limpiar caché de consultas"""
        self.query_cache.clear()
        print("Caché de consultas limpiado")
    
    def get_optimization_stats(self):
        """Obtener estadísticas de optimización"""
        cache_hit_rate = 0
        if self.optimization_stats['queries_executed'] > 0:
            cache_hit_rate = (
                self.optimization_stats['cache_hits'] / 
                (self.optimization_stats['cache_hits'] + self.optimization_stats['cache_misses'])
            ) * 100
        
        return {
            'queries_executed': self.optimization_stats['queries_executed'],
            'cache_hit_rate': round(cache_hit_rate, 2),
            'avg_query_time': round(self.optimization_stats['avg_query_time'], 4),
            'slow_queries_count': len(self.optimization_stats['slow_queries']),
            'cache_size': len(self.query_cache)
        }
    
    def analyze_query_performance(self):
        """Analizar rendimiento de consultas"""
        try:
            # Obtener estadísticas de la base de datos
            stats = self.db.fetch_all("""
                SELECT name, sql 
                FROM sqlite_master 
                WHERE type='index' AND sql IS NOT NULL
            """)
            
            # Obtener información de tablas
            table_info = self.db.fetch_all("""
                SELECT name, 
                       (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
                FROM sqlite_master m 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """)
            
            return {
                'indexes': len(stats),
                'tables': len(table_info),
                'table_info': table_info,
                'optimization_stats': self.get_optimization_stats()
            }
            
        except Exception as e:
            print(f"Error analizando rendimiento: {e}")
            return {}
    
    def vacuum_database(self):
        """Optimizar y limpiar la base de datos"""
        try:
            start_time = time.time()
            
            # Ejecutar VACUUM para optimizar
            self.db.execute("VACUUM")
            
            # Actualizar estadísticas
            self.db.execute("ANALYZE")
            
            execution_time = time.time() - start_time
            
            return {
                'success': True,
                'execution_time': round(execution_time, 2),
                'message': f"Base de datos optimizada en {execution_time:.2f} segundos"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': f"Error optimizando base de datos: {e}"
            }
    
    def create_performance_monitor(self, parent_frame):
        """Crear monitor de rendimiento"""
        monitor_frame = create_styled_frame(parent_frame, bg=COLORS['white'])
        monitor_frame.pack(fill='x', pady=10)
        
        # Título
        title_label = create_styled_label(
            monitor_frame,
            text="📊 MONITOR DE RENDIMIENTO",
            font=FONTS['heading'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', padx=15, pady=(15, 10))
        
        # Estadísticas
        stats = self.get_optimization_stats()
        
        stats_text = f"""
        Consultas Ejecutadas: {stats['queries_executed']}
        Tasa de Acierto en Caché: {stats['cache_hit_rate']}%
        Tiempo Promedio de Consulta: {stats['avg_query_time']}s
        Consultas Lentas: {stats['slow_queries_count']}
        Tamaño del Caché: {stats['cache_size']} entradas
        """
        
        stats_label = create_styled_label(
            monitor_frame,
            text=stats_text,
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['white'],
            justify='left'
        )
        stats_label.pack(anchor='w', padx=15, pady=(0, 15))
        
        return monitor_frame

class ConnectionPool:
    """Pool de conexiones para optimizar acceso a base de datos"""
    
    def __init__(self, db_path, max_connections=10):
        self.db_path = db_path
        self.max_connections = max_connections
        self.connections = []
        self.lock = threading.Lock()
    
    def get_connection(self):
        """Obtener conexión del pool"""
        with self.lock:
            if self.connections:
                return self.connections.pop()
            else:
                return sqlite3.connect(self.db_path)
    
    def return_connection(self, connection):
        """Devolver conexión al pool"""
        with self.lock:
            if len(self.connections) < self.max_connections:
                self.connections.append(connection)
            else:
                connection.close()
    
    def close_all(self):
        """Cerrar todas las conexiones"""
        with self.lock:
            for connection in self.connections:
                connection.close()
            self.connections.clear()
