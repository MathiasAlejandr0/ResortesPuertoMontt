import { useMemo, useState } from 'react';
import { Search, Car } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { Vehiculo } from '../types';

export default function HistoricoPage() {
  const { vehiculos } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);

  const vehiculosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return vehiculos.filter((vehiculo) => {
      return (
        vehiculo.patente?.toLowerCase().includes(term) ||
        vehiculo.marca?.toLowerCase().includes(term) ||
        vehiculo.modelo?.toLowerCase().includes(term)
      );
    }).slice(0, 8);
  }, [vehiculos, searchTerm]);

  const handleSelectVehiculo = (vehiculo: Vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-8 bg-background text-foreground">
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar Vehículo..."
          className="flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          onClick={() => {
            if (vehiculosFiltrados.length > 0) {
              handleSelectVehiculo(vehiculosFiltrados[0]);
            }
          }}
          className="h-10 w-10 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
        {vehiculosFiltrados.length > 0 && (
          <div className="absolute top-12 left-0 right-12 z-10 rounded-md border border-gray-200 bg-white shadow-md">
            {vehiculosFiltrados.map((vehiculo) => (
              <button
                key={vehiculo.id}
                onClick={() => handleSelectVehiculo(vehiculo)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {vehiculo.patente} - {vehiculo.marca} {vehiculo.modelo}
              </button>
            ))}
          </div>
        )}
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="border-b border-gray-200 pb-4" />
          <div className="flex flex-col md:flex-row gap-6 pt-6">
            <div className="flex items-center justify-center md:w-40">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Car className="h-8 w-8 text-gray-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">Patente:</span>{' '}
                <span className="text-gray-600">{selectedVehiculo?.patente || '-'}</span>
              </div>
              <div>
                <span className="font-medium">Tipo:</span>{' '}
                <span className="text-gray-600">
                  {selectedVehiculo ? `${selectedVehiculo.marca} ${selectedVehiculo.modelo}` : '-'}
                </span>
              </div>
              <div>
                <span className="font-medium">Año:</span>{' '}
                <span className="text-gray-600">{selectedVehiculo?.año || '-'}</span>
              </div>
              <div>
                <span className="font-medium">N° Chasis:</span>{' '}
                <span className="text-gray-600">{selectedVehiculo?.numeroChasis || '-'}</span>
              </div>
              <div>
                <span className="font-medium">Color:</span>{' '}
                <span className="text-gray-600">{selectedVehiculo?.color || '-'}</span>
              </div>
              <div>
                <span className="font-medium">Seguro:</span>{' '}
                <span className="text-gray-600">-</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
