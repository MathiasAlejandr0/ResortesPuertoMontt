export function Header() {
  console.log('🔧 Header.tsx: Renderizando header');
  return (
    <header className="h-16 border-b bg-card flex items-center px-6 sticky top-0 z-10">
      <div className="flex-1">
        <h1 className="text-xl font-bold text-card-foreground">Sistema de Gestión - Taller Mecánico</h1>
      </div>
      <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
        Salir
      </button>
    </header>
  );
}
