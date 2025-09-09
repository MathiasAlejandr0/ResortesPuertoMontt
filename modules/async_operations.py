"""
Sistema de Operaciones Asíncronas Avanzadas 2025
"""

import threading
import queue
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from modules.styles import create_styled_label, create_styled_frame, create_styled_button, COLORS, FONTS

class AsyncOperationManager:
    def __init__(self, max_workers=4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.operation_queue = queue.Queue()
        self.active_operations = {}
        self.operation_results = {}
        self.operation_callbacks = {}
        self.stats = {
            'total_operations': 0,
            'completed_operations': 0,
            'failed_operations': 0,
            'avg_execution_time': 0
        }
        self.running = True
        self.worker_thread = threading.Thread(target=self._process_operations, daemon=True)
        self.worker_thread.start()
    
    def _process_operations(self):
        """Procesar operaciones de la cola"""
        while self.running:
            try:
                # Obtener operación de la cola (con timeout)
                operation = self.operation_queue.get(timeout=1)
                
                if operation is None:  # Señal de parada
                    break
                
                self._execute_operation(operation)
                self.operation_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error procesando operación: {e}")
    
    def _execute_operation(self, operation):
        """Ejecutar una operación específica"""
        operation_id = operation['id']
        start_time = time.time()
        
        try:
            # Marcar como activa
            self.active_operations[operation_id] = {
                'status': 'running',
                'start_time': start_time,
                'operation': operation
            }
            
            # Ejecutar la función
            result = operation['function'](*operation.get('args', []), **operation.get('kwargs', {}))
            
            # Calcular tiempo de ejecución
            execution_time = time.time() - start_time
            
            # Guardar resultado
            self.operation_results[operation_id] = {
                'status': 'completed',
                'result': result,
                'execution_time': execution_time,
                'completed_at': datetime.now().isoformat()
            }
            
            # Actualizar estadísticas
            self.stats['completed_operations'] += 1
            self._update_avg_execution_time(execution_time)
            
            # Ejecutar callback si existe
            if operation_id in self.operation_callbacks:
                try:
                    self.operation_callbacks[operation_id](result, None)
                except Exception as e:
                    print(f"Error en callback: {e}")
            
        except Exception as e:
            # Manejar error
            execution_time = time.time() - start_time
            
            self.operation_results[operation_id] = {
                'status': 'failed',
                'error': str(e),
                'execution_time': execution_time,
                'failed_at': datetime.now().isoformat()
            }
            
            self.stats['failed_operations'] += 1
            
            # Ejecutar callback de error si existe
            if operation_id in self.operation_callbacks:
                try:
                    self.operation_callbacks[operation_id](None, e)
                except Exception as callback_error:
                    print(f"Error en callback de error: {callback_error}")
        
        finally:
            # Remover de operaciones activas
            if operation_id in self.active_operations:
                del self.active_operations[operation_id]
    
    def _update_avg_execution_time(self, execution_time):
        """Actualizar tiempo promedio de ejecución"""
        total_ops = self.stats['completed_operations']
        current_avg = self.stats['avg_execution_time']
        
        if total_ops == 1:
            self.stats['avg_execution_time'] = execution_time
        else:
            self.stats['avg_execution_time'] = (
                (current_avg * (total_ops - 1) + execution_time) / total_ops
            )
    
    def submit_operation(self, function, *args, callback=None, **kwargs):
        """Enviar operación para ejecución asíncrona"""
        operation_id = f"op_{int(time.time() * 1000)}_{len(self.active_operations)}"
        
        operation = {
            'id': operation_id,
            'function': function,
            'args': args,
            'kwargs': kwargs,
            'submitted_at': datetime.now().isoformat()
        }
        
        # Agregar callback si se proporciona
        if callback:
            self.operation_callbacks[operation_id] = callback
        
        # Enviar a la cola
        self.operation_queue.put(operation)
        self.stats['total_operations'] += 1
        
        return operation_id
    
    def get_operation_result(self, operation_id, timeout=None):
        """Obtener resultado de una operación"""
        start_time = time.time()
        
        while True:
            if operation_id in self.operation_results:
                return self.operation_results[operation_id]
            
            if timeout and (time.time() - start_time) > timeout:
                return {'status': 'timeout', 'error': 'Operación expiró'}
            
            time.sleep(0.1)
    
    def wait_for_operation(self, operation_id, timeout=None):
        """Esperar a que una operación termine"""
        return self.get_operation_result(operation_id, timeout)
    
    def get_active_operations(self):
        """Obtener operaciones activas"""
        return self.active_operations.copy()
    
    def get_operation_stats(self):
        """Obtener estadísticas de operaciones"""
        return {
            'total_operations': self.stats['total_operations'],
            'completed_operations': self.stats['completed_operations'],
            'failed_operations': self.stats['failed_operations'],
            'active_operations': len(self.active_operations),
            'avg_execution_time': round(self.stats['avg_execution_time'], 4),
            'success_rate': (
                self.stats['completed_operations'] / self.stats['total_operations'] * 100
                if self.stats['total_operations'] > 0 else 0
            )
        }
    
    def create_operation_monitor(self, parent_frame):
        """Crear monitor de operaciones"""
        monitor_frame = create_styled_frame(parent_frame, bg=COLORS['white'])
        monitor_frame.pack(fill='x', pady=10)
        
        # Título
        title_label = create_styled_label(
            monitor_frame,
            text="⚡ MONITOR DE OPERACIONES ASÍNCRONAS",
            font=FONTS['heading'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', padx=15, pady=(15, 10))
        
        # Estadísticas
        stats = self.get_operation_stats()
        
        stats_text = f"""
        Total de Operaciones: {stats['total_operations']}
        Completadas: {stats['completed_operations']}
        Fallidas: {stats['failed_operations']}
        Activas: {stats['active_operations']}
        Tiempo Promedio: {stats['avg_execution_time']}s
        Tasa de Éxito: {stats['success_rate']:.1f}%
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
    
    def stop(self):
        """Detener el gestor de operaciones"""
        self.running = False
        self.operation_queue.put(None)  # Señal de parada
        self.executor.shutdown(wait=True)
        if self.worker_thread:
            self.worker_thread.join(timeout=5)

class AsyncDataLoader:
    """Cargador de datos asíncrono especializado"""
    
    def __init__(self, async_manager, db_optimizer, data_cache):
        self.async_manager = async_manager
        self.db_optimizer = db_optimizer
        self.data_cache = data_cache
    
    def load_clients_async(self, filters=None, callback=None):
        """Cargar clientes de forma asíncrona"""
        def load_function():
            # Verificar caché primero
            cached_data = self.data_cache.get_clients(filters)
            if cached_data:
                return cached_data
            
            # Cargar desde base de datos
            query = "SELECT * FROM clients"
            params = []
            
            if filters:
                if 'search' in filters:
                    query += " WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?"
                    search_term = f"%{filters['search']}%"
                    params = [search_term, search_term, search_term]
            
            query += " ORDER BY name"
            
            result = self.db_optimizer.execute_optimized_query(query, params)
            
            # Guardar en caché
            self.data_cache.set_clients(result, filters)
            
            return result
        
        return self.async_manager.submit_operation(load_function, callback=callback)
    
    def load_products_async(self, filters=None, callback=None):
        """Cargar productos de forma asíncrona"""
        def load_function():
            # Verificar caché primero
            cached_data = self.data_cache.get_products(filters)
            if cached_data:
                return cached_data
            
            # Cargar desde base de datos
            query = """
                SELECT p.*, c.name as category_name, s.name as supplier_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
            """
            params = []
            
            if filters:
                if 'search' in filters:
                    query += " WHERE p.name LIKE ? OR p.code LIKE ?"
                    search_term = f"%{filters['search']}%"
                    params = [search_term, search_term]
                elif 'category' in filters:
                    query += " WHERE p.category_id = ?"
                    params = [filters['category']]
            
            query += " ORDER BY p.name"
            
            result = self.db_optimizer.execute_optimized_query(query, params)
            
            # Guardar en caché
            self.data_cache.set_products(result, filters)
            
            return result
        
        return self.async_manager.submit_operation(load_function, callback=callback)
    
    def load_orders_async(self, filters=None, callback=None):
        """Cargar órdenes de forma asíncrona"""
        def load_function():
            # Verificar caché primero
            cached_data = self.data_cache.get_orders(filters)
            if cached_data:
                return cached_data
            
            # Cargar desde base de datos
            query = """
                SELECT wo.*, c.name as client_name, c.phone as client_phone
                FROM work_orders wo
                LEFT JOIN clients c ON wo.client_id = c.id
            """
            params = []
            
            if filters:
                if 'status' in filters:
                    query += " WHERE wo.status = ?"
                    params = [filters['status']]
                elif 'client' in filters:
                    query += " WHERE wo.client_id = ?"
                    params = [filters['client']]
            
            query += " ORDER BY wo.created_at DESC"
            
            result = self.db_optimizer.execute_optimized_query(query, params)
            
            # Guardar en caché
            self.data_cache.set_orders(result, filters)
            
            return result
        
        return self.async_manager.submit_operation(load_function, callback=callback)
    
    def load_quotes_async(self, filters=None, callback=None):
        """Cargar cotizaciones de forma asíncrona"""
        def load_function():
            # Verificar caché primero
            cached_data = self.data_cache.get_quotes(filters)
            if cached_data:
                return cached_data
            
            # Cargar desde base de datos
            query = """
                SELECT q.*, c.name as client_name, c.phone as client_phone
                FROM quotes q
                LEFT JOIN clients c ON q.client_id = c.id
            """
            params = []
            
            if filters:
                if 'status' in filters:
                    query += " WHERE q.status = ?"
                    params = [filters['status']]
                elif 'client' in filters:
                    query += " WHERE q.client_id = ?"
                    params = [filters['client']]
            
            query += " ORDER BY q.created_at DESC"
            
            result = self.db_optimizer.execute_optimized_query(query, params)
            
            # Guardar en caché
            self.data_cache.set_quotes(result, filters)
            
            return result
        
        return self.async_manager.submit_operation(load_function, callback=callback)
