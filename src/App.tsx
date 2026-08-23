import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, initAuthListener } from './stores/authStore';
import type { UserPermissions } from './types';
import { useNotificationsStore } from './stores/notificationsStore';
import { useMembersStore } from './stores/membersStore';
import { useIdeasStore } from './stores/ideasStore';
import { AppShell } from './components/layout/AppShell';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MembersPage } from './pages/admin/MembersPage';
import { MemberDetailPage } from './pages/admin/MemberDetailPage';
import { AllTasksPage } from './pages/admin/AllTasksPage';
import { ApprovalsPage } from './pages/admin/ApprovalsPage';
import { MemberHome } from './pages/member/MemberHome';
import { MyTasksPage } from './pages/member/MyTasksPage';
import { IdeasPage } from './pages/shared/IdeasPage';
import { ReviewsPage } from './pages/shared/ReviewsPage';
import { ShowsPage } from './pages/shows/ShowsPage';
import { ShowsManagePage } from './pages/admin/ShowsManagePage';
import { PollsPage } from './pages/admin/PollsPage';
import { VotePage } from './pages/vote/VotePage';
import { WelcomePage } from './pages/welcome/WelcomePage';
import { MemberProfilePage } from './pages/welcome/MemberProfilePage';
import { ReviewsPublicPage } from './pages/reviews/ReviewsPublicPage';
import { ShowDetailPage } from './pages/reviews/ShowDetailPage';
import { SyncPage } from './pages/admin/SyncPage';
import { ApplicationsPage } from './pages/admin/ApplicationsPage';
import { ApplyPage } from './pages/public/ApplyPage';
import { AuditionPage } from './pages/public/AuditionPage';
import { SuggestionsPage } from './pages/public/SuggestionsPage';
import { SuggestionsAdminPage } from './pages/admin/SuggestionsAdminPage';
import { AuditionsAdminPage } from './pages/admin/AuditionsAdminPage';
import { LeaderboardPage } from './pages/shared/LeaderboardPage';
import { MeetingsPage } from './pages/admin/MeetingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, initialized } = useAuthStore();
  if (!initialized) return null;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuthStore();
  if (!profile?.isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PermissionRoute({ permission, children }: { permission: keyof UserPermissions; children: React.ReactNode }) {
  const { can } = useAuthStore();
  if (!can(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function HomePage() {
  const { profile } = useAuthStore();
  if (profile?.isAdmin) return <AdminDashboard />;
  return <MemberHome />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, initialized } = useAuthStore();
  if (!initialized) return null;
  if (firebaseUser) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { firebaseUser, profile, initialized } = useAuthStore();
  const { listen, stopListening } = useNotificationsStore();
  const { loadPendingCount } = useMembersStore();
  const { loadIdeas, updateNewIdeasCount } = useIdeasStore();

  useEffect(() => {
    initAuthListener();
  }, []);

  useEffect(() => {
    if (firebaseUser && profile) {
      listen(firebaseUser.uid);
      if (profile.isAdmin) loadPendingCount();
      loadIdeas().then(() => updateNewIdeasCount(firebaseUser.uid));
    }
    return () => stopListening();
  }, [firebaseUser, profile, listen, stopListening, loadPendingCount, loadIdeas, updateNewIdeasCount]);

  if (!initialized) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/dashboard" element={<HomePage />} />
          <Route path="/members" element={<PermissionRoute permission="viewMembers"><MembersPage /></PermissionRoute>} />
          <Route path="/members/:id" element={<PermissionRoute permission="viewMembers"><MemberDetailPage /></PermissionRoute>} />
          <Route path="/tasks" element={<PermissionRoute permission="viewAllTasks"><AllTasksPage /></PermissionRoute>} />
          <Route path="/approvals" element={<AdminRoute><ApprovalsPage /></AdminRoute>} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/reviews" element={<PermissionRoute permission="postReviews"><ReviewsPage /></PermissionRoute>} />
          <Route path="/shows" element={<ShowsPage />} />
          <Route path="/shows/manage" element={<PermissionRoute permission="manageShows"><ShowsManagePage /></PermissionRoute>} />
          <Route path="/polls" element={<PermissionRoute permission="managePolls"><PollsPage /></PermissionRoute>} />
          <Route path="/sync" element={<AdminRoute><SyncPage /></AdminRoute>} />
          <Route path="/applications" element={<AdminRoute><ApplicationsPage /></AdminRoute>} />
          <Route path="/auditions" element={<AdminRoute><AuditionsAdminPage /></AdminRoute>} />
          <Route path="/suggestions-inbox" element={<AdminRoute><SuggestionsAdminPage /></AdminRoute>} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
        </Route>
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/audition" element={<AuditionPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/vote/:pollId" element={<VotePage />} />
        <Route path="/m/:uid" element={<MemberProfilePage />} />
        <Route path="/show-reviews" element={<ReviewsPublicPage />} />
        <Route path="/show-reviews/:showId" element={<ShowDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
