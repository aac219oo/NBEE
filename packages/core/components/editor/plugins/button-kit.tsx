"use client";

import { createPlatePlugin } from "platejs/react";
import { ButtonElement } from "@heiso/core/components/ui/button-node";

export const ButtonKit = [
  createPlatePlugin({ key: "button" }).configure({
    render: { node: ButtonElement },
  }),
];
