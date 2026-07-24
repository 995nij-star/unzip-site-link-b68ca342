import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { usePresence } from "@/hooks/usePresence";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
const Clips = lazy(() => import("./pages/Clips"));
const ClipViewer = lazy(() => import("./pages/ClipViewer"));
const ClipShortRedirect = lazy(() => import("./pages/ClipShortRedirect"));
const ClipsReels = lazy(() => import("./pages/ClipsReels"));
const TrendingClips = lazy(() => import("./pages/TrendingClips"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const FollowingClips = lazy(() => import("./pages/FollowingClips"));
const Discover = lazy(() => import("./pages/Discover"));
const ModeratorApply = lazy(() => import("./pages/ModeratorApply"));
const ScreenRecord = lazy(() => import("./pages/ScreenRecord"));
const AIChatWidgetGate = lazy(() => import("@/components/AIChatWidgetGate"));
const Install = lazy(() => import("./pages/Install"));
const DownloadAPK = lazy(() => import("./pages/DownloadAPK"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Premium = lazy(() => import("./pages/Premium"));
const VerifyHuman = lazy(() => import("./pages/VerifyHuman"));
const KycVerification = lazy(() => import("./pages/KycVerification"));
const DeveloperApi = lazy(() => import("./pages/DeveloperApi"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const Sessions = lazy(() => import("./pages/Sessions"));
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
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
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
