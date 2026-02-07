import os from 'os';

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  timestamp: Date;
  eventLoopLag: number;
  cpuUsage: number;
}

export interface SystemDiagnostics {
  memory: {
    current: {
      heapUsedMB: string;
      heapTotalMB: string;
      heapUsagePercent: string;
      rssMB: string;
      externalMB: string;
      arrayBuffersMB: string;
    };
    average: { heapUsedMB: string };
    peak: { heapUsedMB: string; rssMB: string; timestamp: Date | null };
    trend: {
      direction: 'increasing' | 'decreasing' | 'stable';
      changeMB: string;
      changePercent: string;
      isMemoryLeak: boolean;
      leakConfidence: number;
    };
    warnings: string[];
    recommendation: string;
  };
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
    arch: string;
    uptime: number;
    uptimeFormatted: string;
  };
  eventLoop: {
    currentLagMs: string;
    averageLagMs: string;
    maxLagMs: string;
    status: 'healthy' | 'warning' | 'critical';
  };
  cpu: {
    usagePercent: string;
    systemCpus: number;
    loadAverage: number[];
  };
  os: {
    totalMemoryMB: string;
    freeMemoryMB: string;
    usedMemoryPercent: string;
  };
}

export class MemoryMonitor {
  private static snapshots: MemorySnapshot[] = [];
  private static maxSnapshots = 2000;
  private static warningThreshold = 500 * 1024 * 1024;
  private static criticalThreshold = 800 * 1024 * 1024;
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static eventLoopInterval: NodeJS.Timeout | null = null;
  private static lastCpuUsage = process.cpuUsage();
  private static lastCpuTime = Date.now();
  private static currentEventLoopLag = 0;
  private static peakHeap = 0;
  private static peakRss = 0;
  private static peakTimestamp: Date | null = null;

  static startMonitoring(intervalMs = 30000) {
    if (this.monitoringInterval) {
      return;
    }

    this.takeSnapshot();

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    this.eventLoopInterval = setInterval(() => {
      this.measureEventLoopLag();
    }, 5000);

    console.log(`✅ Memory monitoring started (interval: ${intervalMs}ms)`);
  }

