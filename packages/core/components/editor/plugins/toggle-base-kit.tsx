import { BaseTogglePlugin } from "@platejs/toggle";

import { ToggleElementStatic } from "@heiso/core/components/ui/toggle-node-static";

export const BaseToggleKit = [
  BaseTogglePlugin.withComponent(ToggleElementStatic),
];
