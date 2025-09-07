import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
import sqlite3
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

class ReportsModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
    
    def create_widgets(self):
        """Crear todos los widgets del módulo"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📊 GESTIÓN DE REPORTES",
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para reporte de ventas
        sales_report_btn = create_styled_button(
            button_frame, 
            text="💰 Reporte de Ventas",
            command=self.generate_sales_report,
            button_type='success',
            width=15
        )
        sales_report_btn.pack(side='left', padx=(0, 10))
        
        # Botón para reporte de inventario
        inventory_report_btn = create_styled_button(
            button_frame, 
            text="📦 Reporte de Inventario",
            command=self.generate_inventory_report,
            button_type='primary',
            width=15
        )
        inventory_report_btn.pack(side='left', padx=(0, 10))
        
        # Botón para reporte de clientes
        clients_report_btn = create_styled_button(
            button_frame, 
            text="👥 Reporte de Clientes",
            command=self.generate_clients_report,
            button_type='info',
            width=15
        )
        clients_report_btn.pack(side='left', padx=(0, 10))
        
        # Botón para reporte de trabajadores
        workers_report_btn = create_styled_button(
            button_frame, 
            text="👷 Reporte de Trabajadores",
            command=self.generate_workers_report,
            button_type='warning',
            width=15
        )
        workers_report_btn.pack(side='left', padx=(0, 10))
        
        # Frame para mostrar reportes
        report_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        report_frame.pack(fill='both', expand=True, pady=(0, 15))
        
        # Título del reporte
        self.report_title = create_styled_label(
            report_frame,
            text="Seleccione un tipo de reporte para comenzar",
            font=FONTS['subtitle'],
            fg=COLORS['text_secondary'],
            bg=COLORS['white']
        )
        self.report_title.pack(pady=20)
        
        # Treeview para mostrar datos del reporte
        self.report_tree = ttk.Treeview(report_frame, show='headings', height=15)
        
        # Scrollbar para el treeview
        scrollbar = ttk.Scrollbar(report_frame, orient='vertical', command=self.report_tree.yview)
        self.report_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack treeview y scrollbar
        self.report_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Frame para estadísticas
        stats_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        stats_frame.pack(fill='x', pady=(15, 0))
        
        # Mostrar estadísticas generales
        self.show_general_stats(stats_frame)
    
    def show_general_stats(self, parent_frame):
        """Mostrar estadísticas generales"""
        try:
            # Obtener estadísticas básicas
            total_clients = len(self.db.fetch_all("SELECT * FROM clients"))
            total_products = len(self.db.fetch_all("SELECT * FROM products"))
            total_workers = len(self.db.fetch_all("SELECT * FROM workers"))
            total_quotes = len(self.db.fetch_all("SELECT * FROM quotes"))
            
            stats_text = f"📊 Clientes: {total_clients} | 📦 Productos: {total_products} | 👷 Trabajadores: {total_workers} | 📋 Cotizaciones: {total_quotes}"
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
    
    def generate_sales_report(self):
        """Generar reporte de ventas"""
        try:
            # Limpiar treeview
            for item in self.report_tree.get_children():
                self.report_tree.delete(item)
            
            # Configurar columnas
            columns = ('ID', 'Cliente', 'Descripción', 'Total', 'Fecha', 'Estado')
            self.report_tree['columns'] = columns
            
            for col in columns:
                self.report_tree.heading(col, text=col)
                self.report_tree.column(col, width=120, anchor='center')
            
            # Obtener cotizaciones/ventas
            quotes = self.db.fetch_all("""
                SELECT q.id, c.name as client_name, q.description, q.final_price, 
                       q.quote_date, q.status
                FROM quotes q
                JOIN clients c ON q.client_id = c.id
                ORDER BY q.quote_date DESC
            """)
            
            # Agregar datos al treeview
            for quote in quotes:
                quote_date = datetime.fromisoformat(quote['quote_date']).strftime('%Y-%m-%d') if quote['quote_date'] else ''
                
                self.report_tree.insert('', 'end', values=(
                    quote['id'],
                    quote['client_name'],
                    quote['description'][:50] + '...' if len(quote['description']) > 50 else quote['description'],
                    f"${quote['final_price']:.2f}",
                    quote_date,
                    quote['status']
                ))
            
            # Actualizar título
            self.report_title.config(text=f"📊 REPORTE DE VENTAS ({len(quotes)} registros)")
            
            # Calcular totales
            total_amount = sum([q['final_price'] for q in quotes if q['final_price']])
            approved_quotes = len([q for q in quotes if q['status'] == 'Aprobada'])
            
            messagebox.showinfo("Éxito", "Reporte de ventas generado correctamente")
            messagebox.showinfo("Reporte de Ventas", 
                f"Total de ventas: ${total_amount:,.2f}\n"
                f"Ventas aprobadas: {approved_quotes}\n"
                f"Total de registros: {len(quotes)}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al generar reporte de ventas: {str(e)}")
    
    def generate_inventory_report(self):
        """Generar reporte de inventario"""
        try:
            # Limpiar treeview
            for item in self.report_tree.get_children():
                self.report_tree.delete(item)
            
            # Configurar columnas
            columns = ('ID', 'Producto', 'Categoría', 'Stock', 'Precio', 'Estado')
            self.report_tree['columns'] = columns
            
            for col in columns:
                self.report_tree.heading(col, text=col)
                self.report_tree.column(col, width=120, anchor='center')
            
            # Obtener productos
            products = self.db.fetch_all("""
                SELECT id, name, category, stock_quantity, price, 
                       CASE 
                           WHEN stock_quantity <= minimum_stock THEN 'Stock Bajo'
                           WHEN stock_quantity = 0 THEN 'Agotado'
                           ELSE 'Disponible'
                       END as status
                FROM products
                ORDER BY name
            """)
            
            # Agregar datos al treeview
            for product in products:
                self.report_tree.insert('', 'end', values=(
                    product['id'],
                    product['name'],
                    product['category'] or 'Sin categoría',
                    product['stock_quantity'],
                    f"${product['price']:.2f}",
                    product['status']
                ))
            
            # Actualizar título
            self.report_title.config(text=f"📦 REPORTE DE INVENTARIO ({len(products)} productos)")
            
            # Calcular estadísticas
            low_stock = len([p for p in products if p['stock_quantity'] <= p['minimum_stock']])
            total_value = sum([(p['price'] or 0) * (p['stock_quantity'] or 0) for p in products])
            
            messagebox.showinfo("Éxito", "Reporte de inventario generado correctamente")
            messagebox.showinfo("Reporte de Inventario", 
                f"Total de productos: {len(products)}\n"
                f"Productos con stock bajo: {low_stock}\n"
                f"Valor total del inventario: ${total_value:,.2f}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al generar reporte de inventario: {str(e)}")
    
    def generate_clients_report(self):
        """Generar reporte de clientes"""
        try:
            # Limpiar treeview
            for item in self.report_tree.get_children():
                self.report_tree.delete(item)
            
            # Configurar columnas
            columns = ('ID', 'Cliente', 'RUT', 'Teléfono', 'Email', 'Patente')
            self.report_tree['columns'] = columns
            
            for col in columns:
                self.report_tree.heading(col, text=col)
                self.report_tree.column(col, width=120, anchor='center')
            
            # Obtener clientes
            clients = self.db.fetch_all("""
                SELECT id, name, rut, phone, email, license_plate
                FROM clients
                ORDER BY name
            """)
            
            # Agregar datos al treeview
            for client in clients:
                self.report_tree.insert('', 'end', values=(
                    client['id'],
                    client['name'],
                    client['rut'] or '',
                    client['phone'] or '',
                    client['email'] or '',
                    client['license_plate'] or ''
                ))
            
            # Actualizar título
            self.report_title.config(text=f"👥 REPORTE DE CLIENTES ({len(clients)} clientes)")
            
            # Calcular estadísticas
            new_clients = len([c for c in clients if c['created_at'] and 
                             datetime.fromisoformat(c['created_at']) >= datetime.now() - timedelta(days=30)])
            
            messagebox.showinfo("Éxito", "Reporte de clientes generado correctamente")
            messagebox.showinfo("Reporte de Clientes", 
                f"Total de clientes: {len(clients)}\n"
                f"Clientes nuevos (30 días): {new_clients}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error al generar reporte de clientes: {str(e)}")
    
    def generate_workers_report(self):
        """Generar reporte de trabajadores"""
        try:
            # Limpiar treeview
            for item in self.report_tree.get_children():
                self.report_tree.delete(item)
            
            # Configurar columnas
            columns = ('ID', 'Trabajador', 'Cargo', 'Salario', 'Estado', 'Fecha Ingreso')
            self.report_tree['columns'] = columns
            
            for col in columns:
                self.report_tree.heading(col, text=col)
                self.report_tree.column(col, width=120, anchor='center')
            
            # Obtener trabajadores
            workers = self.db.fetch_all("""
                SELECT id, name, position, salary, status, hire_date
                FROM workers
                ORDER BY name
            """)
            
            # Agregar datos al treeview
            for worker in workers:
                hire_date = datetime.fromisoformat(worker['hire_date']).strftime('%Y-%m-%d') if worker['hire_date'] else ''
                self.report_tree.insert('', 'end', values=(
                    worker['id'],
                    worker['name'],
                    worker['position'],
                    f"${worker['salary']:.2f}",
                    worker['status'],
                    hire_date
                ))
            
            # Actualizar título
            self.report_title.config(text=f"👷 REPORTE DE TRABAJADORES ({len(workers)} trabajadores)")
            
            # Calcular estadísticas
            active_workers = len([w for w in workers if w['status'] == 'Activo'])
            total_salary = sum([w['salary'] for w in workers if w['status'] == 'Activo' and w['salary']])
            
            messagebox.showinfo("Éxito", "Reporte de trabajadores generado correctamente")
            messagebox.showinfo("Reporte de Trabajadores", 
                f"Total de trabajadores: {len(workers)}\n"
                f"Trabajadores activos: {active_workers}\n"
                f"Nómina total: ${total_salary:,.0f}")
                
        except Exception as e:
            messagebox.showerror("Error", f"Error al generar reporte de trabajadores: {str(e)}")
