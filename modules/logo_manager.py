"""
Gestor de Logo y Imágenes - Resortes Puerto Montt
"""

import os
import tkinter as tk
from PIL import Image, ImageTk
from modules.styles import COLORS, FONTS

class LogoManager:
    def __init__(self):
        self.logo_path = "ResortesPtoMontt.png"
        self.logo_image = None
        self.logo_photo = None
        self.logo_small = None
        self.logo_medium = None
        self.logo_large = None
        self.load_logo()
    
    def load_logo(self):
        """Cargar y procesar el logo en diferentes tamaños"""
        try:
            if os.path.exists(self.logo_path):
                # Cargar imagen original
                self.logo_image = Image.open(self.logo_path)
                
                # Crear diferentes tamaños
                self.logo_small = self.resize_logo(32, 32)      # Para iconos pequeños
                self.logo_medium = self.resize_logo(64, 64)     # Para botones y headers
                self.logo_large = self.resize_logo(128, 128)    # Para login y dashboard
                
                print("Logo cargado exitosamente")
            else:
                print(f"Error: No se encontró el archivo {self.logo_path}")
                self.create_fallback_logo()
                
        except Exception as e:
            print(f"Error cargando logo: {e}")
            self.create_fallback_logo()
    
    def resize_logo(self, width, height):
        """Redimensionar logo manteniendo proporciones"""
        try:
            # Calcular proporciones para mantener aspect ratio
            img_width, img_height = self.logo_image.size
            aspect_ratio = img_width / img_height
            
            if aspect_ratio > width / height:
                # La imagen es más ancha
                new_width = width
                new_height = int(width / aspect_ratio)
            else:
                # La imagen es más alta
                new_height = height
                new_width = int(height * aspect_ratio)
            
            # Redimensionar con alta calidad
            resized = self.logo_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Crear imagen con fondo transparente
            final_image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            
            # Centrar la imagen
            x_offset = (width - new_width) // 2
            y_offset = (height - new_height) // 2
            final_image.paste(resized, (x_offset, y_offset), resized if resized.mode == 'RGBA' else None)
            
            return ImageTk.PhotoImage(final_image)
            
        except Exception as e:
            print(f"Error redimensionando logo: {e}")
            return self.create_fallback_logo()
    
    def create_fallback_logo(self):
        """Crear logo de respaldo si no se encuentra el archivo"""
        try:
            # Crear imagen simple con texto
            from PIL import ImageDraw, ImageFont
            
            # Crear imagen base
            img = Image.new('RGBA', (128, 128), (255, 255, 255, 0))
            draw = ImageDraw.Draw(img)
            
            # Dibujar círculo de fondo
            draw.ellipse([10, 10, 118, 118], fill=COLORS['primary'], outline=COLORS['primary_dark'], width=3)
            
            # Intentar usar fuente del sistema
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                font = ImageFont.load_default()
            
            # Dibujar texto
            text = "RPM"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            x = (128 - text_width) // 2
            y = (128 - text_height) // 2
            
            draw.text((x, y), text, fill='white', font=font)
            
            # Crear PhotoImage
            self.logo_large = ImageTk.PhotoImage(img)
            self.logo_medium = self.resize_logo(64, 64)
            self.logo_small = self.resize_logo(32, 32)
            
        except Exception as e:
            print(f"Error creando logo de respaldo: {e}")
            # Crear imagen completamente transparente como último recurso
            img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
            self.logo_large = ImageTk.PhotoImage(img)
            self.logo_medium = self.resize_logo(64, 64)
            self.logo_small = self.resize_logo(32, 32)
    
    def get_logo_small(self):
        """Obtener logo pequeño (32x32)"""
        return self.logo_small
    
    def get_logo_medium(self):
        """Obtener logo mediano (64x64)"""
        return self.logo_medium
    
    def get_logo_large(self):
        """Obtener logo grande (128x128)"""
        return self.logo_large
    
    def create_logo_label(self, parent, size='medium', **kwargs):
        """Crear label con logo"""
        if size == 'small':
            logo_photo = self.get_logo_small()
        elif size == 'large':
            logo_photo = self.get_logo_large()
        else:  # medium
            logo_photo = self.get_logo_medium()
        
        # Configuración por defecto
        default_config = {
            'image': logo_photo,
            'bg': COLORS.get('bg_primary', '#FFFFFF'),
            'relief': 'flat',
            'borderwidth': 0
        }
        
        # Combinar con configuración personalizada
        config = {**default_config, **kwargs}
        
        return tk.Label(parent, **config)
    
    def create_logo_button(self, parent, size='medium', command=None, **kwargs):
        """Crear botón con logo"""
        if size == 'small':
            logo_photo = self.get_logo_small()
        elif size == 'large':
            logo_photo = self.get_logo_large()
        else:  # medium
            logo_photo = self.get_logo_medium()
        
        # Configuración por defecto
        default_config = {
            'image': logo_photo,
            'command': command,
            'bg': COLORS.get('primary', '#FF2511'),
            'relief': 'flat',
            'borderwidth': 0,
            'cursor': 'hand2'
        }
        
        # Combinar con configuración personalizada
        config = {**default_config, **kwargs}
        
        button = tk.Button(parent, **config)
        
        # Efectos hover
        def on_enter(event):
            button.configure(bg=COLORS.get('primary_light', '#FF4A3A'))
        
        def on_leave(event):
            button.configure(bg=COLORS.get('primary', '#FF2511'))
        
        button.bind('<Enter>', on_enter)
        button.bind('<Leave>', on_leave)
        
        return button
    
    def set_window_icon(self, window):
        """Establecer icono de ventana"""
        try:
            if os.path.exists(self.logo_path):
                # Usar el archivo PNG directamente como icono
                window.iconphoto(True, self.get_logo_small())
            else:
                # Usar logo de respaldo
                window.iconphoto(True, self.get_logo_small())
        except Exception as e:
            print(f"Error estableciendo icono de ventana: {e}")
    
    def create_branded_header(self, parent, title="", subtitle=""):
        """Crear header con logo y texto de marca"""
        header_frame = tk.Frame(parent, bg=COLORS.get('primary', '#FF2511'))
        header_frame.pack(fill='x', pady=(0, 10))
        
        # Frame interno para centrar contenido
        inner_frame = tk.Frame(header_frame, bg=COLORS.get('primary', '#FF2511'))
        inner_frame.pack(expand=True, fill='both', padx=20, pady=15)
        
        # Logo
        logo_label = self.create_logo_label(
            inner_frame, 
            size='medium',
            bg=COLORS.get('primary', '#FF2511')
        )
        logo_label.pack(side='left', padx=(0, 15))
        
        # Frame para texto
        text_frame = tk.Frame(inner_frame, bg=COLORS.get('primary', '#FF2511'))
        text_frame.pack(side='left', fill='both', expand=True)
        
        # Título principal
        if title:
            title_label = tk.Label(
                text_frame,
                text=title,
                font=FONTS.get('title', ('Segoe UI', 24, 'bold')),
                fg=COLORS.get('text_light', '#FFFFFF'),
                bg=COLORS.get('primary', '#FF2511')
            )
            title_label.pack(anchor='w')
        
        # Subtítulo
        if subtitle:
            subtitle_label = tk.Label(
                text_frame,
                text=subtitle,
                font=FONTS.get('subtitle', ('Segoe UI', 14)),
                fg=COLORS.get('text_light', '#FFFFFF'),
                bg=COLORS.get('primary', '#FF2511')
            )
            subtitle_label.pack(anchor='w')
        
        return header_frame
