import { SelectionProvider } from './context/SelectionContext'
import { LeftPanel } from './components/LeftPanel'
import { SelectedPanel } from './components/SelectedPanel'

export default function App() {
  return (
    <SelectionProvider>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f0f2f5' }}>
        {/* Header */}
        <header className="shrink-0 h-16 bg-white flex items-center px-8 gap-4 shadow-sm" style={{ borderBottom: '1px solid #e8ecf0' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-base select-none"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              Q
            </div>
            <div>
              <div className="font-bold text-gray-800 text-base leading-tight">QuizCraft</div>
              <div className="text-xs text-gray-400 leading-tight">문제지 자동 생성</div>
            </div>
          </div>
        </header>

        {/* Main */}
        <div className="flex flex-1 overflow-hidden gap-5 p-5">
          <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm flex-[58]" style={{ border: '1px solid #e8ecf0' }}>
            <LeftPanel />
          </div>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm flex-[42]" style={{ border: '1px solid #e8ecf0' }}>
            <SelectedPanel />
          </div>
        </div>
      </div>
    </SelectionProvider>
  )
}
