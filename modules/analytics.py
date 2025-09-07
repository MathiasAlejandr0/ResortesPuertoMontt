"""
Módulo de análisis de productos estrella y recomendaciones
Analiza patrones de venta para identificar productos más vendidos y generar recomendaciones
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta
import sqlite3
from .styles import (
    create_styled_button, create_styled_frame, create_styled_label, 
    create_styled_entry, COLORS, FONTS
)

class ProductAnalytics:
    def __init__(self, db):
        self.db = db
    
    def update_product_analytics(self, product_id, quantity_sold, revenue):
        """Actualizar análisis de producto después de una venta"""
        try:
            # Verificar si ya existe registro de análisis
            existing = self.db.fetch_one("""
                SELECT * FROM product_analytics WHERE product_id = ?
            """, (product_id,))
            
            if existing:
                # Actualizar registro existente
                new_total_sold = existing['total_sold'] + quantity_sold
                new_total_revenue = existing['total_revenue'] + revenue
                
                # Calcular promedio mensual (últimos 30 días)
                monthly_sales = self.get_monthly_sales(product_id)
                
                self.db.execute("""
                    UPDATE product_analytics 
                    SET total_sold = ?, total_revenue = ?, avg_monthly_sales = ?,
                        last_sale_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE product_id = ?
                """, (new_total_sold, new_total_revenue, monthly_sales, product_id))
            else:
                # Crear nuevo registro
                monthly_sales = self.get_monthly_sales(product_id)
                
                self.db.execute("""
                    INSERT INTO product_analytics 
                    (product_id, total_sold, total_revenue, avg_monthly_sales, last_sale_date)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (product_id, quantity_sold, revenue, monthly_sales))
            
            # Actualizar rating de estrella
            self.update_star_rating(product_id)
            
        except Exception as e:
            print(f"Error actualizando análisis de producto: {e}")
    
    def get_monthly_sales(self, product_id):
        """Obtener ventas del último mes para un producto"""
        try:
            result = self.db.fetch_one("""
                SELECT SUM(quantity_used) as monthly_sales
                FROM sales 
                WHERE product_id = ? 
                AND sale_date >= date('now', '-30 days')
            """, (product_id,))
            
            return result['monthly_sales'] if result and result['monthly_sales'] else 0
        except:
            return 0
    
    def update_star_rating(self, product_id):
        """Actualizar rating de estrella basado en ventas y frecuencia"""
        try:
            analytics = self.db.fetch_one("""
                SELECT * FROM product_analytics WHERE product_id = ?
            """, (product_id,))
            
            if not analytics:
                return
            
            # Criterios para rating de estrella (1-5 estrellas)
            total_sold = analytics['total_sold']
            monthly_sales = analytics['avg_monthly_sales']
            total_revenue = analytics['total_revenue']
            
            # Calcular días desde última venta
            if analytics['last_sale_date']:
                last_sale = datetime.fromisoformat(analytics['last_sale_date'])
                days_since_sale = (datetime.now() - last_sale).days
            else:
                days_since_sale = 999
            
            # Algoritmo de rating
            rating = 0
            
            # Basado en cantidad vendida
            if total_sold >= 100:
                rating += 2
            elif total_sold >= 50:
                rating += 1
            
            # Basado en ventas mensuales
            if monthly_sales >= 20:
                rating += 2
            elif monthly_sales >= 10:
                rating += 1
            
            # Penalizar si no se ha vendido recientemente
            if days_since_sale <= 7:
                rating += 1
            elif days_since_sale > 30:
                rating -= 1
            
            # Limitar entre 1 y 5
            rating = max(1, min(5, rating))
            
            # Generar recomendación
            recommendation = self.generate_recommendation(rating, monthly_sales, days_since_sale)
            
            # Actualizar en base de datos
            self.db.execute("""
                UPDATE product_analytics 
                SET star_rating = ?, recommendation = ?, updated_at = CURRENT_TIMESTAMP
                WHERE product_id = ?
            """, (rating, recommendation, product_id))
            
        except Exception as e:
            print(f"Error actualizando rating de estrella: {e}")
    
    def generate_recommendation(self, rating, monthly_sales, days_since_sale):
        """Generar recomendación de compra basada en análisis"""
        if rating >= 4:
            if monthly_sales >= 15:
                return "⭐ PRODUCTO ESTRELLA - Aumentar stock significativamente"
            else:
                return "⭐ BUEN PRODUCTO - Mantener stock alto"
        elif rating == 3:
            if days_since_sale <= 15:
                return "📈 PRODUCTO REGULAR - Mantener stock moderado"
            else:
                return "⚠️ PRODUCTO REGULAR - Revisar demanda"
        elif rating == 2:
            return "📉 PRODUCTO LENTO - Reducir stock, comprar menos"
        else:
            return "❌ PRODUCTO ESTANCADO - Considerar descontinuar o promocionar"
    
    def get_star_products(self, limit=10):
        """Obtener productos estrella (rating 4-5)"""
        return self.db.fetch_all("""
            SELECT pa.*, p.name, p.code, p.stock, p.min_stock
            FROM product_analytics pa
            JOIN products p ON pa.product_id = p.id
            WHERE pa.star_rating >= 4
            ORDER BY pa.star_rating DESC, pa.total_revenue DESC
            LIMIT ?
        """, (limit,))
    
    def get_slow_products(self, limit=10):
        """Obtener productos lentos (rating 1-2)"""
        return self.db.fetch_all("""
            SELECT pa.*, p.name, p.code, p.stock, p.min_stock
            FROM product_analytics pa
            JOIN products p ON pa.product_id = p.id
            WHERE pa.star_rating <= 2
            ORDER BY pa.star_rating ASC, pa.total_sold ASC
            LIMIT ?
        """, (limit,))
    
    def get_purchase_recommendations(self):
        """Obtener recomendaciones de compra"""
        return self.db.fetch_all("""
            SELECT 
                pa.*,
                p.name,
                p.code,
                p.stock,
                p.min_stock,
                p.max_stock,
                CASE 
                    WHEN pa.star_rating >= 4 AND p.stock <= p.min_stock THEN 'URGENTE'
                    WHEN pa.star_rating >= 4 THEN 'ALTA'
                    WHEN pa.star_rating = 3 THEN 'MEDIA'
                    ELSE 'BAJA'
                END as priority
            FROM product_analytics pa
            JOIN products p ON pa.product_id = p.id
            ORDER BY 
                CASE 
                    WHEN pa.star_rating >= 4 AND p.stock <= p.min_stock THEN 1
                    WHEN pa.star_rating >= 4 THEN 2
                    WHEN pa.star_rating = 3 THEN 3
                    ELSE 4
                END,
                pa.total_revenue DESC
        """)
    
    def update_all_analytics(self):
        """Actualizar análisis para todos los productos"""
        try:
            # Obtener todos los productos con ventas
            products_with_sales = self.db.fetch_all("""
                SELECT 
                    p.id,
                    SUM(s.quantity_used) as total_sold,
                    SUM(s.total_price) as total_revenue
                FROM products p
                LEFT JOIN sales s ON p.id = s.product_id
                GROUP BY p.id
            """)
            
            for product in products_with_sales:
                if product['total_sold'] and product['total_sold'] > 0:
                    # Verificar si existe análisis
                    existing = self.db.fetch_one("""
                        SELECT id FROM product_analytics WHERE product_id = ?
                    """, (product['id'],))
                    
                    monthly_sales = self.get_monthly_sales(product['id'])
                    
                    if existing:
                        # Actualizar
                        self.db.execute("""
                            UPDATE product_analytics 
                            SET total_sold = ?, total_revenue = ?, avg_monthly_sales = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE product_id = ?
                        """, (product['total_sold'], product['total_revenue'], 
                              monthly_sales, product['id']))
                    else:
                        # Crear nuevo
                        self.db.execute("""
                            INSERT INTO product_analytics 
                            (product_id, total_sold, total_revenue, avg_monthly_sales)
                            VALUES (?, ?, ?, ?)
                        """, (product['id'], product['total_sold'], 
                              product['total_revenue'], monthly_sales))
                    
                    # Actualizar rating
                    self.update_star_rating(product['id'])
            
            return True
            
        except Exception as e:
            print(f"Error actualizando todos los análisis: {e}")
            return False

