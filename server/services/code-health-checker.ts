import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export interface CodeIssue {
  type: 'duplicate_code' | 'unused_file' | 'large_file' | 'complex_file' | 'deprecated_pattern';
  severity: 'low' | 'medium' | 'high';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface CodeHealthReport {
  timestamp: Date;
  totalFiles: number;
  issues: CodeIssue[];
  summary: {
    duplicateCode: number;
    unusedFiles: number;
    largeFiles: number;
    complexFiles: number;
    deprecatedPatterns: number;
  };
  recommendations: string[];
}

export class CodeHealthChecker {
  private static clientDir = path.join(process.cwd(), 'client', 'src');
  private static serverDir = path.join(process.cwd(), 'server');

  static async runFullHealthCheck(): Promise<CodeHealthReport> {
    const issues: CodeIssue[] = [];

    try {
      const files = await this.getAllFiles([this.clientDir, this.serverDir]);
      const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

      const fileContents = await this.readFilesInBatches(tsFiles, 10);

      const largeFiles = this.checkLargeFilesFromContent(fileContents);
      issues.push(...largeFiles);

      const deprecatedPatterns = this.checkDeprecatedPatternsFromContent(fileContents);
      issues.push(...deprecatedPatterns);

      const backupFiles = this.checkBackupFilesFromList(files);
      issues.push(...backupFiles);

      const duplicates = this.checkDuplicateCodeFromContent(fileContents);
      issues.push(...duplicates);

      const summary = {
        duplicateCode: issues.filter(i => i.type === 'duplicate_code').length,
        unusedFiles: issues.filter(i => i.type === 'unused_file').length,
        largeFiles: issues.filter(i => i.type === 'large_file').length,
        complexFiles: issues.filter(i => i.type === 'complex_file').length,
        deprecatedPatterns: issues.filter(i => i.type === 'deprecated_pattern').length
      };

      const recommendations = this.generateRecommendations(summary);

      return {
        timestamp: new Date(),
        totalFiles: tsFiles.length,
        issues,
        summary,
        recommendations
      };
    } catch (error) {
      console.error('Error running health check:', error);
      throw error;
    }
  }

  private static async readFilesInBatches(files: string[], batchSize: number): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const contents = await Promise.all(
        batch.map(async (file) => {
          try {
            const content = await fs.readFile(file, 'utf-8');
            return { file, content };
          } catch {
            return { file, content: '' };
          }
        })
      );
      for (const { file, content } of contents) {
        result.set(file, content);
      }
    }

    return result;
  }

  private static checkLargeFilesFromContent(fileContents: Map<string, string>): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const maxLines = 500;

    Array.from(fileContents.entries()).forEach(([file, content]) => {
      const lines = content.split('\n').length;

      if (lines > maxLines) {
        issues.push({
          type: 'large_file',
          severity: lines > 1000 ? 'high' : 'medium',
          file: this.relativePath(file),
          message: `الملف يحتوي ${lines} سطر (الحد المقترح: < ${maxLines})`,
          suggestion: 'يُنصح بتقسيم الملف إلى وحدات أصغر'
        });
      }
    });

    return issues;
  }

  private static checkDeprecatedPatternsFromContent(fileContents: Map<string, string>): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const deprecatedPatterns = [
      {
        pattern: /onError[\s\S]*useQuery/,
        message: 'TanStack Query v5: onError في useQuery مهجور',
        suggestion: 'استخدم error state أو useEffect بدلاً من ذلك',
        clientOnly: true
      },
      {
        pattern: /import React from ['"]react['"]/,
        message: 'لا حاجة لاستيراد React صريحاً مع JSX transform الحديث',
        suggestion: 'أزل سطر "import React"',
        clientOnly: true
      }
    ];

    Array.from(fileContents.entries()).forEach(([file, content]) => {
      for (const { pattern, message, suggestion, clientOnly } of deprecatedPatterns) {
        if (clientOnly && file.includes('server')) continue;

        if (pattern.test(content)) {
          issues.push({
            type: 'deprecated_pattern',
            severity: 'medium',
            file: this.relativePath(file),
            message,
            suggestion
          });
        }
      }
    });

    return issues;
  }

  private static checkBackupFilesFromList(files: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];

    const backupPatterns = [
      /-backup\.(ts|tsx|js|jsx)$/,
      /\.backup\.(ts|tsx|js|jsx)$/,
      /-old\.(ts|tsx|js|jsx)$/,
      /\.old\.(ts|tsx|js|jsx)$/,
      /-copy\.(ts|tsx|js|jsx)$/
    ];

    for (const file of files) {
      for (const pattern of backupPatterns) {
        if (pattern.test(file)) {
          issues.push({
            type: 'unused_file',
            severity: 'low',
            file: this.relativePath(file),
            message: 'ملف نسخة احتياطية أو قديم',
            suggestion: 'أزله إذا لم يعد مطلوباً لتقليل حجم الكود'
          });
          break;
        }
      }
    }

    return issues;
  }

  private static checkDuplicateCodeFromContent(fileContents: Map<string, string>): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const functionSignatures = new Map<string, string[]>();

    Array.from(fileContents.entries()).forEach(([file, content]) => {
      const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*[=:]?\s*(?:\([^)]*\)|\([^)]*\)\s*=>)/g;
      let match;

      while ((match = functionRegex.exec(content)) !== null) {
        const signature = match[0];

        if (!functionSignatures.has(signature)) {
          functionSignatures.set(signature, []);
        }
        functionSignatures.get(signature)!.push(file);
      }
    });

    Array.from(functionSignatures.entries()).forEach(([, filesList]) => {
      if (filesList.length > 1) {
        issues.push({
          type: 'duplicate_code',
          severity: 'medium',
          file: filesList.map((f: string) => this.relativePath(f)).join(', '),
          message: `دالة مشابهة موجودة في ${filesList.length} ملفات`,
          suggestion: 'يُنصح بإنشاء دالة مشتركة'
        });
      }
    });

    return issues;
  }

  private static generateRecommendations(summary: CodeHealthReport['summary']): string[] {
    const recommendations: string[] = [];

    if (summary.largeFiles > 0) {
      recommendations.push(`تم العثور على ${summary.largeFiles} ملف كبير. يُنصح بتقسيمها لتسهيل الصيانة.`);
    }

    if (summary.deprecatedPatterns > 0) {
      recommendations.push(`تم العثور على ${summary.deprecatedPatterns} نمط مهجور. يُنصح بالتحديث للممارسات الحديثة.`);
    }

    if (summary.unusedFiles > 0) {
      recommendations.push(`تم العثور على ${summary.unusedFiles} ملف غير مستخدم محتمل. أزلها لتقليل حجم المشروع.`);
    }

    if (summary.duplicateCode > 0) {
      recommendations.push(`تم العثور على ${summary.duplicateCode} حالة كود مكرر. يُنصح بالدمج في وحدات مشتركة.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('صحة الكود جيدة! لم يتم العثور على مشاكل رئيسية.');
    }

    return recommendations;
  }

  private static async getAllFiles(dirs: string[]): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
              await walk(fullPath);
            }
          } else {
            files.push(fullPath);
          }
        }
      } catch {
        // skip inaccessible dirs
      }
    };

    for (const dir of dirs) {
      if (fsSync.existsSync(dir)) {
        await walk(dir);
      }
    }

    return files;
  }

  private static relativePath(file: string): string {
    return path.relative(process.cwd(), file);
  }
}
