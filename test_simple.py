import sys
print("Python funciona correctamente")
print(f"Versión de Python: {sys.version}")

try:
    import tkinter as tk
    print("Tkinter disponible")
    
    # Crear ventana simple
    root = tk.Tk()
    root.title("Test")
    root.geometry("300x200")
    
    label = tk.Label(root, text="¡Funciona!")
    label.pack(pady=50)
    
    print("Ventana creada - cerrando automáticamente en 2 segundos")
    root.after(2000, root.destroy)
    root.mainloop()
    
except Exception as e:
    print(f"Error con Tkinter: {e}")
    import traceback
    traceback.print_exc()
