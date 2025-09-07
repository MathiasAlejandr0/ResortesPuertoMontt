#!/usr/bin/env python3
"""
Script para verificar y crear usuarios de prueba en la base de datos
"""

import sqlite3
import hashlib
from modules.database import Database

def test_login():
    print("🔍 Verificando sistema de login...")
    
    # Conectar a la base de datos
    db = Database()
    db.create_tables()
    
    # Verificar usuarios existentes
    users = db.fetch_all("SELECT username, role FROM users")
    print(f"\n📊 Usuarios encontrados en la base de datos: {len(users)}")
    
    if users:
        for user in users:
            print(f"   - {user['username']} ({user['role']})")
    else:
        print("   ❌ No se encontraron usuarios")
    
    # Crear usuario admin si no existe
    admin_exists = db.fetch_one("SELECT username FROM users WHERE username = 'admin'")
    
    if not admin_exists:
        print("\n🔧 Creando usuario admin...")
        admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
        db.execute("""
            INSERT INTO users (username, password, role, full_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ('admin', admin_password, 'administrador', 'Administrador del Sistema', '2024-01-01'))
        print("   ✅ Usuario admin creado")
    else:
        print("\n✅ Usuario admin ya existe")
    
    # Verificar hash de contraseña
    test_password = 'admin123'
    test_hash = hashlib.sha256(test_password.encode()).hexdigest()
    
    stored_user = db.fetch_one("SELECT username, password FROM users WHERE username = 'admin'")
    if stored_user:
        print(f"\n🔐 Verificación de contraseña:")
        print(f"   Contraseña ingresada: {test_password}")
        print(f"   Hash calculado: {test_hash[:20]}...")
        print(f"   Hash almacenado: {stored_user['password'][:20]}...")
        print(f"   ¿Coinciden? {'✅ SÍ' if test_hash == stored_user['password'] else '❌ NO'}")
    
    # Listar todos los usuarios finales
    final_users = db.fetch_all("SELECT username, role, full_name FROM users")
    print(f"\n👥 Usuarios disponibles para login:")
    for user in final_users:
        print(f"   - Usuario: {user['username']}")
        print(f"     Rol: {user['role']}")
        print(f"     Nombre: {user['full_name']}")
        if user['username'] == 'admin':
            print(f"     Contraseña: admin123")
        print()

if __name__ == "__main__":
    test_login()
