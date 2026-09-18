import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, obj = auth
  const [store, setStore] = useState(null);

  const loadStore = useCallback(async (u) => {
    if (u && u.role !== "platform_admin" && u.store_id) {
      try {
        const { data } = await api.get("/store");
        setStore(data);
      } catch (e) { setStore(null); }
    } else {
      setStore(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      await loadStore(data);
      return data;
    } catch (e) {
      setUser(false);
      setStore(null);
      return false;
    }
  }, [loadStore]);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    await loadStore(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) {}
    setUser(false);
    setStore(null);
  };

  const reloadStore = () => loadStore(user);

  return (
    <AuthContext.Provider value={{ user, store, setUser, login, logout, refresh, reloadStore, setStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
