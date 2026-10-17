import { t as translate } from '@/i18n'
import path from 'path'
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { collectionAccess } from '@/lib/access'
import { MAX_ATTACHMENT_BYTES, ATTACHMENT_MIME_TYPES, formatBytes } from '@/lib/attachments'

const staticDir = process.env.LOCAL_PM_UPLOADS_DIR || path.resolve(process.cwd(), 'uploads')

export const Attachments: CollectionConfig = {
  slug: 'attachments',
  labels: { singular: translate("Attachment"), plural: translate("Attachments") },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'mimeType', 'filesize', 'createdAt'],
    description: translate("Files dropped, pasted, or picked inside a comment or a description."),
  },
  access: collectionAccess,
  upload: {
    staticDir,
    mimeTypes: ATTACHMENT_MIME_TYPES,
    displayPreview: true,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const size = typeof data?.filesize === 'number' ? data.filesize : 0
        if (size > MAX_ATTACHMENT_BYTES) {
          throw new APIError(
            translate("That file is {0}. The limit is {1}.", { 0: formatBytes(size), 1: formatBytes(MAX_ATTACHMENT_BYTES) }),
            400,
            null,
            true,
          )
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: translate("Alternative text"),
      type: 'text',
      admin: {
        description: translate("What the image shows, for anyone who cannot see it."),
      },
    },
  ],
  timestamps: true,
}
