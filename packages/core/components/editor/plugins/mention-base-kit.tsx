import { BaseMentionPlugin } from "@platejs/mention";

import { MentionElementStatic } from "@heiso/core/components/ui/mention-node-static";

export const BaseMentionKit = [
  BaseMentionPlugin.withComponent(MentionElementStatic),
];
