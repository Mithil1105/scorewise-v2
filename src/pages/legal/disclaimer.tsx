import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Disclaimer() {
  return (
    <PageLayout showNav={false}>
      <TopBar title="Legal Disclaimer" showDraftsButton={false} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Legal Disclaimer</h1>
          <p className="text-muted-foreground mb-2">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-muted-foreground">
            Please read this disclaimer carefully before using ScoreWise. By accessing or using 
            ScoreWise, you acknowledge that you have read, understood, and agree to be bound by 
            this disclaimer.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-5 w-5" />
                Important Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ScoreWise is an educational practice tool. The information, scores, feedback, and 
                content provided on ScoreWise are for educational and practice purposes only. They 
                are not official exam scores, official evaluations, or guarantees of performance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>1. Information-Only Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                The content, materials, and information provided on ScoreWise are for informational 
                and educational purposes only. While we strive to provide accurate and helpful 
                information, we make no representations or warranties of any kind, express or implied, 
                about the completeness, accuracy, reliability, suitability, or availability of the 
                information, products, services, or related graphics contained on ScoreWise.
              </p>
              <p className="text-sm text-muted-foreground">
                Any reliance you place on such information is strictly at your own risk. We disclaim 
                all liability and responsibility arising from any reliance placed on such materials 
                by you or any other visitor to ScoreWise, or by anyone who may be informed of any 
                of its contents.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. No Guarantee of Academic Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Practice Tool Only</h3>
                <p className="text-sm text-muted-foreground">
                  ScoreWise is designed as a practice and preparation tool. We make no guarantees, 
                  warranties, or representations regarding:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4 mt-2">
                  <li>Improvement in your actual GRE, IELTS, or other standardized test scores</li>
                  <li>Success in passing any examination</li>
                  <li>Accuracy of practice scores compared to actual exam scores</li>
                  <li>Any specific educational outcomes or results</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.2 Individual Results May Vary</h3>
                <p className="text-sm text-muted-foreground">
                  Academic performance depends on numerous factors including but not limited to: 
                  individual effort, study habits, prior knowledge, test-taking skills, and external 
                  circumstances. Results achieved by other users do not guarantee similar results for you.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Automated Scoring and AI Feedback Disclaimer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 Not Official Scores</h3>
                <p className="text-sm text-muted-foreground">
                  Any scores, ratings, or evaluations provided by ScoreWise's automated systems or 
                  artificial intelligence are estimates for practice purposes only. These scores are 
                  NOT official exam scores and should NOT be used as indicators of your actual 
                  performance on real examinations.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.2 Limitations of Automated Systems</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Automated scoring and AI feedback systems have inherent limitations:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                  <li>They may not accurately reflect human evaluator assessments</li>
                  <li>They may miss nuances, context, or creative elements in essays</li>
                  <li>They are based on algorithms that may have biases or limitations</li>
                  <li>They cannot replace professional human evaluation</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3.3 No Responsibility for Reliance</h3>
                <p className="text-sm text-muted-foreground">
                  Byteosaurus is not responsible for any decisions, actions, or consequences that 
                  result from reliance on automated scoring, AI feedback, or any other information 
                  provided by ScoreWise. You should not make important decisions (such as whether 
                  to take an exam, which exam to take, or career choices) based solely on ScoreWise 
                  practice scores or feedback.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Teacher Feedback Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                For institutional accounts, feedback and scores provided by teachers are the opinions 
                and evaluations of individual educators. Byteosaurus:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Does not control, review, or verify teacher feedback or scores</li>
                <li>Is not responsible for the accuracy, quality, or content of teacher evaluations</li>
                <li>Does not guarantee that teacher feedback will improve your exam performance</li>
                <li>Is not liable for any disputes between students and teachers regarding feedback</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Teacher feedback is provided "as is" and represents the individual teacher's assessment, 
                not an official evaluation by Byteosaurus or any exam authority.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. No Professional Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                The content and services provided by ScoreWise do not constitute:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Professional educational counseling or advice</li>
                <li>Official exam preparation guidance from test administrators</li>
                <li>Legal, financial, or career advice</li>
                <li>Medical or psychological advice</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                You should consult with qualified professionals (such as educational counselors, 
                exam preparation experts, or test administrators) for official guidance and advice 
                regarding your test preparation and career decisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Third-Party Content and Links</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                ScoreWise may contain links to third-party websites, resources, or content. We have 
                no control over the nature, content, and availability of those sites. The inclusion 
                of any links does not necessarily imply a recommendation or endorse the views 
                expressed within them. We are not responsible for the content, privacy practices, 
                or terms of use of any third-party websites.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Service Availability and Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                While we strive to maintain accurate and up-to-date information, ScoreWise may contain 
                errors, inaccuracies, or omissions. We reserve the right to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Correct any errors, inaccuracies, or omissions</li>
                <li>Change or update information at any time without prior notice</li>
                <li>Modify or discontinue services temporarily or permanently</li>
                <li>Make improvements or changes to the platform</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                We do not warrant that the service will be uninterrupted, secure, or error-free, 
                or that defects will be corrected.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                To the maximum extent permitted by applicable law, Byteosaurus, its founders, 
                employees, affiliates, and partners shall not be liable for:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of data, profits, opportunities, or business</li>
                <li>Service interruptions, unavailability, or technical failures</li>
                <li>Errors or inaccuracies in content, scoring, or feedback</li>
                <li>Any reliance on information, scores, or feedback provided by ScoreWise</li>
                <li>Decisions made based on ScoreWise practice results or feedback</li>
                <li>Any consequences resulting from use or inability to use ScoreWise</li>
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
              <CardTitle>9. No Endorsement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                ScoreWise is not affiliated with, endorsed by, or connected to Educational Testing 
                Service (ETS), the British Council, IDP Education, Cambridge Assessment English, 
                or any other official test administrator. ScoreWise is an independent educational 
                practice platform. Any references to GRE, IELTS, or other standardized tests are 
                for identification purposes only and do not imply any endorsement or affiliation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Use at Your Own Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your use of ScoreWise is at your own risk. The service is provided "as is" and "as 
                available" without any warranties, express or implied. We disclaim all warranties, 
                including but not limited to warranties of merchantability, fitness for a particular 
                purpose, and non-infringement. You assume full responsibility for your use of ScoreWise 
                and any consequences that may result.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                If you have questions about this disclaimer, please contact us:
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

