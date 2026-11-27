import React from 'react';
import { motion } from 'framer-motion';

export const INSTITUTIONAL_EASE = [0.16, 1, 0.3, 1] as const;

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  immediate?: boolean;
}

export function SectionReveal({
  children,
  className = '',
  delay = 0.04,
  immediate = false,
}: SectionRevealProps) {
  if (immediate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay, ease: INSTITUTIONAL_EASE }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.04, margin: '-32px 0px' }}
      transition={{ duration: 0.65, delay, ease: INSTITUTIONAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionRevealItem({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.04 }}
      transition={{ duration: 0.5, delay, ease: INSTITUTIONAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
