"""
Módulo mejorado de ventas con sistema de sobrantes
Permite vender materiales y gestionar automáticamente los sobrantes
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from modules.styles import (
    create_styled_button, create_styled_frame, create_styled_label, 
    create_styled_entry, COLORS, FONTS
)

class SalesModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.data_loaded = False
        self.create_widgets()
        self.parent.after(100, self.load_products_async)
    
    def create_widgets(self):
        """Crear interfaz de ventas mejorada"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="💰 VENTA CON CONTROL DE SOBRANTES", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para selección de cliente
        client_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        client_frame.pack(fill='x', pady=(0, 15))
        
        client_label = create_styled_label(client_frame, text="Cliente:", bg=COLORS['light_gray'])
        client_label.pack(side='left', padx=10, pady=10)
        
        self.client_var = tk.StringVar()
        self.client_combo = ttk.Combobox(client_frame, textvariable=self.client_var, width=30)
        self.client_combo.pack(side='left', padx=10, pady=10)
        
        # Cargar clientes
        self.load_clients()
        
        # Frame para productos
        products_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        products_frame.pack(fill='both', expand=True, pady=(0, 15))
        
        # Tabla de productos disponibles
        products_label = create_styled_label(
            products_frame, 
            text="Productos Disponibles:", 
            font=FONTS['body_bold'],
            bg=COLORS['white']
        )
        products_label.pack(pady=(0, 10))
        
        # Treeview para productos
        columns = ('ID', 'Código', 'Nombre', 'Stock', 'Precio', 'Categoría')
        self.products_tree = ttk.Treeview(products_frame, columns=columns, show='headings', height=8)
        
        for col in columns:
            self.products_tree.heading(col, text=col)
            self.products_tree.column(col, width=100, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(products_frame, orient='vertical', command=self.products_tree.yview)
        self.products_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack
        self.products_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Frame para venta
        sale_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        sale_frame.pack(fill='x', pady=(0, 15))
        
        # Campos de venta
        tk.Label(sale_frame, text="Cantidad Vendida:", bg=COLORS['light_gray']).grid(row=0, column=0, padx=5, pady=5)
        self.qty_sold_entry = create_styled_entry(sale_frame, width=15)
        self.qty_sold_entry.grid(row=0, column=1, padx=5, pady=5)
        
        tk.Label(sale_frame, text="Cantidad Usada:", bg=COLORS['light_gray']).grid(row=0, column=2, padx=5, pady=5)
        self.qty_used_entry = create_styled_entry(sale_frame, width=15)
        self.qty_used_entry.grid(row=0, column=3, padx=5, pady=5)
        
        tk.Label(sale_frame, text="Notas:", bg=COLORS['light_gray']).grid(row=1, column=0, padx=5, pady=5)
        self.notes_entry = create_styled_entry(sale_frame, width=40)
        self.notes_entry.grid(row=1, column=1, columnspan=3, padx=5, pady=5)
        
        # Botones
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x')
        
        sell_btn = create_styled_button(
            button_frame, 
            text="💰 Realizar Venta", 
            command=self.process_sale,
            button_type='success',
            width=15
        )
        sell_btn.pack(side='left', padx=(0, 10))
        
        clear_btn = create_styled_button(
            button_frame, 
            text="🧹 Limpiar", 
            command=self.clear_form,
            button_type='secondary',
            width=12
        )
        clear_btn.pack(side='left', padx=(0, 10))
        
        # Bind selección de producto
        self.products_tree.bind('<<TreeviewSelect>>', self.on_product_select)
    
    def load_clients(self):
        """Cargar clientes en el combobox"""
        try:
            clients = self.db.fetch_all("SELECT id, name FROM clients ORDER BY name")
            client_list = [f"{client['id']} - {client['name']}" for client in clients]
            self.client_combo['values'] = client_list
        except Exception as e:
            print(f"Error cargando clientes: {e}")
            self.client_combo['values'] = []
    
    def load_products_async(self, event=None):
        """Cargar productos de forma asíncrona"""
        try:
            # Crear datos de muestra si no existen
            self.create_sample_products()
            
            # Limpiar tabla
            for item in self.products_tree.get_children():
                self.products_tree.delete(item)
            
            # Cargar productos regulares
            products = self.db.fetch_all("""
                SELECT p.id, p.code, p.name, p.stock, p.unit_price, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.stock > 0 
                ORDER BY p.name
            """)
            
            batch_size = 50
            for i in range(0, len(products), batch_size):
                batch = products[i:i + batch_size]
                for product in batch:
                    self.products_tree.insert('', 'end', values=(
                        product['id'],
                        product['code'],
                        product['name'],
                        f"{product['stock']:.2f}",
                        f"${product['unit_price']:.2f}",
                        product['category_name'] or 'Sin categoría'
                    ))
                if i + batch_size < len(products):
                    self.parent.update()
            
            self.data_loaded = True
        except Exception as e:
            print(f"Error cargando productos: {e}")
    
    def create_sample_products(self):
        """Crear productos de muestra si no existen"""
        try:
            # Verificar si ya existen productos
            existing = self.db.fetch_one("SELECT COUNT(*) as count FROM products")
            if existing and existing['count'] > 0:
                return
            
            # Crear categorías de muestra
            categories = [
                {'name': 'Repuestos Motor', 'description': 'Repuestos para motor'},
                {'name': 'Filtros', 'description': 'Filtros de aceite, aire, combustible'},
                {'name': 'Frenos', 'description': 'Sistema de frenos'},
                {'name': 'Aceites', 'description': 'Aceites y lubricantes'}
            ]
            
            for cat in categories:
                self.db.execute("""
                    INSERT INTO categories (name, description)
                    VALUES (?, ?)
                """, (cat['name'], cat['description']))
            
            # Obtener IDs de categorías
            cat_ids = {}
            for cat in categories:
                cat_data = self.db.fetch_one("SELECT id FROM categories WHERE name = ?", (cat['name'],))
                if cat_data:
                    cat_ids[cat['name']] = cat_data['id']
            
            # Crear productos de muestra
            sample_products = [
                {
                    'name': 'Filtro de Aceite Motor',
                    'code': 'FO-001',
                    'category_id': cat_ids.get('Filtros', 1),
                    'stock': 25.0,
                    'unit_price': 25000.0,
                    'min_stock': 5.0,
                    'max_stock': 50.0,
                    'supplier': 'Repuestos Chile',
                    'description': 'Filtro de aceite para motor 4 cilindros'
                },
                {
                    'name': 'Aceite Motor 5W-30',
                    'code': 'AM-002',
                    'category_id': cat_ids.get('Aceites', 1),
                    'stock': 15.0,
                    'unit_price': 8000.0,
                    'min_stock': 3.0,
                    'max_stock': 30.0,
                    'supplier': 'Lubricantes Pro',
                    'description': 'Aceite sintético 5W-30 1 litro'
                },
                {
                    'name': 'Pastillas de Freno Delanteras',
                    'code': 'PF-003',
                    'category_id': cat_ids.get('Frenos', 1),
                    'stock': 8.0,
                    'unit_price': 45000.0,
                    'min_stock': 2.0,
                    'max_stock': 20.0,
                    'supplier': 'Frenos Max',
                    'description': 'Pastillas de freno delanteras para vehículos medianos'
                },
                {
                    'name': 'Filtro de Aire',
                    'code': 'FA-004',
                    'category_id': cat_ids.get('Filtros', 1),
                    'stock': 12.0,
                    'unit_price': 18000.0,
                    'min_stock': 3.0,
                    'max_stock': 25.0,
                    'supplier': 'Filtros Chile',
                    'description': 'Filtro de aire para motor'
                },
                {
                    'name': 'Bujías de Encendido',
                    'code': 'BE-005',
                    'category_id': cat_ids.get('Repuestos Motor', 1),
                    'stock': 20.0,
                    'unit_price': 12000.0,
                    'min_stock': 5.0,
                    'max_stock': 40.0,
                    'supplier': 'Encendido Pro',
                    'description': 'Bujías de encendido estándar'
                }
            ]
            
            for product in sample_products:
                self.db.execute("""
                    INSERT INTO products (name, code, category_id, stock, unit_price, min_stock, max_stock, supplier, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (product['name'], product['code'], product['category_id'], product['stock'], 
                      product['unit_price'], product['min_stock'], product['max_stock'], 
                      product['supplier'], product['description']))
            
        except Exception as e:
            print(f"Error creando productos de muestra: {e}")
    
    def on_product_select(self, event):
        """Manejar selección de producto"""
        selection = self.products_tree.selection()
        if selection:
            item = self.products_tree.item(selection[0])
            values = item['values']
            
            # Auto-llenar cantidad vendida con stock disponible
            available_qty = float(values[3])
            self.qty_sold_entry.delete(0, tk.END)
            self.qty_sold_entry.insert(0, str(available_qty))
            
            # Limpiar cantidad usada para que el usuario la ingrese
            self.qty_used_entry.delete(0, tk.END)
            self.qty_used_entry.focus()
    
    def process_sale(self):
        """Procesar venta con control de sobrantes"""
        # Validar selección
        selection = self.products_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Seleccione un producto")
            return
        
        # Validar cliente
        if not self.client_var.get():
            messagebox.showwarning("Advertencia", "Seleccione un cliente")
            return
        
        try:
            # Obtener datos
            item = self.products_tree.item(selection[0])
            values = item['values']
            
            product_id = values[0]
            unit_price = float(values[4].replace('$', ''))
            
            qty_sold = float(self.qty_sold_entry.get() or 0)
            qty_used = float(self.qty_used_entry.get() or 0)
            
            if qty_sold <= 0 or qty_used <= 0:
                messagebox.showerror("Error", "Las cantidades deben ser mayores a 0")
                return
            
            if qty_used > qty_sold:
                messagebox.showerror("Error", "La cantidad usada no puede ser mayor a la vendida")
                return
            
            # Obtener ID del cliente
            client_info = self.client_var.get().split(' - ')
            client_id = int(client_info[0])
            
            # Procesar venta
            self.process_regular_sale(product_id, client_id, qty_sold, qty_used, unit_price)
            
            # Limpiar formulario y recargar
            self.clear_form()
            self.load_products_async()
            
            messagebox.showinfo("Éxito", "Venta procesada correctamente")
            
        except ValueError:
            messagebox.showerror("Error", "Ingrese valores numéricos válidos")
        except Exception as e:
            messagebox.showerror("Error", f"Error procesando venta: {str(e)}")
    
    def process_regular_sale(self, product_id, client_id, qty_sold, qty_used, unit_price):
        """Procesar venta de producto regular"""
        # Verificar stock suficiente
        product = self.db.fetch_one("SELECT stock FROM products WHERE id = ?", (product_id,))
        if not product or product['stock'] < qty_sold:
            raise Exception("Stock insuficiente")
        
        # Calcular totales
        total_price = qty_sold * unit_price
        
        # Registrar venta
        cursor = self.db.execute("""
            INSERT INTO sales (client_id, product_id, quantity_sold, quantity_used, 
                             quantity_remainder, unit_price, total_price, notes, sale_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (client_id, product_id, qty_sold, qty_used, 
              qty_sold - qty_used, unit_price, total_price, self.notes_entry.get(),
              datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        
        # Actualizar stock del producto
        self.db.execute("""
            UPDATE products SET stock = stock - ? WHERE id = ?
        """, (qty_sold, product_id))
        
        # Crear sobrante si hay diferencia
        if qty_sold > qty_used:
            self.create_remainder_from_sale(cursor.lastrowid, product_id, qty_sold, qty_used, unit_price)
    
    def create_remainder_from_sale(self, sale_id, product_id, quantity_sold, quantity_used, unit_price):
        """Crear sobrante cuando se vende más material del que se usa"""
        if quantity_sold <= quantity_used:
            return None  # No hay sobrante
        
        quantity_remainder = quantity_sold - quantity_used
        
        try:
            # Crear registro de sobrante
            self.db.execute("""
                INSERT INTO material_remainders 
                (original_sale_id, product_id, quantity_available, unit_price, notes, created_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (sale_id, product_id, quantity_remainder, unit_price, 
                  f"Sobrante de venta - Vendido: {quantity_sold}, Usado: {quantity_used}",
                  datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
            
            # Actualizar el stock del producto original agregando el sobrante
            self.db.execute("""
                UPDATE products 
                SET stock = stock + ? 
                WHERE id = ?
            """, (quantity_remainder, product_id))
            
        except Exception as e:
            print(f"Error creando sobrante: {e}")
    
    def clear_form(self):
        """Limpiar formulario"""
        self.client_var.set("")
        self.qty_sold_entry.delete(0, tk.END)
        self.qty_used_entry.delete(0, tk.END)
        self.notes_entry.delete(0, tk.END)
        
        # Limpiar selección
        for item in self.products_tree.selection():
            self.products_tree.selection_remove(item)
