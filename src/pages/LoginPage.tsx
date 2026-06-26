import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
} from "../components/ui";
import { useAppContext, Role } from "../store/AppContext";
import { Sparkles, Sun, Moon } from "lucide-react";
import { AfroLogo } from "../components/AfroLogo";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUser, systemUsers, theme, toggleTheme } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Find user by username and password
    const foundUser = systemUsers.find(
      (u) =>
        u.name.toLowerCase() === username.toLowerCase() &&
        u.password === password,
    );

    if (foundUser) {
      setUser({
        id: foundUser.id,
        name: foundUser.name,
        role: foundUser.role,
      });
      navigate("/");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      <Button 
        variant="ghost" 
        className="absolute top-6 right-6 p-2 h-auto rounded-full hover:bg-muted/50 z-50 text-ink" 
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </Button>

      {/* Abstract Background Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <Card className="w-full max-w-md shadow-2xl border border-border bg-card-bg/80 backdrop-blur-xl relative z-10 transition-colors duration-200">
        <CardHeader className="text-center pb-2 pt-8 flex flex-col items-center">
          <div className="mb-4 flex items-center justify-center">
            <AfroLogo size="xl" />
          </div>
          <CardTitle className="text-2xl font-black tracking-widest text-ink mt-2">
            AFRO APP
          </CardTitle>
          <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-fg mt-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Intelligent HR & Budgets</span>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          {error && (
            <div className="p-3 mb-4 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5 pt-4" autoComplete="off">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="off"
                className="bg-input-bg border-border text-ink placeholder:text-muted-fg focus-visible:ring-primary/50 focus-visible:border-primary transition-colors duration-200"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                className="bg-input-bg border-border text-ink placeholder:text-muted-fg focus-visible:ring-primary/50 focus-visible:border-primary transition-colors duration-200"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-500 dark:hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-900/20 transition-all"
            >
              Authenticate System
            </Button>

            <div className="flex flex-col items-center justify-center pt-4 mt-5 text-[0.75rem] text-muted-fg/80 gap-1 select-none border-t border-border/30">
              <div className="flex items-center gap-1.5 font-medium tracking-wide">
                <span>Designed & Built by</span>
                <span className="font-extrabold text-accent bg-accent/10 px-1.5 py-0.5 rounded text-[0.7rem] uppercase tracking-widest">
                  AI Team
                </span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
