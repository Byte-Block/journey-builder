import { fetchGraph, getFetchGraphOptionsFromEnv } from "@/api/client";
import { JourneyBuilder } from "@/components/JourneyBuilder";

export default async function Page() {
  const opts = getFetchGraphOptionsFromEnv();
  const graph = await fetchGraph(opts);
  return <JourneyBuilder graph={graph} />;
}
