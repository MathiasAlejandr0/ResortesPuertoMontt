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
        """Crear todos los widgets del módulo centrados"""
        # Frame principal
        main_frame = tk.Frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True)
        
        # Contenedor centrado
        center_container = tk.Frame(main_frame, bg=COLORS['bg_primary'])
        center_container.place(relx=0.5, rely=0.5, anchor='center')
        center_container.configure(width=1000, height=600)
        
        # Título
        title_frame = tk.Frame(center_container, bg=COLORS['primary'], height=60)
        title_frame.pack(fill='x', pady=(0, 20))
        title_frame.pack_propagate(False)
        
        title_label = tk.Label(
            title_frame,
            text="📦 GESTIÓN DE INVENTARIO",
            font=('Segoe UI', 18, 'bold'),
            fg='white',
            bg=COLORS['primary']
        )
        title_label.pack(expand=True, fill='both', padx=20, pady=15)
        
        # Frame para botones principales
        button_frame = tk.Frame(center_container, bg=COLORS['white'], relief='solid', bd=1)
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botones en una fila
        buttons_container = tk.Frame(button_frame, bg=COLORS['white'])
        buttons_container.pack(fill='x', padx=20, pady=15)
        
        # Botón para agregar producto
        add_product_btn = tk.Button(
            buttons_container,
            text="➕ Nuevo Producto",
            command=self.show_product_form,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['success'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=15,
            pady=8
        )
        add_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para editar producto
        edit_product_btn = tk.Button(
            buttons_container,
            text="✏️ Editar",
            command=self.edit_selected_product,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['primary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=15,
            pady=8
        )
        edit_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para eliminar producto
        delete_product_btn = tk.Button(
            buttons_container,
            text="🗑️ Eliminar",
            command=self.delete_selected_product,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['danger'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=15,
            pady=8
        )
        delete_product_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver detalles
        details_btn = tk.Button(
            buttons_container,
            text="👁️ Ver Detalles",
            command=self.view_product_details,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['info'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=15,
            pady=8
        )
        details_btn.pack(side='left', padx=(0, 10))
        
        # Botón para importar Excel
        import_btn = tk.Button(
            buttons_container,
            text="📊 Importar Excel",
            command=self.import_excel,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['secondary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=15,
            pady=8
        )
        import_btn.pack(side='left')
        
        # Frame para búsqueda
        search_frame = tk.Frame(center_container, bg=COLORS['white'], relief='solid', bd=1)
        search_frame.pack(fill='x', pady=(0, 15))
        
        # Campo de búsqueda
        search_container = tk.Frame(search_frame, bg=COLORS['white'])
        search_container.pack(fill='x', padx=20, pady=15)
        
        search_label = tk.Label(
            search_container,
            text="Buscar:",
            font=('Segoe UI', 10, 'bold'),
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        search_label.pack(side='left', padx=(0, 10))
        
        self.search_entry = tk.Entry(
            search_container,
            font=('Segoe UI', 10),
            bg='#f8f9fa',
            fg=COLORS['text_primary'],
            relief='solid',
            bd=1,
            width=40
        )
        self.search_entry.pack(side='left', padx=(0, 10))
        self.search_entry.insert(0, "Buscar productos...")
        
        # Botón de búsqueda
        search_btn = tk.Button(
            search_container,
            text="🔍",
            command=self.search_products,
            font=('Segoe UI', 10),
            bg=COLORS['primary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=15,
            pady=5
        )
        search_btn.pack(side='left')
        
        # Área de la tabla
        table_frame = tk.Frame(center_container, bg=COLORS['white'], relief='solid', bd=1)
        table_frame.pack(fill='both', expand=True)
        
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
        self.search_entry.bind('<Return>', lambda e: self.search_products())
        
        # Mostrar mensaje si no hay datos
        self.show_inventory_stats(center_container)
    
    def load_products_async(self):
        """Cargar productos de forma asíncrona"""
        try:
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
                    product['sku'] or '',
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
    
    def search_products(self):
        """Buscar productos"""
        try:
            search_term = self.search_entry.get().strip()
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
                    product['sku'] or '',
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
        
        # Frame principal
        main_frame = tk.Frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True)
        
        # Contenedor centrado
        center_container = tk.Frame(main_frame, bg=COLORS['bg_primary'])
        center_container.place(relx=0.5, rely=0.5, anchor='center')
        center_container.configure(width=600, height=700)
        
        # Header
        header_frame = tk.Frame(center_container, bg=COLORS['primary'])
        header_frame.pack(fill='x', pady=(0, 20))
        
        title_label = tk.Label(
            header_frame,
            text="➕ NUEVO PRODUCTO",
            font=('Segoe UI', 16, 'bold'),
            fg='white',
            bg=COLORS['primary']
        )
        title_label.pack(pady=10)
        
        subtitle_label = tk.Label(
            header_frame,
            text="Complete la información del producto",
            font=('Segoe UI', 12),
            fg='white',
            bg=COLORS['primary']
        )
        subtitle_label.pack(pady=(0, 10))
        
        # Formulario
        form_frame = tk.Frame(center_container, bg=COLORS['white'], relief='solid', bd=1)
        form_frame.pack(fill='both', expand=True)
        
        # Campos del formulario
        fields = [
            ('Nombre del Producto *', 'name'),
            ('Código/SKU', 'sku'),
            ('Categoría', 'category'),
            ('Marca', 'brand'),
            ('Precio de Compra', 'purchase_price'),
            ('Precio de Venta', 'sale_price'),
            ('Stock Inicial', 'stock'),
            ('Stock Mínimo', 'min_stock'),
            ('Descripción', 'description')
        ]
        
        self.form_vars = {}
        
        for i, (label_text, var_name) in enumerate(fields):
            field_frame = tk.Frame(form_frame, bg=COLORS['white'])
            field_frame.pack(fill='x', padx=20, pady=10)
            
            label = tk.Label(
                field_frame,
                text=label_text,
                font=('Segoe UI', 10, 'bold'),
                fg=COLORS['text_primary'],
                bg=COLORS['white']
            )
            label.pack(anchor='w')
            
            if var_name in ['description']:
                # Text area para descripción
                text_widget = tk.Text(
                    field_frame,
                    height=3,
                    font=('Segoe UI', 10),
                    bg='#f8f9fa',
                    fg=COLORS['text_primary'],
                    relief='solid',
                    bd=1
                )
                text_widget.pack(fill='x', pady=(5, 0))
                self.form_vars[var_name] = text_widget
            else:
                # Entry normal
                entry = tk.Entry(
                    field_frame,
                    font=('Segoe UI', 10),
                    bg='#f8f9fa',
                    fg=COLORS['text_primary'],
                    relief='solid',
                    bd=1
                )
                entry.pack(fill='x', pady=(5, 0))
                self.form_vars[var_name] = entry
        
        # Botones
        button_frame = tk.Frame(form_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', padx=20, pady=20)
        
        save_btn = tk.Button(
            button_frame,
            text="💾 Guardar Producto",
            command=self.save_product,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['success'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=20,
            pady=8
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = tk.Button(
            button_frame,
            text="❌ Cancelar",
            command=self.back_to_inventory,
            font=('Segoe UI', 10, 'bold'),
            bg=COLORS['secondary'],
            fg='white',
            relief='flat',
            bd=0,
            cursor='hand2',
            padx=20,
            pady=8
        )
        cancel_btn.pack(side='left')
    
    def save_product(self):
        """Guardar nuevo producto"""
        try:
            # Validar campos requeridos
            if not self.form_vars['name'].get().strip():
                messagebox.showerror("Error", "El nombre del producto es obligatorio")
                return
            
            # Obtener datos del formulario
            product_data = {
                'name': self.form_vars['name'].get().strip(),
                'sku': self.form_vars['sku'].get().strip() or None,
                'category': self.form_vars['category'].get().strip() or None,
                'brand': self.form_vars['brand'].get().strip() or None,
                'purchase_price': float(self.form_vars['purchase_price'].get() or 0),
                'sale_price': float(self.form_vars['sale_price'].get() or 0),
                'stock': int(self.form_vars['stock'].get() or 0),
                'min_stock': int(self.form_vars['min_stock'].get() or 0),
                'description': self.form_vars['description'].get('1.0', tk.END).strip() or None,
                'created_at': datetime.now().isoformat()
            }
            
            # Insertar en la base de datos
            self.db.execute("""
                INSERT INTO products (name, sku, category, brand, purchase_price, 
                                    sale_price, stock, min_stock, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                product_data['name'], product_data['sku'], product_data['category'],
                product_data['brand'], product_data['purchase_price'], product_data['sale_price'],
                product_data['stock'], product_data['min_stock'], product_data['description'],
                product_data['created_at']
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