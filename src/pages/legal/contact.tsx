import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Building2, Shield, HelpCircle } from "lucide-react";

export default function Contact() {
  return (
    <PageLayout showNav={false}>
      <TopBar title="Contact Us" showDraftsButton={false} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-lg">
            We're here to help. Reach out to us for any inquiries, support, or partnership opportunities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                General Inquiries
              </CardTitle>
              <CardDescription>
                Questions about ScoreWise, features, or general information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                For general questions, feature requests, or feedback about ScoreWise:
              </p>
              <a 
                href="mailto:mithil20056mistry@gmail.com" 
                className="text-primary hover:underline font-medium"
              >
                mithil20056mistry@gmail.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Sales & Partnerships
              </CardTitle>
              <CardDescription>
                Interested in institutional subscriptions or partnerships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                For institutional subscriptions, custom billing, or partnership opportunities:
              </p>
              <a 
                href="mailto:mithil20056mistry@gmail.com" 
                className="text-primary hover:underline font-medium"
              >
                mithil20056mistry@gmail.com
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                We offer custom contact-first billing for institutions. Please reach out to discuss your needs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Support & Technical Issues
              </CardTitle>
              <CardDescription>
                Need help with your account or experiencing technical issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                For technical support, account issues, or bug reports:
              </p>
              <a 
                href="mailto:mithil20056mistry@gmail.com" 
                className="text-primary hover:underline font-medium"
              >
                mithil20056mistry@gmail.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Rights Requests
              </CardTitle>
              <CardDescription>
                Request data export, deletion, or exercise your privacy rights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Under GDPR and other privacy regulations, you have the right to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-3 list-disc list-inside">
                <li>Request a copy of your personal data</li>
                <li>Request deletion of your account and data</li>
                <li>Rectify inaccurate information</li>
                <li>Object to processing of your data</li>
              </ul>
              <p className="text-sm text-muted-foreground mb-2">
                To exercise these rights, please contact us at:
              </p>
              <a 
                href="mailto:mithil20056mistry@gmail.com" 
                className="text-primary hover:underline font-medium"
              >
                mithil20056mistry@gmail.com
              </a>
              <p className="text-xs text-muted-foreground mt-3">
                Please include "Data Rights Request" in the subject line and provide your account email address.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Identity Disclosure</CardTitle>
            <CardDescription>Legal information about ScoreWise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Business Name</h3>
              <p className="text-sm text-muted-foreground">Byteosaurus</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Product Name</h3>
              <p className="text-sm text-muted-foreground">ScoreWise</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Founders</h3>
              <p className="text-sm text-muted-foreground">Mithil Mistry & Hasti Vakani</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Contact Information</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:mithil20056mistry@gmail.com" className="hover:underline">
                    mithil20056mistry@gmail.com
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+918238326605" className="hover:underline">
                    +91 82383 26605
                  </a>
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Location</h3>
              <p className="text-sm text-muted-foreground">Ahmedabad, Gujarat, India</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Governing Law</h3>
              <p className="text-sm text-muted-foreground">Gujarat, India</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We aim to respond to all inquiries within 2-3 business days. For urgent matters, 
              please mention "URGENT" in your email subject line. Data rights requests will be 
              processed within 30 days as required by applicable privacy regulations.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

