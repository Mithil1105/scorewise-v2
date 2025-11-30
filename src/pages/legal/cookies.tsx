import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Cookies() {
  return (
    <PageLayout showNav={true}>
      <TopBar title="Cookie Policy" showDraftsButton={false} showBackButton={true} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground mb-2">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-muted-foreground">
            This Cookie Policy explains how Byteosaurus ("we," "our," or "us") uses cookies and 
            similar technologies on ScoreWise to provide, protect, and improve our services.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. What Are Cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cookies are small text files that are placed on your device (computer, tablet, or 
                mobile phone) when you visit a website. They are widely used to make websites work 
                more efficiently and provide information to website owners. Cookies allow websites 
                to recognize your device and remember information about your visit, such as your 
                preferences and actions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Essential Cookies (Required)</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  These cookies are strictly necessary for ScoreWise to function properly. They enable 
                  core functionality such as:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li><strong>Session Authentication:</strong> Maintaining your login state and session security</li>
                  <li><strong>Security Tokens:</strong> CSRF protection and security verification</li>
                  <li><strong>Account Management:</strong> Remembering your authentication status across pages</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Why these are essential:</strong> Without these cookies, you would not be 
                  able to log in, stay logged in, or securely access your account. These cookies 
                  cannot be disabled as they are fundamental to the service's operation.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.2 Preference Cookies</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  These cookies remember your preferences and settings to enhance your experience:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>UI preferences (dark mode, theme colors)</li>
                  <li>Language settings</li>
                  <li>Display preferences and layout choices</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.3 What We Do NOT Use</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  ScoreWise does NOT use:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Third-party advertising cookies</li>
                  <li>Tracking pixels or beacons for marketing</li>
                  <li>Social media tracking cookies</li>
                  <li>Analytics cookies that identify individual users</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Types of Cookies We Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Session Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    These temporary cookies are deleted when you close your browser. They are used 
                    to maintain your session while you navigate through ScoreWise, ensuring you 
                    remain logged in and your actions are properly authenticated.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Persistent Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    These cookies remain on your device for a set period (typically until you log 
                    out or they expire). They remember your login state so you don't have to log in 
                    every time you visit ScoreWise, and they store your preferences.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Third-Party Cookies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                ScoreWise uses the following third-party services that may set cookies:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-4">
                <li>
                  <strong>Supabase:</strong> Our authentication and database provider sets cookies 
                  for session management and security. These are essential for account functionality.
                </li>
                <li>
                  <strong>Vercel:</strong> Our hosting provider may set cookies for performance 
                  and security purposes.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                These third-party cookies are subject to the respective providers' privacy policies. 
                We do not control these cookies, but we ensure our partners comply with applicable 
                privacy regulations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Cookie Consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">5.1 Consent Mechanism</h3>
                <p className="text-sm text-muted-foreground">
                  When you first visit ScoreWise, you may see a cookie consent banner. By continuing 
                  to use our service, you consent to our use of cookies as described in this policy. 
                  Essential cookies are required and cannot be opted out of, as they are necessary 
                  for the service to function.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.2 Managing Cookie Preferences</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You can manage cookies through:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through settings</li>
                  <li><strong>Cookie Banner:</strong> Use our cookie consent banner to manage preferences (where applicable)</li>
                  <li><strong>Account Settings:</strong> Some preferences can be managed in your ScoreWise account settings</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. What Happens If You Block Cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                If you choose to block or disable cookies, certain features of ScoreWise may not 
                function properly:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li><strong>You will not be able to log in:</strong> Authentication requires session cookies</li>
                <li><strong>You will be logged out frequently:</strong> Without persistent cookies, your session won't be remembered</li>
                <li><strong>Preferences won't be saved:</strong> Your UI preferences and settings will reset each visit</li>
                <li><strong>Security features may be impaired:</strong> CSRF protection and security tokens rely on cookies</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Important:</strong> Blocking essential cookies will prevent you from using 
                ScoreWise effectively. We recommend allowing essential cookies for the best experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. How to Manage Cookies in Your Browser</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Most web browsers allow you to control cookies through their settings. Here are 
                links to cookie management instructions for popular browsers:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Updates to This Cookie Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We may update this Cookie Policy from time to time to reflect changes in our 
                practices or for legal, operational, or regulatory reasons. We will notify you 
                of significant changes by posting a notice on our website or, where appropriate, 
                by email. The "Last Updated" date at the top of this page indicates when the 
                policy was last revised.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                If you have questions about our use of cookies, please contact us:
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Email:</strong> mithil20056mistry@gmail.com</p>
                <p><strong>Phone:</strong> +91 82383 26605</p>
                <p><strong>Location:</strong> Ahmedabad, Gujarat, India</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

