'use client'

import { t as translate } from '@/i18n'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/cn'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-[150px] w-full animate-pulse-soft rounded-sm bg-surface-hover" aria-hidden />
  ),
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
}

const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'indent',
  'link',
]

export function RichTextEditor({
  value,
  onChange,
  placeholder = translate("Write something..."),
  readOnly = false,
}: RichTextEditorProps) {
  const editorModules = useMemo(() => (readOnly ? { toolbar: false } : modules), [readOnly])

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={(next, _delta, source) => {
          if (source === 'user') onChange(next)
        }}
        modules={editorModules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  )
}

export function RichTextDisplay({
  content,
  wide = false,
}: {
  content: string
  wide?: boolean
}) {
  const sanitized = useMemo(
    () => sanitizeHtml(content),
    [content],
  )

  if (!content || content === '<p><br></p>' || !sanitized.trim()) {
    return <p className="text-base text-text-muted">{translate("No description yet.")}</p>
  }

  return (
    <div
      className={cn('rich-text-content', wide && 'max-w-none')}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
