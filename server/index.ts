import http from "http";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import { setupVite, serveStatic, log } from "./vite";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import { populateUserFromSession } from "./middleware/session-auth";
import { performanceMonitor } from "./middleware/performance-monitor";
import { MemoryMonitor } from "./middleware/memory-monitor";
import monitoringRoutes from "./routes/monitoring";

process.on("uncaughtException", (err) => {
  try {
    console.error("Uncaught exception:", err?.message || String(err));
  } catch {
    console.error("Uncaught exception (unformattable)");
  }
});

process.on("unhandledRejection", (reason) => {
  try {
    console.error("Unhandled rejection:", reason instanceof Error ? reason.message : String(reason));
  } catch {
    console.error("Unhandled rejection (unformattable)");
  }
});

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!(app as any).__routesReady) {
    if (req.path === "/api/health") {
      return res.status(200).send("OK");
    }
    if (!req.path.startsWith("/api/")) {
      return res.status(200).send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Cairo,system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fafafa}.s{width:2rem;height:2rem;border:2px solid #f3f4f6;border-radius:50%;border-top-color:#3984f6;animation:r 1s ease-in-out infinite;margin:0 auto 1rem}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><div style="text-align:center"><div class="s"></div><p style="font-size:.875rem;color:#6b7280">جاري تحميل النظام...</p></div><script>setTimeout(()=>location.reload(),2000)</script></body></html>`);
    }
  }
  next();
});

if (process.env.NODE_ENV === "production") {
  const port = parseInt(process.env.PORT || "5000", 10);
  const earlyServer = http.createServer(app);
  earlyServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`early server listening on port ${port} for healthcheck`);
  });
  (app as any).__earlyServer = earlyServer;
}

// Enable gzip/br compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

const publicRoot = path.resolve(import.meta.dirname, "..", "public");
const distPublic = path.resolve(import.meta.dirname, "public");

function resolvePublicFile(filename: string): string | null {
  const rootPath = path.resolve(publicRoot, filename);
  if (fs.existsSync(rootPath)) return rootPath;
  const distPath = path.resolve(distPublic, filename);
  if (fs.existsSync(distPath)) return distPath;
  return null;
}

app.get("/sw.js", (_req, res) => {
  const swPath = resolvePublicFile("sw.js");
  if (swPath) {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(swPath);
  } else {
    res.status(404).send("Not found");
  }
});
app.get("/manifest.json", (_req, res) => {
  const manifestPath = resolvePublicFile("manifest.json");
  if (manifestPath) {
    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(manifestPath);
  } else {
    res.status(404).send("Not found");
  }
});
const iconsRoot = path.resolve(publicRoot, "icons");
const iconsDist = path.resolve(distPublic, "icons");
app.use("/icons", express.static(fs.existsSync(iconsRoot) ? iconsRoot : iconsDist));
app.get("/favicon-32x32.png", (_req, res) => {
  res.sendFile(path.resolve(import.meta.dirname, "..", "public", "favicon-32x32.png"));
});
app.get("/favicon-16x16.png", (_req, res) => {
  res.sendFile(path.resolve(import.meta.dirname, "..", "public", "favicon-16x16.png"));
});

// Security function to check for plaintext passwords
async function performPasswordSecurityCheck(): Promise<void> {
  try {
    // Check for security bypass flag (emergency use only)
    if (process.env.SKIP_SECURITY_CHECK === "true") {
      console.warn("⚠️ SECURITY CHECK BYPASSED via environment variable");
      return;
    }

    // Fetch all users to check their passwords
    const allUsers = await db.select().from(users);

    let plaintextPasswordsFound = 0;
    const problematicUserIds: number[] = [];

    for (const user of allUsers) {
      if (!user.password) continue;

      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      const isHashedPassword =
        user.password.startsWith("$2a$") ||
        user.password.startsWith("$2b$") ||
        user.password.startsWith("$2y$");

      if (!isHashedPassword) {
        plaintextPasswordsFound++;
        problematicUserIds.push(user.id);
        console.error(
          `🚨 SECURITY ALERT: User ${user.id} (${user.username}) has plaintext password!`,
        );
      }
    }

    if (plaintextPasswordsFound > 0) {
      console.warn(
        `⚠️ SECURITY: Found ${plaintextPasswordsFound} user(s) with plaintext passwords. Auto-hashing...`,
      );
      console.warn(`⚠️ Affected user IDs: [${problematicUserIds.join(", ")}]`);

      for (const user of allUsers) {
        if (!user.password) continue;
        const isHashed =
          user.password.startsWith("$2a$") ||
          user.password.startsWith("$2b$") ||
          user.password.startsWith("$2y$");
        if (!isHashed) {
          try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await db
              .update(users)
              .set({ password: hashedPassword })
              .where(sql`${users.id} = ${user.id}`);
            console.log(`✅ Auto-hashed password for user ${user.id} (${user.username})`);
          } catch (hashErr) {
            console.error(`❌ Failed to hash password for user ${user.id}:`, hashErr);
          }
        }
      }
      console.log(`✅ Password auto-hashing completed`);
    } else {
      console.log(
        `✅ Password security check passed: All ${allUsers.length} user passwords are properly hashed`,
      );
    }
  } catch (error) {
    console.error("❌ Password security check failed:", error);

    if (app.get("env") === "production") {
      console.error(
        "🚨 Production security check failure - shutting down for safety",
      );
      process.exit(1);
    } else {
      console.warn(
        "⚠️ Development mode: continuing despite security check failure",
      );
    }
  }
}

