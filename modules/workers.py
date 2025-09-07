import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

class WorkersModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_workers()
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame,
            text="👷 GESTIÓN DE TRABAJADORES",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para agregar trabajador
        add_worker_btn = create_styled_button(
            button_frame,
            text="➕ Nuevo Trabajador",
            command=self.show_worker_form,
            button_type='success',
            width=15
        )
        add_worker_btn.pack(side='left', padx=(0, 10))
        
        # Botón para editar trabajador
        edit_worker_btn = create_styled_button(
            button_frame,
            text="✏️ Editar",
            command=self.edit_selected_worker,
            button_type='primary',
            width=12
        )
        edit_worker_btn.pack(side='left', padx=(0, 10))
        
        # Botón para eliminar trabajador
        delete_worker_btn = create_styled_button(
            button_frame,
            text="🗑️ Eliminar",
            command=self.delete_selected_worker,
            button_type='danger',
            width=12
        )
        delete_worker_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver detalles
        view_worker_btn = create_styled_button(
            button_frame,
            text="👁️ Ver Detalles",
            command=self.view_worker_details,
            button_type='info',
            width=12
        )
        view_worker_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver horarios
        schedule_btn = create_styled_button(
            button_frame,
            text="📅 Horarios",
            command=self.view_worker_schedule,
            button_type='warning',
            width=12
        )
        schedule_btn.pack(side='left', padx=(0, 10))
        
        # Botón para generar reporte
        report_btn = create_styled_button(
            button_frame,
            text="📊 Reporte",
            command=self.generate_worker_report,
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
        
        self.worker_search_entry = create_styled_entry(
            search_frame,
            width=50
        )
        self.worker_search_entry.pack(side='left', padx=(0, 10))
        self.worker_search_entry.bind('<KeyRelease>', self.search_workers)
        
        # Botón limpiar búsqueda
        clear_search_btn = create_styled_button(
            search_frame,
            text="🗑️ Limpiar",
            command=self.clear_search,
            button_type='secondary',
            width=10
        )
        clear_search_btn.pack(side='left', padx=(10, 0))
        
        # Treeview para mostrar trabajadores
        columns = ('ID', 'Nombre', 'RUT', 'Teléfono', 'Email', 'Cargo', 'Salario', 'Estado')
        self.workers_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=15)
        
        # Configurar columnas
        for col in columns:
            self.workers_tree.heading(col, text=col)
            self.workers_tree.column(col, width=120, anchor='center')
        
        # Scrollbar para el treeview
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=self.workers_tree.yview)
        self.workers_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview y scrollbar
        self.workers_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble clic para editar
        self.workers_tree.bind('<Double-1>', self.edit_selected_worker)
        
        # Frame para estadísticas
        stats_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        stats_frame.pack(fill='x', pady=(15, 0))
        
        # Mostrar estadísticas
        self.show_worker_stats(stats_frame)
    
    def show_worker_stats(self, parent_frame):
        """Mostrar estadísticas de trabajadores"""
        try:
            total_workers = len(self.db.fetch_all("SELECT * FROM workers"))
            active_workers = len(self.db.fetch_all("SELECT * FROM workers WHERE status = 'Activo'"))
            total_salary = sum([w['salary'] for w in self.db.fetch_all("SELECT salary FROM workers WHERE status = 'Activo'")])
            
            stats_text = f"📊 Total Trabajadores: {total_workers} | ✅ Activos: {active_workers} | 💰 Nómina Total: ${total_salary:,.0f}"
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
    
    def load_workers(self):
        """Cargar trabajadores en el treeview"""
        for item in self.workers_tree.get_children():
            self.workers_tree.delete(item)
        
        try:
            # Obtener trabajadores
            workers = self.db.fetch_all("SELECT * FROM workers ORDER BY name")
            
            # Si no hay trabajadores, crear algunos de ejemplo
            if not workers:
                self.create_sample_workers()
                workers = self.db.fetch_all("SELECT * FROM workers ORDER BY name")
            
            for worker in workers:
                # Resaltar trabajadores inactivos
                tags = []
                if worker['status'] == 'Inactivo':
                    tags = ['inactive']
                
                self.workers_tree.insert('', 'end', values=(
                    worker['id'],
                    worker['name'] or '',
                    worker['rut'] or '',
                    worker['phone'] or '',
                    worker['email'] or '',
                    worker['position'] or '',
                    f"${worker['salary']:,.0f}" if worker['salary'] else '$0',
                    worker['status'] or 'Activo'
                ), tags=tags)
            
            # Configurar colores para trabajadores inactivos
            self.workers_tree.tag_configure('inactive', background='#ffebee')
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar trabajadores: {str(e)}")
    
    def create_sample_workers(self):
        """Crear trabajadores de ejemplo"""
        sample_workers = [
            ('Juan Pérez', '12.345.678-9', '+56 9 1234 5678', 'juan.perez@taller.com', 'Mecánico Senior', 800000, 'Activo'),
            ('María González', '98.765.432-1', '+56 9 8765 4321', 'maria.gonzalez@taller.com', 'Mecánica', 750000, 'Activo'),
            ('Carlos Rodríguez', '11.222.333-4', '+56 9 1122 3344', 'carlos.rodriguez@taller.com', 'Ayudante', 500000, 'Activo'),
            ('Ana Silva', '13.456.789-0', '+56 9 3456 7890', 'ana.silva@taller.com', 'Recepcionista', 600000, 'Activo'),
            ('Luis Herrera', '14.567.890-1', '+56 9 4567 8901', 'luis.herrera@taller.com', 'Mecánico', 700000, 'Inactivo')
        ]
        
        for worker_data in sample_workers:
            self.db.execute("""
                INSERT INTO workers (name, rut, phone, email, position, salary, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (*worker_data, datetime.now().isoformat()))
    
    def search_workers(self, event=None):
        """Buscar trabajadores"""
        search_term = self.worker_search_entry.get().lower()
        
        for item in self.workers_tree.get_children():
            self.workers_tree.delete(item)
        
        if not search_term:
            self.load_workers()
            return
        
        try:
            # Buscar trabajadores
            workers = self.db.fetch_all("""
                SELECT * FROM workers 
                WHERE LOWER(name) LIKE ? OR LOWER(rut) LIKE ? OR LOWER(position) LIKE ? OR LOWER(status) LIKE ?
                ORDER BY name
            """, (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
            
            for worker in workers:
                tags = []
                if worker['status'] == 'Inactivo':
                    tags = ['inactive']
                
                self.workers_tree.insert('', 'end', values=(
                    worker['id'],
                    worker['name'] or '',
                    worker['rut'] or '',
                    worker['phone'] or '',
                    worker['email'] or '',
                    worker['position'] or '',
                    f"${worker['salary']:,.0f}" if worker['salary'] else '$0',
                    worker['status'] or 'Activo'
                ), tags=tags)
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar trabajadores: {str(e)}")
    
    def clear_search(self):
        """Limpiar búsqueda"""
        self.worker_search_entry.delete(0, tk.END)
        self.load_workers()
    
    def show_worker_form(self):
        """Mostrar formulario para agregar trabajador"""
        self.worker_form_window = tk.Toplevel(self.parent)
        self.worker_form_window.title("Nuevo Trabajador")
        self.worker_form_window.geometry("500x700")
        self.worker_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.worker_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="📝 NUEVO TRABAJADOR",
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
            ('Cargo *', 'position'),
            ('Salario *', 'salary'),
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
            text="💾 Guardar Trabajador",
            command=self.save_worker,
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame,
            text="❌ Cancelar",
            command=self.worker_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def save_worker(self):
        """Guardar trabajador en la base de datos"""
        try:
            # Validar campos obligatorios
            name = self.form_entries['name'].get().strip()
            position = self.form_entries['position'].get().strip()
            salary = self.form_entries['salary'].get().strip()
            
            if not name or not position or not salary:
                messagebox.showerror("Error", "Nombre, cargo y salario son obligatorios")
                return
            
            # Convertir salario a float
            try:
                salary = float(salary)
            except ValueError:
                messagebox.showerror("Error", "El salario debe ser un número válido")
                return
            
            # Obtener datos del formulario
            rut = self.form_entries['rut'].get().strip()
            phone = self.form_entries['phone'].get().strip()
            email = self.form_entries['email'].get().strip()
            status = self.form_entries['status'].get().strip()
            
            # Insertar trabajador en la base de datos
            self.db.execute("""
                INSERT INTO workers (name, rut, phone, email, position, salary, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, rut, phone, email, position, salary, status, datetime.now().isoformat()))
            
            messagebox.showinfo("Éxito", "Trabajador agregado correctamente")
            self.worker_form_window.destroy()
            self.load_workers()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar trabajador: {str(e)}")
    
    def edit_selected_worker(self, event=None):
        """Editar trabajador seleccionado"""
        selection = self.workers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un trabajador")
            return
        
        worker_id = self.workers_tree.item(selection[0])['values'][0]
        
        # Obtener datos del trabajador
        worker = self.db.fetch_one("SELECT * FROM workers WHERE id = ?", (worker_id,))
        if not worker:
            messagebox.showerror("Error", "Trabajador no encontrado")
            return
        
        # Mostrar formulario de edición
        self.edit_worker_form(worker)
    
    def edit_worker_form(self, worker):
        """Mostrar formulario para editar trabajador"""
        self.edit_form_window = tk.Toplevel(self.parent)
        self.edit_form_window.title("Editar Trabajador")
        self.edit_form_window.geometry("500x700")
        self.edit_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.edit_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="✏️ EDITAR TRABAJADOR",
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
            ('Cargo *', 'position'),
            ('Salario *', 'salary'),
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
                entry.set(worker[field_name] or 'Activo')
            else:
                entry = create_styled_entry(form_frame, width=50)
                entry.insert(0, str(worker[field_name]) if worker[field_name] is not None else '')
            
            entry.pack(fill='x', pady=(0, 10))
            self.edit_entries[field_name] = entry
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(20, 0))
        
        save_btn = create_styled_button(
            button_frame,
            text="💾 Actualizar Trabajador",
            command=lambda: self.update_worker(worker['id']),
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
    
    def update_worker(self, worker_id):
        """Actualizar trabajador en la base de datos"""
        try:
            # Validar campos obligatorios
            name = self.edit_entries['name'].get().strip()
            position = self.edit_entries['position'].get().strip()
            salary = self.edit_entries['salary'].get().strip()
            
            if not name or not position or not salary:
                messagebox.showerror("Error", "Nombre, cargo y salario son obligatorios")
                return
            
            # Convertir salario a float
            try:
                salary = float(salary)
            except ValueError:
                messagebox.showerror("Error", "El salario debe ser un número válido")
                return
            
            # Obtener datos del formulario
            rut = self.edit_entries['rut'].get().strip()
            phone = self.edit_entries['phone'].get().strip()
            email = self.edit_entries['email'].get().strip()
            status = self.edit_entries['status'].get().strip()
            
            # Actualizar trabajador en la base de datos
            self.db.execute("""
                UPDATE workers 
                SET name = ?, rut = ?, phone = ?, email = ?, position = ?, salary = ?, status = ?
                WHERE id = ?
            """, (name, rut, phone, email, position, salary, status, worker_id))
            
            messagebox.showinfo("Éxito", "Trabajador actualizado correctamente")
            self.edit_form_window.destroy()
            self.load_workers()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al actualizar trabajador: {str(e)}")
    
    def delete_selected_worker(self):
        """Eliminar trabajador seleccionado"""
        selection = self.workers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un trabajador")
            return
        
        worker_id = self.workers_tree.item(selection[0])['values'][0]
        worker_name = self.workers_tree.item(selection[0])['values'][1]
        
        # Confirmar eliminación
        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar al trabajador {worker_name}?"):
            try:
                # Eliminar trabajador de la base de datos
                self.db.execute("DELETE FROM workers WHERE id = ?", (worker_id,))
                
                messagebox.showinfo("Éxito", "Trabajador eliminado correctamente")
                self.load_workers()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar trabajador: {str(e)}")
    
    def view_worker_details(self):
        """Ver detalles del trabajador seleccionado"""
        selection = self.workers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un trabajador")
            return
        
        worker_id = self.workers_tree.item(selection[0])['values'][0]
        worker_name = self.workers_tree.item(selection[0])['values'][1]
        
        # Obtener datos del trabajador
        worker = self.db.fetch_one("SELECT * FROM workers WHERE id = ?", (worker_id,))
        if not worker:
            messagebox.showerror("Error", "Trabajador no encontrado")
            return
        
        # Mostrar ventana de detalles
        details_window = tk.Toplevel(self.parent)
        details_window.title(f"Detalles - {worker_name}")
        details_window.geometry("500x600")
        details_window.resizable(False, False)
        
        # Frame principal
        details_frame = create_styled_frame(details_window, bg=COLORS['white'])
        details_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            details_frame,
            text=f"👷 DETALLES DE {worker_name.upper()}",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Mostrar información
        status_color = COLORS['success'] if worker['status'] == 'Activo' else COLORS['error']
        
        info_text = f"""
📋 INFORMACIÓN PERSONAL:
• Nombre: {worker['name'] or 'No especificado'}
• RUT: {worker['rut'] or 'No especificado'}
• Teléfono: {worker['phone'] or 'No especificado'}
• Email: {worker['email'] or 'No especificado'}

💼 INFORMACIÓN LABORAL:
• Cargo: {worker['position'] or 'No especificado'}
• Salario: ${worker['salary']:,.0f} if worker['salary'] else 'No especificado'
• Estado: {worker['status'] or 'No especificado'}

📅 FECHA DE REGISTRO:
• {worker['created_at'] or 'No especificado'}
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
    
    def view_worker_schedule(self):
        """Ver horarios del trabajador seleccionado"""
        selection = self.workers_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un trabajador")
            return
        
        worker_name = self.workers_tree.item(selection[0])['values'][1]
        messagebox.showinfo("Información", f"Horarios de {worker_name} - Funcionalidad en desarrollo")
    
    def generate_worker_report(self):
        """Generar reporte de trabajadores"""
        messagebox.showinfo("Información", "Generando reporte de trabajadores - Funcionalidad en desarrollo")