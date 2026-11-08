import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import MaterialCard from '../components/MaterialCard'
import Screen from '../layouts/Screen'
import ScreenTitle from '../layouts/ScreenTitle'
import { MATERIAL_STATUS as M, ROUTES, UPLOAD } from '../lib/constants'
import { pickFiles } from '../lib/pickFiles'
import { getRecentMaterials, useMaterialStore } from '../store/useMaterialStore'

export default function S10Waiting() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fileRef = useRef(null)

  const subjects = useMaterialStore((s) => s.subjects)
  const allMaterials = useMaterialStore((s) => s.materials)
  const uploadMaterial = useMaterialStore((s) => s.uploadMaterial)
  const retryMaterial = useMaterialStore((s) => s.retryMaterial)
  const resumePending = useMaterialStore((s) => s.resumePending)

  const [errors, setErrors] = useState([])
  const [uploadedIds, setUploadedIds] = useState([])

  const subject = subjects.find((s) => s.id === params.get('subjectId')) ?? subjects.at(-1)
  const materials = allMaterials.filter((m) => uploadedIds.includes(m.id))
  const room = UPLOAD.MAX_PER_UPLOAD - materials.length
  const hasReady = materials.some((m) => m.status === M.READY)

  const recent = getRecentMaterials(allMaterials)
  let oldestVisible = null
  if (allMaterials.length >= UPLOAD.MAX_VISIBLE) {
    oldestVisible = recent[recent.length - 1]
  }

  useEffect(() => {
    resumePending()
  }, [resumePending])

  if (!subject) {
    return <Navigate to={ROUTES.SUBJECT_NEW} replace />
  }

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''

    const { groups, errors: nextErrors } = pickFiles(picked, room)

    const newIds = []
    for (const group of groups) {
      newIds.push(uploadMaterial(subject.id, group))
    }

    setUploadedIds([...uploadedIds, ...newIds])
    setErrors(nextErrors)
  }

  const bottomCta = (
    <>
      {materials.length > 0 && !hasReady && (
        <p className="mb-2 text-center text-caption text-muted">
          분석이 끝나면 단원 목록을 볼 수 있어요. 몇 분 걸릴 수 있어요.
        </p>
      )}
      <Button
        onClick={() =>
          navigate(`${ROUTES.UNIT_PREVIEW}?subjectId=${subject.id}`, {
            state: { newMaterialIds: uploadedIds },
          })
        }
        disabled={!hasReady}
      >
        단원 목록 보러 가기
      </Button>
      {materials.length > 0 && !hasReady && (
        <Button
          variant="secondary"
          onClick={() => navigate(ROUTES.HOME)}
          className="mt-3 text-caption"
        >
          홈에서 기다릴게요
        </Button>
      )}
    </>
  )

  return (
    <Screen back bottomCta={bottomCta}>
      <ScreenTitle
        title="학습 자료를 올려 주세요"
        description={`${subject.name} · 이번 업로드 ${materials.length}/${UPLOAD.MAX_PER_UPLOAD}`}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={room <= 0}
        className="mt-6 flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-surface px-4 py-8 text-center active:bg-background disabled:opacity-40"
      >
        <span className="text-body font-bold text-primary">파일 선택</span>
        <span className="text-caption text-muted">
          PDF · PPTX · PNG · 파일당 최대 {UPLOAD.MAX_MB}MB
        </span>
        <span className="text-caption text-muted">
          PDF·PPT {UPLOAD.MAX_DOC_PAGES}쪽, PNG {UPLOAD.MAX_PNG_PAGES}장까지
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={UPLOAD.EXTENSIONS.map((ext) => `.${ext}`).join(',')}
        onChange={handleFiles}
        className="hidden"
      />

      {oldestVisible && (
        <p className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-caption text-warning">
          자료는 최근 {UPLOAD.MAX_VISIBLE}개까지 보여요. 새로 올리면 '{oldestVisible.fileName}'부터
          목록에서 정리돼요. 틀린 문제는 오답노트에 그대로 남아요.
        </p>
      )}

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-danger-soft px-4 py-3 text-caption text-danger">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {materials.length > 0 && (
        <ul className="mt-4 space-y-3">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onRetry={retryMaterial} />
          ))}
        </ul>
      )}
    </Screen>
  )
}
