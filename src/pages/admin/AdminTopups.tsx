import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminTopupRequests } from "@/hooks/useTopupRequests";
import { useAuth } from "@/hooks/useAuth";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Loader2, Search, CheckCircle, XCircle, Clock, Eye, IndianRupee, Calendar, Filter, X } from "lucide-react";
import { CyberInput } from "@/components/ui/cyber-input";
import { CyberButton } from "@/components/ui/cyber-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AdminTopups() {
  const { user } = useAuth();
  const { requests, isLoading, approveRequest, rejectRequest } = useAdminTopupRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.utr.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = activeTab === "all" || r.status === activeTab;
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const requestDate = new Date(r.created_at);
      if (dateFrom && dateTo) {
        matchesDate = isWithinInterval(requestDate, {
          start: startOfDay(parseISO(dateFrom)),
          end: endOfDay(parseISO(dateTo))
        });
      } else if (dateFrom) {
        matchesDate = requestDate >= startOfDay(parseISO(dateFrom));
      } else if (dateTo) {
        matchesDate = requestDate <= endOfDay(parseISO(dateTo));
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    await approveRequest.mutateAsync({ requestId, adminId: user.id });
    setIsViewDialogOpen(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await rejectRequest.mutateAsync({ 
      requestId: selectedRequest.id, 
      reason: rejectReason 
    });
    setIsRejectDialogOpen(false);
    setRejectReason("");
  };

  const openViewDialog = (request: any) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  const openRejectDialog = (request: any) => {
    setSelectedRequest(request);
    setRejectReason("");
    setIsRejectDialogOpen(true);
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const hasFilters = dateFrom || dateTo;

  // Calculate summary stats for filtered results
  const summaryStats = {
    total: filteredRequests.length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    rejected: filteredRequests.filter(r => r.status === 'rejected').length,
    pending: filteredRequests.filter(r => r.status === 'pending').length,
    totalAmount: filteredRequests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + Number(r.amount), 0),
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <AdminLayout title="Topup Requests" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Topup Requests" 
      description="Manage user wallet topup requests"
    >
      {/* Stats */}
      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-neon-orange/10 border border-neon-orange/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-orange/20">
              <IndianRupee className="w-5 h-5 text-neon-orange" />
            </div>
            <div>
              <p className="font-rajdhani text-neon-orange font-semibold">
                {pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Waiting for approval
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] max-w-md">
            <CyberInput
              placeholder="Search by username or UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <CyberButton variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                Date Filter
                {hasFilters && <Badge className="ml-1 bg-primary/20 text-primary">Active</Badge>}
              </CyberButton>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-card border-border" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                {hasFilters && (
                  <CyberButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </CyberButton>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Summary Stats */}
        {(hasFilters || searchQuery) && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="text-xs text-muted-foreground">Total Requests</p>
              <p className="font-orbitron text-lg text-foreground">{summaryStats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/30">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="font-orbitron text-lg text-neon-green">{summaryStats.approved}</p>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="font-orbitron text-lg text-destructive">{summaryStats.rejected}</p>
            </div>
            <div className="p-3 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-orbitron text-lg text-neon-orange">{summaryStats.pending}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="font-orbitron text-lg text-primary">₹{summaryStats.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="pending" className="font-rajdhani">
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="approved" className="font-rajdhani">Approved</TabsTrigger>
          <TabsTrigger value="rejected" className="font-rajdhani">Rejected</TabsTrigger>
          <TabsTrigger value="all" className="font-rajdhani">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-rajdhani">User</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Amount</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">UTR</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="border-border">
                      <TableCell className="font-rajdhani font-medium text-foreground">
                        {request.username}
                      </TableCell>
                      <TableCell>
                        <span className="font-orbitron text-neon-green">
                          ₹{Number(request.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {request.utr}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-muted-foreground font-rajdhani text-sm">
                        {format(new Date(request.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CyberButton
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(request)}
                          >
                            <Eye className="w-4 h-4" />
                          </CyberButton>
                          {request.status === 'pending' && (
                            <>
                              <CyberButton
                                variant="outline"
                                size="sm"
                                className="text-neon-green border-neon-green/30 hover:bg-neon-green/10"
                                onClick={() => handleApprove(request.id)}
                                disabled={approveRequest.isPending}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </CyberButton>
                              <CyberButton
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => openRejectDialog(request)}
                                disabled={rejectRequest.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </CyberButton>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-foreground">
              Topup Request Details
            </DialogTitle>
            <DialogDescription>
              Review the payment details before approving
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Username</p>
                  <p className="font-rajdhani font-medium text-foreground">
                    {selectedRequest.username}
                  </p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="font-orbitron text-neon-green">
                    ₹{Number(selectedRequest.amount).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">UTR / Transaction ID</p>
                <p className="font-mono text-foreground">{selectedRequest.utr}</p>
              </div>

              <div className="p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div className="p-3 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                <p className="font-rajdhani text-foreground">
                  {format(new Date(selectedRequest.created_at), 'MMM dd, yyyy HH:mm:ss')}
                </p>
              </div>

              {selectedRequest.screenshot_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Screenshot</p>
                  <a 
                    href={selectedRequest.screenshot_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={selectedRequest.screenshot_url} 
                      alt="Payment Screenshot" 
                      className="max-w-full h-auto rounded-lg border border-border"
                    />
                  </a>
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-xs text-destructive mb-1">Admin Notes</p>
                  <p className="text-foreground">{selectedRequest.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <CyberButton
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </CyberButton>
            {selectedRequest?.status === 'pending' && (
              <>
                <CyberButton
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    openRejectDialog(selectedRequest);
                  }}
                >
                  Reject
                </CyberButton>
                <CyberButton
                  className="golden-button"
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={approveRequest.isPending}
                >
                  {approveRequest.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Approve'
                  )}
                </CyberButton>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-foreground">
              Reject Request
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this topup request
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Invalid UTR number, Screenshot doesn't match..."
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <CyberButton
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </CyberButton>
            <CyberButton
              variant="destructive"
              onClick={handleReject}
              disabled={rejectRequest.isPending}
            >
              {rejectRequest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Reject Request'
              )}
            </CyberButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
