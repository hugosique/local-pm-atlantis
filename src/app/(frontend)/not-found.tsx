'use client'

import { t as translate } from '@/i18n'
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <FileQuestion className="size-6 text-text-muted" aria-hidden />
      <h1 className="text-md font-semibold text-text">{translate("We couldn’t find that")}</h1>
      <p className="max-w-[46ch] text-base text-text-muted">
        {translate("The record may have been deleted, or the link may be wrong.")} </p>
      <Link
        href="/board"
        className="mt-1 inline-flex h-10 items-center rounded-md bg-accent px-4 text-base font-medium text-accent-fg hover:bg-accent-hover"
      >
        {translate("Back to the board")} </Link>
    </div>
  )
}
