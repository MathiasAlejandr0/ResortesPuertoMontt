import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from .styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

class QuotesModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_quotes()
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame,
            text="📋 GESTIÓN DE COTIZACIONES",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para crear cotización
        add_quote_btn = create_styled_button(
            button_frame,
            text="➕ Nueva Cotización",
            command=self.show_quote_form,
            button_type='success',
            width=15
        )
        add_quote_btn.pack(side='left', padx=(0, 10))
        
        # Botón para editar cotización
        edit_quote_btn = create_styled_button(
            button_frame,
            text="✏️ Editar",
            command=self.edit_selected_quote,
            button_type='primary',
            width=12
        )
        edit_quote_btn.pack(side='left', padx=(0, 10))
        
        # Botón para eliminar cotización
        delete_quote_btn = create_styled_button(
            button_frame,
            text="🗑️ Eliminar",
            command=self.delete_selected_quote,
            button_type='danger',
            width=12
        )
        delete_quote_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver detalles
        view_quote_btn = create_styled_button(
            button_frame,
            text="👁️ Ver Detalles",
            command=self.view_quote_details,
            button_type='info',
            width=12
        )
        view_quote_btn.pack(side='left', padx=(0, 10))
        
        # Botón para imprimir cotización
        print_quote_btn = create_styled_button(
            button_frame,
            text="🖨️ Imprimir",
            command=self.print_selected_quote,
            button_type='warning',
            width=12
        )
        print_quote_btn.pack(side='left', padx=(0, 10))
        
        # Botón para vista previa de impresión
        preview_btn = create_styled_button(
            button_frame,
            text="👁️ Vista Previa",
            command=self.preview_quote,
            button_type='info',
            width=12
        )
        preview_btn.pack(side='left', padx=(0, 10))
        
        # Botón para convertir a venta
        convert_sale_btn = create_styled_button(
            button_frame,
            text="💰 Convertir a Venta",
            command=self.convert_to_sale,
            button_type='secondary',
            width=15
        )
        convert_sale_btn.pack(side='left', padx=(0, 10))
        
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
        
        self.quote_search_entry = create_styled_entry(
            search_frame,
            width=50
        )
        self.quote_search_entry.pack(side='left', padx=(0, 10))
        self.quote_search_entry.bind('<KeyRelease>', self.search_quotes)
        
        # Botón limpiar búsqueda
        clear_search_btn = create_styled_button(
            search_frame,
            text="🗑️ Limpiar",
            command=self.clear_search,
            button_type='secondary',
            width=10
        )
        clear_search_btn.pack(side='left', padx=(10, 0))
        
        # Treeview para mostrar cotizaciones
        columns = ('ID', 'Cliente', 'Descripción', 'Total', 'Estado', 'Fecha', 'Válida Hasta')
        self.quotes_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=15)
        
        # Configurar columnas
        for col in columns:
            self.quotes_tree.heading(col, text=col)
            self.quotes_tree.column(col, width=120, anchor='center')
        
        # Scrollbar para el treeview
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=self.quotes_tree.yview)
        self.quotes_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview y scrollbar
        self.quotes_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble clic para editar
        self.quotes_tree.bind('<Double-1>', self.edit_selected_quote)
        
        # Frame para estadísticas
        stats_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        stats_frame.pack(fill='x', pady=(15, 0))
        
        # Mostrar estadísticas
        self.show_quote_stats(stats_frame)
    
    def show_quote_stats(self, parent_frame):
        """Mostrar estadísticas de cotizaciones"""
        try:
            total_quotes = len(self.db.fetch_all("SELECT * FROM quotes"))
            pending_quotes = len(self.db.fetch_all("SELECT * FROM quotes WHERE status = 'Pendiente'"))
            approved_quotes = len(self.db.fetch_all("SELECT * FROM quotes WHERE status = 'Aprobada'"))
            
            stats_text = f"📊 Total Cotizaciones: {total_quotes} | ⏳ Pendientes: {pending_quotes} | ✅ Aprobadas: {approved_quotes}"
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
    
    def load_quotes(self):
        """Cargar cotizaciones en el treeview"""
        for item in self.quotes_tree.get_children():
            self.quotes_tree.delete(item)
        
        try:
            # Obtener cotizaciones con información del cliente
            quotes = self.db.fetch_all("""
                SELECT q.id, c.name as client_name, q.description, q.total_amount, 
                       q.status, q.quote_date, q.valid_until
                FROM quotes q
                JOIN clients c ON q.client_id = c.id
                ORDER BY q.quote_date DESC
            """)
            
            # Si no hay cotizaciones, crear algunas de ejemplo
            if not quotes:
                self.create_sample_quotes()
                quotes = self.db.fetch_all("""
                    SELECT q.id, c.name as client_name, q.description, q.total_amount, 
                           q.status, q.quote_date, q.valid_until
                    FROM quotes q
                    JOIN clients c ON q.client_id = c.id
                    ORDER BY q.quote_date DESC
                """)
            
            for quote in quotes:
                quote_date = datetime.fromisoformat(quote['quote_date']).strftime('%Y-%m-%d') if quote['quote_date'] else ''
                valid_until = datetime.fromisoformat(quote['valid_until']).strftime('%Y-%m-%d') if quote['valid_until'] else ''
                
                # Resaltar cotizaciones vencidas
                tags = []
                if quote['valid_until'] and datetime.fromisoformat(quote['valid_until']) < datetime.now():
                    tags = ['expired']
                
                self.quotes_tree.insert('', 'end', values=(
                    quote['id'],
                    quote['client_name'] or '',
                    quote['description'] or '',
                    f"${quote['total_amount']:,.0f}" if quote['total_amount'] else '$0',
                    quote['status'] or 'Pendiente',
                    quote_date,
                    valid_until
                ), tags=tags)
            
            # Configurar colores para cotizaciones vencidas
            self.quotes_tree.tag_configure('expired', background='#ffebee')
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar cotizaciones: {str(e)}")
    
    def create_sample_quotes(self):
        """Crear cotizaciones de ejemplo"""
        # Primero obtener clientes existentes
        clients = self.db.fetch_all("SELECT id FROM clients LIMIT 3")
        
        if clients:
            sample_quotes = [
                (clients[0]['id'], 'Reparación de motor - Cambio de aceite y filtros', 150000, 'Pendiente'),
                (clients[1]['id'] if len(clients) > 1 else clients[0]['id'], 'Revisión completa del sistema de frenos', 200000, 'Aprobada'),
                (clients[2]['id'] if len(clients) > 2 else clients[0]['id'], 'Cambio de neumáticos y alineación', 300000, 'Pendiente')
            ]
            
            for quote_data in sample_quotes:
                self.db.execute("""
                    INSERT INTO quotes (client_id, description, total_amount, status, quote_date, valid_until)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    quote_data[0],
                    quote_data[1],
                    quote_data[2],
                    quote_data[3],
                    datetime.now().isoformat(),
                    (datetime.now() + timedelta(days=30)).isoformat()
                ))
    
    def search_quotes(self, event=None):
        """Buscar cotizaciones"""
        search_term = self.quote_search_entry.get().lower()
        
        for item in self.quotes_tree.get_children():
            self.quotes_tree.delete(item)
        
        if not search_term:
            self.load_quotes()
            return
        
        try:
            # Buscar cotizaciones
            quotes = self.db.fetch_all("""
                SELECT q.id, c.name as client_name, q.description, q.total_amount, 
                       q.status, q.quote_date, q.valid_until
                FROM quotes q
                JOIN clients c ON q.client_id = c.id
                WHERE LOWER(c.name) LIKE ? OR LOWER(q.description) LIKE ? OR LOWER(q.status) LIKE ?
                ORDER BY q.quote_date DESC
            """, (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
            
            for quote in quotes:
                quote_date = datetime.fromisoformat(quote['quote_date']).strftime('%Y-%m-%d') if quote['quote_date'] else ''
                valid_until = datetime.fromisoformat(quote['valid_until']).strftime('%Y-%m-%d') if quote['valid_until'] else ''
                
                tags = []
                if quote['valid_until'] and datetime.fromisoformat(quote['valid_until']) < datetime.now():
                    tags = ['expired']
                
                self.quotes_tree.insert('', 'end', values=(
                    quote['id'],
                    quote['client_name'] or '',
                    quote['description'] or '',
                    f"${quote['total_amount']:,.0f}" if quote['total_amount'] else '$0',
                    quote['status'] or 'Pendiente',
                    quote_date,
                    valid_until
                ), tags=tags)
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar cotizaciones: {str(e)}")
    
    def clear_search(self):
        """Limpiar búsqueda"""
        self.quote_search_entry.delete(0, tk.END)
        self.load_quotes()
    
    def show_quote_form(self):
        """Mostrar formulario para crear cotización"""
        self.quote_form_window = tk.Toplevel(self.parent)
        self.quote_form_window.title("Nueva Cotización")
        self.quote_form_window.geometry("800x700")
        self.quote_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.quote_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="📝 NUEVA COTIZACIÓN",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Frame para datos básicos
        basic_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        basic_frame.pack(fill='x', pady=(0, 20))
        
        # Cliente
        client_label = create_styled_label(
            basic_frame,
            text="Cliente *:",
            font=FONTS['body_bold'],
            bg=COLORS['white']
        )
        client_label.grid(row=0, column=0, pady=10, padx=10, sticky='e')
        
        self.client_var = tk.StringVar()
        self.client_combo = ttk.Combobox(basic_frame, textvariable=self.client_var, width=40)
        self.client_combo.grid(row=0, column=1, pady=10, padx=10, sticky='ew')
        
        # Cargar clientes
        self.load_clients_combo()
        
        # Descripción
        desc_label = create_styled_label(
            basic_frame,
            text="Descripción *:",
            font=FONTS['body_bold'],
            bg=COLORS['white']
        )
        desc_label.grid(row=1, column=0, pady=10, padx=10, sticky='e')
        
        self.description_entry = create_styled_entry(basic_frame, width=50)
        self.description_entry.grid(row=1, column=1, pady=10, padx=10, sticky='ew')
        
        # Fecha de validez
        valid_label = create_styled_label(
            basic_frame,
            text="Válida hasta:",
            font=FONTS['body_bold'],
            bg=COLORS['white']
        )
        valid_label.grid(row=2, column=0, pady=10, padx=10, sticky='e')
        
        self.valid_until_entry = create_styled_entry(basic_frame, width=20)
        self.valid_until_entry.insert(0, (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
        self.valid_until_entry.grid(row=2, column=1, pady=10, padx=10, sticky='w')
        
        # Frame para items de la cotización
        items_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        items_frame.pack(fill='both', expand=True, pady=(0, 20))
        
        # Título de items
        items_title = create_styled_label(
            items_frame,
            text="📋 ITEMS DE LA COTIZACIÓN",
            font=FONTS['subtitle'],
            fg=COLORS['primary'],
            bg=COLORS['white']
        )
        items_title.pack(pady=(0, 10))
        
        # Treeview para items
        item_columns = ('Producto', 'Cantidad', 'Precio Unit.', 'Total')
        self.items_tree = ttk.Treeview(items_frame, columns=item_columns, show='headings', height=8)
        
        for col in item_columns:
            self.items_tree.heading(col, text=col)
            self.items_tree.column(col, width=150, anchor='center')
        
        self.items_tree.pack(fill='both', expand=True, pady=(0, 10))
        
        # Frame para agregar items
        add_item_frame = create_styled_frame(items_frame, bg=COLORS['white'])
        add_item_frame.pack(fill='x', pady=(0, 10))
        
        # Producto
        product_label = create_styled_label(add_item_frame, text="Producto:", font=FONTS['body'], bg=COLORS['white'])
        product_label.pack(side='left', padx=(0, 10))
        
        self.product_var = tk.StringVar()
        self.product_combo = ttk.Combobox(add_item_frame, textvariable=self.product_var, width=30)
        self.product_combo.pack(side='left', padx=(0, 10))
        
        # Cargar productos
        self.load_products_combo()
        
        # Cantidad
        qty_label = create_styled_label(add_item_frame, text="Cantidad:", font=FONTS['body'], bg=COLORS['white'])
        qty_label.pack(side='left', padx=(0, 10))
        
        self.quantity_entry = create_styled_entry(add_item_frame, width=10)
        self.quantity_entry.pack(side='left', padx=(0, 10))
        
        # Precio
        price_label = create_styled_label(add_item_frame, text="Precio:", font=FONTS['body'], bg=COLORS['white'])
        price_label.pack(side='left', padx=(0, 10))
        
        self.price_entry = create_styled_entry(add_item_frame, width=15)
        self.price_entry.pack(side='left', padx=(0, 10))
        
        # Botón agregar item
        add_item_btn = create_styled_button(
            add_item_frame,
            text="➕ Agregar",
            command=self.add_quote_item,
            button_type='success',
            width=10
        )
        add_item_btn.pack(side='left', padx=(10, 0))
        
        # Frame para totales
        totals_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        totals_frame.pack(fill='x', pady=(0, 20))
        
        # Total
        total_label = create_styled_label(
            totals_frame,
            text="TOTAL:",
            font=FONTS['heading'],
            fg=COLORS['primary'],
            bg=COLORS['white']
        )
        total_label.pack(side='left', padx=(0, 10))
        
        self.total_label = create_styled_label(
            totals_frame,
            text="$0",
            font=FONTS['heading'],
            fg=COLORS['success'],
            bg=COLORS['white']
        )
        self.total_label.pack(side='left')
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x')
        
        save_btn = create_styled_button(
            button_frame,
            text="💾 Guardar Cotización",
            command=self.save_quote,
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        print_btn = create_styled_button(
            button_frame,
            text="🖨️ Imprimir",
            command=self.print_current_quote,
            button_type='warning',
            width=15
        )
        print_btn.pack(side='left', padx=(0, 10))
        
        preview_btn = create_styled_button(
            button_frame,
            text="👁️ Vista Previa",
            command=self.preview_current_quote,
            button_type='info',
            width=15
        )
        preview_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame,
            text="❌ Cancelar",
            command=self.quote_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
        
        # Inicializar lista de items
        self.quote_items = []
        self.update_total()
    
    def load_clients_combo(self):
        """Cargar clientes en el combobox"""
        try:
            clients = self.db.fetch_all("SELECT id, name FROM clients ORDER BY name")
            client_list = [f"{client['id']} - {client['name']}" for client in clients]
            self.client_combo['values'] = client_list
        except Exception as e:
            print(f"Error cargando clientes: {e}")
    
    def load_products_combo(self):
        """Cargar productos en el combobox"""
        try:
            products = self.db.fetch_all("SELECT id, name, unit_price FROM products ORDER BY name")
            product_list = [f"{product['id']} - {product['name']} (${product['unit_price']:,.0f})" for product in products]
            self.product_combo['values'] = product_list
        except Exception as e:
            print(f"Error cargando productos: {e}")
    
    def add_quote_item(self):
        """Agregar item a la cotización"""
        try:
            # Validar campos
            product_text = self.product_var.get().strip()
            quantity = self.quantity_entry.get().strip()
            price = self.price_entry.get().strip()
            
            if not product_text or not quantity or not price:
                messagebox.showwarning("Advertencia", "Complete todos los campos del item")
                return
            
            # Obtener ID del producto
            product_id = int(product_text.split(' - ')[0])
            product_name = product_text.split(' - ')[1].split(' (')[0]
            
            # Convertir a números
            quantity = float(quantity)
            price = float(price)
            total = quantity * price
            
            # Agregar a la lista
            item = {
                'product_id': product_id,
                'product_name': product_name,
                'quantity': quantity,
                'price': price,
                'total': total
            }
            self.quote_items.append(item)
            
            # Agregar al treeview
            self.items_tree.insert('', 'end', values=(
                product_name,
                f"{quantity:.1f}",
                f"${price:,.0f}",
                f"${total:,.0f}"
            ))
            
            # Limpiar campos
            self.quantity_entry.delete(0, tk.END)
            self.price_entry.delete(0, tk.END)
            
            # Actualizar total
            self.update_total()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al agregar item: {str(e)}")
    
    def update_total(self):
        """Actualizar total de la cotización"""
        total = sum(item['total'] for item in self.quote_items)
        self.total_label.config(text=f"${total:,.0f}")
    
    def save_quote(self):
        """Guardar cotización en la base de datos"""
        try:
            # Validar campos obligatorios
            client_text = self.client_var.get().strip()
            description = self.description_entry.get().strip()
            
            if not client_text or not description:
                messagebox.showerror("Error", "Cliente y descripción son obligatorios")
                return
            
            if not self.quote_items:
                messagebox.showerror("Error", "Debe agregar al menos un item a la cotización")
                return
            
            # Obtener ID del cliente
            client_id = int(client_text.split(' - ')[0])
            
            # Calcular total
            total_amount = sum(item['total'] for item in self.quote_items)
            
            # Fecha de validez
            valid_until = self.valid_until_entry.get().strip()
            if not valid_until:
                valid_until = (datetime.now() + timedelta(days=30)).isoformat()
            else:
                valid_until = datetime.strptime(valid_until, '%Y-%m-%d').isoformat()
            
            # Insertar cotización
            quote_id = self.db.execute("""
                INSERT INTO quotes (client_id, description, total_amount, status, quote_date, valid_until)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (client_id, description, total_amount, 'Pendiente', datetime.now().isoformat(), valid_until))
            
            # Insertar items de la cotización
            for item in self.quote_items:
                self.db.execute("""
                    INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, total_price, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (quote_id.lastrowid, item['product_id'], item['quantity'], item['price'], item['total'], item['product_name']))
            
            messagebox.showinfo("Éxito", "Cotización creada correctamente")
            self.quote_form_window.destroy()
            self.load_quotes()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar cotización: {str(e)}")
    
    def edit_selected_quote(self, event=None):
        """Editar cotización seleccionada"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        messagebox.showinfo("Información", f"Editando cotización #{quote_id} - Funcionalidad en desarrollo")
    
    def delete_selected_quote(self):
        """Eliminar cotización seleccionada"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        client_name = self.quotes_tree.item(selection[0])['values'][1]
        
        # Confirmar eliminación
        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar la cotización de {client_name}?"):
            try:
                # Eliminar items de la cotización
                self.db.execute("DELETE FROM quote_items WHERE quote_id = ?", (quote_id,))
                
                # Eliminar cotización
                self.db.execute("DELETE FROM quotes WHERE id = ?", (quote_id,))
                
                messagebox.showinfo("Éxito", "Cotización eliminada correctamente")
                self.load_quotes()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar cotización: {str(e)}")
    
    def view_quote_details(self):
        """Ver detalles de la cotización seleccionada"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        client_name = self.quotes_tree.item(selection[0])['values'][1]
        
        # Obtener datos de la cotización
        quote = self.db.fetch_one("SELECT * FROM quotes WHERE id = ?", (quote_id,))
        if not quote:
            messagebox.showerror("Error", "Cotización no encontrada")
            return
        
        # Mostrar ventana de detalles
        details_window = tk.Toplevel(self.parent)
        details_window.title(f"Detalles - Cotización #{quote_id}")
        details_window.geometry("600x500")
        details_window.resizable(False, False)
        
        # Frame principal
        details_frame = create_styled_frame(details_window, bg=COLORS['white'])
        details_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            details_frame,
            text=f"📋 DETALLES COTIZACIÓN #{quote_id}",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Mostrar información
        quote_date = datetime.fromisoformat(quote['quote_date']).strftime('%Y-%m-%d') if quote['quote_date'] else ''
        valid_until = datetime.fromisoformat(quote['valid_until']).strftime('%Y-%m-%d') if quote['valid_until'] else ''
        
        info_text = f"""
📋 INFORMACIÓN DE LA COTIZACIÓN:
• Cliente: {client_name}
• Descripción: {quote['description'] or 'No especificado'}
• Estado: {quote['status'] or 'Pendiente'}
• Fecha: {quote_date}
• Válida hasta: {valid_until}
• Total: ${quote['total_amount']:,.0f} if quote['total_amount'] else 'No especificado'

📦 ITEMS DE LA COTIZACIÓN:
        """
        
        # Obtener items de la cotización
        items = self.db.fetch_all("SELECT * FROM quote_items WHERE quote_id = ?", (quote_id,))
        for item in items:
            info_text += f"• {item['description']} - Cantidad: {item['quantity']} - Precio: ${item['unit_price']:,.0f} - Total: ${item['total_price']:,.0f}\n"
        
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
    
    def print_selected_quote(self):
        """Imprimir cotización seleccionada"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        client_name = self.quotes_tree.item(selection[0])['values'][1]
        
        # Obtener datos de la cotización
        quote = self.db.fetch_one("SELECT * FROM quotes WHERE id = ?", (quote_id,))
        if not quote:
            messagebox.showerror("Error", "Cotización no encontrada")
            return
        
        # Obtener items de la cotización
        items = self.db.fetch_all("SELECT * FROM quote_items WHERE quote_id = ?", (quote_id,))
        
        # Generar contenido para impresión
        self.generate_print_content(quote, client_name, items, print_directly=True)
    
    def preview_quote(self):
        """Vista previa de cotización seleccionada"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        client_name = self.quotes_tree.item(selection[0])['values'][1]
        
        # Obtener datos de la cotización
        quote = self.db.fetch_one("SELECT * FROM quotes WHERE id = ?", (quote_id,))
        if not quote:
            messagebox.showerror("Error", "Cotización no encontrada")
            return
        
        # Obtener items de la cotización
        items = self.db.fetch_all("SELECT * FROM quote_items WHERE quote_id = ?", (quote_id,))
        
        # Mostrar vista previa
        self.show_print_preview(quote, client_name, items)
    
    def print_current_quote(self):
        """Imprimir cotización actual del formulario"""
        if not hasattr(self, 'quote_items') or not self.quote_items:
            messagebox.showwarning("Advertencia", "No hay items en la cotización para imprimir")
            return
        
        # Crear datos temporales para la cotización actual
        client_text = self.client_var.get().strip()
        if not client_text:
            messagebox.showwarning("Advertencia", "Seleccione un cliente")
            return
        
        client_name = client_text.split(' - ')[1] if ' - ' in client_text else client_text
        description = self.description_entry.get().strip()
        valid_until = self.valid_until_entry.get().strip()
        
        # Crear objeto quote temporal
        temp_quote = {
            'id': 'TEMP',
            'description': description,
            'total_amount': sum(item['total'] for item in self.quote_items),
            'quote_date': datetime.now().isoformat(),
            'valid_until': valid_until
        }
        
        # Generar contenido para impresión
        self.generate_print_content(temp_quote, client_name, self.quote_items, print_directly=True)
    
    def preview_current_quote(self):
        """Vista previa de cotización actual del formulario"""
        if not hasattr(self, 'quote_items') or not self.quote_items:
            messagebox.showwarning("Advertencia", "No hay items en la cotización para previsualizar")
            return
        
        # Crear datos temporales para la cotización actual
        client_text = self.client_var.get().strip()
        if not client_text:
            messagebox.showwarning("Advertencia", "Seleccione un cliente")
            return
        
        client_name = client_text.split(' - ')[1] if ' - ' in client_text else client_text
        description = self.description_entry.get().strip()
        valid_until = self.valid_until_entry.get().strip()
        
        # Crear objeto quote temporal
        temp_quote = {
            'id': 'TEMP',
            'description': description,
            'total_amount': sum(item['total'] for item in self.quote_items),
            'quote_date': datetime.now().isoformat(),
            'valid_until': valid_until
        }
        
        # Mostrar vista previa
        self.show_print_preview(temp_quote, client_name, self.quote_items)
    
    def generate_print_content(self, quote, client_name, items, print_directly=False):
        """Generar contenido para impresión"""
        try:
            # Crear ventana de impresión
            print_window = tk.Toplevel(self.parent)
            print_window.title("Imprimir Cotización")
            print_window.geometry("800x1000")
            print_window.configure(bg=COLORS['bg_primary'])
            
            # Frame principal
            print_frame = create_styled_frame(print_window, bg=COLORS['white'])
            print_frame.pack(fill='both', expand=True, padx=20, pady=20)
            
            # Header de la cotización
            header_frame = create_styled_frame(print_frame, bg=COLORS['primary'])
            header_frame.pack(fill='x', pady=(0, 20))
            
            # Título
            title_label = create_styled_label(
                header_frame,
                text="COTIZACIÓN DE SERVICIOS",
                font=FONTS['title'],
                fg=COLORS['text_light'],
                bg=COLORS['primary']
            )
            title_label.pack(pady=20)
            
            # Información de la empresa
            company_frame = create_styled_frame(print_frame, bg=COLORS['white'])
            company_frame.pack(fill='x', pady=(0, 20))
            
            company_info = """
TALLER MECÁNICO RESORTES PUERTO MONTT
Dirección: Av. Principal 123, Puerto Montt
Teléfono: +56 9 1234 5678
Email: info@tallermecanico.cl
            """
            
            company_label = create_styled_label(
                company_frame,
                text=company_info,
                font=FONTS['body'],
                fg=COLORS['text_primary'],
                bg=COLORS['white'],
                justify='left'
            )
            company_label.pack(anchor='w')
            
            # Información del cliente
            client_frame = create_styled_frame(print_frame, bg=COLORS['light_gray'])
            client_frame.pack(fill='x', pady=(0, 20))
            
            client_info = f"""
CLIENTE: {client_name}
FECHA: {datetime.now().strftime('%d/%m/%Y')}
VÁLIDA HASTA: {datetime.fromisoformat(quote['valid_until']).strftime('%d/%m/%Y') if quote['valid_until'] else 'No especificado'}
            """
            
            client_label = create_styled_label(
                client_frame,
                text=client_info,
                font=FONTS['body_bold'],
                fg=COLORS['text_primary'],
                bg=COLORS['light_gray'],
                justify='left'
            )
            client_label.pack(anchor='w', padx=20, pady=15)
            
            # Descripción
            if quote['description']:
                desc_frame = create_styled_frame(print_frame, bg=COLORS['white'])
                desc_frame.pack(fill='x', pady=(0, 20))
                
                desc_label = create_styled_label(
                    desc_frame,
                    text=f"DESCRIPCIÓN: {quote['description']}",
                    font=FONTS['body'],
                    fg=COLORS['text_primary'],
                    bg=COLORS['white'],
                    justify='left'
                )
                desc_label.pack(anchor='w')
            
            # Tabla de items
            items_frame = create_styled_frame(print_frame, bg=COLORS['white'])
            items_frame.pack(fill='x', pady=(0, 20))
            
            # Headers de la tabla
            headers_frame = create_styled_frame(items_frame, bg=COLORS['primary'])
            headers_frame.pack(fill='x')
            
            headers = ['Producto/Servicio', 'Cantidad', 'Precio Unit.', 'Total']
            for i, header in enumerate(headers):
                header_label = create_styled_label(
                    headers_frame,
                    text=header,
                    font=FONTS['body_bold'],
                    fg=COLORS['text_light'],
                    bg=COLORS['primary']
                )
                header_label.grid(row=0, column=i, padx=10, pady=10, sticky='ew')
            
            # Configurar columnas
            for i in range(len(headers)):
                headers_frame.grid_columnconfigure(i, weight=1)
            
            # Items de la cotización
            total_amount = 0
            for item in items:
                item_frame = create_styled_frame(items_frame, bg=COLORS['white'])
                item_frame.pack(fill='x')
                
                # Crear frame para el item
                item_data_frame = create_styled_frame(item_frame, bg=COLORS['white'])
                item_data_frame.pack(fill='x')
                
                # Datos del item
                item_data = [
                    item['description'] or '',
                    f"{item['quantity']:.1f}",
                    f"${item['unit_price']:,.0f}",
                    f"${item['total_price']:,.0f}"
                ]
                
                for i, data in enumerate(item_data):
                    data_label = create_styled_label(
                        item_data_frame,
                        text=data,
                        font=FONTS['body'],
                        fg=COLORS['text_primary'],
                        bg=COLORS['white']
                    )
                    data_label.grid(row=0, column=i, padx=10, pady=5, sticky='ew')
                
                # Configurar columnas
                for i in range(len(item_data)):
                    item_data_frame.grid_columnconfigure(i, weight=1)
                
                total_amount += item['total_price']
            
            # Total
            total_frame = create_styled_frame(print_frame, bg=COLORS['light_gray'])
            total_frame.pack(fill='x', pady=(0, 20))
            
            total_label = create_styled_label(
                total_frame,
                text=f"TOTAL: ${total_amount:,.0f}",
                font=FONTS['title'],
                fg=COLORS['primary'],
                bg=COLORS['light_gray']
            )
            total_label.pack(pady=20)
            
            # Botones
            button_frame = create_styled_frame(print_frame, bg=COLORS['white'])
            button_frame.pack(fill='x', pady=(20, 0))
            
            if print_directly:
                print_btn = create_styled_button(
                    button_frame,
                    text="🖨️ Imprimir",
                    command=lambda: self.print_window(print_window),
                    button_type='success',
                    width=15
                )
                print_btn.pack(side='left', padx=(0, 10))
            
            close_btn = create_styled_button(
                button_frame,
                text="❌ Cerrar",
                command=print_window.destroy,
                button_type='secondary',
                width=15
            )
            close_btn.pack(side='left')
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al generar contenido de impresión: {str(e)}")
    
    def show_print_preview(self, quote, client_name, items):
        """Mostrar vista previa de impresión"""
        self.generate_print_content(quote, client_name, items, print_directly=False)
    
    def print_window(self, window):
        """Imprimir la ventana actual"""
        try:
            # Esta función simula la impresión
            # En una implementación real, usarías una librería como reportlab
            messagebox.showinfo("Impresión", "Cotización enviada a la impresora")
            window.destroy()
        except Exception as e:
            messagebox.showerror("Error", f"Error al imprimir: {str(e)}")
    
    def convert_to_sale(self):
        """Convertir cotización a venta"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        client_name = self.quotes_tree.item(selection[0])['values'][1]
        
        if messagebox.askyesno("Confirmar", f"¿Convertir cotización de {client_name} en venta?"):
            try:
                # Actualizar estado de la cotización
                self.db.execute("UPDATE quotes SET status = 'Aprobada' WHERE id = ?", (quote_id,))
                
                messagebox.showinfo("Éxito", "Cotización convertida a venta correctamente")
                self.load_quotes()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error al convertir cotización: {str(e)}")