// Configure CORS with strict allowlist - must be before session middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Strict allowlist of trusted origins
  const allowedOrigins = [
    "http://localhost:5000",
    "https://localhost:5000",
    "http://127.0.0.1:5000",
    "https://127.0.0.1:5000",
    "http://localhost:8081",
    "http://localhost:19006",
    "exp://localhost:8081",
  ];

  // Add current host for same-origin requests
  const currentHost = req.get("host");
  if (currentHost) {
    allowedOrigins.push(`http://${currentHost}`);
    allowedOrigins.push(`https://${currentHost}`);
  }

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    res.header(
      "Access-Control-Allow-Origin",
      currentHost ? `https://${currentHost}` : "https://localhost:5000",
    );
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,OPTIONS,PATCH",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Cookie, Set-Cookie",
  );
  res.header("Access-Control-Expose-Headers", "Set-Cookie");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Configure Express to trust proxy for correct session handling in production
app.set("trust proxy", 1);

// Configure session store with security validation
const isProduction = process.env.NODE_ENV === "production";

// Security validation: Require SESSION_SECRET in production
if (isProduction && !process.env.SESSION_SECRET) {
  console.error(
    "🚨 SECURITY ERROR: SESSION_SECRET environment variable is required in production",
  );
  console.error("🚨 Please set SESSION_SECRET to a secure random value");
  process.exit(1);
}

// Configure PostgreSQL session store for all environments to prevent session loss during restarts
const PgSession = connectPgSimple(session);
const sessionStore = new PgSession({
  pool: pool,
  tableName: "user_sessions",
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15, // Clean expired sessions every 15 minutes
});
console.log(
  `✅ Using PostgreSQL session store for ${isProduction ? "production" : "development"} - sessions will persist across server restarts`,
);

app.use(
  session({
    store: sessionStore,
    secret:
      process.env.SESSION_SECRET ||
      (isProduction
        ? (() => {
            console.error("🚨 CRITICAL: SESSION_SECRET missing in production");
            process.exit(1);
          })()
        : "dev-secret-key-not-for-production"),
    resave: true, // Force session persistence - ensures PostgreSQL session store reliability
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Reset expiry on activity - crucial for keeping session alive
    cookie: {
      secure: "auto", // Let Express determine security based on connection
      httpOnly: true, // ALWAYS prevent XSS - critical security fix
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days - extended session duration for better user experience
      sameSite: "lax", // Better balance for same-origin requests
    },
    name: "plastic-bag-session", // Custom session name
    unset: "keep", // Keep the session even if we unset properties
  }),
);

// Apply session authentication middleware - populate req.user from session
app.use(populateUserFromSession);

// 📊 Performance monitoring middleware - tracks API response times and resource usage
app.use(performanceMonitor);

