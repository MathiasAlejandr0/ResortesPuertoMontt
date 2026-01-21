/**
 * Sistema de logging persistente para producción con sanitización de PII
 * Guarda logs en archivos para análisis posterior
 * 
 * Implementa PII Redactor para cumplir con GDPR/ISO 27001:
 * - Detecta y redacta RUTs chilenos
 * - Detecta y redacta emails
 * - Detecta y redacta contraseñas
 * - Detecta y redacta números de teléfono
 * 
 * @author Mathias Jara
 * @version 1.1.2
 * @compliance GDPR, ISO 27001, OWASP
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

/**
 * PII Redactor - Detecta y redacta información personal identificable
 * 
 * Patrones detectados:
 * - RUTs chilenos: XX.XXX.XXX-X o XXXXXXXX-X
 * - Emails: user@domain.com
 * - Contraseñas: password, pass, pwd, secret, token
 * - Teléfonos: +56 9 XXXX XXXX, 9XXXXXXXX
 */
class PIIRedactor {
  // Patrón para RUT chileno: XX.XXX.XXX-X o XXXXXXXX-X
  private readonly rutPattern = /\b\d{1,2}\.?\d{3}\.?\d{3}[-]?\d{1}\b/g;
  
  // Patrón para email
  private readonly emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  // Patrón para teléfonos chilenos
  private readonly phonePattern = /(\+?56\s?)?[9]\s?\d{4}\s?\d{4}\b/g;
  
  // Palabras clave que indican contraseñas/tokens
  private readonly passwordKeywords = [
    /password['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
    /pass['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
    /pwd['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
    /secret['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
    /token['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
    /api[_-]?key['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
    /auth[_-]?token['":\s]*[:=]\s*['"]?([^'",\s}]+)/gi,
  ];

  /**
   * Redacta PII de un string
   */
  redact(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let redacted = text;

    // Redactar RUTs
    redacted = redacted.replace(this.rutPattern, '[RUT_REDACTED]');

    // Redactar emails
    redacted = redacted.replace(this.emailPattern, '[EMAIL_REDACTED]');

    // Redactar teléfonos
    redacted = redacted.replace(this.phonePattern, '[PHONE_REDACTED]');

    // Redactar contraseñas y tokens
    for (const pattern of this.passwordKeywords) {
      redacted = redacted.replace(pattern, (match, value) => {
        return match.replace(value, '[REDACTED]');
      });
    }

    return redacted;
  }

  /**
   * Redacta PII de un objeto (recursivo)
   */
  redactObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redact(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item));
    }

    if (typeof obj === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Redactar valores de campos sensibles
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('pass') ||
          lowerKey.includes('pwd') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('key') ||
          lowerKey.includes('rut') ||
          lowerKey.includes('email') ||
          lowerKey.includes('telefono') ||
          lowerKey.includes('phone')
        ) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactObject(value);
        }
      }
      return redacted;
    }

    return obj;
  }
}

class PersistentLogger {
  private logDir: string;
  private logFile: string;
  private errorLogFile: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10 MB
  private maxLogFiles: number = 5; // Mantener últimos 5 archivos
  private minLogLevel: LogLevel;
  private piiRedactor: PIIRedactor;
  
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
    this.piiRedactor = new PIIRedactor();

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

      // Sanitizar mensaje y datos antes de escribir (PII Redaction)
      const sanitizedMessage = this.piiRedactor.redact(entry.message);
      const sanitizedData = entry.data ? this.piiRedactor.redactObject(entry.data) : null;
      
      // Formatear entrada con datos sanitizados
      const dataStr = sanitizedData ? ` | Data: ${JSON.stringify(sanitizedData)}` : '';
      const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${sanitizedMessage}${dataStr}\n`;

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

