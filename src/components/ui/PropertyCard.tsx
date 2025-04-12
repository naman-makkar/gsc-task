'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';

interface PropertyCardProps {
  siteUrl: string;
  permissionLevel: string;
  onSelect: (siteUrl: string) => void;
  animationVariants?: any; // For staggered animation
  custom?: number; // For stagger index
}

// Define permission badge colors (customize as needed)
const permissionColors: { [key: string]: string } = {
  siteFullUser: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  siteOwner: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  siteRestrictedUser: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const PropertyCard: React.FC<PropertyCardProps> = ({ siteUrl, permissionLevel, onSelect, animationVariants, custom }) => {
  const badgeColor = permissionColors[permissionLevel] || permissionColors.default;

  return (
    <motion.div
      className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all duration-200 ease-in-out cursor-pointer group overflow-hidden"
      onClick={() => onSelect(siteUrl)}
      variants={animationVariants}
      initial="hidden"
      animate="show"
      custom={custom} // Pass index for staggering
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="p-5">
        <div className="truncate font-medium text-gray-900 dark:text-white mb-1">
          {siteUrl}
        </div>
        <div className="text-sm">
          <span className={clsx(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            badgeColor
          )}>
            {permissionLevel}
          </span>
        </div>
        <div className="mt-4 flex justify-end items-center">
          <span className="text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors duration-200 ease-in-out flex items-center">
            Select
            <ChevronRight className="w-4 h-4 ml-1 transform transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard; 