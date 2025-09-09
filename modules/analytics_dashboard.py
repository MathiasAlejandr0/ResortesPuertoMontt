import tkinter as tk
from tkinter import ttk, messagebox
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, COLORS, FONTS

class AnalyticsDashboard:
    def __init__(self, parent, db):
        self.parent = parent
        self.db = db
    
    def create_analytics_dashboard(self, parent):
        """Crear dashboard de analytics"""
        # Frame principal
        main_frame = create_styled_frame(parent, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame,
            text="📈 DASHBOARD ANALYTICS",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Información
        info_label = create_styled_label(
            main_frame,
            text="Dashboard de analytics - En desarrollo",
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['bg_primary']
        )
        info_label.pack(expand=True, fill='both')
        
        return main_frame