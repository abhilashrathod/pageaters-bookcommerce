import type { GlobalConfig, TextFieldSingleValidation } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { linkFields } from '../fields/link.ts';

// The thin bar above the header (offers, notices). Hidden unless enabled; an enabled bar needs its message.
const messageWhenEnabled: TextFieldSingleValidation = (value, { siblingData }) =>
  Boolean(value) || !(siblingData as { enabled?: boolean }).enabled || 'An enabled bar needs a message';
export const AnnouncementBar: GlobalConfig = {
  slug: 'announcement-bar',
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'message', type: 'text', maxLength: 140, validate: messageWhenEnabled },
    {
      name: 'link',
      type: 'group',
      admin: { description: 'Optional: leave it empty for no link.' },
      fields: linkFields({ required: false }),
    },
  ],
};
