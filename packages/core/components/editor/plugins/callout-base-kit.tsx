import { BaseCalloutPlugin } from "@platejs/callout";

import { CalloutElementStatic } from "@heiso/core/components/ui/callout-node-static";

export const BaseCalloutKit = [
  BaseCalloutPlugin.withComponent(CalloutElementStatic),
];
