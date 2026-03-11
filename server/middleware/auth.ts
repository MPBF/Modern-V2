import { Request, Response, NextFunction } from "express";
import { hasPermission, type PermissionKey } from "../../shared/permissions";

export interface AuthRequest extends Request {
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

// Middleware to require authentication
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requirePermission(...permissions: PermissionKey[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userPerms = req.user.permissions || [];
    if (userPerms.includes('admin')) {
      return next();
    }

    const hasRequiredPermission = permissions.some(permission => 
      hasPermission(userPerms, permission)
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: permissions,
        message: "ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء"
      });
    }

    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const userPerms = req.user.permissions || [];
  if (!userPerms.includes('admin')) {
    return res.status(403).json({ 
      error: "Admin access required",
      message: "هذا الإجراء متاح للمسؤولين فقط"
    });
  }

  next();
}