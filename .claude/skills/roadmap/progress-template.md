# 진행 상황

- Knot 경로:
- 시작일:

## 1단계. 스파이크
- [ ] 1.1 Knot 구조 조사
- [ ] 1.2 prplay package.json과 Vite 의존성 설치
- [ ] 1.3 src/build/build.ts
- [ ] 1.4 svgr·define·babel 설정 맞추기
- [ ] 1.5 최소 shell (Provider, Error Boundary)
- [ ] 1.6 케이스 두 개 (Stepper, Breadcrumb)
- [ ] 1.7 단일 HTML 빌드와 file:// 확인
- [ ] 1.8 아티팩트 업로드와 미확인 항목 확인
- [ ] 1.9 (선택) Cosmos·Ladle 단일 파일 빌드 가능 여부

## 2단계. props 컨트롤
- [ ] 2.1 react-docgen 주입
- [ ] 2.2 타입별 컨트롤
- [ ] 2.3 함수 호출 기록 패널
- [ ] 2.4 프리셋
- [ ] 2.5 key 교체로 다시 마운트
- [ ] 2.6 localStorage 저장, JSON 복사/붙여넣기, 초기화
- [ ] 2.7 폭 조절과 CSS 격리

## 3단계. 네트워크 모킹
- [ ] 3.1 startMocking (interceptors + getResponse)
- [ ] 3.2 요청 기록 패널
- [ ] 3.3 페이지 케이스와 시나리오 4개
- [ ] 3.4 시나리오 편집 UI (CodeMirror 6)
- [ ] 3.5 적용 시 QueryClient 새로 만들기
- [ ] 3.6 기존 MSW 핸들러 재사용
- [ ] 3.7 시나리오 localStorage 저장

## 4단계. 코드 패널
- [ ] 4.1 sourcesModule (소스, diff, SHA 링크)
- [ ] 4.2 탭 UI
- [ ] 4.3 문법 강조 선택과 크기 비교
- [ ] 4.4 GitHub 링크 열기 또는 복사
- [ ] 4.5 decisions, impacts와 영향 범위 스크립트

## 5단계. 스킬
- [ ] 5.1 review-page SKILL.md
- [ ] 5.2 example-case 두 개
- [ ] 5.3 엣지 케이스·시나리오 규칙
- [ ] 5.4 검증 단계
- [ ] 5.5 (선택) Playwright 스모크 테스트
- [ ] 5.6 다른 PR 두세 개로 다듬기

## 6단계. 스킬로 묶기
- [ ] 6.1 스킬 폴더 구성
- [ ] 6.2 defineConfig와 review-kit 이름 풀기
- [ ] 6.3 CLI (build, dev, init)
- [ ] 6.4 스킬 폴더 의존성과 자동 설치
- [ ] 6.5 Knot 적용과 처음 설정 단계
- [ ] 6.6 README

## 확인 항목 (plan.md 14장)
- [ ] 아티팩트 파일 크기 상한
- [ ] 아티팩트에서 외부 이미지와 폰트 로딩이 막히는지
- [ ] 부모 URL hash가 iframe으로 전달되는지
- [ ] 아티팩트 iframe에서 window.open과 새 창 링크가 동작하는지
- [ ] 로그인하지 않은 사람의 아티팩트 열람 가능 여부
- [ ] Claude Code에서 아티팩트로 바로 게시하는 경로
- [ ] Knot의 API 호출 방식과 서버 상태 라이브러리
- [ ] Knot webpack svgr 옵션을 Vite로 옮겼을 때 아이콘 결과가 같은지
- [ ] React Cosmos, Ladle에 단일 파일 빌드를 붙일 수 있는지

## 단계 완료

## 막힌 점

## 작업 기록