  private static measureEventLoopLag() {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const end = process.hrtime.bigint();
      this.currentEventLoopLag = Number(end - start) / 1e6;
    });
  }

  private static getCpuUsage(): number {
    const now = Date.now();
    const elapsed = now - this.lastCpuTime;
    if (elapsed < 100) return 0;

    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    const totalMicros = currentUsage.user + currentUsage.system;
    const percent = (totalMicros / (elapsed * 1000)) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = now;

    return Math.min(percent, 100);
  }

  static takeSnapshot() {
    const mem = process.memoryUsage();
    const cpuUsage = this.getCpuUsage();

    const snapshot: MemorySnapshot = {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0,
      rss: mem.rss,
      timestamp: new Date(),
      eventLoopLag: this.currentEventLoopLag,
      cpuUsage
    };

    if (mem.heapUsed > this.peakHeap) {
      this.peakHeap = mem.heapUsed;
      this.peakRss = mem.rss;
      this.peakTimestamp = new Date();
    }

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.checkMemoryThresholds(snapshot);

    return snapshot;
  }

  private static checkMemoryThresholds(snapshot: MemorySnapshot) {
    const heapUsedMB = snapshot.heapUsed / 1024 / 1024;

    if (snapshot.heapUsed > this.criticalThreshold) {
      console.error(`🚨 [CRITICAL MEMORY] Heap usage: ${heapUsedMB.toFixed(2)}MB`);
      if (global.gc) {
        console.log('   Running garbage collection...');
        global.gc();
      }
    } else if (snapshot.heapUsed > this.warningThreshold) {
      console.warn(`⚠️ [HIGH MEMORY] Heap usage: ${heapUsedMB.toFixed(2)}MB`);
    }
  }

  static getFullDiagnostics(): SystemDiagnostics {
    const mem = process.memoryUsage();
    const recent = this.snapshots.slice(-30);
    const current = recent.length > 0 ? recent[recent.length - 1] : null;
    const oldest = recent.length > 0 ? recent[0] : null;

    const avgHeapUsed = recent.length > 0 
      ? recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length 
      : mem.heapUsed;

    const heapUsagePercent = (mem.heapUsed / mem.heapTotal) * 100;

    const trend = current && oldest ? current.heapUsed - oldest.heapUsed : 0;
    const trendPercent = oldest && oldest.heapUsed > 0 
      ? (trend / oldest.heapUsed) * 100 
      : 0;

    const leakDetection = this.analyzeMemoryLeak();

    const eventLoopLags = recent.map(s => s.eventLoopLag).filter(l => l > 0);
    const avgLag = eventLoopLags.length > 0 
      ? eventLoopLags.reduce((a, b) => a + b, 0) / eventLoopLags.length 
      : 0;
    const maxLag = eventLoopLags.length > 0 ? Math.max(...eventLoopLags) : 0;

    const cpuPercent = this.getCpuUsage();

    const uptime = process.uptime();

    return {
      memory: {
        current: {
          heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
          heapUsagePercent: heapUsagePercent.toFixed(1),
          rssMB: (mem.rss / 1024 / 1024).toFixed(2),
          externalMB: (mem.external / 1024 / 1024).toFixed(2),
          arrayBuffersMB: ((mem.arrayBuffers || 0) / 1024 / 1024).toFixed(2),
        },
        average: { heapUsedMB: (avgHeapUsed / 1024 / 1024).toFixed(2) },
        peak: {
          heapUsedMB: (this.peakHeap / 1024 / 1024).toFixed(2),
          rssMB: (this.peakRss / 1024 / 1024).toFixed(2),
          timestamp: this.peakTimestamp
        },
        trend: {
          direction: trend > 1024 * 1024 ? 'increasing' : trend < -1024 * 1024 ? 'decreasing' : 'stable',
          changeMB: (Math.abs(trend) / 1024 / 1024).toFixed(2),
          changePercent: Math.abs(trendPercent).toFixed(1),
          isMemoryLeak: leakDetection.isLeak,
          leakConfidence: leakDetection.confidence,
        },
        warnings: this.getMemoryWarnings({ heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external, rss: mem.rss, timestamp: new Date(), eventLoopLag: 0, arrayBuffers: 0, cpuUsage: 0 }),
        recommendation: this.getRecommendation(mem, leakDetection),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime,
        uptimeFormatted: this.formatUptime(uptime),
      },
      eventLoop: {
        currentLagMs: this.currentEventLoopLag.toFixed(2),
        averageLagMs: avgLag.toFixed(2),
        maxLagMs: maxLag.toFixed(2),
        status: maxLag > 100 ? 'critical' : maxLag > 50 ? 'warning' : 'healthy',
      },
      cpu: {
        usagePercent: cpuPercent.toFixed(1),
        systemCpus: os.cpus().length,
        loadAverage: os.loadavg(),
      },
      os: {
        totalMemoryMB: (os.totalmem() / 1024 / 1024).toFixed(0),
        freeMemoryMB: (os.freemem() / 1024 / 1024).toFixed(0),
        usedMemoryPercent: (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1),
      }
    };
  }

  private static analyzeMemoryLeak(): { isLeak: boolean; confidence: number } {
    if (this.snapshots.length < 10) return { isLeak: false, confidence: 0 };

    const recent = this.snapshots.slice(-20);
    let increases = 0;
    let totalDelta = 0;

    for (let i = 1; i < recent.length; i++) {
      const delta = recent[i].heapUsed - recent[i - 1].heapUsed;
      if (delta > 0) {
        increases++;
        totalDelta += delta;
      }
    }

    const increaseRatio = increases / (recent.length - 1);
    const avgDelta = totalDelta / recent.length;
    const avgDeltaMB = avgDelta / 1024 / 1024;

    const isLeak = increaseRatio > 0.75 && avgDeltaMB > 1;
    const confidence = Math.min(100, Math.round(increaseRatio * 100));

    return { isLeak, confidence };
  }

  private static getRecommendation(mem: NodeJS.MemoryUsage, leak: { isLeak: boolean; confidence: number }): string {
    const heapMB = mem.heapUsed / 1024 / 1024;
    const rssMB = mem.rss / 1024 / 1024;

    if (leak.isLeak) {
      return 'تم اكتشاف تسريب محتمل في الذاكرة. يُنصح بمراجعة المؤقتات والمستمعات غير المحررة.';
    }
    if (heapMB > 400) {
      return 'استهلاك الذاكرة مرتفع. يُنصح بتحسين الكود وتقليل التخزين المؤقت.';
    }
    if (rssMB > 600) {
      return 'RSS مرتفع. قد يكون هناك تخصيص ذاكرة خارجية كبير (مثل Buffers).';
    }
    if (this.currentEventLoopLag > 50) {
      return 'تأخر في Event Loop. يُنصح بتقسيم العمليات الثقيلة.';
    }
    return 'النظام يعمل بشكل طبيعي.';
  }

  static getMemoryStats() {
    if (this.snapshots.length === 0) {
      return null;
    }

    const recent = this.snapshots.slice(-20);
    const current = recent[recent.length - 1];
    const oldest = recent[0];

    const avgHeapUsed = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const trend = current.heapUsed - oldest.heapUsed;

    return {
      current: {
        heapUsedMB: (current.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (current.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: (current.rss / 1024 / 1024).toFixed(2),
        externalMB: (current.external / 1024 / 1024).toFixed(2)
      },
      average: {
        heapUsedMB: (avgHeapUsed / 1024 / 1024).toFixed(2)
      },
      trend: {
        direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        changeMB: (Math.abs(trend) / 1024 / 1024).toFixed(2),
        isMemoryLeak: this.detectMemoryLeak()
      },
      warnings: this.getMemoryWarnings(current)
    };
  }

  private static detectMemoryLeak(): boolean {
    if (this.snapshots.length < 10) return false;

    const recent = this.snapshots.slice(-10);
    let increasingCount = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed > recent[i - 1].heapUsed) {
        increasingCount++;
      }
    }

    return increasingCount >= 8;
  }

  private static getMemoryWarnings(snapshot: MemorySnapshot): string[] {
    const warnings: string[] = [];

    if (snapshot.heapUsed > this.criticalThreshold) {
      warnings.push('حرج: استهلاك الذاكرة مرتفع جداً');
    } else if (snapshot.heapUsed > this.warningThreshold) {
      warnings.push('تحذير: استهلاك الذاكرة مرتفع');
    }

    if (this.detectMemoryLeak()) {
      warnings.push('تسريب محتمل: الاستهلاك في ازدياد مستمر');
    }

    if (this.currentEventLoopLag > 100) {
      warnings.push('حرج: تأخر كبير في Event Loop');
    } else if (this.currentEventLoopLag > 50) {
      warnings.push('تحذير: تأخر في Event Loop');
    }

    return warnings;
  }

  static getMemoryHistory(minutes = 30): MemorySnapshot[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.snapshots.filter(s => s.timestamp >= cutoff);
  }

  static forceGarbageCollection() {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freed = (before - after) / 1024 / 1024;
      
      this.takeSnapshot();

      return { 
        freedMB: freed.toFixed(2), 
        beforeMB: (before / 1024 / 1024).toFixed(2),
        afterMB: (after / 1024 / 1024).toFixed(2),
        success: true 
      };
    } else {
      return { error: 'GC غير متاح. يحتاج تشغيل الخادم بعلامة --expose-gc', success: false };
    }
  }

  private static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (parts.length === 0) parts.push(`${secs} ثانية`);

    return parts.join(' و ');
  }
}
