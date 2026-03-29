import { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { api, saveToken, clearToken } from '../services/api';
import { pendingSignupRole } from '../pages/LoginPage';

const AuthContext = createContext(null);

function normaliseRole(rawRole) {
  if (rawRole === 'user') return 'candidate';
  return rawRole || 'candidate';
}

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();

  const [user,    setUser]    = useState(null);
  const [auth,    setAuth]    = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      clearToken();
      setUser(null);
      setAuth(null);
      setBooting(false);
      return;
    }

    (async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('No Clerk token');
        saveToken(clerkToken);

        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        const name  = clerkUser.fullName || clerkUser.firstName || 'User';

        let backendUser = null;

        // Try login first (existing user)
        try {
          const loginRes = await api.auth.login(email);
          backendUser = loginRes.user;
          if (loginRes.token) saveToken(loginRes.token);
        } catch {
          // User not in DB yet — sign them up with the role they chose on the login page
          try {
            const chosenRole = pendingSignupRole || 'candidate';
            const signupRes = await api.auth.signup(name, email, chosenRole);
            backendUser = signupRes.user;
            if (signupRes.token) saveToken(signupRes.token);
          } catch (err) {
            console.error('[AuthContext] signup error', err);
          }
        }

        if (backendUser) {
          const role = normaliseRole(backendUser.role);
          setUser({ ...backendUser, role });
          setAuth({ role });
        } else {
          // Fallback to Clerk data so screen is never blank
          const role = normaliseRole(clerkUser.publicMetadata?.role);
          setUser({ _id: clerkUser.id, name, email, role });
          setAuth({ role });
        }
      } catch (err) {
        console.error('[AuthContext] sync error', err);
        // Never leave a blank screen — fall back to Clerk data
        const role  = normaliseRole(clerkUser.publicMetadata?.role);
        const name  = clerkUser.fullName || clerkUser.firstName || 'User';
        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        setUser({ _id: clerkUser.id, name, email, role });
        setAuth({ role });
      } finally {
        setBooting(false);
      }
    })();
  }, [clerkUser, clerkLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (token, u) => {
    if (token) saveToken(token);
    const role = normaliseRole(u?.role);
    setUser({ ...u, role });
    setAuth({ role });
  };

  const logout = async () => {
    clearToken();
    setUser(null);
    setAuth(null);
    try { await signOut(); } catch {}
  };

  const refreshUser = async () => {
    try {
      const d = await api.users.getProfile();
      const role = normaliseRole(d.user?.role || d.role);
      const freshUser = { ...(d.user || d), role };
      setUser(freshUser);
      return freshUser;
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, auth, booting, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);