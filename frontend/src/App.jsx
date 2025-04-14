import { BrowserRouter as Router, useLocation, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MyInterviews from './pages/MyInterviews';
import Interview from './pages/Interview';
import InterviewSession from './pages/InterviewSession';
import './App.css';

// Create a wrapper component to access location
const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/interview/session/:sessionId" element={<InterviewSession />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-interviews" element={<MyInterviews />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
