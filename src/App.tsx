import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { ConfirmDialogHost, ToastContainer } from './components/ToastContainer';
import { DashboardPage } from './pages/DashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { PlayersPage } from './pages/PlayersPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { GamesSchedulePage } from './pages/GamesSchedulePage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { StandingsPage } from './pages/StandingsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { VenuesPage } from './pages/VenuesPage';
import { OfficialsPage } from './pages/OfficialsPage';
import { LeaguesManagementPage } from './pages/LeaguesManagementPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SqlConsolePage } from './pages/SqlConsolePage';
import { ErDiagramPage } from './pages/ErDiagramPage';
import { PlsqlPage } from './pages/PlsqlPage';
import { SettingsPage } from './pages/SettingsPage';

function AppRoutes() {
  const { dbReady, dbError } = useApp();

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F6FA]">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-6 text-center space-y-3">
          <h1 className="font-display text-lg font-bold text-red-700">SQLite Initialization Failed</h1>
          <p className="text-xs text-slate-600">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F6FA] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#0B3D91]/20 border-t-[#0B3D91] animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Initializing Relational SQLite Database...</p>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamDetailPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/:id" element={<PlayerDetailPage />} />
        <Route path="/games" element={<GamesSchedulePage />} />
        <Route path="/schedule" element={<GamesSchedulePage />} />
        <Route path="/matches/:id" element={<MatchDetailPage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/venues" element={<VenuesPage />} />
        <Route path="/officials" element={<OfficialsPage />} />
        <Route path="/leagues" element={<LeaguesManagementPage />} />
        <Route path="/communications" element={<CommunicationsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/sql-console" element={<SqlConsolePage />} />
        <Route path="/er-diagram" element={<ErDiagramPage />} />
        <Route path="/plsql" element={<PlsqlPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
        <ConfirmDialogHost />
      </BrowserRouter>
    </AppProvider>
  );
}
