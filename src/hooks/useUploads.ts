'use client'

import { t as translate } from '@/i18n'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isImage, rejectionReason, type UploadedAttachment } from '@/lib/attachments'

export interface PendingUpload {
  token: string
  name: string
  size: number
  image: boolean
  progress: number
  failed: boolean
}

export interface UploadsApi {
  pending: PendingUpload[]
  failed: { token: string; name: string; message: string }[]
  uploading: boolean
  start: (files: File[]) => void
  dismiss: (token: string) => void
}

export interface UploadsHandlers {
  onStart: (upload: PendingUpload) => void
  onDone: (token: string, file: UploadedAttachment) => void
  onFail: (token: string, message: string) => void
}

function send(
  file: File,
  onProgress: (fraction: number) => void,
): { promise: Promise<UploadedAttachment>; abort: () => void } {
  const request = new XMLHttpRequest()

  const promise = new Promise<UploadedAttachment>((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('_payload', JSON.stringify({ alt: file.name }))

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    })

    request.addEventListener('load', () => {
      let parsed: { doc?: UploadedAttachment; errors?: { message?: string }[] } | null = null
      try {
        parsed = JSON.parse(request.responseText)
      } catch {
        parsed = null
      }

      if (request.status >= 200 && request.status < 300 && parsed?.doc?.url) {
        resolve(parsed.doc)
        return
      }
      reject(new Error(parsed?.errors?.[0]?.message || translate("Upload failed ({0})", { 0: request.status })))
    })

    request.addEventListener('error', () => reject(new Error(translate("The connection dropped."))))
    request.addEventListener('abort', () => reject(new DOMException(translate("Aborted"), 'AbortError')))

    request.open('POST', '/api/attachments')
    request.send(form)
  })

  return { promise, abort: () => request.abort() }
}

export function useUploads(handlers: UploadsHandlers): UploadsApi {
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [failed, setFailed] = useState<{ token: string; name: string; message: string }[]>([])
  const counter = useRef(0)
  const live = useRef<Map<string, () => void>>(new Map())
  const latest = useRef(handlers)
  latest.current = handlers

  useEffect(
    () => () => {
      for (const abort of live.current.values()) abort()
      live.current.clear()
    },
    [],
  )

  const start = useCallback((files: File[]) => {
    for (const file of files) {
      counter.current += 1
      const token = `u${counter.current}-${Date.now().toString(36)}`
      const rejected = rejectionReason(file)

      if (rejected) {
        setFailed((prev) => [...prev, { token, name: file.name, message: rejected }])
        continue
      }

      const upload: PendingUpload = {
        token,
        name: file.name,
        size: file.size,
        image: isImage(file.type),
        progress: 0,
        failed: false,
      }

      setPending((prev) => [...prev, upload])
      latest.current.onStart(upload)

      const { promise, abort } = send(file, (fraction) => {
        setPending((prev) =>
          prev.map((item) => (item.token === token ? { ...item, progress: fraction } : item)),
        )
      })
      live.current.set(token, abort)

      void promise
        .then((saved) => {
          latest.current.onDone(token, saved)
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return
          latest.current.onFail(token, err.message)
          setFailed((prev) => [...prev, { token, name: file.name, message: err.message }])
        })
        .finally(() => {
          live.current.delete(token)
          setPending((prev) => prev.filter((item) => item.token !== token))
        })
    }
  }, [])

  const dismiss = useCallback((token: string) => {
    setFailed((prev) => prev.filter((item) => item.token !== token))
  }, [])

  return { pending, failed, uploading: pending.length > 0, start, dismiss }
}
