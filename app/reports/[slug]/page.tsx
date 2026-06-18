import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getReport } from '@/lib/reports';
import { formatDate, formatViews } from '@/lib/format';
import { BookmarkButton } from '@/components/BookmarkButton';
import { EyeIcon, ChevronRight } from '@/components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const report = getReport(params.slug);
  if (!report) return { title: '리포트를 찾을 수 없습니다 — Market Intelligence' };
  return {
    title: `${report.title} — Market Intelligence`,
    description: report.summary,
  };
}

export default function ReportDetailPage({ params }: { params: { slug: string } }) {
  const report = getReport(params.slug);
  if (!report) notFound();

  return (
    <article className="report-detail">
      <nav className="breadcrumb" aria-label="이동 경로">
        <Link href="/">홈</Link>
        <ChevronRight size={12} />
        <Link href="/reports">리포트</Link>
      </nav>

      <div className="report-detail__category">{report.category}</div>
      <h1 className="report-detail__title">{report.title}</h1>

      <div className="report-detail__meta">
        <span className="author">{report.author}</span>
        {report.role && (
          <>
            <span className="mdot">·</span>
            <span>{report.role}</span>
          </>
        )}
        <span className="mdot">·</span>
        <span>{formatDate(report.date)}</span>
        {report.views > 0 && (
          <>
            <span className="report-row__divider" />
            <span className="report-detail__views">
              <EyeIcon size={14} /> {formatViews(report.views)}
            </span>
          </>
        )}
      </div>

      {report.summary && <p className="report-detail__summary">{report.summary}</p>}

      <div className="report-detail__tools">
        <div className="tags">
          {report.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
        <BookmarkButton slug={report.slug} size={20} />
      </div>

      <div className="report-article">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
      </div>

      <div className="report-detail__foot">
        <Link href="/reports" className="btn-ghost">
          ← 리포트 목록으로
        </Link>
      </div>
    </article>
  );
}
