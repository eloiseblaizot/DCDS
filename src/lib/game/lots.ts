import type { Lot, Tier } from "./types";

export const TIERS: Record<Tier, { label: string; color: string; ink: string; defaultValue: number }> = {
  nul: { label: "Ultra nul", color: "#b9a389", ink: "#4a3a28", defaultValue: 1 },
  bof: { label: "Bof", color: "#f3d7a6", ink: "#6b4a12", defaultValue: 25 },
  cool: { label: "Sympa", color: "#4bf525", ink: "#185b07", defaultValue: 250 },
  top: { label: "Trop bien", color: "#5496ff", ink: "#ffffff", defaultValue: 1500 },
  legendaire: { label: "Légendaire", color: "#ffe814", ink: "#5b4b00", defaultValue: 8000 },
};

export const TIER_ORDER: Tier[] = ["nul", "bof", "cool", "top", "legendaire"];

type Row = [id: string, emoji: string, name: string, value: number];

const rows: Record<Tier, Row[]> = {
  nul: [
    ["cafard", "🪳", "Un cafard dans un bocal", 0],
    ["slip", "🩲", "Un slip usagé", 0],
    ["urinoir", "🚽", "Un urinoir (déjà servi)", 2],
    ["chaussette", "🧦", "Une chaussette orpheline", 0],
    ["caillou", "🪨", "Un caillou très ordinaire", 0],
    ["banane", "🍌", "Une banane trop mûre", 0],
    ["ticket", "🎫", "Un ticket de métro composté", 0],
    ["oignon", "🧅", "Un oignon qui fait pleurer", 1],
    ["pq", "🧻", "Un rouleau de PQ entamé", 1],
    ["dent", "🦷", "Une dent de lait (pas la tienne)", 0],
    ["brique", "🧱", "Une brique", 1],
    ["pile", "🔋", "Une pile usagée", 0],
    ["chewing", "🍬", "Un chewing-gum mâché", 0],
    ["tong", "🩴", "Une tong gauche", 1],
    ["cactus", "🌵", "Un cactus mort", 2],
    ["sardines", "🥫", "Des sardines périmées depuis 2009", 1],
    ["ver", "🪱", "Un ver de terre nommé Gérard", 0],
    ["mouchoir", "🤧", "Un mouchoir utilisé", 0],
    ["moule", "🦪", "Une moule qui sent fort", 1],
    ["trombone", "📎", "Un trombone tordu", 0],
    ["pigeon", "🐦", "Un pigeon empaillé", 3],
    ["boite-vide", "📦", "Une boîte vide", 0],
    ["poisson", "🐟", "Un poisson pané froid", 1],
    ["rat", "🐀", "Un rat en peluche mité", 2],
    ["eau", "💧", "Un verre d'eau tiède", 0],
  ],
  bof: [
    ["mug", "☕", "Un mug « Meilleur collègue »", 12],
    ["parapluie", "☂️", "Un parapluie retourné", 15],
    ["plante", "🪴", "Une plante verte en plastique", 20],
    ["yoyo", "🪀", "Un yoyo lumineux", 10],
    ["puzzle", "🧩", "Un puzzle 5000 pièces tout blanc", 30],
    ["kazoo", "🎺", "Un kazoo", 8],
    ["bougie", "🕯️", "Une bougie parfum « pneu »", 18],
    ["chaussettes-noel", "🎄", "Des chaussettes de Noël", 14],
    ["livre-tofu", "📕", "Un livre de recettes 100 % tofu", 22],
    ["calin", "🤗", "Un bon pour un câlin", 10],
    ["bowling", "🎳", "Une boule de bowling rayée", 35],
    ["lampe", "🪔", "Une lampe à lave tiède", 40],
    ["tasse", "🫖", "Une théière en forme de chat", 28],
    ["bob", "👒", "Un bob Ricard vintage", 25],
  ],
  cool: [
    ["casque", "🎧", "Un casque gaming", 180],
    ["sneakers", "👟", "Une paire de sneakers", 220],
    ["velo", "🚲", "Un vélo tout neuf", 450],
    ["resto", "🍽️", "Un dîner gastronomique pour deux", 300],
    ["trottinette", "🛴", "Une trottinette électrique", 400],
    ["netflix", "📺", "Un an de streaming offert", 160],
    ["manette", "🎮", "Une manette pro", 190],
    ["drone", "🛸", "Un drone avec caméra", 350],
    ["montre", "⌚", "Une montre connectée", 330],
    ["polaroid", "📷", "Un appareil photo instantané", 120],
    ["parachute", "🪂", "Un saut en parachute", 290],
    ["concert", "🎟️", "Deux places de concert en fosse", 200],
    ["guitare", "🎸", "Une guitare électrique", 480],
    ["spa", "🧖", "Une journée au spa", 250],
  ],
  top: [
    ["switch2", "🕹️", "Une Switch 2", 470],
    ["console", "🎮", "Une console next-gen", 550],
    ["smartphone", "📱", "Un smartphone dernier cri", 1200],
    ["pc", "🖥️", "Un PC gamer monstrueux", 2500],
    ["laptop", "💻", "Un ordinateur portable", 1600],
    ["scooter", "🛵", "Un scooter", 2800],
    ["rome", "🍕", "Un week-end à Rome", 900],
    ["cinema", "🎬", "Un home cinéma", 2000],
    ["courses", "🛒", "Six mois de courses payées", 2400],
    ["vr", "🥽", "Un casque de réalité virtuelle", 1100],
    ["ski", "⛷️", "Une semaine au ski", 1800],
  ],
  legendaire: [
    ["japon", "🗾", "Un voyage au Japon", 6000],
    ["loyer", "🏠", "Un an de loyer payé", 12000],
    ["voiture", "🚗", "Une voiture neuve", 25000],
    ["lingot", "🪙", "Un lingot d'or", 70000],
    ["tour-du-monde", "🌍", "Un tour du monde", 20000],
    ["jetski", "🚤", "Un jet-ski", 15000],
    ["piscine", "🏊", "Une piscine dans ton jardin", 30000],
    ["cheval", "🐎", "Un cheval (avec son pré)", 9000],
  ],
};

