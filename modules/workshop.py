import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from .styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

class WorkshopModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_work_orders()
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="🔧 GESTIÓN DEL TALLER",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para nueva orden de trabajo
        add_order_btn = create_styled_button(
            button_frame, 
            text="➕ Nueva Orden",
            command=self.show_order_form,
            button_type='success',
            width=15
        )
        add_order_btn.pack(side='left', padx=(0, 10))
        
        # Botón para editar orden
        edit_order_btn = create_styled_button(
            button_frame, 
            text="✏️ Editar",
            command=self.edit_selected_order,
            button_type='primary',
            width=12
        )
        edit_order_btn.pack(side='left', padx=(0, 10))
        
        # Botón para eliminar orden
        delete_order_btn = create_styled_button(
            button_frame, 
            text="🗑️ Eliminar",
            command=self.delete_selected_order,
            button_type='danger',
            width=12
        )
        delete_order_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver detalles
        view_order_btn = create_styled_button(
            button_frame, 
            text="👁️ Ver Detalles",
            command=self.view_order_details,
            button_type='info',
            width=12
        )
        view_order_btn.pack(side='left', padx=(0, 10))
        
        # Botón para marcar como completada
        complete_order_btn = create_styled_button(
            button_frame, 
            text="✅ Completar",
            command=self.complete_selected_order,
            button_type='warning',
            width=12
        )
        complete_order_btn.pack(side='left', padx=(0, 10))
        
        # Botón para asignar trabajador
        assign_worker_btn = create_styled_button(
            button_frame, 
            text="👷 Asignar",
            command=self.assign_worker,
            button_type='secondary',
            width=12
        )
        assign_worker_btn.pack(side='left', padx=(0, 10))
        
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
        
        self.order_search_entry = create_styled_entry(
            search_frame,
            width=50
        )
        self.order_search_entry.pack(side='left', padx=(0, 10))
        self.order_search_entry.bind('<KeyRelease>', self.search_orders)
        
        # Botón limpiar búsqueda
        clear_search_btn = create_styled_button(
            search_frame,
            text="🗑️ Limpiar",
            command=self.clear_search,
            button_type='secondary',
            width=10
        )
        clear_search_btn.pack(side='left', padx=(10, 0))
        
        # Treeview para mostrar órdenes de trabajo
        columns = ('ID', 'Cliente', 'Vehículo', 'Descripción', 'Estado', 'Trabajador', 'Fecha Inicio', 'Fecha Fin')
        self.orders_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=15)
        
        # Configurar columnas
        for col in columns:
            self.orders_tree.heading(col, text=col)
            self.orders_tree.column(col, width=120, anchor='center')
        
        # Scrollbar para el treeview
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=self.orders_tree.yview)
        self.orders_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview y scrollbar
        self.orders_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble clic para editar
        self.orders_tree.bind('<Double-1>', self.edit_selected_order)
        
        # Frame para estadísticas
        stats_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        stats_frame.pack(fill='x', pady=(15, 0))
        
        # Mostrar estadísticas
        self.show_workshop_stats(stats_frame)
    
    def show_workshop_stats(self, parent_frame):
        """Mostrar estadísticas del taller"""
        try:
            total_orders = len(self.db.fetch_all("SELECT * FROM work_orders"))
            pending_orders = len(self.db.fetch_all("SELECT * FROM work_orders WHERE status = 'En Progreso'"))
            completed_orders = len(self.db.fetch_all("SELECT * FROM work_orders WHERE status = 'Completada'"))
            
            stats_text = f"📊 Total Órdenes: {total_orders} | ⏳ En Progreso: {pending_orders} | ✅ Completadas: {completed_orders}"
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
    
    def load_work_orders(self):
        """Cargar órdenes de trabajo en el treeview"""
        for item in self.orders_tree.get_children():
            self.orders_tree.delete(item)
        
        try:
            # Obtener órdenes de trabajo con información del cliente
            orders = self.db.fetch_all("""
                SELECT wo.id, c.name as client_name, wo.vehicle_info, wo.description, 
                       wo.status, w.name as worker_name, wo.start_date, wo.end_date
                FROM work_orders wo
                JOIN clients c ON wo.client_id = c.id
                LEFT JOIN workers w ON wo.worker_id = w.id
                ORDER BY wo.start_date DESC
            """)
            
            # Si no hay órdenes, crear algunas de ejemplo
            if not orders:
                self.create_sample_orders()
                orders = self.db.fetch_all("""
                    SELECT wo.id, c.name as client_name, wo.vehicle_info, wo.description, 
                           wo.status, w.name as worker_name, wo.start_date, wo.end_date
            FROM work_orders wo
            JOIN clients c ON wo.client_id = c.id
                    LEFT JOIN workers w ON wo.worker_id = w.id
                    ORDER BY wo.start_date DESC
                """)
            
            for order in orders:
                start_date = datetime.fromisoformat(order['start_date']).strftime('%Y-%m-%d') if order['start_date'] else ''
                end_date = datetime.fromisoformat(order['end_date']).strftime('%Y-%m-%d') if order['end_date'] else ''
                
                # Resaltar órdenes pendientes
                tags = []
                if order['status'] == 'Pendiente':
                    tags = ['pending']
                elif order['status'] == 'Completada':
                    tags = ['completed']
                
                self.orders_tree.insert('', 'end', values=(
                order['id'],
                    order['client_name'] or '',
                    order['vehicle_info'] or '',
                    order['description'] or '',
                    order['status'] or 'Pendiente',
                    order['worker_name'] or 'Sin asignar',
                start_date,
                    end_date
                ), tags=tags)
            
            # Configurar colores
            self.orders_tree.tag_configure('pending', background='#fff3cd')
            self.orders_tree.tag_configure('completed', background='#d4edda')
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar órdenes de trabajo: {str(e)}")
    
    def create_sample_orders(self):
        """Crear órdenes de trabajo de ejemplo"""
        # Obtener clientes existentes
        clients = self.db.fetch_all("SELECT id FROM clients LIMIT 3")
        workers = self.db.fetch_all("SELECT id FROM workers LIMIT 2")
        
        if clients:
            sample_orders = [
                (clients[0]['id'], 'Toyota Corolla 2020', 'Cambio de aceite y filtros', 'En Progreso', workers[0]['id'] if workers else None),
                (clients[1]['id'] if len(clients) > 1 else clients[0]['id'], 'Honda Civic 2019', 'Revisión de frenos', 'Pendiente', None),
                (clients[2]['id'] if len(clients) > 2 else clients[0]['id'], 'Nissan Sentra 2021', 'Reparación de motor', 'Completada', workers[1]['id'] if len(workers) > 1 else workers[0]['id'])
            ]
            
            for order_data in sample_orders:
                self.db.execute("""
                    INSERT INTO work_orders (client_id, vehicle_info, description, status, worker_id, start_date, end_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    order_data[0],
                    order_data[1],
                    order_data[2],
                    order_data[3],
                    order_data[4],
                    datetime.now().isoformat(),
                    (datetime.now() + timedelta(days=2)).isoformat() if order_data[3] == 'Completada' else None
                ))
    
    def search_orders(self, event=None):
        """Buscar órdenes de trabajo"""
        search_term = self.order_search_entry.get().lower()
        
        for item in self.orders_tree.get_children():
            self.orders_tree.delete(item)
        
        if not search_term:
            self.load_work_orders()
            return
        
        try:
            # Buscar órdenes
            orders = self.db.fetch_all("""
                SELECT wo.id, c.name as client_name, wo.vehicle_info, wo.description, 
                       wo.status, w.name as worker_name, wo.start_date, wo.end_date
                FROM work_orders wo
                JOIN clients c ON wo.client_id = c.id
                LEFT JOIN workers w ON wo.worker_id = w.id
                WHERE LOWER(c.name) LIKE ? OR LOWER(wo.vehicle_info) LIKE ? OR LOWER(wo.description) LIKE ? OR LOWER(wo.status) LIKE ?
                ORDER BY wo.start_date DESC
            """, (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
            
            for order in orders:
                start_date = datetime.fromisoformat(order['start_date']).strftime('%Y-%m-%d') if order['start_date'] else ''
                end_date = datetime.fromisoformat(order['end_date']).strftime('%Y-%m-%d') if order['end_date'] else ''
                
                tags = []
                if order['status'] == 'Pendiente':
                    tags = ['pending']
                elif order['status'] == 'Completada':
                    tags = ['completed']
                
                self.orders_tree.insert('', 'end', values=(
                    order['id'],
                    order['client_name'] or '',
                    order['vehicle_info'] or '',
                    order['description'] or '',
                    order['status'] or 'Pendiente',
                    order['worker_name'] or 'Sin asignar',
                    start_date,
                    end_date
                ), tags=tags)
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar órdenes: {str(e)}")
    
    def clear_search(self):
        """Limpiar búsqueda"""
        self.order_search_entry.delete(0, tk.END)
        self.load_work_orders()
    
    def show_order_form(self):
        """Mostrar formulario para nueva orden de trabajo"""
        self.order_form_window = tk.Toplevel(self.parent)
        self.order_form_window.title("Nueva Orden de Trabajo")
        self.order_form_window.geometry("600x500")
        self.order_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.order_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="📝 NUEVA ORDEN DE TRABAJO",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Cliente *', 'client'),
            ('Información del Vehículo *', 'vehicle_info'),
            ('Descripción del Trabajo *', 'description'),
            ('Trabajador Asignado', 'worker'),
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
            if field_name == 'client':
                entry = ttk.Combobox(form_frame, width=47)
                # Cargar clientes
                clients = self.db.fetch_all("SELECT id, name FROM clients ORDER BY name")
                client_list = [f"{client['id']} - {client['name']}" for client in clients]
                entry['values'] = client_list
            elif field_name == 'worker':
                entry = ttk.Combobox(form_frame, width=47)
                # Cargar trabajadores
                workers = self.db.fetch_all("SELECT id, name FROM workers WHERE status = 'Activo' ORDER BY name")
                worker_list = [f"{worker['id']} - {worker['name']}" for worker in workers]
                entry['values'] = worker_list
            elif field_name == 'status':
                entry = ttk.Combobox(form_frame, values=['Pendiente', 'En Progreso', 'Completada'], width=47)
                entry.set('Pendiente')
            else:
                entry = create_styled_entry(form_frame, width=50)
            
            entry.pack(fill='x', pady=(0, 10))
            self.form_entries[field_name] = entry
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(20, 0))
        
        save_btn = create_styled_button(
            button_frame, 
            text="💾 Guardar Orden",
            command=self.save_order,
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="❌ Cancelar",
            command=self.order_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def save_order(self):
        """Guardar orden de trabajo en la base de datos"""
        try:
            # Validar campos obligatorios
            client_text = self.form_entries['client'].get().strip()
            vehicle_info = self.form_entries['vehicle_info'].get().strip()
            description = self.form_entries['description'].get().strip()
            
            if not client_text or not vehicle_info or not description:
                messagebox.showerror("Error", "Cliente, vehículo y descripción son obligatorios")
            return
        
        # Obtener ID del cliente
            client_id = int(client_text.split(' - ')[0])
            
            # Obtener datos del formulario
            worker_text = self.form_entries['worker'].get().strip()
            status = self.form_entries['status'].get().strip()
            
            # Obtener ID del trabajador si está seleccionado
            worker_id = None
            if worker_text:
                worker_id = int(worker_text.split(' - ')[0])
            
            # Insertar orden de trabajo en la base de datos
            self.db.execute("""
                INSERT INTO work_orders (client_id, vehicle_info, description, status, worker_id, start_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (client_id, vehicle_info, description, status, worker_id, datetime.now().isoformat()))
            
            messagebox.showinfo("Éxito", "Orden de trabajo creada correctamente")
            self.order_form_window.destroy()
            self.load_work_orders()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar orden de trabajo: {str(e)}")
    
    def edit_selected_order(self, event=None):
        """Editar orden seleccionada"""
        selection = self.orders_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una orden")
            return
            
        order_id = self.orders_tree.item(selection[0])['values'][0]
        messagebox.showinfo("Información", f"Editando orden #{order_id} - Funcionalidad en desarrollo")
    
    def delete_selected_order(self):
        """Eliminar orden seleccionada"""
        selection = self.orders_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una orden")
            return
            
        order_id = self.orders_tree.item(selection[0])['values'][0]
        client_name = self.orders_tree.item(selection[0])['values'][1]
        
        # Confirmar eliminación
        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar la orden de {client_name}?"):
            try:
                # Eliminar orden de la base de datos
                self.db.execute("DELETE FROM work_orders WHERE id = ?", (order_id,))
                
                messagebox.showinfo("Éxito", "Orden eliminada correctamente")
                self.load_work_orders()
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar orden: {str(e)}")
    
    def view_order_details(self):
        """Ver detalles de la orden seleccionada"""
        selection = self.orders_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una orden")
            return
        
        order_id = self.orders_tree.item(selection[0])['values'][0]
        client_name = self.orders_tree.item(selection[0])['values'][1]
        
        # Obtener datos de la orden
        order = self.db.fetch_one("SELECT * FROM work_orders WHERE id = ?", (order_id,))
        if not order:
            messagebox.showerror("Error", "Orden no encontrada")
            return
        
        # Mostrar ventana de detalles
        details_window = tk.Toplevel(self.parent)
        details_window.title(f"Detalles - Orden #{order_id}")
        details_window.geometry("500x600")
        details_window.resizable(False, False)
        
        # Frame principal
        details_frame = create_styled_frame(details_window, bg=COLORS['white'])
        details_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            details_frame,
            text=f"🔧 DETALLES ORDEN #{order_id}",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Mostrar información
        start_date = datetime.fromisoformat(order['start_date']).strftime('%Y-%m-%d %H:%M') if order['start_date'] else ''
        end_date = datetime.fromisoformat(order['end_date']).strftime('%Y-%m-%d %H:%M') if order['end_date'] else ''
        
        info_text = f"""
📋 INFORMACIÓN DE LA ORDEN:
• Cliente: {client_name}
• Vehículo: {order['vehicle_info'] or 'No especificado'}
• Descripción: {order['description'] or 'No especificado'}
• Estado: {order['status'] or 'No especificado'}

👷 TRABAJADOR ASIGNADO:
• {order['worker_id'] or 'Sin asignar'}

📅 FECHAS:
• Fecha de inicio: {start_date}
• Fecha de fin: {end_date}

📝 NOTAS:
• {order['notes'] or 'Sin notas adicionales'}
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
    
    def complete_selected_order(self):
        """Marcar orden como completada"""
        selection = self.orders_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una orden")
            return
        
        order_id = self.orders_tree.item(selection[0])['values'][0]
        client_name = self.orders_tree.item(selection[0])['values'][1]
        
        if messagebox.askyesno("Confirmar", f"¿Marcar orden de {client_name} como completada?"):
            try:
                # Actualizar estado de la orden
                self.db.execute("""
                    UPDATE work_orders 
                    SET status = 'Completada', end_date = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), order_id))
                
                messagebox.showinfo("Éxito", "Orden marcada como completada")
                self.load_work_orders()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error al completar orden: {str(e)}")
    
    def assign_worker(self):
        """Asignar trabajador a la orden seleccionada"""
        selection = self.orders_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una orden")
            return
        
        order_id = self.orders_tree.item(selection[0])['values'][0]
        messagebox.showinfo("Información", f"Asignando trabajador a orden #{order_id} - Funcionalidad en desarrollo")