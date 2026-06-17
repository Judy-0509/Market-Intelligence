import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, margin: 0 }}>404</h1>
      <p style={{ color: 'var(--ink-500)', marginTop: 12 }}>
        요청하신 리포트를 찾을 수 없습니다.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link href="/" className="btn-primary">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
