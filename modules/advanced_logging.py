"""
Sistema de Logging y Manejo de Errores Avanzado 2025
"""

import logging
import traceback
import threading
import time
from datetime import datetime
from enum import Enum
from modules.styles import create_styled_label, create_styled_frame, create_styled_button, COLORS, FONTS

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class AdvancedLogger:
    def __init__(self, db_connection):
        self.db = db_connection
        self.log_queue = []
        self.max_queue_size = 1000
        self.flush_interval = 30  # segundos
        self.running = True
        self.flush_thread = threading.Thread(target=self._flush_logs, daemon=True)
        self.flush_thread.start()
        
        # Configurar logging de Python
        self.setup_python_logging()
        
        # Estadísticas
        self.stats = {
            'total_logs': 0,
            'debug_logs': 0,
            'info_logs': 0,
            'warning_logs': 0,
            'error_logs': 0,
            'critical_logs': 0,
            'errors_by_module': {},
            'last_error': None
        }
    
    def setup_python_logging(self):
        """Configurar logging de Python"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/system.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.python_logger = logging.getLogger('TallerMecanico')
    
    def log(self, level, module, message, details=None, user_id=None):
        """Registrar log en el sistema"""
        try:
            log_entry = {
                'level': level.value,
                'module': module,
                'message': message,
                'details': details or '',
                'user_id': user_id,
                'timestamp': datetime.now().isoformat(),
                'thread_id': threading.get_ident()
            }
            
            # Agregar a cola
            self.log_queue.append(log_entry)
            
            # Actualizar estadísticas
            self.stats['total_logs'] += 1
            self.stats[f'{level.value.lower()}_logs'] += 1
            
            if level in [LogLevel.ERROR, LogLevel.CRITICAL]:
                self.stats['errors_by_module'][module] = self.stats['errors_by_module'].get(module, 0) + 1
                self.stats['last_error'] = log_entry
            
            # Log también con Python logging
            if level == LogLevel.DEBUG:
                self.python_logger.debug(f"[{module}] {message}")
            elif level == LogLevel.INFO:
                self.python_logger.info(f"[{module}] {message}")
            elif level == LogLevel.WARNING:
                self.python_logger.warning(f"[{module}] {message}")
            elif level == LogLevel.ERROR:
                self.python_logger.error(f"[{module}] {message}")
            elif level == LogLevel.CRITICAL:
                self.python_logger.critical(f"[{module}] {message}")
            
            # Si la cola está llena, forzar flush
            if len(self.log_queue) >= self.max_queue_size:
                self._flush_logs_to_db()
                
        except Exception as e:
            print(f"Error registrando log: {e}")
    
    def debug(self, module, message, details=None, user_id=None):
        """Log de debug"""
        self.log(LogLevel.DEBUG, module, message, details, user_id)
    
    def info(self, module, message, details=None, user_id=None):
        """Log de información"""
        self.log(LogLevel.INFO, module, message, details, user_id)
    
    def warning(self, module, message, details=None, user_id=None):
        """Log de advertencia"""
        self.log(LogLevel.WARNING, module, message, details, user_id)
    
    def error(self, module, message, details=None, user_id=None, exception=None):
        """Log de error"""
        if exception:
            details = f"{details or ''}\nException: {str(exception)}\nTraceback: {traceback.format_exc()}"
        self.log(LogLevel.ERROR, module, message, details, user_id)
    
    def critical(self, module, message, details=None, user_id=None, exception=None):
        """Log crítico"""
        if exception:
            details = f"{details or ''}\nException: {str(exception)}\nTraceback: {traceback.format_exc()}"
        self.log(LogLevel.CRITICAL, module, message, details, user_id)
    
    def _flush_logs(self):
        """Flush periódico de logs a la base de datos"""
        while self.running:
            try:
                time.sleep(self.flush_interval)
                self._flush_logs_to_db()
            except Exception as e:
                print(f"Error en flush de logs: {e}")
    
    def _flush_logs_to_db(self):
        """Flush logs de la cola a la base de datos"""
        if not self.log_queue:
            return
        
        try:
            logs_to_insert = self.log_queue.copy()
            self.log_queue.clear()
            
            for log_entry in logs_to_insert:
                self.db.execute("""
                    INSERT INTO system_logs (level, module, message, details, user_id, created_at, thread_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    log_entry['level'],
                    log_entry['module'],
                    log_entry['message'],
                    log_entry['details'],
                    log_entry['user_id'],
                    log_entry['timestamp'],
                    log_entry['thread_id']
                ))
            
            print(f"Flushed {len(logs_to_insert)} logs to database")
            
        except Exception as e:
            print(f"Error flushing logs to database: {e}")
            # Re-agregar logs a la cola si falló
            self.log_queue.extend(logs_to_insert)
    
    def get_recent_logs(self, limit=100, level=None, module=None):
        """Obtener logs recientes"""
        try:
            query = "SELECT * FROM system_logs WHERE 1=1"
            params = []
            
            if level:
                query += " AND level = ?"
                params.append(level)
            
            if module:
                query += " AND module = ?"
                params.append(module)
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            return self.db.fetch_all(query, params)
            
        except Exception as e:
            print(f"Error obteniendo logs: {e}")
            return []
    
    def get_error_stats(self):
        """Obtener estadísticas de errores"""
        try:
            # Errores por módulo en las últimas 24 horas
            recent_errors = self.db.fetch_all("""
                SELECT module, COUNT(*) as error_count
                FROM system_logs
                WHERE level IN ('ERROR', 'CRITICAL')
                AND created_at >= datetime('now', '-1 day')
                GROUP BY module
                ORDER BY error_count DESC
            """)
            
            # Errores por nivel
            errors_by_level = self.db.fetch_all("""
                SELECT level, COUNT(*) as count
                FROM system_logs
                WHERE created_at >= datetime('now', '-1 day')
                GROUP BY level
            """)
            
            return {
                'recent_errors': recent_errors,
                'errors_by_level': errors_by_level,
                'total_errors_today': sum(row[1] for row in recent_errors),
                'stats': self.stats
            }
            
        except Exception as e:
            print(f"Error obteniendo estadísticas: {e}")
            return {}
    
    def create_log_monitor(self, parent_frame):
        """Crear monitor de logs"""
        monitor_frame = create_styled_frame(parent_frame, bg=COLORS['white'])
        monitor_frame.pack(fill='x', pady=10)
        
        # Título
        title_label = create_styled_label(
            monitor_frame,
            text="📋 MONITOR DE LOGS Y ERRORES",
            font=FONTS['heading'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', padx=15, pady=(15, 10))
        
        # Estadísticas
        stats = self.get_error_stats()
        
        if stats:
            stats_text = f"""
            Total de Logs: {self.stats['total_logs']}
            Errores Hoy: {stats.get('total_errors_today', 0)}
            Debug: {self.stats['debug_logs']} | Info: {self.stats['info_logs']}
            Warning: {self.stats['warning_logs']} | Error: {self.stats['error_logs']} | Critical: {self.stats['critical_logs']}
            """
        else:
            stats_text = "Error obteniendo estadísticas de logs"
        
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
    
    def stop(self):
        """Detener el logger"""
        self.running = False
        self._flush_logs_to_db()  # Flush final
        if self.flush_thread:
            self.flush_thread.join(timeout=5)

class ErrorHandler:
    """Manejador de errores centralizado"""
    
    def __init__(self, logger):
        self.logger = logger
        self.error_handlers = {}
        self.setup_default_handlers()
    
    def setup_default_handlers(self):
        """Configurar manejadores de error por defecto"""
        self.error_handlers = {
            'database': self._handle_database_error,
            'ui': self._handle_ui_error,
            'file': self._handle_file_error,
            'network': self._handle_network_error,
            'general': self._handle_general_error
        }
    
    def handle_error(self, error_type, error, context=None, user_id=None):
        """Manejar error de forma centralizada"""
        try:
            handler = self.error_handlers.get(error_type, self.error_handlers['general'])
            handler(error, context, user_id)
        except Exception as e:
            print(f"Error en manejador de errores: {e}")
    
    def _handle_database_error(self, error, context, user_id):
        """Manejar errores de base de datos"""
        self.logger.error(
            'database',
            f"Database error: {str(error)}",
            details=f"Context: {context}",
            user_id=user_id,
            exception=error
        )
    
    def _handle_ui_error(self, error, context, user_id):
        """Manejar errores de interfaz"""
        self.logger.error(
            'ui',
            f"UI error: {str(error)}",
            details=f"Context: {context}",
            user_id=user_id,
            exception=error
        )
    
    def _handle_file_error(self, error, context, user_id):
        """Manejar errores de archivos"""
        self.logger.error(
            'file',
            f"File error: {str(error)}",
            details=f"Context: {context}",
            user_id=user_id,
            exception=error
        )
    
    def _handle_network_error(self, error, context, user_id):
        """Manejar errores de red"""
        self.logger.error(
            'network',
            f"Network error: {str(error)}",
            details=f"Context: {context}",
            user_id=user_id,
            exception=error
        )
    
    def _handle_general_error(self, error, context, user_id):
        """Manejar errores generales"""
        self.logger.error(
            'general',
            f"General error: {str(error)}",
            details=f"Context: {context}",
            user_id=user_id,
            exception=error
        )

def create_error_decorator(logger, error_type='general'):
    """Crear decorador para manejo automático de errores"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(
                    error_type,
                    f"Error in {func.__name__}: {str(e)}",
                    details=f"Args: {args}, Kwargs: {kwargs}",
                    exception=e
                )
                raise
        return wrapper
    return decorator
