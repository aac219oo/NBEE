"use client";

import { LinkPlugin } from "@platejs/link/react";

import { LinkElement } from "@heiso/core/components/ui/link-node";
import { LinkFloatingToolbar } from "@heiso/core/components/ui/link-toolbar";

export const LinkKit = [
  LinkPlugin.configure({
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];
