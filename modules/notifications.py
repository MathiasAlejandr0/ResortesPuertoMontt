"""
Sistema de notificaciones empresariales 2025
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, COLORS, FONTS

class NotificationSystem:
    def __init__(self, parent, db):
        self.parent = parent
        self.db = db
        self.notifications = []
        self.load_notifications()
    
    def load_notifications(self):
        """Cargar notificaciones desde la base de datos"""
        try:
            self.notifications = self.db.fetch_all("""
                SELECT * FROM notifications 
                WHERE is_read = FALSE 
                ORDER BY created_at DESC 
                LIMIT 10
            """)
        except Exception as e:
            print(f"Error cargando notificaciones: {e}")
            self.notifications = []
    
    def create_notification_panel(self, parent_frame):
        """Crear panel de notificaciones"""
        # Frame principal
        panel_frame = create_styled_frame(parent_frame, bg=COLORS['white'])
        panel_frame.pack(fill='x', pady=(0, 10))
        
        # Header del panel
        header_frame = create_styled_frame(panel_frame, bg=COLORS['primary'])
        header_frame.pack(fill='x')
        
        title_label = create_styled_label(
            header_frame,
            text="🔔 NOTIFICACIONES",
            font=FONTS['subtitle'],
            fg=COLORS['text_light'],
            bg=COLORS['primary']
        )
        title_label.pack(side='left', padx=15, pady=10)
        
        # Contador de notificaciones
        count_label = create_styled_label(
            header_frame,
            text=f"({len(self.notifications)})",
            font=FONTS['body'],
            fg=COLORS['text_light'],
            bg=COLORS['primary']
        )
        count_label.pack(side='right', padx=15, pady=10)
        
        # Lista de notificaciones
        if self.notifications:
            for notification in self.notifications[:5]:  # Mostrar solo las 5 más recientes
                self.create_notification_item(panel_frame, notification)
        else:
            no_notifications = create_styled_label(
                panel_frame,
                text="No hay notificaciones nuevas",
                font=FONTS['body'],
                fg=COLORS['text_muted'],
                bg=COLORS['white']
            )
            no_notifications.pack(pady=20)
    
    def create_notification_item(self, parent, notification):
        """Crear item de notificación"""
        # Frame del item
        item_frame = create_styled_frame(parent, bg=COLORS['light_gray'])
        item_frame.pack(fill='x', padx=10, pady=5)
        
        # Icono según tipo
        icon_map = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'success': '✅',
            'danger': '❌',
            'error': '🚨'
        }
        icon = icon_map.get(notification['type'], 'ℹ️')
        
        # Icono
        icon_label = create_styled_label(
            item_frame,
            text=icon,
            font=FONTS['body'],
            bg=COLORS['light_gray']
        )
        icon_label.pack(side='left', padx=(10, 5), pady=5)
        
        # Contenido
        content_frame = create_styled_frame(item_frame, bg=COLORS['light_gray'])
        content_frame.pack(side='left', fill='x', expand=True, padx=(0, 10), pady=5)
        
        # Título
        title_label = create_styled_label(
            content_frame,
            text=notification['title'],
            font=FONTS['body_bold'],
            fg=COLORS['text_primary'],
            bg=COLORS['light_gray']
        )
        title_label.pack(anchor='w')
        
        # Mensaje
        message_label = create_styled_label(
            content_frame,
            text=notification['message'],
            font=FONTS['small'],
            fg=COLORS['text_secondary'],
            bg=COLORS['light_gray'],
            wraplength=300,
            justify='left'
        )
        message_label.pack(anchor='w')
        
        # Fecha
        date_str = notification['created_at'][:16] if notification['created_at'] else 'N/A'
        date_label = create_styled_label(
            content_frame,
            text=date_str,
            font=FONTS['caption'],
            fg=COLORS['text_muted'],
            bg=COLORS['light_gray']
        )
        date_label.pack(anchor='w')
        
        # Botón de acción
        action_btn = create_styled_button(
            item_frame,
            text="✓",
            command=lambda: self.mark_as_read(notification['id']),
            button_type='success',
            width=3,
            height=1
        )
        action_btn.pack(side='right', padx=(0, 10), pady=5)
    
    def mark_as_read(self, notification_id):
        """Marcar notificación como leída"""
        try:
            self.db.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = ?",
                (notification_id,)
            )
            self.load_notifications()
            # Refrescar panel si existe
            if hasattr(self, 'panel_frame'):
                self.refresh_panel()
        except Exception as e:
            print(f"Error marcando notificación como leída: {e}")
    
    def add_notification(self, title, message, notification_type='info'):
        """Agregar nueva notificación"""
        try:
            self.db.execute("""
                INSERT INTO notifications (title, message, type, created_at)
                VALUES (?, ?, ?, ?)
            """, (title, message, notification_type, datetime.now().isoformat()))
            
            self.load_notifications()
            if hasattr(self, 'panel_frame'):
                self.refresh_panel()
        except Exception as e:
            print(f"Error agregando notificación: {e}")
    
    def refresh_panel(self):
        """Refrescar panel de notificaciones"""
        if hasattr(self, 'panel_frame'):
            for widget in self.panel_frame.winfo_children():
                widget.destroy()
            self.create_notification_panel(self.panel_frame)

class DashboardWidgets:
    """Widgets del dashboard empresarial"""
    
    @staticmethod
    def create_quick_actions(parent):
        """Crear panel de acciones rápidas"""
        actions_frame = create_styled_frame(parent, bg=COLORS['white'])
        actions_frame.pack(fill='x', pady=(0, 10))
        
        # Header
        header = create_styled_label(
            actions_frame,
            text="⚡ ACCIONES RÁPIDAS",
            font=FONTS['subtitle'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        header.pack(anchor='w', padx=15, pady=(10, 5))
        
        # Botones de acción
        buttons_frame = create_styled_frame(actions_frame, bg=COLORS['white'])
        buttons_frame.pack(fill='x', padx=15, pady=(0, 10))
        
        quick_actions = [
            ("📋 Nueva Cotización", "primary"),
            ("👥 Nuevo Cliente", "success"),
            ("📦 Agregar Producto", "warning"),
            ("📊 Ver Reportes", "info")
        ]
        
        for i, (text, btn_type) in enumerate(quick_actions):
            btn = create_styled_button(
                buttons_frame,
                text=text,
                command=lambda t=text: print(f"Acción: {t}"),
                button_type=btn_type,
                width=15
            )
            btn.pack(side='left', padx=(0, 10) if i < len(quick_actions) - 1 else 0)
    
    @staticmethod
    def create_recent_activity(parent):
        """Crear panel de actividad reciente"""
        activity_frame = create_styled_frame(parent, bg=COLORS['white'])
        activity_frame.pack(fill='x', pady=(0, 10))
        
        # Header
        header = create_styled_label(
            activity_frame,
            text="📈 ACTIVIDAD RECIENTE",
            font=FONTS['subtitle'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        header.pack(anchor='w', padx=15, pady=(10, 5))
        
        # Lista de actividades
        activities = [
            ("Nuevo cliente registrado", "2 min", "success"),
            ("Cotización aprobada", "15 min", "info"),
            ("Stock bajo en filtros", "1 hora", "warning"),
            ("Trabajo completado", "2 horas", "success"),
            ("Pago recibido", "3 horas", "info")
        ]
        
        for activity, time, status in activities:
            item_frame = create_styled_frame(activity_frame, bg=COLORS['light_gray'])
            item_frame.pack(fill='x', padx=15, pady=2)
            
            # Icono de estado
            status_icon = "✅" if status == "success" else "ℹ️" if status == "info" else "⚠️"
            icon_label = create_styled_label(
                item_frame,
                text=status_icon,
                font=FONTS['body'],
                bg=COLORS['light_gray']
            )
            icon_label.pack(side='left', padx=(5, 10), pady=5)
            
            # Texto de actividad
            text_label = create_styled_label(
                item_frame,
                text=activity,
                font=FONTS['body'],
                fg=COLORS['text_primary'],
                bg=COLORS['light_gray']
            )
            text_label.pack(side='left', fill='x', expand=True, pady=5)
            
            # Tiempo
            time_label = create_styled_label(
                item_frame,
                text=time,
                font=FONTS['small'],
                fg=COLORS['text_muted'],
                bg=COLORS['light_gray']
            )
            time_label.pack(side='right', padx=(0, 10), pady=5)
    
    @staticmethod
    def create_weather_widget(parent):
        """Crear widget del clima (simulado)"""
        weather_frame = create_styled_frame(parent, bg=COLORS['white'])
        weather_frame.pack(fill='x', pady=(0, 10))
        
        # Header
        header = create_styled_label(
            weather_frame,
            text="🌤️ CLIMA PUERTO MONTT",
            font=FONTS['subtitle'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        header.pack(anchor='w', padx=15, pady=(10, 5))
        
        # Información del clima
        weather_info = create_styled_frame(weather_frame, bg=COLORS['light_gray'])
        weather_info.pack(fill='x', padx=15, pady=(0, 10))
        
        # Temperatura
        temp_label = create_styled_label(
            weather_info,
            text="18°C",
            font=FONTS['heading'],
            fg=COLORS['primary'],
            bg=COLORS['light_gray']
        )
        temp_label.pack(side='left', padx=10, pady=10)
        
        # Descripción
        desc_label = create_styled_label(
            weather_info,
            text="Parcialmente nublado\nHumedad: 65%",
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['light_gray']
        )
        desc_label.pack(side='left', fill='x', expand=True, padx=(0, 10), pady=10)
        
        # Icono del clima
        weather_icon = create_styled_label(
            weather_info,
            text="⛅",
            font=('Segoe UI', 24),
            bg=COLORS['light_gray']
        )
        weather_icon.pack(side='right', padx=10, pady=10)
