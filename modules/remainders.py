"""
Módulo para gestión de sobrantes de materiales
Maneja los restos de materiales cuando se vende más cantidad de la que se usa
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from .styles import (
    create_styled_button, create_styled_frame, create_styled_label, 
    create_styled_entry, COLORS, FONTS
)

class RemaindersManager:
    def __init__(self, db):
        self.db = db
    
    def create_remainder_from_sale(self, sale_id, product_id, quantity_sold, quantity_used, unit_price):
        """
        Crear sobrante cuando se vende más material del que se usa
        Ejemplo: Se vende fierro de 2 metros pero solo se usan 1 metro
        """
        if quantity_sold <= quantity_used:
            return None  # No hay sobrante
        
        quantity_remainder = quantity_sold - quantity_used
        
        try:
            # Crear registro de sobrante
            cursor = self.db.execute("""
                INSERT INTO material_remainders 
                (original_sale_id, product_id, quantity_available, unit_price, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (sale_id, product_id, quantity_remainder, unit_price, 
                  f"Sobrante de venta - Vendido: {quantity_sold}, Usado: {quantity_used}"))
            
            remainder_id = cursor.lastrowid
            
            # Actualizar el stock del producto original agregando el sobrante
            self.db.execute("""
                UPDATE products 
                SET stock = stock + ? 
                WHERE id = ?
            """, (quantity_remainder, product_id))
            
            return remainder_id
            
        except Exception as e:
            print(f"Error creando sobrante: {e}")
            return None
    
    def get_available_remainders(self, product_id=None):
        """Obtener sobrantes disponibles"""
        if product_id:
            return self.db.fetch_all("""
                SELECT mr.*, p.name as product_name, p.code as product_code
                FROM material_remainders mr
                JOIN products p ON mr.product_id = p.id
                WHERE mr.product_id = ? AND mr.status = 'available'
                ORDER BY mr.created_date ASC
            """, (product_id,))
        else:
            return self.db.fetch_all("""
                SELECT mr.*, p.name as product_name, p.code as product_code
                FROM material_remainders mr
                JOIN products p ON mr.product_id = p.id
                WHERE mr.status = 'available'
                ORDER BY mr.created_date ASC
            """)
    
    def use_remainder(self, remainder_id, quantity_used):
        """
        Usar parte o todo un sobrante
        """
        remainder = self.db.fetch_one("""
            SELECT * FROM material_remainders WHERE id = ?
        """, (remainder_id,))
        
        if not remainder:
            return False
        
        if quantity_used > remainder['quantity_available']:
            return False  # No hay suficiente sobrante
        
        try:
            new_quantity = remainder['quantity_available'] - quantity_used
            
            if new_quantity <= 0:
                # Se usó todo el sobrante, marcarlo como usado
                self.db.execute("""
                    UPDATE material_remainders 
                    SET quantity_available = 0, status = 'used'
                    WHERE id = ?
                """, (remainder_id,))
            else:
                # Actualizar cantidad disponible
                self.db.execute("""
                    UPDATE material_remainders 
                    SET quantity_available = ?
                    WHERE id = ?
                """, (new_quantity, remainder_id))
            
            # Reducir stock del producto
            self.db.execute("""
                UPDATE products 
                SET stock = stock - ? 
                WHERE id = ?
            """, (quantity_used, remainder['product_id']))
            
            return True
            
        except Exception as e:
            print(f"Error usando sobrante: {e}")
            return False
    
    def get_remainders_summary(self):
        """Obtener resumen de sobrantes por producto"""
        return self.db.fetch_all("""
            SELECT 
                p.id,
                p.name,
                p.code,
                COUNT(mr.id) as total_remainders,
                SUM(mr.quantity_available) as total_quantity,
                AVG(mr.unit_price) as avg_price
            FROM products p
            LEFT JOIN material_remainders mr ON p.id = mr.product_id 
                AND mr.status = 'available'
            GROUP BY p.id, p.name, p.code
            HAVING total_remainders > 0
            ORDER BY total_quantity DESC
        """)

class RemaindersModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.remainders_manager = RemaindersManager(db)
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_remainders()
    
    def create_widgets(self):
        """Crear interfaz para gestión de sobrantes"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📦 GESTIÓN DE SOBRANTES DE MATERIALES", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para usar sobrante
        use_remainder_btn = create_styled_button(
            button_frame, 
            text="✂️ Usar Sobrante", 
            command=self.use_remainder_dialog,
            button_type='primary',
            width=15
        )
        use_remainder_btn.pack(side='left', padx=(0, 10))
        
        # Botón para ver resumen
        summary_btn = create_styled_button(
            button_frame, 
            text="📊 Resumen", 
            command=self.show_summary,
            button_type='info',
            width=12
        )
        summary_btn.pack(side='left', padx=(0, 10))
        
        # Botón para actualizar
        refresh_btn = create_styled_button(
            button_frame, 
            text="🔄 Actualizar", 
            command=self.load_remainders,
            button_type='secondary',
            width=12
        )
        refresh_btn.pack(side='left', padx=(0, 10))
        
        # Frame para la tabla
        table_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        table_frame.pack(fill='both', expand=True, pady=(0, 15))
        
        # Treeview para sobrantes
        columns = ('ID', 'Producto', 'Código', 'Cantidad Disponible', 'Precio Unitario', 'Valor Total', 'Fecha Creación')
        self.remainders_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=12)
        
        # Configurar columnas
        for col in columns:
            self.remainders_tree.heading(col, text=col)
            self.remainders_tree.column(col, width=120, anchor='center')
        
        # Scrollbars
        v_scrollbar = ttk.Scrollbar(table_frame, orient='vertical', command=self.remainders_tree.yview)
        h_scrollbar = ttk.Scrollbar(table_frame, orient='horizontal', command=self.remainders_tree.xview)
        self.remainders_tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Pack treeview y scrollbars
        self.remainders_tree.pack(side='left', fill='both', expand=True)
        v_scrollbar.pack(side='right', fill='y')
        h_scrollbar.pack(side='bottom', fill='x')
        
        # Bind doble clic
        self.remainders_tree.bind('<Double-1>', self.on_remainder_double_click)
    
    def load_remainders(self):
        """Cargar sobrantes en la tabla"""
        # Limpiar tabla
        for item in self.remainders_tree.get_children():
            self.remainders_tree.delete(item)
        
        # Obtener sobrantes
        remainders = self.remainders_manager.get_available_remainders()
        
        for remainder in remainders:
            valor_total = remainder['quantity_available'] * remainder['unit_price']
            fecha = remainder['created_date'][:10] if remainder['created_date'] else 'N/A'
            
            self.remainders_tree.insert('', 'end', values=(
                remainder['id'],
                remainder['product_name'],
                remainder['product_code'],
                f"{remainder['quantity_available']:.2f}",
                f"${remainder['unit_price']:.2f}",
                f"${valor_total:.2f}",
                fecha
            ))
    
    def use_remainder_dialog(self):
        """Diálogo para usar un sobrante"""
        selection = self.remainders_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Seleccione un sobrante para usar")
            return
        
        item = self.remainders_tree.item(selection[0])
        remainder_id = item['values'][0]
        available_qty = float(item['values'][3])
        product_name = item['values'][1]
        
        # Crear ventana de diálogo
        dialog = tk.Toplevel(self.frame)
        dialog.title("Usar Sobrante")
        dialog.geometry("400x300")
        dialog.configure(bg=COLORS['white'])
        dialog.transient(self.frame)
        dialog.grab_set()
        
        # Centrar ventana
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - (400 // 2)
        y = (dialog.winfo_screenheight() // 2) - (300 // 2)
        dialog.geometry(f"400x300+{x}+{y}")
        
        # Contenido del diálogo
        main_frame = create_styled_frame(dialog, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text=f"Usar Sobrante: {product_name}", 
            font=FONTS['heading'],
            bg=COLORS['white']
        )
        title_label.pack(pady=(0, 20))
        
        # Información del sobrante
        info_label = create_styled_label(
            main_frame, 
            text=f"Cantidad disponible: {available_qty:.2f}", 
            font=FONTS['body'],
            bg=COLORS['white']
        )
        info_label.pack(pady=(0, 15))
        
        # Campo para cantidad a usar
        qty_label = create_styled_label(main_frame, text="Cantidad a usar:", bg=COLORS['white'])
        qty_label.pack(pady=(0, 5))
        
        qty_entry = create_styled_entry(main_frame, width=20)
        qty_entry.pack(pady=(0, 15))
        qty_entry.focus()
        
        # Campo para notas
        notes_label = create_styled_label(main_frame, text="Notas (opcional):", bg=COLORS['white'])
        notes_label.pack(pady=(0, 5))
        
        notes_entry = create_styled_entry(main_frame, width=30)
        notes_entry.pack(pady=(0, 20))
        
        # Botones
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x')
        
        def confirm_use():
            try:
                quantity_to_use = float(qty_entry.get())
                if quantity_to_use <= 0:
                    messagebox.showerror("Error", "La cantidad debe ser mayor a 0")
                    return
                
                if quantity_to_use > available_qty:
                    messagebox.showerror("Error", f"No hay suficiente sobrante. Disponible: {available_qty:.2f}")
                    return
                
                # Usar el sobrante
                if self.remainders_manager.use_remainder(remainder_id, quantity_to_use):
                    messagebox.showinfo("Éxito", f"Se usaron {quantity_to_use:.2f} unidades del sobrante")
                    dialog.destroy()
                    self.load_remainders()  # Recargar tabla
                else:
                    messagebox.showerror("Error", "No se pudo usar el sobrante")
                
            except ValueError:
                messagebox.showerror("Error", "Ingrese una cantidad válida")
        
        confirm_btn = create_styled_button(
            button_frame, 
            text="✓ Confirmar", 
            command=confirm_use,
            button_type='success',
            width=12
        )
        confirm_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="✗ Cancelar", 
            command=dialog.destroy,
            button_type='danger',
            width=12
        )
        cancel_btn.pack(side='left')
        
        # Bind Enter para confirmar
        dialog.bind('<Return>', lambda e: confirm_use())
    
    def show_summary(self):
        """Mostrar resumen de sobrantes"""
        summary = self.remainders_manager.get_remainders_summary()
        
        # Crear ventana de resumen
        summary_window = tk.Toplevel(self.frame)
        summary_window.title("Resumen de Sobrantes")
        summary_window.geometry("600x400")
        summary_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        summary_window.update_idletasks()
        x = (summary_window.winfo_screenwidth() // 2) - (600 // 2)
        y = (summary_window.winfo_screenheight() // 2) - (400 // 2)
        summary_window.geometry(f"600x400+{x}+{y}")
        
        # Contenido
        main_frame = create_styled_frame(summary_window, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📊 RESUMEN DE SOBRANTES POR PRODUCTO", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Tabla de resumen
        columns = ('Producto', 'Código', 'Total Sobrantes', 'Cantidad Total', 'Precio Promedio', 'Valor Total')
        summary_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=15)
        
        for col in columns:
            summary_tree.heading(col, text=col)
            summary_tree.column(col, width=100, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=summary_tree.yview)
        summary_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack
        summary_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Llenar datos
        total_value = 0
        for item in summary:
            valor_total = (item['total_quantity'] or 0) * (item['avg_price'] or 0)
            total_value += valor_total
            
            summary_tree.insert('', 'end', values=(
                item['name'],
                item['code'],
                item['total_remainders'] or 0,
                f"{item['total_quantity'] or 0:.2f}",
                f"${item['avg_price'] or 0:.2f}",
                f"${valor_total:.2f}"
            ))
        
        # Total general
        total_label = create_styled_label(
            main_frame, 
            text=f"Valor Total de Sobrantes: ${total_value:.2f}", 
            font=FONTS['body_bold'],
            bg=COLORS['white'],
            fg=COLORS['success']
        )
        total_label.pack(pady=(10, 0))
    
    def on_remainder_double_click(self, event):
        """Manejar doble clic en sobrante"""
        self.use_remainder_dialog()
