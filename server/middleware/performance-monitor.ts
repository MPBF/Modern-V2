// ===============================================
// 🔹 Performance Monitoring Middleware
// ===============================================
// يراقب أداء جميع API endpoints ويسجل العمليات البطيئة
// ===============================================

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { system_performance_metrics } from '../../shared/schema';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage?: number;
  warnings?: string[];
}

export class PerformanceMonitor {
  private static slowThreshold = 500; // ms
  private static verySlowThreshold = 2000; // ms
  private static metricsBuffer: PerformanceMetrics[] = [];
  private static bufferSize = 100;

  private static devAssetPaths = [
    '/client/src/',
    '/node_modules/',
    '/@vite/',
    '/@fs/',
    '/__vite_ping',
    '/src/',
  ];

  private static isDevAsset(path: string): boolean {
    return PerformanceMonitor.devAssetPaths.some(prefix => path.startsWith(prefix));
  }

  static middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (this.isDevAsset(req.path)) {
        return next();
      }

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;

      // تخزين الـ statusCode الأصلي
      const originalSend = res.send;
      const originalJson = res.json;

      let responseFinished = false;

      const finishRequest = async () => {
        if (responseFinished) return;
        responseFinished = true;

        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage().heapUsed;
        const memoryDelta = endMemory - startMemory;

        const metrics: PerformanceMetrics = {
          endpoint: req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          timestamp: new Date(),
          memoryUsage: memoryDelta,
          warnings: []
        };

        // فحص الأداء وإضافة التحذيرات
        if (duration > this.verySlowThreshold) {
          metrics.warnings?.push(`CRITICAL: Very slow response (${duration}ms)`);
          console.warn(`⚠️ [CRITICAL] ${req.method} ${req.path} took ${duration}ms`);
        } else if (duration > this.slowThreshold) {
          metrics.warnings?.push(`WARNING: Slow response (${duration}ms)`);
          console.warn(`⚠️ [WARNING] ${req.method} ${req.path} took ${duration}ms`);
        }

        if (memoryDelta > 50 * 1024 * 1024) { // 50MB
          metrics.warnings?.push(`High memory usage: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
          console.warn(`⚠️ [MEMORY] ${req.method} ${req.path} used ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
        }

        // حفظ في الذاكرة المؤقتة
        this.metricsBuffer.push(metrics);

        // حفظ في قاعدة البيانات عند امتلاء الذاكرة المؤقتة أو للعمليات البطيئة
        if (this.metricsBuffer.length >= this.bufferSize || duration > this.slowThreshold) {
          await this.flushMetrics();
        }
      };

      res.on('finish', finishRequest);

      next();
    };
  }

  private static async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metricsToSave = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // حفظ في قاعدة البيانات
      for (const metric of metricsToSave) {
        if (metric.duration > this.slowThreshold / 2) { // حفظ العمليات البطيئة فقط
          await db.insert(system_performance_metrics).values({
            metric_name: `${metric.method} ${metric.endpoint}`.substring(0, 255),
            metric_category: 'application',
            value: metric.duration.toString(),
            unit: 'ms',
            source: 'server',
            tags: {
              endpoint: metric.endpoint,
              method: metric.method,
              statusCode: metric.statusCode.toString(),
              memoryUsageMB: metric.memoryUsage ? (metric.memoryUsage / 1024 / 1024).toFixed(2) : '0',
              warnings: metric.warnings?.join(', ') || ''
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to save performance metrics:', error);
    }
  }

  static getRecentMetrics(limit = 50): PerformanceMetrics[] {
    return this.metricsBuffer.slice(-limit);
  }

  static getSlowEndpoints(threshold = 500): PerformanceMetrics[] {
    return this.metricsBuffer.filter(m => m.duration > threshold);
  }

  static async getPerformanceReport() {
    const recent = this.metricsBuffer.slice(-100);
    
    if (recent.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        fastestEndpoint: null,
        slowestEndpoint: null,
        endpoints: {}
      };
    }

    const byEndpoint = recent.reduce((acc, m) => {
      const key = `${m.method} ${m.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0, maxTime: 0, minTime: Infinity };
      }
      acc[key].count++;
      acc[key].totalTime += m.duration;
      acc[key].maxTime = Math.max(acc[key].maxTime, m.duration);
      acc[key].minTime = Math.min(acc[key].minTime, m.duration);
      return acc;
    }, {} as Record<string, any>);

    const totalTime = recent.reduce((sum, m) => sum + m.duration, 0);
    const slowRequests = recent.filter(m => m.duration > this.slowThreshold).length;

    return {
      totalRequests: recent.length,
      averageResponseTime: Math.round(totalTime / recent.length),
      slowRequests,
      slowRequestsPercent: Math.round((slowRequests / recent.length) * 100),
      fastestEndpoint: Object.entries(byEndpoint)
        .sort(([, a], [, b]) => (a.totalTime / a.count) - (b.totalTime / b.count))[0],
      slowestEndpoint: Object.entries(byEndpoint)
        .sort(([, a], [, b]) => (b.totalTime / b.count) - (a.totalTime / a.count))[0],
      endpoints: Object.entries(byEndpoint).map(([key, stats]) => ({
        endpoint: key,
        count: stats.count,
        avgTime: Math.round(stats.totalTime / stats.count),
        maxTime: stats.maxTime,
        minTime: stats.minTime === Infinity ? 0 : stats.minTime
      }))
    };
  }
}

// تصدير الـ middleware
export const performanceMonitor = PerformanceMonitor.middleware();
