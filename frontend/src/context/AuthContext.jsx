import { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { api, saveToken, clearToken } from '../services/api';

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

        const email      = clerkUser.primaryEmailAddress?.emailAddress || '';
        const name       = clerkUser.fullName || clerkUser.firstName || 'User';

        // ✅ Read role from localStorage — set by LoginPage when user clicks a role
        const chosenRole = localStorage.getItem('st_pending_role') || 'candidate';

        let backendUser = null;

        // Always call signup with the chosen role
        // Backend will update role in DB if it changed
        try {
          const signupRes = await api.auth.signup(name, email, chosenRole);
          backendUser = signupRes.user;
          if (signupRes.token) saveToken(signupRes.token);
        } catch {
          try {
            const loginRes = await api.auth.login(email);
            backendUser = loginRes.user;
            if (loginRes.token) saveToken(loginRes.token);
          } catch (err) {
            console.error('[AuthContext] login error', err);
          }
        }

        if (backendUser) {
          const role = normaliseRole(backendUser.role);
          setUser({ ...backendUser, role });
          setAuth({ role });
        } else {
          setUser({ _id: clerkUser.id, name, email, role: chosenRole });
          setAuth({ role: chosenRole });
        }
      } catch (err) {
        console.error('[AuthContext] sync error', err);
        const chosenRole = localStorage.getItem('st_pending_role') || 'candidate';
        const name  = clerkUser.fullName || clerkUser.firstName || 'User';
        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        setUser({ _id: clerkUser.id, name, email, role: chosenRole });
        setAuth({ role: chosenRole });
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
    localStorage.removeItem('st_pending_role');
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