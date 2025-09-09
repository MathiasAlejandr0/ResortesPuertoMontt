"""
Sistema de cotizaciones con precios ocultos
- Para el dueño: muestra todos los costos + permite establecer precio final manualmente
- Para el cliente: solo muestra el precio final establecido por el dueño
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
        """Crear interfaz de cotizaciones mejorada"""
        main_frame = create_styled_frame(self.frame, bg=COLORS['bg_primary'])
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📋 COTIZACIONES CON PRECIOS OCULTOS", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Botones principales
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Nueva cotización
        new_btn = create_styled_button(
            button_frame, 
            text="➕ Nueva Cotización", 
            command=self.show_quote_form,
            button_type='success',
            width=18
        )
        new_btn.pack(side='left', padx=(0, 10))
        
        # Ver detalles completos (para el dueño)
        details_btn = create_styled_button(
            button_frame, 
            text="👁️ Ver Detalles", 
            command=self.show_quote_details,
            button_type='primary',
            width=15
        )
        details_btn.pack(side='left', padx=(0, 10))
        
        # Generar PDF para cliente
        generate_pdf_btn = create_styled_button(
            button_frame, 
            text="📄 Generar PDF Cliente", 
            command=self.generate_client_pdf_dialog,
            button_type='success',
            width=20
        )
        generate_pdf_btn.pack(side='left', padx=(0, 10))
        
        # Editar cotización
        edit_btn = create_styled_button(
            button_frame, 
            text="✏️ Editar", 
            command=self.edit_selected_quote,
            button_type='info',
            width=12
        )
        edit_btn.pack(side='left', padx=(0, 10))
        
        # Tabla de cotizaciones
        table_frame = create_styled_frame(main_frame, bg=COLORS['white'])
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
        
        tk.Label(form_frame, text="Costo Repuestos:", bg=COLORS['light_gray']).grid(row=3, column=0, sticky='w', padx=10, pady=5)
        parts_entry = create_styled_entry(form_frame, width=20)
        parts_entry.grid(row=3, column=1, sticky='w', padx=10, pady=5)
        
        # Total calculado (automático)
        tk.Label(form_frame, text="Total Calculado:", bg=COLORS['light_gray'], font=('Arial', 10, 'bold')).grid(row=4, column=0, sticky='w', padx=10, pady=5)
        calc_total_label = tk.Label(form_frame, text="$0.00", bg=COLORS['light_gray'], font=('Arial', 10, 'bold'))
        calc_total_label.grid(row=4, column=1, sticky='w', padx=10, pady=5)
        
        # PRECIO FINAL (manual del dueño)
        tk.Label(form_frame, text="PRECIO FINAL (Manual):", bg=COLORS['light_gray'], 
                font=('Arial', 12, 'bold'), fg=COLORS['primary']).grid(row=5, column=0, sticky='w', padx=10, pady=10)
        final_price_entry = create_styled_entry(form_frame, width=20)
        final_price_entry.grid(row=5, column=1, sticky='w', padx=10, pady=10)
        
        # Función para calcular total automático
        def calculate_total():
            try:
                labor = float(labor_entry.get() or 0)
                parts = float(parts_entry.get() or 0)
                total = labor + parts
                calc_total_label.config(text=f"${total:.2f}")
                # Sugerir precio final (puede ser modificado por el dueño)
                if not final_price_entry.get():
                    final_price_entry.delete(0, tk.END)
                    final_price_entry.insert(0, f"{total:.2f}")
            except ValueError:
                calc_total_label.config(text="Error en cálculo")
        
        # Bind para cálculo automático
        labor_entry.bind('<KeyRelease>', lambda e: calculate_total())
        parts_entry.bind('<KeyRelease>', lambda e: calculate_total())
        
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
                parts_cost = float(parts_entry.get() or 0)
                calculated_total = labor_cost + parts_cost
                final_price = float(final_price_entry.get() or calculated_total)
                
                # Guardar cotización
                self.db.execute("""
                    INSERT INTO quotes (client_id, description, labor_cost, parts_cost, 
                                      calculated_total, final_price, status, quote_date)
                    VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', ?)
                """, (client_id, description, labor_cost, parts_cost, calculated_total, 
                      final_price, datetime.now().strftime('%Y-%m-%d')))
                
                messagebox.showinfo("Éxito", "Cotización creada correctamente")
                form_window.destroy()
                self.load_quotes_async()
                
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
