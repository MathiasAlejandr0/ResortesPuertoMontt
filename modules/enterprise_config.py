import tkinter as tk
from tkinter import ttk, messagebox
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, COLORS, FONTS

class EnterpriseConfig:
    def __init__(self, parent, db):
        self.parent = parent
        self.db = db
        self.config = {}
        self.load_config()
    
    def load_config(self):
        """Cargar configuración del sistema"""
        try:
            # Configuración por defecto
            self.config = {
                'company_name': 'Resortes Puerto Montt',
                'company_address': 'Puerto Montt, Chile',
                'company_phone': '+56 9 1234 5678',
                'company_email': 'info@resortespm.cl',
                'currency': 'CLP',
                'tax_rate': 0.19,
                'backup_enabled': True,
                'backup_frequency': 'daily',
                'notifications_enabled': True
            }
        except Exception as e:
            print(f"Error cargando configuración: {e}")
            # Usar configuración por defecto
            self.config = {
                'company_name': 'Resortes Puerto Montt',
                'company_address': 'Puerto Montt, Chile',
                'company_phone': '+56 9 1234 5678',
                'company_email': 'info@resortespm.cl',
                'currency': 'CLP',
                'tax_rate': 0.19,
                'backup_enabled': True,
                'backup_frequency': 'daily',
                'notifications_enabled': True
            }
    
    def get_config(self, key, default=None):
        """Obtener valor de configuración"""
        return self.config.get(key, default)
    
    def set_config(self, key, value):
        """Establecer valor de configuración"""
        self.config[key] = value
    
    def create_config_panel(self, parent):
        """Crear panel de configuración"""
        # Frame principal
        main_frame = create_styled_frame(parent, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame,
            text="⚙️ CONFIGURACIÓN EMPRESARIAL",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Información de la empresa
        info_label = create_styled_label(
            main_frame,
            text="Configuración del sistema - En desarrollo",
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['bg_primary']
        )
        info_label.pack(expand=True, fill='both')
        
        return main_frame