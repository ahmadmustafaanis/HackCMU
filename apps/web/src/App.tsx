import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import CreateActivity from "./pages/CreateActivity";
import ActivitySetup from "./pages/ActivitySetup";
import Chat from "./pages/Chat";
import Connections from "./pages/Connections";
import DebugDatabase from "./pages/DebugDatabase";
import Discover from "./pages/Discover";
import Feedback from "./pages/Feedback";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Matching from "./pages/Matching";
import MatchResults from "./pages/MatchResults";
import Meetup from "./pages/Meetup";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import PersonProfile from "./pages/PersonProfile";
import Profile from "./pages/Profile";
import Success from "./pages/Success";
import Welcome from "./pages/Welcome";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding/*" element={<OnboardingWizard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/activity/:type/setup" element={<ActivitySetup />} />
          <Route path="/activity/new" element={<CreateActivity />} />
          <Route path="/matching" element={<Matching />} />
          <Route path="/matches" element={<MatchResults />} />
          <Route path="/people/:id" element={<PersonProfile />} />
          <Route path="/chat/:matchId" element={<Chat />} />
          <Route path="/meetup/:eventId" element={<Meetup />} />
          <Route path="/feedback/:eventId" element={<Feedback />} />
          <Route path="/success/:matchId" element={<Success />} />
          <Route path="/discover" element={<Navigate to="/activities" replace />} />
          <Route path="/activities" element={<Discover />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/debug/database" element={<DebugDatabase />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
