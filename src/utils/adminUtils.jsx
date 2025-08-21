// src/components/adminUtils.jsx
// Admin authentication and privilege checking utilities

// List of admin email addresses
const ADMIN_EMAILS = [
  'niyengar@gmail.com',
  'goofygal1@gmail.com', 
  'maighnaj@gmail.com',
  'syon.iyengar@gmail.com'
];

/**
 * Check if a user is an admin based on their email
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (user) => {
  if (!user || !user.email) return false;
  
  // Anonymous users are never admins
  if (user.isAnonymous) return false;
  
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
};

/**
 * Check if user can perform write operations
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user can write
 */
export const canWrite = (user) => {
  return isAdmin(user);
};

/**
 * Check if user can delete items
 * @param {Object} user - Firebase user object  
 * @returns {boolean} - True if user can delete
 */
export const canDelete = (user) => {
  return isAdmin(user);
};

/**
 * Check if user can access settings
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user can access settings
 */
export const canAccessSettings = (user) => {
  return isAdmin(user);
};

/**
 * Check if user can create/manage live games
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user can manage live games
 */
export const canManageLiveGames = (user) => {
  return isAdmin(user);
};

/**
 * Get user role for display purposes
 * @param {Object} user - Firebase user object
 * @returns {string} - User role ('admin', 'viewer', 'guest')
 */
export const getUserRole = (user) => {
  if (!user) return 'guest';
  if (user.isAnonymous) return 'guest';
  if (isAdmin(user)) return 'admin';
  return 'viewer';
};

/**
 * Show access denied message
 * @param {string} action - The action that was denied
 */
export const showAccessDenied = (action = 'perform this action') => {
  alert(`Access denied. Only administrators can ${action}.`);
};

/**
 * Higher-order function to wrap admin-only functions
 * @param {Function} fn - Function to wrap
 * @param {string} actionName - Name of action for error message
 * @returns {Function} - Wrapped function that checks admin status
 */
export const requireAdmin = (fn, actionName = 'perform this action') => {
  return (user, ...args) => {
    if (!isAdmin(user)) {
      showAccessDenied(actionName);
      return Promise.reject(new Error('Access denied'));
    }
    return fn(...args);
  };
};