"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/** True once hydrated on the client. Lets a component wait for browser-only data (e.g. localStorage) before deciding it's missing. */
export function useMounted(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}
