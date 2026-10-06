import { isIgnoredError, reportError } from "@/lib/problemReports";

// Sends errors nobody caught to `problem_reports` (lib/problemReports.ts), so problems the test group runs
// into reach the team. Errors while rendering a page are caught by app/error.tsx, which reports them too.
window.addEventListener("error", (event) => {
  if (isIgnoredError(event.message, event.filename)) return;
  reportError(event.error ?? event.message, event.filename);
});

window.addEventListener("unhandledrejection", (event) => {
  reportError(event.reason);
});
