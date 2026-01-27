"use client";

import { BlockMenuPlugin } from "@platejs/selection/react";

import { BlockContextMenu } from "@heiso/core/components/ui/block-context-menu";

import { BlockSelectionKit } from "./block-selection-kit";

export const BlockMenuKit = [
  ...BlockSelectionKit,
  BlockMenuPlugin.configure({
    render: { aboveEditable: BlockContextMenu },
  }),
];
