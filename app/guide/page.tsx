import type { Metadata } from "next"
import Link from "next/link"
import { DocsShell } from "@/components/docs-shell"

export const metadata: Metadata = {
  title: "사용 가이드 · MarkMind",
  description:
    "MarkMind 사용 방법: 구글 로그인부터 URL로 북마크 추가, 브라우저 북마크 가져오기, 휴대폰·PC에서 빠르게 저장, 검색, 공유 링크, 변경 알림까지 단계별로 안내합니다.",
}

export default function GuidePage() {
  return (
    <DocsShell current="guide">
      <article className="doc">
        <span className="kicker">사용 가이드</span>
        <h1>MarkMind 사용 방법</h1>
        <p className="lead">
          URL 하나만 넣으면 MarkMind가 페이지를 읽고 제목·설명·카테고리·태그를 자동으로 채워 정리해 줍니다. 처음
          시작하는 순서대로 하나씩 따라 해 보세요.
        </p>

        <div className="tip">
          <strong>목차</strong> — 1. 시작하기 · 2. 북마크 추가 · 3. 브라우저 북마크 가져오기 · 4. 빠르게 저장하기 · 5.
          찾기와 정리 · 6. 모음 공유 · 7. 변경 알림 · 8. 계정과 보안
        </div>

        <h2>1. 시작하기</h2>
        <ol>
          <li>
            <Link href="/">첫 화면</Link>에서 <strong>Google로 무료 시작하기</strong>(또는 오른쪽 위 <strong>로그인</strong>)를
            누릅니다.
          </li>
          <li>구글 계정을 고르면 바로 내 북마크 화면이 열립니다. 별도 가입 절차나 요금은 없습니다.</li>
          <li>오른쪽 위 언어 버튼으로 화면 언어(한국어·일본어·영어)를 바꿀 수 있습니다.</li>
        </ol>

        <h2>2. URL로 북마크 추가하기</h2>
        <ol>
          <li>
            위쪽의 <strong>북마크 추가</strong>(+) 버튼을 누릅니다.
          </li>
          <li>
            <strong>사이트 URL</strong> 칸에 주소를 붙여넣고 <strong>분석</strong>을 누릅니다.
          </li>
          <li>잠시 뒤 사이트명, 설명, 카테고리, 태그, 썸네일이 채워집니다. 내용을 확인하고 저장하세요.</li>
        </ol>
        <p>
          카테고리는 AI · 디자인 · 쇼핑 · 기술 · 뉴스 · 엔터테인먼트 · 교육 · 비즈니스 · 소셜 · 금융 · 기타 중에서
          자동으로 정해집니다. 마음에 들지 않으면 카드의 편집 버튼으로 카테고리와 태그를 바꾸거나{" "}
          <strong>직접 입력</strong>으로 나만의 카테고리를 만들 수 있습니다.
        </p>
        <div className="tip">
          브라우저에서 보고 있는 링크를 MarkMind 화면 위로 <strong>끌어다 놓아도</strong> 바로 분석해서 저장합니다. 이미
          저장한 주소는 다시 저장되지 않고 알려 드립니다.
        </div>

        <h2>3. 브라우저 북마크 한 번에 가져오기</h2>
        <p>지금까지 크롬·엣지·웨일·사파리·파이어폭스에 모아 둔 북마크를 그대로 옮길 수 있습니다.</p>
        <ol>
          <li>
            브라우저의 북마크 관리자에서 <strong>북마크 내보내기</strong>로 HTML 파일을 저장합니다. (크롬: 북마크 관리자 →
            오른쪽 위 ⋮ → 북마크 내보내기)
          </li>
          <li>
            MarkMind 목록 위의 <strong>브라우저 북마크 가져오기</strong>를 누르고, 저장한 .html 파일을 고릅니다.
          </li>
          <li>
            새로 찾은 개수를 확인하고 <strong>가져오기 시작</strong>을 누르면 하나씩 분석하며 저장합니다.
          </li>
        </ol>
        <ul>
          <li>이미 저장된 주소와 파일 안의 중복은 자동으로 건너뜁니다.</li>
          <li>한 번에 최대 500개까지 가져옵니다. 더 많으면 같은 파일로 한 번 더 가져오면 나머지가 들어옵니다.</li>
          <li>브라우저에서 쓰던 폴더 이름은 첫 번째 태그로, 원래 저장한 날짜는 그대로 남습니다.</li>
        </ul>

        <h2>4. 어디서든 빠르게 저장하기</h2>
        <h3>PC 브라우저 — 저장 버튼</h3>
        <ol>
          <li>즐겨찾기 바를 켭니다. (크롬·엣지: Ctrl+Shift+B, 맥: ⌘+Shift+B)</li>
          <li>
            MarkMind 오른쪽 위 프로필 메뉴 → <strong>빠르게 저장하는 방법</strong>을 엽니다.
          </li>
          <li>
            <strong>MarkMind에 저장</strong> 버튼을 누르지 말고 즐겨찾기 바로 끌어다 놓습니다.
          </li>
          <li>이제 어떤 페이지를 보다가도 그 버튼을 누르면 작은 창이 열려 저장하고 자동으로 닫힙니다.</li>
        </ol>
        <h3>휴대폰(안드로이드) — 공유하기</h3>
        <ol>
          <li>크롬에서 MarkMind를 연 뒤 메뉴 → <strong>홈 화면에 추가</strong>로 앱처럼 설치합니다.</li>
          <li>
            다른 앱에서 링크를 <strong>공유</strong>할 때 목록에 나오는 MarkMind를 고르면 바로 저장됩니다.
          </li>
        </ol>
        <p>
          아이폰은 아직 웹앱을 공유 메뉴에 넣을 수 없습니다. 링크를 복사해 MarkMind의 + 버튼에 붙여넣어 주세요.
        </p>

        <h2>5. 찾기와 정리</h2>
        <ul>
          <li>
            <strong>검색</strong>: 위쪽 검색창에 단어를 넣으면 제목·설명·태그·주소를 한꺼번에 찾습니다.
          </li>
          <li>
            <strong>카테고리 필터</strong>: PC에서는 왼쪽 카테고리 목록, 휴대폰에서는 위쪽 탭을 옆으로 넘겨 고릅니다.
          </li>
          <li>
            <strong>전체 재분석</strong>: 예전에 저장한 북마크의 카테고리·태그를 한 번에 최신 기준으로 다시 정리합니다.
          </li>
          <li>
            <strong>설명 번역</strong>: 화면 언어를 일본어나 영어로 바꾸면, 다른 언어로 된 설명을 그 언어로 번역해
            보여 줍니다.
          </li>
        </ul>

        <h2>6. 모음을 링크로 공유하기</h2>
        <ol>
          <li>공유하고 싶은 카테고리(또는 전체)를 고른 상태에서 목록 위의 <strong>공유</strong>를 누릅니다.</li>
          <li>
            <strong>공유 링크 만들기</strong>를 누르고 <strong>복사</strong>해서 보내면, 받는 사람은 로그인하지 않아도 볼
            수 있습니다.
          </li>
          <li>
            북마크를 바꾼 뒤 <strong>최신으로 업데이트</strong>를 누르면 같은 링크에 반영되고, <strong>공유 중지</strong>를
            누르면 링크가 더 이상 열리지 않습니다.
          </li>
        </ol>
        <p>공유 링크는 검색엔진에 노출되지 않으며, 링크를 아는 사람만 제목·주소·설명·태그를 볼 수 있습니다.</p>

        <h2>7. 페이지 변경 알림 받기</h2>
        <ol>
          <li>
            자주 바뀌는 페이지(공지사항, 가격표 등) 카드에서 <strong>알림 켜기</strong>(벨)를 누릅니다.
          </li>
          <li>브라우저가 알림 권한을 물으면 허용합니다.</li>
          <li>그 페이지 내용이 바뀌면 알림이 오고, 헤더의 벨을 누르면 바뀐 북마크를 최근 순서로 볼 수 있습니다.</li>
        </ol>

        <h2>8. 계정과 보안</h2>
        <ul>
          <li>기본으로 로그인 상태가 유지되어, 브라우저를 닫았다 열어도 다시 로그인할 필요가 없습니다.</li>
          <li>
            여러 사람이 쓰는 컴퓨터라면 프로필 메뉴에서 <strong>3분 자동 로그아웃</strong>을 켜세요. 3분 동안 아무것도
            하지 않거나 탭을 닫으면 자동으로 로그아웃됩니다. 이 설정은 기기(브라우저)마다 따로 저장됩니다.
          </li>
        </ul>

        <p className="mt-12">
          더 궁금한 점은 <Link href="/faq">자주 묻는 질문</Link>을 보거나, 활용 팁은 <Link href="/blog">블로그</Link>에서
          확인하세요.
        </p>
      </article>
    </DocsShell>
  )
}
