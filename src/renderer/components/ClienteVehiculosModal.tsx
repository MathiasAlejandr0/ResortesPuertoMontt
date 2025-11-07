import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { Cliente, Vehiculo } from '../types';
import { Logger, notify, confirmAction } from '../utils/cn';

interface Props {
  cliente: Cliente;
  vehiculos: Vehiculo[];
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ClienteVehiculosModal({ cliente, vehiculos, isOpen, onClose, onSaved }: Props) {
  const [list, setList] = useState<Vehiculo[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setList(vehiculos.filter(v => v.clienteId === (cliente.id as number)));
      setIsSaving(false);
    }
  }, [isOpen, vehiculos, cliente.id]);

  const handleAdd = () => {
    setList(prev => [
      ...prev,
      {
        id: undefined,
        clienteId: cliente.id as number,
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        patente: '',
        color: '',
        kilometraje: 0,
        activo: true
      }
    ]);
  };

  const handleChange = (idx: number, field: keyof Vehiculo, value: any) => {
    setList(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const handleRemove = async (idx: number) => {
    const v = list[idx];
    if (v.id) {
      const confirmed = await confirmAction(
        `¿Estás seguro de que quieres eliminar el vehículo ${v.marca} ${v.modelo} (${v.patente})?`,
        'Esta acción no se puede deshacer.'
      );
      
      if (!confirmed) {
        return;
      }

      try {
        const result = await window.electronAPI.deleteVehiculo(v.id);
        if (result) {
          notify.success('Vehículo eliminado exitosamente');
          setList(prev => prev.filter((_, i) => i !== idx));
        } else {
          notify.error('No se pudo eliminar el vehículo');
        }
      } catch (e) {
        Logger.error('Error eliminando vehículo:', e);
        notify.error('Error al eliminar el vehículo', e instanceof Error ? e.message : 'Error desconocido');
      }
    } else {
      // Si no tiene ID, solo lo eliminamos de la lista local
      setList(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      for (const v of list) {
        if (!v.marca || !v.modelo || !v.patente) {
          notify.error('Datos incompletos', 'Marca, modelo y patente son obligatorios');
          setIsSaving(false);
          return;
        }
        await window.electronAPI.saveVehiculo({ ...v, clienteId: cliente.id as number });
      }
      notify.success('Vehículos guardados');
      onSaved && onSaved();
      onClose();
    } catch (e: any) {
      Logger.error('Error guardando vehículos:', e);
      notify.error('Error', e?.message || 'No se pudieron guardar los vehículos');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Vehículos de {cliente.nombre}</h2>
            <p className="text-sm text-gray-600">Agrega, edita o elimina los vehículos asociados</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose} title="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {list.map((v, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-center border rounded-md p-3">
              <input className="col-span-1 border rounded px-2 py-1" placeholder="Marca" value={v.marca}
                     onChange={e => handleChange(idx, 'marca', e.target.value)} />
              <input className="col-span-1 border rounded px-2 py-1" placeholder="Modelo" value={v.modelo}
                     onChange={e => handleChange(idx, 'modelo', e.target.value)} />
              <input className="col-span-1 border rounded px-2 py-1" placeholder="Año" type="number" value={v.año}
                     onChange={e => handleChange(idx, 'año', Number(e.target.value))} />
              <input className="col-span-1 border rounded px-2 py-1" placeholder="Patente" value={v.patente}
                     onChange={e => handleChange(idx, 'patente', e.target.value)} />
              <input className="col-span-1 border rounded px-2 py-1" placeholder="Color" value={v.color || ''}
                     onChange={e => handleChange(idx, 'color', e.target.value)} />
              <div className="col-span-1 flex items-center justify-end">
                <button className="p-2 hover:bg-gray-100 rounded" onClick={() => handleRemove(idx)} title="Eliminar">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}

          <button className="mt-2 inline-flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50" onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Agregar vehículo
          </button>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button className="px-3 py-2 border rounded hover:bg-gray-50" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50" disabled={isSaving} onClick={handleSave}>
            <Save className="inline h-4 w-4 mr-2" /> {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}


