#!/usr/bin/env python3
"""
Sistema de Gestión - Taller Mecánico
Versión con sidebar lateral y dashboard profesional
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
import hashlib
import os
import sys

# Agregar el directorio modules al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'modules'))

from modules.database import Database
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, COLORS, FONTS
from modules.logo_manager import LogoManager

class TallerMecanicoApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Sistema de Gestión - Taller Mecánico")
        self.root.geometry("1200x800")
        self.root.configure(bg=COLORS['bg_primary'])
        
        # Variables de usuario
        self.current_user = None
        self.current_role = None
        self.current_full_name = None
        
        # Inicializar componentes
        self.db = Database()
        self.logo_manager = LogoManager()
        
        # Configurar ventana
        self.setup_window()
        
        # Mostrar login
        self.show_login()
        
        # Configurar limpieza al cerrar
        self.root.protocol("WM_DELETE_WINDOW", self.cleanup_and_exit)
    
    def setup_window(self):
        """Configurar ventana principal"""
        # Centrar ventana
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - 1200) // 2
        y = (screen_height - 800) // 2
        self.root.geometry(f"1200x800+{x}+{y}")
        
        # Configurar icono (opcional)
        try:
            self.logo_manager.set_window_icon(self.root)
        except:
            pass  # Continuar sin icono si hay error
    
    def show_login(self):
        """Mostrar pantalla de login moderna y centrada"""
        # Configurar ventana de login
        self.root.geometry("500x650")
        self.root.resizable(False, False)
        
        # Centrar ventana de login
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - 500) // 2
        y = (screen_height - 650) // 2
        self.root.geometry(f"500x650+{x}+{y}")
        
        # Frame principal del login
        self.login_frame = tk.Frame(self.root, bg=COLORS['primary'])
        self.login_frame.pack(expand=True, fill='both')
        
        # Contenedor centrado
        main_container = tk.Frame(self.login_frame, bg=COLORS['primary'])
        main_container.place(relx=0.5, rely=0.5, anchor='center')
        
        # Logo de la empresa
        logo_label = self.logo_manager.create_logo_label(
            main_container,
            size='large',
            bg=COLORS['primary']
        )
        logo_label.pack(pady=(0, 20))
        
        # Título
        title_label = tk.Label(
            main_container,
            text="RESORTES PUERTO MONTT",
            font=('Segoe UI', 20, 'bold'),
            fg='white',
            bg=COLORS['primary']
        )
        title_label.pack(pady=(0, 10))
        
        subtitle_label = tk.Label(
            main_container,
            text="Sistema de Gestión Empresarial",
            font=('Segoe UI', 14),
            fg='white',
            bg=COLORS['primary']
        )
        subtitle_label.pack(pady=(0, 40))
        
        # Formulario de login centrado
        form_frame = tk.Frame(main_container, bg='white', relief='solid', bd=1)
        form_frame.pack(pady=20, padx=20)
        
        # Título del formulario
        form_title = tk.Label(
            form_frame,
            text="Iniciar Sesión",
            font=('Segoe UI', 18, 'bold'),
            fg=COLORS['text_primary'],
            bg='white'
        )
        form_title.pack(pady=(30, 20))
        
        # Campo usuario
        user_frame = tk.Frame(form_frame, bg='white')
        user_frame.pack(fill='x', padx=30, pady=(0, 15))
        
        user_label = tk.Label(
            user_frame,
            text="Usuario:",
            font=('Segoe UI', 12),
            fg=COLORS['text_primary'],
            bg='white'
        )
        user_label.pack(anchor='w')
        
        self.username_entry = tk.Entry(
            user_frame,
            font=('Segoe UI', 12),
            bg='#f8f9fa',
            fg=COLORS['text_primary'],
            relief='solid',
            bd=1,
            width=25
        )
        self.username_entry.pack(fill='x', pady=(5, 0))
        
        # Campo contraseña
        pass_frame = tk.Frame(form_frame, bg='white')
        pass_frame.pack(fill='x', padx=30, pady=(0, 20))
        
        pass_label = tk.Label(
            pass_frame,
            text="Contraseña:",
            font=('Segoe UI', 12),
            fg=COLORS['text_primary'],
            bg='white'
        )
        pass_label.pack(anchor='w')
        
        self.password_entry = tk.Entry(
            pass_frame,
            font=('Segoe UI', 12),
            bg='#f8f9fa',
            fg=COLORS['text_primary'],
            relief='solid',
            bd=1,
            width=25,
            show='*'
        )
        self.password_entry.pack(fill='x', pady=(5, 0))
        
        # Botón de login
        login_button = tk.Button(
            form_frame,
            text="INICIAR SESIÓN",
            command=self.login,
            font=('Segoe UI', 12, 'bold'),
            bg=COLORS['primary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            height=2
        )
        login_button.pack(fill='x', padx=30, pady=(0, 20))
        
        # Bind Enter para login
        self.password_entry.bind('<Return>', lambda e: self.login())
    
    def login(self):
        """Autenticar usuario"""
        username = self.username_entry.get().strip()
        password = self.password_entry.get().strip()
        
        if not username or not password:
            messagebox.showerror("Error", "Por favor complete todos los campos")
            return
        
        # Hash de la contraseña
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Verificar credenciales
        user = self.db.fetch_one("""
            SELECT username, role, full_name FROM users 
            WHERE username = ? AND password = ?
        """, (username, hashed_password))
        
        if user:
            self.current_user = user['username']
            self.current_role = user['role']
            self.current_full_name = user['full_name']
            
            # Limpiar campos
            self.username_entry.delete(0, tk.END)
            self.password_entry.delete(0, tk.END)
            
            # Mostrar interfaz principal
            self.show_main_interface()
        else:
            messagebox.showerror("Error", "Usuario o contraseña incorrectos")
    
    def show_main_interface(self):
        """Mostrar interfaz principal con sidebar"""
        # Configurar ventana principal
        self.root.geometry("1200x800")
        self.root.resizable(True, True)
        
        # Ocultar login
        self.login_frame.pack_forget()
        
        # Crear layout principal
        self.create_main_layout()
        
        # Mostrar dashboard por defecto
        self.show_dashboard()
    
    def create_main_layout(self):
        """Crear layout principal con sidebar"""
        # Frame principal
        self.main_frame = tk.Frame(self.root, bg=COLORS['bg_primary'])
        self.main_frame.pack(fill='both', expand=True)
        
        # Sidebar
        self.create_sidebar()
        
        # Área de contenido principal
        self.content_frame = tk.Frame(self.main_frame, bg=COLORS['white'])
        self.content_frame.pack(side='right', fill='both', expand=True)
    
    def create_sidebar(self):
        """Crear sidebar lateral"""
        # Frame del sidebar
        self.sidebar = tk.Frame(
            self.main_frame, 
            bg=COLORS['secondary'], 
            width=250
        )
        self.sidebar.pack(side='left', fill='y')
        self.sidebar.pack_propagate(False)
        
        # Logo en el sidebar
        logo_frame = tk.Frame(self.sidebar, bg=COLORS['secondary'])
        logo_frame.pack(fill='x', padx=20, pady=20)
        
        logo_label = tk.Label(
            logo_frame,
            text="🔧",
            font=('Segoe UI', 32),
            fg='white',
            bg=COLORS['secondary']
        )
        logo_label.pack()
        
        # Título del sidebar
        title_label = tk.Label(
            logo_frame,
            text="Taller Mecánico",
            font=('Segoe UI', 16, 'bold'),
            fg='white',
            bg=COLORS['secondary']
        )
        title_label.pack(pady=(10, 0))
        
        # Menú de navegación
        self.create_navigation_menu()
        
        # Información del usuario
        self.create_user_info()
    
    def create_navigation_menu(self):
        """Crear menú de navegación"""
        menu_frame = tk.Frame(self.sidebar, bg=COLORS['secondary'])
        menu_frame.pack(fill='x', padx=20, pady=20)
        
        # Opciones del menú
        menu_items = [
            ("Dashboard", "📊", self.show_dashboard),
            ("Clientes", "👥", self.show_clients),
            ("Inventario", "📦", self.show_inventory),
            ("Cotizaciones", "📋", self.show_quotes)
        ]
        
        self.menu_buttons = {}
        
        for i, (text, icon, command) in enumerate(menu_items):
            btn = tk.Button(
                menu_frame,
                text=f"{icon}  {text}",
                command=command,
                font=('Segoe UI', 12),
                bg=COLORS['secondary'],
                fg='white',
                relief='flat',
                bd=0,
                cursor='hand2',
                anchor='w',
                padx=20,
                pady=15
            )
            btn.pack(fill='x', pady=2)
            self.menu_buttons[text] = btn
            
            # Efecto hover
            def on_enter(event, button=btn):
                button.configure(bg=COLORS['primary'])
            
            def on_leave(event, button=btn):
                button.configure(bg=COLORS['secondary'])
            
            btn.bind('<Enter>', on_enter)
            btn.bind('<Leave>', on_leave)
    
    def create_user_info(self):
        """Crear información del usuario en el sidebar"""
        user_frame = tk.Frame(self.sidebar, bg=COLORS['secondary'])
        user_frame.pack(side='bottom', fill='x', padx=20, pady=20)
        
        # Línea separadora
        separator = tk.Frame(user_frame, bg=COLORS['primary'], height=1)
        separator.pack(fill='x', pady=(0, 15))
        
        # Información del usuario
        user_label = tk.Label(
            user_frame,
            text=f"👤 {self.current_user}",
            font=('Segoe UI', 10),
            fg='white',
            bg=COLORS['secondary']
        )
        user_label.pack(anchor='w')
        
        role_label = tk.Label(
            user_frame,
            text=f"Rol: {self.current_role.title()}",
            font=('Segoe UI', 9),
            fg=COLORS['text_muted'],
            bg=COLORS['secondary']
        )
        role_label.pack(anchor='w', pady=(5, 0))
        
        # Botón de logout
        logout_btn = tk.Button(
            user_frame,
            text="🚪 Cerrar Sesión",
            command=self.logout,
            font=('Segoe UI', 10),
            bg=COLORS['danger'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=10,
            pady=5
        )
        logout_btn.pack(fill='x', pady=(10, 0))
    
    def show_dashboard(self):
        """Mostrar dashboard principal"""
        # Limpiar contenido
        self.clear_content()
        
        # Actualizar botón activo
        self.update_active_button("Dashboard")
        
        # Header del dashboard
        header_frame = tk.Frame(self.content_frame, bg=COLORS['white'])
        header_frame.pack(fill='x', padx=30, pady=30)
        
        title_label = tk.Label(
            header_frame,
            text="Dashboard",
            font=('Segoe UI', 24, 'bold'),
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w')
        
        subtitle_label = tk.Label(
            header_frame,
            text="Gestión integral para tu taller mecánico",
            font=('Segoe UI', 14),
            fg=COLORS['text_secondary'],
            bg=COLORS['white']
        )
        subtitle_label.pack(anchor='w', pady=(5, 0))
        
        # Contenido del dashboard
        content_container = tk.Frame(self.content_frame, bg=COLORS['white'])
        content_container.pack(fill='both', expand=True, padx=30, pady=(0, 30))
        
        # Tarjetas de métricas
        self.create_metrics_cards(content_container)
        
        # Tarjetas de acción
        self.create_action_cards(content_container)
    
    def create_metrics_cards(self, parent):
        """Crear tarjetas de métricas"""
        metrics_frame = tk.Frame(parent, bg=COLORS['white'])
        metrics_frame.pack(fill='x', pady=(0, 30))
        
        # Obtener métricas de la base de datos
        try:
            total_clients = len(self.db.fetch_all("SELECT * FROM clients"))
            total_products = len(self.db.fetch_all("SELECT * FROM products"))
            total_quotes = len(self.db.fetch_all("SELECT * FROM quotes"))
            monthly_sales = 0  # Calcular ventas del mes
        except:
            total_clients = 0
            total_products = 0
            total_quotes = 0
            monthly_sales = 0
        
        # Tarjetas de métricas
        metrics = [
            ("Total Clientes", "👥", str(total_clients), "Clientes registrados"),
            ("Inventario", "📦", str(total_products), "Productos en stock"),
            ("Cotizaciones", "📋", str(total_quotes), "Cotizaciones pendientes"),
            ("Ventas del Mes", "📈", f"${monthly_sales:,}", "Ingresos mensuales")
        ]
        
        for i, (title, icon, value, description) in enumerate(metrics):
            card = self.create_metric_card(metrics_frame, title, icon, value, description)
            card.grid(row=0, column=i, padx=10, sticky='ew')
        
        # Configurar columnas
        for i in range(4):
            metrics_frame.columnconfigure(i, weight=1)
    
    def create_metric_card(self, parent, title, icon, value, description):
        """Crear una tarjeta de métrica"""
        card = tk.Frame(
            parent,
            bg=COLORS['white'],
            relief='solid',
            bd=1,
            highlightbackground=COLORS['border_light'],
            highlightthickness=1
        )
        
        # Contenido de la tarjeta
        content_frame = tk.Frame(card, bg=COLORS['white'])
        content_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Icono y título
        header_frame = tk.Frame(content_frame, bg=COLORS['white'])
        header_frame.pack(fill='x')
        
        icon_label = tk.Label(
            header_frame,
            text=icon,
            font=('Segoe UI', 24),
            fg=COLORS['primary'],
            bg=COLORS['white']
        )
        icon_label.pack(side='left')
        
        title_label = tk.Label(
            header_frame,
            text=title,
            font=('Segoe UI', 12, 'bold'),
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(side='left', padx=(10, 0))
        
        # Valor
        value_label = tk.Label(
            content_frame,
            text=value,
            font=('Segoe UI', 24, 'bold'),
            fg=COLORS['primary'],
            bg=COLORS['white']
        )
        value_label.pack(anchor='w', pady=(10, 5))
        
        # Descripción
        desc_label = tk.Label(
            content_frame,
            text=description,
            font=('Segoe UI', 10),
            fg=COLORS['text_secondary'],
            bg=COLORS['white']
        )
        desc_label.pack(anchor='w')
        
        return card
    
    def create_action_cards(self, parent):
        """Crear tarjetas de acción"""
        actions_frame = tk.Frame(parent, bg=COLORS['white'])
        actions_frame.pack(fill='x')
        
        # Tarjetas de acción
        actions = [
            ("Gestión de Clientes", "👥", "Administra la información de tus clientes", "+ Nuevo Cliente", self.show_clients),
            ("Control de Inventario", "📦", "Gestiona repuestos y materiales", "+ Nuevo Producto", self.show_inventory),
            ("Cotizaciones y Ventas", "📋", "Crea cotizaciones para tus clientes", "+ Nueva Cotización", self.show_quotes)
        ]
        
        for i, (title, icon, description, button_text, command) in enumerate(actions):
            card = self.create_action_card(actions_frame, title, icon, description, button_text, command)
            card.grid(row=0, column=i, padx=10, sticky='ew')
        
        # Configurar columnas
        for i in range(3):
            actions_frame.columnconfigure(i, weight=1)
    
    def create_action_card(self, parent, title, icon, description, button_text, command):
        """Crear una tarjeta de acción"""
        card = tk.Frame(
            parent,
            bg=COLORS['white'],
            relief='solid',
            bd=1,
            highlightbackground=COLORS['border_light'],
            highlightthickness=1
        )
        
        # Contenido de la tarjeta
        content_frame = tk.Frame(card, bg=COLORS['white'])
        content_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Icono
        icon_label = tk.Label(
            content_frame,
            text=icon,
            font=('Segoe UI', 32),
            fg=COLORS['primary'],
            bg=COLORS['white']
        )
        icon_label.pack(pady=(0, 15))
        
        # Título
        title_label = tk.Label(
            content_frame,
            text=title,
            font=('Segoe UI', 14, 'bold'),
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(pady=(0, 10))
        
        # Descripción
        desc_label = tk.Label(
            content_frame,
            text=description,
            font=('Segoe UI', 11),
            fg=COLORS['text_secondary'],
            bg=COLORS['white'],
            wraplength=200,
            justify='center'
        )
        desc_label.pack(pady=(0, 20))
        
        # Botón de acción
        action_btn = tk.Button(
            content_frame,
            text=button_text,
            command=command,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['primary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=20,
            pady=8
        )
        action_btn.pack()
        
        return card
    
    def show_clients(self):
        """Mostrar módulo de clientes"""
        self.clear_content()
        self.update_active_button("Clientes")
        
        # Importar y crear módulo de clientes
        from modules.clients import ClientsModule
        self.current_module = ClientsModule(self.content_frame, self.db, self.current_role)
        self.current_module.frame.pack(fill='both', expand=True, padx=30, pady=30)
    
    def show_inventory(self):
        """Mostrar módulo de inventario"""
        self.clear_content()
        self.update_active_button("Inventario")
        
        # Importar y crear módulo de inventario
        from modules.inventory import InventoryModule
        self.current_module = InventoryModule(self.content_frame, self.db, self.current_role)
        self.current_module.frame.pack(fill='both', expand=True, padx=30, pady=30)
    
    def show_quotes(self):
        """Mostrar módulo de cotizaciones"""
        self.clear_content()
        self.update_active_button("Cotizaciones")
        
        # Importar y crear módulo de cotizaciones
        from modules.quotes import QuotesModule
        self.current_module = QuotesModule(self.content_frame, self.db, self.current_role)
        self.current_module.frame.pack(fill='both', expand=True, padx=30, pady=30)
    
    def clear_content(self):
        """Limpiar área de contenido"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def update_active_button(self, active_text):
        """Actualizar botón activo en el menú"""
        for text, button in self.menu_buttons.items():
            if text == active_text:
                button.configure(bg=COLORS['primary'])
            else:
                button.configure(bg=COLORS['secondary'])
    
    def logout(self):
        """Cerrar sesión"""
        self.current_user = None
        self.current_role = None
        self.current_full_name = None
        
        # Limpiar interfaz principal
        self.main_frame.pack_forget()
        
        # Mostrar login
        self.show_login()
    
    def cleanup_and_exit(self):
        """Limpiar recursos y cerrar aplicación"""
        try:
            self.root.quit()
            self.root.destroy()
        except Exception as e:
            print(f"Error durante limpieza: {e}")
            import os
            os._exit(0)
    
    def run(self):
        """Ejecutar aplicación"""
        self.root.mainloop()

if __name__ == "__main__":
    app = TallerMecanicoApp()
    app.run()
