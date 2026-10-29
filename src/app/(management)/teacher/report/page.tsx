import { Report } from "@/features/analytics/report";
// AuthBoundary waits for browser sign-in before rendering this page.
export const instant = false;

export default function TeacherReportPage() {
  return <Report teacher />;
}
