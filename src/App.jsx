import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DarkModeProvider } from './context/DarkModeContext';
import { WallpaperProvider } from './context/WallpaperContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './layout/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import Research from './pages/Research';
import Events from './pages/Events';
import Blog from './pages/Blog';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import SetupUsername from './pages/SetupUsername';
import ProfileSetup from './pages/ProfileSetup';
import CreateArticle from './pages/CreateArticle';
import CreateResearch from './pages/CreateResearch';
import CreateBlogPost from './pages/CreateBlogPost';
import CreateEvent from './pages/CreateEvent';
import ArticleView from './pages/ArticleView';
import ResearchView from './pages/ResearchView';
import EventView from './pages/EventView';
import BlogPostView from './pages/BlogPostView';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import FollowersFollowing from './pages/FollowersFollowing';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import SavedItems from './pages/SavedItems';
import Archived from './pages/Archived';
import AdminPanel from './pages/AdminPanel';
import PaymentSuccess from './pages/PaymentSuccess';
import ResetPassword from './pages/ResetPassword';
import SubscriptionSettings from './pages/SubscriptionSettings';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { isAuthenticated, needsProfileSetup } = useAuth();

  // Redirect to profile setup if needed
  const HomeOrDashboard = () => {
    if (needsProfileSetup()) {
      return <Navigate to="/profile/setup" replace />;
    }
    return isAuthenticated() ? <Dashboard /> : <Home />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeOrDashboard />} />
          <Route path="research" element={<Research />} />
          <Route path="research/:id" element={<ResearchView />} />
          <Route path="research/:id/edit" element={<ProtectedRoute><CreateResearch /></ProtectedRoute>} />
          <Route path="research/create" element={<ProtectedRoute><CreateResearch /></ProtectedRoute>} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/:id" element={<ArticleView />} />
          <Route path="articles/:id/edit" element={<ProtectedRoute><CreateArticle /></ProtectedRoute>} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventView />} />
          <Route path="events/:id/edit" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:id" element={<BlogPostView />} />
          <Route path="blog/:id/edit" element={<ProtectedRoute><CreateBlogPost /></ProtectedRoute>} />
          <Route
            path="articles/create"
            element={
              <ProtectedRoute>
                <CreateArticle />
              </ProtectedRoute>
            }
          />
          <Route
            path="blog/create"
            element={
              <ProtectedRoute>
                <CreateBlogPost />
              </ProtectedRoute>
            }
          />
          <Route
            path="events/create"
            element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/:userId"
            element={<UserProfile />}
          />
          <Route
            path="profile/:userId/:type"
            element={<FollowersFollowing />}
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/settings"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="saved"
            element={
              <ProtectedRoute>
                <SavedItems />
              </ProtectedRoute>
            }
          />
          <Route
            path="archived"
            element={
              <ProtectedRoute>
                <Archived />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="subscription"
            element={
              <ProtectedRoute>
                <SubscriptionSettings />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/setup-username" element={<SetupUsername />} />
        {/* No requiere auth — el usuario llega desde el redirect de Stripe/MP */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        {/* No requiere auth — el usuario llega desde el link del email */}
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <WallpaperProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </WallpaperProvider>
    </DarkModeProvider>
  );
}

export default App;

