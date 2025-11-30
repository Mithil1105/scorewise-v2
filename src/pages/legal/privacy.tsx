import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <PageLayout showNav={false}>
      <TopBar title="Privacy Policy" showDraftsButton={false} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-2">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-muted-foreground">
            This Privacy Policy describes how Byteosaurus ("we," "our," or "us") collects, uses, 
            and protects your personal information when you use ScoreWise, our educational platform 
            for GRE and IELTS essay practice.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1.1 Account Information</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  When you create an account on ScoreWise, we collect:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Email address (required for authentication and account recovery)</li>
                  <li>Display name or username (optional, for personalization)</li>
                  <li>Password (encrypted and stored securely via Supabase authentication)</li>
                  <li>Profile information you choose to provide (avatar, bio, etc.)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.2 Essay Content and Submissions</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  As an educational platform, we collect and store:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Essay text and content you write and submit</li>
                  <li>Assignment submissions and responses</li>
                  <li>Draft essays saved in your account</li>
                  <li>Word counts, timestamps, and practice session metadata</li>
                  <li>Teacher feedback and corrections (for institutional accounts)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Important:</strong> Students retain all rights to their essay content. 
                  ScoreWise only uses this content for evaluation, providing feedback, and 
                  improving our services. We do not claim ownership of your essays.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.3 Usage and Analytics Data</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We automatically collect certain information about how you use ScoreWise:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Session duration and activity timestamps</li>
                  <li>Features accessed and pages visited</li>
                  <li>Device information (browser type, operating system)</li>
                  <li>IP address (for security and fraud prevention)</li>
                  <li>Error logs and performance metrics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">1.4 Institutional Data</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  For institutional accounts, we may collect:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Institution name, code, and contact information</li>
                  <li>Member lists and role assignments (students, teachers, admins)</li>
                  <li>Batch and assignment organization data</li>
                  <li>Custom branding preferences (logos, theme colors)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Service Provision</h3>
                <p className="text-sm text-muted-foreground">
                  We use your information to provide, maintain, and improve ScoreWise services, 
                  including essay evaluation, feedback generation, progress tracking, and 
                  institutional management features.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.2 Authentication and Security</h3>
                <p className="text-sm text-muted-foreground">
                  Your email address is used for account authentication via Supabase Auth. 
                  We send authentication emails (login links, password resets) through Supabase's 
                  secure email service. These emails are essential for account security and 
                  cannot be opted out of.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.3 Communication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We may contact you via email for:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Important service updates and security notifications</li>
                  <li>Account-related communications (required)</li>
                  <li>Marketing communications (only with your explicit consent)</li>
                  <li>Support responses to your inquiries</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  You can opt out of marketing emails at any time by clicking the unsubscribe 
                  link or contacting us directly.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.4 Service Improvement</h3>
                <p className="text-sm text-muted-foreground">
                  We analyze aggregated, anonymized usage data to improve our algorithms, 
                  user experience, and service features. This analysis does not identify 
                  individual users.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 Security Measures</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li><strong>Row-Level Security (RLS):</strong> Database-level access controls ensure users can only access their own data</li>
                  <li><strong>Encryption:</strong> Data in transit (HTTPS/TLS) and at rest (encrypted database storage)</li>
                  <li><strong>Access Logs:</strong> We maintain audit logs of data access for security monitoring</li>
                  <li><strong>Authentication:</strong> Secure password hashing and multi-factor authentication support</li>
                  <li><strong>Regular Security Audits:</strong> We review and update security practices regularly</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.2 Data Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is stored in secure cloud infrastructure managed by Supabase, 
                  which operates data centers in the United States and European Union. 
                  Data is stored in accordance with Supabase's security standards and 
                  compliance certifications.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.3 Third-Party Services</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We use the following third-party services that may process your data:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li><strong>Supabase:</strong> Database, authentication, and backend infrastructure</li>
                  <li><strong>Vercel:</strong> Application hosting and content delivery</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  These services are compliant with industry security standards and privacy 
                  regulations. We have data processing agreements in place with these providers.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Children's Privacy (COPPA Compliance)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                ScoreWise is designed for educational use and may be accessed by students under 
                the age of 13 through institutional accounts. We comply with the Children's 
                Online Privacy Protection Act (COPPA) and similar regulations:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>We do not knowingly collect personal information from children under 13 without parental consent</li>
                <li>Institutional accounts are responsible for obtaining appropriate consent for student users</li>
                <li>We limit data collection to what is necessary for educational purposes</li>
                <li>Parents or guardians can request deletion of their child's data at any time</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                If you believe we have collected information from a child under 13 without 
                proper consent, please contact us immediately at mithil20056mistry@gmail.com.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Your Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">5.1 Access and Portability</h3>
                <p className="text-sm text-muted-foreground">
                  You have the right to request a copy of all personal data we hold about you 
                  in a portable format. To request your data, email us at mithil20056mistry@gmail.com 
                  with "Data Export Request" in the subject line.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.2 Deletion</h3>
                <p className="text-sm text-muted-foreground">
                  You can request deletion of your account and all associated data at any time. 
                  To delete your account, email us at mithil20056mistry@gmail.com with "Account 
                  Deletion Request" in the subject line. We will process your request within 30 days.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.3 Rectification</h3>
                <p className="text-sm text-muted-foreground">
                  You can update most of your personal information directly in your account settings. 
                  For corrections to data you cannot edit yourself, contact us at 
                  mithil20056mistry@gmail.com.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.4 Objection and Restriction</h3>
                <p className="text-sm text-muted-foreground">
                  You have the right to object to certain processing of your data or request 
                  restriction of processing. Contact us to exercise these rights.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                We retain your data for as long as necessary to provide our services and 
                comply with legal obligations:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
                <li><strong>Deleted Accounts:</strong> Data is deleted within 30 days of account deletion request</li>
                <li><strong>Backups:</strong> Deleted data may remain in encrypted backups for up to 90 days for disaster recovery purposes</li>
                <li><strong>Legal Requirements:</strong> We may retain certain data longer if required by law or for legitimate business purposes (e.g., fraud prevention)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                ScoreWise uses cookies and similar technologies for:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li><strong>Authentication:</strong> Session cookies to maintain your login state</li>
                <li><strong>Security:</strong> CSRF tokens and security cookies</li>
                <li><strong>Preferences:</strong> Storing your UI preferences and settings</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                We do not use third-party advertising cookies or tracking pixels. For more 
                information, see our <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your data may be transferred to and stored in data centers located outside 
                your country of residence (primarily in the US and EU). We ensure appropriate 
                safeguards are in place, including standard contractual clauses and compliance 
                with applicable data protection laws.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of 
                significant changes by email (if you have an account) or by posting a notice 
                on our website. The "Last Updated" date at the top of this page indicates 
                when the policy was last revised.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                If you have questions about this Privacy Policy or wish to exercise your 
                privacy rights, please contact us:
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

