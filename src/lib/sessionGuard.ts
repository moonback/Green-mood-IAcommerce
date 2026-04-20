export function shouldSendSummary(durationSec: number, userId: string | null): boolean {
  if (!userId) return false;
  return durationSec >= 10;
}
