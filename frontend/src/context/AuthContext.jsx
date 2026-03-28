import { createContext, useContext, useState, useEffect } from 'react';
import { api, saveToken, clearToken, hasToken } from '../services/api';

const AuthContext = createContext(null);

// The backend stores candidates as role='user'. Normalise for the frontend.
function normaliseRole(rawRole) {

  if (rawRole === 'user') return 'candidate';
  return rawRole || 'candidate';
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [auth,    setAuth]    = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (hasToken()) {
    
      api.auth.me()
        .then(async d => {
          const rawRole = d.user?.role || d.role;
          const role    = normaliseRole(rawRole);
         
          try {
            const profile = await api.users.getProfile();
            const fullRole = normaliseRole(profile.user?.role || rawRole);
            setUser({ ...(profile.user || profile), role: fullRole });
            setAuth({ role: fullRole });
          } catch {
            setUser({ ...d.user, role });
            setAuth({ role });
          }
        })
        .catch(() => clearToken())
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, []);

  const login = async (token, u) => {
    saveToken(token);
    const role = normaliseRole(u.role);
    const normUser = { ...u, role };
    setUser(normUser);
    setAuth({ role });
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setAuth(null);
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
