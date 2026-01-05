import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { AlertCircle, ArrowRight, Home } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Link } from "wouter";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t('errors.pageNotFoundTitle')}
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {t('errors.pageNotFoundMessage')}
          </p>

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              data-testid="button-go-back"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              {t('errors.goBack')}
            </Button>
            <Link href="/">
              <Button data-testid="button-go-home">
                <Home className="h-4 w-4 ml-2" />
                {t('errors.goHome')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
