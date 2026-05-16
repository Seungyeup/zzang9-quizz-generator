import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useSelection } from '../context/SelectionContext'
import { WorksheetModal } from './WorksheetModal'

function DragHandle(props) {
  return (
    <div {...props} className="shrink-0 cursor-grab active:cursor-grabbing mt-0.5" style={{ color: '#d1d5db' }}>
      <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
        <circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/>
        <circle cx="5" cy="9" r="1.5"/><circle cx="11" cy="9" r="1.5"/>
        <circle cx="5" cy="15" r="1.5"/><circle cx="11" cy="15" r="1.5"/>
      </svg>
    </div>
  )
}

function SelectedItem({ question, index, onRemove }) {
  return (
    <Draggable draggableId={String(question.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex items-start gap-4 px-5 py-5 rounded-2xl bg-white transition-all"
          style={{
            border: snapshot.isDragging ? '1.5px solid #818cf8' : '1.5px solid #edf0f7',
            boxShadow: snapshot.isDragging
              ? '0 12px 32px rgba(0,0,0,0.15)'
              : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <DragHandle {...provided.dragHandleProps} />

          <div className="flex-1 min-w-0">
            <span
              className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg mb-2.5"
              style={{ background: '#f1f5f9', color: '#64748b' }}
            >
              {question.question_no}번
            </span>
            <p className="text-sm text-gray-700 line-clamp-2 leading-6 whitespace-pre-wrap">
              {question.content}
            </p>
          </div>

          <button
            onClick={() => onRemove(question.id)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all mt-0.5"
            style={{ color: '#d1d5db' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = '#fff1f2' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent' }}
            title="제거"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>
      )}
    </Draggable>
  )
}

export function SelectedPanel() {
  const { selected, remove, reorder, clear } = useSelection()
  const [showModal, setShowModal] = useState(false)

  function onDragEnd(result) {
    if (!result.destination) return
    reorder(result.source.index, result.destination.index)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-10 py-8" style={{ borderBottom: '1px solid #edf0f7' }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 leading-tight">선택된 문제</h2>
            <p className="text-sm text-gray-400 mt-1">
              {selected.length > 0
                ? `${selected.length}개 문제 선택됨 · 드래그로 순서 변경`
                : '좌측에서 문제를 선택하세요'}
            </p>
          </div>
          {selected.length > 0 && (
            <button
              onClick={clear}
              className="text-sm text-gray-400 hover:text-red-400 transition-colors font-medium mt-0.5"
            >
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {selected.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-20">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)', border: '1.5px solid #e8ecf7' }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.4" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M8 10h8M8 14h5"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-500 mb-1.5">선택된 문제가 없습니다</p>
              <p className="text-xs text-gray-400 leading-5">좌측 문제 카드를 클릭하면<br />이곳에 추가됩니다</p>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="selected-questions">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-3">
                  {selected.map((q, index) => (
                    <SelectedItem key={q.id} question={q} index={index} onRemove={remove} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-8 py-6" style={{ borderTop: '1px solid #edf0f7' }}>
        <button
          onClick={() => setShowModal(true)}
          disabled={selected.length === 0}
          className="w-full flex items-center justify-center gap-3 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed"
          style={{
            fontSize: '15px',
            padding: '16px 24px',
            background: selected.length > 0
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#c7d0e8',
            boxShadow: selected.length > 0 ? '0 6px 24px rgba(102,126,234,0.5)' : 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <rect x="1.5" y="1.5" width="14" height="14" rx="2"/>
            <path d="M4.5 7h8M4.5 10h5"/>
          </svg>
          문제지 만들기
        </button>
      </div>

      {showModal && (
        <WorksheetModal selected={selected} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
