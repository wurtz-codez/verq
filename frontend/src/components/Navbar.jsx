import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../config/firebase';
import profileImage from '../assets/images/profile.png';
import { logout } from '../services/authService';
import { api } from '../services/api';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [userData, setUserData] = useState(null);
  const { darkMode, toggleTheme } = useTheme();
  const profileDropdownRef = useRef(null);
  
  // Check viewport size
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setViewport('mobile');
      } else if (width < 1024) {
        setViewport('tablet');
      } else {
        setViewport('desktop');
      }
    };
    
    checkViewport();
    window.addEventListener('resize', checkViewport);
    
    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  }, []);
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('firebaseToken');
        console.log('Token found:', token ? 'Yes' : 'No');
        
        if (token) {
          // First try to verify the token
          console.log('Attempting to verify token...');
          const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          console.log('Verify response status:', verifyResponse.status);
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('Verify response data:', verifyData);
            
            if (verifyData.status === 'success' && verifyData.data && verifyData.data.user) {
              console.log('Setting user data from verify:', verifyData.data.user);
              setUserData(verifyData.data.user);
              return;
            }
          }

          // If verify fails, try getting user profile
          console.log('Attempting to fetch user profile...');
          const profileResponse = await fetch('http://localhost:3000/api/user/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          console.log('Profile response status:', profileResponse.status);
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('Profile response data:', profileData);
            
            if (profileData.status === 'success' && profileData.data && profileData.data.user) {
              console.log('Setting user data from profile:', profileData.data.user);
              setUserData(profileData.data.user);
            }
          } else {
            console.error('Failed to fetch user data:', profileResponse.status);
            const errorData = await profileResponse.json().catch(() => null);
            console.error('Error details:', errorData);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownRef]);
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (profileOpen) setProfileOpen(false);
  };
  
  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setProfileOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Profile dropdown component
  const ProfileDropdown = () => (
    <div className={`absolute right-0 top-full mt-2 p-5 rounded-xl shadow-lg backdrop-blur-md border border-gray-700 w-[260px] ${profileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} bg-gray-900/90`}>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          <img 
            src={profileImage} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-montserrat font-semibold text-lg text-gray-100">{userData?.displayName || 'Guest'}</h3>
            <p className="text-sm text-gray-400">{userData?.email || ''}</p>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-4">
          <Link 
            to="/my-interviews"
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg"
            onClick={() => setProfileOpen(false)}
          >
            My Interviews
          </Link>
          <button 
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile menu component
  const MobileMenu = () => (
    <div className={`absolute top-[70px] right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <ul className="flex flex-col space-y-3 font-montserrat font-semibold text-sm">
        <li>
          <Link 
            to="/" 
            className={`block px-4 py-2 rounded-full ${
              isActive('/') 
                ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-gray-100' 
                : 'text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
        </li>
        <li>
          <Link 
            to="/dashboard" 
            className={`block px-4 py-2 rounded-full ${
              isActive('/dashboard') 
                ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-gray-100' 
                : 'text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link 
            to="/interview" 
            className={`block px-4 py-2 rounded-full ${
              isActive('/interview') 
                ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-gray-100' 
                : 'text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            Take Interview
          </Link>
        </li>
        <li>
          <Link 
            to="/my-interviews" 
            className={`block px-4 py-2 rounded-full ${
              isActive('/my-interviews') 
                ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-gray-100' 
                : 'text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            onClick={() => setMenuOpen(false)}
          >
            My Interviews
          </Link>
        </li>
      </ul>
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full mt-4">
      <nav className={`flex items-center px-4 h-[60px] relative
        ${viewport !== 'desktop'
          ? 'w-[95vw] bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-full shadow-sm border border-gray-200 dark:border-gray-700 justify-between' 
          : 'w-[70vw] bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-full shadow-sm border border-gray-200 dark:border-gray-700 justify-between'
        }`}>
        {/* Left section - Logo */}
        <div className="flex flex-col justify-center">
          <Link to="/" className="group">
            <h1 className="font-zen font-bold text-xl sm:text-2xl text-gray-900 dark:text-gray-100 group-hover:text-pink-500 dark:group-hover:text-pink-400">VerQ</h1>
          </Link>
        </div>
        
        {/* Middle section - Navigation pills - Centered with absolute positioning */}
        {viewport !== 'mobile' && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-full shadow-sm inline-flex items-center border border-gray-300 dark:border-gray-700 p-0.5">
              <ul className="flex font-chakra font-semibold text-xs sm:text-sm items-center">
                <li className="flex items-center">
                  <Link 
                    to="/" 
                    className={`inline-block px-3 sm:px-4 py-2 rounded-full ${
                      isActive('/') 
                        ? 'bg-white dark:bg-black text-gray-900 dark:text-heading backdrop-blur-md' 
                        : 'text-gray-800 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/70'
                    }`}
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center">
                  <Link 
                    to="/dashboard" 
                    className={`inline-block px-3 sm:px-4 py-2 rounded-full ${
                      isActive('/dashboard') 
                        ? 'bg-white dark:bg-black text-gray-900 dark:text-heading backdrop-blur-sm' 
                        : 'text-gray-800 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/70'
                    }`}
                  >
                    Dashboard
                  </Link>
                </li>
                <li className="flex items-center">
                  <Link 
                    to="/interview" 
                    className={`inline-block px-3 sm:px-4 py-2 rounded-full ${
                      isActive('/interview') 
                        ? 'bg-white dark:bg-black text-gray-900 dark:text-heading backdrop-blur-sm' 
                        : 'text-gray-800 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/70'
                    }`}
                  >
                    Take Interview
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Right section - Profile and Mobile Menu */}
        <div className="flex items-center space-x-2">
          {/* Profile button - Always visible */}
          <div className="relative" ref={profileDropdownRef}>
            <button 
              onClick={toggleProfile}
              className="flex items-center space-x-2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
            <ProfileDropdown />
          </div>

          {/* Mobile menu button - Only visible on mobile */}
          {viewport === 'mobile' && (
            <button 
              onClick={toggleMenu}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Mobile Menu */}
        {viewport === 'mobile' && <MobileMenu />}
      </nav>
    </div>
  );
}

export default Navbar; 