import tkinter as tk
from tkinter import ttk
import tkinter.font as tkFont

# Paleta de colores institucional moderna - Resortes Puerto Montt 2025
COLORS = {
    # Colores institucionales principales
    'primary': '#A51611',       # Rojo bermellón oscuro
    'primary_light': '#C41E3A', # Rojo bermellón claro
    'primary_dark': '#8B0000',  # Rojo bermellón muy oscuro
    'secondary': '#2C3E50',     # Azul marino elegante
    'secondary_light': '#34495E', # Azul marino claro
    'accent': '#F39C12',        # Naranja dorado
    'accent_light': '#F7DC6F',  # Amarillo suave
    
    # Colores de estado modernos
    'success': '#28A745',       # Verde éxito
    'success_light': '#D4EDDA', # Verde claro
    'warning': '#FFC107',       # Amarillo advertencia
    'warning_light': '#FFF3CD', # Amarillo claro
    'danger': '#DC3545',        # Rojo peligro
    'danger_light': '#F8D7DA',  # Rojo claro
    'info': '#17A2B8',          # Azul información
    'info_light': '#D1ECF1',    # Azul claro
    
    # Colores de fondo modernos
    'bg_primary': '#F8F9FA',    # Blanco suave
    'bg_secondary': '#E9ECEF',  # Gris muy claro
    'bg_tertiary': '#DEE2E6',   # Gris claro
    'bg_dark': '#212529',       # Gris oscuro
    'white': '#FFFFFF',         # Blanco puro
    'light_gray': '#F1F3F4',    # Gris muy claro
    'card_bg': '#FFFFFF',       # Fondo de tarjetas
    
    # Colores de texto jerárquicos
    'text_primary': '#212529',  # Texto principal
    'text_secondary': '#6C757D', # Texto secundario
    'text_muted': '#ADB5BD',    # Texto atenuado
    'text_light': '#FFFFFF',    # Texto claro
    'text_dark': '#000000',     # Texto oscuro
    
    # Colores de bordes y sombras
    'border': '#E9ECEF',        # Borde claro
    'border_light': '#E9ECEF',  # Borde muy claro
    'border_medium': '#DEE2E6', # Borde medio
    'border_dark': '#ADB5BD',   # Borde oscuro
    'card_shadow': '#E0DFDB',   # Sombra de tarjetas
}

# Tipografía moderna y jerárquica
FONTS = {
    'heading': ('Segoe UI', 18, 'bold'),
    'title': ('Segoe UI', 16, 'bold'),
    'subtitle': ('Segoe UI', 14, 'bold'),
    'body': ('Segoe UI', 11),
    'body_bold': ('Segoe UI', 11, 'bold'),
    'small': ('Segoe UI', 9),
    'small_bold': ('Segoe UI', 9, 'bold'),
    'button': ('Segoe UI', 11, 'bold'),
    'caption': ('Segoe UI', 10),
}

def create_styled_button(parent, text, command=None, button_type='primary', 
                        width=None, height=None, **kwargs):
    """Crear botón con estilo moderno y estable"""
    # Configuración de colores por tipo
    button_configs = {
        'primary': {
            'bg': COLORS['primary'],
            'fg': COLORS['text_light'],
            'activebackground': COLORS['primary_dark'],
            'activeforeground': COLORS['text_light']
        },
        'secondary': {
            'bg': COLORS['secondary'],
            'fg': COLORS['text_light'],
            'activebackground': COLORS['secondary_light'],
            'activeforeground': COLORS['text_light']
        },
        'success': {
            'bg': COLORS['success'],
            'fg': COLORS['text_light'],
            'activebackground': '#218838',
            'activeforeground': COLORS['text_light']
        },
        'warning': {
            'bg': COLORS['warning'],
            'fg': COLORS['text_dark'],
            'activebackground': '#E0A800',
            'activeforeground': COLORS['text_dark']
        },
        'danger': {
            'bg': COLORS['danger'],
            'fg': COLORS['text_light'],
            'activebackground': '#C82333',
            'activeforeground': COLORS['text_light']
        },
        'info': {
            'bg': COLORS['info'],
            'fg': COLORS['text_light'],
            'activebackground': '#138496',
            'activeforeground': COLORS['text_light']
        }
    }
    
    config = button_configs.get(button_type, button_configs['primary'])
    
    button = tk.Button(
        parent,
        text=text,
        command=command,
        font=FONTS['button'],
        bg=config['bg'],
        fg=config['fg'],
        activebackground=config['activebackground'],
        activeforeground=config['activeforeground'],
        relief='solid',
        bd=1,
        cursor='hand2',
        width=width,
        height=height,
        **kwargs
    )
    
    return button

