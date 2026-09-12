import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import ActivitySetup from "./pages/ActivitySetup";
import Chat from "./pages/Chat";
import Connections from "./pages/Connections";
import DebugDatabase from "./pages/DebugDatabase";
import Activities from "./pages/Activities";
import Feedback from "./pages/Feedback";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Matching from "./pages/Matching";
import MatchResults from "./pages/MatchResults";
import Meetup from "./pages/Meetup";
import Messages from "./pages/Messages";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import PersonProfile from "./pages/PersonProfile";
import Profile from "./pages/Profile";
import Success from "./pages/Success";
import Welcome from "./pages/Welcome";

export default function App() {
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[1000] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route path="/onboarding/*" element={<OnboardingWizard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/activity/:type/setup" element={<ActivitySetup />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/matches" element={<MatchResults />} />
            <Route path="/people/:id" element={<PersonProfile />} />
            <Route path="/chat/:matchId" element={<Chat />} />
            <Route path="/meetup/:eventId" element={<Meetup />} />
            <Route path="/feedback/:eventId" element={<Feedback />} />
            <Route path="/success/:matchId" element={<Success />} />
            <Route path="/discover" element={<Navigate to="/home" replace />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/debug/database" element={<DebugDatabase />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
