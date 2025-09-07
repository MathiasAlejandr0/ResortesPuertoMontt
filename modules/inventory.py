import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime
import sqlite3
import pandas as pd
import os
from .styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS
from .remainders import RemaindersManager
from .analytics import ProductAnalytics, StockAlerts

class InventoryModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.data_loaded = False
        
        # Inicializar gestores
        self.remainders_manager = RemaindersManager(db)
        self.analytics = ProductAnalytics(db)
        self.alerts = StockAlerts(db)
        
        self.create_widgets()
        # Cargar datos después de crear la interfaz
        self.parent.after(100, self.load_products_async)
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📦 GESTIÓN DE INVENTARIO", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para agregar producto
        add_product_btn = create_styled_button(
            button_frame, 
            text="➕ Nuevo Producto", 
            command=self.show_product_form,
            button_type='success',
            width=15
        )
        add_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para editar producto
        edit_product_btn = create_styled_button(
            button_frame, 
            text="✏️ Editar",
            command=self.edit_selected_product,
            button_type='primary',
            width=12
        )
        edit_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para eliminar producto
        delete_product_btn = create_styled_button(
            button_frame,
            text="🗑️ Eliminar",
            command=self.delete_selected_product,
            button_type='danger',
            width=12
        )
        delete_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver detalles
        view_product_btn = create_styled_button(
            button_frame,
            text="👁️ Ver Detalles",
            command=self.view_product_details,
            button_type='info',
            width=12
        )
        view_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para importar Excel
        import_excel_btn = create_styled_button(
            button_frame, 
            text="📊 Importar Excel",
            command=self.import_excel,
            button_type='warning',
            width=15
        )
        import_excel_btn.pack(side='left', padx=(0, 10))
        
        # Botón para exportar Excel
        export_excel_btn = create_styled_button(
            button_frame, 
            text="📤 Exportar Excel",
            command=self.export_excel,
            button_type='secondary',
            width=15
        )
        export_excel_btn.pack(side='left', padx=(0, 10))
        
        # Botón para sobrantes
        remainders_btn = create_styled_button(
            button_frame, 
            text="📦 Sobrantes",
            command=self.show_remainders,
            button_type='info',
            width=12
        )
        remainders_btn.pack(side='left', padx=(0, 10))
        
        # Botón para análisis
        analytics_btn = create_styled_button(
            button_frame, 
            text="⭐ Análisis",
            command=self.show_analytics,
            button_type='warning',
            width=12
        )
        analytics_btn.pack(side='left', padx=(0, 10))
        
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
        
        self.product_search_entry = create_styled_entry(
            search_frame,
            width=50
        )
        self.product_search_entry.pack(side='left', padx=(0, 10))
        self.product_search_entry.bind('<KeyRelease>', self.search_products)
        
        # Botón limpiar búsqueda
        clear_search_btn = create_styled_button(
            search_frame,
            text="🗑️ Limpiar",
            command=self.clear_search,
            button_type='secondary',
            width=10
        )
        clear_search_btn.pack(side='left', padx=(10, 0))
        
        # Treeview para mostrar productos
        columns = ('ID', 'Código', 'Nombre', 'Descripción', 'Precio', 'Stock', 'Stock Mín', 'Categoría')
        self.products_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=15)
        
        # Configurar columnas
        for col in columns:
            self.products_tree.heading(col, text=col)
            self.products_tree.column(col, width=120, anchor='center')
        
        # Scrollbar para el treeview
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=self.products_tree.yview)
        self.products_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview y scrollbar
        self.products_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble clic para editar
        self.products_tree.bind('<Double-1>', self.edit_selected_product)
        
        # Frame para estadísticas
        stats_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        stats_frame.pack(fill='x', pady=(15, 0))
        
        # Mostrar estadísticas
        self.show_inventory_stats(stats_frame)
    
    def show_inventory_stats(self, parent_frame):
        """Mostrar estadísticas de inventario"""
        try:
            total_products = len(self.db.fetch_all("SELECT * FROM products"))
            low_stock = len(self.db.fetch_all("SELECT * FROM products WHERE stock <= min_stock"))
            total_value = sum([p['unit_price'] * p['stock'] for p in self.db.fetch_all("SELECT unit_price, stock FROM products")])
            
            stats_text = f"📊 Total Productos: {total_products} | ⚠️ Stock Bajo: {low_stock} | 💰 Valor Total: ${total_value:,.0f}"
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
    
    def load_products_async(self):
        """Cargar productos de forma asíncrona"""
        try:
            # Obtener productos
            products = self.db.fetch_all("SELECT * FROM products ORDER BY name")
            
            # Si no hay productos, crear algunos de ejemplo
            if not products:
                self.create_sample_products()
                products = self.db.fetch_all("SELECT * FROM products ORDER BY name")
            
            # Limpiar treeview
            for item in self.products_tree.get_children():
                self.products_tree.delete(item)
            
            # Insertar datos en lotes para mejor rendimiento
            batch_size = 50
            for i in range(0, len(products), batch_size):
                batch = products[i:i + batch_size]
                for product in batch:
                    # Resaltar productos con stock bajo
                    tags = []
                    if product['stock'] <= product['min_stock']:
                        tags = ['low_stock']
                    
                    self.products_tree.insert('', 'end', values=(
                        product['id'],
                        product['code'] or '',
                        product['name'] or '',
                        product['description'] or '',
                        f"${product['unit_price']:,.0f}" if product['unit_price'] else '$0',
                        product['stock'] or 0,
                        product['min_stock'] or 0,
                        product['category'] or ''
                    ), tags=tags)
                
                # Actualizar interfaz cada lote
                if i + batch_size < len(products):
                    self.parent.update()
            
            # Configurar colores para stock bajo
            self.products_tree.tag_configure('low_stock', background='#ffebee')
            
            self.data_loaded = True
            self.show_inventory_stats()
                
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar productos: {str(e)}")
    
    def load_products(self):
        """Cargar productos en el treeview (método síncrono para compatibilidad)"""
        if not self.data_loaded:
            self.load_products_async()
        else:
            # Si ya están cargados, solo refrescar
            self.load_products_async()
    
    def create_sample_products(self):
        """Crear productos de ejemplo"""
        sample_products = [
            ('FILT001', 'Filtro de Aceite', 'Filtro de aceite para motor 1.6L', 'FILT001', 15000, 50, 10, 'Filtros'),
            ('ACEI001', 'Aceite Motor 5W30', 'Aceite sintético 5W30 4L', 'ACEI001', 25000, 30, 5, 'Aceites'),
            ('FREN001', 'Pastillas de Freno', 'Pastillas de freno delanteras', 'FREN001', 35000, 20, 5, 'Frenos'),
            ('BATE001', 'Batería 12V 60Ah', 'Batería de auto 12V 60Ah', 'BATE001', 80000, 15, 3, 'Baterías'),
            ('NEUM001', 'Neumático 185/65R15', 'Neumático radial 185/65R15', 'NEUM001', 45000, 8, 2, 'Neumáticos'),
            ('AMOR001', 'Amortiguador Delantero', 'Amortiguador delantero izquierdo', 'AMOR001', 120000, 2, 5, 'Suspensión'),
            ('DISK001', 'Disco de Freno', 'Disco de freno delantero', 'DISK001', 45000, 12, 3, 'Frenos'),
            ('BOMB001', 'Bomba de Agua', 'Bomba de agua para motor', 'BOMB001', 65000, 5, 2, 'Motor')
        ]
        
        for product_data in sample_products:
            self.db.execute("""
                INSERT INTO products (code, name, description, lot, unit_price, stock, min_stock, category, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (*product_data, datetime.now().isoformat()))
    
    def search_products(self, event=None):
        """Buscar productos"""
        search_term = self.product_search_entry.get().lower()
        
        for item in self.products_tree.get_children():
            self.products_tree.delete(item)
        
        if not search_term:
            self.load_products()
            return
        
        try:
            # Buscar productos
            products = self.db.fetch_all("""
                SELECT * FROM products 
                WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?
                ORDER BY name
            """, (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
            
            for product in products:
                tags = []
                if product['stock'] <= product['min_stock']:
                    tags = ['low_stock']
                
                self.products_tree.insert('', 'end', values=(
                    product['id'],
                    product['code'] or '',
                    product['name'] or '',
                    product['description'] or '',
                    f"${product['unit_price']:,.0f}" if product['unit_price'] else '$0',
                    product['stock'] or 0,
                    product['min_stock'] or 0,
                    product['category'] or ''
                ), tags=tags)
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar productos: {str(e)}")
    
    def clear_search(self):
        """Limpiar búsqueda"""
        self.product_search_entry.delete(0, tk.END)
        self.load_products()
    
    def show_product_form(self):
        """Mostrar formulario para agregar producto"""
        self.product_form_window = tk.Toplevel(self.parent)
        self.product_form_window.title("Nuevo Producto")
        self.product_form_window.geometry("600x700")
        self.product_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.product_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="📝 NUEVO PRODUCTO",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Código *', 'code'),
            ('Nombre *', 'name'),
            ('Descripción', 'description'),
            ('Lote', 'lot'),
            ('Precio Unitario *', 'unit_price'),
            ('Stock Inicial', 'stock'),
            ('Stock Mínimo', 'min_stock'),
            ('Stock Máximo', 'max_stock'),
            ('Categoría', 'category')
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
            
            # Entry
            entry = create_styled_entry(form_frame, width=50)
            entry.pack(fill='x', pady=(0, 10))
            self.form_entries[field_name] = entry
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(20, 0))
        
        save_btn = create_styled_button(
            button_frame, 
            text="💾 Guardar Producto",
            command=self.save_product,
            button_type='success',
            width=20
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="❌ Cancelar", 
            command=self.product_form_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def save_product(self):
        """Guardar producto en la base de datos"""
        try:
            # Validar campos obligatorios
            code = self.form_entries['code'].get().strip()
            name = self.form_entries['name'].get().strip()
            unit_price = self.form_entries['unit_price'].get().strip()
            
            if not code or not name or not unit_price:
                messagebox.showerror("Error", "Código, nombre y precio son obligatorios")
                return
            
            # Convertir precio a float
            try:
                unit_price = float(unit_price)
            except ValueError:
                messagebox.showerror("Error", "El precio debe ser un número válido")
                return
            
            # Obtener datos del formulario
            description = self.form_entries['description'].get().strip()
            lot = self.form_entries['lot'].get().strip()
            stock = self.form_entries['stock'].get().strip() or '0'
            min_stock = self.form_entries['min_stock'].get().strip() or '0'
            max_stock = self.form_entries['max_stock'].get().strip() or '1000'
            category = self.form_entries['category'].get().strip()
            
            # Convertir números
            try:
                stock = int(stock)
                min_stock = int(min_stock)
                max_stock = int(max_stock)
            except ValueError:
                messagebox.showerror("Error", "Los valores de stock deben ser números enteros")
                return
            
            # Insertar producto en la base de datos
            self.db.execute("""
                INSERT INTO products (code, name, description, lot, unit_price, stock, min_stock, max_stock, category, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (code, name, description, lot, unit_price, stock, min_stock, max_stock, category, datetime.now().isoformat()))
            
            messagebox.showinfo("Éxito", "Producto agregado correctamente")
            self.product_form_window.destroy()
            self.load_products()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar producto: {str(e)}")
    
    def edit_selected_product(self, event=None):
        """Editar producto seleccionado"""
        selection = self.products_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un producto")
            return
        
        product_id = self.products_tree.item(selection[0])['values'][0]
        
        # Obtener datos del producto
        product = self.db.fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
        if not product:
            messagebox.showerror("Error", "Producto no encontrado")
            return
        
        # Mostrar formulario de edición
        self.edit_product_form(product)
    
    def edit_product_form(self, product):
        """Mostrar formulario para editar producto"""
        self.edit_form_window = tk.Toplevel(self.parent)
        self.edit_form_window.title("Editar Producto")
        self.edit_form_window.geometry("600x700")
        self.edit_form_window.resizable(False, False)
        
        # Frame principal del formulario
        form_frame = create_styled_frame(self.edit_form_window, bg=COLORS['white'])
        form_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            form_frame,
            text="✏️ EDITAR PRODUCTO",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario
        fields = [
            ('Código *', 'code'),
            ('Nombre *', 'name'),
            ('Descripción', 'description'),
            ('Lote', 'lot'),
            ('Precio Unitario *', 'unit_price'),
            ('Stock Inicial', 'stock'),
            ('Stock Mínimo', 'min_stock'),
            ('Stock Máximo', 'max_stock'),
            ('Categoría', 'category')
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
            
            # Entry con valor actual
            entry = create_styled_entry(form_frame, width=50)
            entry.insert(0, str(product[field_name]) if product[field_name] is not None else '')
            entry.pack(fill='x', pady=(0, 10))
            self.edit_entries[field_name] = entry
        
        # Botones
        button_frame = create_styled_frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(20, 0))
        
        save_btn = create_styled_button(
            button_frame,
            text="💾 Actualizar Producto",
            command=lambda: self.update_product(product['id']),
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
    
    def update_product(self, product_id):
        """Actualizar producto en la base de datos"""
        try:
            # Validar campos obligatorios
            code = self.edit_entries['code'].get().strip()
            name = self.edit_entries['name'].get().strip()
            unit_price = self.edit_entries['unit_price'].get().strip()
            
            if not code or not name or not unit_price:
                messagebox.showerror("Error", "Código, nombre y precio son obligatorios")
                return
            
            # Convertir precio a float
            try:
                unit_price = float(unit_price)
            except ValueError:
                messagebox.showerror("Error", "El precio debe ser un número válido")
                return
            
            # Obtener datos del formulario
            description = self.edit_entries['description'].get().strip()
            lot = self.edit_entries['lot'].get().strip()
            stock = self.edit_entries['stock'].get().strip() or '0'
            min_stock = self.edit_entries['min_stock'].get().strip() or '0'
            max_stock = self.edit_entries['max_stock'].get().strip() or '1000'
            category = self.edit_entries['category'].get().strip()
            
            # Convertir números
            try:
                stock = int(stock)
                min_stock = int(min_stock)
                max_stock = int(max_stock)
            except ValueError:
                messagebox.showerror("Error", "Los valores de stock deben ser números enteros")
                return
            
            # Actualizar producto en la base de datos
            self.db.execute("""
                UPDATE products 
                SET code = ?, name = ?, description = ?, lot = ?, unit_price = ?, stock = ?, min_stock = ?, max_stock = ?, category = ?
                WHERE id = ?
            """, (code, name, description, lot, unit_price, stock, min_stock, max_stock, category, product_id))
            
            messagebox.showinfo("Éxito", "Producto actualizado correctamente")
            self.edit_form_window.destroy()
            self.load_products()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al actualizar producto: {str(e)}")
    
    def delete_selected_product(self):
        """Eliminar producto seleccionado"""
        selection = self.products_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un producto")
            return
        
        product_id = self.products_tree.item(selection[0])['values'][0]
        product_name = self.products_tree.item(selection[0])['values'][2]
        
        # Confirmar eliminación
        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar el producto {product_name}?"):
            try:
                # Eliminar producto de la base de datos
                self.db.execute("DELETE FROM products WHERE id = ?", (product_id,))
                
                messagebox.showinfo("Éxito", "Producto eliminado correctamente")
                self.load_products()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar producto: {str(e)}")
    
    def view_product_details(self):
        """Ver detalles del producto seleccionado"""
        selection = self.products_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Por favor seleccione un producto")
            return
        
        product_id = self.products_tree.item(selection[0])['values'][0]
        product_name = self.products_tree.item(selection[0])['values'][2]
        
        # Obtener datos del producto
        product = self.db.fetch_one("SELECT * FROM products WHERE id = ?", (product_id,))
        if not product:
            messagebox.showerror("Error", "Producto no encontrado")
            return
        
        # Mostrar ventana de detalles
        details_window = tk.Toplevel(self.parent)
        details_window.title(f"Detalles - {product_name}")
        details_window.geometry("500x600")
        details_window.resizable(False, False)
        
        # Frame principal
        details_frame = create_styled_frame(details_window, bg=COLORS['white'])
        details_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            details_frame,
            text=f"📦 DETALLES DE {product_name.upper()}",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Mostrar información
        stock_status = "⚠️ STOCK BAJO" if product['stock'] <= product['min_stock'] else "✅ Stock OK"
        stock_color = COLORS['error'] if product['stock'] <= product['min_stock'] else COLORS['success']
        
        info_text = f"""
📋 INFORMACIÓN DEL PRODUCTO:
• Código: {product['code'] or 'No especificado'}
• Nombre: {product['name'] or 'No especificado'}
• Descripción: {product['description'] or 'No especificado'}
• Lote: {product['lot'] or 'No especificado'}

💰 INFORMACIÓN COMERCIAL:
• Precio Unitario: ${product['unit_price']:,.0f} if product['unit_price'] else 'No especificado'
• Categoría: {product['category'] or 'No especificado'}

📊 CONTROL DE STOCK:
• Stock Actual: {product['stock'] or 0} unidades
• Stock Mínimo: {product['min_stock'] or 0} unidades
• Stock Máximo: {product['max_stock'] or 0} unidades
• Estado: {stock_status}

📅 FECHA DE REGISTRO:
• {product['created_at'] or 'No especificado'}
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
    
    def import_excel(self):
        """Importar productos desde archivo Excel"""
        try:
            # Abrir diálogo para seleccionar archivo
            file_path = filedialog.askopenfilename(
                title="Seleccionar archivo Excel",
                filetypes=[("Excel files", "*.xlsx *.xls"), ("All files", "*.*")]
            )
            
            if not file_path:
                return
            
            # Leer archivo Excel
            df = pd.read_excel(file_path)
            
            # Validar columnas requeridas
            required_columns = ['codigo', 'nombre', 'precio']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                messagebox.showerror("Error", f"El archivo Excel debe contener las columnas: {', '.join(missing_columns)}")
                return
            
            # Procesar cada fila
            imported_count = 0
            for index, row in df.iterrows():
                try:
                    # Obtener datos de la fila
                    code = str(row['codigo']).strip()
                    name = str(row['nombre']).strip()
                    price = float(row['precio'])
                    
                    # Campos opcionales
                    description = str(row.get('descripcion', '')).strip()
                    lot = str(row.get('lote', '')).strip()
                    stock = int(row.get('stock', 0))
                    min_stock = int(row.get('stock_minimo', 0))
                    max_stock = int(row.get('stock_maximo', 1000))
                    category = str(row.get('categoria', '')).strip()
                    
                    # Insertar producto
                    self.db.execute("""
                        INSERT OR REPLACE INTO products (code, name, description, lot, unit_price, stock, min_stock, max_stock, category, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (code, name, description, lot, price, stock, min_stock, max_stock, category, datetime.now().isoformat()))
                    
                    imported_count += 1
                    
                except Exception as e:
                    print(f"Error procesando fila {index + 1}: {e}")
                    continue
            
            messagebox.showinfo("Éxito", f"Se importaron {imported_count} productos correctamente")
            self.load_products()
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al importar archivo Excel: {str(e)}")
    
    def show_remainders(self):
        """Mostrar módulo de sobrantes"""
        from .remainders import RemaindersModule
        
        # Crear ventana para sobrantes
        remainders_window = tk.Toplevel(self.frame)
        remainders_window.title("Gestión de Sobrantes")
        remainders_window.geometry("1000x600")
        remainders_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        remainders_window.update_idletasks()
        x = (remainders_window.winfo_screenwidth() // 2) - (1000 // 2)
        y = (remainders_window.winfo_screenheight() // 2) - (600 // 2)
        remainders_window.geometry(f"1000x600+{x}+{y}")
        
        # Crear módulo de sobrantes
        remainders_module = RemaindersModule(remainders_window, self.db, self.user_role)
        remainders_module.frame.pack(fill='both', expand=True)
    
    def show_analytics(self):
        """Mostrar módulo de análisis"""
        from .analytics import AnalyticsModule
        
        # Crear ventana para análisis
        analytics_window = tk.Toplevel(self.frame)
        analytics_window.title("Análisis de Productos")
        analytics_window.geometry("1200x700")
        analytics_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        analytics_window.update_idletasks()
        x = (analytics_window.winfo_screenwidth() // 2) - (1200 // 2)
        y = (analytics_window.winfo_screenheight() // 2) - (700 // 2)
        analytics_window.geometry(f"1200x700+{x}+{y}")
        
        # Crear módulo de análisis
        analytics_module = AnalyticsModule(analytics_window, self.db, self.user_role)
        analytics_module.frame.pack(fill='both', expand=True)
    
    def export_excel(self):
        """Exportar productos a archivo Excel"""
        try:
            # Obtener todos los productos
            products = self.db.fetch_all("SELECT * FROM products ORDER BY name")
            
            if not products:
                messagebox.showwarning("Advertencia", "No hay productos para exportar")
                return
            
            # Crear DataFrame
            data = []
            for product in products:
                data.append({
                    'ID': product['id'],
                    'Código': product['code'],
                    'Nombre': product['name'],
                    'Descripción': product['description'],
                    'Lote': product['lot'],
                    'Precio': product['unit_price'],
                    'Stock': product['stock'],
                    'Stock Mínimo': product['min_stock'],
                    'Stock Máximo': product['max_stock'],
                    'Categoría': product['category'],
                    'Fecha Creación': product['created_at']
                })
            
            df = pd.DataFrame(data)
            
            # Abrir diálogo para guardar archivo
            file_path = filedialog.asksaveasfilename(
                title="Guardar archivo Excel",
                defaultextension=".xlsx",
                filetypes=[("Excel files", "*.xlsx"), ("All files", "*.*")]
            )
            
            if not file_path:
                return
            
            # Guardar archivo
            df.to_excel(file_path, index=False)
            
            messagebox.showinfo("Éxito", f"Se exportaron {len(products)} productos a {file_path}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al exportar archivo Excel: {str(e)}")