def create_styled_label(parent, text, font=None, bg=None, fg=None, **kwargs):
    """Crear etiqueta con estilo moderno"""
    return tk.Label(
        parent,
        text=text,
        font=font or FONTS['body'],
        bg=bg or COLORS['white'],
        fg=fg or COLORS['text_primary'],
        **kwargs
    )

def create_styled_entry(parent, width=None, placeholder=None, **kwargs):
    """Crear campo de entrada con estilo moderno"""
    # Remover placeholder de kwargs si existe
    if 'placeholder' in kwargs:
        placeholder = kwargs.pop('placeholder')
    
    entry = tk.Entry(
        parent,
        font=FONTS['body'],
        bg=COLORS['white'],
        fg=COLORS['text_primary'],
        relief='solid',
        bd=1,
        width=width,
        highlightthickness=0,
        **kwargs
    )
    
    # Implementar placeholder si se proporciona
    if placeholder:
        entry.insert(0, placeholder)
        entry.configure(fg=COLORS['text_muted'])
        
        def on_focus_in(event):
            if entry.get() == placeholder:
                entry.delete(0, tk.END)
                entry.configure(fg=COLORS['text_primary'])
        
        def on_focus_out(event):
            if not entry.get():
                entry.insert(0, placeholder)
                entry.configure(fg=COLORS['text_muted'])
        
        entry.bind('<FocusIn>', on_focus_in)
        entry.bind('<FocusOut>', on_focus_out)
    
    return entry

def create_styled_frame(parent, bg=None, **kwargs):
    """Crear frame con estilo moderno"""
    return tk.Frame(
        parent,
        bg=bg or COLORS['white'],
        relief='flat',
        bd=0,
        **kwargs
    )

def create_card_frame(parent, title=None, card_type='primary', **kwargs):
    """Crear frame tipo tarjeta moderna"""
    # Frame principal de la tarjeta
    card_container = tk.Frame(parent, bg=COLORS['bg_primary'])
    
    # Frame de la tarjeta
    card_frame = tk.Frame(
        card_container,
        bg=COLORS['white'],
        relief='solid',
        bd=1,
        highlightbackground=COLORS['border_light'],
        highlightthickness=1
    )
    card_frame.pack(fill='both', expand=True, padx=2, pady=2)
    
    # Header si se especifica título
    if title:
        header_frame = tk.Frame(card_frame, bg=COLORS['primary'], height=40)
        header_frame.pack(fill='x')
        header_frame.pack_propagate(False)
        
        title_label = tk.Label(
            header_frame,
            text=title,
            font=FONTS['subtitle'],
            fg=COLORS['text_light'],
            bg=COLORS['primary']
        )
        title_label.pack(expand=True, fill='both', padx=15, pady=8)
    
    return card_container, card_frame

def create_modern_header(parent, title, subtitle=None, **kwargs):
    """Crear header moderno para módulos"""
    header_frame = tk.Frame(parent, bg=COLORS['primary'], height=80)
    header_frame.pack(fill='x')
    header_frame.pack_propagate(False)
    
    # Contenido del header
    content_frame = tk.Frame(header_frame, bg=COLORS['primary'])
    content_frame.pack(expand=True, fill='both', padx=20, pady=15)
    
    # Título principal
    title_label = tk.Label(
        content_frame,
        text=title,
        font=FONTS['heading'],
        fg=COLORS['text_light'],
        bg=COLORS['primary']
    )
    title_label.pack(anchor='w')
    
    # Subtítulo si se proporciona
    if subtitle:
        subtitle_label = tk.Label(
            content_frame,
            text=subtitle,
            font=FONTS['body'],
            fg=COLORS['text_light'],
            bg=COLORS['primary'],
            wraplength=800,  # Permitir salto de línea
            justify='left'
        )
        subtitle_label.pack(anchor='w', pady=(5, 0))
    
    return header_frame

