import PageLayout from "../components/layout/PageLayout";
import NotificationCenter from "../components/notifications/NotificationCenter";
import { useTranslation } from 'react-i18next';

export default function NotificationsPage() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        <NotificationCenter />
      </div>
    </PageLayout>
  );
}
