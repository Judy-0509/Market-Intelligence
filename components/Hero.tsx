'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Report } from '@/lib/reports';
import { heroBackgroundFor } from '@/lib/images';
import { formatDate } from '@/lib/format';

interface Slide {
  slug: string;
  title: string;
  body: string;
  author: string;
  role: string;
  date: string;
  bg: string;
}

export function Hero({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const slides: Slide[] = reports.map((r) => ({
    slug: r.slug,
    title: r.heroTitle || r.title,
    body: r.heroBody || r.summary,
    author: r.author,
    role: r.role || r.category,
    date: formatDate(r.date),
    bg: r.heroBg || heroBackgroundFor(r.app, r.slug),
  }));

  const n = slides.length;
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    if (n <= 1) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    function start() {
      stop();
      timer.current = setInterval(() => {
        if (!paused.current) setActive((a) => (a + 1) % n);
      }, 8500);
    }
    function stop() {
      if (timer.current) clearInterval(timer.current);
    }
    start();
    return stop;
  }, [n]);

  if (!n) return null;

  return (
    <section
      className="hero"
      aria-label="오늘의 인사이트"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      <div
        className="hero__track"
        style={{ width: `${n * 100}%`, transform: `translateX(-${active * (100 / n)}%)` }}
      >
        {slides.map((s) => (
          <div
            key={s.slug}
            className="hero__slide"
            style={{ width: `${100 / n}%`, background: s.bg, cursor: 'pointer' }}
            onClick={() => router.push(`/reports/${s.slug}`)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') router.push(`/reports/${s.slug}`);
            }}
          >
            <div className="hero__scrim" />
            <div className="hero__content">
              <div className="hero__eyebrow">오늘의 인사이트</div>
              <h1 className="hero__title">{s.title}</h1>
              <p className="hero__body">{s.body}</p>
              <div className="hero__meta">
                <span className="author">{s.author}</span>
                <span className="sep">|</span>
                <span>{s.role}</span>
                <span className="sep">•</span>
                <span>{s.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hero__dots" role="group" aria-label="히어로 슬라이드 선택">
        {slides.map((s, i) => (
          <button
            key={s.slug}
            type="button"
            className={'hero__dot' + (active === i ? ' is-active' : '')}
            aria-label={`슬라이드 ${i + 1}`}
            aria-current={active === i ? 'true' : undefined}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}
