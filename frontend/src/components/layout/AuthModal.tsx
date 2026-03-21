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
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl ring-1 ring-border"
          aria-describedby={undefined}
        >
          <Dialog.Title className="mb-4 text-xl font-bold text-foreground">
            {tab === "login" ? "Sign In" : "Create Account"}
          </Dialog.Title>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "login"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "register"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border focus:ring-accent"
            />

            {tab === "register" && (
              <input
                type="text"
                placeholder="Username (3-20 characters)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border focus:ring-accent"
              />
            )}

            <input
              type="password"
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border focus:ring-accent"
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent/80 disabled:opacity-50"
            >
              {isLoading
                ? "Loading..."
                : tab === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
