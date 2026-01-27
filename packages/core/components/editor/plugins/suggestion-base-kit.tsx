import { BaseSuggestionPlugin } from "@platejs/suggestion";

import { SuggestionLeafStatic } from "@heiso/core/components/ui/suggestion-node-static";

export const BaseSuggestionKit = [
  BaseSuggestionPlugin.withComponent(SuggestionLeafStatic),
];
