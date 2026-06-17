'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './providers';
import { BellIcon, ChevronDown, SearchIcon } from './icons';

export interface NotificationItem {
  slug: string;
  title: string;
  time: string;
}

export function Header({ notifications }: { notifications: NotificationItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { query, setQuery, showToast } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const menusRef = useRef<HTMLDivElement>(null);

  const isReports = pathname.startsWith('/reports');
  const isHome = !isReports;

  // Close menus on outside click / Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menusRef.current && !menusRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setAccountOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function account(action: string) {
    setAccountOpen(false);
    if (action === 'bookmarks') {
      router.push('/reports?bookmarked=1');
      showToast('북마크한 리포트만 표시합니다.');
      return;
    }
    const msgs: Record<string, string> = {
      profile: '프로필은 준비 중인 기능입니다.',
      settings: '설정은 준비 중인 기능입니다.',
      logout: '로그아웃되었습니다.',
    };
    showToast(msgs[action] || '');
  }

  return (
    <div className="topbar">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="홈으로">
          <div className="brand__name">Market Intelligence</div>
          <div className="brand__tag">Insight for Smart Decisions</div>
        </Link>

        <nav className="nav" aria-label="주요 메뉴">
          <Link
            href="/"
            className={'nav__item' + (isHome ? ' is-active' : '')}
            aria-current={isHome ? 'page' : undefined}
          >
            홈{isHome && <span className="nav__underline" />}
          </Link>
          <Link
            href="/reports"
            className={'nav__item' + (isReports ? ' is-active' : '')}
            aria-current={isReports ? 'page' : undefined}
          >
            리포트{isReports && <span className="nav__underline" />}
          </Link>
        </nav>

        <div className="header-actions">
          <div className="search">
            <input
              type="search"
              aria-label="검색"
              placeholder="검색어를 입력하세요"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <SearchIcon />
          </div>

          <div className="header-menus" ref={menusRef}>
            <div className="menu">
              <button
                type="button"
                className="icon-btn bell"
                aria-label="알림"
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setAccountOpen(false);
                }}
              >
                <BellIcon />
                {!notifRead && notifications.length > 0 && (
                  <span className="bell__badge">{notifications.length}</span>
                )}
              </button>
              <div className={'dropdown' + (notifOpen ? ' is-open' : '')} role="menu" aria-label="알림">
                <div className="dropdown__head">알림</div>
                {notifications.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/reports/${n.slug}`}
                    className="notif"
                    role="menuitem"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span className="notif__dot" />
                    <span className="notif__body">
                      <span className="notif__title">{n.title}</span>
                      <span className="notif__time">{n.time}</span>
                    </span>
                  </Link>
                ))}
                <div className="dropdown__foot">
                  <button
                    type="button"
                    className="dropdown__link"
                    onClick={() => {
                      setNotifRead(true);
                      showToast('알림을 모두 읽음으로 표시했습니다.');
                    }}
                  >
                    모두 읽음으로 표시
                  </button>
                </div>
              </div>
            </div>

            <div className="menu">
              <button
                type="button"
                className="icon-btn avatar"
                aria-label="내 계정"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                <span className="avatar__img" />
                <ChevronDown />
              </button>
              <div
                className={'dropdown dropdown--account' + (accountOpen ? ' is-open' : '')}
                role="menu"
                aria-label="계정 메뉴"
              >
                <button type="button" className="menu-item" role="menuitem" onClick={() => account('profile')}>
                  프로필
                </button>
                <button type="button" className="menu-item" role="menuitem" onClick={() => account('bookmarks')}>
                  북마크한 리포트
                </button>
                <button type="button" className="menu-item" role="menuitem" onClick={() => account('settings')}>
                  설정
                </button>
                <button
                  type="button"
                  className="menu-item menu-item--danger"
                  role="menuitem"
                  onClick={() => account('logout')}
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
