import { CheckCircle2, Clock, Loader2, ShieldCheck, Sparkles, UserCog, XCircle, Upload, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Step = {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  state: "done" | "active" | "pending" | "failed" | "skipped";
  timestamp?: string | null;
};

function formatTime(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function KycTimeline({ record }: { record: any }) {
  if (!record) return null;

  const status: string = record.status || "pending";
  const submittedAt = record.submitted_at;
  const reviewedAt = record.reviewed_at;
  const reviewedBy = record.reviewed_by;
  const updatedAt = record.updated_at;
  const rejectionReason: string | null = record.rejection_reason;
  const aiNotes: string | null = record.ai_notes;

  // AI auto-decision = reviewed but reviewed_by is null (edge function path)
  const aiAutoApproved = status === "approved" && !reviewedBy;
  const aiAutoRejected = status === "rejected" && !reviewedBy;
  const adminApproved = status === "approved" && !!reviewedBy;
  const adminRejected = status === "rejected" && !!reviewedBy;
  const inManualReview = status === "pending" && !!updatedAt && updatedAt !== submittedAt;

  const steps: Step[] = [
    {
      key: "submitted",
      label: "Documents Submitted",
      description: "Your ID and selfie were received.",
      icon: Upload,
      state: "done",
      timestamp: submittedAt,
    },
    {
      key: "ai",
      label: "AI Verification",
      description: "Our AI checks document validity and face match.",
      icon: Sparkles,
      state:
        aiAutoApproved || aiAutoRejected
          ? "done"
          : inManualReview || adminApproved || adminRejected
          ? "done"
          : status === "pending"
          ? "active"
          : "active",
      timestamp: updatedAt && updatedAt !== submittedAt ? updatedAt : null,
    },
    aiAutoApproved
      ? {
          key: "auto-approved",
          label: "Auto-Approved by AI",
          description: "High-confidence match — no manual review needed.",
          icon: CheckCircle2,
          state: "done",
          timestamp: updatedAt,
        }
      : aiAutoRejected
      ? {
          key: "auto-rejected",
          label: "Auto-Rejected by AI",
          description: "Document could not be verified.",
          icon: XCircle,
          state: "failed",
          timestamp: updatedAt,
        }
      : {
          key: "manual-review",
          label: "Admin Review",
          description: adminApproved || adminRejected
            ? "A reviewer made the final decision."
            : inManualReview
            ? "Routed to our team — usually within a few hours."
            : "Only if AI cannot decide.",
          icon: UserCog,
          state: adminApproved || adminRejected
            ? "done"
            : inManualReview
            ? "active"
            : "pending",
          timestamp: reviewedAt,
        },
    {
      key: "final",
      label:
        adminApproved || aiAutoApproved
          ? "Verified ✓"
          : adminRejected || aiAutoRejected
          ? "Rejected"
          : "Final Decision",
      description:
        adminApproved || aiAutoApproved
          ? "You can now withdraw funds."
          : adminRejected || aiAutoRejected
          ? "Please re-submit clearer documents."
          : "Pending outcome.",
      icon:
        adminApproved || aiAutoApproved
          ? ShieldCheck
          : adminRejected || aiAutoRejected
          ? XCircle
          : Clock,
      state:
        adminApproved || aiAutoApproved
          ? "done"
          : adminRejected || aiAutoRejected
          ? "failed"
          : "pending",
      timestamp: reviewedAt || (aiAutoApproved || aiAutoRejected ? updatedAt : null),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Verification Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="relative space-y-5">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isLast = idx === steps.length - 1;
            return (
              <li key={s.key} className="relative pl-10">
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[14px] top-7 bottom-[-1.25rem] w-px",
                      s.state === "done" ? "bg-primary/60" : "bg-border",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "absolute left-0 top-0 flex items-center justify-center w-7 h-7 rounded-full border-2",
                    s.state === "done" && "bg-primary/15 border-primary text-primary",
                    s.state === "active" && "bg-yellow-500/15 border-yellow-500 text-yellow-500",
                    s.state === "failed" && "bg-destructive/15 border-destructive text-destructive",
                    s.state === "pending" && "bg-muted border-border text-muted-foreground",
                  )}
                >
                  {s.state === "active" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        s.state === "pending" && "text-muted-foreground",
                        s.state === "failed" && "text-destructive",
                      )}
                    >
                      {s.label}
                    </p>
                    {s.timestamp && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTime(s.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Reason Section for Auto-Rejected or Manual Review */}
        {aiAutoRejected && rejectionReason && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Rejection Reason</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              {rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {aiAutoRejected && !rejectionReason && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Rejection Reason</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              AI could not verify your document. Please re-submit clearer images where your face and document text are clearly visible.
            </AlertDescription>
          </Alert>
        )}

        {inManualReview && aiNotes && (
          <Alert className="mt-4 border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400">Sent to Admin Review</AlertTitle>
            <AlertDescription className="text-xs mt-1 text-yellow-700/90 dark:text-yellow-400/90">
              {aiNotes}
            </AlertDescription>
          </Alert>
        )}

        {inManualReview && !aiNotes && (
          <Alert className="mt-4 border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Info className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-700 dark:text-yellow-400">Sent to Admin Review</AlertTitle>
            <AlertDescription className="text-xs mt-1 text-yellow-700/90 dark:text-yellow-400/90">
              Your submission is being reviewed by our team. This usually takes a few hours. We will notify you once the review is complete.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
