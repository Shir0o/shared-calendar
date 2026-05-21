import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  whitelist: string[];
  pendingRequests: { email: string; name: string; requestedAt: string }[];
  isAuthenticating: boolean;
  signIn: (email: string, displayName: string, photoURL?: string) => Promise<boolean>;
  signOut: () => void;
  requestAccess: (email: string, name: string) => void;
  addToWhitelist: (email: string) => void;
  removeFromWhitelist: (email: string) => void;
  approveRequest: (email: string, name: string) => void;
  rejectRequest: (email: string) => void;
  logAction: (action: string, details: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OWNER_EMAIL = 'yilongwang05@gmail.com';

const DEFAULT_WHITELIST = [
  OWNER_EMAIL,
  'sarah.connor@example.com',
  'john.doe@example.com',
  'alex.smith@example.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ email: string; name: string; requestedAt: string }[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Load from LocalStorage or initialize defaults
  useEffect(() => {
    const storedWhitelist = localStorage.getItem('ss_whitelist');
    if (storedWhitelist) {
      setWhitelist(JSON.parse(storedWhitelist));
    } else {
      setWhitelist(DEFAULT_WHITELIST);
      localStorage.setItem('ss_whitelist', JSON.stringify(DEFAULT_WHITELIST));
    }

    const storedRequests = localStorage.getItem('ss_pending_requests');
    if (storedRequests) {
      setPendingRequests(JSON.parse(storedRequests));
    } else {
      setPendingRequests([
        { email: 'jane.foster@example.com', name: 'Jane Foster', requestedAt: new Date().toISOString() },
        { email: 'tony.stark@example.com', name: 'Tony Stark', requestedAt: new Date().toISOString() }
      ]);
    }

    const storedUser = localStorage.getItem('ss_current_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const saveWhitelist = (newList: string[]) => {
    setWhitelist(newList);
    localStorage.setItem('ss_whitelist', JSON.stringify(newList));
  };

  const saveRequests = (newRequests: typeof pendingRequests) => {
    setPendingRequests(newRequests);
    localStorage.setItem('ss_pending_requests', JSON.stringify(newRequests));
  };

  // Google Sign-In Simulation
  const signIn = async (email: string, displayName: string, photoURL?: string): Promise<boolean> => {
    setIsAuthenticating(true);
    // Simulate minor network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsAuthenticating(false);

    let role: UserRole = 'NONE';

    if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      role = 'OWNER';
    } else if (whitelist.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
      role = 'USER';
    } else if (pendingRequests.map(r => r.email.toLowerCase()).includes(email.toLowerCase())) {
      role = 'PENDING';
    } else {
      role = 'NONE';
    }

    const signedInUser: User = {
      email,
      displayName,
      photoURL: photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}`,
      role
    };

    setUser(signedInUser);
    localStorage.setItem('ss_current_user', JSON.stringify(signedInUser));

    logAction('LOGIN', `${displayName} (${email}) logged in. Role determined: ${role}`);
    return role !== 'NONE' && role !== 'PENDING';
  };

  const signOut = () => {
    if (user) {
      logAction('LOGOUT', `${user.displayName} signed out.`);
    }
    setUser(null);
    localStorage.removeItem('ss_current_user');
  };

  const requestAccess = (email: string, name: string) => {
    if (pendingRequests.some(r => r.email.toLowerCase() === email.toLowerCase())) return;
    
    const newRequests = [...pendingRequests, { email, name, requestedAt: new Date().toISOString() }];
    saveRequests(newRequests);
    
    // Update user state if currently signed in but pending
    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      const updatedUser: User = { ...user, role: 'PENDING' };
      setUser(updatedUser);
      localStorage.setItem('ss_current_user', JSON.stringify(updatedUser));
    }
    
    logAction('ACCESS_REQUEST', `Access requested by ${name} (${email})`);
  };

  const addToWhitelist = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (whitelist.includes(cleanEmail)) return;
    
    const newList = [...whitelist, cleanEmail];
    saveWhitelist(newList);
    
    logAction('WHITELIST_ADD', `Email added to whitelist: ${cleanEmail}`);
  };

  const removeFromWhitelist = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === OWNER_EMAIL.toLowerCase()) return; // Cannot remove owner
    
    const newList = whitelist.filter(e => e.toLowerCase() !== cleanEmail);
    saveWhitelist(newList);
    
    logAction('WHITELIST_REMOVE', `Email removed from whitelist: ${cleanEmail}`);
  };

  const approveRequest = (email: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Remove from pending
    const newRequests = pendingRequests.filter(r => r.email.toLowerCase() !== cleanEmail);
    saveRequests(newRequests);
    
    // Add to whitelist
    if (!whitelist.includes(cleanEmail)) {
      saveWhitelist([...whitelist, cleanEmail]);
    }
    
    // If the approved user is currently signed in and viewing the pending screen, upgrade them
    if (user && user.email.toLowerCase() === cleanEmail) {
      const updatedUser: User = { ...user, role: 'USER' };
      setUser(updatedUser);
      localStorage.setItem('ss_current_user', JSON.stringify(updatedUser));
    }
    
    logAction('REQUEST_APPROVE', `Approved access for ${name} (${cleanEmail})`);
  };

  const rejectRequest = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    const newRequests = pendingRequests.filter(r => r.email.toLowerCase() !== cleanEmail);
    saveRequests(newRequests);
    
    // If rejected user is signed in, reset role to NONE
    if (user && user.email.toLowerCase() === cleanEmail) {
      const updatedUser: User = { ...user, role: 'NONE' };
      setUser(updatedUser);
      localStorage.setItem('ss_current_user', JSON.stringify(updatedUser));
    }
    
    logAction('REQUEST_REJECT', `Rejected access request for ${cleanEmail}`);
  };

  const logAction = (action: string, details: string) => {
    const storedLogs = localStorage.getItem('ss_changelogs');
    const logs = storedLogs ? JSON.parse(storedLogs) : [];
    
    const newEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventTitle: action,
      user: user?.email || 'SYSTEM',
      action: action,
      timestamp: new Date().toISOString(),
      details: details
    };
    
    localStorage.setItem('ss_changelogs', JSON.stringify([newEntry, ...logs]));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        whitelist,
        pendingRequests,
        isAuthenticating,
        signIn,
        signOut,
        requestAccess,
        addToWhitelist,
        removeFromWhitelist,
        approveRequest,
        rejectRequest,
        logAction
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
