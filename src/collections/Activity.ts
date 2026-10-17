import { t as translate } from '@/i18n'
import type { CollectionConfig } from 'payload'
import { readAccess } from '@/lib/access'

export const Activity: CollectionConfig = {
  slug: 'activity',
  labels: { singular: translate("Activity"), plural: translate("Activity") },
  admin: {
    useAsTitle: 'field',
    defaultColumns: ['ticket', 'action', 'field', 'actor', 'createdAt'],
    description: translate("Append-only record of what changed on a ticket, and who changed it."),
  },
  access: {
    read: readAccess,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'ticket',
      label: translate("Ticket"),
      type: 'relationship',
      relationTo: 'tickets',
      required: true,
      index: true,
      admin: { description: translate("The ticket this entry belongs to") },
    },
    {
      name: 'action',
      label: translate("Action"),
      type: 'select',
      required: true,
      defaultValue: 'changed',
      options: [
        { label: translate("Created"), value: 'created' },
        { label: translate("Changed"), value: 'changed' },
        { label: translate("Commented"), value: 'commented' },
        { label: translate("Replied"), value: 'replied' },
        { label: translate("Edited a comment"), value: 'edited' },
        { label: translate("Resolved a thread"), value: 'resolved' },
        { label: translate("Reopened a thread"), value: 'reopened' },
        { label: translate("Deleted a comment"), value: 'deleted' },
      ],
    },
    {
      name: 'comment',
      label: translate("Comment"),
      type: 'relationship',
      relationTo: 'comments',
      admin: {
        description: translate("The comment this entry is about. Empty once that comment is deleted."),
      },
    },
    {
      name: 'field',
      label: translate("Field"),
      type: 'text',
      admin: { description: translate("Which field changed. Empty when the ticket was created.") },
    },
    {
      name: 'from',
      label: translate("Previous value"),
      type: 'text',
      admin: {
        description: translate("The value, or comment text, as it read before the change"),
      },
    },
    {
      name: 'to',
      label: translate("New value"),
      type: 'text',
      admin: {
        description: translate("The value, or comment text, as it read after the change"),
      },
    },
    {
      name: 'fromId',
      label: translate("Previous record ID"),
      type: 'text',
      admin: {
        description:
          translate("The id behind `from`, when the value was a record. Lets reports replay history exactly instead of matching on a name that may since have changed."),
      },
    },
    {
      name: 'toId',
      label: translate("New record ID"),
      type: 'text',
      admin: {
        description: translate("The id behind `to`, when the value was a record"),
      },
    },
    {
      name: 'actor',
      label: translate("Actor"),
      type: 'relationship',
      relationTo: 'members',
      admin: { description: translate("Who made the change. Empty when nobody was signed in.") },
    },
  ],
  timestamps: true,
}
