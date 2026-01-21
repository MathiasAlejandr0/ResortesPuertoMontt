import React, { useState, useEffect, startTransition, useRef } from 'react';
import { X, User, Mail, Phone, MapPin, Plus, Trash2, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Cliente, Vehiculo } from '../types';
import { notify, Logger, formatearRUT } from '../utils/cn';
import { ActionDialog } from './ActionDialog';

interface ClienteFormProps {
  cliente?: Cliente;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cliente: Cliente) => void;
  title?: string;
  subtitle?: string;
}

export default function ClienteForm({ 
  cliente, 
  isOpen, 
  onClose, 
  onSave, 
  title = "Nuevo Cliente",
  subtitle = "Agrega un nuevo cliente al sistema"
}: ClienteFormProps) {
  const [formData, setFormData] = useState<Cliente>({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  // Refs para los inputs principales
  const inputNombreRef = useRef<HTMLInputElement>(null);

  // Resetear formulario cuando se abre
  // Usar useEffect en lugar de useLayoutEffect para evitar bloquear el render inicial
  useEffect(() => {
    if (isOpen) {
      // Resetear TODOS los estados cuando se abre
      setIsSubmitting(false);
      setStep(1);
      setErrors({});
      
      if (cliente) {
        setFormData(cliente);
      } else {
        setFormData({ nombre: '', rut: '', telefono: '', email: '', direccion: '', activo: true });
      }
    }
  }, [isOpen, cliente]);

  // Enfocar el primer input cuando el modal se abre
  // Usar múltiples requestAnimationFrame para asegurar que el DOM esté completamente listo
  useEffect(() => {
    if (isOpen) {
      // Usar doble requestAnimationFrame para asegurar que el DOM esté completamente renderizado
      let timeoutId: NodeJS.Timeout;
      let rafId2: number;
      const rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          timeoutId = setTimeout(() => {
            inputNombreRef.current?.focus();
            // Forzar que el input sea interactivo
            inputNombreRef.current?.click();
          }, 50); // Reducido a 50ms para respuesta más rápida
        });
      });
      
      // Retornar función de limpieza
      return () => {
        cancelAnimationFrame(rafId1);
        if (rafId2) cancelAnimationFrame(rafId2);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [isOpen]);

  // Cargar vehículos en background DESPUÉS del render (sin bloquear)
  useEffect(() => {
    if (isOpen && cliente?.id) {
      // Cargar vehículos en background usando startTransition para no bloquear UI
      startTransition(() => {
        window.electronAPI.getAllVehiculos().then((all: any[]) => {
          startTransition(() => {
            setVehiculos(all.filter(v => v.clienteId === cliente.id));
          });
        }).catch(() => {
          startTransition(() => {
            setVehiculos([]);
          });
        });
      });
    } else if (isOpen && !cliente) {
      setVehiculos([]);
    }
  }, [isOpen, cliente?.id]);

  const handleInputChange = (field: keyof Cliente, value: string) => {
    // Actualización inmediata sin startTransition para mejor feedback
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.rut.trim()) {
      newErrors.rut = 'El RUT es requerido';
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    // Usar startTransition para cambio de step sin bloquear
    startTransition(() => {
      setStep(2);
    });
  };

  const addVehiculo = () => {
    startTransition(() => {
      // Si el cliente es nuevo (sin ID), NO incluir clienteId en el vehículo
      const nuevoVehiculo: any = {
        marca: '', 
        modelo: '', 
        año: new Date().getFullYear(), 
        patente: '', 
        numeroChasis: '',
        color: '', 
        kilometraje: 0, 
        activo: true
      };
      
      // Solo agregar clienteId si el cliente ya existe (tiene ID)
      if (formData.id && formData.id > 0) {
        nuevoVehiculo.clienteId = formData.id;
      }
      // Si el cliente es nuevo, NO agregar clienteId (será undefined)
      
      setVehiculos(prev => ([...prev, nuevoVehiculo]));
    });
  };

  const updateVehiculo = (idx: number, field: keyof Vehiculo, value: any) => {
    setVehiculos(prev => prev.map((v, i) => {
      if (i === idx) {
        const vehiculoActualizado: any = { ...v, [field]: value };
        
        // Solo agregar clienteId si el cliente ya existe (tiene ID)
        // Si el cliente es nuevo, NO incluir clienteId
        if (formData.id && formData.id > 0) {
          vehiculoActualizado.clienteId = formData.id;
        } else {
          // Si el cliente es nuevo, eliminar clienteId si existe
          delete vehiculoActualizado.clienteId;
        }
        
        return vehiculoActualizado;
      }
      return v;
    }));
  };

  const removeVehiculo = (idx: number) => {
    startTransition(() => {
      setVehiculos(prev => prev.filter((_, i) => i !== idx));
    });
  };

  const handleFinalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Preparar vehículos para enviar
      // Si el cliente es nuevo, NO incluir clienteId en los vehículos
      // Si el cliente existe, incluir su ID
      const esClienteNuevo = !formData.id || formData.id === 0;
      const vehiculosParaEnviar = vehiculos.map(v => {
        // Crear un objeto limpio solo con los campos necesarios
        const vehiculo: any = {
          marca: v.marca || '',
          modelo: v.modelo || '',
          año: v.año || new Date().getFullYear(),
          patente: v.patente || '',
          color: v.color || '',
          kilometraje: v.kilometraje,
          observaciones: v.observaciones || '',
          activo: v.activo !== false
        };
        
        // Solo agregar id si existe
        if (v.id) {
          vehiculo.id = v.id;
        }
        
        // Solo incluir clienteId si el cliente ya existe
        if (!esClienteNuevo && formData.id && formData.id > 0) {
          vehiculo.clienteId = formData.id;
        }
        // Si el cliente es nuevo, NO incluir clienteId en absoluto (ni ninguna variante)
        
        return vehiculo;
      });
      
      Logger.log('💾 Guardando cliente con vehículos:', {
        cliente: formData,
        vehiculos: vehiculosParaEnviar,
        clienteId: formData.id || 0
      });
      
      const res = await window.electronAPI.saveClienteConVehiculos({ 
        cliente: formData, 
        vehiculos: vehiculosParaEnviar 
      });
      
      if (!res?.success) {
        throw new Error(res?.error || 'Error en guardado atómico');
      }
      await onSave(res.cliente);
      setIsSubmitting(false);
      onClose();
    } catch (error: any) {
      Logger.error('Error guardando cliente/vehículos:', error);
      setIsSubmitting(false);
      const msg = error?.message || 'Error al guardar cliente y vehículos';
      setErrors({ general: msg });
      notify.error('Error al guardar', msg);
    }
  };

  return (
    <ActionDialog
      open={isOpen}
      onOpenChange={onClose}
      variant="slide-over"
      size="lg"
      title={title}
      description={subtitle}
    >
      <div className="h-full">
        {/* Form */}
        <form className="p-6 space-y-4">
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}
          
          {/* PASO 1: Datos del cliente */}
          {step === 1 && (<>
          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputNombreRef}
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                autoFocus
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors pointer-events-auto ${
                  errors.nombre ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Juan Pérez"
              />
            </div>
            {errors.nombre && (
              <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
            )}
          </div>

          {/* RUT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RUT *
            </label>
            <input
              type="text"
              name="rut"
              value={formData.rut}
              onChange={(e) => {
                const formatted = formatearRUT(e.target.value);
                handleInputChange('rut', formatted);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors pointer-events-auto ${
                errors.rut ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12.345.678-9"
            />
            {errors.rut && (
              <p className="text-red-500 text-xs mt-1">{errors.rut}</p>
            )}
          </div>

          {/* Correo Electrónico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors pointer-events-auto ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="juan.perez@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors pointer-events-auto ${
                  errors.telefono ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+56 9 1234 5678"
              />
            </div>
            {errors.telefono && (
              <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="direccion"
                value={formData.direccion || ''}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors pointer-events-auto"
                placeholder="Calle Principal 123, Ciudad"
              />
            </div>
          </div>
          </>)}

          {/* PASO 2: Vehículos */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Vehículos del cliente</h3>
                <button type="button" onClick={addVehiculo} className="inline-flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-50"><Plus className="h-4 w-4"/> Agregar vehículo</button>
              </div>
              {vehiculos.length === 0 && (<p className="text-sm text-gray-500">No hay vehículos. Usa "Agregar vehículo" para añadir.</p>)}
              {vehiculos.map((v, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2 items-center border rounded-md p-3">
                  <input className="col-span-1 border rounded px-2 py-1 pointer-events-auto" placeholder="Marca" value={v.marca} onChange={e => updateVehiculo(idx, 'marca', e.target.value)} />
                  <input className="col-span-1 border rounded px-2 py-1 pointer-events-auto" placeholder="Modelo" value={v.modelo} onChange={e => updateVehiculo(idx, 'modelo', e.target.value)} />
                  <input className="col-span-1 border rounded px-2 py-1 pointer-events-auto" placeholder="Año" type="number" value={v.año} onChange={e => updateVehiculo(idx, 'año', Number(e.target.value))} />
                  <input className="col-span-1 border rounded px-2 py-1 pointer-events-auto" placeholder="Patente" value={v.patente} onChange={e => updateVehiculo(idx, 'patente', e.target.value)} />
                  <input className="col-span-1 border rounded px-2 py-1 pointer-events-auto" placeholder="N° Chasis" value={v.numeroChasis || ''} onChange={e => updateVehiculo(idx, 'numeroChasis', e.target.value)} />
                  <input className="col-span-1 border rounded px-2 py-1 pointer-events-auto" placeholder="Color" value={v.color || ''} onChange={e => updateVehiculo(idx, 'color', e.target.value)} />
                  <div className="col-span-1 flex items-center justify-end">
                    <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => removeVehiculo(idx)} title="Eliminar"><Trash2 className="h-4 w-4 text-red-600"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}


          {/* Navegación */}
          <div className="flex justify-between items-center pt-4">
            <button type="button" onClick={onClose} className="px-3 py-2 text-gray-700 border rounded hover:bg-gray-50">Cancelar</button>
            <div className="flex gap-2">
              {step === 2 && (
                <button type="button" onClick={() => {
                  startTransition(() => {
                    setStep(1);
                  });
                }} className="inline-flex items-center gap-1 px-3 py-2 border rounded hover:bg-gray-50">
                  <ChevronLeft className="h-4 w-4"/> Anterior
                </button>
              )}
              {step === 1 && (
                <button type="button" onClick={handleNext} className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Siguiente <ChevronRight className="h-4 w-4"/>
            </button>
              )}
              {step === 2 && (
                <button type="button" disabled={isSubmitting} onClick={handleFinalSave} className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                  <Save className="h-4 w-4"/> {isSubmitting ? 'Guardando...' : (cliente ? 'Actualizar' : 'Crear')}
            </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ActionDialog>
  );
}
