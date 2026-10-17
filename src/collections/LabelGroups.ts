import { t as translate } from '@/i18n'
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { collectionAccess } from '@/lib/access'
import { slugifyKey } from '@/lib/workflow'

export const LabelGroups: CollectionConfig = {
  slug: 'label-groups',
  labels: { singular: translate("Label group"), plural: translate("Label groups") },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'key', 'order'],
    description: translate("Optional clusters that labels can belong to, such as Area or Kind"),
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
        if (!key) return data

        const clash = await req.payload.find({
          collection: 'label-groups',
          depth: 0,
          limit: 1,
          where: {
            and: [
              { key: { equals: key } },
              ...(operation === 'update' && originalDoc?.id
                ? [{ id: { not_equals: originalDoc.id } }]
                : []),
            ],
          },
        })

        if (clash.docs.length > 0) {
          throw new APIError(
            translate("A label group with the key \"{0}\" already exists.", { 0: key }),
            400,
            undefined,
            true,
          )
        }

        return data
      },
    ],
    afterDelete: [
      async ({ req, id }) => {
        await req.payload.update({
          req,
          collection: 'labels',
          where: { group: { equals: id } },
          data: { group: null },
          depth: 0,
          overrideAccess: true,
        })
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
        description: translate("The heading this group gets in the label picker"),
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
      name: 'order',
      label: translate("Order"),
      type: 'number',
      required: true,
      defaultValue: 1000,
      admin: {
        description: translate("Position in the picker, ascending. Gaps are intentional."),
      },
    },
    {
      name: 'description',
      label: translate("Description"),
      type: 'text',
      admin: {
        description: translate("Optional hint shown beside the group heading"),
      },
    },
  ],
  timestamps: true,
}
