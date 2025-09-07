import tkinter as tk
from tkinter import ttk, messagebox
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, COLORS, FONTS

class AuthModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
    
    def create_widgets(self):
        main_frame = create_styled_frame(self.frame)
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        title_label = create_styled_label(
            main_frame, 
            text="👤 GESTIÓN DE USUARIOS", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        info_label = create_styled_label(
            main_frame,
            text="Módulo de Usuarios - En desarrollo",
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            justify='center'
        )
        info_label.pack(expand=True, fill='both')