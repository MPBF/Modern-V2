import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const MOBILE_BREAKPOINT = 768;

const MOBILE_ROUTE_MAP: Record<string, string> = {
  "/production-dashboard": "/production-dashboard-mobile",
  "/user-dashboard": "/user-dashboard-mobile",
  "/orders": "/orders-mobile",
  "/warehouse": "/warehouse-mobile",
  "/production": "/production-mobile",
};

const FORCE_DESKTOP_KEY = "mpbf_force_desktop";

export function useForceDesktop() {
  const isForced = sessionStorage.getItem(FORCE_DESKTOP_KEY) === "1";

  const setForceDesktop = (value: boolean) => {
    if (value) {
      sessionStorage.setItem(FORCE_DESKTOP_KEY, "1");
    } else {
      sessionStorage.removeItem(FORCE_DESKTOP_KEY);
    }
  };

  return { isForced, setForceDesktop };
}

export function useMobileRedirect(currentPath: string) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const isMobileDevice = window.innerWidth < MOBILE_BREAKPOINT;
    const forceDesktop = sessionStorage.getItem(FORCE_DESKTOP_KEY) === "1";

    if (isMobileDevice && !forceDesktop) {
      const mobilePath = MOBILE_ROUTE_MAP[currentPath];
      if (mobilePath) {
        setLocation(mobilePath);
      }
    }
  }, [currentPath, setLocation]);
}

export function MobileAutoRedirect({ path }: { path: string }) {
  useMobileRedirect(path);
  return null;
}