def create_action_buttons(parent, buttons_config):
    """Crear botones de acción en fila"""
    button_frame = tk.Frame(parent, bg=COLORS['white'])
    
    for text, command, button_type, icon in buttons_config:
        btn = create_styled_button(
            button_frame,
            text=f"{icon} {text}",
            command=command,
            button_type=button_type,
            width=15,
            height=2
        )
        btn.pack(side='left', padx=5)
    
    return button_frame

def create_search_bar(parent, placeholder, callback):
    """Crear barra de búsqueda moderna"""
    search_frame = tk.Frame(parent, bg=COLORS['white'])
    
    # Label de búsqueda
    search_label = tk.Label(
        search_frame,
        text="🔍",
        font=FONTS['body'],
        bg=COLORS['white']
    )
    search_label.pack(side='left', padx=(0, 10))
    
    # Campo de búsqueda
    search_entry = tk.Entry(
        search_frame,
        font=FONTS['body'],
        bg=COLORS['white'],
        fg=COLORS['text_primary'],
        relief='solid',
        bd=1,
        width=40
    )
    search_entry.pack(side='left', padx=(0, 10))
    search_entry.insert(0, placeholder)
    search_entry.bind('<KeyRelease>', callback)
    
    # Botón limpiar
    clear_btn = create_styled_button(
        search_frame,
        text="🗑️",
        command=lambda: (search_entry.delete(0, tk.END), callback()),
        button_type='secondary',
        width=3
    )
    clear_btn.pack(side='left')
    
    return search_frame, search_entry

def create_stats_bar(parent, stats_data):
    """Crear barra de estadísticas"""
    stats_frame = tk.Frame(parent, bg=COLORS['white'])
    
    for icon, label, value in stats_data:
        stat_frame = tk.Frame(stats_frame, bg=COLORS['white'])
        stat_frame.pack(side='left', padx=20, pady=10)
        
        # Icono y valor
        value_label = tk.Label(
            stat_frame,
            text=f"{icon} {value}",
            font=FONTS['title'],
            fg=COLORS['primary'],
            bg=COLORS['white']
        )
        value_label.pack()
        
        # Etiqueta
        label_widget = tk.Label(
            stat_frame,
            text=label,
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['white']
        )
        label_widget.pack()
    
    return stats_frame

def create_modern_treeview(parent, columns, height=10):
    """Crear treeview moderno"""
    # Frame contenedor
    tree_frame = tk.Frame(parent, bg=COLORS['white'])
    
    # Treeview
    tree = ttk.Treeview(tree_frame, columns=columns, show='headings', height=height)
    
    # Configurar columnas
    for col in columns:
        tree.heading(col, text=col)
        tree.column(col, width=120, anchor='center')
    
    # Scrollbar
    scrollbar = ttk.Scrollbar(tree_frame, orient='vertical', command=tree.yview)
    tree.configure(yscrollcommand=scrollbar.set)
    
    # Pack
    tree.pack(side='left', fill='both', expand=True)
    scrollbar.pack(side='right', fill='y')
    
    return tree_frame, tree

def create_centered_content(parent, max_width=800, bg_color=COLORS['bg_primary']):
    """Crear contenido centrado con ancho máximo"""
    # Frame principal
    main_frame = create_styled_frame(parent, bg=bg_color)
    main_frame.pack(fill='both', expand=True)
    
    # Frame centrado con ancho máximo
    center_frame = create_styled_frame(main_frame, bg=bg_color)
    center_frame.place(relx=0.5, rely=0.5, anchor='center')
    center_frame.configure(width=max_width)
    
    return main_frame, center_frame