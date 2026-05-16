import { SelectionProvider } from './context/SelectionContext'
import { LeftPanel } from './components/LeftPanel'
import { SelectedPanel } from './components/SelectedPanel'

export default function App() {
  return (
    <SelectionProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100">
        <header className="fixed top-0 left-0 right-0 z-10 h-10 bg-slate-800 text-white flex items-center px-4 shadow-md">
          <span className="text-sm font-semibold tracking-wide">✏️ QuizCraft — 문제지 자동 생성</span>
        </header>

        <div className="flex w-full mt-10 overflow-hidden">
          <div className="w-[58%] flex flex-col overflow-hidden border-r border-slate-300 shadow-sm">
            <LeftPanel />
          </div>
          <div className="w-[42%] flex flex-col overflow-hidden">
            <SelectedPanel />
          </div>
        </div>
      </div>
    </SelectionProvider>
  )
}
