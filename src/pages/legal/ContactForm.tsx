import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send } from "lucide-react";

interface ContactFormProps {
  onSuccess?: () => void;
}

export function ContactForm({ onSuccess }: ContactFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // First, try to save to Supabase table
      const { error: dbError } = await supabase
        .from("contact_messages")
        .insert({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          message: formData.message,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        // If table doesn't exist, log error but continue with email
        console.warn("Could not save to database:", dbError);
      }

      // Send email (using mailto as fallback, or you can integrate Resend API)
      const subject = encodeURIComponent(`Contact Form: ${formData.role} - ${formData.name}`);
      const body = encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\nRole: ${formData.role}\n\nMessage:\n${formData.message}`
      );
      
      // Open email client
      window.location.href = `mailto:mithil20056mistry@gmail.com?subject=${subject}&body=${body}`;

      toast({
        title: "Message sent successfully!",
        description: "Our team will reply soon. We've also opened your email client.",
      });

      // Reset form
      setFormData({ name: "", email: "", role: "", message: "" });
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <Label htmlFor="role">I am a *</Label>
        <Select
          required
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="institute_owner">Institute Owner</SelectItem>
            <SelectItem value="collaboration">Collaboration Request</SelectItem>
            <SelectItem value="pricing">Pricing Inquiry</SelectItem>
            <SelectItem value="technical">Technical Help</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          required
          rows={6}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us how we can help you..."
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}

