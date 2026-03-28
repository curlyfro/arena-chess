export function RatingCard({ label, rating }: { readonly label: string; readonly rating: number }) {
  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl font-bold text-foreground">{rating}</div>
    </div>
  );
}
