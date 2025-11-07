/**
 * Sistema de logging persistente para producción
 * Guarda logs en archivos para análisis posterior
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class PersistentLogger {
  private logDir: string;
  private logFile: string;
  private errorLogFile: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10 MB
  private maxLogFiles: number = 5; // Mantener últimos 5 archivos
  private minLogLevel: LogLevel;
  
  // Niveles de log ordenados por prioridad
  private readonly logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logDir = path.join(userDataPath, 'logs');
    this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);
    this.errorLogFile = path.join(this.logDir, `error-${this.getDateString()}.log`);

    // Determinar nivel mínimo de log según entorno
    // En producción: solo info, warn, error (no debug)
    // En desarrollo: todos los niveles
    const envLogLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    if (envLogLevel && this.logLevels.hasOwnProperty(envLogLevel)) {
      this.minLogLevel = envLogLevel;
    } else {
      this.minLogLevel = app.isPackaged ? 'info' : 'debug';
    }

    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Limpiar logs antiguos al iniciar
    this.cleanOldLogs();
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.minLogLevel];
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith('app-') || f.startsWith('error-'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          mtime: fs.statSync(path.join(this.logDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime); // Más recientes primero

      // Eliminar archivos que exceden el límite
      if (logFiles.length > this.maxLogFiles) {
        logFiles.slice(this.maxLogFiles).forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            // Ignorar errores al eliminar
          }
        });
      }
    } catch (e) {
      // Ignorar errores de limpieza
    }
  }

  private rotateLogIfNeeded(logFilePath: string): void {
    try {
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size > this.maxLogSize) {
          // Rotar: renombrar archivo actual con timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedPath = logFilePath.replace('.log', `-${timestamp}.log`);
          fs.renameSync(logFilePath, rotatedPath);
        }
      }
    } catch (e) {
      // Ignorar errores de rotación
    }
  }

  private writeLog(entry: LogEntry, isError: boolean = false): void {
    try {
      const logPath = isError ? this.errorLogFile : this.logFile;
      
      // Rotar si es necesario
      this.rotateLogIfNeeded(logPath);

      // Formatear entrada
      const dataStr = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
      const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}\n`;

      // Escribir a archivo (append)
      fs.appendFileSync(logPath, logLine, 'utf8');
    } catch (e) {
      // Fallback: solo consola si falla escritura de archivo
      console.error('Error escribiendo log a archivo:', e);
    }
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog('debug')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      data,
    };

    // Solo escribir a archivo si está configurado
    if (app.isPackaged || process.env.LOG_TO_FILE === 'true') {
      this.writeLog(entry);
    }

    // Solo a consola en desarrollo
    if (!app.isPackaged) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }

  log(message: string, data?: any): void {
    // Alias para info para compatibilidad
    this.info(message, data);
  }

  error(message: string, data?: any): void {
    // Errores siempre se registran
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data,
    };

    // Siempre escribir errores a archivo
    this.writeLog(entry, true);

    // Siempre a consola (errores son críticos)
    console.error(`[ERROR] ${message}`, data || '');
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog('warn')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
    };

    // Siempre escribir warnings a archivo
    if (app.isPackaged || process.env.LOG_TO_FILE === 'true') {
      this.writeLog(entry);
    }

    // A consola siempre (warnings son importantes)
    console.warn(`[WARN] ${message}`, data || '');
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog('info')) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
    };

    // Siempre escribir info a archivo
    if (app.isPackaged || process.env.LOG_TO_FILE === 'true') {
      this.writeLog(entry);
    }

    // A consola en desarrollo o si está configurado
    if (!app.isPackaged || process.env.LOG_CONSOLE === 'true') {
      console.info(`[INFO] ${message}`, data || '');
    }
  }

  // Método para obtener logs recientes (útil para debugging)
  getRecentLogs(limit: number = 100): string[] {
    try {
      if (fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        return lines.slice(-limit);
      }
    } catch (e) {
      // Ignorar errores
    }
    return [];
  }

  // Método para obtener errores recientes
  getRecentErrors(limit: number = 100): string[] {
    try {
      if (fs.existsSync(this.errorLogFile)) {
        const content = fs.readFileSync(this.errorLogFile, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        return lines.slice(-limit);
      }
    } catch (e) {
      // Ignorar errores
    }
    return [];
  }
}

// Exportar instancia singleton
export const persistentLogger = new PersistentLogger();

