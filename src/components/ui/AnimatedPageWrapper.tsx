'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface AnimatedPageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const AnimatedPageWrapper: React.FC<AnimatedPageWrapperProps> = ({ children, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPageWrapper; 