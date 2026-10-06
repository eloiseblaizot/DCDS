/** Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur hex. */
export function shade(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const num = parseInt(full, 16);
  const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  const target = amount >= 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const out = channels.map((c) => Math.round(c + (target - c) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Texte lisible (encre sombre ou blanc) sur une couleur donnée. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#1d2a5c" : "#ffffff";
}

const AVATAR_COLORS = ["#5496ff", "#ff54ff", "#f58d25", "#2fd60c", "#e6c800", "#ff4f5e", "#13b5d1", "#a26bff"];

export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
