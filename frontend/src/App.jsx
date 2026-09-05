import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ScorerDashboard from './pages/scorer/ScorerDashboard.jsx';
import MatchSetup from './pages/scorer/MatchSetup.jsx';
import LiveScoring from './pages/scorer/LiveScoring.jsx';
import { LoadingBlock } from './components/ui/Loading.jsx';

// Secondary surfaces are code-split so the scorer bundle stays lean.
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Tournaments = lazy(() => import('./pages/tournaments/Tournaments.jsx'));
const TournamentNew = lazy(() => import('./pages/tournaments/TournamentNew.jsx'));
const TournamentDetail = lazy(() => import('./pages/tournaments/TournamentDetail.jsx'));
const TournamentManage = lazy(() => import('./pages/tournaments/TournamentManage.jsx'));
const Teams = lazy(() => import('./pages/teams/Teams.jsx'));
const TeamDetail = lazy(() => import('./pages/teams/TeamDetail.jsx'));
const MatchDetail = lazy(() => import('./pages/MatchDetail.jsx'));
const LiveMatch = lazy(() => import('./pages/LiveMatch.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

const P = ({ children, roles }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

export default function App() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<P><Onboarding /></P>} />
        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/p/:id" element={<PublicProfile />} />

        {/* Scorer */}
        <Route path="/score" element={<P roles={['scorer', 'organizer', 'coach']}><ScorerDashboard /></P>} />
        <Route path="/score/new" element={<P roles={['scorer', 'organizer', 'coach']}><MatchSetup /></P>} />
        <Route path="/score/:id/setup" element={<P roles={['scorer', 'organizer', 'coach']}><MatchSetup /></P>} />
        <Route path="/score/:id" element={<P roles={['scorer', 'organizer', 'coach']}><LiveScoring /></P>} />

        {/* Tournaments + teams */}
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/new" element={<P roles={['organizer', 'coach', 'scorer']}><TournamentNew /></P>} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/tournaments/:id/manage" element={<P roles={['organizer']}><TournamentManage /></P>} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamDetail />} />

        {/* Matches + live */}
        <Route path="/matches/:id" element={<MatchDetail />} />
        <Route path="/live/:id" element={<LiveMatch />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<P roles={['admin']}><Admin /></P>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
