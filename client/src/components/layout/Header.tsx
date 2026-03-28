import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";
import { NotificationBell } from "../notifications/NotificationBell";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import FactoryLogoPath from "../../../../attached_assets/MPBF11_factory_logo.webp";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon, Smartphone, Factory, ClipboardList, User, Warehouse } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 pt-[0px] pb-[0px] font-bold">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-lg overflow-hidden">
            <img
              src={FactoryLogoPath}
              alt={t('header.factoryLogo')}
              className="w-full h-full object-contain mt-[0px] mb-[0px] pt-[0px] pb-[0px]"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">MPBF Production System</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('common.appName')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === "light" ? t('dashboard.profile.darkMode', 'الوضع المظلم') : t('dashboard.profile.lightMode', 'الوضع الفاتح')}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <LanguageSwitcher variant="dropdown" size="sm" />
          <NotificationBell />

          <MobileMenuButton />

          <div className="flex items-center gap-3">
            <div className={`${isRTL ? 'text-right' : 'text-left'} hidden sm:block`}>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.display_name_ar || user?.display_name || user?.username}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {user?.role_name_ar || user?.role_name || t('header.defaultRole')}
              </p>
            </div>
            <button
              onClick={logout}
              className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {(
                user?.display_name_ar ||
                user?.display_name ||
                user?.username ||
                t('header.defaultInitial')
              ).charAt(0)}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileMenuButton() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const mobilePages = [
    { path: "/user-dashboard-mobile", label: t('header.mobile.userDashboard', 'لوحتي'), icon: User, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
    { path: "/production-mobile", label: t('header.mobile.production', 'لوحة الإنتاج'), icon: Factory, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
    { path: "/orders-mobile", label: t('header.mobile.orders', 'إدارة الطلبات'), icon: ClipboardList, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30" },
    { path: "/warehouse-mobile", label: t('header.mobile.warehouse', 'المستودع'), icon: Warehouse, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${open ? 'bg-primary text-primary-foreground' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        title={t('header.mobile.title', 'نسخة الموبايل')}
      >
        <Smartphone className="h-5 w-5" />
      </button>

      {open && (
        <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('header.mobile.title', 'نسخة الموبايل')}</p>
          </div>
          <div className="p-1.5">
            {mobilePages.map((page) => {
              const Icon = page.icon;
              return (
                <a
                  key={page.path}
                  href={page.path}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${page.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{page.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
