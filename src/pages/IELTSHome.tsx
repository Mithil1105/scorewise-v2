import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Clock, Download, Target, Monitor } from "lucide-react";

const IELTSHome = () => {
  const features = [
    {
      icon: Clock,
      title: "Real IELTS Timers",
      description: "20 min for Task 1, 40 min for Task 2",
    },
    {
      icon: BarChart3,
      title: "Visual Questions",
      description: "Charts, graphs, maps & process diagrams",
    },
    {
      icon: Target,
      title: "Word Count Alerts",
      description: "Track progress toward 150/250 word targets",
    },
    {
      icon: Download,
      title: "Export Essays",
      description: "Download responses as .docx files",
    },
  ];

  return (
    <PageLayout>
      <TopBar />
      {/* Hero Section */}
      <section className="px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            IELTS Writing Simulator
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 animate-fade-in">
            Be <span className="text-primary">Band Ready</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up">
            Practice IELTS Writing Task 1 & Task 2 with realistic exam conditions. 
            Timed writing, visual questions, and instant exports.
          </p>
          
          {/* Task Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-slide-up">
            <Button asChild size="lg" className="gap-3 h-14 px-8">
              <Link to="/ielts/task1">
                <BarChart3 className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Task 1</div>
                  <div className="text-xs opacity-80">Visual / Chart Question</div>
                </div>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-3 h-14 px-8">
              <Link to="/ielts/task2">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Task 2</div>
                  <div className="text-xs opacity-80">Essay Question</div>
                </div>
              </Link>
            </Button>
          </div>

          {/* Desktop notice */}
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
            <Monitor className="h-4 w-4" />
            <span>Best experienced on laptop or desktop</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-12 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-10">
            Realistic IELTS Practice
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

      {/* Task Info Section */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Task 1 Card */}
            <div className="module-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-essay flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-essay-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Writing Task 1</h3>
                  <p className="text-sm text-muted-foreground">20 minutes • 150+ words</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Summarize visual information from charts, graphs, tables, maps, or process diagrams.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Bar charts & line graphs
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Pie charts & tables
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Maps & process diagrams
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/ielts/task1">Start Task 1</Link>
              </Button>
            </div>

            {/* Task 2 Card */}
            <div className="module-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-typing flex items-center justify-center">
                  <FileText className="h-5 w-5 text-typing-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Writing Task 2</h3>
                  <p className="text-sm text-muted-foreground">40 minutes • 250+ words</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Write an essay responding to a point of view, argument, or problem.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-typing" />
                  Opinion essays
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-typing" />
                  Discussion & problem-solution
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-typing" />
                  Advantages & disadvantages
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/ielts/task2">Start Task 2</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Phase 2 Placeholder */}
      <section className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-muted/50 rounded-xl p-6 text-center border border-dashed border-border">
            <p className="text-sm text-muted-foreground mb-2">Coming Soon</p>
            <p className="font-medium text-foreground">
              AI Band Prediction • Grammar Analysis • Saved Essays Dashboard
            </p>
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

export default IELTSHome;
