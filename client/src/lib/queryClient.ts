import {
  QueryClient,
  QueryFunction,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";

// Create a single instance to prevent multiple React contexts
let globalQueryClient: QueryClient | undefined;

function handle401Error() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 errors globally - automatically logout user
    if (res.status === 401) {
      handle401Error();
      // Still throw the error for proper error handling
      const error = new Error("انتهت صلاحية جلستك. جاري إعادة التوجيه...");
      (error as any).status = 401;
      (error as any).statusText = res.statusText;
      throw error;
    }

    let errorMessage = res.statusText || "Unknown error";

    try {
      // Clone the response to avoid consuming the body stream
      const responseClone = res.clone();
      const text = await responseClone.text();

      if (text.trim()) {
        try {
          const errorData = JSON.parse(text);
          errorMessage =
            errorData.message || errorData.error || errorData.detail || text;
        } catch {
          // If JSON parsing fails, use the raw text if it's meaningful
          errorMessage =
            text.length > 200 ? text.substring(0, 200) + "..." : text;
        }
      }
    } catch {
      // If we can't read the response body, use status-based error messages
      errorMessage = getStatusMessage(res.status);
    }

    const error = new Error(`${res.status}: ${errorMessage}`);
    (error as any).status = res.status;
    (error as any).statusText = res.statusText;
    throw error;
  }
}

function getStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "البيانات المُرسلة غير صحيحة. يرجى مراجعة المدخلات.";
    case 401:
      return "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.";
    case 403:
      return "ليس لديك صلاحية للوصول إلى هذا المورد.";
    case 404:
      return "المورد المطلوب غير موجود.";
    case 409:
      return "تعارض في البيانات. قد يكون المورد موجود مسبقاً.";
    case 422:
      return "البيانات غير صالحة. يرجى التحقق من صحة المدخلات.";
    case 429:
      return "طلبات كثيرة جداً. يرجى المحاولة مرة أخرى بعد قليل.";
    case 500:
      return "خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.";
    case 502:
      return "الخدمة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى.";
    case 503:
      return "الخدمة غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.";
    case 504:
      return "انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.";
    default:
      return `خطأ ${status} - حدث خطأ غير متوقع`;
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    timeout?: number;
  },
): Promise<Response> {
  const { method = "GET", body, timeout = 30000 } = options || {};

  try {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    // Handle specific error types with meaningful messages
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "انتهت مهلة الطلب - يرجى المحاولة مرة أخرى",
      );
      (timeoutError as any).type = "timeout";
      throw timeoutError;
    }

    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      const networkError = new Error(
        "خطأ في الشبكة - يرجى التحقق من اتصال الإنترنت",
      );
      (networkError as any).type = "network";
      throw networkError;
    }

    // Re-throw error as-is
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    try {
      // Handle query keys properly - first element is base URL
      let url = queryKey[0] as string;

      // If there are additional query key elements, handle them based on their type
      if (queryKey.length > 1) {
        const remainingSegments = queryKey.slice(1);

        // Check if the last segment is an object (query parameters)
        const lastSegment = remainingSegments[remainingSegments.length - 1];

        if (
          typeof lastSegment === "object" &&
          lastSegment !== null &&
          !Array.isArray(lastSegment)
        ) {
          // Pattern: ['/api/endpoint', ...pathSegments, {queryParams}]
          const pathSegments = remainingSegments.slice(0, -1);
          const queryParams = lastSegment as Record<string, any>;

          // Add path segments to URL
          if (pathSegments.length > 0) {
            const pathParts = pathSegments
              .filter(
                (segment) =>
                  segment !== undefined && segment !== null && segment !== "",
              )
              .map((segment) => encodeURIComponent(String(segment)));
            if (pathParts.length > 0) {
              url += "/" + pathParts.join("/");
            }
          }

          // Add query parameters
          const urlParams = new URLSearchParams();
          Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              urlParams.append(key, String(value));
            }
          });

          const queryString = urlParams.toString();
          if (queryString) {
            url += (url.includes("?") ? "&" : "?") + queryString;
          }
        } else {
          // All remaining segments are path parameters OR this is a special production monitoring case
          // Check if this looks like a production monitoring endpoint that expects query params
          const isProductionEndpoint =
            url.includes("/api/production/") &&
            (url.includes("performance") ||
              url.includes("metrics") ||
              url.includes("utilization"));

          if (isProductionEndpoint && remainingSegments.length === 2) {
            // Special case for production endpoints: ['/api/production/endpoint', dateFrom, dateTo]
            const queryParams = new URLSearchParams();
            queryParams.append("date_from", String(remainingSegments[0]));
            queryParams.append("date_to", String(remainingSegments[1]));
            url += "?" + queryParams.toString();
          } else if (isProductionEndpoint && remainingSegments.length === 3) {
            // Special case: ['/api/production/endpoint', userId, dateFrom, dateTo]
            const queryParams = new URLSearchParams();
            if (
              remainingSegments[0] !== undefined &&
              remainingSegments[0] !== null
            ) {
              queryParams.append("user_id", String(remainingSegments[0]));
            }
            queryParams.append("date_from", String(remainingSegments[1]));
            queryParams.append("date_to", String(remainingSegments[2]));
            url += "?" + queryParams.toString();
          } else {
            // Default behavior: treat as path segments (backward compatibility)
            const pathParts = remainingSegments
              .filter(
                (segment) =>
                  segment !== undefined && segment !== null && segment !== "",
              )
              .map((segment) => encodeURIComponent(String(segment)));
            if (pathParts.length > 0) {
              url += "/" + pathParts.join("/");
            }
          }
        }
      }

      const res = await fetch(url, {
        credentials: "include",
        signal, // Let React Query handle cancellation properly
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);

      // Handle empty responses gracefully
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (res.status === 204) return null; // No Content
        const text = await res.text();
        if (!text.trim()) return null; // Empty response
        throw new Error("Invalid response - expected JSON");
      }

      try {
        const data = await res.json();
        return data;
      } catch (jsonError) {
        throw new Error("Invalid response - malformed data");
      }
    } catch (error: any) {
      // Handle AbortError gracefully during query cancellation
      if (
        error.name === "AbortError" ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        // If signal was aborted, this is normal during component cleanup
        // Create a new error to avoid console logging while preserving cancellation behavior
        const silentAbortError = new Error("Query cancelled");
        (silentAbortError as any).name = "AbortError";
        (silentAbortError as any).silent = true;
        throw silentAbortError;
      }

      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error("خطأ في الشبكة - يرجى التحقق من اتصال الإنترنت");
      }

      // Re-throw all other errors as-is for proper error handling
      throw error;
    }
  };

