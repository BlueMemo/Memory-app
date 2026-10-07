import { LoadingScreen } from "@/components/LoadingScreen";

// Shown while a page loads (Next.js wraps every page in a Suspense boundary with this as its fallback).
// `delayed` fades it in only if loading takes a moment, so quick page changes don't flash.
export default function Loading() {
  return <LoadingScreen delayed />;
}
