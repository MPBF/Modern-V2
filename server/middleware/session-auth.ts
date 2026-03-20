import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storage } from "../storage";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: number;
      email: string;
      name: string;
      role: string;
      role_id: number;
      department?: string | null;
      status: string;
      permissions?: string[];
    };
  }
}

const mobileTokens = new Map<string, { userId: number; createdAt: number }>();

const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const ROLES_CACHE_TTL_MS = 60 * 1000;
let rolesCache: { data: any[] | null; fetchedAt: number } = { data: null, fetchedAt: 0 };

export async function getCachedRoles() {
  const now = Date.now();
  if (rolesCache.data && now - rolesCache.fetchedAt < ROLES_CACHE_TTL_MS) {
    return rolesCache.data;
  }
  const roles = await storage.getRoles();
  rolesCache = { data: roles, fetchedAt: now };
  return roles;
}

export function invalidateRolesCache() {
  rolesCache = { data: null, fetchedAt: 0 };
}

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, entry] of mobileTokens) {
    if (now - entry.createdAt > TOKEN_EXPIRY_MS) {
      mobileTokens.delete(token);
    }
  }
}

setInterval(cleanupExpiredTokens, TOKEN_CLEANUP_INTERVAL_MS);

export function generateMobileToken(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  mobileTokens.set(token, { userId, createdAt: Date.now() });
  return token;
}

export function revokeMobileToken(token: string): void {
  mobileTokens.delete(token);
}

function getUserIdFromToken(token: string): number | null {
  const entry = mobileTokens.get(token);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TOKEN_EXPIRY_MS) {
    mobileTokens.delete(token);
    return null;
  }
  return entry.userId;
}

// Middleware to populate req.user from session
export async function populateUserFromSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const userId = getUserIdFromToken(token);
    if (userId) {
      try {
        const user = await resolveUserById(userId);
        if (user) {
          req.user = user;
        }
      } catch (e) {
        // continue without user
      }
      return next();
    }
  }

  // Skip if no session or no userId in session
  if (!req.session?.userId) {
    return next();
  }

  try {
    const resolvedUser = await resolveUserById(req.session.userId);
    
    if (!resolvedUser) {
      if (req.session?.destroy) {
        req.session.destroy((err) => {
          if (err) console.error("Error destroying invalid session:", err);
        });
      }
      return next();
    }

    req.user = resolvedUser;
    next();
  } catch (error) {
    console.error("Error populating user from session:", error);
    next();
  }
}

async function resolveUserById(userId: number) {
  const user = await storage.getUserById(userId);
  if (!user || user.status !== "active") return null;

  let permissions: string[] = [];
  let roleName = "user";

  if (user.role_id) {
    const roles = await getCachedRoles();
    const userRole = roles.find(r => r.id === user.role_id);

    if (userRole) {
      roleName = userRole.name || "user";
      if (userRole.permissions) {
        try {
          if (Array.isArray(userRole.permissions)) {
            permissions = userRole.permissions;
          } else if (typeof userRole.permissions === 'string') {
            const parsed = JSON.parse(userRole.permissions);
            permissions = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          if (typeof userRole.permissions === 'string' && (userRole.permissions as string).trim()) {
            permissions = [(userRole.permissions as string).trim()];
          } else {
            permissions = [];
          }
        }
      }
    }
  }

  if (roleName.toLowerCase() === 'admin' && !permissions.includes('admin')) {
    permissions.push('admin');
  }

  return {
    id: user.id,
    email: user.email || "",
    name: user.display_name || user.username || "",
    role: roleName,
    role_id: user.role_id || 0,
    department: user.section_id ? String(user.section_id) : null,
    status: user.status || "active",
    permissions
  };
}