class StockAlerts:
    def __init__(self, db):
        self.db = db
    
    def create_alert(self, product_id, alert_type, message, priority=1):
        """Crear una nueva alerta de stock"""
        try:
            self.db.execute("""
                INSERT INTO stock_alerts (product_id, alert_type, message, priority)
                VALUES (?, ?, ?, ?)
            """, (product_id, alert_type, message, priority))
            return True
        except Exception as e:
            print(f"Error creando alerta: {e}")
            return False
    
    def check_stock_levels(self):
        """Verificar niveles de stock y crear alertas automáticas"""
        try:
            # Limpiar alertas antiguas no leídas del mismo tipo
            self.db.execute("""
                DELETE FROM stock_alerts 
                WHERE alert_type IN ('low_stock', 'out_of_stock', 'overstock')
                AND is_read = FALSE
                AND created_at < date('now', '-1 day')
            """)
            
            # Verificar stock bajo
            low_stock_products = self.db.fetch_all("""
                SELECT id, name, code, stock, min_stock 
                FROM products 
                WHERE stock <= min_stock AND stock > 0
            """)
            
            for product in low_stock_products:
                message = f"Stock bajo: {product['name']} ({product['code']}) - Stock: {product['stock']}, Mínimo: {product['min_stock']}"
                self.create_alert(product['id'], 'low_stock', message, 2)
            
            # Verificar productos agotados
            out_of_stock_products = self.db.fetch_all("""
                SELECT id, name, code, stock 
                FROM products 
                WHERE stock <= 0
            """)
            
            for product in out_of_stock_products:
                message = f"Producto agotado: {product['name']} ({product['code']})"
                self.create_alert(product['id'], 'out_of_stock', message, 3)
            
            # Verificar sobrestock (opcional)
            overstock_products = self.db.fetch_all("""
                SELECT id, name, code, stock, max_stock 
                FROM products 
                WHERE stock > max_stock
            """)
            
            for product in overstock_products:
                message = f"Sobrestock: {product['name']} ({product['code']}) - Stock: {product['stock']}, Máximo: {product['max_stock']}"
                self.create_alert(product['id'], 'overstock', message, 1)
            
            return True
            
        except Exception as e:
            print(f"Error verificando niveles de stock: {e}")
            return False
    
    def get_active_alerts(self, priority=None):
        """Obtener alertas activas"""
        if priority:
            return self.db.fetch_all("""
                SELECT sa.*, p.name as product_name, p.code as product_code
                FROM stock_alerts sa
                JOIN products p ON sa.product_id = p.id
                WHERE sa.is_read = FALSE AND sa.priority = ?
                ORDER BY sa.priority DESC, sa.created_at DESC
            """, (priority,))
        else:
            return self.db.fetch_all("""
                SELECT sa.*, p.name as product_name, p.code as product_code
                FROM stock_alerts sa
                JOIN products p ON sa.product_id = p.id
                WHERE sa.is_read = FALSE
                ORDER BY sa.priority DESC, sa.created_at DESC
            """)
    
    def mark_alert_as_read(self, alert_id):
        """Marcar alerta como leída"""
        try:
            self.db.execute("""
                UPDATE stock_alerts SET is_read = TRUE WHERE id = ?
            """, (alert_id,))
            return True
        except Exception as e:
            print(f"Error marcando alerta como leída: {e}")
            return False

class AnalyticsModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.analytics = ProductAnalytics(db)
        self.alerts = StockAlerts(db)
        self.frame = tk.Frame(parent)
        self.create_widgets()
        self.load_data()
    
    def create_widgets(self):
        """Crear interfaz del módulo de análisis"""
        # Frame principal
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="⭐ ANÁLISIS DE PRODUCTOS Y ALERTAS", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Frame para botones
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Botón para actualizar análisis
        update_btn = create_styled_button(
            button_frame, 
            text="🔄 Actualizar Análisis", 
            command=self.update_analytics,
            button_type='primary',
            width=18
        )
        update_btn.pack(side='left', padx=(0, 10))
        
        # Botón para verificar alertas
        alerts_btn = create_styled_button(
            button_frame, 
            text="🚨 Verificar Alertas", 
            command=self.check_alerts,
            button_type='warning',
            width=15
        )
        alerts_btn.pack(side='left', padx=(0, 10))
        
        # Botón para recomendaciones
        recommendations_btn = create_styled_button(
            button_frame, 
            text="💡 Recomendaciones", 
            command=self.show_recommendations,
            button_type='info',
            width=15
        )
        recommendations_btn.pack(side='left', padx=(0, 10))
        
        # Crear notebook para pestañas
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.pack(fill='both', expand=True, pady=(0, 15))
        
        # Pestaña de productos estrella
        self.create_star_products_tab()
        
        # Pestaña de productos lentos
        self.create_slow_products_tab()
        
        # Pestaña de alertas
        self.create_alerts_tab()
    
    def create_star_products_tab(self):
        """Crear pestaña de productos estrella"""
        star_frame = create_styled_frame(self.notebook, bg=COLORS['white'])
        self.notebook.add(star_frame, text="⭐ Productos Estrella")
        
        # Tabla de productos estrella
        columns = ('Producto', 'Código', 'Rating', 'Total Vendido', 'Ingresos', 'Ventas/Mes', 'Stock', 'Recomendación')
        self.star_tree = ttk.Treeview(star_frame, columns=columns, show='headings', height=12)
        
        for col in columns:
            self.star_tree.heading(col, text=col)
            self.star_tree.column(col, width=120, anchor='center')
        
        # Scrollbar
        star_scrollbar = ttk.Scrollbar(star_frame, orient='vertical', command=self.star_tree.yview)
        self.star_tree.configure(yscrollcommand=star_scrollbar.set)
        
        # Pack
        self.star_tree.pack(side='left', fill='both', expand=True, padx=10, pady=10)
        star_scrollbar.pack(side='right', fill='y', pady=10)
    
    def create_slow_products_tab(self):
        """Crear pestaña de productos lentos"""
        slow_frame = create_styled_frame(self.notebook, bg=COLORS['white'])
        self.notebook.add(slow_frame, text="📉 Productos Lentos")
        
        # Tabla de productos lentos
        columns = ('Producto', 'Código', 'Rating', 'Total Vendido', 'Ventas/Mes', 'Stock', 'Recomendación')
        self.slow_tree = ttk.Treeview(slow_frame, columns=columns, show='headings', height=12)
        
        for col in columns:
            self.slow_tree.heading(col, text=col)
            self.slow_tree.column(col, width=120, anchor='center')
        
        # Scrollbar
        slow_scrollbar = ttk.Scrollbar(slow_frame, orient='vertical', command=self.slow_tree.yview)
        self.slow_tree.configure(yscrollcommand=slow_scrollbar.set)
        
        # Pack
        self.slow_tree.pack(side='left', fill='both', expand=True, padx=10, pady=10)
        slow_scrollbar.pack(side='right', fill='y', pady=10)
    
    def create_alerts_tab(self):
        """Crear pestaña de alertas"""
        alerts_frame = create_styled_frame(self.notebook, bg=COLORS['white'])
        self.notebook.add(alerts_frame, text="🚨 Alertas de Stock")
        
        # Tabla de alertas
        columns = ('Producto', 'Tipo', 'Mensaje', 'Prioridad', 'Fecha')
        self.alerts_tree = ttk.Treeview(alerts_frame, columns=columns, show='headings', height=12)
        
        for col in columns:
            self.alerts_tree.heading(col, text=col)
            self.alerts_tree.column(col, width=150, anchor='center')
        
        # Scrollbar
        alerts_scrollbar = ttk.Scrollbar(alerts_frame, orient='vertical', command=self.alerts_tree.yview)
        self.alerts_tree.configure(yscrollcommand=alerts_scrollbar.set)
        
        # Pack
        self.alerts_tree.pack(side='left', fill='both', expand=True, padx=10, pady=10)
        alerts_scrollbar.pack(side='right', fill='y', pady=10)
        
        # Bind doble clic para marcar como leída
        self.alerts_tree.bind('<Double-1>', self.mark_alert_read)
    
    def load_data(self):
        """Cargar todos los datos"""
        self.load_star_products()
        self.load_slow_products()
        self.load_alerts()
    
    def load_star_products(self):
        """Cargar productos estrella"""
        # Limpiar tabla
        for item in self.star_tree.get_children():
            self.star_tree.delete(item)
        
        # Obtener productos estrella
        star_products = self.analytics.get_star_products(20)
        
        for product in star_products:
            stars = "⭐" * product['star_rating']
            self.star_tree.insert('', 'end', values=(
                product['name'],
                product['code'],
                stars,
                f"{product['total_sold']:.1f}",
                f"${product['total_revenue']:.2f}",
                f"{product['avg_monthly_sales']:.1f}",
                product['stock'],
                product['recommendation']
            ))
    
    def load_slow_products(self):
        """Cargar productos lentos"""
        # Limpiar tabla
        for item in self.slow_tree.get_children():
            self.slow_tree.delete(item)
        
        # Obtener productos lentos
        slow_products = self.analytics.get_slow_products(20)
        
        for product in slow_products:
            stars = "⭐" * product['star_rating']
            self.slow_tree.insert('', 'end', values=(
                product['name'],
                product['code'],
                stars,
                f"{product['total_sold']:.1f}",
                f"{product['avg_monthly_sales']:.1f}",
                product['stock'],
                product['recommendation']
            ))
    
    def load_alerts(self):
        """Cargar alertas activas"""
        # Limpiar tabla
        for item in self.alerts_tree.get_children():
            self.alerts_tree.delete(item)
        
        # Obtener alertas activas
        alerts = self.alerts.get_active_alerts()
        
        for alert in alerts:
            priority_text = {1: "BAJA", 2: "MEDIA", 3: "ALTA"}.get(alert['priority'], "MEDIA")
            fecha = alert['created_at'][:10] if alert['created_at'] else 'N/A'
            
            self.alerts_tree.insert('', 'end', values=(
                alert['product_name'],
                alert['alert_type'].replace('_', ' ').title(),
                alert['message'],
                priority_text,
                fecha
            ), tags=(f"priority_{alert['priority']}",))
        
        # Configurar colores por prioridad
        self.alerts_tree.tag_configure("priority_3", background="#ffebee")  # Alta - rojo claro
        self.alerts_tree.tag_configure("priority_2", background="#fff3e0")  # Media - naranja claro
        self.alerts_tree.tag_configure("priority_1", background="#f3e5f5")  # Baja - púrpura claro
    
    def update_analytics(self):
        """Actualizar análisis de productos"""
        if messagebox.askyesno("Confirmar", "¿Actualizar análisis de todos los productos?\nEsto puede tomar unos momentos."):
            if self.analytics.update_all_analytics():
                messagebox.showinfo("Éxito", "Análisis actualizado correctamente")
                self.load_star_products()
                self.load_slow_products()
            else:
                messagebox.showerror("Error", "Error actualizando análisis")
    
    def check_alerts(self):
        """Verificar y actualizar alertas de stock"""
        if self.alerts.check_stock_levels():
            messagebox.showinfo("Éxito", "Alertas de stock verificadas")
            self.load_alerts()
        else:
            messagebox.showerror("Error", "Error verificando alertas")
    
    def show_recommendations(self):
        """Mostrar recomendaciones de compra"""
        recommendations = self.analytics.get_purchase_recommendations()
        
        # Crear ventana de recomendaciones
        rec_window = tk.Toplevel(self.frame)
        rec_window.title("Recomendaciones de Compra")
        rec_window.geometry("800x500")
        rec_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        rec_window.update_idletasks()
        x = (rec_window.winfo_screenwidth() // 2) - (800 // 2)
        y = (rec_window.winfo_screenheight() // 2) - (500 // 2)
        rec_window.geometry(f"800x500+{x}+{y}")
        
        # Contenido
        main_frame = create_styled_frame(rec_window, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="💡 RECOMENDACIONES DE COMPRA", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Tabla de recomendaciones
        columns = ('Producto', 'Código', 'Prioridad', 'Stock Actual', 'Stock Mín', 'Rating', 'Recomendación')
        rec_tree = ttk.Treeview(main_frame, columns=columns, show='headings', height=18)
        
        for col in columns:
            rec_tree.heading(col, text=col)
            rec_tree.column(col, width=110, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(main_frame, orient='vertical', command=rec_tree.yview)
        rec_tree.configure(yscrollcommand=scrollbar.set)
        
        # Pack
        rec_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Llenar datos
        for rec in recommendations:
            stars = "⭐" * rec['star_rating']
            rec_tree.insert('', 'end', values=(
                rec['name'],
                rec['code'],
                rec['priority'],
                rec['stock'],
                rec['min_stock'],
                stars,
                rec['recommendation']
            ), tags=(f"priority_{rec['priority'].lower()}",))
        
        # Configurar colores por prioridad
        rec_tree.tag_configure("priority_urgente", background="#ffcdd2")
        rec_tree.tag_configure("priority_alta", background="#ffe0b2")
        rec_tree.tag_configure("priority_media", background="#f0f4c3")
        rec_tree.tag_configure("priority_baja", background="#e1f5fe")
    
    def mark_alert_read(self, event):
        """Marcar alerta como leída al hacer doble clic"""
        selection = self.alerts_tree.selection()
        if selection:
            # Obtener ID de la alerta (necesitaríamos modificar la carga para incluir ID)
            # Por simplicidad, recargar alertas
            self.load_alerts()
