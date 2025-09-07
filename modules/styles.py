import tkinter as tk
from tkinter import ttk
import tkinter.font as tkFont

# Paleta de colores institucional - Resortes Puerto Montt
COLORS = {
    # Colores institucionales exactos
    'primary': '#a51611',       # Rojo bermellón institucional
    'secondary': '#070607',     # Negro institucional exacto
    'accent': '#a51611',        # Rojo bermellón para acentos
    'success': '#00C853',       # Verde para éxito
    'warning': '#FFB300',       # Amarillo para advertencias
    'danger': '#a51611',        # Rojo bermellón para peligro
    'info': '#070607',          # Negro para información
    
    # Colores de fondo institucionales
    'bg_primary': '#FBFAF6',    # Blanco institucional exacto
    'bg_secondary': '#F5F4F0',  # Blanco ligeramente más oscuro
    'bg_tertiary': '#EEEDE9',   # Gris muy claro basado en blanco institucional
    'white': '#FBFAF6',         # Blanco institucional
    'light_gray': '#F8F7F3',    # Gris muy claro institucional
    
    # Colores de texto institucionales
    'text_primary': '#070607',  # Negro institucional para texto
    'text_secondary': '#666666', # Gris medio para texto secundario
    'text_light': '#FBFAF6',    # Blanco institucional para texto claro
    'text_muted': '#999999',    # Gris apagado
    
    # Colores de borde institucionales
    'border': '#E0DFDB',        # Borde claro basado en blanco institucional
    'border_dark': '#BDBCB8',   # Borde oscuro
    
    # Colores de hover institucionales
    'hover_primary': '#E6200F',  # Rojo más oscuro para hover
    'hover_success': '#00A847',
    'hover_warning': '#FF8F00',
    'hover_danger': '#E6200F',
    'hover_info': '#050405',
    'hover_secondary': '#050405',
    
    # Gradientes institucionales
    'gradient_start': '#a51611',
    'gradient_end': '#E6200F',
    'card_shadow': '#E0DFDB'
}

# Fuentes modernas
FONTS = {
    'title': ('Segoe UI', 24, 'bold'),
    'heading': ('Segoe UI', 18, 'bold'),
    'subtitle': ('Segoe UI', 14, 'bold'),
    'body': ('Segoe UI', 11),
    'body_bold': ('Segoe UI', 11, 'bold'),
    'small': ('Segoe UI', 9),
    'button': ('Segoe UI', 10, 'bold')
}

def apply_styles(root):
    """Aplicar estilos globales a la aplicación"""
    style = ttk.Style()
    
    # Configurar tema
    style.theme_use('clam')
    
    # Configurar estilos para Treeview
    style.configure('Treeview',
        background=COLORS['white'],
        foreground=COLORS['text_primary'],
        fieldbackground=COLORS['white'],
        borderwidth=1,
        font=FONTS['body']
    )
    
    style.configure('Treeview.Heading',
        background=COLORS['primary'],
        foreground=COLORS['text_light'],
        font=FONTS['body_bold'],
        relief='flat'
    )
    
    style.map('Treeview.Heading',
        background=[('active', COLORS['accent'])]
    )
    
    # Configurar estilos para Combobox
    style.configure('TCombobox',
        fieldbackground=COLORS['white'],
        background=COLORS['white'],
        borderwidth=1,
        font=FONTS['body']
    )
    
    # Configurar estilos para Entry
    style.configure('TEntry',
        fieldbackground=COLORS['white'],
        borderwidth=1,
        font=FONTS['body']
    )

def create_styled_button(parent, text, command=None, button_type='primary', width=None, height=None, **kwargs):
    """Crear botón con estilo moderno"""
    # Configurar colores según el tipo
    color_config = {
        'primary': {
            'bg': COLORS['primary'],
            'fg': COLORS['text_light'],
            'active_bg': COLORS['hover_primary'],
            'active_fg': COLORS['text_light']
        },
        'success': {
            'bg': COLORS['success'],
            'fg': COLORS['text_light'],
            'active_bg': COLORS['hover_success'],
            'active_fg': COLORS['text_light']
        },
        'warning': {
            'bg': COLORS['warning'],
            'fg': COLORS['text_light'],
            'active_bg': COLORS['hover_warning'],
            'active_fg': COLORS['text_light']
        },
        'danger': {
            'bg': COLORS['danger'],
            'fg': COLORS['text_light'],
            'active_bg': COLORS['hover_danger'],
            'active_fg': COLORS['text_light']
        },
        'info': {
            'bg': COLORS['info'],
            'fg': COLORS['text_light'],
            'active_bg': COLORS['hover_info'],
            'active_fg': COLORS['text_light']
        },
        'secondary': {
            'bg': COLORS['secondary'],
            'fg': COLORS['text_light'],
            'active_bg': COLORS['hover_secondary'],
            'active_fg': COLORS['text_light']
        }
    }
    
    config = color_config.get(button_type, color_config['primary'])
    
    # Crear botón con estilo moderno
    button = tk.Button(
        parent,
        text=text,
        command=command,
        font=FONTS['button'],
        bg=config['bg'],
        fg=config['fg'],
        activebackground=config['active_bg'],
        activeforeground=config['active_fg'],
        relief='flat',
        bd=0,
        padx=15,
        pady=8,
        cursor='hand2',
        width=width,
        height=height
    )
    
    # Agregar efecto hover
    def on_enter(e):
        button.config(bg=config['active_bg'])
    
    def on_leave(e):
        button.config(bg=config['bg'])
    
    button.bind('<Enter>', on_enter)
    button.bind('<Leave>', on_leave)
    
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

