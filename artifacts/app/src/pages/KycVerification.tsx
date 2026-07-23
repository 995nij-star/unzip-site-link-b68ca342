import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, ShieldCheck, AlertCircle, CheckCircle2, Clock, XCircle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useKycStatus } from "@/hooks/useKycStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KycTimeline } from "@/components/kyc/KycTimeline";

const DOC_TYPES = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "driving_license", label: "Driving License" },
  { value: "passport", label: "Passport" },
  { value: "voter_id", label: "Voter ID" },
];

export default function KycVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: kyc, refetch } = useKycStatus();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState("aadhar");
  const [docNumber, setDocNumber] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      toast.error("Could not access camera. Please grant permission.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setSelfieBlob(blob);
      setSelfiePreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  const submit = async (): Promise<void> => {
    if (!user) return;
    if (!fullName.trim()) { toast.error("Enter your full name"); return; }
    if (!docFile) { toast.error("Upload your document image"); return; }
    if (!selfieBlob) { toast.error("Capture your selfie"); return; }
    if (docFile.size > 8 * 1024 * 1024) { toast.error("Document must be under 8MB"); return; }

    setSubmitting(true);
    try {
      const ts = Date.now();
      const docPath = `${user.id}/document-${ts}.${docFile.name.split(".").pop() || "jpg"}`;
      const selfiePath = `${user.id}/selfie-${ts}.jpg`;

      const [docUp, selfieUp] = await Promise.all([
        supabase.storage.from("kyc-documents").upload(docPath, docFile, { upsert: true }),
        supabase.storage.from("kyc-documents").upload(selfiePath, selfieBlob, {
          upsert: true,
          contentType: "image/jpeg",
        }),
      ]);
      if (docUp.error) throw docUp.error;
      if (selfieUp.error) throw selfieUp.error;

      const payload = {
        user_id: user.id,
        full_name: fullName.trim(),
        document_type: docType,
        document_number: docNumber.trim() || null,
        document_url: docPath,
        selfie_url: selfiePath,
        status: "pending",
        rejection_reason: null,
        ai_notes: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("kyc_verifications")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      toast.success("KYC submitted. Running AI verification...");
      await refetch();

      // Trigger AI verification
      try {
        const { data: ai, error: aiErr } = await supabase.functions.invoke("kyc-ai-verify");
        if (aiErr) throw aiErr;
        if (ai?.decision === "approve") {
          toast.success("✓ AI verified — your KYC is approved!");
        } else if (ai?.decision === "reject") {
          toast.error(ai?.verdict?.reason || "AI could not verify your document. Please re-submit clearer images.");
        } else {
          toast.message("AI sent your KYC to manual review — usually within a few hours.");
        }
        await refetch();
      } catch (aiErr: any) {
        console.error("AI verify failed", aiErr);
        toast.message("Submitted for manual review.");
      }
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };


  const status = kyc?.status || "none";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Identity Verification (KYC)
          </h1>
        </div>

        {status === "approved" && (
          <Alert className="border-green-500/40 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Verified</AlertTitle>
            <AlertDescription>Your identity has been approved. You can now withdraw funds.</AlertDescription>
          </Alert>
        )}
        {status === "pending" && (
          <Alert className="border-yellow-500/40 bg-yellow-500/10">
            <Clock className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Under review</AlertTitle>
            <AlertDescription>Submitted on {new Date((kyc!.record as any)!.submitted_at).toLocaleString()}. We'll notify you within 24 hours.</AlertDescription>
          </Alert>
        )}
        {status === "rejected" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Rejected</AlertTitle>
            <AlertDescription>{kyc?.record?.rejection_reason || "Please re-submit with clearer documents."}</AlertDescription>
          </Alert>
        )}

        {kyc?.record && <KycTimeline record={kyc.record} />}

        {(status === "none" || status === "rejected") && (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Verification is required before you can withdraw funds. Please provide a government ID and a live selfie.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Full Name (as on document)</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rahul Sharma" maxLength={100} />
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Number (optional)</Label>
                  <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={50} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Document Photo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <input
                  id="doc-file"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
                <Label htmlFor="doc-file" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition">
                    {docFile ? (
                      <div>
                        <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm font-medium">{docFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(docFile.size / 1024).toFixed(0)} KB · tap to change</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm">Tap to upload document (image or PDF, max 8MB)</p>
                      </div>
                    )}
                  </div>
                </Label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Live Selfie</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {selfiePreview ? (
                  <div className="space-y-2">
                    <img src={selfiePreview} alt="Selfie" className="w-full rounded-lg" />
                    <Button variant="outline" size="sm" onClick={() => { setSelfieBlob(null); setSelfiePreview(null); }}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Retake
                    </Button>
                  </div>
                ) : cameraOn ? (
                  <div className="space-y-2">
                    <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
                    <div className="flex gap-2">
                      <Button onClick={captureSelfie} className="flex-1"><Camera className="w-4 h-4 mr-2" /> Capture</Button>
                      <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={startCamera} variant="outline" className="w-full h-24 border-dashed">
                    <Camera className="w-6 h-6 mr-2" />
                    Open Camera & Take Selfie
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Look straight at the camera in good lighting. Don't wear sunglasses or hat.
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={submit}
              disabled={submitting || !fullName || !docFile || !selfieBlob}
              className="w-full h-12 text-base"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit for Verification"}
            </Button>
          </>
        )}

        {status === "pending" && kyc?.record && (
          <Card>
            <CardHeader><CardTitle className="text-base">Submitted Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{kyc.record.full_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Document</span><Badge variant="outline">{kyc.record.document_type}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>Pending Review</Badge></div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
