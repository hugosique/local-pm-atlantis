import { t as translate } from '@/i18n'
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { StatusType, STATUS_TYPE_OPTIONS } from '@/types/enums'
import { collectionAccess } from '@/lib/access'
import { slugifyKey } from '@/lib/workflow'

export const Statuses: CollectionConfig = {
  slug: 'statuses',
  labels: { singular: translate("Status"), plural: translate("Statuses") },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'type', 'project', 'order'],
    description: translate("Workflow states a ticket can occupy, globally or per project"),
  },
  access: collectionAccess,
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.key) data.key = slugifyKey(String(data.key))
        else if (data?.name) data.key = slugifyKey(String(data.name))
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation, originalDoc }) => {
        const key = data?.key ?? originalDoc?.key
        const project = data?.project !== undefined ? data.project : originalDoc?.project
        if (!key) return data

        const clash = await req.payload.find({
          collection: 'statuses',
          depth: 0,
          limit: 1,
          where: {
            and: [
              { key: { equals: key } },
              project
                ? { project: { equals: typeof project === 'object' ? project.id : project } }
                : { project: { exists: false } },
              ...(operation === 'update' && originalDoc?.id
                ? [{ id: { not_equals: originalDoc.id } }]
                : []),
            ],
          },
        })

        if (clash.docs.length > 0) {
          throw new APIError(
            translate("A status with the key \"{0}\" already exists in this workflow.", { 0: key }),
            400,
            undefined,
            true,
          )
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      label: translate("Name"),
      type: 'text',
      required: true,
      admin: {
        description: translate("The label shown on the board column and on tickets"),
      },
    },
    {
      name: 'key',
      label: translate("Key"),
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: translate("Stable identifier used by the API and the MCP server. Derived from the name."),
      },
    },
    {
      name: 'type',
      label: translate("Type"),
      type: 'select',
      options: STATUS_TYPE_OPTIONS,
      defaultValue: StatusType.UNSTARTED,
      required: true,
      index: true,
      admin: {
        description:
          translate("The semantic category. Drives the icon, the tone, and whether a ticket counts as open or closed."),
      },
    },
    {
      name: 'order',
      label: translate("Order"),
      type: 'number',
      required: true,
      defaultValue: 1000,
      admin: {
        description: translate("Column position, ascending. Gaps are intentional so a status can be inserted."),
      },
    },
    {
      name: 'project',
      label: translate("Project"),
      type: 'relationship',
      relationTo: 'projects',
      index: true,
      admin: {
        description: translate("Leave empty for a workspace-wide status. Set it to scope the status to one project."),
      },
    },
    {
      name: 'description',
      label: translate("Description"),
      type: 'text',
      admin: {
        description: translate("Optional hint shown when picking this status"),
      },
    },
  ],
  timestamps: true,
}
