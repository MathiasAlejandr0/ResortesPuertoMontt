import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from modules.styles import (
    create_styled_button, create_styled_frame, create_styled_label, 
    create_styled_entry, create_card_frame, create_modern_header,
    create_action_buttons, create_search_bar, create_stats_bar,
    create_modern_treeview, create_centered_content, COLORS, FONTS
)

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
        # Crear contenido centrado
        main_frame, center_frame = create_centered_content(self.frame, max_width=900, bg_color=COLORS['bg_primary'])
        
        # Header moderno
        header = create_modern_header(
            center_frame, 
            "👥 GESTIÓN DE CLIENTES",
            "Administra la información de tus clientes y sus vehículos"
        )
        header.pack(fill='x', pady=(0, 20))
        
        # Tarjeta principal
        main_card_container, main_card = create_card_frame(center_frame, "Acciones Rápidas")
        main_card_container.pack(fill='x', pady=(0, 20))
        
        # Botones de acción modernos
        buttons_config = [
            ("Nuevo Cliente", self.show_client_form, "success", "➕"),
            ("Editar", self.edit_selected_client, "primary", "✏️"),
            ("Eliminar", self.delete_selected_client, "danger", "🗑️"),
            ("Ver Detalles", self.view_client_details, "info", "👁️"),
            ("Nueva Cotización", self.show_quote_form, "warning", "📋")
        ]
        
        action_buttons = create_action_buttons(main_card, buttons_config)
        action_buttons.pack(fill='x', padx=20, pady=15)
        
        # Barra de búsqueda moderna
        search_frame, self.client_search_entry = create_search_bar(
            main_card, 
            "Buscar clientes...", 
            self.search_clients
        )
        search_frame.pack(fill='x', padx=20, pady=(0, 15))
        
        # Tarjeta para la tabla de clientes
        table_card_container, table_card = create_card_frame(center_frame, "Lista de Clientes")
        table_card_container.pack(fill='both', expand=True, pady=(0, 20))
        
        # Treeview moderno
        columns = ('ID', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Patente', 'Dirección')
        self.tree_frame, self.clients_tree = create_modern_treeview(table_card, columns, height=12)
        self.tree_frame.pack(fill='both', expand=True, padx=20, pady=15)
        
        # Bind doble clic para editar
        self.clients_tree.bind('<Double-1>', self.edit_selected_client)
    
        # Barra de estadísticas
        self.stats_frame = create_styled_frame(center_frame, bg=COLORS['light_gray'])
        self.stats_frame.pack(fill='x', pady=(0, 10))
        
        # Mostrar estadísticas
        self.show_client_stats()
    
    def show_client_stats(self):
        """Mostrar estadísticas de clientes"""
        try:
            clients = self.db.fetch_all("SELECT * FROM clients")
            total_clients = len(clients)
            active_clients = len([c for c in clients if c.get('created_at') and c['created_at'] >= '2024-01-01'])  # Simplificado
            
            if total_clients > 0:
                stats_data = [
                    ("📊", "Total Clientes", total_clients),
                    ("🆕", "Nuevos", active_clients),
                    ("✅", "Estado", "Activo")
                ]
            else:
                stats_data = [
                    ("📊", "Total Clientes", 0),
                    ("ℹ️", "Estado", "Sin datos"),
                    ("➕", "Acción", "Agregar clientes")
                ]
            
            stats_bar = create_stats_bar(self.stats_frame, stats_data)
            stats_bar.pack(fill='x', padx=20, pady=10)
        except Exception as e:
            # Mostrar mensaje de error amigable
            stats_label = create_styled_label(
                self.stats_frame,
                text="👥 Estadísticas no disponibles",
                font=FONTS['body'],
                fg=COLORS['text_secondary'],
                bg=COLORS['white']
            )
            stats_label.pack(pady=10)
    
    def load_clients_async(self):
        """Cargar clientes de forma optimizada"""
        try:
            # Obtener clientes
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