export function getQueryClient(): QueryClient {
  if (!globalQueryClient) {
    globalQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: getQueryFn({ on401: "throw" }),
          refetchInterval: false,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: "always",
          // Increase staleTime to reduce unnecessary refetches
          staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh longer
          gcTime: 10 * 60 * 1000, // 10 minutes garbage collection - keep data longer
          // Prevent excessive retries that can cause cancellation issues
          retry: (failureCount, error: any) => {
            // Don't retry after 2 attempts (reduced from 3)
            if (failureCount > 1) return false;

            // Never retry AbortError (query cancellation)
            if (error?.name === "AbortError") return false;

            // Don't retry client errors (4xx) - these need user action
            if (error?.status >= 400 && error?.status < 500) return false;

            // Don't retry timeout errors
            if (error?.type === "timeout") return false;

            // Only retry network errors and server errors (5xx) once
            if (error?.type === "network" || error?.status >= 500)
              return failureCount < 1;

            // Don't retry other errors to prevent cascading cancellations
            return false;
          },
          retryDelay: (attemptIndex) =>
            Math.min(2000 * 2 ** attemptIndex, 10000), // Faster exponential backoff, max 10s
          // Disable automatic background refetching that can cause cancellations
          refetchIntervalInBackground: false,
        },
        mutations: {
          retry: (failureCount, error: any) => {
            // Don't retry mutations at all to avoid duplicate operations
            return false;
          },
          // Remove retryDelay for mutations since we're not retrying
        },
      },
      // Add global query error handling with 401 support
      queryCache: new QueryCache({
        onError: (error, query) => {
          // Handle 401 errors globally
          if (error && (error as any).status === 401) {
            console.warn(
              "401 error in query - handling logout:",
              query.queryKey,
            );
            handle401Error();
            return;
          }

          // Completely suppress AbortErrors - no propagation at all
          if (
            error?.name === "AbortError" ||
            (error as any)?.silent ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            // Do not let AbortErrors propagate or log anything - complete silence
            return;
          }
          // Let other errors propagate normally
        },
        onSettled: (data, error, query) => {
          // Additional catch for AbortError at settled phase
          if (
            error?.name === "AbortError" ||
            (error as any)?.silent ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return; // Suppress completely
          }
        },
      }),
      // Add mutation cache error handling with 401 support
      mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          // Handle 401 errors globally in mutations
          if (error && (error as any).status === 401) {
            console.warn(
              "401 error in mutation - handling logout:",
              mutation.options.mutationKey,
            );
            handle401Error();
            return;
          }

          // Silently handle AbortErrors
          if (
            error?.name === "AbortError" ||
            (error as any)?.silent ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            // Silently handle mutation cancellation without any logging
            return;
          }
          // Let other errors propagate normally
        },
      }),
    });
  }
  return globalQueryClient;
}

