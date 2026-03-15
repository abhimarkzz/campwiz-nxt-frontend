import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import SessionProvider from './providers/SessionProvider'
import LoginPage from './pages/user/Login'
import CallbackPage from './pages/user/Callback'
import CallbackWritePage from './pages/user/Callback/write'
import { ThemeProvider, CssBaseline } from '@mui/material'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import theme from './theme'
import GlobalLoadingPage from './components/GlobalLoadingPage'
import ErrorBoundary from './components/ErrorBoundary'
import CampaignDetail from './pages/campaign/CampaignDetail'
import CampaignList from './pages/campaign/CampaignList'
import ProjectList from './pages/project/ProjectList'
import ProjectDetail from './pages/project/ProjectDetail'
import RoundDetail from './pages/round/RoundDetail'
import SubmissionList from './pages/submission/SubmissionList'
import SubmissionDetail from './pages/submission/SubmissionDetail'

const PrivacyPolicy = lazy(() => import('./pages/policy/Privacy'))
const TermsOfService = lazy(() => import('./pages/policy/Terms'))

const ProtectedRoutes = () => {
  return (
    <Routes>
      <Route path="/project" element={<ProjectList />} />
      <Route path="/campaign" element={<CampaignList />} />
      <Route path="/campaign/new" element={<div>Create Campaign - TODO</div>} />
      <Route path="/campaign/:campaignId" element={<CampaignDetail />} />
      <Route path="/campaign/:campaignId/round/:roundId" element={<RoundDetail />} />
      <Route path="/submission" element={<SubmissionList />} />
      <Route path="/submission/:submissionId" element={<SubmissionDetail />} />
      <Route path="/project/new" element={<div>Create Project - TODO</div>} />
      <Route path="/project/:projectId" element={<ProjectDetail />} />
      <Route path="/*" element={<div>{/* Default protected page */}</div>} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <InitColorSchemeScript attribute="class" />
        <BrowserRouter>
          <Suspense fallback={<GlobalLoadingPage />}>
            <Routes>
              <Route path="/user/login" element={<LoginPage />} />
              <Route path="/user/callback" element={<CallbackPage />} />
              <Route path="/user/callback/write" element={<CallbackWritePage />} />
              <Route path="/policy/privacy" element={<PrivacyPolicy />} />
              <Route path="/policy/terms" element={<TermsOfService />} />
              
              {/* All protected routes wrapped by SessionProvider */}
              <Route
                path="/*"
                element={
                  <SessionProvider>
                    <ProtectedRoutes />
                  </SessionProvider>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
