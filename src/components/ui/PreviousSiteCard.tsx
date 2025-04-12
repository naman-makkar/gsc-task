'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

interface PreviousSiteCardProps {
  siteUrl: string;
  permissionLevel: string;
  onContinue: (siteUrl: string) => void;
}

const PreviousSiteCard: React.FC<PreviousSiteCardProps> = ({ siteUrl, permissionLevel, onContinue }) => {
  return (
    <motion.div
      className="mb-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-200 ease-in-out hover:shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Continue with your previous site</h2>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Globe className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{siteUrl}</p>
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200 mt-1">
              {permissionLevel}
            </span>
          </div>
        </div>
        <button
          onClick={() => onContinue(siteUrl)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-[1.03]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
};

export default PreviousSiteCard; 