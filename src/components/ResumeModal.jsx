export default function ResumeModal({ message, onResume, onDiscard }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">학습을 이어서 할까요?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 rounded-xl border border-slate-300 py-3 font-medium text-slate-600 active:bg-slate-50"
          >
            그만하기
          </button>
          <button
            onClick={onResume}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white active:bg-blue-700"
          >
            이어하기
          </button>
        </div>
      </div>
    </div>
  )
}
