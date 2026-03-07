import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useAuth } from "../../hooks/use-auth";
import { canAccessRoute } from "../../utils/roleUtils";
import { navigationItems, getQuickAccessItems, groupNavigationItems, getLocalizedName } from "../../config/navigationConfig";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function MobileShell() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Filter accessible items based on user permissions
  const accessibleItems = navigationItems.filter(item => canAccessRoute(user, item.path));
  
  // Get quick access items (top 4 priority items)
  const quickAccessItems = getQuickAccessItems(accessibleItems);
  
  // Group items for drawer
  const groupedItems = groupNavigationItems(accessibleItems);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const renderNavItem = (item: typeof navigationItems[0], testIdPrefix: string = "") => {
    const Icon = item.icon;
    const isActive = location === item.path;

    return (
      <Link key={item.path} href={item.path}>
        <button
          onClick={() => setIsOpen(false)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
          data-testid={`${testIdPrefix}nav-item-${item.path.replace(/\//g, '-')}`}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{getLocalizedName(item, language)}</span>
        </button>
      </Link>
    );
  };

  const renderGroup = (title: string, items: typeof navigationItems, groupKey: string, testIdPrefix: string) => {
    if (items.length === 0) return null;

    return (
      <div key={groupKey}>
        <Collapsible open={expandedGroups[groupKey]} onOpenChange={() => toggleGroup(groupKey)}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              data-testid={`${testIdPrefix}group-toggle-${groupKey}`}
            >
              <span>{title}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups[groupKey] ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-2">
            {items.map(item => renderNavItem(item, `${testIdPrefix}${groupKey}-`))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <>
      {/* Quick Actions Bar - Fixed Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 shadow-lg">
        <div className="flex items-center justify-around py-2 px-2">
          {/* Hamburger Menu Button */}
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
              <button
                className="flex flex-col items-center p-2 min-w-0 text-gray-600 dark:text-gray-400 hover:text-primary"
                data-testid="mobile-menu-trigger"
              >
                <Menu className="h-5 w-5 mb-1" />
                <span className="text-xs leading-tight">{t('navigation.menu', 'القائمة')}</span>
              </button>
            </DrawerTrigger>

            <DrawerContent className="max-h-[85vh]" data-testid="mobile-drawer">
              <DrawerHeader className="border-b">
                <div className="flex items-center justify-between">
                  <DrawerTitle className="text-xl font-bold">{t('navigation.mainMenu', 'القائمة الرئيسية')}</DrawerTitle>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" data-testid="close-drawer">
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Primary Operations - Always expanded by default */}
                  {groupedItems.primary.length > 0 && (
                    <div>
                      <Collapsible open={expandedGroups.primary !== false} onOpenChange={() => toggleGroup('primary')}>
                        <CollapsibleTrigger asChild>
                          <button
                            className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            data-testid="drawer-group-toggle-primary"
                          >
                            <span>{t('navigation.primaryOperations', 'العمليات الرئيسية')}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups.primary !== false ? 'rotate-180' : ''}`} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 mt-2">
                          {groupedItems.primary.map(item => renderNavItem(item, "drawer-primary-"))}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}

                  {/* Support Functions */}
                  {groupedItems.support.length > 0 && (
                    <>
                      <Separator />
                      {renderGroup(t('navigation.supportOperations', 'الدعم والمتابعة'), groupedItems.support, 'support', 'drawer-')}
                    </>
                  )}

                  {/* Admin Functions */}
                  {groupedItems.admin.length > 0 && (
                    <>
                      <Separator />
                      {renderGroup(t('navigation.adminOperations', 'الإدارة والإعدادات'), groupedItems.admin, 'admin', 'drawer-')}
                    </>
                  )}
                </div>

                {/* Theme & Language */}
                <div className="mt-4 pt-4 border-t">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      {t('dashboard.profile.darkMode', 'الوضع المظلم')}
                    </span>
                    <Button variant="outline" size="sm" onClick={toggleTheme}>
                      {theme === "light" ? t('dashboard.profile.darkMode', 'مظلم') : t('dashboard.profile.lightMode', 'فاتح')}
                    </Button>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('common.language')}
                    </span>
                    <LanguageSwitcher variant="button" size="sm" />
                  </div>
                </div>

                {/* User Info at bottom */}
                {user && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.display_name_ar || user.display_name || user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.role_name_ar || user.role_name || 'مستخدم'}
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </DrawerContent>
          </Drawer>

          {/* Quick Access Buttons (Top 3 items after menu) */}
          {quickAccessItems.slice(0, 3).map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex flex-col items-center p-2 min-w-0 transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-gray-600 dark:text-gray-400 hover:text-primary"
                  }`}
                  data-testid={`quick-action-${item.path.replace(/\//g, '-')}`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs leading-tight truncate max-w-[60px]">
                    {getLocalizedName(item, language)}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
