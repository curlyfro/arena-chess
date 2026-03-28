import { memo } from "react";
import { getAvatarPreset } from "@/constants/avatars";

interface PlayerAvatarProps {
  readonly type: "player" | "ai";
  readonly name: string;
  readonly aiLevel?: number;
  readonly avatarId?: string | null;
  readonly avatarImage?: string | null;
  readonly size?: number;
}

// AI avatars: chess pieces that get more powerful with level
const AI_CONFIG: readonly { icon: string; bg: string }[] = [
  { icon: "♟", bg: "#4a5568" },  // L1 Beginner — pawn, gray
  { icon: "♟", bg: "#5a6a3a" },  // L2 Novice — pawn, olive
  { icon: "♞", bg: "#4a7291" },  // L3 Amateur — knight, blue
  { icon: "♞", bg: "#2d6a8f" },  // L4 Club — knight, deeper blue
  { icon: "♝", bg: "#7b5ea7" },  // L5 Intermediate — bishop, purple
  { icon: "♜", bg: "#8b5a3a" },  // L6 Advanced — rook, bronze
  { icon: "♛", bg: "#b8860b" },  // L7 Expert — queen, gold
  { icon: "♚", bg: "#8b0000" },  // L8 Master — king, crimson
];

function getInitial(name: string): string {
  return (name.charAt(0) || "?").toUpperCase();
}

// Deterministic color from username
function getPlayerColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 45%, 40%)`;
}

export const PlayerAvatar = memo(function PlayerAvatar({
  type,
  name,
  aiLevel,
  avatarId,
  avatarImage,
  size = 44,
}: PlayerAvatarProps) {
  if (type === "ai") {
    const config = AI_CONFIG[(aiLevel ?? 1) - 1] ?? AI_CONFIG[0];
    return (
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: config.bg,
          fontSize: size * 0.5,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {config.icon}
      </div>
    );
  }

  // Custom uploaded image takes priority
  if (avatarImage) {
    return (
      <img
        src={avatarImage}
        alt={name || "Avatar"}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  // Check for a selected avatar preset
  const preset = getAvatarPreset(avatarId ?? null);
  if (preset) {
    return (
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: preset.bg,
          fontSize: size * 0.5,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {preset.icon}
      </div>
    );
  }

  // Default: initials in colored circle
  const bg = name ? getPlayerColor(name) : "#4a5568";
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.4,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {name ? getInitial(name) : "?"}
    </div>
  );
});
