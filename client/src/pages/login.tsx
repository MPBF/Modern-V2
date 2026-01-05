import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { useToast } from "../hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Factory } from "lucide-react";
import { useTranslation } from 'react-i18next';
import FactoryLogoPath from "../../../attached_assets/FactoryLogoHPNGW.png";

export default function Login() {
  const { t } = useTranslation();
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const loginSchema = z.object({
    username: z
      .string()
      .min(1, t('auth.usernameRequired'))
      .min(3, t('auth.usernameMinLength')),
    password: z
      .string()
      .min(1, t('auth.passwordRequired'))
      .min(6, t('auth.passwordMinLength')),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.username, values.password);
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });
    } catch (error) {
      let errorMessage = t('auth.unexpectedError');

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (
        errorMessage.includes("Network error") ||
        errorMessage.includes("Failed to fetch")
      ) {
        errorMessage = t('auth.networkError');
      }

      toast({
        title: t('auth.loginError'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center">
            <img 
              src={FactoryLogoPath} 
              alt={t('auth.factoryLogoAlt')} 
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">{t('auth.systemTitle')}</CardTitle>
          <p className="text-muted-foreground">
            {t('auth.systemDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.username')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.enterUsername')}
                        className="text-right"
                        disabled={isLoading}
                        data-testid="input-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('auth.enterPassword')}
                        className="text-right"
                        disabled={isLoading}
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full btn-primary"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? t('auth.loggingIn') : t('auth.login')}
              </Button>
            </form>
          </Form>

          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.or')}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/login-replit";
              }}
              data-testid="button-login-replit"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M2 2v20h20V2H2zm18 18H4V4h16v16z"/>
              </svg>
              {t('auth.loginWithReplit')}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              {t('auth.copyright')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
