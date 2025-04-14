import { Link } from 'react-router-dom';
import InterviewScene from '../assets/3d/InterviewScene';

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full bg-[#09090B] relative">
      {/* 3D Scene Section - Full Width */}
      <div className="w-full h-screen absolute inset-0">
        <InterviewScene />
      </div>

      {/* Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center pointer-events-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl font-thin text-heading font-zen leading-tight">
            Welcome to <span className="gradient-text font-semibold">VerQ</span>
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl font-medium text-paragraph font-chakra mt-2 sm:mt-4">
            your interview buddy!
          </h2>
          <Link 
            to="/interview"
            className="mt-8 sm:mt-14 inline-block bg-[#E9EAEA] text-[#09090B] font-chakra font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-full transition duration-300 hover:bg-opacity-90 text-xs sm:text-sm"
          >
            Let's Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 