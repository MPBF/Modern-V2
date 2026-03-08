import { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileShell from "./MobileShell";
import { useLanguage } from "../../contexts/LanguageContext";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
}

export default function PageLayout({ children, title, description, className = "", actions }: PageLayoutProps) {
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="flex">
        <Sidebar />
        <MobileShell />

        <main className={`flex-1 p-4 pb-24 lg:pb-4 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} ${className}`}>
          {(title || description || actions) && (
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="flex-shrink-0">{actions}</div>}
            </div>
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
}