// Session extension middleware - extends session on any API call with enhanced reliability
app.use((req, res, next) => {
  // For API requests, extend the session if it exists
  if (req.path.startsWith("/api") && req.session) {
    // Check if session has userId (authenticated session)
    if (req.session.userId) {
      // Touch the session to reset expiry with rolling sessions
      req.session.touch();

      // Force save session for PostgreSQL reliability (non-blocking)
      req.session.save((err: any) => {
        if (err && !isProduction) {
          console.warn(`Session save warning on ${req.path}:`, err);
        }
      });

      // Log session extension for debugging (only in development)
      if (!isProduction && req.path !== "/api/me") {
        console.log(
          `🔄 Session extended for user ${req.session.userId} on ${req.path}`,
        );
      }
    } else if (
      !req.user &&
      req.path !== "/api/login" &&
      req.path !== "/api/me" &&
      req.path !== "/api/health" &&
      !req.path.startsWith("/api/mobile/") &&
      !req.path.startsWith("/api/notifications/webhook/") &&
      !req.path.startsWith("/api/display/")
    ) {
      if (!isProduction) {
        console.log(`⚠️ Unauthenticated API request: ${req.path}`);
      }
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    // Skip logging spam HEAD requests to /api (likely from browser extensions/dev tools)
    if (req.method === "HEAD" && path === "/api") {
      return;
    }

    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Security: Only log response metadata in production, never response bodies
      // Response bodies may contain sensitive data like passwords, tokens, PII
      if (!isProduction && capturedJsonResponse) {
        // In development, sanitize sensitive fields before logging
        const sanitizedResponse =
          sanitizeResponseForLogging(capturedJsonResponse);
        if (Object.keys(sanitizedResponse).length > 0) {
          logLine += ` :: ${JSON.stringify(sanitizedResponse)}`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Security function to sanitize response data for logging
function sanitizeResponseForLogging(response: any): any {
  if (!response || typeof response !== "object") {
    return {};
  }

  // Handle arrays at the top level
  if (Array.isArray(response)) {
    return { data: `[Array:${response.length}]` };
  }

  // List of sensitive field patterns to exclude from logs
  const sensitiveFields = [
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "key",
    "auth",
    "session",
    "cookie",
    "authorization",
    "credential",
    "private",
    "ssn",
    "social",
    "email",
    "phone",
    "address",
    "ip",
    "personal",
    "card",
    "payment",
    "billing",
    "account",
    "user_id",
    "userId",
  ];

  const sanitized: any = {};

  for (const [key, value] of Object.entries(response)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveFields.some((field) =>
      keyLower.includes(field),
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (Array.isArray(value)) {
      sanitized[key] = `[Array:${value.length}]`;
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = "[Object]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

(async () => {
  const earlyServer = (app as any).__earlyServer || null;

  let devServer: import("http").Server | null = null;
  if (app.get("env") !== "production") {
    const http = await import("http");
    devServer = http.createServer(app);
    const port = parseInt(process.env.PORT || "5000", 10);
    await new Promise<void>((resolve) => {
      devServer!.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
        resolve();
      });
    });

    const altPort = 8000;
    const altServer = http.createServer(app);
    altServer.on("error", () => {});
    altServer.listen(altPort, "0.0.0.0", () => {
      log(`also serving on port ${altPort}`);
    });
  }

  // Enhanced database initialization for production deployment
  if (app.get("env") === "production") {
    try {
      console.log("🚀 Initializing production database...");

      const { db } = await import("./db.js");

      // Step 1: Test database connection first
      try {
        await db.execute(sql`SELECT 1 as test`);
        console.log("✅ Database connection verified");
      } catch (connectionError: any) {
        console.error(
          "❌ Database connection failed:",
          connectionError?.message || connectionError,
        );

        // Provide specific guidance based on error type
        if (connectionError?.message?.includes("connect")) {
          console.error(
            "💡 Connection issue - check DATABASE_URL configuration",
          );
        } else if (connectionError?.message?.includes("timeout")) {
          console.error(
            "💡 Timeout - database may be overloaded or network issue",
          );
        } else if (connectionError?.message?.includes("auth")) {
          console.error(
            "💡 Authentication failed - verify database credentials",
          );
        }

        throw connectionError;
      }

      // Step 2: Check existing schema and handle table conflicts
      const tableCheck = await db.execute(sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const existingTables = tableCheck.rows.map((row) => row.table_name);
      const isNewDatabase = existingTables.length === 0;

      console.log(
        `📊 Database status: ${isNewDatabase ? "Fresh (new)" : `Existing (${existingTables.length} tables)`}`,
      );

      if (!isNewDatabase) {
        // Log existing tables for debugging
        console.log(
          "📋 Existing tables:",
          existingTables.slice(0, 10).join(", ") +
            (existingTables.length > 10
              ? ` ... and ${existingTables.length - 10} more`
              : ""),
        );

        // Check for specific tables that might cause conflicts
        const criticalTables = [
          "admin_decisions",
          "users",
          "customers",
          "orders",
        ];
        const conflictingTables = criticalTables.filter((table) =>
          existingTables.includes(table),
        );

        if (conflictingTables.length > 0) {
          console.log(
            "🔍 Found existing critical tables:",
            conflictingTables.join(", "),
          );
          console.log(
            "⚠️  Will handle potential schema conflicts carefully...",
          );
        }
      }

      // Step 3: Try primary migration approach first
      try {
        const { migrate } = await import(
          "drizzle-orm/neon-serverless/migrator"
        );
        await migrate(db, { migrationsFolder: "./migrations" });
        console.log("✅ Database migrations completed via migrate()");
      } catch (migrationError: any) {
        console.log(
          "⚠️ Standard migration failed, trying alternative approaches...",
        );
        console.log(
          "Migration error:",
          migrationError?.message || migrationError,
        );

        // Step 4: Handle specific migration errors
        if (migrationError?.message?.includes("admin_decisions")) {
          console.log(
            "🔧 Detected admin_decisions table conflict, applying specific fixes...",
          );

          try {
            // Try to handle admin_decisions table conflicts specifically
            const adminTableExists = await db.execute(sql`
              SELECT table_name FROM information_schema.tables 
              WHERE table_name = 'admin_decisions' AND table_schema = 'public'
            `);

            if (adminTableExists.rows.length > 0) {
              console.log(
                "📋 admin_decisions table exists, checking for missing columns...",
              );

              // Check for required columns and add if missing
              const ALLOWED_COLUMN_TYPES = new Set(["VARCHAR(100)", "VARCHAR(20)"]);
              const requiredColumns = [
                { name: "title_ar", type: "VARCHAR(100)" },
                { name: "issued_by", type: "VARCHAR(20)" },
              ];

              for (const col of requiredColumns) {
                try {
                  if (!ALLOWED_COLUMN_TYPES.has(col.type)) {
                    throw new Error(`Invalid column type: ${col.type}`);
                  }
                  const columnExists = await db.execute(sql`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'admin_decisions' 
                    AND column_name = ${col.name} 
                    AND table_schema = 'public'
                  `);

                  if (columnExists.rows.length === 0) {
                    await db.execute(
                      sql`ALTER TABLE admin_decisions ADD COLUMN ${sql.identifier(col.name)} ${sql.raw(col.type)}`,
                    );
                    console.log(
                      `✅ Added missing column admin_decisions.${col.name}`,
                    );
                  }
                } catch (columnError: any) {
                  console.log(
                    `⚠️  Could not add column ${col.name}: ${columnError?.message}`,
                  );
                }
              }
            }
          } catch (tableFixError: any) {
            console.log(
              "⚠️  Could not fix admin_decisions table:",
              tableFixError?.message,
            );
          }
        }

        // Step 5: Alternative approach - implement real fallback for fresh database
        if (isNewDatabase) {
          console.log(
            "🆕 Fresh database detected - attempting schema creation via drizzle-kit push",
          );

          try {
            // Import child_process for executing drizzle-kit
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            console.log("📋 Running drizzle-kit push to create schema...");
            const pushResult = await execAsync("npx drizzle-kit push --force", {
              env: { ...process.env, NODE_ENV: "production" },
              timeout: 60000, // 60 second timeout
            });

            console.log("✅ Schema created successfully via drizzle-kit push");
            if (pushResult.stdout) {
              console.log("   Output:", pushResult.stdout.substring(0, 200));
            }

            // Verify schema creation
            const verifyTableCheck = await db.execute(sql`
              SELECT COUNT(*) as table_count
              FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);

            const newTableCount = parseInt(
              String(verifyTableCheck.rows[0].table_count),
            );
            console.log(
              `✅ Schema verification: ${newTableCount} tables created`,
            );

            if (newTableCount === 0) {
              console.error(
                "❌ Schema creation failed - no tables were created",
              );
              console.error(
                "🚨 CRITICAL: Cannot start application without database schema",
              );
              console.error(
                "💡 Manual intervention required - check DATABASE_URL and permissions",
              );
              process.exit(1);
            }
          } catch (pushError: any) {
            console.error(
              "❌ Schema creation via drizzle-kit failed:",
              pushError?.message,
            );
            console.error("🚨 CRITICAL: Fresh database cannot be initialized");
            console.error("💡 This may be due to:");
            console.error("   - Missing drizzle-kit package");
            console.error("   - Database permission issues");
            console.error("   - Network connectivity problems");
            console.error("   - Invalid DATABASE_URL configuration");

            // For fresh database, we cannot continue without schema
            process.exit(1);
          }
        } else {
          console.log("🔄 Existing database - checking table accessibility...");

          // Test critical table access and fail fast if missing
          const criticalChecks = [
            {
              table: "users",
              description: "User authentication",
              required: true,
            },
            {
              table: "customers",
              description: "Customer management",
              required: false,
            },
            {
              table: "orders",
              description: "Order processing",
              required: false,
            },
          ];

          let criticalFailures = 0;

          for (const check of criticalChecks) {
            try {
              await db.execute(
                sql`SELECT 1 FROM ${sql.identifier(check.table)} LIMIT 1`,
              );
              console.log(`✅ ${check.description} table accessible`);
            } catch (tableError: any) {
              const errorMsg = tableError?.message?.substring(0, 100);
              console.log(`⚠️  ${check.description} table issue: ${errorMsg}`);

              if (
                check.required &&
                tableError?.message?.includes("does not exist")
              ) {
                criticalFailures++;
                console.error(
                  `🚨 CRITICAL: Required table '${check.table}' is missing`,
                );
              }
            }
          }

          // Fail fast if critical tables are missing
          if (criticalFailures > 0) {
            console.error(
              `❌ Database schema is incomplete: ${criticalFailures} critical table(s) missing`,
            );
            console.error(
              "🚨 CRITICAL: Cannot start application with incomplete schema",
            );
            console.error(
              "💡 This indicates a partial migration or corrupted database",
            );
            console.error("📋 Required actions:");
            console.error("   1. Run database migration scripts manually");
            console.error("   2. Check deployment logs for migration failures");
            console.error(
              "   3. Verify DATABASE_URL points to correct database",
            );
            console.error("   4. Consider restoring from backup if available");

            process.exit(1);
          }
        }
      }
    } catch (error: any) {
      console.error(
        "❌ Database initialization failed:",
        error?.message || error,
      );

      // Enhanced error diagnostics
      if (error?.message?.includes("ENOTFOUND")) {
        console.error("💡 DNS resolution failed - check DATABASE_URL hostname");
      } else if (error?.message?.includes("ECONNREFUSED")) {
        console.error("💡 Connection refused - database server may be down");
      } else if (
        error?.message?.includes("relation") &&
        error?.message?.includes("does not exist")
      ) {
        console.error("💡 Table missing - this is normal for fresh deployment");
      } else if (error?.message?.includes("permission denied")) {
        console.error("💡 Permission denied - check database user privileges");
      } else if (error?.message?.includes("syntax error")) {
        console.error("💡 SQL syntax error - check migration files");
      }

      console.error(
        "🔄 Continuing with server startup - database will be retried on first request",
      );
      console.error(
        "📚 For persistent issues, check the deployment logs and database status",
      );

      // Don't exit - let the server start and handle database issues gracefully
    }
  }

  // Security check: Verify no plaintext passwords remain
  await performPasswordSecurityCheck();

  // API-specific middleware to ensure JSON responses (MUST be before routes)
  app.use("/api/*", (req: Request, res: Response, next: NextFunction) => {
    // Set JSON content type for all API responses
    res.setHeader("Content-Type", "application/json");
    next();
  });

  // 📊 Start memory monitoring
  MemoryMonitor.startMonitoring(30000); // Every 30 seconds

  // 🔧 Register monitoring routes
  app.use(monitoringRoutes);

  const { registerRoutes } = await import("./routes");
  const server = await registerRoutes(app, devServer || earlyServer || undefined);

  // 404 handler for unmatched API routes (MUST be after routes)
  app.use("/api/*", (req: Request, res: Response, next: NextFunction) => {
    // If no route matched, send 404 JSON response instead of falling through to HTML
    if (!res.headersSent) {
      return res.status(404).json({ message: "API endpoint not found" });
    }
    next();
  });

  // Error handling middleware for API routes (MUST be after routes)
  app.use(
    "/api/*",
    (err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Ensure we always return JSON for API routes
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
      console.error("API Error:", err);
    },
  );

  // General error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("Unhandled error:", err);
    res.status(status).json({ message: "حدث خطأ في الخادم" });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
    (app as any).__routesReady = true;
    log(`development server fully initialized`);
  } else if (app.get("env") === "production" && earlyServer) {
    serveStatic(app);
    (app as any).__routesReady = true;
    log(`production server fully initialized`);
  } else {
    serveStatic(app);
    (app as any).__routesReady = true;
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  }
})();