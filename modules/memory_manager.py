"""
Sistema de Gestión de Memoria y Caché Inteligente 2025
"""

import gc
import psutil
import threading
import time
from datetime import datetime, timedelta
from collections import OrderedDict
from modules.styles import create_styled_label, create_styled_frame, create_styled_button, COLORS, FONTS

class MemoryManager:
    def __init__(self):
        self.cache = OrderedDict()
        self.max_cache_size = 100  # Máximo 100 elementos en caché
        self.cache_ttl = 300  # 5 minutos TTL por defecto
        self.memory_threshold = 80  # 80% de uso de memoria
        self.cleanup_interval = 60  # Limpiar cada 60 segundos
        self.stats = {
            'cache_hits': 0,
            'cache_misses': 0,
            'memory_cleanups': 0,
            'total_memory_freed': 0
        }
        self.running = True
        self.cleanup_thread = None
        self.start_cleanup_thread()
    
    def start_cleanup_thread(self):
        """Iniciar hilo de limpieza automática"""
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
    
    def _cleanup_loop(self):
        """Loop de limpieza automática"""
        while self.running:
            try:
                self.cleanup_expired_cache()
                self.check_memory_usage()
                time.sleep(self.cleanup_interval)
            except Exception as e:
                print(f"Error en cleanup thread: {e}")
                time.sleep(10)
    
    def get(self, key, default=None):
        """Obtener valor del caché"""
        if key in self.cache:
            # Mover al final (LRU)
            value = self.cache.pop(key)
            self.cache[key] = value
            
            # Verificar TTL
            if time.time() - value['timestamp'] < value['ttl']:
                self.stats['cache_hits'] += 1
                return value['data']
            else:
                # Expirar entrada
                del self.cache[key]
        
        self.stats['cache_misses'] += 1
        return default
    
    def set(self, key, value, ttl=None):
        """Establecer valor en caché"""
        if ttl is None:
            ttl = self.cache_ttl
        
        # Si la clave ya existe, removerla primero
        if key in self.cache:
            del self.cache[key]
        
        # Agregar nueva entrada
        self.cache[key] = {
            'data': value,
            'timestamp': time.time(),
            'ttl': ttl
        }
        
        # Verificar límite de tamaño
        if len(self.cache) > self.max_cache_size:
            # Remover el elemento más antiguo (LRU)
            self.cache.popitem(last=False)
    
    def cleanup_expired_cache(self):
        """Limpiar entradas expiradas del caché"""
        current_time = time.time()
        expired_keys = []
        
        for key, value in self.cache.items():
            if current_time - value['timestamp'] >= value['ttl']:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            self.stats['memory_cleanups'] += 1
    
    def check_memory_usage(self):
        """Verificar uso de memoria y limpiar si es necesario"""
        try:
            # Obtener uso de memoria del proceso
            process = psutil.Process()
            memory_percent = process.memory_percent()
            
            if memory_percent > self.memory_threshold:
                # Limpiar caché más agresivamente
                self.aggressive_cleanup()
                
                # Forzar garbage collection
                gc.collect()
                
                print(f"Memoria alta ({memory_percent:.1f}%), limpieza ejecutada")
                
        except Exception as e:
            print(f"Error verificando memoria: {e}")
    
    def aggressive_cleanup(self):
        """Limpieza agresiva del caché"""
        # Reducir caché a la mitad
        target_size = len(self.cache) // 2
        
        while len(self.cache) > target_size:
            self.cache.popitem(last=False)
        
        self.stats['memory_cleanups'] += 1
    
    def clear_cache(self):
        """Limpiar todo el caché"""
        cache_size = len(self.cache)
        self.cache.clear()
        self.stats['total_memory_freed'] += cache_size
        print(f"Caché limpiado: {cache_size} entradas removidas")
    
    def get_memory_stats(self):
        """Obtener estadísticas de memoria"""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            
            # Calcular hit rate
            total_requests = self.stats['cache_hits'] + self.stats['cache_misses']
            hit_rate = (self.stats['cache_hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'memory_usage_mb': round(memory_info.rss / 1024 / 1024, 2),
                'memory_percent': round(process.memory_percent(), 2),
                'cache_size': len(self.cache),
                'cache_hit_rate': round(hit_rate, 2),
                'cache_hits': self.stats['cache_hits'],
                'cache_misses': self.stats['cache_misses'],
                'memory_cleanups': self.stats['memory_cleanups'],
                'total_memory_freed': self.stats['total_memory_freed']
            }
        except Exception as e:
            print(f"Error obteniendo estadísticas de memoria: {e}")
            return {}
    
    def create_memory_monitor(self, parent_frame):
        """Crear monitor de memoria"""
        monitor_frame = create_styled_frame(parent_frame, bg=COLORS['white'])
        monitor_frame.pack(fill='x', pady=10)
        
        # Título
        title_label = create_styled_label(
            monitor_frame,
            text="🧠 MONITOR DE MEMORIA",
            font=FONTS['heading'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', padx=15, pady=(15, 10))
        
        # Estadísticas
        stats = self.get_memory_stats()
        
        if stats:
            stats_text = f"""
            Uso de Memoria: {stats['memory_usage_mb']} MB ({stats['memory_percent']}%)
            Tamaño del Caché: {stats['cache_size']} entradas
            Tasa de Acierto: {stats['cache_hit_rate']}%
            Aciertos: {stats['cache_hits']} | Fallos: {stats['cache_misses']}
            Limpiezas Ejecutadas: {stats['memory_cleanups']}
            Memoria Liberada: {stats['total_memory_freed']} entradas
            """
        else:
            stats_text = "Error obteniendo estadísticas de memoria"
        
        stats_label = create_styled_label(
            monitor_frame,
            text=stats_text,
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['white'],
            justify='left'
        )
        stats_label.pack(anchor='w', padx=15, pady=(0, 10))
        
        # Botones de control
        buttons_frame = create_styled_frame(monitor_frame, bg=COLORS['white'])
        buttons_frame.pack(fill='x', padx=15, pady=(0, 15))
        
        clear_cache_btn = create_styled_button(
            buttons_frame,
            text="🧹 Limpiar Caché",
            command=self.clear_cache,
            button_type='warning',
            width=15
        )
        clear_cache_btn.pack(side='left', padx=(0, 10))
        
        gc_btn = create_styled_button(
            buttons_frame,
            text="🗑️ Garbage Collection",
            command=lambda: gc.collect(),
            button_type='info',
            width=20
        )
        gc_btn.pack(side='left')
        
        return monitor_frame
    
    def stop(self):
        """Detener el gestor de memoria"""
        self.running = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)

class DataCache:
    """Caché especializado para datos de la aplicación"""
    
    def __init__(self, memory_manager):
        self.memory_manager = memory_manager
        self.prefixes = {
            'clients': 'clients_',
            'products': 'products_',
            'orders': 'orders_',
            'quotes': 'quotes_',
            'reports': 'reports_'
        }
    
    def get_clients(self, filters=None):
        """Obtener clientes del caché"""
        cache_key = f"{self.prefixes['clients']}{str(filters) if filters else 'all'}"
        return self.memory_manager.get(cache_key)
    
    def set_clients(self, clients, filters=None, ttl=300):
        """Establecer clientes en caché"""
        cache_key = f"{self.prefixes['clients']}{str(filters) if filters else 'all'}"
        self.memory_manager.set(cache_key, clients, ttl)
    
    def get_products(self, filters=None):
        """Obtener productos del caché"""
        cache_key = f"{self.prefixes['products']}{str(filters) if filters else 'all'}"
        return self.memory_manager.get(cache_key)
    
    def set_products(self, products, filters=None, ttl=300):
        """Establecer productos en caché"""
        cache_key = f"{self.prefixes['products']}{str(filters) if filters else 'all'}"
        self.memory_manager.set(cache_key, products, ttl)
    
    def get_orders(self, filters=None):
        """Obtener órdenes del caché"""
        cache_key = f"{self.prefixes['orders']}{str(filters) if filters else 'all'}"
        return self.memory_manager.get(cache_key)
    
    def set_orders(self, orders, filters=None, ttl=300):
        """Establecer órdenes en caché"""
        cache_key = f"{self.prefixes['orders']}{str(filters) if filters else 'all'}"
        self.memory_manager.set(cache_key, orders, ttl)
    
    def get_quotes(self, filters=None):
        """Obtener cotizaciones del caché"""
        cache_key = f"{self.prefixes['quotes']}{str(filters) if filters else 'all'}"
        return self.memory_manager.get(cache_key)
    
    def set_quotes(self, quotes, filters=None, ttl=300):
        """Establecer cotizaciones en caché"""
        cache_key = f"{self.prefixes['quotes']}{str(filters) if filters else 'all'}"
        self.memory_manager.set(cache_key, quotes, ttl)
    
    def invalidate_prefix(self, prefix):
        """Invalidar todas las entradas con un prefijo"""
        keys_to_remove = []
        for key in self.memory_manager.cache.keys():
            if key.startswith(prefix):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            if key in self.memory_manager.cache:
                del self.memory_manager.cache[key]
    
    def invalidate_all(self):
        """Invalidar todo el caché de datos"""
        self.memory_manager.clear_cache()
