import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqItems = [
  // Account & Getting Started
  {
    question: "How do I create an account and get started?",
    answer: "Tap 'Sign Up' on the homepage, enter your email and password, then verify your email. Once logged in, complete your profile by adding your username, Free Fire UID, and avatar. You're now ready to join tournaments!",
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer: "Go to the Login page and click 'Forgot Password'. Enter your registered email address and we'll send you a password reset link. Check your spam folder if you don't see it within a few minutes.",
  },
  {
    question: "Why was my account banned?",
    answer: "Accounts may be banned for violating community guidelines — cheating, abusive behavior, fake screenshots, or using multiple accounts. If you believe this was a mistake, submit a support ticket with your UID and we'll review your case within 48 hours.",
  },
  {
    question: "How do I change my username, avatar, or profile info?",
    answer: "Go to your Dashboard and click the edit (pencil) icon on your profile card. You can update your username, avatar, Free Fire UID, phone number, and other details. Note: Username changes may be limited.",
  },

  // Tournaments
  {
    question: "How do I join a tournament?",
    answer: "Go to the Tournaments page, find an upcoming tournament, and click 'Join'. Make sure you have enough balance in your wallet to pay the entry fee. Enter your in-game name and UID when prompted. You'll receive room ID and password before the match starts.",
  },
  {
    question: "When do I get the room ID and password?",
    answer: "Room credentials are shared approximately 15-30 minutes before the tournament start time. You'll receive them via notification and can also find them on the tournament details page. Make sure notifications are enabled!",
  },
  {
    question: "Can I get a refund for a tournament entry?",
    answer: "Refunds are only available if the tournament is cancelled by our team. Once you've joined an active tournament, the entry fee cannot be refunded. If a tournament is cancelled, your entry fee is automatically returned to your wallet.",
  },
  {
    question: "What happens if I disconnect during a match?",
    answer: "Unfortunately, disconnections during a match are treated as part of the game. We cannot offer refunds for disconnections as they cannot be verified. Please ensure a stable internet connection before joining.",
  },
  {
    question: "How are tournament winners decided?",
    answer: "Winners are determined based on the tournament rules (kills, placement, or a combination). Results are verified by our admin team using screenshots and game data. Prize money is credited to the winner's wallet within a few hours of verification.",
  },

  // Wallet & Payments
  {
    question: "How do I add money to my wallet?",
    answer: "Go to Wallet → Add Money, select the amount, and pay using UPI. After payment, enter the UTR/transaction number and upload a screenshot of the payment. Our team will verify and credit your wallet within 1-24 hours.",
  },
  {
    question: "My payment was deducted but wallet wasn't credited",
    answer: "Don't worry! Go to Wallet → Add Money, enter the same UTR number and upload the payment screenshot. Our team will verify the transaction and credit your wallet. If the issue persists after 24 hours, submit a support ticket.",
  },
  {
    question: "How long do withdrawals take?",
    answer: "Withdrawal requests are processed within 24-48 hours. Once approved, the amount is sent to your registered UPI ID. You'll receive a notification when processed. Minimum withdrawal amount and daily limits may apply.",
  },
  {
    question: "Why was my withdrawal rejected?",
    answer: "Withdrawals may be rejected if: the UPI ID is invalid, the account holder name doesn't match, there's suspicious activity on your account, or you haven't met the minimum withdrawal requirements. Check the admin notes on your request for details.",
  },

  // KYC Verification
  {
    question: "How does KYC verification work?",
    answer: "Go to your Dashboard → KYC Verification, upload a clear photo of your government ID (Aadhaar, PAN, Driving License, Passport, or Voter ID) along with a live selfie. Our AI instantly checks document validity, face match, and name match. High-confidence submissions are auto-approved within seconds. Borderline cases are sent to our admin team for manual review.",
  },
  {
    question: "Why was my KYC auto-rejected or sent to admin review?",
    answer: "The KYC Timeline on your verification page shows the exact reason — blurry photo, face mismatch, name mismatch, expired document, or unsupported ID type. If auto-rejected, fix the issue and resubmit. If sent to admin review, our team will review within 24-48 hours.",
  },
  {
    question: "Where can I see my login sessions and active devices?",
    answer: "Open the menu and tap 'Session Log' to view all your active and past login sessions, including device, location, and last activity. You can revoke any session you don't recognize for added security.",
  },

  // Streams & Clips
  {
    question: "How do I go live or upload clips?",
    answer: "To go live, navigate to Live Streams and click 'Go Live'. Enter your stream URL (YouTube/other platform), title, and description. For clips, go to the Clips page and upload your best gaming moments to share with the community.",
  },

  // General
  {
    question: "How do I contact support?",
    answer: "You have multiple options: 1) Submit a ticket on this page, 2) Use the AI Chat Assistant (bottom-right corner) for instant answers, 3) Email us at support@xtesports.com. We typically respond to tickets within 24 hours.",
  },
  {
    question: "Is my personal information safe?",
    answer: "Yes! We take privacy seriously. Your personal data is encrypted and stored securely. We never share your information with third parties. You can review and update your profile information at any time from your Dashboard.",
  },
];
export function FAQSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-neon-cyan" />
        </div>
        <div>
          <h2 className="text-lg font-orbitron font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground font-rajdhani">
            Quick answers to common questions
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border border-border rounded-lg px-4 bg-background/50 hover:bg-secondary/20 transition-colors data-[state=open]:bg-secondary/30"
          >
            <AccordionTrigger className="text-sm font-rajdhani font-medium text-foreground hover:no-underline py-3">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground font-rajdhani pb-3">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
