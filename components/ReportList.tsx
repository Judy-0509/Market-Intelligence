'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Report } from '@/lib/reports';
import { formatDate, formatViews } from '@/lib/format';
import { useApp } from './providers';
import { BookmarkButton } from './BookmarkButton';
import { EyeIcon } from './icons';

function matchesSearch(r: Report, q: string): boolean {
  if (!q) return true;
  const hay = [r.title, r.category, r.author, r.summary, r.tags.join(' ')].join(' ').toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export function ReportList({ reports, areas }: { reports: Report[]; areas: string[] }) {
  const { query, isBookmarked } = useApp();
  const searchParams = useSearchParams();
  const bookmarkedOnly = searchParams.get('bookmarked') === '1';
  const [chip, setChip] = useState('전체');
  const chips = ['전체', ...areas];

  const list = useMemo(
    () =>
      reports.filter(
        (r) =>
          (chip === '전체' || r.app === chip) &&
          (!bookmarkedOnly || isBookmarked(r.slug)) &&
          matchesSearch(r, query),
      ),
    [reports, chip, query, bookmarkedOnly, isBookmarked],
  );

  return (
    <div className="report-page">
      <div className="report-head">
        <h1>리포트</h1>
        <p>응용처별 최신 리서치 리포트를 한눈에 확인하세요.</p>
      </div>

      <div className="report-chips" role="group" aria-label="응용처 필터">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className={'chip' + (chip === c ? ' is-active' : '')}
            aria-pressed={chip === c}
            onClick={() => setChip(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div>
        {list.length === 0 ? (
          <div className="empty">{bookmarkedOnly ? '북마크한 리포트가 없습니다.' : '검색 결과가 없습니다.'}</div>
        ) : (
          list.map((r) => (
            <div className="report-row" key={r.slug}>
              <div className="report-row__main">
                <div className="report-row__category">{r.category}</div>
                <Link href={`/reports/${r.slug}`} className="report-row__title">
                  {r.title}
                </Link>
                <p className="report-row__summary">{r.summary}</p>
                <div className="report-row__meta">
                  <span className="author">{r.author}</span>
                  <span className="mdot">·</span>
                  <span className="date">{formatDate(r.date)}</span>
                  <span className="report-row__divider" />
                  {r.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="report-row__side">
                <BookmarkButton slug={r.slug} size={20} />
                <span className="report-row__views">
                  <EyeIcon size={14} /> {formatViews(r.views)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
