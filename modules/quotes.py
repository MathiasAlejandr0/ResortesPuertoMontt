"""
Sistema de Ventas y Cotizaciones
- Gestión completa de cotizaciones y ventas
- Control de precios y costos
- Generación de documentos
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS

# Importar ReportLab de forma opcional
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

class QuotesModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.data_loaded = False
        self.create_widgets()
        self.parent.after(100, self.load_quotes_async)
    
    def create_widgets(self):
        """Crear interfaz de cotizaciones estandarizada"""
        # Frame principal simple
        main_frame = tk.Frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Header
        header_frame = tk.Frame(main_frame, bg=COLORS['primary'])
        header_frame.pack(fill='x', pady=(0, 20))
        
        # Título
        title_label = tk.Label(
            header_frame, 
            text="💰 VENTAS Y COTIZACIONES", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(pady=(15, 5))
        
        # Subtítulo
        subtitle_label = tk.Label(
            header_frame,
            text="Gestiona cotizaciones, ventas y documentos comerciales",
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
        new_btn = create_styled_button(button_frame, text="+ Nueva Cotización", command=self.show_quote_form, button_type='success', width=15)
        new_btn.pack(side='left', padx=20, pady=15)
        
        details_btn = create_styled_button(button_frame, text="Ver Detalles", command=self.show_quote_details, button_type='info', width=12)
        details_btn.pack(side='left', padx=(0, 10), pady=15)
        
        pdf_btn = create_styled_button(button_frame, text="Generar PDF", command=self.generate_client_pdf_dialog, button_type='warning', width=15)
        pdf_btn.pack(side='left', padx=(0, 10), pady=15)
        
        edit_btn = create_styled_button(button_frame, text="Editar", command=self.edit_selected_quote, button_type='danger', width=10)
        edit_btn.pack(side='left', padx=(0, 20), pady=15)
        
        # Tabla de cotizaciones
        table_frame = tk.Frame(main_frame, bg=COLORS['white'])
        table_frame.pack(fill='both', expand=True, pady=(0, 15))
        
        columns = ('ID', 'Cliente', 'Descripción', 'Costo Calculado', 'Precio Final', 'Estado', 'Fecha')
        self.quotes_tree = ttk.Treeview(table_frame, columns=columns, show='headings', height=12)
        
        for col in columns:
            self.quotes_tree.heading(col, text=col)
            self.quotes_tree.column(col, width=120, anchor='center')
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(table_frame, orient='vertical', command=self.quotes_tree.yview)
        self.quotes_tree.configure(yscrollcommand=scrollbar.set)
        
        self.quotes_tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Bind doble clic
        self.quotes_tree.bind('<Double-1>', self.edit_selected_quote)
    
    def load_quotes_async(self, event=None):
        """Cargar cotizaciones de forma asíncrona"""
        try:
            # Crear datos de muestra si no existen
            self.create_sample_quotes()
            
            quotes = self.db.fetch_all("""
                SELECT q.*, c.name as client_name
                FROM quotes q
                JOIN clients c ON q.client_id = c.id
                ORDER BY q.created_at DESC
            """)
            
            for item in self.quotes_tree.get_children():
                self.quotes_tree.delete(item)
            
            batch_size = 50
            for i in range(0, len(quotes), batch_size):
                batch = quotes[i:i + batch_size]
                for quote in batch:
                    self.quotes_tree.insert('', 'end', values=(
                        quote['id'],
                        quote['client_name'],
                        quote['description'][:30] + '...' if len(quote['description']) > 30 else quote['description'],
                        f"${quote['calculated_total']:.2f}",
                        f"${quote['final_price']:.2f}",
                        quote['status'],
                        quote['quote_date'][:10] if quote['quote_date'] else 'N/A'
                    ))
                if i + batch_size < len(quotes):
                    self.parent.update()
            
            self.data_loaded = True
        except Exception as e:
            messagebox.showerror("Error", f"Error al cargar cotizaciones: {str(e)}")
    
    def create_sample_quotes(self):
        """Crear cotizaciones de muestra si no existen"""
        try:
            # Verificar si ya existen cotizaciones
            existing = self.db.fetch_one("SELECT COUNT(*) as count FROM quotes")
            if existing and existing['count'] > 0:
                return
            
            # Obtener clientes existentes
            clients = self.db.fetch_all("SELECT id FROM clients LIMIT 3")
            if not clients:
                return
            
            sample_quotes = [
                {
                    'client_id': clients[0]['id'],
                    'description': 'Reparación de motor - Cambio de aceite y filtros',
                    'labor_cost': 50000.0,
                    'parts_cost': 25000.0,
                    'calculated_total': 75000.0,
                    'final_price': 85000.0,
                    'status': 'Pendiente',
                    'quote_date': datetime.now().strftime('%Y-%m-%d')
                },
                {
                    'client_id': clients[1]['id'] if len(clients) > 1 else clients[0]['id'],
                    'description': 'Revisión completa del sistema de frenos',
                    'labor_cost': 80000.0,
                    'parts_cost': 120000.0,
                    'calculated_total': 200000.0,
                    'final_price': 220000.0,
                    'status': 'Aprobada',
                    'quote_date': datetime.now().strftime('%Y-%m-%d')
                },
                {
                    'client_id': clients[2]['id'] if len(clients) > 2 else clients[0]['id'],
                    'description': 'Mantenimiento preventivo - Revisión general',
                    'labor_cost': 30000.0,
                    'parts_cost': 45000.0,
                    'calculated_total': 75000.0,
                    'final_price': 80000.0,
                    'status': 'Completada',
                    'quote_date': datetime.now().strftime('%Y-%m-%d')
                }
            ]
            
            for quote in sample_quotes:
                self.db.execute("""
                    INSERT INTO quotes (client_id, description, labor_cost, parts_cost, 
                                      calculated_total, final_price, status, quote_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (quote['client_id'], quote['description'], quote['labor_cost'], 
                      quote['parts_cost'], quote['calculated_total'], quote['final_price'], 
                      quote['status'], quote['quote_date']))
            
        except Exception as e:
            print(f"Error creando cotizaciones de muestra: {e}")
    
    def show_quote_form(self):
        """Mostrar formulario de nueva cotización"""
        form_window = tk.Toplevel(self.frame)
        form_window.title("Nueva Cotización")
        form_window.geometry("800x600")
        form_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        form_window.update_idletasks()
        x = (form_window.winfo_screenwidth() // 2) - (800 // 2)
        y = (form_window.winfo_screenheight() // 2) - (600 // 2)
        form_window.geometry(f"800x600+{x}+{y}")
        
        main_frame = create_styled_frame(form_window, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="NUEVA COTIZACIÓN", 
            font=FONTS['heading'],
            bg=COLORS['white']
        )
        title_label.pack(pady=(0, 20))
        
        # Formulario
        form_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        form_frame.pack(fill='x', pady=(0, 20))
        
        # Cliente
        tk.Label(form_frame, text="Cliente:", bg=COLORS['light_gray']).grid(row=0, column=0, sticky='w', padx=10, pady=5)
        client_var = tk.StringVar()
        client_combo = ttk.Combobox(form_frame, textvariable=client_var, width=40)
        client_combo.grid(row=0, column=1, padx=10, pady=5)
        
        # Cargar clientes
        clients = self.db.fetch_all("SELECT id, name FROM clients ORDER BY name")
        client_combo['values'] = [f"{c['id']} - {c['name']}" for c in clients]
        
        # Descripción
        tk.Label(form_frame, text="Descripción:", bg=COLORS['light_gray']).grid(row=1, column=0, sticky='w', padx=10, pady=5)
        desc_text = tk.Text(form_frame, width=50, height=4)
        desc_text.grid(row=1, column=1, padx=10, pady=5)
        
        # Costos calculados automáticamente
        tk.Label(form_frame, text="Costo Mano de Obra:", bg=COLORS['light_gray']).grid(row=2, column=0, sticky='w', padx=10, pady=5)
        labor_entry = create_styled_entry(form_frame, width=20)
        labor_entry.grid(row=2, column=1, sticky='w', padx=10, pady=5)
        
        # Sección de repuestos con búsqueda
        tk.Label(form_frame, text="Repuestos:", bg=COLORS['light_gray'], font=('Arial', 10, 'bold')).grid(row=3, column=0, sticky='w', padx=10, pady=5)
        
        # Frame para repuestos
        parts_frame = tk.Frame(form_frame, bg=COLORS['light_gray'])
        parts_frame.grid(row=3, column=1, sticky='ew', padx=10, pady=5)
        
        # Búsqueda de repuestos
        search_frame = tk.Frame(parts_frame, bg=COLORS['light_gray'])
        search_frame.pack(fill='x', pady=(0, 5))
        
        tk.Label(search_frame, text="Buscar:", bg=COLORS['light_gray']).pack(side='left', padx=(0, 5))
        product_search_var = tk.StringVar()
        product_search_combo = ttk.Combobox(search_frame, textvariable=product_search_var, width=30)
        product_search_combo.pack(side='left', padx=(0, 5))
        
        # Cargar productos
        products = self.db.fetch_all("SELECT id, name, unit_price FROM products ORDER BY name")
        product_search_combo['values'] = [f"{p['id']} - {p['name']} - ${p['unit_price']:.2f}" for p in products]
        
        add_part_btn = create_styled_button(search_frame, text="+ Agregar", command=lambda: self.add_part_to_quote(parts_listbox, product_search_combo), button_type='success', width=10)
        add_part_btn.pack(side='left', padx=(5, 0))
        
        # Lista de repuestos seleccionados
        tk.Label(parts_frame, text="Repuestos seleccionados:", bg=COLORS['light_gray']).pack(anchor='w')
        parts_listbox = tk.Listbox(parts_frame, height=4, width=50)
        parts_listbox.pack(fill='x', pady=(0, 5))
        
        # Botones para repuestos
        parts_buttons_frame = tk.Frame(parts_frame, bg=COLORS['light_gray'])
        parts_buttons_frame.pack(fill='x')
        
        remove_part_btn = create_styled_button(parts_buttons_frame, text="Quitar", command=lambda: self.remove_part_from_quote(parts_listbox), button_type='danger', width=8)
        remove_part_btn.pack(side='left', padx=(0, 5))
        
        clear_parts_btn = create_styled_button(parts_buttons_frame, text="Limpiar", command=lambda: self.clear_parts_from_quote(parts_listbox), button_type='secondary', width=8)
        clear_parts_btn.pack(side='left')
        
        # Total de repuestos
        tk.Label(form_frame, text="Total Repuestos:", bg=COLORS['light_gray']).grid(row=4, column=0, sticky='w', padx=10, pady=5)
        parts_total_label = tk.Label(form_frame, text="$0.00", bg=COLORS['light_gray'], font=('Arial', 10, 'bold'))
        parts_total_label.grid(row=4, column=1, sticky='w', padx=10, pady=5)
        
        # Total calculado (automático)
        tk.Label(form_frame, text="Total Calculado:", bg=COLORS['light_gray'], font=('Arial', 10, 'bold')).grid(row=5, column=0, sticky='w', padx=10, pady=5)
        calc_total_label = tk.Label(form_frame, text="$0.00", bg=COLORS['light_gray'], font=('Arial', 10, 'bold'))
        calc_total_label.grid(row=5, column=1, sticky='w', padx=10, pady=5)
        
        # PRECIO FINAL
        tk.Label(form_frame, text="PRECIO FINAL:", bg=COLORS['light_gray'], 
                font=('Arial', 12, 'bold'), fg=COLORS['primary']).grid(row=6, column=0, sticky='w', padx=10, pady=10)
        final_price_entry = create_styled_entry(form_frame, width=20)
        final_price_entry.grid(row=6, column=1, sticky='w', padx=10, pady=10)
        
        # Función para calcular total automático
        def calculate_total():
            try:
                labor = float(labor_entry.get() or 0)
                # Calcular total de repuestos desde la lista
                parts_total = 0
                for i in range(parts_listbox.size()):
                    item = parts_listbox.get(i)
                    # Extraer precio del formato "ID - Nombre - $precio"
                    if " - $" in item:
                        price_str = item.split(" - $")[-1]
                        parts_total += float(price_str)
                
                parts_total_label.config(text=f"${parts_total:.2f}")
                total = labor + parts_total
                calc_total_label.config(text=f"${total:.2f}")
                # Sugerir precio final (puede ser modificado por el dueño)
                if not final_price_entry.get():
                    final_price_entry.delete(0, tk.END)
                    final_price_entry.insert(0, f"{total:.2f}")
            except ValueError:
                calc_total_label.config(text="Error en cálculo")
        
        # Bind para cálculo automático
        labor_entry.bind('<KeyRelease>', lambda e: calculate_total())
        
        # Función para actualizar cálculo cuando cambien los repuestos
        def update_calculation():
            calculate_total()
        
        # Bind para actualizar cuando cambien los repuestos
        parts_listbox.bind('<<ListboxSelect>>', lambda e: update_calculation())
        
        # Botones
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x')
        
        def save_quote():
            if not client_var.get() or not desc_text.get(1.0, tk.END).strip():
                messagebox.showerror("Error", "Complete cliente y descripción")
                return
            
            try:
                client_id = int(client_var.get().split(' - ')[0])
                description = desc_text.get(1.0, tk.END).strip()
                labor_cost = float(labor_entry.get() or 0)
                
                # Calcular total de repuestos desde la lista
                parts_cost = 0
                parts_list = []
                for i in range(parts_listbox.size()):
                    item = parts_listbox.get(i)
                    if " - $" in item:
                        parts_list.append(item)
                        price_str = item.split(" - $")[-1]
                        parts_cost += float(price_str)
                
                calculated_total = labor_cost + parts_cost
                final_price = float(final_price_entry.get() or calculated_total)
                
                # Guardar cotización
                quote_id = self.db.execute("""
                    INSERT INTO quotes (client_id, description, labor_cost, parts_cost, 
                                      calculated_total, final_price, status, quote_date, parts_list)
                    VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?)
                """, (client_id, description, labor_cost, parts_cost, calculated_total, 
                      final_price, datetime.now().strftime('%Y-%m-%d'), 
                      '|'.join(parts_list)))
                
                # Obtener el ID de la cotización recién creada
                quote_id = self.db.lastrowid
                
                messagebox.showinfo("Éxito", "Cotización creada correctamente")
                form_window.destroy()
                self.load_quotes_async()
                
                # Mostrar opciones de impresión y envío
                self.show_quote_options(quote_id, client_id, description, final_price, parts_list)
                
            except ValueError:
                messagebox.showerror("Error", "Verifique los valores numéricos")
            except Exception as e:
                messagebox.showerror("Error", f"Error guardando cotización: {str(e)}")
        
        save_btn = create_styled_button(
            button_frame, 
            text="💾 Guardar", 
            command=save_quote,
            button_type='success',
            width=15
        )
        save_btn.pack(side='left', padx=(0, 10))
        
        # Botón Imprimir
        print_btn = create_styled_button(
            button_frame,
            text="🖨️ Imprimir",
            command=lambda: self.print_quote_from_form(form_window, client_var, desc_text, labor_entry, parts_listbox, final_price_entry),
            button_type='primary',
            width=15
        )
        print_btn.pack(side='left', padx=(0, 10))
        
        # Botón Enviar por Email
        email_btn = create_styled_button(
            button_frame,
            text="📧 Email",
            command=lambda: self.send_quote_email_from_form(form_window, client_var, desc_text, labor_entry, parts_listbox, final_price_entry),
            button_type='info',
            width=15
        )
        email_btn.pack(side='left', padx=(0, 10))
        
        # Botón Enviar por WhatsApp
        whatsapp_btn = create_styled_button(
            button_frame,
            text="📱 WhatsApp",
            command=lambda: self.send_quote_whatsapp_from_form(form_window, client_var, desc_text, labor_entry, parts_listbox, final_price_entry),
            button_type='warning',
            width=15
        )
        whatsapp_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame, 
            text="❌ Cancelar", 
            command=form_window.destroy,
            button_type='danger',
            width=15
        )
        cancel_btn.pack(side='left')
    
    def show_quote_details(self):
        """Ver detalles completos de la cotización (para el dueño)"""
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        quote = self.db.fetch_one("""
            SELECT q.*, c.name as client_name, c.phone, c.email
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
            WHERE q.id = ?
        """, (quote_id,))
        
        # Crear ventana de detalles
        details_window = tk.Toplevel(self.frame)
        details_window.title("Detalles de Cotización")
        details_window.geometry("700x600")
        details_window.configure(bg=COLORS['white'])
        
        main_frame = create_styled_frame(details_window, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📋 DETALLES COMPLETOS DE COTIZACIÓN", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 20))
        
        # Información del cliente
        info_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        info_frame.pack(fill='x', pady=(0, 15))
        
        tk.Label(info_frame, text=f"Cliente: {quote['client_name']}", 
                bg=COLORS['light_gray'], font=FONTS['body_bold']).pack(anchor='w', padx=10, pady=2)
        tk.Label(info_frame, text=f"Teléfono: {quote['phone'] or 'N/A'}", 
                bg=COLORS['light_gray']).pack(anchor='w', padx=10, pady=2)
        tk.Label(info_frame, text=f"Email: {quote['email'] or 'N/A'}", 
                bg=COLORS['light_gray']).pack(anchor='w', padx=10, pady=2)
        tk.Label(info_frame, text=f"Fecha: {quote['quote_date'][:10] if quote['quote_date'] else 'N/A'}", 
                bg=COLORS['light_gray']).pack(anchor='w', padx=10, pady=2)
        
        # Descripción
        desc_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        desc_frame.pack(fill='x', pady=(0, 15))
        
        tk.Label(desc_frame, text="Descripción del Trabajo:", 
                bg=COLORS['light_gray'], font=FONTS['body_bold']).pack(anchor='w', padx=10, pady=2)
        tk.Label(desc_frame, text=quote['description'], 
                bg=COLORS['light_gray'], wraplength=600, justify='left').pack(anchor='w', padx=10, pady=5)
        
        # ANÁLISIS FINANCIERO COMPLETO
        costs_frame = create_styled_frame(main_frame, bg=COLORS['bg_secondary'])
        costs_frame.pack(fill='x', pady=(0, 15))
        
        tk.Label(costs_frame, text="💰 ANÁLISIS FINANCIERO", 
                bg=COLORS['bg_secondary'], font=FONTS['body_bold'], fg=COLORS['primary']).pack(pady=10)
        
        cost_data = [
            ['Costo Mano de Obra:', f"${quote['labor_cost']:.2f}"],
            ['Costo Repuestos:', f"${quote['parts_cost']:.2f}"],
            ['TOTAL CALCULADO:', f"${quote['calculated_total']:.2f}"],
            ['PRECIO FINAL (Manual):', f"${quote['final_price']:.2f}"],
            ['UTILIDAD:', f"${quote['final_price'] - quote['calculated_total']:.2f}"],
            ['MARGEN:', f"{((quote['final_price'] - quote['calculated_total']) / quote['final_price'] * 100) if quote['final_price'] > 0 else 0:.1f}%"]
        ]
        
        for label, value in cost_data:
            row_frame = tk.Frame(costs_frame, bg=COLORS['bg_secondary'])
            row_frame.pack(fill='x', padx=20, pady=2)
            tk.Label(row_frame, text=label, bg=COLORS['bg_secondary'], width=25, anchor='w').pack(side='left')
            tk.Label(row_frame, text=value, bg=COLORS['bg_secondary'], font=FONTS['body_bold']).pack(side='left')
        
        # Botones de acción
        action_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        action_frame.pack(fill='x', pady=(20, 0))
        
        # Generar PDF para cliente
        pdf_btn = create_styled_button(
            action_frame, 
            text="📄 Generar PDF Cliente", 
            command=lambda: self.generate_client_pdf_from_details(quote_id),
            button_type='success',
            width=20
        )
        pdf_btn.pack(side='left', padx=(0, 10))
        
        # Editar cotización
        edit_btn = create_styled_button(
            action_frame, 
            text="✏️ Editar", 
            command=lambda: [details_window.destroy(), self.edit_quote(quote_id)],
            button_type='primary',
            width=15
        )
        edit_btn.pack(side='left', padx=(0, 10))
        
        # Cerrar
        close_btn = create_styled_button(
            action_frame, 
            text="❌ Cerrar", 
            command=details_window.destroy,
            button_type='danger',
            width=15
        )
        close_btn.pack(side='right')
    
    def generate_client_pdf_dialog(self):
        """Diálogo para generar PDF para cliente"""
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Error", "ReportLab no está instalado. Instale con: pip install reportlab")
            return
            
        selection = self.quotes_tree.selection()
        if not selection:
            messagebox.showwarning("Advertencia", "Seleccione una cotización")
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        
        filename = filedialog.asksaveasfilename(
            title="Guardar Cotización para Cliente",
            defaultextension=".pdf",
            filetypes=[("PDF files", "*.pdf")]
        )
        
        if filename:
            self.generate_client_pdf(quote_id, filename)
            messagebox.showinfo("Éxito", f"Cotización para cliente guardada: {filename}")
    
    def generate_client_pdf_from_details(self, quote_id):
        """Generar PDF desde ventana de detalles"""
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Error", "ReportLab no está instalado. Instale con: pip install reportlab")
            return
            
        filename = filedialog.asksaveasfilename(
            title="Guardar Cotización para Cliente",
            defaultextension=".pdf",
            filetypes=[("PDF files", "*.pdf")]
        )
        
        if filename:
            self.generate_client_pdf(quote_id, filename)
            messagebox.showinfo("Éxito", f"Cotización para cliente guardada: {filename}")
    
    def generate_client_pdf(self, quote_id, filename):
        """Generar PDF simplificado para cliente"""
        if not REPORTLAB_AVAILABLE:
            messagebox.showerror("Error", "ReportLab no está instalado. No se puede generar PDF")
            return
            
        quote = self.db.fetch_one("""
            SELECT q.*, c.name as client_name, c.phone, c.address
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
            WHERE q.id = ?
        """, (quote_id,))
        
        doc = SimpleDocTemplate(filename, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Título
        story.append(Paragraph("COTIZACIÓN DE TRABAJO", styles['Title']))
        story.append(Spacer(1, 20))
        
        # Información del cliente
        story.append(Paragraph("INFORMACIÓN DEL CLIENTE", styles['Heading2']))
        client_data = [
            ['Cliente:', quote['client_name']],
            ['Teléfono:', quote['phone'] or 'N/A'],
            ['Fecha:', quote['quote_date'][:10] if quote['quote_date'] else 'N/A']
        ]
        
        client_table = Table(client_data, colWidths=[2*72, 4*72])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(client_table)
        story.append(Spacer(1, 20))
        
        # Descripción del trabajo
        story.append(Paragraph("TRABAJO A REALIZAR", styles['Heading2']))
        story.append(Paragraph(quote['description'], styles['Normal']))
        story.append(Spacer(1, 30))
        
        # SOLO PRECIO FINAL
        story.append(Paragraph("PRECIO TOTAL", styles['Heading2']))
        price_data = [['PRECIO FINAL:', f"${quote['final_price']:.2f}"]]
        price_table = Table(price_data, colWidths=[3*72, 2*72])
        price_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgreen),
            ('GRID', (0, 0), (-1, -1), 2, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 16),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER')
        ]))
        story.append(price_table)
        story.append(Spacer(1, 30))
        
        # Términos
        story.append(Paragraph("TÉRMINOS Y CONDICIONES", styles['Heading3']))
        terms = [
            "• Cotización válida por 30 días",
            "• Garantía de 90 días en mano de obra",
            "• Repuestos con garantía del fabricante",
            "• Forma de pago según acuerdo previo"
        ]
        for term in terms:
            story.append(Paragraph(term, styles['Normal']))
        
        doc.build(story)
    
    def edit_selected_quote(self, event=None):
        """Editar cotización seleccionada"""
        selection = self.quotes_tree.selection()
        if not selection:
            return
        
        quote_id = self.quotes_tree.item(selection[0])['values'][0]
        # Implementar edición de cotización
        messagebox.showinfo("Info", f"Editando cotización {quote_id}")
    
    def edit_quote(self, quote_id):
        """Editar cotización específica"""
        # Implementar edición de cotización
        messagebox.showinfo("Info", f"Editando cotización {quote_id}")
    
    def add_part_to_quote(self, parts_listbox, product_combo):
        """Agregar repuesto a la cotización"""
        selection = product_combo.get()
        if not selection:
            messagebox.showwarning("Advertencia", "Selecciona un repuesto")
            return
        
        # Verificar si ya está agregado
        for i in range(parts_listbox.size()):
            if parts_listbox.get(i) == selection:
                messagebox.showwarning("Advertencia", "Este repuesto ya está agregado")
                return
        
        parts_listbox.insert(tk.END, selection)
        product_combo.set("")  # Limpiar selección
    
    def remove_part_from_quote(self, parts_listbox):
        """Quitar repuesto seleccionado de la cotización"""
        selection = parts_listbox.curselection()
        if selection:
            parts_listbox.delete(selection[0])
        else:
            messagebox.showwarning("Advertencia", "Selecciona un repuesto para quitar")
    
    def clear_parts_from_quote(self, parts_listbox):
        """Limpiar todos los repuestos de la cotización"""
        parts_listbox.delete(0, tk.END)
    
    def print_quote_from_form(self, form_window, client_var, desc_text, labor_entry, parts_listbox, final_price_entry):
        """Imprimir cotización desde el formulario"""
        try:
            if not client_var.get() or not desc_text.get(1.0, tk.END).strip():
                messagebox.showerror("Error", "Complete cliente y descripción antes de imprimir")
                return
            
            # Obtener datos del cliente
            client_id = int(client_var.get().split(' - ')[0])
            client = self.db.fetch_one("SELECT name, email, phone FROM clients WHERE id = ?", (client_id,))
            
            if not client:
                messagebox.showerror("Error", "Cliente no encontrado")
                return
            
            # Crear datos de cotización temporal
            quote_data = {
                'id': 'TEMP',
                'client_name': client['name'],
                'email': client['email'],
                'phone': client['phone'],
                'description': desc_text.get(1.0, tk.END).strip(),
                'labor_cost': float(labor_entry.get() or 0),
                'final_price': float(final_price_entry.get() or 0),
                'quote_date': datetime.now().strftime('%Y-%m-%d'),
                'parts_list': '|'.join([parts_listbox.get(i) for i in range(parts_listbox.size())])
            }
            
            # Generar PDF
            self.generate_quote_pdf(quote_data)
            messagebox.showinfo("Éxito", "Cotización impresa correctamente")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error imprimiendo cotización: {str(e)}")
    
    def send_quote_email_from_form(self, form_window, client_var, desc_text, labor_entry, parts_listbox, final_price_entry):
        """Enviar cotización por email desde el formulario"""
        try:
            if not client_var.get() or not desc_text.get(1.0, tk.END).strip():
                messagebox.showerror("Error", "Complete cliente y descripción antes de enviar")
                return
            
            # Obtener datos del cliente
            client_id = int(client_var.get().split(' - ')[0])
            client = self.db.fetch_one("SELECT name, email FROM clients WHERE id = ?", (client_id,))
            
            if not client or not client['email']:
                messagebox.showerror("Error", "Cliente no tiene email registrado")
                return
            
            # Obtener datos del formulario
            description = desc_text.get(1.0, tk.END).strip()
            final_price = float(final_price_entry.get() or 0)
            parts_list = [parts_listbox.get(i) for i in range(parts_listbox.size())]
            
            # Crear ventana para configurar email
            self.show_email_config('TEMP', client['name'], client['email'], description, final_price, parts_list)
            
        except Exception as e:
            messagebox.showerror("Error", f"Error enviando email: {str(e)}")
    
    def send_quote_whatsapp_from_form(self, form_window, client_var, desc_text, labor_entry, parts_listbox, final_price_entry):
        """Enviar cotización por WhatsApp desde el formulario"""
        try:
            if not client_var.get() or not desc_text.get(1.0, tk.END).strip():
                messagebox.showerror("Error", "Complete cliente y descripción antes de enviar")
                return
            
            # Obtener datos del cliente
            client_id = int(client_var.get().split(' - ')[0])
            client = self.db.fetch_one("SELECT name, phone FROM clients WHERE id = ?", (client_id,))
            
            if not client or not client['phone']:
                messagebox.showerror("Error", "Cliente no tiene teléfono registrado")
                return
            
            # Obtener datos del formulario
            description = desc_text.get(1.0, tk.END).strip()
            final_price = float(final_price_entry.get() or 0)
            parts_list = [parts_listbox.get(i) for i in range(parts_listbox.size())]
            
            # Crear mensaje de WhatsApp
            message = self.create_whatsapp_message(client['name'], description, final_price, parts_list)
            
            # Abrir WhatsApp Web
            import webbrowser
            whatsapp_url = f"https://web.whatsapp.com/send?phone={client['phone']}&text={message}"
            webbrowser.open(whatsapp_url)
            
            messagebox.showinfo("Éxito", "WhatsApp Web abierto. El mensaje se ha preparado automáticamente.")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error enviando WhatsApp: {str(e)}")
    
    def show_quote_options(self, quote_id, client_id, description, final_price, parts_list):
        """Mostrar opciones de impresión y envío de cotización"""
        options_window = tk.Toplevel(self.frame)
        options_window.title("Opciones de Cotización")
        options_window.geometry("500x400")
        options_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        options_window.update_idletasks()
        x = (options_window.winfo_screenwidth() // 2) - (500 // 2)
        y = (options_window.winfo_screenheight() // 2) - (400 // 2)
        options_window.geometry(f"500x400+{x}+{y}")
        
        main_frame = create_styled_frame(options_window, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="OPCIONES DE COTIZACIÓN", 
            font=FONTS['heading'],
            bg=COLORS['white']
        )
        title_label.pack(pady=(0, 20))
        
        # Información de la cotización
        info_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        info_frame.pack(fill='x', pady=(0, 20))
        
        tk.Label(info_frame, text=f"ID: {quote_id}", bg=COLORS['light_gray']).pack(anchor='w', padx=10, pady=5)
        tk.Label(info_frame, text=f"Cliente: {client_id}", bg=COLORS['light_gray']).pack(anchor='w', padx=10, pady=5)
        tk.Label(info_frame, text=f"Precio Final: ${final_price:.2f}", bg=COLORS['light_gray'], 
                font=('Arial', 12, 'bold')).pack(anchor='w', padx=10, pady=5)
        
        # Botones de acción
        buttons_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        buttons_frame.pack(fill='x', pady=20)
        
        # Botón Imprimir
        print_btn = create_styled_button(
            buttons_frame,
            text="🖨️ IMPRIMIR COTIZACIÓN",
            command=lambda: self.print_quote(quote_id),
            button_type='primary',
            width=25
        )
        print_btn.pack(pady=10)
        
        # Botón Enviar por Email
        email_btn = create_styled_button(
            buttons_frame,
            text="📧 ENVIAR POR EMAIL",
            command=lambda: self.send_quote_email(quote_id, client_id, description, final_price, parts_list),
            button_type='success',
            width=25
        )
        email_btn.pack(pady=10)
        
        # Botón Enviar por WhatsApp
        whatsapp_btn = create_styled_button(
            buttons_frame,
            text="📱 ENVIAR POR WHATSAPP",
            command=lambda: self.send_quote_whatsapp(quote_id, client_id, description, final_price, parts_list),
            button_type='info',
            width=25
        )
        whatsapp_btn.pack(pady=10)
        
        # Botón Cerrar
        close_btn = create_styled_button(
            buttons_frame,
            text="❌ CERRAR",
            command=options_window.destroy,
            button_type='secondary',
            width=25
        )
        close_btn.pack(pady=10)
    
    def print_quote(self, quote_id):
        """Imprimir cotización"""
        try:
            # Obtener datos de la cotización
            quote = self.db.fetch_one("""
                SELECT q.*, c.name as client_name, c.email, c.phone
                FROM quotes q
                JOIN clients c ON q.client_id = c.id
                WHERE q.id = ?
            """, (quote_id,))
            
            if not quote:
                messagebox.showerror("Error", "Cotización no encontrada")
                return
            
            # Generar PDF
            self.generate_quote_pdf(quote)
            messagebox.showinfo("Éxito", "Cotización impresa correctamente")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error imprimiendo cotización: {str(e)}")
    
    def send_quote_email(self, quote_id, client_id, description, final_price, parts_list):
        """Enviar cotización por email"""
        try:
            # Obtener datos del cliente
            client = self.db.fetch_one("SELECT name, email FROM clients WHERE id = ?", (client_id,))
            
            if not client or not client['email']:
                messagebox.showerror("Error", "Cliente no tiene email registrado")
                return
            
            # Crear ventana para configurar email
            self.show_email_config(quote_id, client['name'], client['email'], description, final_price, parts_list)
            
        except Exception as e:
            messagebox.showerror("Error", f"Error enviando email: {str(e)}")
    
    def send_quote_whatsapp(self, quote_id, client_id, description, final_price, parts_list):
        """Enviar cotización por WhatsApp"""
        try:
            # Obtener datos del cliente
            client = self.db.fetch_one("SELECT name, phone FROM clients WHERE id = ?", (client_id,))
            
            if not client or not client['phone']:
                messagebox.showerror("Error", "Cliente no tiene teléfono registrado")
                return
            
            # Crear mensaje de WhatsApp
            message = self.create_whatsapp_message(client['name'], description, final_price, parts_list)
            
            # Abrir WhatsApp Web
            import webbrowser
            whatsapp_url = f"https://web.whatsapp.com/send?phone={client['phone']}&text={message}"
            webbrowser.open(whatsapp_url)
            
            messagebox.showinfo("Éxito", "WhatsApp Web abierto. El mensaje se ha preparado automáticamente.")
            
        except Exception as e:
            messagebox.showerror("Error", f"Error enviando WhatsApp: {str(e)}")
    
    def show_email_config(self, quote_id, client_name, client_email, description, final_price, parts_list):
        """Mostrar configuración de email"""
        email_window = tk.Toplevel(self.frame)
        email_window.title("Enviar Cotización por Email")
        email_window.geometry("600x500")
        email_window.configure(bg=COLORS['white'])
        
        # Centrar ventana
        email_window.update_idletasks()
        x = (email_window.winfo_screenwidth() // 2) - (600 // 2)
        y = (email_window.winfo_screenheight() // 2) - (500 // 2)
        email_window.geometry(f"600x500+{x}+{y}")
        
        main_frame = create_styled_frame(email_window, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="ENVIAR COTIZACIÓN POR EMAIL", 
            font=FONTS['heading'],
            bg=COLORS['white']
        )
        title_label.pack(pady=(0, 20))
        
        # Formulario de email
        form_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        form_frame.pack(fill='both', expand=True, pady=(0, 20))
        
        # Para
        tk.Label(form_frame, text="Para:", bg=COLORS['light_gray']).grid(row=0, column=0, sticky='w', padx=10, pady=5)
        to_entry = create_styled_entry(form_frame, width=50)
        to_entry.insert(0, client_email)
        to_entry.grid(row=0, column=1, padx=10, pady=5)
        
        # Asunto
        tk.Label(form_frame, text="Asunto:", bg=COLORS['light_gray']).grid(row=1, column=0, sticky='w', padx=10, pady=5)
        subject_entry = create_styled_entry(form_frame, width=50)
        subject_entry.insert(0, f"Cotización - {client_name}")
        subject_entry.grid(row=1, column=1, padx=10, pady=5)
        
        # Mensaje
        tk.Label(form_frame, text="Mensaje:", bg=COLORS['light_gray']).grid(row=2, column=0, sticky='nw', padx=10, pady=5)
        message_text = tk.Text(form_frame, width=50, height=15)
        message_text.grid(row=2, column=1, padx=10, pady=5)
        
        # Crear mensaje predefinido
        message = f"""Estimado/a {client_name},

Adjunto encontrará la cotización solicitada:

Descripción: {description}
Precio Final: ${final_price:.2f}

Repuestos incluidos:
"""
        for part in parts_list:
            part_name = part.split(' - $')[0].split(' - ', 1)[1]  # Solo el nombre
            message += f"• {part_name}\n"
        
        message += f"""
La cotización es válida por 30 días.

Quedamos a su disposición para cualquier consulta.

Saludos cordiales,
Resortes Puerto Montt
"""
        
        message_text.insert(1.0, message)
        
        # Botones
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x')
        
        def send_email():
            try:
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart
                from email.mime.base import MIMEBase
                from email import encoders
                
                # Configuración del servidor SMTP (Gmail)
                smtp_server = "smtp.gmail.com"
                smtp_port = 587
                
                # Solicitar credenciales
                from tkinter import simpledialog
                email_user = simpledialog.askstring("Email", "Ingrese su email:")
                email_password = simpledialog.askstring("Contraseña", "Ingrese su contraseña de aplicación:", show='*')
                
                if not email_user or not email_password:
                    return
                
                # Crear mensaje
                msg = MIMEMultipart()
                msg['From'] = email_user
                msg['To'] = to_entry.get()
                msg['Subject'] = subject_entry.get()
                
                # Agregar cuerpo del mensaje
                msg.attach(MIMEText(message_text.get(1.0, tk.END), 'plain'))
                
                # Generar PDF y adjuntarlo
                pdf_filename = f"cotizacion_{quote_id}.pdf"
                self.generate_quote_pdf_for_email(quote_id, pdf_filename)
                
                # Adjuntar PDF
                with open(pdf_filename, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename= {pdf_filename}')
                    msg.attach(part)
                
                # Enviar email
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(email_user, email_password)
                text = msg.as_string()
                server.sendmail(email_user, to_entry.get(), text)
                server.quit()
                
                messagebox.showinfo("Éxito", "Email enviado correctamente")
                email_window.destroy()
                
            except Exception as e:
                messagebox.showerror("Error", f"Error enviando email: {str(e)}")
        
        send_btn = create_styled_button(
            button_frame,
            text="📧 ENVIAR EMAIL",
            command=send_email,
            button_type='success',
            width=20
        )
        send_btn.pack(side='left', padx=(0, 10))
        
        cancel_btn = create_styled_button(
            button_frame,
            text="❌ CANCELAR",
            command=email_window.destroy,
            button_type='secondary',
            width=20
        )
        cancel_btn.pack(side='left')
    
    def create_whatsapp_message(self, client_name, description, final_price, parts_list):
        """Crear mensaje para WhatsApp"""
        message = f"""Hola {client_name}! 👋

Te envío la cotización solicitada:

🔧 *Descripción:* {description}

💰 *Precio Final:* ${final_price:.2f}

📦 *Repuestos incluidos:*
"""
        for part in parts_list:
            part_name = part.split(' - $')[0].split(' - ', 1)[1]  # Solo el nombre
            message += f"• {part_name}\n"
        
        message += f"""
⏰ *Válida por 30 días*

¿Te parece bien? ¡Quedamos atentos a tu respuesta! 😊

Saludos,
Resortes Puerto Montt 🔧"""
        
        return message
    
    def generate_quote_pdf_for_email(self, quote_id, filename):
        """Generar PDF de cotización para email (sin precios de repuestos)"""
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from reportlab.lib.units import inch
            
            # Obtener datos de la cotización
            quote = self.db.fetch_one("""
                SELECT q.*, c.name as client_name, c.email, c.phone
                FROM quotes q
                JOIN clients c ON q.client_id = c.id
                WHERE q.id = ?
            """, (quote_id,))
            
            if not quote:
                return
            
            # Crear PDF
            doc = SimpleDocTemplate(filename, pagesize=letter)
            story = []
            styles = getSampleStyleSheet()
            
            # Título
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1
            )
            story.append(Paragraph("COTIZACIÓN", title_style))
            story.append(Spacer(1, 20))
            
            # Información del cliente
            client_info = f"""
            <b>Cliente:</b> {quote['client_name']}<br/>
            <b>Email:</b> {quote['email']}<br/>
            <b>Teléfono:</b> {quote['phone']}<br/>
            <b>Fecha:</b> {quote['quote_date']}<br/>
            <b>ID Cotización:</b> {quote['id']}
            """
            story.append(Paragraph(client_info, styles['Normal']))
            story.append(Spacer(1, 30))
            
            # Descripción del trabajo
            story.append(Paragraph("<b>DESCRIPCIÓN DEL TRABAJO:</b>", styles['Heading2']))
            story.append(Paragraph(quote['description'], styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Repuestos (sin precios)
            if quote.get('parts_list'):
                story.append(Paragraph("<b>REPUESTOS INCLUIDOS:</b>", styles['Heading2']))
                parts = quote['parts_list'].split('|')
                for part in parts:
                    if part.strip():
                        part_name = part.split(' - $')[0].split(' - ', 1)[1]  # Solo el nombre
                        story.append(Paragraph(f"• {part_name}", styles['Normal']))
                story.append(Spacer(1, 20))
            
            # Precio final
            price_data = [['PRECIO FINAL:', f"${quote['final_price']:.2f}"]]
            price_table = Table(price_data, colWidths=[3*72, 2*72])
            price_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.lightgreen),
                ('GRID', (0, 0), (-1, -1), 2, colors.black),
                ('FONTSIZE', (0, 0), (-1, -1), 16),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER')
            ]))
            story.append(price_table)
            story.append(Spacer(1, 30))
            
            # Términos
            story.append(Paragraph("TÉRMINOS Y CONDICIONES", styles['Heading3']))
            terms = [
                "• Cotización válida por 30 días",
                "• Garantía de 90 días en mano de obra",
                "• Repuestos con garantía del fabricante",
                "• Forma de pago según acuerdo previo"
            ]
            for term in terms:
                story.append(Paragraph(term, styles['Normal']))
            
            # Pie de página
            story.append(Spacer(1, 50))
            footer = Paragraph(
                f"<b>Resortes Puerto Montt</b><br/>"
                f"Email: info@resortesptomontt.com<br/>"
                f"Teléfono: +56 9 1234 5678",
                styles['Normal']
            )
            story.append(footer)
            
            doc.build(story)
            
        except Exception as e:
            print(f"Error generando PDF: {str(e)}")
