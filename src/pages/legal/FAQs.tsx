import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export default function FAQs() {
  const faqs = [
    {
      question: "What is ScoreWise?",
      answer: "ScoreWise is an AI-powered educational SaaS platform designed to help students improve their GRE AWA (Analytical Writing Assessment) and IELTS writing skills. It provides instant AI scoring, detailed feedback, grammar corrections, and teacher review capabilities. The platform is built for both individual students and educational institutions, offering comprehensive tools for essay practice, assignment management, and progress tracking."
    },
    {
      question: "Who can use ScoreWise?",
      answer: "ScoreWise is designed for multiple user types: (1) Students preparing for GRE or IELTS exams who want to practice writing and receive feedback, (2) Teachers and educators who need tools to manage assignments, review student essays, and provide corrections, (3) Educational institutions and coaching centers that want a comprehensive platform to manage their students' learning progress, create assignments, and track analytics. Individual students can use ScoreWise for personal practice, while institutions can set up custom accounts with advanced features."
    },
    {
      question: "Does ScoreWise support both GRE and IELTS?",
      answer: "Yes, ScoreWise supports both GRE and IELTS writing tasks. For GRE, it focuses on the Analytical Writing Assessment (AWA) with practice prompts and scoring. For IELTS, it supports both Task 1 (Academic Writing - charts, graphs, diagrams) and Task 2 (Essay Writing). Each exam type has specific scoring criteria, feedback mechanisms, and practice features tailored to the requirements of that exam. You can switch between GRE and IELTS practice modes easily."
    },
    {
      question: "How does teacher review work?",
      answer: "Teachers can review student essays through a dedicated dashboard. When a student submits an essay, teachers receive notifications and can access the submission. Teachers can: (1) Add corrections by selecting text and providing corrected versions with optional advice, (2) Provide overall feedback and assign scores based on exam-specific criteria (GRE: 0-6, IELTS Task 1: 0-3, IELTS Task 2: 0-6), (3) Track all corrections in a centralized system, (4) Publish final corrected versions that students can view. All corrections are stored separately from the original essay, ensuring students retain ownership of their work while benefiting from teacher feedback."
    },
    {
      question: "Do students own their essays?",
      answer: "Yes, absolutely. Students retain full ownership and rights to all essays and content they create on ScoreWise. Byteosaurus (the company behind ScoreWise) only uses student content for evaluation, providing feedback, and improving our services. We do not claim ownership of student essays, and students can export or delete their content at any time. This is clearly stated in our Terms & Conditions and Privacy Policy. Educational institutions also respect this ownership model."
    },
    {
      question: "What is the pricing for coaching institutions?",
      answer: "ScoreWise offers custom pricing plans for coaching institutions and educational organizations. Pricing is determined based on factors such as the number of students, teachers, and features required. We use a contact-first billing approach - interested institutions should reach out to us at mithil20056mistry@gmail.com or call +91 82383 26605 to discuss their specific needs. We'll work with you to create a tailored plan that fits your institution's requirements and budget. Custom plans typically include features like batch management, custom branding, advanced analytics, and dedicated support."
    },
    {
      question: "Is ScoreWise suitable for institutions in India?",
      answer: "Yes, ScoreWise is specifically designed with Indian educational institutions in mind. The platform is built by Byteosaurus, based in Ahmedabad, Gujarat, India, and understands the needs of Indian coaching centers and educational institutions. We support Indian payment methods, provide customer support in English and local languages, and comply with Indian data protection regulations. The platform is optimized for Indian internet conditions and works well with local educational workflows. Our team is available during Indian business hours for support."
    },
    {
      question: "Can teachers track student analytics?",
      answer: "Yes, ScoreWise provides comprehensive analytics for teachers and institutions. Teachers can view: (1) Individual student progress over time, including score trends and improvement areas, (2) Assignment completion rates and submission statistics, (3) Common mistakes and areas where students need more practice, (4) Class-wide performance metrics and comparisons. Institution administrators have access to even more detailed analytics, including institution-wide statistics, batch performance, teacher activity, and student engagement metrics. All analytics are presented in easy-to-understand dashboards with visual charts and reports."
    },
    {
      question: "How accurate is the AI scoring?",
      answer: "ScoreWise uses advanced AI algorithms to provide instant scoring and feedback. However, it's important to understand that AI scores are estimates for practice purposes only and should not be considered official exam scores. The AI evaluates essays based on factors like grammar, vocabulary, coherence, task response, and argument structure. For the most accurate assessment, we recommend combining AI feedback with teacher review. Teachers can override AI scores and provide human evaluation, which often catches nuances that AI might miss. The platform is designed to complement, not replace, human instruction."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, ScoreWise takes data security seriously. We use industry-standard security measures including: (1) Row-Level Security (RLS) to ensure users can only access their own data, (2) Encryption for data in transit (HTTPS/TLS) and at rest, (3) Secure authentication via Supabase Auth, (4) Regular security audits and updates. Your data is stored in secure cloud infrastructure. We comply with applicable privacy regulations and you can request data export or deletion at any time. For more details, please see our Privacy Policy."
    },
    {
      question: "Can I use ScoreWise on mobile devices?",
      answer: "Yes, ScoreWise is fully responsive and works on mobile devices, tablets, and desktops. The platform is optimized for mobile browsers, allowing students to practice essays, view feedback, and access assignments from their smartphones. Teachers can also review essays and manage assignments from mobile devices. However, for the best experience, especially when writing longer essays, we recommend using a desktop or tablet with a keyboard."
    }
  ];

  return (
    <PageLayout showNav={true}>
      <TopBar title="Frequently Asked Questions" showDraftsButton={false} showBackButton={true} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions about ScoreWise, our features, pricing, and how to get started.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General Questions</CardTitle>
            <CardDescription>
              Everything you need to know about ScoreWise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Still Have Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you couldn't find the answer you're looking for, please don't hesitate to reach out to us.
            </p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:mithil20056mistry@gmail.com" className="text-primary hover:underline">
                  mithil20056mistry@gmail.com
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                <a href="tel:+918238326605" className="text-primary hover:underline">
                  +91 82383 26605
                </a>
              </p>
              <p>
                <strong>Location:</strong> Ahmedabad, Gujarat, India
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

