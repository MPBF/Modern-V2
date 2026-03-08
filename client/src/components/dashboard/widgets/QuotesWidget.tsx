import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { FileText, DollarSign, Clock, CheckCircle } from "lucide-react";
import { formatNumber } from "../../../lib/formatNumber";

interface Quote {
  id: number;
  quote_number?: string;
  customer_name?: string;
  customer_name_ar?: string;
  total_amount?: number | string;
  status?: string;
  created_at?: string;
}

export default function QuotesWidget() {
  const { t } = useTranslation();

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const quoteList = Array.isArray(quotes) ? quotes : [];
  const recentQuotes = quoteList.slice(0, 5);
  const pendingQuotes = quoteList.filter((q) => q.status === "pending" || q.status === "draft");
  const approvedQuotes = quoteList.filter((q) => q.status === "approved" || q.status === "accepted");

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
      case "accepted":
        return <Badge className="bg-green-100 text-green-800 text-xs">{t("dashboard.widgets.approved", "Approved")}</Badge>;
      case "pending":
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">{t("dashboard.widgets.pending", "Pending")}</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 text-xs">{t("dashboard.widgets.rejected", "Rejected")}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status || "-"}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            {t("dashboard.widgets.quotes", "Quotes")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {formatNumber(quoteList.length)} {t("dashboard.widgets.total", "total")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-yellow-600" />
            </div>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
              {formatNumber(pendingQuotes.length)}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {t("dashboard.widgets.pendingQuotes", "Pending")}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              {formatNumber(approvedQuotes.length)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {t("dashboard.widgets.approvedQuotes", "Approved")}
            </p>
          </div>
        </div>

        {recentQuotes.length > 0 ? (
          <div className="space-y-2">
            {recentQuotes.map((quote) => (
              <div
                key={quote.id}
                className="flex items-center justify-between border rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {quote.quote_number || `#${quote.id}`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {quote.customer_name_ar || quote.customer_name || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {quote.total_amount && (
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {formatNumber(quote.total_amount)}
                    </span>
                  )}
                  {getStatusBadge(quote.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t("dashboard.widgets.noQuotes", "No quotes available")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
