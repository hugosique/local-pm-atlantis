import { t as translate } from '@/i18n'
import type { CollectionConfig } from 'payload'
import { collectionAccess } from '@/lib/access'

export const Teams: CollectionConfig = {
  slug: 'teams',
  labels: { singular: translate("Team"), plural: translate("Teams") },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'createdAt'],
    description: translate("Teams group related work within a project"),
  },
  access: collectionAccess,
  fields: [
    {
      name: 'name',
      label: translate("Name"),
      type: 'text',
      required: true,
      admin: {
        description: translate("The name of the team"),
      },
    },
    {
      name: 'description',
      label: translate("Description"),
      type: 'richText',
      admin: {
        description: translate("Brief description of the team"),
      },
    },
    {
      name: 'color',
      label: translate("Colour"),
      type: 'text',
      defaultValue: '#6366f1',
      admin: {
        description: translate("Color for team identification"),
      },
    },
  ],
  timestamps: true,
}
