import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import Home from "@/pages/Home";
import AtsConverter from "@/pages/AtsConverter";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar() {
  const { user } = useAuth();
  const [avatarColor, setAvatarColor] = useState("#7c3aed");
  const [useInitials, setUseInitials] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.avatarColor) setAvatarColor(data.avatarColor);
        if (data.useInitials !== undefined) setUseInitials(data.useInitials);
      }
    });
  }, [user]);

  if (!user) return null;

  if (useInitials) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ background: avatarColor }}>
        {getInitials(user.displayName ?? "U")}
      </div>
    );
  }

  return (
    <img src={user.photoURL ?? ""} alt="avatar"
      className="w-8 h-8 rounded-full border-2"
      style={{ borderColor: avatarColor }} />
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg transition-colors text-slate-600 hover:text-primary hover:bg-primary/10 dark:text-slate-400 dark:hover:text-purple-400"
    >
      <Sun className="w-5 h-5 hidden dark:block" style={{color: '#a78bfa'}} />
      <Moon className="w-5 h-5 block dark:hidden" />
    </button>
  );
}

function Nav() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md border-b shadow-sm bg-white/80 dark:bg-[#0d0d1a]/90 border-slate-200 dark:border-purple-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8 h-14">
          <span className="font-bold text-primary text-lg dark:text-purple-400">Resume AI</span>
          <div className="flex gap-2">
            <Link href="/">
              <a className={cn("px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                location === "/" ? "bg-primary text-white dark:bg-purple-600" : "text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:text-purple-400 dark:hover:bg-purple-900/30"
              )}>Analyzer</a>
            </Link>
            <Link href="/ats-converter">
              <a className={cn("px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                location === "/ats-converter" ? "bg-primary text-white dark:bg-purple-600" : "text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:text-purple-400 dark:hover:bg-purple-900/30"
              )}>ATS Converter</a>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">{user.displayName?.split(" ")[0]}</span>
                  </a>
                </Link>
                <button onClick={() => signOut(auth)} className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/login">
                <a className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-white dark:bg-purple-600 hover:opacity-90 transition-opacity">
                  <User className="w-4 h-4" />
                  Sign In
                </a>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Nav />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/ats-converter" component={AtsConverter} />
        <Route path="/login" component={Login} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