def create_styled_entry(parent, width=None, **kwargs):
    """Crear campo de entrada con estilo moderno"""
    entry = tk.Entry(
        parent,
        font=FONTS['body'],
        bg=COLORS['white'],
        fg=COLORS['text_primary'],
        relief='solid',
        bd=1,
        width=width,
        **kwargs
    )
    
    # Agregar efecto focus
    def on_focus_in(e):
        entry.config(highlightthickness=2, highlightcolor=COLORS['accent'])
    
    def on_focus_out(e):
        entry.config(highlightthickness=0)
    
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
    """Crear frame tipo tarjeta moderna con diseño 2025"""
    # Frame principal de la tarjeta con sombra
    card_container = tk.Frame(parent, bg=COLORS['bg_primary'])
    
    # Frame de la tarjeta con colores según tipo
    card_colors = {
        'primary': COLORS['primary'],
        'success': COLORS['success'],
        'warning': COLORS['warning'],
        'info': COLORS['info'],
        'accent': COLORS['accent']
    }
    
    card_color = card_colors.get(card_type, COLORS['primary'])
    
    # Sombra de la tarjeta
    shadow = tk.Frame(
        card_container,
        bg=COLORS['card_shadow'],
        height=2
    )
    shadow.pack(fill='x', pady=(2, 0))
    
    # Tarjeta principal
    card = tk.Frame(
        card_container,
        bg=COLORS['white'],
        relief='flat',
        bd=0,
        **kwargs
    )
    card.pack(fill='both', expand=True)
    
    # Header colorido de la tarjeta
    header = tk.Frame(
        card,
        bg=card_color,
        height=4
    )
    header.pack(fill='x')
    header.pack_propagate(False)
    
    # Contenido de la tarjeta
    content = tk.Frame(
        card,
        bg=COLORS['white']
    )
    content.pack(fill='both', expand=True, padx=15, pady=15)
    
    # Agregar título si se proporciona
    if title:
        title_label = create_styled_label(
            content,
            text=title,
            font=FONTS['subtitle'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', pady=(0, 10))
    
    return card_container, content

def create_modern_header(parent, title, subtitle=None, icon=None):
    """Crear header moderno con título y subtítulo"""
    header = create_styled_frame(parent, bg=COLORS['primary'])
    
    # Frame para el contenido del header
    content_frame = create_styled_frame(header, bg=COLORS['primary'])
    content_frame.pack(fill='x', padx=20, pady=15)
    
    # Título principal
    title_label = create_styled_label(
        content_frame,
        text=title,
        font=FONTS['heading'],
        fg=COLORS['text_light'],
        bg=COLORS['primary']
    )
    title_label.pack(anchor='w')
    
    # Subtítulo si se proporciona
    if subtitle:
        subtitle_label = create_styled_label(
            content_frame,
            text=subtitle,
            font=FONTS['body'],
            fg=COLORS['text_light'],
            bg=COLORS['primary']
        )
        subtitle_label.pack(anchor='w', pady=(5, 0))
    
    return header

def create_action_buttons(parent, buttons_config):
    """Crear fila de botones de acción con estilo moderno"""
    button_frame = create_styled_frame(parent, bg=COLORS['white'])
    
    for i, (text, command, button_type, icon) in enumerate(buttons_config):
        btn = create_styled_button(
            button_frame,
            text=f"{icon} {text}",
            command=command,
            button_type=button_type,
            width=15
        )
        btn.pack(side='left', padx=(0, 10) if i < len(buttons_config) - 1 else 0)
    
    return button_frame

def create_search_bar(parent, placeholder="Buscar...", command=None):
    """Crear barra de búsqueda moderna"""
    search_frame = create_styled_frame(parent, bg=COLORS['white'])
    
    # Icono de búsqueda
    search_icon = create_styled_label(
        search_frame,
        text="🔍",
        font=FONTS['body'],
        bg=COLORS['white']
    )
    search_icon.pack(side='left', padx=(0, 10))
    
    # Campo de búsqueda
    search_entry = create_styled_entry(
        search_frame,
        width=50
    )
    search_entry.pack(side='left', padx=(0, 10))
    
    if command:
        search_entry.bind('<KeyRelease>', command)
    
    # Botón limpiar
    clear_btn = create_styled_button(
        search_frame,
        text="🗑️ Limpiar",
        command=lambda: search_entry.delete(0, tk.END),
        button_type='secondary',
        width=10
    )
    clear_btn.pack(side='left', padx=(10, 0))
    
    return search_frame, search_entry

def create_stats_bar(parent, stats_data):
    """Crear barra de estadísticas moderna"""
    stats_frame = create_styled_frame(parent, bg=COLORS['light_gray'])
    
    for i, (icon, label, value) in enumerate(stats_data):
        stat_frame = create_styled_frame(stats_frame, bg=COLORS['light_gray'])
        stat_frame.pack(side='left', padx=(0, 30) if i < len(stats_data) - 1 else 0)
        
        # Icono
        icon_label = create_styled_label(
            stat_frame,
            text=icon,
            font=FONTS['body'],
            bg=COLORS['light_gray']
        )
        icon_label.pack(side='left', padx=(0, 5))
        
        # Texto
        text_label = create_styled_label(
            stat_frame,
            text=f"{label}: {value}",
            font=FONTS['body'],
            fg=COLORS['text_secondary'],
            bg=COLORS['light_gray']
        )
        text_label.pack(side='left')
    
    return stats_frame

def create_modern_treeview(parent, columns, height=15):
    """Crear Treeview moderno"""
    # Frame para el Treeview y scrollbar
    tree_frame = create_styled_frame(parent, bg=COLORS['white'])
    
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

def create_modern_card_with_stats(parent, title, stats_data, card_type='primary', image_placeholder=None):
    """Crear tarjeta moderna con estadísticas siguiendo el patrón de diseño 2025"""
    # Contenedor principal de la tarjeta
    card_container = tk.Frame(parent, bg=COLORS['bg_primary'])
    
    # Colores según tipo de tarjeta
    card_colors = {
        'primary': COLORS['primary'],
        'success': COLORS['success'], 
        'warning': COLORS['warning'],
        'info': COLORS['info'],
        'accent': COLORS['accent']
    }
    
    card_color = card_colors.get(card_type, COLORS['primary'])
    
    # Tarjeta principal con sombra sutil
    card = tk.Frame(
        card_container,
        bg=COLORS['white'],
        relief='solid',
        bd=1,
        highlightbackground=COLORS['border'],
        highlightthickness=1
    )
    card.pack(fill='both', expand=True, padx=2, pady=2)
    
    # Área de imagen/placeholder (parte superior)
    if image_placeholder:
        image_area = tk.Frame(
            card,
            bg=COLORS['bg_secondary'],
            height=120
        )
        image_area.pack(fill='x')
        image_area.pack_propagate(False)
        
        # Placeholder de imagen
        image_label = create_styled_label(
            image_area,
            text=image_placeholder,
            font=FONTS['heading'],
            bg=COLORS['bg_secondary'],
            fg=COLORS['text_muted']
        )
        image_label.place(relx=0.5, rely=0.5, anchor='center')
    
    # Área de contenido blanco
    content_area = tk.Frame(
        card,
        bg=COLORS['white']
    )
    content_area.pack(fill='both', expand=True, padx=20, pady=15)
    
    # Título de la tarjeta
    if title:
        title_label = create_styled_label(
            content_area,
            text=title,
            font=FONTS['subtitle'],
            fg=COLORS['text_primary'],
            bg=COLORS['white']
        )
        title_label.pack(anchor='w', pady=(0, 10))
    
    # Descripción/contenido
    description = create_styled_label(
        content_area,
        text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis maximus quod deserunt eligendi dolor.",
        font=FONTS['small'],
        fg=COLORS['text_secondary'],
        bg=COLORS['white'],
        wraplength=200,
        justify='left'
    )
    description.pack(anchor='w', pady=(0, 15))
    
    # Área de estadísticas con color de fondo
    stats_area = tk.Frame(
        card,
        bg=card_color,
        height=60
    )
    stats_area.pack(fill='x')
    stats_area.pack_propagate(False)
    
    # Contenedor de estadísticas
    stats_container = tk.Frame(stats_area, bg=card_color)
    stats_container.pack(expand=True, fill='both')
    
    # Crear estadísticas en fila
    if stats_data and len(stats_data) >= 3:
        # Dividir en 3 columnas
        for i, (label, value) in enumerate(stats_data[:3]):
            stat_frame = tk.Frame(stats_container, bg=card_color)
            stat_frame.pack(side='left', expand=True, fill='both')
            
            # Valor grande
            value_label = create_styled_label(
                stat_frame,
                text=str(value),
                font=('Segoe UI', 16, 'bold'),
                fg=COLORS['text_light'],
                bg=card_color
            )
            value_label.pack(expand=True)
            
            # Etiqueta pequeña
            label_label = create_styled_label(
                stat_frame,
                text=label.upper(),
                font=('Segoe UI', 8),
                fg=COLORS['text_light'],
                bg=card_color
            )
            label_label.pack()
    
    return card_container