import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from .styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

class SuppliersModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_suppliers()
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="🏭 GESTIÓN DE PROVEEDORES",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para agregar proveedor
        add_supplier_btn = create_styled_button(
            button_frame, 
            text="➕ Nuevo Proveedor",
            command=self.show_supplier_form,
            button_type='success',
            width=15
        )
        add_supplier_btn.pack(side='left', padx=(0, 10))
        
        # Botón para editar proveedor
        edit_supplier_btn = create_styled_button(
            button_frame, 
            text="✏️ Editar",
            command=self.edit_selected_supplier,
            button_type='primary',
            width=12
        )
        edit_supplier_btn.pack(side='left', padx=(0, 10))
        
        # Botón para eliminar proveedor
        delete_supplier_btn = create_styled_button(
            button_frame, 
            text="🗑️ Eliminar",
            command=self.delete_selected_supplier,
            button_type='danger',
            width=12
        )
        delete_supplier_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver detalles
        view_supplier_btn = create_styled_button(
            button_frame,
            text="👁️ Ver Detalles",
            command=self.view_supplier_details,
            button_type='info',
            width=12
        )
        view_supplier_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver productos
        products_btn = create_styled_button(
            button_frame,
            text="📦 Productos",
            command=self.view_supplier_products,
            button_type='warning',
            width=12
        )
        products_btn.pack(side='left', padx=(0, 10))
        
        # Botón para generar reporte
        report_btn = create_styled_button(
            button_frame,
            text="📊 Reporte",
            command=self.generate_supplier_report,
            button_type='secondary',
            width=12
        )
        report_btn.pack(side='left', padx=(0, 10))
        
        # Frame para búsqueda
        search_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        search_frame.pack(fill='x', pady=(0, 15))
        
        # Campo de búsqueda
        search_label = create_styled_label(
            search_frame,
            text="🔍 Buscar:",
            font=FONTS['body'],
            bg=COLORS['white']
        )
        search_label.pack(side='left', padx=(0, 10))
        
        self.supplier_search_entry = create_styled_entry(
            search_frame,
            width=50
        )
        self.supplier_search_entry.pack(side='left', padx=(0, 10))
        self.supplier_search_entry.bind('<KeyRelease>', self.search_suppliers)
        
        # Botón limpiar búsqueda
        clear_search_btn = create_styled_button(
            search_frame,
            text="🗑️ Limpiar",
            command=self.clear_search,
            button_type='secondary',
            width=10
        )
        clear_search_btn.pack(side='left', padx=(10, 0))
        
        # Treeview para mostrar proveedores
        columns = ('ID', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Dirección', 'Contacto', 'Estado')
        self.suppliers_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=15)
        
        # Configurar columnas
        for col in columns:
            self.suppliers_tree.heading(col, text=col)
            self.suppliers_tree.column(col, width=120, anchor='center')
        
        # Scrollbar para el treeview
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=self.suppliers_tree.yview)
        self.suppliers_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview y scrollbar
        self.suppliers_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble clic para editar
        self.suppliers_tree.bind('<Double-1>', self.edit_selected_supplier)
    
        # Frame para estadísticas
        stats_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        stats_frame.pack(fill='x', pady=(15, 0))
        
        # Mostrar estadísticas
        self.show_supplier_stats(stats_frame)
    
    def show_supplier_stats(self, parent_frame):
        """Mostrar estadísticas de proveedores"""
        try:
            total_suppliers = len(self.db.fetch_all("SELECT * FROM suppliers"))
            active_suppliers = len(self.db.fetch_all("SELECT * FROM suppliers WHERE status = 'Activo'"))
            
            stats_text = f"📊 Total Proveedores: {total_suppliers} | ✅ Activos: {active_suppliers}"
            stats_label = create_styled_label(
                parent_frame,
                text=stats_text,
                font=FONTS['body'],
                fg=COLORS['text_secondary'],
                bg=COLORS['white']
            )
            stats_label.pack(side='left')
        except:
            pass
    
    def load_suppliers(self):
        """Cargar proveedores en el treeview"""
        for item in self.suppliers_tree.get_children():
            self.suppliers_tree.delete(item)
        
        try:
            # Obtener proveedores
            suppliers = self.db.fetch_all("SELECT * FROM suppliers ORDER BY name")
            
            # Si no hay proveedores, crear algunos de ejemplo
            if not suppliers:
                self.create_sample_suppliers()
                suppliers = self.db.fetch_all("SELECT * FROM suppliers ORDER BY name")
            
            for supplier in suppliers:
                # Resaltar proveedores inactivos
                tags = []
                if supplier['status'] == 'Inactivo':
                    tags = ['inactive']
                
                self.suppliers_tree.insert('', 'end', values=(
                    supplier['id'],
                    supplier['name'] or '',
                    supplier['rut'] or '',
                    supplier['phone'] or '',
                    supplier['email'] or '',
                    supplier['address'] or '',
                    supplier['contact_person'] or '',
                    supplier['status'] or 'Activo'
                ), tags=tags)
            
            # Configurar colores para proveedores inactivos
            self.suppliers_tree.tag_configure('inactive', background='#ffebee')
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar proveedores: {str(e)}")
    
    def create_sample_suppliers(self):
        """Crear proveedores de ejemplo"""
        sample_suppliers = [
            ('Repuestos Auto S.A.', '76.123.456-7', '+56 2 2345 6789', 'ventas@repuestosauto.cl', 'Av. Providencia 123, Santiago', 'Juan Pérez', 'Activo'),
            ('Filtros del Sur Ltda.', '76.234.567-8', '+56 2 3456 7890', 'contacto@filtrosdelsur.cl', 'Calle Los Robles 456, Valdivia', 'María González', 'Activo'),
            ('Neumáticos Premium', '76.345.678-9', '+56 2 4567 8901', 'info@neumaticospremium.cl', 'Ruta 5 Sur Km 890, Temuco', 'Carlos Silva', 'Activo'),
            ('Aceites Industriales', '76.456.789-0', '+56 2 5678 9012', 'ventas@aceitesind.cl', 'Zona Industrial 789, Concepción', 'Ana Rodríguez', 'Inactivo')
        ]
        
        for supplier_data in sample_suppliers:
            self.db.execute("""
                INSERT INTO suppliers (name, rut, phone, email, address, contact_person, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (*supplier_data, datetime.now().isoformat()))
    
    def search_suppliers(self, event=None):
        """Buscar proveedores"""
        search_term = self.supplier_search_entry.get().lower()
        
        for item in self.suppliers_tree.get_children():
            self.suppliers_tree.delete(item)
        
        if not search_term:
            self.load_suppliers()
            return
        
        try:
            # Buscar proveedores
            suppliers = self.db.fetch_all("""
                SELECT * FROM suppliers 
                WHERE LOWER(name) LIKE ? OR LOWER(rut) LIKE ? OR LOWER(contact_person) LIKE ? OR LOWER(status) LIKE ?
                ORDER BY name
            """, (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
            
            for supplier in suppliers:
                tags = []
                if supplier['status'] == 'Inactivo':
                    tags = ['inactive']
                
                self.suppliers_tree.insert('', 'end', values=(
                    supplier['id'],
                    supplier['name'] or '',
                    supplier['rut'] or '',
                    supplier['phone'] or '',
                    supplier['email'] or '',
                    supplier['address'] or '',
                    supplier['contact_person'] or '',
                    supplier['status'] or 'Activo'
                ), tags=tags)
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar proveedores: {str(e)}")
    
    def clear_search(self):
        """Limpiar búsqueda"""
        self.supplier_search_entry.delete(0, tk.END)
        self.load_suppliers()
    
    def show_supplier_form(self):
        """Mostrar formulario para agregar proveedor"""
        self.supplier_form_window = tk.Toplevel(self.parent)
        self.supplier_form_window.title("Nuevo Proveedor")
        self.supplier_form_window.geometry("500x600")
        self.supplier_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.supplier_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="📝 NUEVO PROVEEDOR",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Nombre *', 'name'),
            ('RUT', 'rut'),
            ('Teléfono', 'phone'),
            ('Email', 'email'),
            ('Dirección', 'address'),
            ('Persona de Contacto', 'contact_person'),
            ('Estado', 'status')
        ]
        
        self.form_entries = {}
        
        for label_text, field_name in fields:
            # Label
            label = create_styled_label(
                form_frame,
                text=label_text,
                font=FONTS['body_bold'],
                bg=COLORS['white']
            )
            label.pack(anchor='w', pady=(10, 5))
            
            # Entry o Combobox según el campo
            if field_name == 'status':
                entry = ttk.Combobox(form_frame, values=['Activo', 'Inactivo'], width=47)
                entry.set('Activo')
            else:
                entry = create_styled_entry(form_frame, width=50)
            
            entry.pack(fill='x', pady=(0, 10))
            self.form_entries[field_name] = entry
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(20, 0))
        
        save_btn = create_styled_button(
            button_frame, 
            text="💾 Guardar Proveedor",
            command=self.save_supplier,
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="❌ Cancelar",
            command=self.supplier_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def save_supplier(self):
        """Guardar proveedor en la base de datos"""
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
            address = self.form_entries['address'].get().strip()
            contact_person = self.form_entries['contact_person'].get().strip()
            status = self.form_entries['status'].get().strip()
            
            # Insertar proveedor en la base de datos
            self.db.execute("""
                INSERT INTO suppliers (name, rut, phone, email, address, contact_person, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, rut, phone, email, address, contact_person, status, datetime.now().isoformat()))
            
            messagebox.showinfo("Éxito", "Proveedor agregado correctamente")
            self.supplier_form_window.destroy()
            self.load_suppliers()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar proveedor: {str(e)}")
    
    def edit_selected_supplier(self, event=None):
        """Editar proveedor seleccionado"""
        selection = self.suppliers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un proveedor")
            return
        
        supplier_id = self.suppliers_tree.item(selection[0])['values'][0]
        
        # Obtener datos del proveedor
        supplier = self.db.fetch_one("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
        if not supplier:
            messagebox.showerror("Error", "Proveedor no encontrado")
            return
        
        # Mostrar formulario de edición
        self.edit_supplier_form(supplier)
    
    def edit_supplier_form(self, supplier):
        """Mostrar formulario para editar proveedor"""
        self.edit_form_window = tk.Toplevel(self.parent)
        self.edit_form_window.title("Editar Proveedor")
        self.edit_form_window.geometry("500x600")
        self.edit_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.edit_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="✏️ EDITAR PROVEEDOR",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Nombre *', 'name'),
            ('RUT', 'rut'),
            ('Teléfono', 'phone'),
            ('Email', 'email'),
            ('Dirección', 'address'),
            ('Persona de Contacto', 'contact_person'),
            ('Estado', 'status')
        ]
        
        self.edit_entries = {}
        
        for label_text, field_name in fields:
            # Label
            label = create_styled_label(
                form_frame,
                text=label_text,
                font=FONTS['body_bold'],
                bg=COLORS['white']
            )
            label.pack(anchor='w', pady=(10, 5))
            
            # Entry o Combobox según el campo
            if field_name == 'status':
                entry = ttk.Combobox(form_frame, values=['Activo', 'Inactivo'], width=47)
                entry.set(supplier[field_name] or 'Activo')
            else:
                entry = create_styled_entry(form_frame, width=50)
                entry.insert(0, str(supplier[field_name]) if supplier[field_name] is not None else '')
            
            entry.pack(fill='x', pady=(0, 10))
            self.edit_entries[field_name] = entry
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(20, 0))
        
        save_btn = create_styled_button(
            button_frame,
            text="💾 Actualizar Proveedor",
            command=lambda: self.update_supplier(supplier['id']),
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
    
    def update_supplier(self, supplier_id):
        """Actualizar proveedor en la base de datos"""
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
            address = self.edit_entries['address'].get().strip()
            contact_person = self.edit_entries['contact_person'].get().strip()
            status = self.edit_entries['status'].get().strip()
            
            # Actualizar proveedor en la base de datos
            self.db.execute("""
                UPDATE suppliers 
                SET name = ?, rut = ?, phone = ?, email = ?, address = ?, contact_person = ?, status = ?
                WHERE id = ?
            """, (name, rut, phone, email, address, contact_person, status, supplier_id))
            
            messagebox.showinfo("Éxito", "Proveedor actualizado correctamente")
            self.edit_form_window.destroy()
            self.load_suppliers()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al actualizar proveedor: {str(e)}")
    
    def delete_selected_supplier(self):
        """Eliminar proveedor seleccionado"""
        selection = self.suppliers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un proveedor")
            return
        
        supplier_id = self.suppliers_tree.item(selection[0])['values'][0]
        supplier_name = self.suppliers_tree.item(selection[0])['values'][1]
        
        # Confirmar eliminación
        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar al proveedor {supplier_name}?"):
            try:
                # Eliminar proveedor de la base de datos
                self.db.execute("DELETE FROM suppliers WHERE id = ?", (supplier_id,))
                
                messagebox.showinfo("Éxito", "Proveedor eliminado correctamente")
                self.load_suppliers()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar proveedor: {str(e)}")
    
    def view_supplier_details(self):
        """Ver detalles del proveedor seleccionado"""
        selection = self.suppliers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un proveedor")
            return
        
        supplier_id = self.suppliers_tree.item(selection[0])['values'][0]
        supplier_name = self.suppliers_tree.item(selection[0])['values'][1]
        
        # Obtener datos del proveedor
        supplier = self.db.fetch_one("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
        if not supplier:
            messagebox.showerror("Error", "Proveedor no encontrado")
            return
        
        # Mostrar ventana de detalles
        details_window = tk.Toplevel(self.parent)
        details_window.title(f"Detalles - {supplier_name}")
        details_window.geometry("500x600")
        details_window.resizable(False, False)
        
        # Frame principal
        details_frame = create_styled_frame(details_window, bg=COLORS['white'])
        details_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            details_frame,
            text=f"🏭 DETALLES DE {supplier_name.upper()}",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Mostrar información
        info_text = f"""
📋 INFORMACIÓN DEL PROVEEDOR:
• Nombre: {supplier['name'] or 'No especificado'}
• RUT: {supplier['rut'] or 'No especificado'}
• Teléfono: {supplier['phone'] or 'No especificado'}
• Email: {supplier['email'] or 'No especificado'}

📍 INFORMACIÓN DE CONTACTO:
• Dirección: {supplier['address'] or 'No especificado'}
• Persona de Contacto: {supplier['contact_person'] or 'No especificado'}
• Estado: {supplier['status'] or 'No especificado'}

📅 FECHA DE REGISTRO:
• {supplier['created_at'] or 'No especificado'}
        """
        
        info_label = create_styled_label(
            details_frame,
            text=info_text,
            font=FONTS['body'],
            fg=COLORS['text_primary'],
            bg=COLORS['white'],
            justify='left'
        )
        info_label.pack(fill='both', expand=True, pady=(0, 20))
        
        # Botón cerrar
        close_btn = create_styled_button(
            details_frame,
            text="❌ Cerrar",
            command=details_window.destroy,
            button_type='secondary',
            width=15
        )
        close_btn.pack()
    
    def view_supplier_products(self):
        """Ver productos del proveedor seleccionado"""
        selection = self.suppliers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un proveedor")
            return
        
        supplier_name = self.suppliers_tree.item(selection[0])['values'][1]
        messagebox.showinfo("Información", f"Productos de {supplier_name} - Funcionalidad en desarrollo")
    
    def generate_supplier_report(self):
        """Generar reporte de proveedores"""
        messagebox.showinfo("Información", "Generando reporte de proveedores - Funcionalidad en desarrollo")