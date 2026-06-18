import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header, type NotificationItem } from '@/components/Header';
import { getAllReports } from '@/lib/reports';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Market Intelligence',
  description: 'Market Intelligence — 증권사 리서치 인사이트 포털',
};

const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231f9d57'/%3E%3Ctext x='16' y='22' font-family='serif' font-size='18' font-weight='800' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const notifications: NotificationItem[] = getAllReports()
    .slice(0, 3)
    .map((r) => ({ slug: r.slug, title: `${r.title} 리포트가 등록되었습니다`, time: formatDate(r.date) }));

  return (
    <html lang="ko">
      <head>
        <link rel="icon" href={favicon} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..900&family=Noto+Sans+KR:wght@400;500;600;700;800;900&family=Noto+Serif+KR:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Header notifications={notifications} />
          <div className="container">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
