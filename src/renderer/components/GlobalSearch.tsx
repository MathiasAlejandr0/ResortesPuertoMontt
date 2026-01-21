import { useState, useEffect, useRef, useDeferredValue } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { GlobalSearchService, SearchResult } from '../services/GlobalSearchService';
import { cn } from '../utils/cn';

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void;
  className?: string;
}

export default function GlobalSearch({ onResultClick, className }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Realizar búsqueda
  useEffect(() => {
    let cancelled = false;

    const performSearch = async () => {
      if (!deferredSearchTerm || deferredSearchTerm.trim().length < 2) {
        setResults([]);
        setIsSearching(false);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);
      setIsOpen(true);

      try {
        const searchResults = await GlobalSearchService.searchAll(deferredSearchTerm);
        if (!cancelled) {
          setResults(searchResults);
          setIsSearching(false);
        }
      } catch (error) {
        console.error('Error en búsqueda global:', error);
        if (!cancelled) {
          setResults([]);
          setIsSearching(false);
        }
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [deferredSearchTerm]);

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar clientes, órdenes, repuestos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || isSearching) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9 w-80 min-w-[320px] h-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary rounded-lg text-sm transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (isSearching || results.length > 0 || deferredSearchTerm.length >= 2) && (
        <div className="absolute top-full mt-2 w-96 bg-white border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm",
                      GlobalSearchService.getColorForType(result.type),
                      "bg-slate-100"
                    )}>
                      {GlobalSearchService.getIconForType(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {result.title}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          GlobalSearchService.getColorForType(result.type),
                          "bg-slate-100"
                        )}>
                          {result.type}
                        </span>
                      </div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {result.subtitle}
                        </div>
                      )}
                      {result.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {result.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : deferredSearchTerm.length >= 2 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron resultados
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
