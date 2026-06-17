import { Suspense } from 'react';
import { ReportList } from '@/components/ReportList';
import { getAllReports, getAppAreas } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  const reports = getAllReports();
  const areas = getAppAreas();
  return (
    <Suspense fallback={<div className="empty">불러오는 중…</div>}>
      <ReportList reports={reports} areas={areas} />
    </Suspense>
  );
}
