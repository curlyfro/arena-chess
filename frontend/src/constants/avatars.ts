export interface AvatarPreset {
  readonly id: string;
  readonly icon: string;
  readonly bg: string;
  readonly label: string;
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  // Default — uses initials (id "initials" is treated specially)
  { id: "initials", icon: "", bg: "", label: "Initials" },

  // Chess pieces
  { id: "king",   icon: "♔", bg: "#8b5a3a", label: "King" },
  { id: "queen",  icon: "♕", bg: "#b8860b", label: "Queen" },
  { id: "rook",   icon: "♖", bg: "#4a7291", label: "Rook" },
  { id: "bishop", icon: "♗", bg: "#7b5ea7", label: "Bishop" },
  { id: "knight", icon: "♘", bg: "#2d6a8f", label: "Knight" },
  { id: "pawn",   icon: "♙", bg: "#5a6a3a", label: "Pawn" },

  // Animals
  { id: "wolf",    icon: "🐺", bg: "#4a5568", label: "Wolf" },
  { id: "eagle",   icon: "🦅", bg: "#6b4226", label: "Eagle" },
  { id: "dragon",  icon: "🐉", bg: "#8b0000", label: "Dragon" },
  { id: "lion",    icon: "🦁", bg: "#b8860b", label: "Lion" },
  { id: "fox",     icon: "🦊", bg: "#c2742f", label: "Fox" },
  { id: "owl",     icon: "🦉", bg: "#5a4a3a", label: "Owl" },

  // Abstract
  { id: "fire",    icon: "🔥", bg: "#8b2500", label: "Fire" },
  { id: "bolt",    icon: "⚡", bg: "#6b6b00", label: "Bolt" },
  { id: "star",    icon: "⭐", bg: "#4a5a6a", label: "Star" },
  { id: "crown",   icon: "👑", bg: "#7b5b00", label: "Crown" },
] as const;

export function getAvatarPreset(id: string | null): AvatarPreset | null {
  if (!id || id === "initials") return null;
  return AVATAR_PRESETS.find((a) => a.id === id) ?? null;
}
