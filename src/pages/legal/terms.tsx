import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <PageLayout showNav={true}>
      <TopBar title="Terms & Conditions" showDraftsButton={false} showBackButton={true} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-muted-foreground mb-2">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-muted-foreground">
            These Terms and Conditions ("Terms") govern your use of ScoreWise, an educational 
            platform operated by Byteosaurus. By accessing or using ScoreWise, you agree to be 
            bound by these Terms.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                By creating an account, accessing, or using ScoreWise, you acknowledge that you 
                have read, understood, and agree to be bound by these Terms and our Privacy Policy. 
                If you do not agree to these Terms, you must not use ScoreWise. These Terms constitute 
                a legally binding agreement between you and Byteosaurus.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Eligibility and User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Eligibility</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  ScoreWise is designed for:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li><strong>Students:</strong> Individuals preparing for GRE, IELTS, or other standardized tests</li>
                  <li><strong>Educational Institutions:</strong> Schools, coaching centers, and educational organizations</li>
                  <li><strong>Teachers and Administrators:</strong> Educators managing student assignments and progress</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  You must be at least 13 years old to create an account. Users under 18 should 
                  have parental or guardian consent. For institutional accounts, the institution 
                  is responsible for ensuring appropriate consent for all users.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.2 Account Registration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To use ScoreWise, you must:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and update your account information to keep it accurate</li>
                  <li>Maintain the security of your password and account credentials</li>
                  <li>Notify us immediately of any unauthorized access or security breach</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.3 Account Termination</h3>
                <p className="text-sm text-muted-foreground">
                  We reserve the right to suspend or terminate your account at any time for 
                  violation of these Terms, fraudulent activity, or any other reason we deem 
                  necessary to protect the integrity of our service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. License and Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 License Grant</h3>
                <p className="text-sm text-muted-foreground">
                  Subject to your compliance with these Terms, Byteosaurus grants you a limited, 
                  non-exclusive, non-transferable, revocable license to access and use ScoreWise 
                  for your personal or institutional educational purposes.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.2 Restrictions</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You agree NOT to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Copy, modify, distribute, sell, or lease any part of ScoreWise</li>
                  <li>Reverse engineer, decompile, or attempt to extract the source code</li>
                  <li>Use automated systems (bots, scrapers) to access ScoreWise without permission</li>
                  <li>Interfere with or disrupt the security or functionality of ScoreWise</li>
                  <li>Use ScoreWise for any illegal or unauthorized purpose</li>
                  <li>Share your account credentials with others or create multiple accounts to circumvent restrictions</li>
                  <li>Remove or alter any copyright, trademark, or proprietary notices</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.3 Intellectual Property</h3>
                <p className="text-sm text-muted-foreground">
                  All content, features, and functionality of ScoreWise, including but not limited 
                  to text, graphics, logos, software, and algorithms, are owned by Byteosaurus or 
                  its licensors and are protected by copyright, trademark, and other intellectual 
                  property laws. You may not use our trademarks or logos without prior written consent.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. User Content and Ownership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">4.1 Your Content</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You retain all ownership rights to essays, assignments, and other content you 
                  create or submit on ScoreWise ("User Content"). By submitting User Content, you grant 
                  Byteosaurus a limited, non-exclusive license to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Store, process, and display your content to provide our services</li>
                  <li>Use your content for evaluation, feedback generation, and service improvement</li>
                  <li>Share your content with teachers, administrators, or other authorized users within your institution</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Important:</strong> Students retain all rights to their essays. ScoreWise 
                  only uses content for evaluation and service improvement. We do not claim ownership 
                  of your essays or use them for commercial purposes beyond providing our services.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.2 Content Standards</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You are solely responsible for your User Content. You agree that your content will not:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Violate any laws, regulations, or third-party rights</li>
                  <li>Contain offensive, harmful, or inappropriate material</li>
                  <li>Infringe on intellectual property rights of others</li>
                  <li>Contain malware, viruses, or malicious code</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">4.3 Content Removal</h3>
                <p className="text-sm text-muted-foreground">
                  We reserve the right to remove or disable access to any User Content that violates 
                  these Terms or is otherwise objectionable, without prior notice.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Scoring and Feedback Disclaimers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">5.1 AI and Automated Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  ScoreWise may use artificial intelligence and automated systems to provide scores, 
                  feedback, and suggestions. These scores and feedback are provided for educational 
                  and practice purposes only and are NOT guaranteed to reflect actual exam scores or 
                  official evaluations. Automated scoring may have limitations and inaccuracies.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.2 Teacher Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  For institutional accounts, teacher-provided feedback and scores are the opinions 
                  and evaluations of individual educators. Byteosaurus is not responsible for the 
                  accuracy, quality, or content of teacher feedback. We do not guarantee that teacher 
                  feedback will improve your actual exam performance.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">5.3 No Guarantee of Results</h3>
                <p className="text-sm text-muted-foreground">
                  ScoreWise is an educational tool designed to help you practice and improve. We 
                  make no guarantees, warranties, or representations regarding:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Improvement in your actual GRE, IELTS, or other exam scores</li>
                  <li>Accuracy of automated scoring or feedback</li>
                  <li>Success in passing any examination</li>
                  <li>Any specific educational outcomes</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Academic Integrity and Prohibited Conduct</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">6.1 Plagiarism</h3>
                <p className="text-sm text-muted-foreground">
                  You agree not to submit plagiarized content. Plagiarism includes copying content 
                  from other sources (websites, books, other students' work) without proper attribution. 
                  We reserve the right to detect and flag potential plagiarism, but we are not responsible 
                  for preventing or detecting all instances of plagiarism.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.2 Cheating and Unauthorized Assistance</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  You agree not to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Use unauthorized assistance during practice sessions or assignments</li>
                  <li>Share answers or collaborate inappropriately on individual assignments</li>
                  <li>Use external tools or resources in violation of assignment instructions</li>
                  <li>Attempt to manipulate or game the scoring system</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.3 Consequences</h3>
                <p className="text-sm text-muted-foreground">
                  Violation of academic integrity policies may result in immediate account suspension 
                  or termination, removal of content, and notification to your institution (if applicable).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Payment and Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">7.1 Subscription Plans</h3>
                <p className="text-sm text-muted-foreground">
                  ScoreWise offers paid subscription plans for institutions and premium features. 
                  For custom institutional subscriptions, billing is handled through a contact-first 
                  process. We will contact you to discuss pricing, payment terms, and billing arrangements.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7.2 Payment Terms</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  By subscribing to a paid plan, you agree to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Pay all fees associated with your subscription</li>
                  <li>Provide accurate billing information</li>
                  <li>Authorize us to charge your payment method for recurring subscriptions</li>
                  <li>Notify us of any changes to your payment information</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7.3 Refunds</h3>
                <p className="text-sm text-muted-foreground">
                  Refund policies vary by subscription type and will be communicated at the time of 
                  purchase. Generally, refunds are not available for partially used subscription 
                  periods unless required by law or specified in your agreement.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">7.4 Price Changes</h3>
                <p className="text-sm text-muted-foreground">
                  We reserve the right to modify subscription prices at any time. Price changes will 
                  not affect your current subscription period but will apply to renewals.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Service Availability and Disclaimers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">8.1 Availability</h3>
                <p className="text-sm text-muted-foreground">
                  We strive to maintain high availability of ScoreWise, but we do not guarantee 
                  uninterrupted, error-free, or secure access. The service may be unavailable due 
                  to maintenance, technical issues, or circumstances beyond our control.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">8.2 Uptime Disclaimers</h3>
                <p className="text-sm text-muted-foreground">
                  While we aim for 99%+ uptime, we do not guarantee specific uptime percentages. 
                  Scheduled maintenance will be announced when possible, but emergency maintenance 
                  may occur without notice.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">8.3 "As Is" Service</h3>
                <p className="text-sm text-muted-foreground">
                  ScoreWise is provided "as is" and "as available" without warranties of any kind, 
                  either express or implied, including but not limited to warranties of merchantability, 
                  fitness for a particular purpose, or non-infringement.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                To the maximum extent permitted by law, Byteosaurus and its founders, employees, 
                and affiliates shall not be liable for:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of data, profits, or business opportunities</li>
                <li>Service interruptions or unavailability</li>
                <li>Errors or inaccuracies in content, scoring, or feedback</li>
                <li>Any reliance on automated scoring or feedback for actual exam performance</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Our total liability for any claims arising from your use of ScoreWise shall not 
                exceed the amount you paid us in the 12 months preceding the claim, or $100, 
                whichever is greater.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Indemnification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You agree to indemnify, defend, and hold harmless Byteosaurus, its founders, 
                employees, and affiliates from any claims, damages, losses, liabilities, and 
                expenses (including legal fees) arising from your use of ScoreWise, violation 
                of these Terms, or infringement of any rights of another party.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">11.1 Termination by You</h3>
                <p className="text-sm text-muted-foreground">
                  You may terminate your account at any time by contacting us at 
                  mithil20056mistry@gmail.com or using account deletion features in your settings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">11.2 Termination by Us</h3>
                <p className="text-sm text-muted-foreground">
                  We may suspend or terminate your account immediately, without prior notice, 
                  if you violate these Terms, engage in fraudulent activity, or for any other 
                  reason we deem necessary.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">11.3 Effect of Termination</h3>
                <p className="text-sm text-muted-foreground">
                  Upon termination, your right to use ScoreWise will cease immediately. We may 
                  delete your account and data in accordance with our Privacy Policy. Provisions 
                  of these Terms that by their nature should survive termination will survive.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Dispute Resolution and Arbitration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">12.1 Governing Law</h3>
                <p className="text-sm text-muted-foreground">
                  These Terms shall be governed by and construed in accordance with the laws of 
                  Gujarat, India, without regard to its conflict of law provisions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">12.2 Arbitration Agreement</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Any dispute, controversy, or claim arising out of or relating to these Terms or 
                  your use of ScoreWise shall be resolved through binding arbitration in accordance 
                  with the Arbitration and Conciliation Act, 2015 (India), or any successor legislation.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>Arbitration shall be conducted in Ahmedabad, Gujarat, India</li>
                  <li>The arbitration shall be conducted in English</li>
                  <li>The arbitrator's decision shall be final and binding</li>
                  <li>You waive your right to a jury trial or to participate in a class action</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">12.3 Exceptions</h3>
                <p className="text-sm text-muted-foreground">
                  Notwithstanding the above, either party may seek injunctive relief in any court 
                  of competent jurisdiction to protect intellectual property rights or prevent 
                  irreparable harm.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We reserve the right to modify these Terms at any time. We will notify you of 
                material changes by email (if you have an account) or by posting a notice on 
                our website. Your continued use of ScoreWise after changes become effective 
                constitutes acceptance of the modified Terms. If you do not agree to the changes, 
                you must stop using ScoreWise and terminate your account.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>14. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Email:</strong> mithil20056mistry@gmail.com</p>
                <p><strong>Phone:</strong> +91 82383 26605</p>
                <p><strong>Location:</strong> Ahmedabad, Gujarat, India</p>
                <p><strong>Business:</strong> Byteosaurus</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

