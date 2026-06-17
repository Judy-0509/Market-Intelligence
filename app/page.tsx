import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { HomeReports } from '@/components/HomeReports';
import { EyeIcon, ChevronRight } from '@/components/icons';
import { getAppAreas, getFeaturedReports, getHeroReports, getRanking } from '@/lib/reports';
import { formatDate, formatViews } from '@/lib/format';

// Read markdown fresh on each request so newly added/mounted reports show up.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const heroes = getHeroReports();
  const featured = getFeaturedReports();
  const ranking = getRanking(5);
  const areas = getAppAreas();

  return (
    <div>
      <Hero reports={heroes} />

      <div className="main-grid">
        <HomeReports reports={featured} areas={areas} />

        <aside className="sidebar">
          <div className="panel">
            <div className="panel__head">
              <h3>많이 본 리포트</h3>
              <Link href="/reports" className="panel__more" aria-label="리포트 페이지로 이동">
                더보기 <ChevronRight size={12} />
              </Link>
            </div>
            <div>
              {ranking.map((r, i) => (
                <Link href={`/reports/${r.slug}`} className="rank-row" key={r.slug}>
                  <span className="rank-row__num">{i + 1}</span>
                  <span className="rank-row__title">{r.title}</span>
                  <span className="rank-row__date">{formatDate(r.date)}</span>
                  <span className="rank-row__views">
                    <EyeIcon size={13} /> {formatViews(r.views)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
