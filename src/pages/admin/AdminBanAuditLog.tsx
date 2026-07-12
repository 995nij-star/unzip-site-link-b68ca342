import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useBanAuditLog, exportBanAuditLogToCSV, BanAuditLogEntry } from "@/hooks/useBanAuditLog";
import { format } from "date-fns";
import { Loader2, Search, Download, Ban, CheckCircle, Filter } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminBanAuditLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<'all' | 'ban' | 'unban'>('all');
  const { toast } = useToast();

  const { data: logs, isLoading, error } = useBanAuditLog({
    action: actionFilter,
  });

  const filteredLogs = logs?.filter(log =>
    log.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.admin_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (!filteredLogs?.length) {
      toast({
        title: "No data to export",
        description: "There are no audit logs to export.",
        variant: "destructive",
      });
      return;
    }

    const csv = exportBanAuditLogToCSV(filteredLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ban-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredLogs.length} audit log entries.`,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Ban Audit Log" description="Loading audit logs...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Ban Audit Log" description="Error loading audit logs">
        <div className="text-center text-destructive py-12">
          Failed to load audit logs. Please try again.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Ban Audit Log" description="Track all ban and unban actions by administrators">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <CyberInput
          placeholder="Search by user, admin, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
          className="flex-1 max-w-md"
        />
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={(val) => setActionFilter(val as 'all' | 'ban' | 'unban')}>
            <SelectTrigger className="w-32 bg-card border-border">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="ban">Bans Only</SelectItem>
              <SelectItem value="unban">Unbans Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CyberButton variant="outline" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </CyberButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="text-muted-foreground font-rajdhani text-sm">Total Actions</div>
          <div className="text-2xl font-orbitron font-bold text-foreground">{logs?.length ?? 0}</div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="text-muted-foreground font-rajdhani text-sm">Total Bans</div>
          <div className="text-2xl font-orbitron font-bold text-destructive">
            {logs?.filter(l => l.action === 'ban').length ?? 0}
          </div>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="text-muted-foreground font-rajdhani text-sm">Total Unbans</div>
          <div className="text-2xl font-orbitron font-bold text-neon-green">
            {logs?.filter(l => l.action === 'unban').length ?? 0}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-gradient-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Action</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">User</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Admin</TableHead>
              <TableHead className="text-muted-foreground font-rajdhani">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs?.map((log) => (
                <TableRow key={log.id} className="border-border">
                  <TableCell className="text-muted-foreground font-rajdhani">
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {log.action === 'ban' ? (
                      <Badge variant="destructive" className="font-rajdhani">
                        <Ban className="w-3 h-3 mr-1" />
                        Ban
                      </Badge>
                    ) : (
                      <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 font-rajdhani">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Unban
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-rajdhani font-medium text-foreground block">
                        {log.username}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.user_id.slice(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-rajdhani text-primary">
                      {log.admin_username}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-rajdhani max-w-xs truncate">
                    {log.reason || <span className="italic text-muted-foreground/50">No reason provided</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
