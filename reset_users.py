#!/usr/bin/env python3
"""
Script para limpiar y recrear usuarios en la base de datos
"""

import sqlite3
import hashlib
from datetime import datetime

def reset_users():
    print("🗑️ Limpiando usuarios existentes...")
    
    # Conectar a la base de datos
    conn = sqlite3.connect('taller_mecanico.db')
    cursor = conn.cursor()
    
    # Eliminar todos los usuarios existentes
    cursor.execute("DELETE FROM users")
    print("   ✅ Usuarios eliminados")
    
    # Crear usuario admin limpio
    print("👤 Creando usuario admin...")
    admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
    
    cursor.execute("""
        INSERT INTO users (username, password, role, full_name, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, ('admin', admin_password, 'administrador', 'Administrador del Sistema', datetime.now().isoformat()))
    
    # Verificar que se creó correctamente
    cursor.execute("SELECT username, role FROM users WHERE username = 'admin'")
    admin_user = cursor.fetchone()
    
    if admin_user:
        print(f"   ✅ Usuario admin creado: {admin_user[0]} ({admin_user[1]})")
    else:
        print("   ❌ Error al crear usuario admin")
    
    # Verificar hash de contraseña
    cursor.execute("SELECT password FROM users WHERE username = 'admin'")
    stored_hash = cursor.fetchone()[0]
    test_hash = hashlib.sha256('admin123'.encode()).hexdigest()
    
    print(f"\n🔐 Verificación de contraseña:")
    print(f"   Hash almacenado: {stored_hash[:20]}...")
    print(f"   Hash calculado:  {test_hash[:20]}...")
    print(f"   ¿Coinciden? {'✅ SÍ' if stored_hash == test_hash else '❌ NO'}")
    
    # Guardar cambios
    conn.commit()
    conn.close()
    
    print("\n🎉 ¡Usuarios reseteados exitosamente!")
    print("Credenciales para login:")
    print("   Usuario: admin")
    print("   Contraseña: admin123")

if __name__ == "__main__":
    reset_users()
