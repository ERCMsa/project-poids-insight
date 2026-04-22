export type PoidsEntry = {
  project: string;
  date: string;
  totalPoids: number;
};

export type Source = "fabrication" | "sortie" | "montage";

const BASE = "https://api.ercmsalhi.com/api/out/poidsDaily";

export const ENDPOINTS: Record<Source, string> = {
  fabrication: `${BASE}/fabrication`,
  sortie: `${BASE}/sortie`,
  montage: `${BASE}/montage`,
};

export async function fetchSource(source: Source): Promise<PoidsEntry[]> {
  const res = await fetch(ENDPOINTS[source]);
  if (!res.ok) throw new Error(`Failed to fetch ${source}`);
  const data: PoidsEntry[] = await res.json();
  // filter out invalid dates
  return data.filter((d) => {
    const t = new Date(d.date).getTime();
    return !isNaN(t);
  });
}

export async function fetchAll(): Promise<Record<Source, PoidsEntry[]>> {
  const [fabrication, sortie, montage] = await Promise.all([
    fetchSource("fabrication"),
    fetchSource("sortie"),
    fetchSource("montage"),
  ]);
  return { fabrication, sortie, montage };
}

export const SOURCE_LABELS: Record<Source, string> = {
  fabrication: "Fabrication",
  sortie: "Sortie",
  montage: "Montage",
};

export const SOURCE_COLORS: Record<Source, string> = {
  fabrication: "hsl(var(--chart-1))",
  sortie: "hsl(var(--chart-2))",
  montage: "hsl(var(--chart-3))",
};
