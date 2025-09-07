"""
Sistema de logging mejorado para el taller mecánico
Registra eventos, errores y actividades del sistema
"""

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

class TallerLogger:
    def __init__(self, log_dir="logs"):
        self.log_dir = log_dir
        self.setup_logging()
    
    def setup_logging(self):
        """Configurar sistema de logging"""
        # Crear directorio de logs si no existe
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
        
        # Configurar formato
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Logger principal
        self.logger = logging.getLogger('TallerMecanico')
        self.logger.setLevel(logging.DEBUG)
        
        # Handler para archivo general (rotativo)
        general_handler = RotatingFileHandler(
            os.path.join(self.log_dir, 'taller_general.log'),
            maxBytes=5*1024*1024,  # 5MB
            backupCount=5
        )
        general_handler.setLevel(logging.INFO)
        general_handler.setFormatter(formatter)
        
        # Handler para errores
        error_handler = RotatingFileHandler(
            os.path.join(self.log_dir, 'taller_errors.log'),
            maxBytes=2*1024*1024,  # 2MB
            backupCount=3
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        
        # Handler para actividades de usuarios
        activity_handler = RotatingFileHandler(
            os.path.join(self.log_dir, 'taller_activity.log'),
            maxBytes=3*1024*1024,  # 3MB
            backupCount=5
        )
        activity_handler.setLevel(logging.INFO)
        activity_handler.setFormatter(formatter)
        
        # Agregar handlers
        self.logger.addHandler(general_handler)
        self.logger.addHandler(error_handler)
        
        # Logger específico para actividades
        self.activity_logger = logging.getLogger('TallerMecanico.Activity')
        self.activity_logger.addHandler(activity_handler)
        self.activity_logger.setLevel(logging.INFO)
    
    def log_info(self, message, module=None):
        """Registrar información general"""
        if module:
            message = f"[{module}] {message}"
        self.logger.info(message)
    
    def log_error(self, message, error=None, module=None):
        """Registrar error"""
        if module:
            message = f"[{module}] {message}"
        if error:
            message = f"{message} - Error: {str(error)}"
        self.logger.error(message)
    
    def log_warning(self, message, module=None):
        """Registrar advertencia"""
        if module:
            message = f"[{module}] {message}"
        self.logger.warning(message)
    
    def log_debug(self, message, module=None):
        """Registrar información de debug"""
        if module:
            message = f"[{module}] {message}"
        self.logger.debug(message)
    
    def log_user_activity(self, user, action, details=None):
        """Registrar actividad de usuario"""
        message = f"Usuario: {user} - Acción: {action}"
        if details:
            message += f" - Detalles: {details}"
        self.activity_logger.info(message)
    
    def log_database_operation(self, operation, table, user=None):
        """Registrar operación de base de datos"""
        message = f"DB Operation: {operation} en tabla {table}"
        if user:
            message += f" por usuario {user}"
        self.logger.info(message)
    
    def log_security_event(self, event, user=None, ip=None):
        """Registrar evento de seguridad"""
        message = f"SECURITY: {event}"
        if user:
            message += f" - Usuario: {user}"
        if ip:
            message += f" - IP: {ip}"
        self.logger.warning(message)

# Instancia global del logger
taller_logger = TallerLogger()

# Funciones de conveniencia
def log_info(message, module=None):
    taller_logger.log_info(message, module)

def log_error(message, error=None, module=None):
    taller_logger.log_error(message, error, module)

def log_warning(message, module=None):
    taller_logger.log_warning(message, module)

def log_debug(message, module=None):
    taller_logger.log_debug(message, module)

def log_user_activity(user, action, details=None):
    taller_logger.log_user_activity(user, action, details)

def log_database_operation(operation, table, user=None):
    taller_logger.log_database_operation(operation, table, user)

def log_security_event(event, user=None, ip=None):
    taller_logger.log_security_event(event, user, ip)
