import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Brain, 
  BookOpen, 
  Keyboard, 
  Users, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            AI-Powered Essay Writing Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight">
            Write Better Essays
            <span className="block text-primary mt-2">Every Day</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Practice with AI scoring, unlimited topics, and comprehensive feedback. 
            Perfect for GRE, IELTS, and academic writing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {user ? (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/essay">Start Writing</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link to="/auth">
                    Sign In to Track Progress
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/essay">Start Writing</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Product Benefits */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-muted-foreground text-lg">
              Comprehensive tools for essay writing and improvement
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI Essay Scoring</CardTitle>
                <CardDescription>
                  Get instant feedback on GRE and IELTS essays with Google Gemini AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    GRE AWA (0-6 scale)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    IELTS Task 1 (0-3 scale)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    IELTS Task 2 (0-6 scale)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Unlimited Practice</CardTitle>
                <CardDescription>
                  Access hundreds of random topics and prompts for continuous improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    GRE Issue & Argument topics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    IELTS Task 1 & 2 prompts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Custom topic support
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Vocabulary Builder</CardTitle>
                <CardDescription>
                  Master 500+ high-frequency words with contextual examples
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Interactive flashcards
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Real-world examples
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Progress tracking
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Keyboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Typing Practice</CardTitle>
                <CardDescription>
                  Improve your typing speed and accuracy with timed exercises
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    WPM tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Multiple passages
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Performance analytics
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Institution Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl mb-2">For Institutions</CardTitle>
              <CardDescription className="text-lg">
                Manage students, assign work, and track improvement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor student performance and improvement over time
                  </p>
                </div>
                <div className="text-center p-4">
                  <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Assign Work</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and manage assignments with deadlines and feedback
                  </p>
                </div>
                <div className="text-center p-4">
                  <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Provide Feedback</h3>
                  <p className="text-sm text-muted-foreground">
                    Review essays, give scores, and offer constructive comments
                  </p>
                </div>
              </div>
              <div className="flex justify-center pt-4">
                {user ? (
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/profile">
                      Create Institution Account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/auth">
                      Sign In to Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ScoreWise</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered essay writing and practice platform for students and institutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/essay" className="hover:text-primary">Essay Writing</Link></li>
                <li><Link to="/vocabulary" className="hover:text-primary">Vocabulary</Link></li>
                <li><Link to="/typing" className="hover:text-primary">Typing Practice</Link></li>
                <li><Link to="/ielts" className="hover:text-primary">IELTS Practice</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Institutions</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Student Management</li>
                <li>Assignment Creation</li>
                <li>Progress Analytics</li>
                <li>Custom Branding</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p>&copy; {new Date().getFullYear()} ScoreWise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

