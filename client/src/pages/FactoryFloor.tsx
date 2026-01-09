import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import FactoryFloorMap from "../components/factory/FactoryFloorMap";

export default function FactoryFloor() {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("factory.title", "خريطة المصنع")}
      description={t("factory.description", "عرض تفاعلي لأرضية المصنع وحالة الماكينات")}
    >
      <FactoryFloorMap />
    </PageLayout>
  );
}
