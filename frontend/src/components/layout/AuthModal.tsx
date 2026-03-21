import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuthStore } from "@/stores/auth-store";

interface AuthModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { login, register, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let success: boolean;
    if (tab === "login") {
      success = await login(email, password);
    } else {
      success = await register(email, username, password);
    }

    if (success) {
      setEmail("");
      setUsername("");
      setPassword("");
      onClose();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        {/* Full-screen background image */}
        <Dialog.Overlay className="fixed inset-0" style={{ zIndex: 49 }}>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/chess-arena-bg.png')" }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </Dialog.Overlay>

        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl"
          style={{ zIndex: 51 }}
          aria-describedby={undefined}
        >
          {/* Hero */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15">
              <img src="/pieces/merida/wk.svg" alt="" className="h-10 w-10" />
            </div>
            <Dialog.Title className="text-2xl font-bold text-foreground">
              {tab === "login" ? "Welcome Back" : "Join ChessArena"}
            </Dialog.Title>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "login"
                ? "Sign in to continue your chess journey"
                : "Create an account to track your progress"}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-5 flex gap-1 rounded-xl bg-white/5 p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                tab === "login"
                  ? "bg-accent text-accent-foreground shadow-md shadow-accent/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                tab === "register"
                  ? "bg-accent text-accent-foreground shadow-md shadow-accent/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-1 ring-white/10 transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-accent"
              />
            </div>

            {tab === "register" && (
              <div>
                <label htmlFor="auth-username" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-1 ring-white/10 transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-accent"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                placeholder="8+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-1 ring-white/10 transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive ring-1 ring-destructive/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:brightness-110 hover:shadow-accent/40 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {isLoading
                ? "Loading..."
                : tab === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {/* Features */}
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
            {[
              { icon: "/pieces/merida/wn.svg", label: "Play AI" },
              { icon: "/pieces/merida/wq.svg", label: "Puzzles" },
              { icon: "/pieces/merida/wk.svg", label: "Track Rating" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <img src={icon} alt="" className="h-7 w-7 opacity-50" />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
