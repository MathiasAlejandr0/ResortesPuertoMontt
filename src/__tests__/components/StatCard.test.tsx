/**
 * Tests para StatCard - Componente de tarjeta de estadísticas
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatCard from '../../renderer/components/StatCard';
import { DollarSign, Users, Package } from 'lucide-react';

describe('StatCard', () => {
  it('debería renderizar el título y valor', () => {
    render(
      <StatCard
        title="Ingresos del Mes"
        value="150000"
        icon={DollarSign}
      />
    );

    expect(screen.getByText('Ingresos del Mes')).toBeInTheDocument();
    expect(screen.getByText('150000')).toBeInTheDocument();
  });

  it('debería mostrar cambio positivo', () => {
    render(
      <StatCard
        title="Clientes Activos"
        value="50"
        change="+10%"
        changeType="positive"
        icon={Users}
      />
    );

    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('debería mostrar cambio negativo', () => {
    render(
      <StatCard
        title="Stock Bajo"
        value="5"
        change="-2%"
        changeType="negative"
        icon={Package}
      />
    );

    expect(screen.getByText('-2%')).toBeInTheDocument();
  });

  it('debería manejar valores largos correctamente', () => {
    const longValue = '999999999999999';
    render(
      <StatCard
        title="Valor Muy Largo"
        value={longValue}
        icon={DollarSign}
      />
    );

    expect(screen.getByText(longValue)).toBeInTheDocument();
  });

  it('debería renderizar con icono personalizado', () => {
    render(
      <StatCard
        title="Test"
        value="100"
        icon={Users}
        iconColor="icon-custom"
      />
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('debería usar fontSize más pequeño para valores largos', () => {
    const longValue = '12345678901234567890';
    const { container } = render(
      <StatCard
        title="Test"
        value={longValue}
        icon={DollarSign}
      />
    );

    const valueElement = container.querySelector('.text-2xl');
    expect(valueElement).toBeInTheDocument();
  });
});

