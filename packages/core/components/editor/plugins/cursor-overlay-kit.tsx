"use client";

import { CursorOverlayPlugin } from "@platejs/selection/react";

import { CursorOverlay } from "@heiso/core/components/ui/cursor-overlay";

export const CursorOverlayKit = [
  CursorOverlayPlugin.configure({
    render: {
      afterEditable: () => <CursorOverlay />,
    },
  }),
];
