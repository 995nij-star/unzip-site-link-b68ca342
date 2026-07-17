import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Eye, CheckCircle, Shield, Search, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function AdminSuspiciousActivity() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["suspicious-activities", statusFilter, severityFilter],
    queryFn: async () => {
      let query = supabase
        .from("suspicious_activities" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("suspicious_activities" as any)
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suspicious-activities"] });
      toast({ title: "Activity reviewed" });
    },
  });

  const filtered = activities?.filter((a: any) =>
    !search ||
    a.activity_type?.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase()) ||
    a.ip_address?.includes(search)
  ) || [];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Reviewed</Badge>;
      case "dismissed":
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Pending</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_accounts_same_ip":
        return "Multiple Accounts (IP)";
      case "duplicate_device":
        return "Duplicate Device";
      case "new_device_login":
        return "New Device Login";
      case "brute_force_login":
        return "Brute Force Attempt";
      case "unusual_wallet_activity":
        return "Unusual Wallet Activity";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Suspicious Activity" description="Fraud detection & security monitoring">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const pendingCount = activities?.filter((a: any) => a.status === "pending").length || 0;
  const highSeverityCount = activities?.filter((a: any) => a.severity === "high" && a.status === "pending").length || 0;

  return (
    <AdminLayout title="Suspicious Activity" description="Fraud detection & security monitoring">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-foreground">{highSeverityCount}</p>
                <p className="text-xs text-muted-foreground">High Severity</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{activities?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Flagged</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by type, description, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["suspicious-activities"] })}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No suspicious activities found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((activity: any) => (
                  <TableRow key={activity.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {getTypeLabel(activity.activity_type)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {activity.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{activity.ip_address}</TableCell>
                    <TableCell>{getSeverityBadge(activity.severity)}</TableCell>
                    <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    <TableCell>
                      {activity.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              reviewMutation.mutate({ id: activity.id, status: "reviewed" })
                            }
                          >
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              reviewMutation.mutate({ id: activity.id, status: "dismissed" })
                            }
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
