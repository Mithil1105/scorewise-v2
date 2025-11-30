import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Cookie } from "lucide-react";
import { Link } from "react-router-dom";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setIsVisible(false);
    // Note: Essential cookies will still work, but user has declined non-essential
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-300">
      <Card className="max-w-4xl mx-auto shadow-lg border-2">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Cookie className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm md:text-base mb-2">
                We Use Cookies
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-2">
                ScoreWise uses essential cookies to maintain your login session and provide 
                secure access to your account. These cookies are required for the service to 
                function properly. By continuing to use ScoreWise, you consent to our use of 
                cookies as described in our{" "}
                <Link to="/cookies" className="text-primary hover:underline font-medium">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                onClick={handleAccept}
                size="sm"
                className="w-full sm:w-auto"
              >
                Accept
              </Button>
              <Button
                onClick={handleDecline}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                Decline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

