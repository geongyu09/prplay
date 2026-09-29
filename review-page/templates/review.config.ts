// review-page 스킬 설정 (plan.md 11.2). 경로는 모두 이 파일이 있는 폴더 기준이다
import { defineConfig } from "review-kit";

export default defineConfig({
  // tsconfig paths와 같은 별칭
  // alias: { "@": "./src" },

  // 프로젝트에 필요한 Vite 플러그인
  // plugins: [],

  // JSX 런타임. Emotion을 쓰면 "@emotion/react"
  // jsxImportSource: "react",

  // 컴포넌트가 쓰는 전역 값 (webpack DefinePlugin과 같다)
  // define: { "process.env.API_BASE_URL": JSON.stringify("") },

  // 리뷰 화면과 컴포넌트가 같은 인스턴스를 써야 하는 패키지(Context를 쓰는 CSS-in-JS, 라우터, 서버 상태 라이브러리 등)
  // react, react-dom, msw는 항상 포함된다
  // sharedPackages: ["@tanstack/react-query", "react-router"],

  // Provider 묶음 컴포넌트 파일. ({ initialPath, address, children }) => ReactNode를 default export한다
  // wrapper: "./review/Wrapper.tsx",

  // 기존 MSW 핸들러 배열을 default나 handlers로 export하는 파일. 시나리오에 없는 요청에 쓴다
  // mockHandlers: "./src/mocks/handlers.ts",

  casesDir: "./review/cases",
  outDir: "./review/dist",
  repoUrl: "__REPO_URL__",
  baseBranch: "origin/main",
});
