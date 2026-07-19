import type { EventName, EventProps } from "./types";
import { insert } from "../../shared/supabase";
import { coarseOs } from "../../shared/config";

const INSTALL_ID_KEY = "installId";

export async function getInstallId(): Promise<string> {
  const stored = await chrome.storage.local.get([INSTALL_ID_KEY]);
  const existing = stored[INSTALL_ID_KEY];
  if (typeof existing === "string" && existing.length > 0) return existing;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [INSTALL_ID_KEY]: id });
  return id;
}

// Off-background contexts call this. The background worker records it.
export function track(name: EventName, props?: EventProps): void {
  void chrome.runtime.sendMessage({ type: "TRACK_EVENT", name, props }).catch(() => {});
}

export async function recordEvent(name: EventName, props?: EventProps): Promise<boolean> {
  const installId = await getInstallId();
  const version = chrome.runtime.getManifest().version;
  return insert("events", {
    install_id: installId,
    name,
    props: props ?? null,
    version,
    os: coarseOs()
  });
}
