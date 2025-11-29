import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { useAdmin } from "@/hooks/useAdmin";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { PenLine, Keyboard, BookOpen, Timer, Zap, FileDown, Monitor, GraduationCap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, loading: instLoading } = useInstitution();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    // Wait for all loading states to complete
    if (authLoading || instLoading || adminLoading) {
      return;
    }

    // If user is authenticated and has a dashboard (admin or institution member), redirect to dashboard
    if (user) {
      // Master Admin
      if (isAdmin) {
        navigate("/dashboard");
        return;
      }
      
      // Institution member with active membership
      if (activeMembership && activeMembership.status === 'active') {
        navigate("/dashboard");
        return;
      }
      
      // General student (no institution) - stay on home page, no redirect
    }
  }, [user, isAdmin, activeMembership, authLoading, instLoading, adminLoading, navigate]);
  const features = [
    {
      icon: Timer,
      title: "Real Exam Timers",
      description: "Practice with authentic countdown timers for essay writing",
    },
    {
      icon: Zap,
      title: "Live WPM Tracking",
      description: "Monitor your typing speed and word count in real-time",
    },
    {
      icon: FileDown,
      title: "Export Essays",
      description: "Download your completed essays as .docx files",
    },
    {
      icon: BookOpen,
      title: "500+ Vocab Words",
      description: "High-frequency GRE words with TV show examples",
    },
  ];

  const modules = [
    {
      to: "/essay",
      icon: PenLine,
      title: "GRE Essay Practice",
      description: "Full AWA simulation with random topics and timer",
      color: "bg-essay text-essay-foreground",
    },
    {
      to: "/ielts",
      icon: GraduationCap,
      title: "IELTS Writing",
      description: "Task 1 & Task 2 practice with visual questions",
      color: "bg-primary text-primary-foreground",
    },
    {
      to: "/typing",
      icon: Keyboard,
      title: "Typing Practice",
      description: "Improve your typing speed with GRE-style passages",
      color: "bg-typing text-typing-foreground",
    },
    {
      to: "/vocabulary",
      icon: BookOpen,
      title: "Vocabulary Builder",
      description: "Learn high-frequency words with memorable examples",
      color: "bg-vocab text-vocab-foreground",
    },
  ];

  return (
    <PageLayout>
      <TopBar />
      {/* Hero Section */}
      <section className="px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 animate-fade-in">
            Master Your Exams with{" "}
            <span className="text-essay">Real Tools</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up">
            Your all-in-one GRE & IELTS writing, vocabulary, and typing fluency companion. Practice like you test.
          </p>
          <div className="flex flex-wrap gap-4 justify-center animate-slide-up">
            <Button asChild size="lg" className="bg-essay hover:bg-essay/90 text-essay-foreground gap-2">
              <Link to="/essay">
                <PenLine className="h-5 w-5" />
                GRE Practice
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/ielts">
                <GraduationCap className="h-5 w-5" />
                IELTS Practice
              </Link>
            </Button>
          </div>
          
          {/* Desktop notice */}
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
            <Monitor className="h-4 w-4" />
            <span>Best experienced on laptop or desktop</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-12 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-10">
            Everything You Need to Succeed
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-10">
            Choose Your Practice Mode
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module, index) => (
              <Link
                key={index}
                to={module.to}
                className="group module-card flex flex-col items-center text-center hover:scale-[1.02] transition-transform"
              >
                <div className={`w-16 h-16 rounded-2xl ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <module.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{module.title}</h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">
            Synced locally & in cloud — Built by <span className="font-semibold text-foreground">Mithil & Hasti</span>
          </p>
        </div>
      </footer>
    </PageLayout>
  );
};

export default Index;
