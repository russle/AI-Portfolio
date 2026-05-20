import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-400">
          綠角資產配置戰略總覽
        </h1>
        <p className="text-slate-400">
          React + TypeScript + Tailwind CSS v4 專案已成功初始化！
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-slate-950 font-semibold rounded-lg shadow-md cursor-pointer"
            onClick={() => setCount((count) => count + 1)}
          >
            點擊次數: {count}
          </button>
        </div>
        <div className="text-xs text-slate-500">
          Cloudflare Pages 部署準備就緒
        </div>
      </div>
    </div>
  )
}

export default App
