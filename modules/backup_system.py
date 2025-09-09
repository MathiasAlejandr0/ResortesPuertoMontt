"""
Sistema de Respaldos Automáticos 2025
"""

import os
import shutil
import sqlite3
import threading
import time
import zipfile
from datetime import datetime, timedelta
from modules.styles import create_styled_label, create_styled_frame, create_styled_button, COLORS, FONTS

class BackupSystem:
    def __init__(self, db_connection, config_manager=None):
        self.db = db_connection
        self.config_manager = config_manager
        self.backup_directory = self._get_backup_directory()
        self.running = True
        self.backup_thread = None
        self.stats = {
            'total_backups': 0,
            'successful_backups': 0,
            'failed_backups': 0,
            'last_backup': None,
            'backup_size': 0
        }
        
        # Crear directorio de respaldos si no existe
        os.makedirs(self.backup_directory, exist_ok=True)
        
        # Iniciar respaldos automáticos si están habilitados
        self._start_automatic_backups()
    
    def _get_backup_directory(self):
        """Obtener directorio de respaldos"""
        if self.config_manager:
            backup_location = self.config_manager.get_config('backup_location', './backups/')
            return backup_location
        return './backups/'
    
    def _start_automatic_backups(self):
        """Iniciar respaldos automáticos"""
        if self.config_manager:
            auto_backup = self.config_manager.get_config('backup_enabled', False)
            if auto_backup:
                self.start_automatic_backups()
    
    def create_backup(self, backup_type='full', description=''):
        """Crear respaldo manual"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{backup_type}_{timestamp}"
            backup_path = os.path.join(self.backup_directory, backup_name)
            
            # Crear directorio del respaldo
            os.makedirs(backup_path, exist_ok=True)
            
            if backup_type == 'full':
                success = self._create_full_backup(backup_path, description)
            elif backup_type == 'database':
                success = self._create_database_backup(backup_path, description)
            elif backup_type == 'files':
                success = self._create_files_backup(backup_path, description)
            else:
                raise ValueError(f"Tipo de respaldo no válido: {backup_type}")
            
            if success:
                # Comprimir respaldo
                zip_path = f"{backup_path}.zip"
                self._compress_backup(backup_path, zip_path)
                
                # Limpiar directorio temporal
                shutil.rmtree(backup_path)
                
                # Actualizar estadísticas
                self.stats['total_backups'] += 1
                self.stats['successful_backups'] += 1
                self.stats['last_backup'] = datetime.now().isoformat()
                self.stats['backup_size'] = os.path.getsize(zip_path)
                
                # Registrar en logs
                self._log_backup('success', backup_type, zip_path, description)
                
                return {
                    'success': True,
                    'backup_path': zip_path,
                    'backup_size': self.stats['backup_size'],
                    'message': f"Respaldo {backup_type} creado exitosamente"
                }
            else:
                raise Exception("Error creando respaldo")
                
        except Exception as e:
            self.stats['total_backups'] += 1
            self.stats['failed_backups'] += 1
            self._log_backup('error', backup_type, '', description, str(e))
            
            return {
                'success': False,
                'error': str(e),
                'message': f"Error creando respaldo: {e}"
            }
    
    def _create_full_backup(self, backup_path, description):
        """Crear respaldo completo"""
        try:
            # Respaldar base de datos
            db_backup_path = os.path.join(backup_path, 'database')
            os.makedirs(db_backup_path, exist_ok=True)
            
            # Copiar archivo de base de datos
            db_file = 'taller_mecanico.db'
            if os.path.exists(db_file):
                shutil.copy2(db_file, os.path.join(db_backup_path, db_file))
            
            # Respaldar archivos de configuración
            config_files = ['config.json', 'settings.json']
            for config_file in config_files:
                if os.path.exists(config_file):
                    shutil.copy2(config_file, backup_path)
            
            # Respaldar directorio de logs
            logs_dir = 'logs'
            if os.path.exists(logs_dir):
                shutil.copytree(logs_dir, os.path.join(backup_path, 'logs'))
            
            # Crear archivo de metadatos
            metadata = {
                'backup_type': 'full',
                'created_at': datetime.now().isoformat(),
                'description': description,
                'database_file': db_file,
                'version': '1.0'
            }
            
            self._save_metadata(backup_path, metadata)
            
            return True
            
        except Exception as e:
            print(f"Error creando respaldo completo: {e}")
            return False
    
    def _create_database_backup(self, backup_path, description):
        """Crear respaldo solo de base de datos"""
        try:
            # Crear dump de la base de datos
            db_dump_path = os.path.join(backup_path, 'database_dump.sql')
            
            with open(db_dump_path, 'w', encoding='utf-8') as f:
                for line in self.db.connection.iterdump():
                    f.write(f"{line}\n")
            
            # Crear archivo de metadatos
            metadata = {
                'backup_type': 'database',
                'created_at': datetime.now().isoformat(),
                'description': description,
                'dump_file': 'database_dump.sql',
                'version': '1.0'
            }
            
            self._save_metadata(backup_path, metadata)
            
            return True
            
        except Exception as e:
            print(f"Error creando respaldo de base de datos: {e}")
            return False
    
    def _create_files_backup(self, backup_path, description):
        """Crear respaldo solo de archivos"""
        try:
            # Respaldar archivos de configuración
            config_files = ['config.json', 'settings.json']
            for config_file in config_files:
                if os.path.exists(config_file):
                    shutil.copy2(config_file, backup_path)
            
            # Respaldar directorio de logs
            logs_dir = 'logs'
            if os.path.exists(logs_dir):
                shutil.copytree(logs_dir, os.path.join(backup_path, 'logs'))
            
            # Crear archivo de metadatos
            metadata = {
                'backup_type': 'files',
                'created_at': datetime.now().isoformat(),
                'description': description,
                'version': '1.0'
            }
            
            self._save_metadata(backup_path, metadata)
            
            return True
            
        except Exception as e:
            print(f"Error creando respaldo de archivos: {e}")
            return False
    
    def _compress_backup(self, source_path, zip_path):
        """Comprimir respaldo"""
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(source_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, source_path)
                    zipf.write(file_path, arcname)
    
    def _save_metadata(self, backup_path, metadata):
        """Guardar metadatos del respaldo"""
        import json
        metadata_path = os.path.join(backup_path, 'metadata.json')
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    def _log_backup(self, status, backup_type, backup_path, description, error=None):
        """Registrar respaldo en logs"""
        try:
            log_entry = {
                'status': status,
                'backup_type': backup_type,
                'backup_path': backup_path,
                'description': description,
                'error': error,
                'timestamp': datetime.now().isoformat()
            }
            
            # Guardar en base de datos si existe tabla de logs
            self.db.execute("""
                INSERT INTO system_logs (level, module, message, details, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                'INFO' if status == 'success' else 'ERROR',
                'backup_system',
                f"Backup {status}: {backup_type}",
                f"Path: {backup_path}, Description: {description}, Error: {error or 'None'}",
                datetime.now().isoformat()
            ))
            
        except Exception as e:
            print(f"Error registrando respaldo: {e}")
    
    def restore_backup(self, backup_path):
        """Restaurar respaldo"""
        try:
            if not os.path.exists(backup_path):
                raise FileNotFoundError(f"Archivo de respaldo no encontrado: {backup_path}")
            
            # Crear directorio temporal para extraer
            temp_dir = f"temp_restore_{int(time.time())}"
            os.makedirs(temp_dir, exist_ok=True)
            
            try:
                # Extraer respaldo
                with zipfile.ZipFile(backup_path, 'r') as zipf:
                    zipf.extractall(temp_dir)
                
                # Leer metadatos
                metadata_path = os.path.join(temp_dir, 'metadata.json')
                if os.path.exists(metadata_path):
                    import json
                    with open(metadata_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                else:
                    raise Exception("Archivo de metadatos no encontrado")
                
                # Restaurar según tipo
                if metadata['backup_type'] == 'full':
                    self._restore_full_backup(temp_dir, metadata)
                elif metadata['backup_type'] == 'database':
                    self._restore_database_backup(temp_dir, metadata)
                elif metadata['backup_type'] == 'files':
                    self._restore_files_backup(temp_dir, metadata)
                else:
                    raise Exception(f"Tipo de respaldo no soportado: {metadata['backup_type']}")
                
                return {
                    'success': True,
                    'message': f"Respaldo restaurado exitosamente desde {backup_path}"
                }
                
            finally:
                # Limpiar directorio temporal
                shutil.rmtree(temp_dir, ignore_errors=True)
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': f"Error restaurando respaldo: {e}"
            }
    
    def _restore_full_backup(self, temp_dir, metadata):
        """Restaurar respaldo completo"""
        # Restaurar base de datos
        db_backup_path = os.path.join(temp_dir, 'database')
        if os.path.exists(db_backup_path):
            db_file = metadata.get('database_file', 'taller_mecanico.db')
            source_db = os.path.join(db_backup_path, db_file)
            if os.path.exists(source_db):
                shutil.copy2(source_db, db_file)
        
        # Restaurar archivos de configuración
        for config_file in ['config.json', 'settings.json']:
            source_file = os.path.join(temp_dir, config_file)
            if os.path.exists(source_file):
                shutil.copy2(source_file, config_file)
        
        # Restaurar logs
        source_logs = os.path.join(temp_dir, 'logs')
        if os.path.exists(source_logs):
            if os.path.exists('logs'):
                shutil.rmtree('logs')
            shutil.copytree(source_logs, 'logs')
    
    def _restore_database_backup(self, temp_dir, metadata):
        """Restaurar respaldo de base de datos"""
        dump_file = os.path.join(temp_dir, metadata['dump_file'])
        if os.path.exists(dump_file):
            # Crear nueva base de datos desde dump
            with open(dump_file, 'r', encoding='utf-8') as f:
                sql_script = f.read()
            
            # Ejecutar script SQL
            self.db.connection.executescript(sql_script)
    
    def _restore_files_backup(self, temp_dir, metadata):
        """Restaurar respaldo de archivos"""
        # Restaurar archivos de configuración
        for config_file in ['config.json', 'settings.json']:
            source_file = os.path.join(temp_dir, config_file)
            if os.path.exists(source_file):
                shutil.copy2(source_file, config_file)
        
        # Restaurar logs
        source_logs = os.path.join(temp_dir, 'logs')
        if os.path.exists(source_logs):
            if os.path.exists('logs'):
                shutil.rmtree('logs')
            shutil.copytree(source_logs, 'logs')
    
    def list_backups(self):
        """Listar respaldos disponibles"""
        try:
            backups = []
            for filename in os.listdir(self.backup_directory):
                if filename.endswith('.zip'):
                    file_path = os.path.join(self.backup_directory, filename)
                    file_stats = os.stat(file_path)
                    
                    backup_info = {
                        'filename': filename,
                        'file_path': file_path,
                        'size': file_stats.st_size,
                        'created_at': datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                        'modified_at': datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                    }
                    
                    # Intentar leer metadatos
                    try:
                        temp_dir = f"temp_metadata_{int(time.time())}"
                        os.makedirs(temp_dir, exist_ok=True)
                        
                        with zipfile.ZipFile(file_path, 'r') as zipf:
                            if 'metadata.json' in zipf.namelist():
                                zipf.extract('metadata.json', temp_dir)
                                metadata_path = os.path.join(temp_dir, 'metadata.json')
                                
                                import json
                                with open(metadata_path, 'r', encoding='utf-8') as f:
                                    metadata = json.load(f)
                                
                                backup_info.update(metadata)
                        
                        shutil.rmtree(temp_dir, ignore_errors=True)
                        
                    except Exception as e:
                        print(f"Error leyendo metadatos de {filename}: {e}")
                    
                    backups.append(backup_info)
            
            # Ordenar por fecha de creación (más recientes primero)
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            
            return backups
            
        except Exception as e:
            print(f"Error listando respaldos: {e}")
            return []
    
    def cleanup_old_backups(self, retention_days=30):
        """Limpiar respaldos antiguos"""
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            deleted_count = 0
            
            for backup_info in self.list_backups():
                backup_date = datetime.fromisoformat(backup_info['created_at'])
                if backup_date < cutoff_date:
                    os.remove(backup_info['file_path'])
                    deleted_count += 1
            
            return {
                'success': True,
                'deleted_count': deleted_count,
                'message': f"Se eliminaron {deleted_count} respaldos antiguos"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': f"Error limpiando respaldos: {e}"
            }
    
    def start_automatic_backups(self, interval_hours=24):
        """Iniciar respaldos automáticos"""
        if self.backup_thread and self.backup_thread.is_alive():
            return  # Ya está ejecutándose
        
        def backup_loop():
            while self.running:
                try:
                    # Crear respaldo automático
                    result = self.create_backup('full', 'Respaldo automático')
                    
                    if result['success']:
                        print(f"Respaldo automático creado: {result['backup_path']}")
                    else:
                        print(f"Error en respaldo automático: {result['error']}")
                    
                    # Limpiar respaldos antiguos
                    self.cleanup_old_backups()
                    
                    # Esperar hasta el próximo respaldo
                    time.sleep(interval_hours * 3600)
                    
                except Exception as e:
                    print(f"Error en respaldo automático: {e}")
                    time.sleep(3600)  # Esperar 1 hora antes de reintentar
        
        self.backup_thread = threading.Thread(target=backup_loop, daemon=True)
        self.backup_thread.start()
    
    def stop_automatic_backups(self):
        """Detener respaldos automáticos"""
        self.running = False
        if self.backup_thread:
            self.backup_thread.join(timeout=5)
    
    def get_backup_stats(self):
        """Obtener estadísticas de respaldos"""
        backups = self.list_backups()
        total_size = sum(backup['size'] for backup in backups)
        
        return {
            'total_backups': len(backups),
            'successful_backups': self.stats['successful_backups'],
            'failed_backups': self.stats['failed_backups'],
            'last_backup': self.stats['last_backup'],
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'backup_directory': self.backup_directory
        }
    
    def create_backup_monitor(self, parent_frame):
        """Crear monitor de respaldos"""
        monitor_frame = create_styled_frame(parent_frame, bg=COLORS['white'])
        monitor_frame.pack(fill='x', pady=10)
        
        # Título
        title_label = create_styled_label(
            monitor_frame,
            text="💾 MONITOR DE RESPALDOS",
            font=FONTS['heading'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', padx=15, pady=(15, 10))
        
        # Estadísticas
        stats = self.get_backup_stats()
        
        stats_text = f"""
        Total de Respaldos: {stats['total_backups']}
        Exitosos: {stats['successful_backups']} | Fallidos: {stats['failed_backups']}
        Último Respaldo: {stats['last_backup'] or 'Nunca'}
        Tamaño Total: {stats['total_size_mb']} MB
        Directorio: {stats['backup_directory']}
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
        
        # Botones de control
        buttons_frame = create_styled_frame(monitor_frame, bg=COLORS['white'])
        buttons_frame.pack(fill='x', padx=15, pady=(0, 15))
        
        create_backup_btn = create_styled_button(
            buttons_frame,
            text="💾 Crear Respaldo",
            command=lambda: self.create_backup('full', 'Respaldo manual'),
            button_type='success',
            width=15
        )
        create_backup_btn.pack(side='left', padx=(0, 10))
        
        cleanup_btn = create_styled_button(
            buttons_frame,
            text="🧹 Limpiar Antiguos",
            command=lambda: self.cleanup_old_backups(),
            button_type='warning',
            width=15
        )
        cleanup_btn.pack(side='left')
        
        return monitor_frame
