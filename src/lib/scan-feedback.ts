import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CONFIRMS_KEY = '@sakescan:scan_confirms';
const WRONGS_KEY = '@sakescan:scan_wrongs';

export type ScanFeedbackKind = 'confirm' | 'wrong';

export interface ScanFeedbackEntry {
  kind: ScanFeedbackKind;
  sakeId?: string;
  name: string;
  brewery: string;
  at: string;
}

async function appendFeedback(key: string, entry: ScanFeedbackEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const list: ScanFeedbackEntry[] = raw ? (JSON.parse(raw) as ScanFeedbackEntry[]) : [];
    list.unshift(entry);
    await AsyncStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
  } catch (err) {
    console.warn('Failed to persist scan feedback:', err);
  }
}

/** Best-effort remote insert for signed-in users. Guests stay local-only. */
async function syncRemoteFeedback(params: {
  kind: ScanFeedbackKind;
  sakeId?: string;
  name: string;
  brewery: string;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('scan_feedback').insert({
      user_id: user.id,
      kind: params.kind,
      sake_id: params.sakeId ?? null,
      name: params.name,
      brewery: params.brewery || null,
    } as Record<string, unknown>);

    if (error) {
      console.warn('Failed to sync scan feedback:', error.message);
    }
  } catch (err) {
    console.warn('Failed to sync scan feedback:', err);
  }
}

/** Log a confirmed catalog match locally + remotely when authenticated. */
export async function logScanConfirm(params: {
  sakeId?: string;
  name: string;
  brewery: string;
}): Promise<void> {
  await appendFeedback(CONFIRMS_KEY, {
    kind: 'confirm',
    sakeId: params.sakeId,
    name: params.name,
    brewery: params.brewery,
    at: new Date().toISOString(),
  });
  await syncRemoteFeedback({ kind: 'confirm', ...params });
}

/** Log a wrong-sake correction locally + remotely when authenticated. */
export async function logScanWrong(params: {
  sakeId?: string;
  name: string;
  brewery: string;
}): Promise<void> {
  await appendFeedback(WRONGS_KEY, {
    kind: 'wrong',
    sakeId: params.sakeId,
    name: params.name,
    brewery: params.brewery,
    at: new Date().toISOString(),
  });
  await syncRemoteFeedback({ kind: 'wrong', ...params });
}
