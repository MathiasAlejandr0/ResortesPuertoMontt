#!/usr/bin/env python3
"""
Script de debug para identificar errores en main.py
"""

import traceback
import sys

try:
    print("🔍 Iniciando debug de main.py...")
    
    # Importar módulos uno por uno para identificar problemas
    print("📦 Importando tkinter...")
    import tkinter as tk
    from tkinter import ttk, messagebox
    
    print("📦 Importando sqlite3...")
    import sqlite3
    
    print("📦 Importando datetime...")
    from datetime import datetime
    
    print("📦 Importando os...")
    import os
    
    print("📦 Importando módulos del sistema...")
    
    try:
        from modules.database import Database
        print("   ✅ Database importado")
    except Exception as e:
        print(f"   ❌ Error en Database: {e}")
        
    try:
        from modules.inventory import InventoryModule
        print("   ✅ InventoryModule importado")
    except Exception as e:
        print(f"   ❌ Error en InventoryModule: {e}")
        
    try:
        from modules.clients import ClientsModule
        print("   ✅ ClientsModule importado")
    except Exception as e:
        print(f"   ❌ Error en ClientsModule: {e}")
        
    try:
        from modules.workshop import WorkshopModule
        print("   ✅ WorkshopModule importado")
    except Exception as e:
        print(f"   ❌ Error en WorkshopModule: {e}")
        
    try:
        from modules.suppliers import SuppliersModule
        print("   ✅ SuppliersModule importado")
    except Exception as e:
        print(f"   ❌ Error en SuppliersModule: {e}")
        
    try:
        from modules.reports import ReportsModule
        print("   ✅ ReportsModule importado")
    except Exception as e:
        print(f"   ❌ Error en ReportsModule: {e}")
        
    try:
        from modules.auth import AuthModule
        print("   ✅ AuthModule importado")
    except Exception as e:
        print(f"   ❌ Error en AuthModule: {e}")
        
    try:
        from modules.workers import WorkersModule
        print("   ✅ WorkersModule importado")
    except Exception as e:
        print(f"   ❌ Error en WorkersModule: {e}")
        
    try:
        from modules.enhanced_quotes import EnhancedQuotesModule
        print("   ✅ EnhancedQuotesModule importado")
    except Exception as e:
        print(f"   ❌ Error en EnhancedQuotesModule: {e}")
        
    try:
        from modules.remainders import RemaindersModule
        print("   ✅ RemaindersModule importado")
    except Exception as e:
        print(f"   ❌ Error en RemaindersModule: {e}")
        
    try:
        from modules.analytics import AnalyticsModule
        print("   ✅ AnalyticsModule importado")
    except Exception as e:
        print(f"   ❌ Error en AnalyticsModule: {e}")
        
    try:
        from modules.styles import create_styled_button, create_styled_frame, create_styled_label, create_styled_entry, COLORS, FONTS
        print("   ✅ Styles importado")
    except Exception as e:
        print(f"   ❌ Error en Styles: {e}")
        
    try:
        from modules.quotes import QuotesModule
        print("   ✅ QuotesModule importado")
    except Exception as e:
        print(f"   ❌ Error en QuotesModule: {e}")
    
    print("\n🚀 Intentando crear la aplicación...")
    
    # Crear la aplicación
    root = tk.Tk()
    
    # Importar la clase principal
    from main import TallerMecanicoApp
    
    print("✅ Clase TallerMecanicoApp importada correctamente")
    
    # Crear instancia
    app = TallerMecanicoApp(root)
    print("✅ Aplicación creada exitosamente")
    
    print("\n🎉 ¡Todo parece estar funcionando!")
    print("La aplicación debería iniciarse normalmente.")
    
except Exception as e:
    print(f"\n❌ ERROR ENCONTRADO:")
    print(f"Tipo: {type(e).__name__}")
    print(f"Mensaje: {str(e)}")
    print(f"\n📍 Traceback completo:")
    traceback.print_exc()
