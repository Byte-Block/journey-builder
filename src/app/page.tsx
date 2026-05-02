import { fetchGraph, getFetchGraphOptionsFromEnv } from "@/api/client";
import { JourneyBuilder } from "@/components/JourneyBuilder";

// Server Component — fetches the graph at request time and hands it to the
// Client Component boundary as a serialized prop. Throws on missing/invalid
// env vars or fetch failure; the throw is caught by app/error.tsx.
export default async function Page() {
  const opts = getFetchGraphOptionsFromEnv();
  const graph = await fetchGraph(opts);
  return <JourneyBuilder graph={graph} />;
}
