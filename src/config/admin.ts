// Admin configuration - modify these values for your organization
export const ADMIN_CONFIG = {
  // Admin email domains (users with these domains get admin access)
  adminDomains: [
    'yourcompany.com', // Add your company domain
    'contractengine.com', // Add your app domain
    // Remove common domains for security - add specific ones only
  ],
  
  // Admin email addresses (specific admin users)
  adminEmails: [
    'admin@yourcompany.com',
    'superadmin@contractengine.com',
    // TODO: ADD YOUR EMAIL HERE FOR ADMIN ACCESS
    // 'your-email@gmail.com', // Uncomment and add your actual email
    // 'your-email@outlook.com', // Add your email here
  ],
  
  // Admin mode toggle key combination (Ctrl+Shift+A)
  adminModeKey: 'Ctrl+Shift+A',
  
  // Admin session timeout (in minutes)
  adminSessionTimeout: 30,
  
  // Bulk operation limits
  maxBulkDelete: 1000,
  maxBulkExport: 5000,
  
  // Safety confirmations
  requireConfirmationForBulkDelete: true,
  requireConfirmationForBulkExport: true,
  requireTypingConfirmation: true, // User must type "DELETE" to confirm
};

// Helper function to check if user is admin
export function isUserAdmin(userEmail: string): boolean {
  if (!userEmail) return false;
  
  const email = userEmail.toLowerCase();
  
  // Check specific admin emails
  if (ADMIN_CONFIG.adminEmails.includes(email)) {
    return true;
  }
  
  // Check admin domains
  const domain = email.split('@')[1];
  if (ADMIN_CONFIG.adminDomains.includes(domain)) {
    return true;
  }
  
  return false;
}

// Helper function to get admin status from user object
export function getUserAdminStatus(user: any): boolean {
  if (!user) return false;
  
  // For Amplify AuthUser, the email is typically the username
  const email = user.username || user.email || '';
  
  return isUserAdmin(email);
} 