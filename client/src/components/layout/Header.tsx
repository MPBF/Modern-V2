import { useAuth } from "../../hooks/use-auth";
import { NotificationBell } from "../notifications/NotificationBell";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import FactoryLogoPath from "../../../../attached_assets/MPBF11_factory_logo.webp";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

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
