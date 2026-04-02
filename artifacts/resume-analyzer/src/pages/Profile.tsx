import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { Sparkles, Save, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AVATAR_COLORS = [
  { bg: "#7c3aed", label: "Purple" },
  { bg: "#2563eb", label: "Blue" },
  { bg: "#059669", label: "Green" },
  { bg: "#dc2626", label: "Red" },
  { bg: "#d97706", label: "Amber" },
  { bg: "#db2777", label: "Pink" },
  { bg: "#0891b2", label: "Cyan" },
  { bg: "#4f46e5", label: "Indigo" },
  { bg: "#7c2d12", label: "Brown" },
  { bg: "#111827", label: "Dark" },
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedColor, setSelectedColor] = useState("#7c3aed");
  const [useInitials, setUseInitials] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.avatarColor) setSelectedColor(data.avatarColor);
        if (data.useInitials !== undefined) setUseInitials(data.useInitials);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), {
      displayName: user.displayName,
      email: user.email,
      avatarColor: selectedColor,
      useInitials,
      updatedAt: new Date(),
    }, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  const initials = getInitials(user.displayName ?? "U");

  return (
    <div className="min-h-screen pb-20 font-sans">
      <div className="max-w-2xl mx-auto px-4 pt-12 sm:pt-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Your Profile
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">
            Customize your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">avatar</span>
          </h1>
        </div>

        <Card className="shadow-2xl border-white/60 bg-white/70 dark:bg-[#13131f] dark:border-purple-900/30 backdrop-blur-xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Avatar Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Preview */}
            <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-[#0d0d1a] rounded-2xl">
              <div className="relative">
                {useInitials ? (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                    style={{ background: selectedColor }}>
                    {initials}
                  </div>
                ) : (
                  <img src={user.photoURL ?? ""} alt="avatar"
                    className="w-20 h-20 rounded-full shadow-lg border-4"
                    style={{ borderColor: selectedColor }} />
                )}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{user.displayName}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{user.email}</p>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setUseInitials(false)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${!useInitials ? "border-primary bg-primary/10 text-primary dark:text-purple-400" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
              >
                Google Photo
              </button>
              <button
                onClick={() => setUseInitials(true)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${useInitials ? "border-primary bg-primary/10 text-primary dark:text-purple-400" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
              >
                Initials Avatar
              </button>
            </div>

            {/* Color Picker */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {useInitials ? "Avatar Color" : "Border Color"}
              </p>
              <div className="flex flex-wrap gap-3">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.bg}
                    onClick={() => setSelectedColor(color.bg)}
                    className="w-10 h-10 rounded-full transition-all hover:scale-110"
                    style={{
                      background: color.bg,
                      outline: selectedColor === color.bg ? `3px solid ${color.bg}` : "none",
                      outlineOffset: "3px",
                    }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <Button onClick={handleSave} size="lg" className="w-full h-12 text-base">
              <Save className="w-4 h-4 mr-2" />
              {saved ? "Saved! ✓" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
