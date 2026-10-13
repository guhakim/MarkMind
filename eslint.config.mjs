import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // 의도적으로 버리는 변수는 _ 접두사로 표시한다 (예: const { id: _id, ...data } = bookmark)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // eslint-plugin-react-hooks v7의 React Compiler 세대 규칙 — eslint-config-next가 error로 올려 둔다.
      // 남아 있는 위반은 SSR에서 안전하게 쓰는 표준 패턴(마운트 후 localStorage 읽기, matchMedia 구독)과
      // 손대지 않은 shadcn/ui 보일러플레이트다. 제대로 고치려면 useSyncExternalStore로 바꿔야 하므로
      // 지금은 error가 아닌 warn으로 두고 남겨 둔다 — 끄지는 않는다.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]

export default config
