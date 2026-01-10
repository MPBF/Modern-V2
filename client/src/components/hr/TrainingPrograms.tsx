import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { formatNumber, formatPercentage } from "../../lib/formatNumber";
import {
  Play,
  Clock,
  Users,
  CheckCircle,
  BookOpen,
  Plus,
  Calendar,
} from "lucide-react";

interface TrainingProgram {
  id: number;
  title: string;
  title_ar: string;
  description?: string;
  description_ar?: string;
  category: string;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_hours: number;
  max_participants?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface TrainingEnrollment {
  id: number;
  employee_id: number;
  program_id: number;
  enrolled_date: string;
  completion_status: "not_started" | "in_progress" | "completed" | "dropped";
  completion_date?: string;
  score?: number;
  certificate_issued: boolean;
}

export default function TrainingPrograms() {
  const { t } = useTranslation();
  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

  const { data: programs = [], isLoading: programsLoading } = useQuery<
    TrainingProgram[]
  >({
    queryKey: ["/api/hr/training-programs"],
    initialData: [],
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<
    TrainingEnrollment[]
  >({
    queryKey: ["/api/hr/training-enrollments"],
    initialData: [],
  });

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getDifficultyText = (level: string) => {
    switch (level) {
      case "beginner":
        return t("hr.training.beginner");
      case "intermediate":
        return t("hr.training.intermediate");
      case "advanced":
        return t("hr.training.advanced");
      default:
        return level;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "not_started":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "dropped":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("hr.training.completed");
      case "in_progress":
        return t("hr.training.inProgress");
      case "not_started":
        return t("hr.training.notStarted");
      case "dropped":
        return t("hr.training.dropped");
      default:
        return status;
    }
  };

  const getEnrollmentProgress = (programId: number) => {
    const programEnrollments = enrollments.filter(
      (e) => e.program_id === programId,
    );
    if (programEnrollments.length === 0) return 0;

    const completed = programEnrollments.filter(
      (e) => e.completion_status === "completed",
    ).length;
    return Math.round((completed / programEnrollments.length) * 100);
  };

  if (programsLoading || enrollmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("hr.training.loadingPrograms")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("hr.training.title")}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t("hr.training.description")}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 ml-2" />
          {t("hr.training.newProgram")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("hr.training.totalPrograms")}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(programs.length)}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("hr.training.activePrograms")}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(programs.filter((p) => p.is_active).length)}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("hr.training.totalEnrollments")}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(enrollments.length)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("hr.training.completionRate")}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(
                    enrollments.length > 0
                      ? Math.round(
                          (enrollments.filter(
                            (e) => e.completion_status === "completed",
                          ).length /
                            enrollments.length) *
                            100,
                        )
                      : 0,
                  )}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    {program.title_ar || program.title}
                  </CardTitle>
                  <Badge
                    className={getDifficultyColor(program.difficulty_level)}
                  >
                    {getDifficultyText(program.difficulty_level)}
                  </Badge>
                </div>
                <Badge variant={program.is_active ? "default" : "secondary"}>
                  {program.is_active ? t("hr.training.active") : t("hr.training.inactive")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {program.description_ar ||
                  program.description ||
                  t("hr.training.noDescription")}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{program.duration_hours} {t("hr.training.hours")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{program.max_participants || t("hr.training.unlimited")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("hr.training.completionRate")}</span>
                  <span>{getEnrollmentProgress(program.id)}%</span>
                </div>
                <Progress
                  value={getEnrollmentProgress(program.id)}
                  className="h-2"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>
                  {t("hr.training.createdAt")}:{" "}
                  {new Date(program.created_at).toLocaleDateString("ar")}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedProgram(program.id)}
                >
                  {t("hr.training.viewDetails")}
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  {t("hr.training.enrollEmployee")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {programs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("hr.training.noPrograms")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t("hr.training.noProgamsDesc")}
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 ml-2" />
              {t("hr.training.createProgram")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
