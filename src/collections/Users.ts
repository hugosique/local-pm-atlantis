import { t as translate } from '@/i18n'
import type { CollectionConfig } from 'payload'
import { requireAuthEnabled } from '@/lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: translate("User"), plural: translate("Users") },
  auth: {
    useAPIKey: true,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
    description:
      translate("Login accounts and API keys. These are credentials, not assignable people — tickets are assigned to a team."),
  },
  access: {
    read: ({ req }) => (requireAuthEnabled() ? Boolean(req.user) : true),
    create: ({ req }) => {
      if (!requireAuthEnabled()) return true
      return (req.user as { role?: string } | undefined)?.role === 'admin'
    },
    update: ({ req }) => {
      if (!requireAuthEnabled()) return true
      const user = req.user as { id?: string; role?: string } | undefined
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    delete: ({ req }) => {
      if (!requireAuthEnabled()) return true
      return (req.user as { role?: string } | undefined)?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'name',
      label: translate("Name"),
      type: 'text',
      admin: { description: translate("Display name for this account") },
    },
    {
      name: 'role',
      label: translate("Role"),
      type: 'select',
      required: true,
      defaultValue: 'admin',
      options: [
        { label: translate("Admin"), value: 'admin' },
        { label: translate("Member"), value: 'member' },
        { label: translate("Agent"), value: 'agent' },
      ],
      admin: {
        description:
          translate("admin may delete records and manage accounts; member may read and write; agent is an automated caller and should hold an API key rather than a password. Defaults to admin so the first account created can administer the install."),
      },
    },
  ],
  timestamps: true,
}
