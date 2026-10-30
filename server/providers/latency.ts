import { stubLatencyMs } from "@/server/config";

export async function pauseForStub(): Promise<void> {
  const ms = stubLatencyMs();
  if (ms === 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
