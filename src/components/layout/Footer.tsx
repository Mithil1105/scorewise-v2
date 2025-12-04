import { Link } from "react-router-dom";
import { 
  PenLine, 
  Keyboard, 
  BookOpen, 
  GraduationCap, 
  Home,
  Mail,
  Phone,
  Building2,
  Shield,
  FileText,
  Cookie,
  AlertTriangle,
  HelpCircle,
  CheckSquare
} from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About ScoreWise */}
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              ScoreWise
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your all-in-one GRE and IELTS preparation companion. Practice essays, improve typing speed, 
              and master high-frequency vocabulary words.
            </p>
            <div className="text-xs text-muted-foreground">
              <p className="mb-1">
                <strong>Business:</strong> Byteosaurus
              </p>
              <p className="mb-1">
                <strong>Founders:</strong> Mithil Mistry & Hasti Vakani
              </p>
              <p>
                <strong>Location:</strong> Ahmedabad, Gujarat, India
              </p>
            </div>
          </div>

          {/* Practice Modules */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Practice Modules</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/essay" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <PenLine className="h-4 w-4" />
                  GRE Essay Practice
                </Link>
              </li>
              <li>
                <Link 
                  to="/ielts" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  IELTS Practice
                </Link>
              </li>
              <li>
                <Link 
                  to="/typing" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Keyboard className="h-4 w-4" />
                  Typing Practice
                </Link>
              </li>
              <li>
                <Link 
                  to="/vocabulary" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Vocabulary Builder
                </Link>
              </li>
              <li>
                <Link 
                  to="/grammar" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Grammar Practice
                </Link>
              </li>
            </ul>
          </div>

          {/* For Institutions */}
          <div>
            <h3 className="font-semibold text-lg mb-4">For Institutions</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Student Management</li>
              <li>Assignment Creation</li>
              <li>Progress Analytics</li>
              <li>Custom Branding</li>
              <li>Teacher Dashboard</li>
              <li>Batch Management</li>
            </ul>
            <div className="mt-4">
              <Link 
                to="/contact" 
                className="text-sm text-primary hover:underline font-medium flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Contact for Institutional Plans
              </Link>
            </div>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal & Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  to="/contact" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  to="/faqs" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  FAQs
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link 
                  to="/cookies" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Cookie className="h-4 w-4" />
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/disclaimer" 
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Legal Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t border-border pt-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a 
                href="mailto:mithil20056mistry@gmail.com" 
                className="hover:text-primary transition-colors"
              >
                mithil20056mistry@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a 
                href="tel:+918238326605" 
                className="hover:text-primary transition-colors"
              >
                +91 82383 26605
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Ahmedabad, Gujarat, India</span>
            </div>
          </div>
        </div>

        {/* Copyright & Disclaimer */}
        <div className="border-t border-border pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div className="text-center md:text-left">
              <p className="mb-1">
                © {currentYear} <strong className="text-foreground">ScoreWise</strong> • Powered by <strong className="text-foreground">Byteosaurus</strong>
              </p>
              <p className="text-xs text-muted-foreground italic">
                We feel binary beating through our artery
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs">
                ScoreWise is not affiliated with ETS, British Council, IDP Education, or Cambridge Assessment.
              </p>
              <p className="text-xs mt-1">
                Governing Law: Gujarat, India
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

