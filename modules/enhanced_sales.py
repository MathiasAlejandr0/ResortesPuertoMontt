"""
Módulo mejorado de ventas con sistema de sobrantes
Permite vender materiales y gestionar automáticamente los sobrantes
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from .styles import (
    create_styled_button, create_styled_frame, create_styled_label, 
    create_styled_entry, COLORS, FONTS
)
from .remainders import RemaindersManager
from .analytics import ProductAnalytics

class EnhancedSalesModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.remainders_manager = RemaindersManager(db)
        self.analytics = ProductAnalytics(db)
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_products()
    
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
            text="Productos Disponibles (incluye sobrantes):", 
            font=FONTS['body_bold'],
            bg=COLORS['white']
        )
        products_label.pack(pady=(0, 10))
        
        # Treeview para productos
        columns = ('ID', 'Código', 'Nombre', 'Stock', 'Precio', 'Tipo', 'Origen')
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
        clients = self.db.fetch_all("SELECT id, name FROM clients ORDER BY name")
        client_list = [f"{client['id']} - {client['name']}" for client in clients]
        self.client_combo['values'] = client_list
    
    def load_products(self):
        """Cargar productos y sobrantes disponibles"""
        # Limpiar tabla
        for item in self.products_tree.get_children():
            self.products_tree.delete(item)
        
        # Cargar productos regulares
        products = self.db.fetch_all("""
            SELECT id, code, name, stock, unit_price 
            FROM products 
            WHERE stock > 0 
            ORDER BY name
        """)
        
        for product in products:
            self.products_tree.insert('', 'end', values=(
                product['id'],
                product['code'],
                product['name'],
                f"{product['stock']:.2f}",
                f"${product['unit_price']:.2f}",
                "Producto",
                "Inventario"
            ))
        
        # Cargar sobrantes disponibles
        remainders = self.remainders_manager.get_available_remainders()
        
        for remainder in remainders:
            self.products_tree.insert('', 'end', values=(
                f"R{remainder['id']}",  # Prefijo R para sobrantes
                remainder['product_code'],
                f"{remainder['product_name']} (Sobrante)",
                f"{remainder['quantity_available']:.2f}",
                f"${remainder['unit_price']:.2f}",
                "Sobrante",
                f"Venta #{remainder['original_sale_id']}"
            ))
    
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
            product_type = values[5]  # "Producto" o "Sobrante"
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
            
            # Procesar según tipo
            if product_type == "Sobrante":
                self.process_remainder_sale(product_id, client_id, qty_sold, qty_used, unit_price)
            else:
                self.process_regular_sale(product_id, client_id, qty_sold, qty_used, unit_price)
            
            # Limpiar formulario y recargar
            self.clear_form()
            self.load_products()
            
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
                             quantity_remainder, unit_price, total_price, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (client_id, product_id, qty_sold, qty_used, 
              qty_sold - qty_used, unit_price, total_price, self.notes_entry.get()))
        
        sale_id = cursor.lastrowid
        
        # Actualizar stock del producto
        self.db.execute("""
            UPDATE products SET stock = stock - ? WHERE id = ?
        """, (qty_sold, product_id))
        
        # Crear sobrante si hay diferencia
        if qty_sold > qty_used:
            self.remainders_manager.create_remainder_from_sale(
                sale_id, product_id, qty_sold, qty_used, unit_price
            )
        
        # Actualizar análisis
        self.analytics.update_product_analytics(product_id, qty_used, total_price)
    
    def process_remainder_sale(self, remainder_id_str, client_id, qty_sold, qty_used, unit_price):
        """Procesar venta de sobrante"""
        # Extraer ID del sobrante (quitar prefijo R)
        remainder_id = int(remainder_id_str[1:])
        
        # Obtener información del sobrante
        remainder = self.db.fetch_one("""
            SELECT * FROM material_remainders WHERE id = ?
        """, (remainder_id,))
        
        if not remainder or remainder['quantity_available'] < qty_sold:
            raise Exception("Sobrante insuficiente")
        
        # Calcular totales
        total_price = qty_sold * unit_price
        
        # Registrar venta
        cursor = self.db.execute("""
            INSERT INTO sales (client_id, product_id, quantity_sold, quantity_used, 
                             quantity_remainder, unit_price, total_price, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (client_id, remainder['product_id'], qty_sold, qty_used, 
              qty_sold - qty_used, unit_price, total_price, 
              f"Venta de sobrante #{remainder_id} - {self.notes_entry.get()}"))
        
        sale_id = cursor.lastrowid
        
        # Usar el sobrante
        self.remainders_manager.use_remainder(remainder_id, qty_sold)
        
        # Si hay nueva diferencia, crear nuevo sobrante
        if qty_sold > qty_used:
            self.remainders_manager.create_remainder_from_sale(
                sale_id, remainder['product_id'], qty_sold, qty_used, unit_price
            )
        
        # Actualizar análisis
        self.analytics.update_product_analytics(remainder['product_id'], qty_used, total_price)
    
    def clear_form(self):
        """Limpiar formulario"""
        self.client_var.set("")
        self.qty_sold_entry.delete(0, tk.END)
        self.qty_used_entry.delete(0, tk.END)
        self.notes_entry.delete(0, tk.END)
        
        # Limpiar selección
        for item in self.products_tree.selection():
            self.products_tree.selection_remove(item)
