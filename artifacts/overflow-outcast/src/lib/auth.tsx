import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("overflow_token"));
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (user) {
      setLocalUser(user);
    }
  }, [user]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("overflow_token", newToken);
    setToken(newToken);
    setLocalUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("overflow_token");
    setToken(null);
    setLocalUser(null);
    setLocation("/login");
  };

  // We are loading if we have a token but haven't fetched the user yet, and the fetch is in progress
  const isLoading = !!token && isUserLoading && !localUser;

  return (
    <AuthContext.Provider value={{ user: localUser, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
