import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  FileText, 
  ClipboardList, 
  Settings, 
  BarChart3,
  Plus,
  Sparkles,
  Eye,
  Users
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import ProtectedRoute from "@/components/routing/ProtectedRoute";

export default function TeacherGrammarDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMembership } = useInstitution();

  // Redirect if not a teacher
  if (!user || !activeMembership || !['teacher', 'inst_admin'].includes(activeMembership.role)) {
    return <ProtectedRoute><div>Access Denied</div></ProtectedRoute>;
  }

  const cards = [
    {
      title: "Grammar Bank",
      description: "View and manage grammar topics and exercises",
      icon: BookOpen,
      onClick: () => navigate("/teacher/grammar/topics"),
      color: "bg-blue-500"
    },
    {
      title: "Create Topic",
      description: "Add a new grammar topic to your institute",
      icon: Plus,
      onClick: () => navigate("/teacher/grammar/topics/new"),
      color: "bg-green-500"
    },
    {
      title: "Quick Add Exercises",
      description: "Quickly add single or multiple exercises",
      icon: FileText,
      onClick: () => navigate("/teacher/grammar/quick-add"),
      color: "bg-purple-500"
    },
    {
      title: "Create Exercises (Bulk)",
      description: "Add custom exercises in bulk with advanced options",
      icon: FileText,
      onClick: () => navigate("/teacher/grammar/exercises/new"),
      color: "bg-indigo-500"
    },
    {
      title: "Assign Grammar",
      description: "Create manual assignments for students",
      icon: ClipboardList,
      onClick: () => navigate("/teacher/grammar/assign"),
      color: "bg-orange-500"
    },
    {
      title: "Daily Practice Settings",
      description: "Configure daily practice for students",
      icon: Settings,
      onClick: () => navigate("/teacher/grammar/daily-settings"),
      color: "bg-teal-500"
    },
    {
      title: "Student Progress",
      description: "View student grammar exercise progress and history",
      icon: Users,
      onClick: () => navigate("/teacher/grammar/student-progress"),
      color: "bg-blue-500"
    },
    {
      title: "ChatGPT Prompt Generator",
      description: "Generate prompts to create exercises with AI",
      icon: Sparkles,
      onClick: () => navigate("/teacher/grammar/prompt-generator"),
      color: "bg-violet-500"
    },
    {
      title: "View All Exercises",
      description: "See and manage all grammar exercises",
      icon: Eye,
      onClick: () => navigate("/teacher/grammar/exercises"),
      color: "bg-slate-500"
    },
    {
      title: "Student Progress",
      description: "View student grammar exercise progress and history",
      icon: Users,
      onClick: () => navigate("/teacher/grammar/student-progress"),
      color: "bg-blue-500"
    }
  ];

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold mb-2">Grammar Management</h1>
          <p className="text-muted-foreground">Manage grammar topics, exercises, and student assignments</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={card.onClick}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${card.color} text-white`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </div>
                <CardDescription className="mt-2">
                  {card.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

