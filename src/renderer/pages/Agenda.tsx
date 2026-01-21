import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApp } from '../contexts/AppContext';
import { OrdenTrabajo, Cliente, Vehiculo } from '../types';
import { notify, Logger } from '../utils/cn';
import { Calendar as CalendarIcon, Clock, User, Wrench } from 'lucide-react';

moment.locale('es');
const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  orden: OrdenTrabajo;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
}

export default function AgendaPage() {
  const { ordenes, clientes, vehiculos, refreshOrdenes } = useApp();
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Crear mapas para lookup rápido
  const clientesById = useMemo(() => {
    const map = new Map<number, Cliente>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

  const vehiculosById = useMemo(() => {
    const map = new Map<number, Vehiculo>();
    vehiculos.forEach(v => { if (v.id) map.set(v.id, v); });
    return map;
  }, [vehiculos]);

  // Convertir órdenes a eventos del calendario
  const events: CalendarEvent[] = useMemo(() => {
    return ordenes
      .filter(orden => orden.estado !== 'Cancelada')
      .map(orden => {
        const cliente = orden.clienteId ? clientesById.get(orden.clienteId) : undefined;
        const vehiculo = orden.vehiculoId ? vehiculosById.get(orden.vehiculoId) : undefined;
        
        // Usar fechaProgramada si existe, sino fechaIngreso
        const fechaInicio = orden.fechaProgramada 
          ? moment(orden.fechaProgramada).toDate()
          : moment(orden.fechaIngreso).toDate();
        
        // Duración estimada: 2 horas por defecto
        const fechaFin = moment(fechaInicio).add(2, 'hours').toDate();

        return {
          id: orden.id,
          title: `${orden.numero} - ${cliente?.nombre || 'Sin cliente'}`,
          start: fechaInicio,
          end: fechaFin,
          orden,
          cliente,
          vehiculo,
          resource: orden
        } as CalendarEvent;
      });
  }, [ordenes, clientesById, vehiculosById]);

  // Obtener color según estado
  const getEventStyle = useCallback((event: CalendarEvent) => {
    const estado = event.orden.estado;
    let backgroundColor = '#3174ad'; // Azul por defecto

    if (estado === 'Pendiente') {
      backgroundColor = '#fbbf24'; // Amarillo
    } else if (estado === 'En Progreso' || estado === 'En Proceso') {
      backgroundColor = '#3b82f6'; // Azul
    } else if (estado === 'Completada') {
      backgroundColor = '#10b981'; // Verde
    }

    return {
      style: {
        backgroundColor,
        color: '#fff',
        borderRadius: '4px',
        border: 'none',
        padding: '2px 4px'
      }
    };
  }, []);

  // Manejar drag & drop
  const handleEventDrop = useCallback(async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }

      const nuevaFecha = moment(start).format('YYYY-MM-DD HH:mm:ss');
      
      const ordenActualizada: OrdenTrabajo = {
        ...event.orden,
        fechaProgramada: nuevaFecha
      };

      const resp = await window.electronAPI.updateFechaProgramada(event.orden.id!, nuevaFecha);
      
      if (resp?.success === false) {
        throw new Error(resp.error || 'Error al actualizar la fecha');
      }

      notify.success('Éxito', 'Orden reagendada correctamente');
      refreshOrdenes();
    } catch (error: any) {
      Logger.error('Error al reagendar orden:', error);
      notify.error('Error', error.message || 'No se pudo reagendar la orden');
    }
  }, [refreshOrdenes]);

  // Manejar cambio de fecha (select)
  const handleSelectSlot = useCallback(async ({ start }: { start: Date }) => {
    // Opcional: permitir crear nueva orden desde el calendario
    Logger.log('Slot seleccionado:', start);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-8 h-8" />
            Agenda de Trabajo
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualiza y gestiona las órdenes de trabajo en el calendario
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentView('month')}
            className={currentView === 'month' ? 'bg-primary text-primary-foreground' : ''}
          >
            Mes
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('week')}
            className={currentView === 'week' ? 'bg-primary text-primary-foreground' : ''}
          >
            Semana
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('day')}
            className={currentView === 'day' ? 'bg-primary text-primary-foreground' : ''}
          >
            Día
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-sm">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm">En Proceso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">Completada</span>
            </div>
          </div>

          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={setCurrentView}
              date={currentDate}
              onNavigate={setCurrentDate}
              onEventDrop={handleEventDrop}
              onSelectSlot={handleSelectSlot}
              selectable
              resizable={false}
              eventPropGetter={getEventStyle}
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'No hay órdenes en este rango de fechas'
              }}
              components={{
                event: ({ event }: { event: CalendarEvent }) => (
                  <div className="p-1">
                    <div className="font-semibold text-xs">{event.title}</div>
                    {event.vehiculo && (
                      <div className="text-xs opacity-90">
                        {event.vehiculo.marca} {event.vehiculo.modelo}
                      </div>
                    )}
                    {event.orden.tecnicoAsignado && (
                      <div className="text-xs opacity-90 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {event.orden.tecnicoAsignado}
                      </div>
                    )}
                  </div>
                )
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
