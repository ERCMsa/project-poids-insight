import { useQuery } from "@tanstack/react-query";
import { fetchAll, fetchSource, Source } from "@/lib/api";

export function useAllPoids() {
  return useQuery({
    queryKey: ["poids", "all"],
    queryFn: fetchAll,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSourcePoids(source: Source) {
  return useQuery({
    queryKey: ["poids", source],
    queryFn: () => fetchSource(source),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