export const CATALOG: Lot[] = (Object.keys(rows) as Tier[]).flatMap((tier) =>
  rows[tier].map(([id, emoji, name, value]) => ({ id: `c-${id}`, emoji, name, value, tier })),
);

const TIER_WEIGHTS: [Tier, number][] = [
  ["nul", 0.3],
  ["bof", 0.18],
  ["cool", 0.22],
  ["top", 0.2],
  ["legendaire", 0.1],
];

function weightedTier(rng: () => number): Tier {
  let r = rng();
  for (const [tier, w] of TIER_WEIGHTS) {
    if (r < w) return tier;
    r -= w;
  }
  return "nul";
}

export function shuffle<T>(list: T[], rng: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire `count` lots dans le pool. Garantit au moins un lot ultra nul et un lot
 * top/légendaire par manche quand le pool le permet, et évite de ressortir un lot
 * déjà utilisé dans la partie tant qu'il en reste d'autres.
 */
export function drawLots(count: number, pool: Lot[], used: Set<string>, rng: () => number): Lot[] {
  const source = pool.length > 0 ? pool : CATALOG;
  const result: Lot[] = [];

  const pickFrom = (filter: (l: Lot) => boolean): Lot | null => {
    let candidates = source.filter((l) => filter(l) && !used.has(l.id) && !result.includes(l));
    if (candidates.length === 0) candidates = source.filter((l) => filter(l) && !result.includes(l));
    if (candidates.length === 0) return null;
    const lot = candidates[Math.floor(rng() * candidates.length)];
    used.add(lot.id);
    result.push(lot);
    return lot;
  };

  if (count >= 2) {
    pickFrom((l) => l.tier === "nul");
    pickFrom((l) => l.tier === "top" || l.tier === "legendaire");
  }
  while (result.length < count) {
    const tier = weightedTier(rng);
    if (pickFrom((l) => l.tier === tier)) continue;
    if (pickFrom(() => true)) continue;
    // Pool trop petit (lots custom) : on autorise les doublons.
    result.push(source[Math.floor(rng() * source.length)]);
  }
  return shuffle(result.slice(0, count), rng);
}

export function lotPool(mode: "catalog" | "custom" | "mixed", custom: Lot[]): Lot[] {
  const customLots = custom.map((l) => ({ ...l, custom: true }));
  if (mode === "custom") return customLots.length > 0 ? customLots : CATALOG;
  if (mode === "mixed") return [...CATALOG, ...customLots];
  return CATALOG;
}

export function formatValue(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} €`;
}
