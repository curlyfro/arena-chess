import { memo } from "react";

interface SquareProps {
  readonly x: number;
  readonly y: number;
  readonly isLight: boolean;
  readonly lightColor: string;
  readonly darkColor: string;
}

export const Square = memo(function Square({
  x,
  y,
  isLight,
  lightColor,
  darkColor,
}: SquareProps) {
  return (
    <rect
      x={x}
      y={y}
      width={100}
      height={100}
      fill={isLight ? lightColor : darkColor}
    />
  );
});
