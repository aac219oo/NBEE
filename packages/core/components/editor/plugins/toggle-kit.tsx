"use client";

import { TogglePlugin } from "@platejs/toggle/react";

import { IndentKit } from "@heiso/core/components/editor/plugins/indent-kit";
import { ToggleElement } from "@heiso/core/components/ui/toggle-node";

export const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
];
