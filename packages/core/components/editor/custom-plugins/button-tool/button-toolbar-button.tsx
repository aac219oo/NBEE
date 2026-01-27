"use client";

import { MousePointerClick } from "lucide-react";
import { KEYS } from "platejs";
import { useEditorRef } from "platejs/react";
import { ToolbarButton } from "@heiso/core/components/ui/toolbar";

export function ButtonToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>,
) {
  const editor = useEditorRef();

  const onInsert = () => {
    editor.tf.insertNodes(
      {
        type: editor.getType(KEYS.link),
        url: "#",
        asButton: true,
        variant: "default",
        size: "default",
        style: { display: "inline-block" },
        children: [{ text: "按鈕" }],
      },
      { select: true },
    );
    editor.tf.focus();
  };

  return (
    <ToolbarButton {...props} tooltip="Button" onClick={onInsert}>
      <MousePointerClick />
    </ToolbarButton>
  );
}
