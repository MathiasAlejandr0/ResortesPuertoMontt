import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

class ClientsModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.data_loaded = False
        self.create_widgets()
        # Cargar datos después de crear la interfaz
        self.parent.after(100, self.load_clients_async)
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal simple
        main_frame = tk.Frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Header
        header_frame = tk.Frame(main_frame, bg=COLORS['primary'])
        header_frame.pack(fill='x', pady=(0, 20))
        
        # Título
        title_label = tk.Label(
            header_frame, 
            text="👥 GESTIÓN DE CLIENTES", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(pady=(15, 5))
        
        # Subtítulo
        subtitle_label = tk.Label(
            header_frame,
            text="Administra la información de tus clientes y sus vehículos",
            font=FONTS['body'],
            bg=COLORS['primary'],
            fg='white',
            wraplength=800,
            justify='center'
        )
        subtitle_label.pack(pady=(0, 15))
        
        # Botones de acción
        button_frame = tk.Frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botones individuales
        new_btn = create_styled_button(button_frame, text="+ Nuevo Cliente", command=self.show_client_form, button_type='success', width=15)
        new_btn.pack(side='left', padx=20, pady=15)
        
        edit_btn = create_styled_button(button_frame, text="Editar", command=self.edit_selected_client, button_type='danger', width=10)
        edit_btn.pack(side='left', padx=(0, 10), pady=15)
        
        delete_btn = create_styled_button(button_frame, text="Eliminar", command=self.delete_selected_client, button_type='danger', width=10)
        delete_btn.pack(side='left', padx=(0, 10), pady=15)
        
        view_btn = create_styled_button(button_frame, text="Ver Detalles", command=self.view_client_details, button_type='info', width=12)
        view_btn.pack(side='left', padx=(0, 10), pady=15)
        
        quote_btn = create_styled_button(button_frame, text="Nueva Cotización", command=self.show_quote_form, button_type='warning', width=15)
        quote_btn.pack(side='left', padx=(0, 20), pady=15)
        
        # Barra de búsqueda
        search_frame = tk.Frame(main_frame, bg=COLORS['white'])
        search_frame.pack(fill='x', padx=20, pady=(0, 15))
        
        search_label = tk.Label(search_frame, text="Buscar:", font=FONTS['body'], bg=COLORS['white'], fg=COLORS['text_primary'])
        search_label.pack(side='left', padx=(0, 10), pady=10)
        
        self.client_search_entry = tk.Entry(search_frame, font=FONTS['body'], width=50)
        self.client_search_entry.pack(side='left', fill='x', expand=True, padx=(0, 10), pady=10)
        self.client_search_entry.bind('<KeyRelease>', self.search_clients)
        
        clear_btn = create_styled_button(search_frame, text="🗑️", command=self.clear_search, button_type='secondary', width=3)
        clear_btn.pack(side='right', pady=10)
        
        # Tabla de clientes
        table_frame = tk.Frame(main_frame, bg=COLORS['white'])
        table_frame.pack(fill='both', expand=True, pady=(0, 15))
        
        # Treeview
        columns = ('ID', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Patente', 'Dirección')
        self.clients_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=12)
        
        # Configurar columnas
        for col in columns:
            self.clients_tree.heading(col, text=col)
            self.clients_tree.column(col, width=120, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.clients_tree.yview)
        self.clients_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack
        self.clients_tree.pack(side="left", fill="both", expand=True, padx=20, pady=15)
        scrollbar.pack(side="right", fill="y")
        
        # Bind doble clic para editar
        self.clients_tree.bind('<Double-1>', self.edit_selected_client)
    
        # Barra de estadísticas
        self.stats_frame = tk.Frame(main_frame, bg=COLORS['light_gray'])
        self.stats_frame.pack(fill='x', pady=(0, 10))
        
        # Mostrar estadísticas
        self.show_client_stats()
    
    def clear_search_placeholder(self, event):
        """Limpiar placeholder al hacer focus en el campo de búsqueda"""
        if self.client_search_entry.get() == "Buscar clientes...":
            self.client_search_entry.delete(0, tk.END)
            self.client_search_entry.configure(fg=COLORS['text_primary'])
    
    def restore_search_placeholder(self, event):
        """Restaurar placeholder si el campo está vacío"""
        if not self.client_search_entry.get():
            self.client_search_entry.insert(0, "Buscar clientes...")
            self.client_search_entry.configure(fg=COLORS['text_secondary'])
    
    def clear_search(self):
        """Limpiar campo de búsqueda"""
        self.client_search_entry.delete(0, tk.END)
        self.client_search_entry.insert(0, "Buscar clientes...")
        self.client_search_entry.configure(fg=COLORS['text_secondary'])
        self.load_clients()
    
    def show_client_stats(self):
        """Mostrar estadísticas de clientes"""
        try:
            # Limpiar frame de estadísticas
            for widget in self.stats_frame.winfo_children():
                widget.destroy()
            
            # Obtener clientes de forma segura
            try:
                clients = self.db.fetch_all("SELECT * FROM clients")
                total_clients = len(clients) if clients else 0
            except Exception as db_error:
                print(f"Error al obtener clientes: {db_error}")
                total_clients = 0
                clients = []
            
            # Calcular clientes nuevos de forma segura
            new_clients = 0
            if clients:
                try:
                    from datetime import datetime, timedelta
                    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
                    new_clients = len([c for c in clients if c.get('created_at') and c['created_at'] >= thirty_days_ago])
                except Exception as date_error:
                    print(f"Error al calcular fechas: {date_error}")
                    new_clients = 0
            
            # Preparar datos de estadísticas
            if total_clients > 0:
                stats_data = [
                    ("📊", "Total Clientes", total_clients),
                    ("🆕", "Nuevos (30d)", new_clients),
                    ("✅", "Estado", "Activo")
                ]
            else:
                stats_data = [
                    ("📊", "Total Clientes", 0),
                    ("ℹ️", "Estado", "Sin datos"),
                    ("➕", "Acción", "Agregar clientes")
                ]
            
            # Crear frame para las estadísticas
            stats_container = tk.Frame(self.stats_frame, bg=COLORS['light_gray'])
            stats_container.pack(fill='x', padx=20, pady=10)
            
            for i, (icon, label, value) in enumerate(stats_data):
                stat_frame = tk.Frame(stats_container, bg=COLORS['light_gray'])
                stat_frame.pack(side='left', padx=20, pady=5)
                
                # Icono
                icon_label = tk.Label(
                    stat_frame,
                    text=icon,
                    font=('Segoe UI', 12),
                    bg=COLORS['light_gray'],
                    fg=COLORS['text_secondary']
                )
                icon_label.pack(side='left', padx=(0, 5))
                
                # Texto
                text_label = tk.Label(
                    stat_frame,
                    text=f"{label}: {value}",
                    font=FONTS['body'],
                    bg=COLORS['light_gray'],
                    fg=COLORS['text_primary']
                )
                text_label.pack(side='left')
            
        except Exception as e:
            # Mostrar mensaje de error más detallado
            print(f"Error en show_client_stats: {e}")
            error_label = tk.Label(
                self.stats_frame,
                text=f"Error al cargar estadísticas: {str(e)}",
                font=FONTS['body'],
                fg=COLORS['text_secondary'],
                bg=COLORS['light_gray']
            )
            error_label.pack(pady=10)
    
    def load_clients_async(self):
        """Cargar clientes de forma optimizada"""
        try:
            # Obtener clientes
            clients = self.db.fetch_all("SELECT * FROM clients ORDER BY name")
            
            # Si no hay clientes, crear datos de muestra
            if not clients:
                self.create_sample_clients()
                clients = self.db.fetch_all("SELECT * FROM clients ORDER BY name")
            
            # Limpiar treeview
            for item in self.clients_tree.get_children():
                self.clients_tree.delete(item)
            
            # Insertar datos directamente
            for client in clients:
                self.clients_tree.insert('', 'end', values=(
                    client['id'],
                    client['name'] or '',
                    client['rut'] or '',
                    client['phone'] or '',
                    client['email'] or '',
                    client['license_plate'] or '',
                    client['address'] or ''
                ))
            
            self.data_loaded = True
            self.show_client_stats()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar clientes: {str(e)}")
    
    def create_sample_clients(self):
        """Crear clientes de muestra si no existen"""
        try:
            sample_clients = [
                {
                    'name': 'Juan Pérez',
                    'rut': '12.345.678-9',
                    'phone': '+56 9 1234 5678',
                    'email': 'juan.perez@email.com',
                    'license_plate': 'ABC123',
                    'address': 'Av. Principal 123, Puerto Montt'
                },
                {
                    'name': 'María González',
                    'rut': '98.765.432-1',
                    'phone': '+56 9 8765 4321',
                    'email': 'maria.gonzalez@email.com',
                    'license_plate': 'XYZ789',
                    'address': 'Calle Secundaria 456, Puerto Montt'
                },
                {
                    'name': 'Carlos Rodríguez',
                    'rut': '11.222.333-4',
                    'phone': '+56 9 1122 3344',
                    'email': 'carlos.rodriguez@email.com',
                    'license_plate': 'DEF456',
                    'address': 'Pasaje Norte 789, Puerto Montt'
                },
                {
                    'name': 'Ana Silva',
                    'rut': '55.666.777-8',
                    'phone': '+56 9 5566 7788',
                    'email': 'ana.silva@email.com',
                    'license_plate': 'GHI789',
                    'address': 'Plaza Central 321, Puerto Montt'
                },
                {
                    'name': 'Roberto Torres',
                    'rut': '99.888.777-6',
                    'phone': '+56 9 9988 7766',
                    'email': 'roberto.torres@email.com',
                    'license_plate': 'JKL012',
                    'address': 'Avenida Sur 654, Puerto Montt'
                }
            ]
            
            for client_data in sample_clients:
                self.db.execute("""
                    INSERT INTO clients (name, rut, phone, email, license_plate, address, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    client_data['name'],
                    client_data['rut'],
                    client_data['phone'],
                    client_data['email'],
                    client_data['license_plate'],
                    client_data['address'],
                    datetime.now().isoformat()
                ))
            
            print("Clientes de muestra creados exitosamente")
            
        except Exception as e:
            print(f"Error creando clientes de muestra: {e}")
    
    def load_clients(self):
        """Cargar clientes en el treeview (método síncrono para compatibilidad)"""
        if not self.data_loaded:
            self.load_clients_async()
        else:
            # Si ya están cargados, solo refrescar
            self.load_clients_async()
    
    
    def search_clients(self, event=None):
        """Buscar clientes"""
        search_term = self.client_search_entry.get().lower()
        
        # Ignorar si es el placeholder
        if search_term == "buscar clientes...":
            return
        
        for item in self.clients_tree.get_children():
            self.clients_tree.delete(item)
        
        if not search_term:
            self.load_clients()
            return
        
        try:
            # Buscar clientes
            clients = self.db.fetch_all("""
                SELECT * FROM clients 
                WHERE LOWER(name) LIKE ? OR LOWER(rut) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(license_plate) LIKE ?
                ORDER BY name
            """, (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
            
            for client in clients:
                self.clients_tree.insert('', 'end', values=(
                    client['id'],
                    client['name'] or '',
                    client['rut'] or '',
                    client['phone'] or '',
                    client['email'] or '',
                    client['license_plate'] or '',
                    client['address'] or ''
                ))
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar clientes: {str(e)}")
    
    def show_client_form(self):
        """Mostrar formulario para agregar cliente"""
        self.client_form_window = tk.Toplevel(self.parent)
        self.client_form_window.title("Nuevo Cliente")
        self.client_form_window.geometry("600x700")
        self.client_form_window.resizable(False, False)
        self.client_form_window.configure(bg=COLORS['bg_primary'])
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.client_form_window, bg=COLORS['bg_primary'])
        form_frame.pack(fill='both', expand=True, padx=30, pady=30)
        
        # Header del formulario
        form_header = create_modern_header(
            form_frame,
            "📝 NUEVO CLIENTE",
            "Complete la información del cliente"
        )
        form_header.pack(fill='x', pady=(0, 20))
        
        # Tarjeta del formulario
        form_card_container, form_card = create_card_frame(form_frame, "Información del Cliente")
        form_card_container.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Nombre *', 'name'),
            ('RUT', 'rut'),
            ('Teléfono', 'phone'),
            ('Email', 'email'),
            ('Patente del Vehículo', 'license_plate'),
            ('Dirección', 'address')
        ]
        
        self.form_entries = {}
        
        for label_text, field_name in fields:
            # Frame para cada campo
            field_frame = create_styled_frame(form_card, bg=COLORS['white'])
            field_frame.pack(fill='x', padx=20, pady=10)
            
            # Label
            label = create_styled_label(
                field_frame,
                text=label_text,
                font=FONTS['body_bold'],
                bg=COLORS['white']
            )
            label.pack(anchor='w', pady=(0, 5))
            
            # Entry
            entry = create_styled_entry(field_frame, width=50)
            entry.pack(fill='x')
            self.form_entries[field_name] = entry
        
        # Botones del formulario
        button_frame = create_styled_frame(form_card, bg=COLORS['white'])
        button_frame.pack(fill='x', padx=20, pady=20)
        
        save_btn = create_styled_button(
            button_frame, 
            text="💾 Guardar Cliente",
            command=self.save_client,
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="❌ Cancelar", 
            command=self.client_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def save_client(self):
        """Guardar cliente en la base de datos"""
        try:
            # Validar campos obligatorios
            name = self.form_entries['name'].get().strip()
            if not name:
                messagebox.showerror("Error", "El nombre es obligatorio")
                return
            
            # Obtener datos del formulario
            rut = self.form_entries['rut'].get().strip()
            phone = self.form_entries['phone'].get().strip()
            email = self.form_entries['email'].get().strip()
            license_plate = self.form_entries['license_plate'].get().strip()
            address = self.form_entries['address'].get().strip()
            
            # Insertar cliente en la base de datos
            self.db.execute("""
                INSERT INTO clients (name, rut, phone, email, license_plate, address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, rut, phone, email, license_plate, address, datetime.now().isoformat()))
            
            messagebox.showinfo("Éxito", "Cliente agregado correctamente")
            self.client_form_window.destroy()
            self.load_clients()
            self.show_client_stats()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar cliente: {str(e)}")
    
    def edit_selected_client(self, event=None):
        """Editar cliente seleccionado"""
        selection = self.clients_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un cliente")
            return
            
        client_id = self.clients_tree.item(selection[0])['values'][0]
        
        # Obtener datos del cliente
        client = self.db.fetch_one("SELECT * FROM clients WHERE id = ?", (client_id,))
        if not client:
            messagebox.showerror("Error", "Cliente no encontrado")
            return
            
        # Mostrar formulario de edición
        self.edit_client_form(client)
    
    def edit_client_form(self, client):
        """Mostrar formulario para editar cliente"""
        self.edit_form_window = tk.Toplevel(self.parent)
        self.edit_form_window.title("Editar Cliente")
        self.edit_form_window.geometry("600x700")
        self.edit_form_window.resizable(False, False)
        self.edit_form_window.configure(bg=COLORS['bg_primary'])
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.edit_form_window, bg=COLORS['bg_primary'])
        form_frame.pack(fill='both', expand=True, padx=30, pady=30)
        
        # Header del formulario
        form_header = create_modern_header(
            form_frame,
            "✏️ EDITAR CLIENTE",
            f"Editando información de {client['name']}"
        )
        form_header.pack(fill='x', pady=(0, 20))
        
        # Tarjeta del formulario
        form_card_container, form_card = create_card_frame(form_frame, "Información del Cliente")
        form_card_container.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Nombre *', 'name'),
            ('RUT', 'rut'),
            ('Teléfono', 'phone'),
            ('Email', 'email'),
            ('Patente del Vehículo', 'license_plate'),
            ('Dirección', 'address')
        ]
        
        self.edit_entries = {}
        
        for label_text, field_name in fields:
            # Frame para cada campo
            field_frame = create_styled_frame(form_card, bg=COLORS['white'])
            field_frame.pack(fill='x', padx=20, pady=10)
            
            # Label
            label = create_styled_label(
                field_frame,
                text=label_text,
                font=FONTS['body_bold'],
                bg=COLORS['white']
            )
            label.pack(anchor='w', pady=(0, 5))
            
            # Entry con valor actual
            entry = create_styled_entry(field_frame, width=50)
            entry.insert(0, client[field_name] or '')
            entry.pack(fill='x')
            self.edit_entries[field_name] = entry
        
        # Botones del formulario
        button_frame = create_styled_frame(form_card, bg=COLORS['white'])
        button_frame.pack(fill='x', padx=20, pady=20)
        
        save_btn = create_styled_button(
            button_frame, 
            text="💾 Actualizar Cliente",
            command=lambda: self.update_client(client['id']),
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="❌ Cancelar",
            command=self.edit_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def update_client(self, client_id):
        """Actualizar cliente en la base de datos"""
        try:
            # Validar campos obligatorios
            name = self.edit_entries['name'].get().strip()
            if not name:
                messagebox.showerror("Error", "El nombre es obligatorio")
                return
            
            # Obtener datos del formulario
            rut = self.edit_entries['rut'].get().strip()
            phone = self.edit_entries['phone'].get().strip()
            email = self.edit_entries['email'].get().strip()
            license_plate = self.edit_entries['license_plate'].get().strip()
            address = self.edit_entries['address'].get().strip()
            
            # Actualizar cliente en la base de datos
            self.db.execute("""
                UPDATE clients 
                SET name = ?, rut = ?, phone = ?, email = ?, license_plate = ?, address = ?
                WHERE id = ?
            """, (name, rut, phone, email, license_plate, address, client_id))
            
            messagebox.showinfo("Éxito", "Cliente actualizado correctamente")
            self.edit_form_window.destroy()
            self.load_clients()
            self.show_client_stats()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al actualizar cliente: {str(e)}")
    
    def delete_selected_client(self):
        """Eliminar cliente seleccionado"""
        selection = self.clients_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un cliente")
            return
        
        client_id = self.clients_tree.item(selection[0])['values'][0]
        client_name = self.clients_tree.item(selection[0])['values'][1]
        
        # Confirmar eliminación
        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar al cliente {client_name}?"):
            try:
                # Eliminar cliente de la base de datos
                self.db.execute("DELETE FROM clients WHERE id = ?", (client_id,))
                
                messagebox.showinfo("Éxito", "Cliente eliminado correctamente")
                self.load_clients()
                self.show_client_stats()
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar cliente: {str(e)}")
    
    def view_client_details(self):
        """Ver detalles del cliente seleccionado"""
        selection = self.clients_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un cliente")
            return
        
        client_id = self.clients_tree.item(selection[0])['values'][0]
        client_name = self.clients_tree.item(selection[0])['values'][1]
        
        # Obtener datos del cliente
        client = self.db.fetch_one("SELECT * FROM clients WHERE id = ?", (client_id,))
        if not client:
            messagebox.showerror("Error", "Cliente no encontrado")
            return
        
        # Mostrar ventana de detalles
        details_window = tk.Toplevel(self.parent)
        details_window.title(f"Detalles - {client_name}")
        details_window.geometry("500x600")
        details_window.resizable(False, False)
        details_window.configure(bg=COLORS['bg_primary'])
        
        # Frame principal
        details_frame = create_styled_frame(details_window, bg=COLORS['bg_primary'])
        details_frame.pack(fill='both', expand=True, padx=30, pady=30)
        
        # Header
        header = create_modern_header(
            details_frame,
            f"👤 {client_name.upper()}",
            "Información detallada del cliente"
        )
        header.pack(fill='x', pady=(0, 20))
        
        # Tarjeta de detalles
        details_card_container, details_card = create_card_frame(details_frame, "Información Personal")
        details_card_container.pack(fill='both', expand=True, pady=(0, 20))
        
        # Mostrar información
        info_text = f"""
📋 INFORMACIÓN PERSONAL:
• Nombre: {client['name'] or 'No especificado'}
• RUT: {client['rut'] or 'No especificado'}
• Teléfono: {client['phone'] or 'No especificado'}
• Email: {client['email'] or 'No especificado'}

🚗 INFORMACIÓN DEL VEHÍCULO:
• Patente: {client['license_plate'] or 'No especificado'}

📍 DIRECCIÓN:
• {client['address'] or 'No especificado'}

📅 FECHA DE REGISTRO:
• {client['created_at'] or 'No especificado'}
        """
        
        info_label = create_styled_label(
            details_card,
            text=info_text,
            font=FONTS['body'],
            fg=COLORS['text_primary'],
            bg=COLORS['white'],
            justify='left'
        )
        info_label.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Botón cerrar
        close_btn = create_styled_button(
            details_card,
            text="❌ Cerrar",
            command=details_window.destroy,
            button_type='secondary',
            width=15
        )
        close_btn.pack(pady=(0, 20))
    
    def show_quote_form(self):
        """Mostrar formulario para crear cotización"""
        selection = self.clients_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un cliente para crear la cotización")
            return
        
        client_name = self.clients_tree.item(selection[0])['values'][1]
        messagebox.showinfo("Información", f"Creando cotización para {client_name} - Funcionalidad en desarrollo")