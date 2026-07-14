import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { usePresence } from "@/hooks/usePresence";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { lazy, Suspense } from "react";

import { MaintenanceGuard } from "@/components/MaintenanceGuard";

// Lazy-loaded pages for route-level code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const Wallet = lazy(() => import("./pages/Wallet"));
const AddMoney = lazy(() => import("./pages/AddMoney"));
const SendMoney = lazy(() => import("./pages/SendMoney"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Search = lazy(() => import("./pages/Search"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const LiveStreams = lazy(() => import("./pages/LiveStreams"));
const StreamViewer = lazy(() => import("./pages/StreamViewer"));
const Messages = lazy(() => import("./pages/Messages"));
const ConversationView = lazy(() => import("./pages/ConversationView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminTournaments = lazy(() => import("./pages/admin/AdminTournaments"));
const AdminAnnouncements = lazy(() => import("./pages/admin/AdminAnnouncements"));
const AdminWallets = lazy(() => import("./pages/admin/AdminWallets"));
const AdminTopups = lazy(() => import("./pages/admin/AdminTopups"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminBanAuditLog = lazy(() => import("./pages/admin/AdminBanAuditLog"));
const AdminSupportTickets = lazy(() => import("./pages/admin/AdminSupportTickets"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminGiftCodes = lazy(() => import("./pages/admin/AdminGiftCodes"));
const AdminAIAssistant = lazy(() => import("./pages/admin/AdminAIAssistant"));
const AdminChats = lazy(() => import("./pages/admin/AdminChats"));
const AdminAIChatLogs = lazy(() => import("./pages/admin/AdminAIChatLogs"));
const AdminSuspiciousActivity = lazy(() => import("./pages/admin/AdminSuspiciousActivity"));
const AdminUserLookup = lazy(() => import("./pages/admin/AdminUserLookup"));
const Clips = lazy(() => import("./pages/Clips"));
const ClipViewer = lazy(() => import("./pages/ClipViewer"));
const ClipShortRedirect = lazy(() => import("./pages/ClipShortRedirect"));
const ClipsReels = lazy(() => import("./pages/ClipsReels"));
const TrendingClips = lazy(() => import("./pages/TrendingClips"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const FollowingClips = lazy(() => import("./pages/FollowingClips"));
const Discover = lazy(() => import("./pages/Discover"));
const ModeratorApply = lazy(() => import("./pages/ModeratorApply"));
const AdminModApplications = lazy(() => import("./pages/admin/AdminModApplications"));
const AdminSystemControls = lazy(() => import("./pages/admin/AdminSystemControls"));
const AdminLiveMonitor = lazy(() => import("./pages/admin/AdminLiveMonitor"));
const AdminAutomationRules = lazy(() => import("./pages/admin/AdminAutomationRules"));
const AdminAPKManager = lazy(() => import("./pages/admin/AdminAPKManager"));
const AdminLoginTracker = lazy(() => import("./pages/admin/AdminLoginTracker"));
const AdminSiteScanner = lazy(() => import("./pages/admin/AdminSiteScanner"));
const AdminFraudMonitor = lazy(() => import("./pages/admin/AdminFraudMonitor"));
const AdminLockedAccounts = lazy(() => import("./pages/admin/AdminLockedAccounts"));
const AdminClipsManager = lazy(() => import("./pages/admin/AdminClipsManager"));
const AdminContentEditor = lazy(() => import("./pages/admin/AdminContentEditor"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminNotificationManager = lazy(() => import("./pages/admin/AdminNotificationManager"));
const AdminMaintenanceMode = lazy(() => import("./pages/admin/AdminMaintenanceMode"));
const AdminRolesManager = lazy(() => import("./pages/admin/AdminRolesManager"));
const AdminDetectionCenter = lazy(() => import("./pages/admin/AdminDetectionCenter"));
const ScreenRecord = lazy(() => import("./pages/ScreenRecord"));
const AIChatWidgetGate = lazy(() => import("@/components/AIChatWidgetGate"));
const Install = lazy(() => import("./pages/Install"));
const DownloadAPK = lazy(() => import("./pages/DownloadAPK"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Premium = lazy(() => import("./pages/Premium"));
const VerifyHuman = lazy(() => import("./pages/VerifyHuman"));
const AdminTestZone = lazy(() => import("./pages/admin/AdminTestZone"));
const AdminUserLocations = lazy(() => import("./pages/admin/AdminUserLocations"));
const AdminKyc = lazy(() => import("./pages/admin/AdminKyc"));
const KycVerification = lazy(() => import("./pages/KycVerification"));
const DeveloperApi = lazy(() => import("./pages/DeveloperApi"));
const Sessions = lazy(() => import("./pages/Sessions"));
const AdminDeveloperApi = lazy(() => import("./pages/admin/AdminDeveloperApi"));
const AdminMoneyTransfers = lazy(() => import("./pages/admin/AdminMoneyTransfers"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/AdminPaymentMethods"));
import { LocationPermissionPrompt } from "@/components/LocationPermissionPrompt";
import { CommandPalette } from "@/components/CommandPalette";
import { FloatingActions } from "@/components/FloatingActions";

// Luxury enterprise loading state with animated aurora + glass spinner
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background aurora-bg">
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl gradient-flow opacity-80 blur-xl" />
          <div className="relative w-16 h-16 rounded-2xl glass-luxury-strong flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        </div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-heading">
          Loading
        </div>
      </div>
    </div>
  );
}


// Presence tracker - must be inside AuthProvider
const PresenceTracker = () => {
  usePresence();
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — prevents refetch storms
      gcTime: 5 * 60_000, // 5 min garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LanguageProvider>
        <ThemeProvider>
          <PresenceTracker />
          <LocationPermissionPrompt />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CommandPalette />
            <FloatingActions />
            <Suspense fallback={<PageLoader />}>
              <MaintenanceGuard>

              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/install" element={<Install />} />
                <Route path="/download" element={<DownloadAPK />} />
                <Route path="/download-apk" element={<DownloadAPK />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
                <Route path="/wallet/add" element={<ProtectedRoute><AddMoney /></ProtectedRoute>} />
                <Route path="/wallet/send" element={<ProtectedRoute><SendMoney /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                <Route path="/streams" element={<ProtectedRoute><LiveStreams /></ProtectedRoute>} />
                <Route path="/streams/:id" element={<ProtectedRoute><StreamViewer /></ProtectedRoute>} />
                <Route path="/screen-record" element={<ProtectedRoute><ScreenRecord /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/messages/:id" element={<ProtectedRoute><ConversationView /></ProtectedRoute>} />
                <Route path="/clips" element={<ProtectedRoute><Clips /></ProtectedRoute>} />
                <Route path="/clips/reels" element={<ProtectedRoute><ClipsReels /></ProtectedRoute>} />
                <Route path="/clips/following" element={<ProtectedRoute><FollowingClips /></ProtectedRoute>} />
                <Route path="/clips/trending" element={<ProtectedRoute><TrendingClips /></ProtectedRoute>} />
                <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
                <Route path="/clip/:id" element={<ClipViewer />} />
                <Route path="/c/:code" element={<ClipShortRedirect />} />
                <Route path="/creator/:userId" element={<CreatorProfile />} />
                <Route path="/moderator-apply" element={<ProtectedRoute><ModeratorApply /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/premium" element={<ProtectedRoute><Premium /></ProtectedRoute>} />
                <Route path="/verify-human" element={<ProtectedRoute><VerifyHuman /></ProtectedRoute>} />
                <Route path="/kyc" element={<ProtectedRoute><KycVerification /></ProtectedRoute>} />
                <Route path="/developer/api" element={<ProtectedRoute><DeveloperApi /></ProtectedRoute>} />
                <Route path="/developers" element={<ProtectedRoute><DeveloperApi /></ProtectedRoute>} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                <Route path="/admin/tournaments" element={<AdminProtectedRoute><AdminTournaments /></AdminProtectedRoute>} />
                <Route path="/admin/announcements" element={<AdminProtectedRoute><AdminAnnouncements /></AdminProtectedRoute>} />
                <Route path="/admin/wallets" element={<AdminProtectedRoute><AdminWallets /></AdminProtectedRoute>} />
                <Route path="/admin/topups" element={<AdminProtectedRoute><AdminTopups /></AdminProtectedRoute>} />
                <Route path="/admin/withdrawals" element={<AdminProtectedRoute><AdminWithdrawals /></AdminProtectedRoute>} />
                <Route path="/admin/ban-audit" element={<AdminProtectedRoute><AdminBanAuditLog /></AdminProtectedRoute>} />
                <Route path="/admin/support" element={<AdminProtectedRoute><AdminSupportTickets /></AdminProtectedRoute>} />
                <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                <Route path="/admin/gift-codes" element={<AdminProtectedRoute><AdminGiftCodes /></AdminProtectedRoute>} />
                <Route path="/admin/ai" element={<AdminProtectedRoute><AdminAIAssistant /></AdminProtectedRoute>} />
                <Route path="/admin/chats" element={<AdminProtectedRoute><AdminChats /></AdminProtectedRoute>} />
                <Route path="/admin/ai-chats" element={<AdminProtectedRoute><AdminAIChatLogs /></AdminProtectedRoute>} />
                <Route path="/admin/suspicious-activity" element={<AdminProtectedRoute><AdminSuspiciousActivity /></AdminProtectedRoute>} />
                <Route path="/admin/user-lookup" element={<AdminProtectedRoute><AdminUserLookup /></AdminProtectedRoute>} />
                <Route path="/admin/mod-applications" element={<AdminProtectedRoute><AdminModApplications /></AdminProtectedRoute>} />
                <Route path="/admin/system-controls" element={<AdminProtectedRoute><AdminSystemControls /></AdminProtectedRoute>} />
                <Route path="/admin/live-monitor" element={<AdminProtectedRoute><AdminLiveMonitor /></AdminProtectedRoute>} />
                <Route path="/admin/automation-rules" element={<AdminProtectedRoute><AdminAutomationRules /></AdminProtectedRoute>} />
                <Route path="/admin/apk-manager" element={<AdminProtectedRoute><AdminAPKManager /></AdminProtectedRoute>} />
                <Route path="/admin/login-tracker" element={<AdminProtectedRoute><AdminLoginTracker /></AdminProtectedRoute>} />
                <Route path="/admin/site-scanner" element={<AdminProtectedRoute><AdminSiteScanner /></AdminProtectedRoute>} />
                <Route path="/admin/fraud-monitor" element={<AdminProtectedRoute><AdminFraudMonitor /></AdminProtectedRoute>} />
                <Route path="/admin/locked-accounts" element={<AdminProtectedRoute><AdminLockedAccounts /></AdminProtectedRoute>} />
                <Route path="/admin/clips" element={<AdminProtectedRoute><AdminClipsManager /></AdminProtectedRoute>} />
                <Route path="/admin/content-editor" element={<AdminProtectedRoute><AdminContentEditor /></AdminProtectedRoute>} />
                <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />
                <Route path="/admin/notification-manager" element={<AdminProtectedRoute><AdminNotificationManager /></AdminProtectedRoute>} />
                <Route path="/admin/maintenance" element={<AdminProtectedRoute><AdminMaintenanceMode /></AdminProtectedRoute>} />
                <Route path="/admin/roles" element={<AdminProtectedRoute><AdminRolesManager /></AdminProtectedRoute>} />
                <Route path="/admin/detection" element={<AdminProtectedRoute><AdminDetectionCenter /></AdminProtectedRoute>} />
                <Route path="/admin/test-zone" element={<AdminProtectedRoute><AdminTestZone /></AdminProtectedRoute>} />
                <Route path="/admin/user-locations" element={<AdminProtectedRoute><AdminUserLocations /></AdminProtectedRoute>} />
                <Route path="/admin/kyc" element={<AdminProtectedRoute><AdminKyc /></AdminProtectedRoute>} />
                <Route path="/admin/developer-api" element={<AdminProtectedRoute><AdminDeveloperApi /></AdminProtectedRoute>} />
                <Route path="/admin/money-transfers" element={<AdminProtectedRoute><AdminMoneyTransfers /></AdminProtectedRoute>} />
                <Route path="/admin/payment-methods" element={<AdminProtectedRoute><AdminPaymentMethods /></AdminProtectedRoute>} />
                <Route path="/clone/admin/payment-methods" element={<AdminProtectedRoute><AdminPaymentMethods /></AdminProtectedRoute>} />
                <Route path="/clone/admin/money-transfers" element={<AdminProtectedRoute><AdminMoneyTransfers /></AdminProtectedRoute>} />
                <Route path="/clone/admin/developer-api" element={<AdminProtectedRoute><AdminDeveloperApi /></AdminProtectedRoute>} />
                <Route path="/clone/admin/test-zone" element={<AdminProtectedRoute><AdminTestZone /></AdminProtectedRoute>} />
                <Route path="/clone/admin/user-locations" element={<AdminProtectedRoute><AdminUserLocations /></AdminProtectedRoute>} />
                <Route path="/clone/admin/kyc" element={<AdminProtectedRoute><AdminKyc /></AdminProtectedRoute>} />

                {/* Clone Admin Routes — hidden mirror of /admin/* on the same database */}
                <Route path="/clone/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="/clone/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                <Route path="/clone/admin/tournaments" element={<AdminProtectedRoute><AdminTournaments /></AdminProtectedRoute>} />
                <Route path="/clone/admin/announcements" element={<AdminProtectedRoute><AdminAnnouncements /></AdminProtectedRoute>} />
                <Route path="/clone/admin/wallets" element={<AdminProtectedRoute><AdminWallets /></AdminProtectedRoute>} />
                <Route path="/clone/admin/topups" element={<AdminProtectedRoute><AdminTopups /></AdminProtectedRoute>} />
                <Route path="/clone/admin/withdrawals" element={<AdminProtectedRoute><AdminWithdrawals /></AdminProtectedRoute>} />
                <Route path="/clone/admin/ban-audit" element={<AdminProtectedRoute><AdminBanAuditLog /></AdminProtectedRoute>} />
                <Route path="/clone/admin/support" element={<AdminProtectedRoute><AdminSupportTickets /></AdminProtectedRoute>} />
                <Route path="/clone/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                <Route path="/clone/admin/gift-codes" element={<AdminProtectedRoute><AdminGiftCodes /></AdminProtectedRoute>} />
                <Route path="/clone/admin/ai" element={<AdminProtectedRoute><AdminAIAssistant /></AdminProtectedRoute>} />
                <Route path="/clone/admin/chats" element={<AdminProtectedRoute><AdminChats /></AdminProtectedRoute>} />
                <Route path="/clone/admin/ai-chats" element={<AdminProtectedRoute><AdminAIChatLogs /></AdminProtectedRoute>} />
                <Route path="/clone/admin/suspicious-activity" element={<AdminProtectedRoute><AdminSuspiciousActivity /></AdminProtectedRoute>} />
                <Route path="/clone/admin/user-lookup" element={<AdminProtectedRoute><AdminUserLookup /></AdminProtectedRoute>} />
                <Route path="/clone/admin/mod-applications" element={<AdminProtectedRoute><AdminModApplications /></AdminProtectedRoute>} />
                <Route path="/clone/admin/system-controls" element={<AdminProtectedRoute><AdminSystemControls /></AdminProtectedRoute>} />
                <Route path="/clone/admin/live-monitor" element={<AdminProtectedRoute><AdminLiveMonitor /></AdminProtectedRoute>} />
                <Route path="/clone/admin/automation-rules" element={<AdminProtectedRoute><AdminAutomationRules /></AdminProtectedRoute>} />
                <Route path="/clone/admin/apk-manager" element={<AdminProtectedRoute><AdminAPKManager /></AdminProtectedRoute>} />
                <Route path="/clone/admin/login-tracker" element={<AdminProtectedRoute><AdminLoginTracker /></AdminProtectedRoute>} />
                <Route path="/clone/admin/site-scanner" element={<AdminProtectedRoute><AdminSiteScanner /></AdminProtectedRoute>} />
                <Route path="/clone/admin/fraud-monitor" element={<AdminProtectedRoute><AdminFraudMonitor /></AdminProtectedRoute>} />
                <Route path="/clone/admin/locked-accounts" element={<AdminProtectedRoute><AdminLockedAccounts /></AdminProtectedRoute>} />
                <Route path="/clone/admin/clips" element={<AdminProtectedRoute><AdminClipsManager /></AdminProtectedRoute>} />
                <Route path="/clone/admin/content-editor" element={<AdminProtectedRoute><AdminContentEditor /></AdminProtectedRoute>} />
                <Route path="/clone/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />
                <Route path="/clone/admin/notification-manager" element={<AdminProtectedRoute><AdminNotificationManager /></AdminProtectedRoute>} />
                <Route path="/clone/admin/maintenance" element={<AdminProtectedRoute><AdminMaintenanceMode /></AdminProtectedRoute>} />
                <Route path="/clone/admin/roles" element={<AdminProtectedRoute><AdminRolesManager /></AdminProtectedRoute>} />
                <Route path="/clone/admin/detection" element={<AdminProtectedRoute><AdminDetectionCenter /></AdminProtectedRoute>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </MaintenanceGuard>
            </Suspense>
          </BrowserRouter>
          <Suspense fallback={null}>
            <AIChatWidgetGate />
          </Suspense>
        </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;