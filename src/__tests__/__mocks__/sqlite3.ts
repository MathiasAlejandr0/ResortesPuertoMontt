type RunCallback = (err: Error | null) => void;
type GetCallback = (err: Error | null, row?: any) => void;

class MockDatabase {
  private configuracion: Map<string, string> = new Map();
  private hasConfiguracionTable = false;

  constructor(_path?: string) {}

  serialize(callback: () => void) {
    callback();
  }

  run(sql: string, paramsOrCb?: any, cb?: RunCallback) {
    const callback: RunCallback | undefined = typeof paramsOrCb === 'function' ? paramsOrCb : cb;
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.includes('CREATE TABLE') && sqlUpper.includes('CONFIGURACION')) {
      this.hasConfiguracionTable = true;
      callback?.(null);
      return this;
    }

    if (sqlUpper.includes('INSERT OR REPLACE INTO CONFIGURACION')) {
      if (!this.hasConfiguracionTable) {
        callback?.(null);
        return this;
      }

      let clave: string | undefined;
      let valor: string | undefined;

      if (Array.isArray(paramsOrCb)) {
        [clave, valor] = paramsOrCb;
      } else {
        const match = sql.match(/VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'/i);
        if (match) {
          clave = match[1];
          valor = match[2];
        }
      }

      if (clave && valor) {
        this.configuracion.set(clave, valor);
      }
      callback?.(null);
      return this;
    }

    callback?.(null);
    return this;
  }

  get(sql: string, paramsOrCb?: any, cb?: GetCallback) {
    const callback: GetCallback | undefined = typeof paramsOrCb === 'function' ? paramsOrCb : cb;
    const sqlUpper = sql.toUpperCase();

    if (!this.hasConfiguracionTable) {
      callback?.(new Error('no such table: configuracion'));
      return this;
    }

    if (sqlUpper.includes('SELECT VALOR FROM CONFIGURACION')) {
      const valor = this.configuracion.get('schema_version');
      callback?.(null, valor ? { valor } : undefined);
      return this;
    }

    callback?.(null, undefined);
    return this;
  }

  close() {}
}

export const Database = MockDatabase as any;
