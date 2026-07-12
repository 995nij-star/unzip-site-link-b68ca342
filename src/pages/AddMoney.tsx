import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTopupRequests } from "@/hooks/useTopupRequests";
import { usePaymentSettings } from "@/hooks/useSiteSettings";
import { useNavigate, Link } from "react-router-dom";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberInput } from "@/components/ui/cyber-input";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { format } from 'date-fns';
import { 
  Gamepad2, 
  LogOut, 
  ArrowLeft,
  QrCode,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  Copy,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import defaultQrCode from "@/assets/upi-qr-code.png";

export default function AddMoney() {
  const { user, signOut } = useAuth();
  const { requests, isLoading, submitRequest, uploadScreenshot } = useTopupRequests();
  const { payment, isLoading: isPaymentLoading } = usePaymentSettings();
  const navigate = useNavigate();
  
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Use dynamic payment settings or fallback to defaults
  const upiId = payment.upiId || "8415965913@fam";
  const qrCodeUrl = payment.qrCodeUrl || defaultQrCode;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    if (!utr.trim()) return;

    setUploading(true);

    let screenshotUrl: string | undefined;
    if (screenshot) {
      const url = await uploadScreenshot(screenshot);
      if (url) screenshotUrl = url;
    }

    await submitRequest.mutateAsync({
      amount: amountNum,
      utr: utr.trim(),
      screenshotUrl,
    });

    setAmount("");
    setUtr("");
    setScreenshot(null);
    setUploading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-neon-orange/20 text-neon-orange border-neon-orange/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-primary/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <Gamepad2 className="w-8 h-8 text-neon-gold" />
                  <div className="absolute inset-0 bg-neon-gold/30 blur-lg rounded-full" />
                </div>
                <span className="text-xl font-orbitron font-bold text-gradient-gold">
                  Idexopn
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
              <CyberButton 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </CyberButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/wallet">
            <CyberButton variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </CyberButton>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="w-5 h-5 text-neon-green" />
              <span className="text-sm font-rajdhani font-semibold text-neon-green uppercase tracking-wider">
                Add Funds
              </span>
            </div>
            <h1 className="text-3xl font-orbitron font-bold text-foreground">
              Add Money
            </h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Code & Instructions */}
          <div className="space-y-6">
            <div className="premium-card p-6 rounded-2xl">
              <h2 className="text-xl font-orbitron font-bold text-foreground mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-neon-gold" />
                Scan & Pay
              </h2>
              
              <div className="flex justify-center mb-6">
                <div className="relative p-4 bg-white rounded-2xl">
                  {isPaymentLoading ? (
                    <div className="w-56 h-56 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <img 
                      src={qrCodeUrl} 
                      alt="UPI QR Code" 
                      className="w-56 h-56 object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-rajdhani">UPI ID</p>
                    <p className="font-mono text-foreground">{upiId}</p>
                  </div>
                  <CyberButton 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopyUPI}
                  >
                    {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                  </CyberButton>
                </div>

                <div className="p-4 bg-neon-gold/10 border border-neon-gold/30 rounded-lg">
                  <h3 className="font-rajdhani font-semibold text-neon-gold mb-2">How to add money:</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Scan the QR code or copy UPI ID</li>
                    <li>Pay the amount via any UPI app</li>
                    <li>Enter the UTR number from payment</li>
                    <li>Upload payment screenshot (optional)</li>
                    <li>Submit and wait for approval</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Form */}
          <div className="space-y-6">
            <div className="premium-card p-6 rounded-2xl">
              <h2 className="text-xl font-orbitron font-bold text-foreground mb-4">
                Submit Payment Details
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-2">
                    Amount (₹)
                  </label>
                  <CyberInput
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-2">
                    UTR / Transaction ID
                  </label>
                  <CyberInput
                    type="text"
                    placeholder="Enter 12-digit UTR number"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find UTR in your payment app transaction history
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-rajdhani text-muted-foreground mb-2">
                    Payment Screenshot (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {screenshot ? screenshot.name : "Click to upload screenshot"}
                      </span>
                    </label>
                  </div>
                </div>

                <CyberButton
                  type="submit"
                  className="w-full golden-button"
                  disabled={uploading || submitRequest.isPending || !amount || !utr}
                >
                  {uploading || submitRequest.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </CyberButton>
              </form>
            </div>

            {/* Request History */}
            <div className="premium-card p-6 rounded-2xl">
              <h2 className="text-xl font-orbitron font-bold text-foreground mb-4">
                Your Requests
              </h2>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-neon-gold" />
                </div>
              ) : requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 font-rajdhani">
                  No requests yet
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {requests.map((req) => (
                    <div 
                      key={req.id}
                      className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-orbitron text-foreground">₹{req.amount}</p>
                        <p className="text-xs text-muted-foreground font-rajdhani">
                          UTR: {req.utr}
                        </p>
                        <p className="text-xs text-muted-foreground font-rajdhani">
                          {format(new Date(req.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
