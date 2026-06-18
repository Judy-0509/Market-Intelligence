'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Report } from '@/lib/reports';
import { thumbnailFor } from '@/lib/images';
import { formatDate } from '@/lib/format';
import { useApp } from './providers';
import { BookmarkButton } from './BookmarkButton';

function matchesSearch(r: Report, q: string): boolean {
  if (!q) return true;
  const hay = [r.title, r.category, r.author, r.summary, r.tags.join(' ')].join(' ').toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

export function HomeReports({ reports, areas }: { reports: Report[]; areas: string[] }) {
  const { query } = useApp();
  const [chip, setChip] = useState('전체');
  const chips = ['전체', ...areas];

  const list = useMemo(
    () => reports.filter((r) => (chip === '전체' || r.app === chip) && matchesSearch(r, query)),
    [reports, chip, query],
  );

  return (
    <div>
      <div className="section-head">
        <h2>최신 리포트</h2>
        <div className="chips" role="group" aria-label="응용처 필터">
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
      </div>

      <div className="cards">
        {list.length === 0 ? (
          <div className="empty">검색 결과가 없습니다.</div>
        ) : (
          list.map((r) => (
            <div className="card" key={r.slug}>
              <Link href={`/reports/${r.slug}`} className="card__link" aria-label={r.title}>
                <div className="card__thumb" style={{ background: thumbnailFor(r.app, r.slug) }} />
                <div className="card__category">{r.category}</div>
                <span className="card__title">{r.title}</span>
                <div className="card__meta">
                  <span>{r.author}</span>
                  <span>·</span>
                  <span>{formatDate(r.date)}</span>
                </div>
              </Link>
              <div className="card__foot">
                <div className="tags">
                  {r.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
                <BookmarkButton slug={r.slug} size={18} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
