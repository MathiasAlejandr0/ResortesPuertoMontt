"""
Módulo de reportes mejorado con precios ocultos para clientes
Genera informes donde el dueño ve todos los costos pero el cliente solo ve el precio final
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from .styles import create_styled_button, create_styled_frame, create_styled_label, COLORS, FONTS

class EnhancedReportsModule:
    def __init__(self, parent, db, user_role):
        self.parent = parent
        self.db = db
        self.user_role = user_role
        self.frame = tk.Frame(parent)
        self.create_widgets()
    
    def create_widgets(self):
        """Crear interfaz de reportes mejorados"""
        main_frame = create_styled_frame(self.frame, bg=COLORS['white'])
        main_frame.pack(fill='both', expand=True, padx=15, pady=15)
        
        # Título
        title_label = create_styled_label(
            main_frame, 
            text="📋 REPORTES MEJORADOS", 
            font=FONTS['heading'],
            bg=COLORS['primary'],
            fg='white'
        )
        title_label.pack(fill='x', pady=(0, 15))
        
        # Botones de reportes
        button_frame = create_styled_frame(main_frame, bg=COLORS['white'])
        button_frame.pack(fill='x', pady=(0, 15))
        
        # Reporte para dueño (con costos detallados)
        owner_report_btn = create_styled_button(
            button_frame, 
            text="👑 Reporte Dueño (Detallado)", 
            command=self.generate_owner_report,
            button_type='primary',
            width=25
        )
        owner_report_btn.pack(side='left', padx=(0, 10))
        
        # Reporte para cliente (solo precio final)
        client_report_btn = create_styled_button(
            button_frame, 
            text="👤 Reporte Cliente (Precio Final)", 
            command=self.generate_client_report,
            button_type='success',
            width=25
        )
        client_report_btn.pack(side='left', padx=(0, 10))
        
        # Selector de trabajo
        work_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        work_frame.pack(fill='x', pady=(0, 15))
        
        work_label = create_styled_label(work_frame, text="Seleccionar Trabajo:", bg=COLORS['light_gray'])
        work_label.pack(side='left', padx=10, pady=10)
        
        self.work_var = tk.StringVar()
        self.work_combo = ttk.Combobox(work_frame, textvariable=self.work_var, width=50)
        self.work_combo.pack(side='left', padx=10, pady=10)
        
        # Campo para precio final manual
        price_frame = create_styled_frame(main_frame, bg=COLORS['light_gray'])
        price_frame.pack(fill='x', pady=(0, 15))
        
        price_label = create_styled_label(price_frame, text="Precio Final (Manual):", bg=COLORS['light_gray'])
        price_label.pack(side='left', padx=10, pady=10)
        
        self.final_price_entry = tk.Entry(price_frame, width=20)
        self.final_price_entry.pack(side='left', padx=10, pady=10)
        
        # Cargar trabajos
        self.load_work_orders()
    
    def load_work_orders(self):
        """Cargar órdenes de trabajo"""
        works = self.db.fetch_all("""
            SELECT wo.id, c.name as client_name, wo.description, wo.status
            FROM work_orders wo
            JOIN clients c ON wo.client_id = c.id
            ORDER BY wo.created_at DESC
        """)
        
        work_list = [f"{work['id']} - {work['client_name']} - {work['description'][:30]}..." 
                    for work in works]
        self.work_combo['values'] = work_list
    
    def generate_owner_report(self):
        """Generar reporte detallado para el dueño"""
        if not self.work_var.get():
            messagebox.showwarning("Advertencia", "Seleccione un trabajo")
            return
        
        work_id = int(self.work_var.get().split(' - ')[0])
        
        # Obtener datos del trabajo
        work_data = self.get_work_details(work_id)
        if not work_data:
            messagebox.showerror("Error", "No se encontró el trabajo")
            return
        
        # Generar PDF para dueño
        filename = filedialog.asksaveasfilename(
            title="Guardar Reporte Dueño",
            defaultextension=".pdf",
            filetypes=[("PDF files", "*.pdf")]
        )
        
        if filename:
            self.create_owner_pdf(work_data, filename)
            messagebox.showinfo("Éxito", f"Reporte generado: {filename}")
    
    def generate_client_report(self):
        """Generar reporte simplificado para cliente"""
        if not self.work_var.get():
            messagebox.showwarning("Advertencia", "Seleccione un trabajo")
            return
        
        if not self.final_price_entry.get():
            messagebox.showwarning("Advertencia", "Ingrese el precio final")
            return
        
        work_id = int(self.work_var.get().split(' - ')[0])
        final_price = float(self.final_price_entry.get())
        
        # Obtener datos del trabajo
        work_data = self.get_work_details(work_id)
        if not work_data:
            messagebox.showerror("Error", "No se encontró el trabajo")
            return
        
        # Generar PDF para cliente
        filename = filedialog.asksaveasfilename(
            title="Guardar Reporte Cliente",
            defaultextension=".pdf",
            filetypes=[("PDF files", "*.pdf")]
        )
        
        if filename:
            self.create_client_pdf(work_data, final_price, filename)
            messagebox.showinfo("Éxito", f"Reporte generado: {filename}")
    
    def get_work_details(self, work_id):
        """Obtener detalles completos del trabajo"""
        # Información básica del trabajo
        work = self.db.fetch_one("""
            SELECT wo.*, c.name as client_name, c.phone, c.email, c.rut,
                   m.license_plate, m.brand, m.model, m.year
            FROM work_orders wo
            JOIN clients c ON wo.client_id = c.id
            LEFT JOIN machines m ON wo.machine_id = m.id
            WHERE wo.id = ?
        """, (work_id,))
        
        if not work:
            return None
        
        # Trabajadores asignados
        workers = self.db.fetch_all("""
            SELECT w.name, w.position, wow.hours_worked, w.hourly_rate
            FROM work_order_workers wow
            JOIN workers w ON wow.worker_id = w.id
            WHERE wow.work_order_id = ?
        """, (work_id,))
        
        # Repuestos utilizados
        parts = self.db.fetch_all("""
            SELECT p.name, p.code, wop.quantity_used, wop.unit_price, wop.total_price
            FROM work_order_parts wop
            JOIN products p ON wop.product_id = p.id
            WHERE wop.work_order_id = ?
        """, (work_id,))
        
        return {
            'work': work,
            'workers': workers,
            'parts': parts
        }
    
    def create_owner_pdf(self, data, filename):
        """Crear PDF detallado para el dueño"""
        doc = SimpleDocTemplate(filename, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center
        )
        story.append(Paragraph("REPORTE DETALLADO PARA DUEÑO", title_style))
        story.append(Spacer(1, 20))
        
        # Información del cliente
        story.append(Paragraph("INFORMACIÓN DEL CLIENTE", styles['Heading2']))
        client_data = [
            ['Cliente:', data['work']['client_name']],
            ['RUT:', data['work']['rut'] or 'N/A'],
            ['Teléfono:', data['work']['phone'] or 'N/A'],
            ['Email:', data['work']['email'] or 'N/A']
        ]
        client_table = Table(client_data, colWidths=[2*inch, 4*inch])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(client_table)
        story.append(Spacer(1, 20))
        
        # Información del vehículo
        if data['work']['license_plate']:
            story.append(Paragraph("INFORMACIÓN DEL VEHÍCULO", styles['Heading2']))
            vehicle_data = [
                ['Patente:', data['work']['license_plate']],
                ['Marca:', data['work']['brand'] or 'N/A'],
                ['Modelo:', data['work']['model'] or 'N/A'],
                ['Año:', str(data['work']['year']) if data['work']['year'] else 'N/A']
            ]
            vehicle_table = Table(vehicle_data, colWidths=[2*inch, 4*inch])
            vehicle_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(vehicle_table)
            story.append(Spacer(1, 20))
        
        # Detalles del trabajo
        story.append(Paragraph("DETALLES DEL TRABAJO", styles['Heading2']))
        story.append(Paragraph(f"Descripción: {data['work']['description']}", styles['Normal']))
        story.append(Paragraph(f"Estado: {data['work']['status']}", styles['Normal']))
        story.append(Paragraph(f"Fecha: {data['work']['start_date'][:10] if data['work']['start_date'] else 'N/A'}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Trabajadores (con costos)
        if data['workers']:
            story.append(Paragraph("TRABAJADORES Y COSTOS DE MANO DE OBRA", styles['Heading2']))
            worker_data = [['Trabajador', 'Posición', 'Horas', 'Tarifa/Hora', 'Costo Total']]
            total_labor = 0
            
            for worker in data['workers']:
                cost = worker['hours_worked'] * worker['hourly_rate']
                total_labor += cost
                worker_data.append([
                    worker['name'],
                    worker['position'],
                    f"{worker['hours_worked']:.1f}",
                    f"${worker['hourly_rate']:.2f}",
                    f"${cost:.2f}"
                ])
            
            worker_data.append(['', '', '', 'TOTAL MANO DE OBRA:', f"${total_labor:.2f}"])
            
            worker_table = Table(worker_data, colWidths=[1.5*inch, 1.2*inch, 0.8*inch, 1*inch, 1*inch])
            worker_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(worker_table)
            story.append(Spacer(1, 20))
        
        # Repuestos (con costos)
        if data['parts']:
            story.append(Paragraph("REPUESTOS Y MATERIALES", styles['Heading2']))
            parts_data = [['Código', 'Repuesto', 'Cantidad', 'Precio Unit.', 'Total']]
            total_parts = 0
            
            for part in data['parts']:
                total_parts += part['total_price']
                parts_data.append([
                    part['code'],
                    part['name'],
                    f"{part['quantity_used']:.2f}",
                    f"${part['unit_price']:.2f}",
                    f"${part['total_price']:.2f}"
                ])
            
            parts_data.append(['', '', '', 'TOTAL REPUESTOS:', f"${total_parts:.2f}"])
            
            parts_table = Table(parts_data, colWidths=[1*inch, 2*inch, 1*inch, 1*inch, 1*inch])
            parts_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(parts_table)
            story.append(Spacer(1, 20))
        
        # Resumen financiero
        story.append(Paragraph("RESUMEN FINANCIERO", styles['Heading2']))
        total_cost = (total_labor if 'total_labor' in locals() else 0) + (total_parts if 'total_parts' in locals() else 0)
        final_price = float(self.final_price_entry.get()) if self.final_price_entry.get() else total_cost
        profit = final_price - total_cost
        margin = (profit / final_price * 100) if final_price > 0 else 0
        
        financial_data = [
            ['Costo Mano de Obra:', f"${total_labor if 'total_labor' in locals() else 0:.2f}"],
            ['Costo Repuestos:', f"${total_parts if 'total_parts' in locals() else 0:.2f}"],
            ['COSTO TOTAL:', f"${total_cost:.2f}"],
            ['PRECIO FINAL:', f"${final_price:.2f}"],
            ['UTILIDAD:', f"${profit:.2f}"],
            ['MARGEN:', f"{margin:.1f}%"]
        ]
        
        financial_table = Table(financial_data, colWidths=[3*inch, 2*inch])
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 2), (-1, 2), colors.lightgrey),
            ('BACKGROUND', (0, 3), (-1, 3), colors.lightgreen),
            ('BACKGROUND', (0, 4), (-1, 4), colors.lightblue),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 2), (-1, -1), 12),
            ('FONTNAME', (0, 2), (-1, -1), 'Helvetica-Bold')
        ]))
        story.append(financial_table)
        
        doc.build(story)
    
    def create_client_pdf(self, data, final_price, filename):
        """Crear PDF simplificado para cliente (solo precio final)"""
        doc = SimpleDocTemplate(filename, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1
        )
        story.append(Paragraph("PRESUPUESTO DE TRABAJO", title_style))
        story.append(Spacer(1, 20))
        
        # Información del cliente
        story.append(Paragraph("INFORMACIÓN DEL CLIENTE", styles['Heading2']))
        client_data = [
            ['Cliente:', data['work']['client_name']],
            ['Teléfono:', data['work']['phone'] or 'N/A']
        ]
        client_table = Table(client_data, colWidths=[2*inch, 4*inch])
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(client_table)
        story.append(Spacer(1, 20))
        
        # Información del vehículo
        if data['work']['license_plate']:
            story.append(Paragraph("VEHÍCULO", styles['Heading2']))
            vehicle_info = f"Patente: {data['work']['license_plate']}"
            if data['work']['brand']:
                vehicle_info += f" - {data['work']['brand']}"
            if data['work']['model']:
                vehicle_info += f" {data['work']['model']}"
            story.append(Paragraph(vehicle_info, styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Descripción del trabajo
        story.append(Paragraph("TRABAJO REALIZADO", styles['Heading2']))
        story.append(Paragraph(data['work']['description'], styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Trabajadores (sin costos)
        if data['workers']:
            story.append(Paragraph("PERSONAL ASIGNADO", styles['Heading2']))
            for worker in data['workers']:
                story.append(Paragraph(f"• {worker['name']} - {worker['position']}", styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Solo precio final
        story.append(Paragraph("TOTAL DEL TRABAJO", styles['Heading2']))
        price_data = [['PRECIO FINAL:', f"${final_price:.2f}"]]
        price_table = Table(price_data, colWidths=[3*inch, 2*inch])
        price_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgreen),
            ('GRID', (0, 0), (-1, -1), 2, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 16),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER')
        ]))
        story.append(price_table)
        story.append(Spacer(1, 30))
        
        # Términos y condiciones
        story.append(Paragraph("TÉRMINOS Y CONDICIONES", styles['Heading3']))
        terms = [
            "• Presupuesto válido por 30 días",
            "• Garantía de 90 días en mano de obra",
            "• Repuestos con garantía del fabricante",
            "• Pago al contado o según acuerdo previo"
        ]
        for term in terms:
            story.append(Paragraph(term, styles['Normal']))
        
        doc.build(story)
