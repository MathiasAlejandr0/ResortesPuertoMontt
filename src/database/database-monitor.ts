/**
 * Sistema de monitoreo de base de datos
 * Monitorea tamaño, salud y rendimiento de la BD
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { DatabaseService } from './database';

export interface DatabaseStats {
  size: number; // Tamaño en bytes
  sizeMB: number; // Tamaño en MB
  tableCount: number;
  recordCounts: {
    clientes: number;
    vehiculos: number;
    cotizaciones: number;
    ordenes: number;
    repuestos: number;
    servicios: number;
  };
  lastBackup: string | null;
  backupCount: number;
  health: 'excelente' | 'buena' | 'advertencia' | 'critica';
}

export class DatabaseMonitor {
  private dbService: DatabaseService;
  private dbPath: string;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.dbPath = this.getDbPath();
  }

  private getDbPath(): string {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');
    return path.join(dataDir, 'resortes.db');
  }

  /**
   * Obtiene estadísticas completas de la base de datos
   */
  async getStats(): Promise<DatabaseStats> {
    return new Promise((resolve, reject) => {
      const stats: Partial<DatabaseStats> = {
        size: 0,
        sizeMB: 0,
        tableCount: 0,
        recordCounts: {
          clientes: 0,
          vehiculos: 0,
          cotizaciones: 0,
          ordenes: 0,
          repuestos: 0,
          servicios: 0,
        },
        lastBackup: null,
        backupCount: 0,
        health: 'buena',
      };

      // Obtener tamaño del archivo
      try {
        if (fs.existsSync(this.dbPath)) {
          const stat = fs.statSync(this.dbPath);
          stats.size = stat.size;
          stats.sizeMB = Math.round((stat.size / (1024 * 1024)) * 100) / 100;
        }
      } catch (error) {
        console.error('Error obteniendo tamaño de BD:', error);
      }

      // Obtener conteo de registros
      const db = (this.dbService as any).db;
      if (!db) {
        reject(new Error('Base de datos no inicializada'));
        return;
      }

      // Contar registros en cada tabla
      const queries = [
        'SELECT COUNT(*) as count FROM clientes',
        'SELECT COUNT(*) as count FROM vehiculos',
        'SELECT COUNT(*) as count FROM cotizaciones',
        'SELECT COUNT(*) as count FROM ordenes_trabajo',
        'SELECT COUNT(*) as count FROM repuestos',
        'SELECT COUNT(*) as count FROM servicios',
      ];

      let completed = 0;
      const results: number[] = [];

      queries.forEach((query, index) => {
        db.get(query, (err: any, row: any) => {
          if (err) {
            console.error(`Error contando ${query}:`, err);
            results[index] = 0;
          } else {
            results[index] = row?.count || 0;
          }

          completed++;
          if (completed === queries.length) {
            stats.recordCounts = {
              clientes: results[0],
              vehiculos: results[1],
              cotizaciones: results[2],
              ordenes: results[3],
              repuestos: results[4],
              servicios: results[5],
            };

            // Contar tablas
            db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'", (err: any, row: any) => {
              if (!err) {
                stats.tableCount = row?.count || 0;
              }

              // Obtener información de backups
              this.getBackupInfo().then((backupInfo) => {
                stats.lastBackup = backupInfo.lastBackup;
                stats.backupCount = backupInfo.count;

                // Determinar salud
                stats.health = this.determineHealth(stats as DatabaseStats);

                resolve(stats as DatabaseStats);
              });
            });
          }
        });
      });
    });
  }

  /**
   * Obtiene información de backups
   */
  private async getBackupInfo(): Promise<{ lastBackup: string | null; count: number }> {
    try {
      const userDataPath = app.getPath('userData');
      const backupDir = path.join(userDataPath, 'data', 'backups');

      if (!fs.existsSync(backupDir)) {
        return { lastBackup: null, count: 0 };
      }

      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const lastBackup = files.length > 0
        ? new Date(files[0].mtime).toISOString()
        : null;

      return {
        lastBackup,
        count: files.length,
      };
    } catch (error) {
      console.error('Error obteniendo información de backups:', error);
      return { lastBackup: null, count: 0 };
    }
  }

  /**
   * Determina el estado de salud de la base de datos
   */
  private determineHealth(stats: DatabaseStats): 'excelente' | 'buena' | 'advertencia' | 'critica' {
    // Salud basada en tamaño
    if (stats.sizeMB > 500) {
      return 'critica'; // BD muy grande
    }
    if (stats.sizeMB > 200) {
      return 'advertencia'; // BD grande
    }
    if (stats.sizeMB > 100) {
      return 'buena'; // BD mediana
    }

    // Salud basada en cantidad de registros
    const totalRecords = Object.values(stats.recordCounts).reduce((sum, count) => sum + count, 0);
    if (totalRecords > 50000) {
      return 'advertencia';
    }
    if (totalRecords > 20000) {
      return 'buena';
    }

    // Salud basada en backups
    if (stats.backupCount === 0) {
      return 'advertencia'; // Sin backups
    }

    return 'excelente';
  }

  /**
   * Obtiene recomendaciones basadas en las estadísticas
   */
  getRecommendations(stats: DatabaseStats): string[] {
    const recommendations: string[] = [];

    if (stats.sizeMB > 200) {
      recommendations.push('La base de datos es grande (>200MB). Considera limpiar datos antiguos o hacer backup y empezar desde cero.');
    }

    if (stats.backupCount === 0) {
      recommendations.push('No hay backups disponibles. Crea un backup manual para proteger tus datos.');
    }

    if (stats.backupCount > 20) {
      recommendations.push(`Tienes ${stats.backupCount} backups. Considera eliminar backups antiguos para liberar espacio.`);
    }

    const totalRecords = Object.values(stats.recordCounts).reduce((sum, count) => sum + count, 0);
    if (totalRecords > 50000) {
      recommendations.push('Tienes muchos registros (>50,000). El rendimiento puede verse afectado. Considera archivar datos antiguos.');
    }

    if (stats.recordCounts.repuestos > 10000) {
      recommendations.push('Tienes más de 10,000 repuestos. Considera limpiar repuestos inactivos para mejorar el rendimiento.');
    }

    return recommendations;
  }

  /**
   * Verifica si la base de datos necesita mantenimiento
   */
  async needsMaintenance(): Promise<boolean> {
    const stats = await this.getStats();
    
    // Necesita mantenimiento si:
    // - Tamaño > 200MB
    // - Sin backups recientes (>30 días)
    // - Más de 50,000 registros totales
    
    if (stats.sizeMB > 200) return true;
    
    if (stats.lastBackup) {
      const lastBackupDate = new Date(stats.lastBackup);
      const daysSinceBackup = (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceBackup > 30) return true;
    } else {
      return true; // Sin backups
    }

    const totalRecords = Object.values(stats.recordCounts).reduce((sum, count) => sum + count, 0);
    if (totalRecords > 50000) return true;

    return false;
  }
}

