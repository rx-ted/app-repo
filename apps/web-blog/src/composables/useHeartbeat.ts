import { http } from '@/http';
import { API } from '@/constants/api';

export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
export const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

export async function sendHeartbeat(): Promise<void> {
  try {
    await http.put(API.USER_HEARTBEAT);
  } catch {
    /* silent */
  }
}
