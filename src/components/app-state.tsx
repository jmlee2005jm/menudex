import { PrimaryLink } from "@/components/page-shell";

export function SetupRequired() {
  return (
    <div className="mt-6 border border-line bg-white/70 p-4">
      <p className="font-medium">MenuDex 설정이 필요합니다.</p>
      <p className="mt-2 text-sm leading-6 text-ink/65">
        `.env.local`에 Supabase 서비스 키, owner UUID, 세션 시크릿을 설정한 뒤
        서버를 다시 시작하세요.
      </p>
    </div>
  );
}

export function LoginRequired() {
  return (
    <div className="mt-6 border border-line bg-white/70 p-4">
      <p className="font-medium">프로필 선택이 필요합니다.</p>
      <p className="mt-2 text-sm leading-6 text-ink/65">
        사용할 프로필을 선택하면 식당과 메뉴 기록을 사용할 수 있습니다.
      </p>
      <div className="mt-4">
        <PrimaryLink href="/profiles">프로필 선택</PrimaryLink>
      </div>
    </div>
  );
}

export function LoadingState() {
  return <p className="mt-6 text-sm text-ink/60">불러오는 중...</p>;
}
