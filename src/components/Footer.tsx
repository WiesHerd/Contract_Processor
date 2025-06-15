import React from 'react';
import { Logo } from './Logo';
import { motion } from 'framer-motion';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer 
      className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Logo size="small" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Streamlining provider contract management with intelligent automation.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {['Templates', 'Providers', 'Generate Contracts'].map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                >
                  <a 
                    href={`/${item.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
            <ul className="space-y-2">
              {['Documentation', 'Contact Support'].map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <a 
                    href="#"
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
        <motion.div 
          className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            © {currentYear} ContractEngine. All rights reserved.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}; 