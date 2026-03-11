import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend the Express Request to include user data
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

// Middleware to populate req.user from session
export async function populateUserFromSession(req: Request, res: Response, next: NextFunction) {
  // Skip if no session or no userId in session
  if (!req.session?.userId) {
    return next();
  }

  try {
    // Get user from database using session userId
    const user = await storage.getUserById(req.session.userId);
    
    if (!user) {
      // User doesn't exist, clear invalid session
      if (req.session?.destroy) {
        req.session.destroy((err) => {
          if (err) console.error("Error destroying invalid session:", err);
        });
      }
      return next();
    }

    // Check if user is active
    if (user.status !== "active") {
      return next();
    }

    // Get role and permissions
    let permissions: string[] = [];
    let roleName = "user";
    
    if (user.role_id) {
      // Get all roles and find the matching one
      const roles = await storage.getRoles();
      const userRole = roles.find(r => r.id === user.role_id);
      
      if (userRole) {
        roleName = userRole.name || "user";
        if (userRole.permissions) {
          try {
            // Check if permissions is already an array (shouldn't be, but just in case)
            if (Array.isArray(userRole.permissions)) {
              permissions = userRole.permissions;
            } else if (typeof userRole.permissions === 'string') {
              // Try to parse as JSON
              const parsed = JSON.parse(userRole.permissions);
              // Ensure it's an array
              permissions = Array.isArray(parsed) ? parsed : [];
            }
          } catch (e) {
            // If parsing fails, check if it's a single permission string
            if (typeof userRole.permissions === 'string' && (userRole.permissions as string).trim()) {
              // Legacy single permission string (e.g., "production")
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

    req.user = {
      id: user.id,
      email: user.email || "",
      name: user.display_name || user.username || "",
      role: roleName,
      role_id: user.role_id || 0,
      department: user.section_id ? String(user.section_id) : null,
      status: user.status || "active",
      permissions
    };

    next();
  } catch (error) {
    console.error("Error populating user from session:", error);
    // Continue without user data on error
    next();
  }
}