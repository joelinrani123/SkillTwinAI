import { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { api, saveToken, clearToken } from '../services/api';

const AuthContext = createContext(null);

// The backend stores candidates as role='user'. Normalise for the frontend.
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

  // Sync Clerk session → backend JWT + user profile
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!clerkUser) {
      // Signed out
      clearToken();
      setUser(null);
      setAuth(null);
      setBooting(false);
      return;
    }

    (async () => {
      try {
        // Get a short-lived Clerk JWT and exchange it for a backend session token
        const clerkToken = await getToken();
        saveToken(clerkToken);

        // Try to fetch full profile from your backend
        try {
          const profile = await api.users.getProfile();
          const rawRole = profile.user?.role || 'candidate';
          const role = normaliseRole(rawRole);
          setUser({ ...(profile.user || profile), role });
          setAuth({ role });
        } catch {
          // Backend profile not found yet — use Clerk data as fallback
          const role = normaliseRole(clerkUser.publicMetadata?.role);
          setUser({
            _id:    clerkUser.id,
            name:   clerkUser.fullName || clerkUser.firstName || 'User',
            email:  clerkUser.primaryEmailAddress?.emailAddress || '',
            role,
          });
          setAuth({ role });
        }
      } catch (err) {
        console.error('[AuthContext] token sync failed', err);
        clearToken();
      } finally {
        setBooting(false);
      }
    })();
  }, [clerkUser, clerkLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called after Clerk sign-in/sign-up completes (e.g. via onLogin prop if you use it)
  const login = async (token, u) => {
    saveToken(token);
    const role = normaliseRole(u?.role);
    const normUser = { ...u, role };
    setUser(normUser);
    setAuth({ role });
  };

  const logout = async () => {
    clearToken();
    setUser(null);
    setAuth(null);
    await signOut();
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