export const queryClient = getQueryClient();

// Complete AbortError suppression for development - Multiple layers
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (() => {
    // Idempotency guard to prevent duplicate handlers during HMR
    if ((window as any).__rqAbortFilterInstalled) {
      return; // Exit early if already installed
    }
    (window as any).__rqAbortFilterInstalled = true;

    const originalConsoleError = console.error;

    // Enhanced AbortError detection - catch all variations
    const isAbortError = (reason: any) => {
      if (!reason) return false;

      // Direct AbortError name check
      if (reason?.name === "AbortError") return true;

      // Silent error marker
      if (reason?.silent) return true;

      // DOMException AbortError check
      if (reason instanceof DOMException && reason.name === "AbortError")
        return true;

      // Enhanced message-based detection for known AbortError patterns
      if (reason?.message && typeof reason.message === "string") {
        const message = reason.message.toLowerCase();
        return /^(signal is aborted|the user aborted|aborterror|query cancelled|cancelled|aborted)/.test(
          message,
        );
      }

      // Check for React Query specific abort patterns
      if (reason?.toString && typeof reason.toString === "function") {
        const str = reason.toString().toLowerCase();
        return (
          str.includes("abort") &&
          (str.includes("signal") ||
            str.includes("query") ||
            str.includes("cancelled"))
        );
      }

      return false;
    };

    // Enhanced unhandled rejection handler
    window.addEventListener(
      "unhandledrejection",
      (event) => {
        if (isAbortError(event.reason)) {
          event.preventDefault(); // Prevent console logging
          event.stopPropagation(); // Stop further propagation
        }
      },
      { capture: true },
    );

    // Also handle regular error events that might contain AbortErrors
    window.addEventListener(
      "error",
      (event) => {
        if (
          isAbortError(event.error) ||
          (event.message && isAbortError({ message: event.message }))
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true },
    );

    // Enhanced console filtering - suppress all AbortError variations
    console.error = (...args) => {
      // Check if any argument is an AbortError or contains AbortError patterns
      const hasAbortError = args.some((arg) => {
        if (isAbortError(arg)) return true;

        // Check for AbortError in nested objects or strings
        if (
          typeof arg === "string" &&
          /abort.*error|signal.*abort|query.*cancel/i.test(arg)
        ) {
          return true;
        }

        // Check for React Query AbortError patterns
        if (typeof arg === "object" && arg !== null) {
          const str = JSON.stringify(arg).toLowerCase();
          return (
            str.includes("aborterror") ||
            (str.includes("abort") && str.includes("signal"))
          );
        }

        return false;
      });

      if (!hasAbortError) {
        originalConsoleError(...args);
      }
    };
  })();
}
