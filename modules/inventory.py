import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime
import sqlite3
import pandas as pd
import os
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, create_centered_content, create_card_frame, COLORS, FONTS
from modules.remainders import RemaindersManager
from modules.analytics import ProductAnalytics, StockAlerts

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
        """Crear todos los widgets del módulo estandarizado"""
        # Frame principal simple
        main_frame = tk.Frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Header
        header_frame = tk.Frame(main_frame, bg=COLORS['primary'])
        header_frame.pack(fill='x', pady=(0, 20))
        
        # Título
        title_label = tk.Label(
            header_frame, 
            text="📦 GESTIÓN DE INVENTARIO", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(pady=(15, 5))
        
        # Subtítulo
        subtitle_label = tk.Label(
            header_frame,
            text="Administra tu inventario de productos y repuestos",
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
        add_btn = create_styled_button(button_frame, text="+ Nuevo Producto", command=self.show_product_form, button_type='success', width=15)
        add_btn.pack(side='left', padx=20, pady=15)
        
        edit_btn = create_styled_button(button_frame, text="Editar", command=self.edit_selected_product, button_type='danger', width=10)
        edit_btn.pack(side='left', padx=(0, 10), pady=15)
        
        delete_btn = create_styled_button(button_frame, text="Eliminar", command=self.delete_selected_product, button_type='danger', width=10)
        delete_btn.pack(side='left', padx=(0, 10), pady=15)
        
        view_btn = create_styled_button(button_frame, text="Ver Detalles", command=self.view_product_details, button_type='info', width=12)
        view_btn.pack(side='left', padx=(0, 10), pady=15)
        
        import_btn = create_styled_button(button_frame, text="Importar Excel", command=self.import_excel, button_type='warning', width=15)
        import_btn.pack(side='left', padx=(0, 20), pady=15)
        
        # Barra de búsqueda
        search_frame = tk.Frame(main_frame, bg=COLORS['white'])
        search_frame.pack(fill='x', padx=20, pady=(0, 15))
        
        search_label = tk.Label(search_frame, text="Buscar:", font=FONTS['body'], bg=COLORS['white'], fg=COLORS['text_primary'])
        search_label.pack(side='left', padx=(0, 10), pady=10)
        
        self.product_search_entry = tk.Entry(search_frame, font=FONTS['body'], width=50)
        self.product_search_entry.pack(side='left', fill='x', expand=True, padx=(0, 10), pady=10)
        self.product_search_entry.bind('<KeyRelease>', self.search_products)
        
        clear_btn = create_styled_button(search_frame, text="🗑️", command=self.clear_search, button_type='secondary', width=3)
        clear_btn.pack(side='right', pady=10)
        
        # Tabla de productos
        table_frame = tk.Frame(main_frame, bg=COLORS['white'])
        table_frame.pack(fill='both', expand=True, pady=(0, 15))
        
        # Crear Treeview
        columns = ('ID', 'Código', 'Nombre', 'Descripción', 'Precio', 'Stock', 'Mínimo', 'Categoría')
        self.products_tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show='headings',
            height=15
        )
        
        # Configurar columnas
        column_widths = [50, 80, 150, 200, 80, 60, 60, 100]
        for i, col in enumerate(columns):
            self.products_tree.heading(col, text=col)
            self.products_tree.column(col, width=column_widths[i], anchor='center')
        
        # Scrollbar para la tabla
        scrollbar = ttk.Scrollbar(table_frame, orient='vertical', command=self.products_tree.yview)
        self.products_tree.configure(yscrollcommand=scrollbar.set)
        
        # Empaquetar tabla y scrollbar
        self.products_tree.pack(side='left', fill='both', expand=True, padx=20, pady=20)
        scrollbar.pack(side='right', fill='y', pady=20)
        
        # Configurar eventos
        self.products_tree.bind('<Double-1>', lambda e: self.view_product_details())
        self.product_search_entry.bind('<Return>', lambda e: self.search_products())
        
        # Mostrar mensaje si no hay datos
        self.show_inventory_stats(main_frame)
    
    def load_products_async(self):
        """Cargar productos de forma asíncrona"""
        try:
            products = self.db.fetch_all("SELECT * FROM products ORDER BY name")
            
            # Si no hay productos, crear datos de muestra
            if not products:
                self.create_sample_products()
                products = self.db.fetch_all("SELECT * FROM products ORDER BY name")
            
            self.products_tree.delete(*self.products_tree.get_children())
            
            for product in products:
                # Formatear precio
                price = f"${product['sale_price']:,.0f}" if product['sale_price'] else "$0"
                
                # Truncar descripción
                description = product['description'][:50] + "..." if product['description'] and len(product['description']) > 50 else (product['description'] or "")
                
                # Determinar tags para colorear
                tags = []
                if product['stock'] <= product['min_stock']:
                    tags.append('low_stock')
                if product['stock'] == 0:
                    tags.append('out_of_stock')
                
                self.products_tree.insert('', 'end', values=(
                    product['id'],
                    product.get('sku') or product.get('code') or '',
                    product['name'],
                    description,
                    price,
                    product['stock'],
                    product['min_stock'],
                    product['category'] or ''
                ), tags=tags)
            
            # Configurar colores de tags
            self.products_tree.tag_configure('low_stock', background='#fff3cd')
            self.products_tree.tag_configure('out_of_stock', background='#f8d7da')
            
            self.data_loaded = True
                
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar productos: {str(e)}")
    
    def create_sample_products(self):
        """Crear productos de muestra si no existen"""
        try:
            sample_products = [
                {
                    'name': 'Filtro de Aceite Motor',
                    'sku': 'FIL-001',
                    'category': 'Filtros',
                    'brand': 'Mann-Filter',
                    'purchase_price': 8500,
                    'sale_price': 12000,
                    'stock': 25,
                    'min_stock': 5,
                    'supplier': 'Distribuidora Auto Parts',
                    'location': 'Estante A-1',
                    'description': 'Filtro de aceite para motores 4 cilindros'
                },
                {
                    'name': 'Pastillas de Freno Delanteras',
                    'sku': 'PAS-002',
                    'category': 'Frenos',
                    'brand': 'Brembo',
                    'purchase_price': 25000,
                    'sale_price': 35000,
                    'stock': 15,
                    'min_stock': 3,
                    'supplier': 'Frenos Chile',
                    'location': 'Estante B-2',
                    'description': 'Pastillas de freno delanteras para vehículos medianos'
                },
                {
                    'name': 'Amortiguador Trasero',
                    'sku': 'AMO-003',
                    'category': 'Suspensión',
                    'brand': 'Monroe',
                    'purchase_price': 45000,
                    'sale_price': 65000,
                    'stock': 8,
                    'min_stock': 2,
                    'supplier': 'Suspensión Total',
                    'location': 'Estante C-3',
                    'description': 'Amortiguador trasero para vehículos compactos'
                },
                {
                    'name': 'Bujía de Encendido',
                    'sku': 'BUJ-004',
                    'category': 'Encendido',
                    'brand': 'NGK',
                    'purchase_price': 3500,
                    'sale_price': 5500,
                    'stock': 50,
                    'min_stock': 10,
                    'supplier': 'Encendido Pro',
                    'location': 'Estante D-1',
                    'description': 'Bujía de encendido estándar'
                },
                {
                    'name': 'Correa de Distribución',
                    'sku': 'COR-005',
                    'category': 'Motor',
                    'brand': 'Gates',
                    'purchase_price': 18000,
                    'sale_price': 28000,
                    'stock': 12,
                    'min_stock': 3,
                    'supplier': 'Motor Parts',
                    'location': 'Estante E-2',
                    'description': 'Correa de distribución para motores 1.6L'
                }
            ]
            
            for product_data in sample_products:
                self.db.execute("""
                    INSERT INTO products (name, sku, category, brand, purchase_price, 
                                        sale_price, stock, min_stock, supplier, location, description, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    product_data['name'],
                    product_data['sku'],
                    product_data['category'],
                    product_data['brand'],
                    product_data['purchase_price'],
                    product_data['sale_price'],
                    product_data['stock'],
                    product_data['min_stock'],
                    product_data['supplier'],
                    product_data['location'],
                    product_data['description'],
                    datetime.now().isoformat()
                ))
            
            print("Productos de muestra creados exitosamente")
                
        except Exception as e:
            print(f"Error creando productos de muestra: {e}")
    
    def search_products(self):
        """Buscar productos"""
        try:
            search_term = self.product_search_entry.get().strip()
            if not search_term or search_term == "Buscar productos...":
                self.load_products_async()
                return
            
            # Buscar productos
            products = self.db.fetch_all("""
                SELECT * FROM products 
                WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? OR brand LIKE ?
                ORDER BY name
            """, (f"%{search_term}%", f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"))
            
            self.products_tree.delete(*self.products_tree.get_children())
            
            for product in products:
                price = f"${product['sale_price']:,.0f}" if product['sale_price'] else "$0"
                description = product['description'][:50] + "..." if product['description'] and len(product['description']) > 50 else (product['description'] or "")
                
                tags = []
                if product['stock'] <= product['min_stock']:
                    tags.append('low_stock')
                if product['stock'] == 0:
                    tags.append('out_of_stock')
                
                self.products_tree.insert('', 'end', values=(
                    product['id'],
                    product.get('sku') or product.get('code') or '',
                    product['name'],
                    description,
                    price,
                    product['stock'],
                    product['min_stock'],
                    product['category'] or ''
                ), tags=tags)
                
        except Exception as e:
            messagebox.showerror("Error", f"Error al buscar productos: {str(e)}")
    
    def show_product_form(self):
        """Mostrar formulario para agregar/editar producto"""
        self.create_product_form()
    
    def create_product_form(self):
        """Crear formulario para agregar producto"""
        # Limpiar contenido
        for widget in self.frame.winfo_children():
            widget.destroy()
        
        # Frame principal con scroll
        main_frame = tk.Frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True)
        
        # Canvas para scroll
        canvas = tk.Canvas(main_frame, bg=COLORS['bg_primary'], highlightthickness=0)
        scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=COLORS['bg_primary'])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Contenedor centrado
        center_container = tk.Frame(scrollable_frame, bg=COLORS['bg_primary'])
        center_container.pack(expand=True, fill='both', padx=50, pady=20)
        
        # Header
        header_frame = tk.Frame(center_container, bg=COLORS['primary'])
        header_frame.pack(fill='x', pady=(0, 20))
        
        title_label = tk.Label(
            header_frame,
            text="➕ NUEVO PRODUCTO", 
            font=('Segoe UI', 18, 'bold'),
            fg='white',
            bg=COLORS['primary']
        )
        title_label.pack(pady=15)
        
        subtitle_label = tk.Label(
            header_frame,
            text="Complete la información del producto",
            font=('Segoe UI', 12),
            fg='white',
            bg=COLORS['primary']
        )
        subtitle_label.pack(pady=(0, 15))
        
        # Formulario
        form_frame = tk.Frame(center_container, bg=COLORS['white'], relief='solid', bd=1)
        form_frame.pack(fill='x', pady=(0, 20))
        
        # Campos del formulario en dos columnas
        left_column = tk.Frame(form_frame, bg=COLORS['white'])
        left_column.pack(side='left', fill='both', expand=True, padx=20, pady=20)
        
        right_column = tk.Frame(form_frame, bg=COLORS['white'])
        right_column.pack(side='right', fill='both', expand=True, padx=20, pady=20)
        
        # Campos izquierda
        left_fields = [
            ('Nombre del Producto *', 'name'),
            ('Código/SKU', 'sku'),
            ('Categoría', 'category'),
            ('Marca', 'brand'),
            ('Precio de Compra', 'purchase_price')
        ]
        
        # Campos derecha
        right_fields = [
            ('Precio de Venta', 'sale_price'),
            ('Stock Inicial', 'stock'),
            ('Stock Mínimo', 'min_stock'),
            ('Proveedor', 'supplier'),
            ('Ubicación', 'location')
        ]
        
        self.form_vars = {}
        
        # Crear campos izquierda
        for label_text, var_name in left_fields:
            field_frame = tk.Frame(left_column, bg=COLORS['white'])
            field_frame.pack(fill='x', pady=8)
            
            label = tk.Label(
                field_frame,
                text=label_text,
                font=('Segoe UI', 10, 'bold'),
                fg=COLORS['text_primary'],
                bg=COLORS['white']
            )
            label.pack(anchor='w')
            
            entry = tk.Entry(
                field_frame,
                font=('Segoe UI', 10),
                bg='#f8f9fa',
                fg=COLORS['text_primary'],
                relief='solid',
                bd=1,
                width=30
            )
            entry.pack(fill='x', pady=(5, 0))
            self.form_vars[var_name] = entry
        
        # Crear campos derecha
        for label_text, var_name in right_fields:
            field_frame = tk.Frame(right_column, bg=COLORS['white'])
            field_frame.pack(fill='x', pady=8)
            
            label = tk.Label(
                field_frame,
                text=label_text,
                font=('Segoe UI', 10, 'bold'),
                fg=COLORS['text_primary'],
                bg=COLORS['white']
            )
            label.pack(anchor='w')
            
            entry = tk.Entry(
                field_frame,
                font=('Segoe UI', 10),
                bg='#f8f9fa',
                fg=COLORS['text_primary'],
                relief='solid',
                bd=1,
                width=30
            )
            entry.pack(fill='x', pady=(5, 0))
            self.form_vars[var_name] = entry
        
        # Campo de descripción (ancho completo)
        desc_frame = tk.Frame(form_frame, bg=COLORS['white'])
        desc_frame.pack(fill='x', padx=20, pady=(0, 20))
        
        desc_label = tk.Label(
            desc_frame,
            text="Descripción",
            font=('Segoe UI', 10, 'bold'),
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        desc_label.pack(anchor='w')
        
        desc_text = tk.Text(
            desc_frame,
            height=4,
            font=('Segoe UI', 10),
            bg='#f8f9fa',
            fg=COLORS['text_primary'],
            relief='solid',
            bd=1,
            wrap='word'
        )
        desc_text.pack(fill='x', pady=(5, 0))
        self.form_vars['description'] = desc_text
        
        # Botones de acción
        button_frame = tk.Frame(center_container, bg=COLORS['bg_primary'])
        button_frame.pack(fill='x', pady=(0, 20))
        
        # Frame para centrar botones
        button_center = tk.Frame(button_frame, bg=COLORS['bg_primary'])
        button_center.pack(expand=True)
        
        save_btn = tk.Button(
            button_center,
            text="💾 GUARDAR PRODUCTO",
            command=self.save_product,
            font=('Segoe UI', 12, 'bold'),
            bg=COLORS['success'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=30,
            pady=12,
            width=20
        )
        save_btn.pack(side='left', padx=(0, 15))
        
        cancel_btn = tk.Button(
            button_center,
            text="❌ CANCELAR",
            command=self.back_to_inventory,
            font=('Segoe UI', 12, 'bold'),
            bg=COLORS['secondary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=30,
            pady=12,
            width=20
        )
        cancel_btn.pack(side='left')
        
        # Configurar scroll
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Bind scroll con mouse wheel
        def _on_mousewheel(event):
            try:
                canvas.yview_scroll(int(-1*(event.delta/120)), "units")
            except:
                pass  # Ignorar errores de scroll si el canvas ya no existe
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
    
    def save_product(self):
        """Guardar nuevo producto"""
        try:
            # Validar campos requeridos
            if not self.form_vars['name'].get().strip():
                messagebox.showerror("Error", "El nombre del producto es obligatorio")
                return
            
            # Validar precios y stock
            try:
                purchase_price = float(self.form_vars['purchase_price'].get() or 0)
                sale_price = float(self.form_vars['sale_price'].get() or 0)
                stock = int(self.form_vars['stock'].get() or 0)
                min_stock = int(self.form_vars['min_stock'].get() or 0)
            except ValueError:
                messagebox.showerror("Error", "Los precios y stock deben ser números válidos")
                return
            
            # Obtener datos del formulario
            product_data = {
                'name': self.form_vars['name'].get().strip(),
                'sku': self.form_vars['sku'].get().strip() or None,
                'category': self.form_vars['category'].get().strip() or None,
                'brand': self.form_vars['brand'].get().strip() or None,
                'purchase_price': purchase_price,
                'sale_price': sale_price,
                'stock': stock,
                'min_stock': min_stock,
                'supplier': self.form_vars['supplier'].get().strip() or None,
                'location': self.form_vars['location'].get().strip() or None,
                'description': self.form_vars['description'].get('1.0', tk.END).strip() or None,
                'created_at': datetime.now().isoformat()
            }
            
            # Insertar en la base de datos
            self.db.execute("""
                INSERT INTO products (name, sku, category, brand, purchase_price, 
                                    sale_price, stock, min_stock, supplier, location, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product_data['name'], product_data['sku'], product_data['category'],
                product_data['brand'], product_data['purchase_price'], product_data['sale_price'],
                product_data['stock'], product_data['min_stock'], product_data['supplier'],
                product_data['location'], product_data['description'], product_data['created_at']
            ))
            
            messagebox.showinfo("Éxito", "Producto guardado correctamente")
            self.back_to_inventory()
            
        except ValueError as e:
            messagebox.showerror("Error", "Verifique que los precios y stock sean números válidos")
        except Exception as e:
            messagebox.showerror("Error", f"Error al guardar producto: {str(e)}")
    
    def back_to_inventory(self):
        """Volver a la vista principal del inventario"""
        self.create_widgets()
        self.parent.after(100, self.load_products_async)
    
    def edit_selected_product(self):
        """Editar producto seleccionado"""
        selected = self.products_tree.selection()
        if not selected:
            messagebox.showwarning("Advertencia", "Selecciona un producto para editar")
            return
        messagebox.showinfo("Información", "Editar producto - En desarrollo")
    
    def delete_selected_product(self):
        """Eliminar producto seleccionado"""
        selected = self.products_tree.selection()
        if not selected:
            messagebox.showwarning("Advertencia", "Selecciona un producto para eliminar")
            return
        
        # Confirmar eliminación
        item = self.products_tree.item(selected[0])
        product_name = item['values'][2]  # Nombre está en la columna 2
        
        if messagebox.askyesno("Confirmar", f"¿Estás seguro de eliminar el producto '{product_name}'?"):
            try:
                product_id = item['values'][0]
                self.db.execute("DELETE FROM products WHERE id = ?", (product_id,))
                messagebox.showinfo("Éxito", "Producto eliminado correctamente")
                self.load_products_async()
            except Exception as e:
                messagebox.showerror("Error", f"Error al eliminar producto: {str(e)}")
    
    def view_product_details(self):
        """Ver detalles del producto seleccionado"""
        selected = self.products_tree.selection()
        if not selected:
            messagebox.showwarning("Advertencia", "Selecciona un producto para ver detalles")
            return
        messagebox.showinfo("Información", "Ver detalles - En desarrollo")
    
    def import_excel(self):
        """Importar productos desde Excel"""
        messagebox.showinfo("Información", "Importar Excel - En desarrollo")
    
    def show_inventory_stats(self, parent):
        """Mostrar estadísticas del inventario"""
        try:
            # Obtener estadísticas
            total_products = len(self.db.fetch_all("SELECT * FROM products"))
            low_stock = len(self.db.fetch_all("SELECT * FROM products WHERE stock <= min_stock"))
            out_of_stock = len(self.db.fetch_all("SELECT * FROM products WHERE stock = 0"))
            
            # Mostrar mensaje si no hay productos
            if total_products == 0:
                no_data_label = tk.Label(
                    parent,
                    text="No hay productos registrados - Agrega productos para comenzar",
                    font=('Segoe UI', 12),
                    fg=COLORS['text_muted'],
                    bg=COLORS['bg_primary']
                )
                no_data_label.place(relx=0.5, rely=0.5, anchor='center')
            
        except Exception as e:
            print(f"Error mostrando estadísticas: {e}")
    
    def clear_search(self):
        """Limpiar campo de búsqueda"""
        if hasattr(self, 'product_search_entry'):
            self.product_search_entry.delete(0, tk.END)
            self.load_products()