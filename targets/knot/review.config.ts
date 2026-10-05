// Knot용 review-kit 설정 (plan.md 2.3, 11.2). 원본은 prplay targets/knot/, Knot에는 복사해서 쓴다 (11.4)
import { defineConfig } from "review-kit";

export default defineConfig({
  // tsconfig.json paths와 같은 목록
  alias: {
    "@": "./src",
    "@pages": "./src/pages",
    "@widgets": "./src/modules/widgets",
    "@features": "./src/modules/features",
    "@routes": "./src/shared/routes",
    "@api": "./src/shared/api",
    "@composites": "./src/shared/components/composites",
    "@primitives": "./src/shared/components/primitives",
    "@constants": "./src/shared/constants",
    "@provider": "./src/shared/provider",
    "@hooks": "./src/shared/hooks",
    "@utils": "./src/shared/utils",
    "@store": "./src/shared/store",
  },

  // babel preset-react importSource와 같다
  jsxImportSource: "@emotion/react",

  // wrapper(review/Wrapper.tsx)와 컴포넌트가 같은 인스턴스를 쓰도록 Knot node_modules에서 가져온다
  sharedPackages: ["@emotion/react", "@emotion/styled", "@tanstack/react-query", "react-router"],

  define: {
    "process.env.API_BASE_URL": JSON.stringify(""),
    "process.env.API_MOCKING": JSON.stringify("false"),
  },

  // webpack.config.js의 @svgr/webpack 옵션을 옮긴 것
  // vite-plugin-svgr는 JSX로 변환하므로 webpack 템플릿에서 타입 표기만 뺐다
  svgr: {
    include: "**/*.svg",
    svgrOptions: {
      exportType: "default",
      plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
      jsxRuntime: "automatic",
      dimensions: false,
      expandProps: "end",
      svgProps: {
        width: "{size}",
        height: "{size}",
        focusable: "false",
        "aria-hidden": "true",
      },
      svgoConfig: {
        plugins: [
          {
            name: "preset-default",
            params: { overrides: { removeViewBox: false, cleanupIds: false } },
          },
        ],
      },
      template: ({ componentName, jsx, exports }, { tpl }) => tpl`
const ${componentName} = ({ size = 24, ...props }) => (
  ${jsx}
);

${exports}
`,
    },
  },

  wrapper: "./review/Wrapper.tsx",
  // 시나리오에 없는 요청은 Knot의 기존 MSW 핸들러가 응답한다 (plan.md 6.1)
  mockHandlers: "./src/shared/api/mock/handlers/index.ts",
  casesDir: "./review/cases",
  outDir: "./review/dist",
  repoUrl: "https://github.com/woowacourse-teams/2026-Knot",
  baseBranch: "origin/develop",
});
