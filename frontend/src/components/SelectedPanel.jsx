import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useSelection } from '../context/SelectionContext'
import { WorksheetModal } from './WorksheetModal'

function SelectedItem({ question, index, onRemove }) {
  return (
    <Draggable draggableId={String(question.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-start gap-2 p-2.5 rounded-lg border bg-white text-sm transition-shadow
            ${snapshot.isDragging ? 'shadow-lg border-blue-300' : 'border-slate-200 shadow-sm'}`}
        >
          {/* Drag handle */}
          <span
            {...provided.dragHandleProps}
            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing mt-0.5 shrink-0 select-none"
            title="드래그하여 순서 변경"
          >
            ⣿
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 mr-1">Q{question.question_no}</span>
            <span className="text-slate-700 line-clamp-2 whitespace-pre-wrap leading-snug">
              {question.content}
            </span>
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(question.id)}
            className="text-slate-300 hover:text-red-400 shrink-0 text-base leading-none mt-0.5"
            title="제거"
          >
            ✕
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700">
          선택된 문제{' '}
          <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {selected.length}
          </span>
        </h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {selected.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
            <span className="text-3xl">📋</span>
            <p>좌측 문제 카드를 클릭하여</p>
            <p>문제를 추가하세요</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="selected-questions">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col gap-2"
                >
                  {selected.map((q, index) => (
                    <SelectedItem
                      key={q.id}
                      question={q}
                      index={index}
                      onRemove={remove}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t border-slate-200 flex gap-2">
        <button
          onClick={clear}
          disabled={selected.length === 0}
          className="flex-1 text-sm py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          초기화
        </button>
        <button
          onClick={() => setShowModal(true)}
          disabled={selected.length === 0}
          className="flex-[2] text-sm py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          → 문제지 만들기
        </button>
      </div>

      {showModal && (
        <WorksheetModal selected={selected} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
