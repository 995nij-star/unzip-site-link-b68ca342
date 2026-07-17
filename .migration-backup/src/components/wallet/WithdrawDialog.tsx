import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Banknote, AlertCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useKycStatus } from "@/hooks/useKycStatus";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
}

export function WithdrawDialog({ open, onOpenChange, walletBalance }: WithdrawDialogProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const { submitRequest } = useWithdrawalRequests();
  const { data: kyc } = useKycStatus();
  const kycStatus = kyc?.status || "none";
  const kycApproved = kycStatus === "approved";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kycApproved) return;
    const withdrawAmount = Number(amount);
    if (withdrawAmount < 100) {
      return;
    }
    
    await submitRequest.mutateAsync({
      amount: withdrawAmount,
      upiId,
      accountHolderName: accountHolderName || undefined,
    });
    
    setAmount("");
    setUpiId("");
    setAccountHolderName("");
    onOpenChange(false);
  };

  const withdrawAmount = Number(amount) || 0;
  const isValidAmount = withdrawAmount >= 100 && withdrawAmount <= walletBalance;
  const isValidUpi = /^[\w.-]+@[\w.-]+$/.test(upiId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-foreground flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Request a withdrawal to your UPI account
          </DialogDescription>
        </DialogHeader>

        {!kycApproved ? (
          <div className="py-4 space-y-4">
            <div className="flex flex-col items-center text-center gap-3 p-6 rounded-lg border border-neon-orange/40 bg-neon-orange/10">
              <ShieldAlert className="w-12 h-12 text-neon-orange" />
              <h3 className="font-orbitron text-lg">
                {kycStatus === "pending" ? "Verification under review" : kycStatus === "rejected" ? "Verification rejected" : "Verification required"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {kycStatus === "pending"
                  ? "Your KYC is being reviewed. Withdrawals unlock as soon as it's approved (usually within 24 hours)."
                  : kycStatus === "rejected"
                  ? "Your previous KYC was rejected. Please re-submit a clear selfie and document to enable withdrawals."
                  : "To protect your funds, you must complete a one-time selfie + document verification (Aadhar / PAN / DL / Passport) before withdrawing."}
              </p>
            </div>
            <CyberButton
              type="button"
              className="w-full golden-button"
              onClick={() => { onOpenChange(false); navigate("/kyc"); }}
              disabled={kycStatus === "pending"}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {kycStatus === "pending" ? "Awaiting Review" : kycStatus === "rejected" ? "Re-submit KYC" : "Start KYC Verification"}
            </CyberButton>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="font-orbitron text-2xl text-primary">
              ₹{walletBalance.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (₹)</Label>
            <CyberInput
              id="amount"
              type="number"
              placeholder="Enter amount (min ₹100)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={100}
              max={walletBalance}
              required
            />
            {amount && !isValidAmount && (
              <p className="text-xs text-destructive">
                {withdrawAmount < 100 
                  ? "Minimum withdrawal is ₹100" 
                  : "Amount exceeds your balance"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="upi">UPI ID</Label>
            <CyberInput
              id="upi"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              required
            />
            {upiId && !isValidUpi && (
              <p className="text-xs text-destructive">
                Enter a valid UPI ID (e.g., name@bank)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Account Holder Name (Optional)</Label>
            <CyberInput
              id="name"
              placeholder="Name as per bank account"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
            />
          </div>

          <Alert className="bg-neon-orange/10 border-neon-orange/30">
            <AlertCircle className="h-4 w-4 text-neon-orange" />
            <AlertDescription className="text-sm">
              Withdrawals are processed within 24-48 hours. Make sure your UPI ID is correct.
            </AlertDescription>
          </Alert>

          <DialogFooter className="pt-4">
            <CyberButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </CyberButton>
            <CyberButton
              type="submit"
              className="golden-button"
              disabled={!isValidAmount || !isValidUpi || submitRequest.isPending}
            >
              {submitRequest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Submit Request'
              )}
            </CyberButton>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
