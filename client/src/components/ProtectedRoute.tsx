import { useAuth } from "../hooks/use-auth";
import { canAccessRoute } from "../utils/roleUtils";
import { Redirect, Link } from "wouter";
import { LogOut } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

export default function ProtectedRoute({ children, path }: ProtectedRouteProps) {
  const { user, isLoading, logout } = useAuth();

  // Wait for auth to load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Check if user has permission to access this route
  if (!canAccessRoute(user, path)) {
    const handleLogout = async () => {
      await logout();
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <div className="text-2xl font-bold text-red-600 mb-4">غير مصرح</div>
          <div className="text-lg text-gray-600 mb-6">
            ليس لديك الصلاحيات اللازمة للوصول لهذه الصفحة
          </div>
          
          <div className="border-t pt-4 mb-4">
            <p className="text-sm text-gray-500 mb-2">
              المستخدم الحالي: <strong>{user.display_name_ar || user.display_name || user.username}</strong>
            </p>
            <p className="text-sm text-gray-500">
              الدور: <strong>{user.role_name_ar || user.role_name || 'غير محدد'}</strong>
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              العودة للصفحة الرئيسية
            </Link>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج وتغيير المستخدم
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User has permission, render the page
  return <>{children}</>;
}