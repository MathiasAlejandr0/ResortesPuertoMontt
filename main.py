import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
from datetime import datetime
import os

# Importar módulos del sistema
from modules.database import Database
from modules.inventory import InventoryModule
from modules.clients import ClientsModule
from modules.workshop import WorkshopModule
from modules.suppliers import SuppliersModule
from modules.reports import ReportsModule
from modules.auth import AuthModule
from modules.workers import WorkersModule
from modules.enhanced_quotes import EnhancedQuotesModule
from modules.remainders import RemaindersModule
from modules.analytics import AnalyticsModule
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS
from modules.quotes import QuotesModule

class TallerMecanicoApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sistema de Gestión - Taller Mecánico")
        
        # Configurar ventana para que se adapte automáticamente a la pantalla
        self.root.state('zoomed')  # Maximizar en Windows
        self.root.configure(bg=COLORS['bg_primary'])
        
        # Configurar propiedades de ventana
        self.root.resizable(True, True)
        self.root.minsize(1024, 768)  # Tamaño mínimo
        
        # Inicializar base de datos
        self.db = Database()
        self.db.create_tables()
        
        # Variables de autenticación
        self.current_user = None
        self.current_role = None
        
        # Cache para módulos (optimización de rendimiento)
        self.module_cache = {}
        
        # Crear interfaz de login
        self.create_login_screen()
    
    def create_login_screen(self):
        """Crear pantalla de login moderna tipo celular"""
        # Configurar ventana de login compacta
        self.root.state('normal')
        width = 320
        height = 480
        
        # Centrar ventana
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        self.root.resizable(False, False)
        
        # Frame principal con gradiente rojo
        self.login_frame = tk.Frame(self.root, bg=COLORS['primary'])
        self.login_frame.pack(expand=True, fill='both')
        
        # Contenedor principal centrado
        main_container = tk.Frame(self.login_frame, bg=COLORS['primary'])
        main_container.place(relx=0.5, rely=0.5, anchor='center')
        
        # Logo y título de la empresa
        logo_container = tk.Frame(main_container, bg=COLORS['primary'])
        logo_container.pack(pady=(0, 40))
        
        # Logo grande
        logo_label = tk.Label(
            logo_container,
            text="🚗",
            font=('Segoe UI', 60),
            fg='white',
            bg=COLORS['primary']
        )
        logo_label.pack()
        
        # Nombre de la empresa
        company_title = tk.Label(
            logo_container,
            text="RESORTES PUERTO MONTT",
            font=('Segoe UI', 16, 'bold'),
            fg='white',
            bg=COLORS['primary']
        )
        company_title.pack(pady=(10, 0))
        
        # Subtítulo
        subtitle = tk.Label(
            logo_container,
            text="Sistema de Gestión",
            font=('Segoe UI', 12),
            fg='white',
            bg=COLORS['primary']
        )
        subtitle.pack(pady=(5, 0))
        
        # Contenedor del formulario
        form_container = tk.Frame(main_container, bg='white', relief='solid', bd=1)
        form_container.pack(pady=(0, 20), padx=20, fill='x')
        
        # Padding interno del formulario
        form_inner = tk.Frame(form_container, bg='white')
        form_inner.pack(padx=30, pady=30)
        
        # Título del formulario
        form_title = tk.Label(
            form_inner,
            text="Iniciar Sesión",
            font=('Segoe UI', 18, 'bold'),
            fg=COLORS['text_primary'],
            bg='white'
        )
        form_title.pack(pady=(0, 25))
        
        # Campo Usuario
        user_frame = tk.Frame(form_inner, bg='white')
        user_frame.pack(fill='x', pady=(0, 15))
        
        user_icon = tk.Label(
            user_frame,
            text="👤",
            font=('Segoe UI', 16),
            fg=COLORS['text_secondary'],
            bg='white'
        )
        user_icon.pack(side='left', padx=(0, 10))
        
        self.username_entry = tk.Entry(
            user_frame,
            font=('Segoe UI', 14),
            bg='#f8f9fa',
            fg=COLORS['text_primary'],
            relief='solid',
            bd=1,
            width=18,
            highlightthickness=2,
            highlightcolor=COLORS['primary']
        )
        self.username_entry.pack(side='left', ipady=8)
        self.username_entry.insert(0, "Usuario")
        self.username_entry.bind('<FocusIn>', lambda e: self.clear_placeholder(self.username_entry, "Usuario"))
        self.username_entry.bind('<FocusOut>', lambda e: self.add_placeholder(self.username_entry, "Usuario"))
        
        # Campo Contraseña
        pass_frame = tk.Frame(form_inner, bg='white')
        pass_frame.pack(fill='x', pady=(0, 25))
        
        pass_icon = tk.Label(
            pass_frame,
            text="🔒",
            font=('Segoe UI', 16),
            fg=COLORS['text_secondary'],
            bg='white'
        )
        pass_icon.pack(side='left', padx=(0, 10))
        
        self.password_entry = tk.Entry(
            pass_frame,
            font=('Segoe UI', 14),
            bg='#f8f9fa',
            fg=COLORS['text_primary'],
            relief='solid',
            bd=1,
            width=18,
            highlightthickness=2,
            highlightcolor=COLORS['primary']
        )
        self.password_entry.pack(side='left', ipady=8)
        self.password_entry.insert(0, "Contraseña")
        self.password_entry.bind('<FocusIn>', lambda e: self.clear_password_placeholder())
        self.password_entry.bind('<FocusOut>', lambda e: self.add_password_placeholder())
        
        # Checkbox recordar credenciales
        remember_frame = tk.Frame(form_inner, bg='white')
        remember_frame.pack(fill='x', pady=(0, 20))
        
        self.remember_var = tk.BooleanVar()
        remember_check = tk.Checkbutton(
            remember_frame,
            text="Recordar credenciales",
            variable=self.remember_var,
            font=('Segoe UI', 10),
            fg=COLORS['text_secondary'],
            bg='white',
            activebackground='white',
            selectcolor='white'
        )
        remember_check.pack(anchor='w')
        
        # Botón de inicio de sesión
        login_button = tk.Button(
            form_inner,
            text="INICIAR",
            command=self.login,
            font=('Segoe UI', 14, 'bold'),
            bg='black',
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            width=20,
            height=2
        )
        login_button.pack(fill='x', pady=(0, 15))
        
        # Efectos hover para el botón
        def on_enter(e):
            login_button.config(bg='#333333')
        def on_leave(e):
            login_button.config(bg='black')
        
        login_button.bind('<Enter>', on_enter)
        login_button.bind('<Leave>', on_leave)
        
        # Información de credenciales
        cred_info = tk.Label(
            form_inner,
            text="Iniciar sesión con admin | admin123",
            font=('Segoe UI', 9),
            fg=COLORS['text_secondary'],
            bg='white'
        )
        cred_info.pack()
        
        # Usuarios por defecto
        self.create_default_users()
        
        # Bind Enter key
        self.root.bind('<Return>', lambda event: self.login())
    
    def clear_placeholder(self, entry, placeholder):
        """Limpiar placeholder al hacer focus"""
        if entry.get() == placeholder:
            entry.delete(0, tk.END)
            entry.config(fg=COLORS['text_primary'])
    
    def add_placeholder(self, entry, placeholder):
        """Agregar placeholder al perder focus"""
        if not entry.get():
            entry.insert(0, placeholder)
            entry.config(fg=COLORS['text_secondary'])
    
    def clear_password_placeholder(self):
        """Limpiar placeholder de contraseña"""
        if self.password_entry.get() == "Contraseña":
            self.password_entry.delete(0, tk.END)
            self.password_entry.config(show='*', fg=COLORS['text_primary'])
    
    def add_password_placeholder(self):
        """Agregar placeholder de contraseña"""
        if not self.password_entry.get():
            self.password_entry.config(show='')
            self.password_entry.insert(0, "Contraseña")
            self.password_entry.config(fg=COLORS['text_secondary'])
        
        # Focus en el campo usuario
        self.username_entry.focus_set()
    
    def create_default_users(self):
        """Crear usuarios por defecto - siempre limpia y recrea el admin"""
        import hashlib
        
        # SIEMPRE eliminar y recrear el usuario admin para evitar problemas
        self.db.execute("DELETE FROM users WHERE username = 'admin'")
        
        # Crear usuario admin limpio
        admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
        self.db.execute("""
            INSERT INTO users (username, password, role, full_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ('admin', admin_password, 'administrador', 'Administrador del Sistema', datetime.now().isoformat()))
    
    def login(self):
        """Autenticar usuario"""
        username = self.username_entry.get().strip()
        password = self.password_entry.get().strip()
        
        if not username or not password:
            messagebox.showerror("Error", "Por favor complete todos los campos")
            return
        
        # Hash de la contraseña ingresada
        import hashlib
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Verificar credenciales
        user = self.db.fetch_one("""
            SELECT username, role, full_name FROM users 
            WHERE username = ? AND password = ?
        """, (username, hashed_password))
        
        if user:
            self.current_user = user[0]
            self.current_role = user[1]
            self.current_full_name = user[2]
            
            # Limpiar campos
            self.username_entry.delete(0, tk.END)
            self.password_entry.delete(0, tk.END)
            
            self.show_main_interface()
        else:
            messagebox.showerror("Error", "Usuario o contraseña incorrectos")
    
    def show_main_interface(self):
        """Mostrar interfaz principal después del login"""
        # Maximizar ventana automáticamente
        self.root.state('zoomed')
        self.root.resizable(True, True)
        
        # Ocultar login
        self.login_frame.pack_forget()
        
        # Crear menú principal
        self.create_main_menu()
        
        # Crear dashboard principal
        self.create_dashboard()
    
    def create_main_menu(self):
        """Crear menú principal"""
        self.menu_frame = create_styled_frame(self.root, bg=COLORS['primary'], height=70)
        self.menu_frame.pack(fill='x')
        self.menu_frame.pack_propagate(False)
        
        # Logo y título del sistema
        logo_title_frame = tk.Frame(self.menu_frame, bg=COLORS['primary'])
        logo_title_frame.pack(side='left', padx=20, pady=15)
        
        # Logo de la empresa (icono de resorte/suspensión)
        logo_label = tk.Label(
            logo_title_frame,
            text="🚗",
            font=('Segoe UI', 20),
            bg=COLORS['primary'],
            fg='white'
        )
        logo_label.pack(side='left', padx=(0, 10))
        
        # Título del sistema
        title_label = create_styled_label(
            logo_title_frame, 
            text=f"Resortes Puerto Montt - Admin ({self.current_role.title()})", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(side='left')
        
        # Botón de logout
        logout_button = create_styled_button(
            self.menu_frame, 
            text="🚪 Cerrar Sesión", 
            command=self.logout,
            button_type='danger',
            width=15
        )
        logout_button.pack(side='right', padx=20, pady=15)
    
    def create_dashboard(self):
        """Crear dashboard principal con tarjetas de módulos"""
        # Frame principal del dashboard
        self.dashboard_frame = create_styled_frame(self.root, bg=COLORS['bg_primary'])
        self.dashboard_frame.pack(expand=True, fill='both', padx=30, pady=30)
        
        # Frame para las tarjetas (sin títulos)
        cards_frame = create_styled_frame(self.dashboard_frame, bg=COLORS['bg_primary'])
        cards_frame.pack(expand=True, fill='both')
        
        # Crear tarjetas para cada módulo
        self.create_module_cards(cards_frame)
        
        # Frame para estadísticas rápidas
        stats_frame = create_styled_frame(self.dashboard_frame, bg=COLORS['bg_primary'])
        stats_frame.pack(fill='x', pady=(40, 0))
        
        # Mostrar estadísticas rápidas
        self.show_quick_stats(stats_frame)
    
    def create_module_cards(self, parent_frame):
        """Crear tarjetas modernas para cada módulo del sistema"""
        # Definir módulos con información detallada - Solo 5 tarjetas principales
        modules = [
            {
                'title': 'Clientes',
                'icon': '👥',
                'description': 'Administra toda la información de tus clientes y su historial completo',
                'features': [
                    'Registrar nuevos clientes con datos completos',
                    'Editar información personal y de contacto', 
                    'Gestionar múltiples vehículos por cliente',
                    'Consultar historial de servicios realizados',
                    'Generar reportes de clientes frecuentes'
                ],
                'color': COLORS['primary'],
                'gradient': ['#FF2511', '#E6200F'],
                'command': self.open_clients_module
            },
            {
                'title': 'Trabajadores',
                'icon': '👷',
                'description': 'Controla el personal del taller y sus especialidades técnicas',
                'features': [
                    'Registrar trabajadores con especialidades',
                    'Asignar roles y permisos específicos',
                    'Controlar horarios y disponibilidad',
                    'Gestionar salarios y comisiones',
                    'Evaluar rendimiento por trabajador'
                ],
                'color': COLORS['secondary'],
                'gradient': ['#34495E', '#5D6D7E'],
                'command': self.open_workers_module
            },
            {
                'title': 'Cotizaciones y Ventas',
                'icon': '📋',
                'description': 'Crea presupuestos profesionales y gestiona el proceso de ventas',
                'features': [
                    'Generar cotizaciones con precios ocultos',
                    'Convertir cotizaciones en órdenes de trabajo',
                    'Imprimir documentos profesionales en PDF',
                    'Controlar márgenes de ganancia',
                    'Seguimiento de ventas y conversiones'
                ],
                'color': COLORS['primary'],
                'gradient': ['#FF2511', '#E6200F'],
                'command': self.open_quotes_module
            },
            {
                'title': 'Taller',
                'icon': '🏭',
                'description': 'Organiza el trabajo diario del taller y genera reportes completos',
                'features': [
                    'Crear y gestionar órdenes de trabajo',
                    'Asignar trabajadores a servicios específicos',
                    'Controlar tiempos y estados de reparación',
                    'Generar reportes de productividad',
                    'Estadísticas de servicios más demandados'
                ],
                'color': COLORS['secondary'],
                'gradient': ['#070607', '#050405'],
                'command': self.open_workshop_module
            },
            {
                'title': 'Inventario',
                'icon': '📦',
                'description': 'Administra repuestos, materiales y optimiza el control de stock',
                'features': [
                    'Control de stock en tiempo real',
                    'Gestión de proveedores y compras',
                    'Manejo inteligente de sobrantes',
                    'Análisis de productos más vendidos',
                    'Alertas automáticas de stock mínimo',
                    'Importación masiva desde Excel'
                ],
                'color': COLORS['secondary'],
                'gradient': ['#070607', '#050405'],
                'command': self.open_inventory_module
            }
        ]
        
        # Crear contenedor principal con padding
        main_container = create_styled_frame(parent_frame, bg=COLORS['bg_primary'])
        main_container.pack(fill='both', expand=True, padx=20, pady=10)
        
        # Crear grid flexible con más espacio
        for i in range(3):
            main_container.columnconfigure(i, weight=1, minsize=350)
        for i in range(2):
            main_container.rowconfigure(i, weight=1, minsize=280)
        
        # Crear tarjetas con distribución mejorada
        for i, module in enumerate(modules):
            if i < 3:  # Primera fila: 3 tarjetas
                row = 0
                col = i
            else:  # Segunda fila: 2 tarjetas centradas
                row = 1
                if i == 3:
                    col = 0
                    main_container.grid_columnconfigure(0, weight=1)
                else:
                    col = 2
                    main_container.grid_columnconfigure(2, weight=1)
            
            card = self.create_modern_card(main_container, module)
            card.grid(row=row, column=col, padx=20, pady=15, sticky='nsew')
    
    def create_modern_card(self, parent_frame, module_info):
        """Crear una tarjeta moderna con bordes redondeados reales y sombra sutil"""
        # Contenedor principal con sombra
        card_container = tk.Frame(
            parent_frame, 
            bg=COLORS['bg_primary'],
            cursor='hand2'
        )
        
        # Sombra sutil
        shadow_frame = tk.Frame(
            card_container,
            bg='#D0D0D0',
            cursor='hand2'
        )
        shadow_frame.pack(fill='both', expand=True, padx=4, pady=4)
        
        # Frame principal de la tarjeta
        card_frame = tk.Frame(
            shadow_frame,
            bg=COLORS['white'],
            relief='solid',
            bd=1,
            highlightbackground='#E0E0E0',
            highlightthickness=1,
            cursor='hand2'
        )
        card_frame.pack(fill='both', expand=True, padx=2, pady=2)
        
        # Header con color institucional
        header_frame = tk.Frame(
            card_frame,
            bg=module_info['color'],
            height=70,
            cursor='hand2'
        )
        header_frame.pack(fill='x')
        header_frame.pack_propagate(False)
        
        # Contenido del header
        header_content = tk.Frame(header_frame, bg=module_info['color'], cursor='hand2')
        header_content.pack(expand=True, fill='both', padx=20, pady=15)
        
        # Icono
        icon_label = tk.Label(
            header_content,
            text=module_info['icon'],
            font=('Segoe UI', 24),
            fg=COLORS['text_light'],
            bg=module_info['color'],
            cursor='hand2'
        )
        icon_label.pack(side='left', padx=(0, 12))
        
        # Título
        title_label = tk.Label(
            header_content,
            text=module_info['title'],
            font=('Segoe UI', 15, 'bold'),
            fg=COLORS['text_light'],
            bg=module_info['color'],
            cursor='hand2'
        )
        title_label.pack(side='left', anchor='w')
        
        # Contenido principal
        content_frame = tk.Frame(card_frame, bg=COLORS['white'], cursor='hand2')
        content_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Descripción
        desc_label = tk.Label(
            content_frame,
            text=module_info['description'],
            font=('Segoe UI', 11),
            fg='#4A5568',
            bg=COLORS['white'],
            wraplength=300,
            justify='left',
            cursor='hand2'
        )
        desc_label.pack(anchor='w', pady=(0, 15))
        
        # Características
        features_to_show = module_info['features'][:4]
        for feature in features_to_show:
            feature_frame = tk.Frame(content_frame, bg=COLORS['white'], cursor='hand2')
            feature_frame.pack(fill='x', pady=3)
            
            # Bullet point
            bullet = tk.Label(
                feature_frame,
                text='▸',
                font=('Segoe UI', 12),
                fg=module_info['color'],
                bg=COLORS['white'],
                cursor='hand2'
            )
            bullet.pack(side='left', padx=(0, 8))
            
            # Texto de característica
            feature_label = tk.Label(
                feature_frame,
                text=feature,
                font=('Segoe UI', 10),
                fg='#718096',
                bg=COLORS['white'],
                wraplength=280,
                justify='left',
                cursor='hand2'
            )
            feature_label.pack(side='left', anchor='w')
        
        # Más características
        if len(module_info['features']) > 4:
            more_frame = tk.Frame(content_frame, bg=COLORS['white'], cursor='hand2')
            more_frame.pack(fill='x', pady=(8, 0))
            
            more_label = tk.Label(
                more_frame,
                text=f"+ {len(module_info['features']) - 4} funciones adicionales",
                font=('Segoe UI', 9, 'italic'),
                fg=module_info['color'],
                bg=COLORS['white'],
                cursor='hand2'
            )
            more_label.pack(anchor='w')
        
        # Efectos hover simples y efectivos
        def on_enter(e):
            shadow_frame.configure(bg='#B8B8B8')
            card_frame.configure(highlightbackground=module_info['color'], highlightthickness=2)
        
        def on_leave(e):
            shadow_frame.configure(bg='#D0D0D0')
            card_frame.configure(highlightbackground='#E0E0E0', highlightthickness=1)
        
        def on_click(e):
            module_info['command']()
        
        # Bind events a todos los widgets
        all_widgets = [card_container, shadow_frame, card_frame, header_frame, 
                      header_content, icon_label, title_label, content_frame, desc_label]
        
        for widget in all_widgets:
            widget.bind('<Enter>', on_enter)
            widget.bind('<Leave>', on_leave)
            widget.bind('<Button-1>', on_click)
        
        return card_container
        
    def show_quick_stats(self, parent_frame):
        """Mostrar estadísticas rápidas del sistema"""
        # Título de estadísticas
        stats_title = create_styled_label(
            parent_frame,
            text="📈 ESTADÍSTICAS RÁPIDAS",
            font=FONTS['heading'],
            fg=COLORS['primary'],
            bg=COLORS['bg_primary']
        )
        stats_title.pack(pady=(0, 20))
        
        # Frame para las estadísticas
        stats_grid = create_styled_frame(parent_frame, bg=COLORS['bg_primary'])
        stats_grid.pack(fill='x')
        
        # Configurar grid
        for i in range(4):
            stats_grid.columnconfigure(i, weight=1)
        
        # Obtener estadísticas de la base de datos
        try:
            total_products = len(self.db.fetch_all("SELECT * FROM products"))
            total_clients = len(self.db.fetch_all("SELECT * FROM clients"))
            total_suppliers = len(self.db.fetch_all("SELECT * FROM suppliers"))
            total_orders = len(self.db.fetch_all("SELECT * FROM work_orders"))
        except:
            total_products = total_clients = total_suppliers = total_orders = 0
        
        # Crear widgets de estadísticas
        stats_data = [
            ('📦 Productos', total_products, COLORS['success']),
            ('👥 Clientes', total_clients, COLORS['primary']),
            ('🏢 Proveedores', total_suppliers, COLORS['info']),
            ('🔧 Órdenes', total_orders, COLORS['warning'])
        ]
        
        for i, (label, value, color) in enumerate(stats_data):
            stat_frame = tk.Frame(stats_grid, bg='white', relief='raised', bd=1)
            stat_frame.grid(row=0, column=i, padx=10, pady=10, sticky='nsew')
            
            # Valor
            value_label = tk.Label(
                stat_frame,
                text=str(value),
                font=FONTS['title'],
                fg=color,
                bg='white'
            )
            value_label.pack(pady=(15, 5))
            
            # Etiqueta
            label_widget = tk.Label(
                stat_frame,
                text=label,
                font=FONTS['body'],
                fg=COLORS['text_secondary'],
                bg='white'
            )
            label_widget.pack(pady=(0, 15))
    
    def open_clients_module(self):
        """Abrir módulo de clientes y ventas"""
        self.show_module_interface("👥 Clientes y Ventas", ClientsModule)
    
    def open_workers_module(self):
        """Abrir módulo de trabajadores"""
        self.show_module_interface("👷 Trabajadores", WorkersModule)
    
    def open_quotes_module(self):
        """Abrir módulo de cotizaciones con precios ocultos"""
        self.show_module_interface("📋 Cotizaciones", EnhancedQuotesModule)
    
    def open_workshop_module(self):
        """Abrir módulo de taller"""
        self.show_module_interface("🏭 Taller", WorkshopModule)
    
    def open_inventory_module(self):
        """Abrir módulo de inventario"""
        self.show_module_interface("📦 Inventario", InventoryModule)
    
    def open_suppliers_module(self):
        """Abrir módulo de proveedores"""
        self.show_module_interface("🏢 Proveedores", SuppliersModule)
    
    def open_reports_module(self):
        """Abrir módulo de reportes"""
        self.show_module_interface("📊 Reportes", ReportsModule)
    
    def open_auth_module(self):
        """Abrir módulo de autenticación"""
        self.show_module_interface("👤 Usuarios", AuthModule)
    
    def open_remainders_module(self):
        """Abrir módulo de sobrantes"""
        self.show_module_interface("📦 Sobrantes", RemaindersModule)
    
    def open_analytics_module(self):
        """Abrir módulo de análisis"""
        self.show_module_interface("⭐ Análisis", AnalyticsModule)
    
    def show_module_interface(self, module_title, module_class):
        """Mostrar interfaz de un módulo específico (optimizado con caché)"""
        # Ocultar dashboard
        self.dashboard_frame.pack_forget()
        
        # Crear frame del módulo
        self.current_module_frame = create_styled_frame(self.root, bg=COLORS['bg_primary'])
        self.current_module_frame.pack(expand=True, fill='both', padx=15, pady=15)
        
        # Header del módulo
        header_frame = create_styled_frame(self.current_module_frame, bg=COLORS['primary'])
        header_frame.pack(fill='x', pady=(0, 20))
        
        # Título del módulo
        module_title_label = create_styled_label(
            header_frame,
            text=module_title,
            font=FONTS['title'],
            bg=COLORS['primary'],
            fg='white'
        )
        module_title_label.pack(side='left', padx=20, pady=15)
        
        # Botón para volver al dashboard (más pequeño y mejor posicionado)
        back_button = create_styled_button(
            header_frame,
            text="🏠 Volver",
            command=self.back_to_dashboard,
            button_type='secondary',
            width=12,
            height=2
        )
        back_button.pack(side='right', padx=20, pady=10)
        
        # Mostrar loading inicial
        loading_frame = create_styled_frame(self.current_module_frame, bg=COLORS['white'])
        loading_frame.pack(fill='both', expand=True)
        
        loading_label = create_styled_label(
            loading_frame,
            text="⏳ Cargando módulo...",
            font=FONTS['heading'],
            fg=COLORS['text_secondary'],
            bg=COLORS['white']
        )
        loading_label.pack(expand=True)
        
        # Actualizar la interfaz inmediatamente
        self.root.update()
        
        # Crear instancia del módulo de forma asíncrona
        self.create_module_async(module_class, loading_frame)
    
    def create_module_async(self, module_class, loading_frame):
        """Crear módulo de forma asíncrona para evitar bloqueo"""
        try:
            # Crear instancia del módulo
            self.current_module = module_class(self.current_module_frame, self.db, self.current_role)
            
            # Ocultar loading y mostrar módulo
            loading_frame.destroy()
            self.current_module.frame.pack(fill='both', expand=True)
            
        except Exception as e:
            # En caso de error, mostrar mensaje
            loading_frame.destroy()
            error_frame = create_styled_frame(self.current_module_frame, bg=COLORS['white'])
            error_frame.pack(fill='both', expand=True)
            
            error_label = create_styled_label(
                error_frame,
                text=f"❌ Error al cargar módulo: {str(e)}",
                font=FONTS['heading'],
                fg=COLORS['danger'],
                bg=COLORS['white']
            )
            error_label.pack(expand=True)
    
    def back_to_dashboard(self):
        """Volver al dashboard principal"""
        # Destruir módulo actual
        if hasattr(self, 'current_module_frame'):
            self.current_module_frame.destroy()
        
        # Mostrar dashboard
        self.dashboard_frame.pack(expand=True, fill='both', padx=20, pady=20)
    
    def logout(self):
        """Cerrar sesión"""
        self.current_user = None
        self.current_role = None
        
        # Destruir widgets de la interfaz principal
        if hasattr(self, 'menu_frame'):
            self.menu_frame.destroy()
        if hasattr(self, 'dashboard_frame'):
            self.dashboard_frame.destroy()
        if hasattr(self, 'current_module_frame'):
            self.current_module_frame.destroy()
        
        # Volver a la ventana compacta del login
        self.root.geometry("500x600")
        self.root.resizable(False, False)
        
        # Centrar la ventana del login
        self.root.update_idletasks()
        width = 500
        height = 600
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        
        # Mostrar login
        self.create_login_screen()

def main():
    root = tk.Tk()
    app = TallerMecanicoApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()