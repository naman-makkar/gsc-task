'use client';

import Link from 'next/link';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'; // Removed complex tooltip
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { clsx } from 'clsx';

interface DashboardHeaderProps {
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  onLogout: () => void;
  // Add dark/light toggle state and handler if implementing
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName, userEmail, avatarUrl, onLogout }) => {
  // Log the received avatarUrl prop
  console.log('DashboardHeader - Received avatarUrl:', avatarUrl);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo or App Name */}
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">GSC Report Builder</h1>
            </Link>
            {/* Navigation Links */}
            <div className="ml-6 flex space-x-4">
              <Link
                href="/dashboard"
                className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full after:bg-blue-600"
              >
                Dashboard
              </Link>
              {/* Enabled Reports link */}
              <Link
                href="/dashboard/reports"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ease-in-out"
              >
                Reports
              </Link>
            </div>
          </div>
          {/* Right Side: User Info & Actions */}
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              <span className="text-gray-700 dark:text-gray-300 mr-3 hidden sm:inline">{userName || userEmail}</span>
              <Avatar>
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback>{getInitials(userName || userEmail || 'U')}</AvatarFallback>
              </Avatar>
            </div>
            {/* Optional Dark/Light Mode Toggle */}
            {/* <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2">
              <Sun size={20} /> or <Moon size={20} />
            </button> */}
            <button
              onClick={onLogout}
              className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ease-in-out"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardHeader; 