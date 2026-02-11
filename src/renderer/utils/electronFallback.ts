type ElectronApi = Window['electronAPI'];

const asyncResolve = <T>(value: T) => Promise.resolve(value);

const createElectronApiFallback = (): ElectronApi => {
  const handler: ProxyHandler<ElectronApi> = {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }

      return (...args: any[]) => {
        console.warn(`[Vista web] electronAPI.${prop} no disponible. Usando mock.`);

        if (prop.endsWith('Paginated')) {
          return asyncResolve({ data: [], total: 0 });
        }

        if (prop.startsWith('get')) {
          if (prop === 'getEstadoCaja' || prop === 'getArqueoCaja') return asyncResolve(null);
          return asyncResolve([]);
        }

        if (prop.startsWith('save') || prop.startsWith('update') || prop.startsWith('registrar')) {
          if (
            prop === 'saveOrdenTrabajoConDetalles' ||
            prop === 'saveCuotasPago' ||
            prop === 'confirmarPagoCuota' ||
            prop === 'actualizarEstadosCuotasVencidas' ||
            prop === 'updateFechaProgramada' ||
            prop === 'repairIntegrity' ||
            prop === 'diagnosticarOrdenesProblemas' ||
            prop === 'performMaintenance'
          ) {
            return asyncResolve({ success: true, data: undefined });
          }
          return asyncResolve(args?.[0]);
        }

        if (prop.startsWith('delete') || prop.startsWith('limpiar')) {
          return asyncResolve(true as any);
        }

        if (prop.startsWith('procesarExcel')) {
          return asyncResolve({ success: false, error: 'No disponible en vista web' });
        }

        if (prop === 'createBackup') return asyncResolve('vista-web');
        if (prop === 'restoreBackup' || prop === 'deleteBackup') return asyncResolve(true);

        return asyncResolve(undefined as any);
      };
    },
  };

  return new Proxy({} as ElectronApi, handler);
};

export const installElectronApiFallback = () => {
  if (typeof window === 'undefined') return;
  if (!window.electronAPI) {
    window.electronAPI = createElectronApiFallback();
  }
};
