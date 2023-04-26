import { createEffect, createSignal, onMount } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";

import { javascript } from "@codemirror/lang-javascript";
import { EditorView, basicSetup } from "codemirror";
import { Compartment, EditorState, Text } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";

import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";

const tabSize = new Compartment();
const lineSeparator = new Compartment();

export const CodeMirror = (
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    code: string[];
    setCode?: (code: string) => void;
    error?: string;
    reverseIcon?: boolean;
    containerClass?: string;
  }
) => {
  let editorRef: HTMLDivElement;
  let editorState: EditorState;
  let editorView: EditorView;

  const [width, setWidth] = createSignal(0);

  onMount(() => {
    editorState = EditorState.create({
      extensions: [
        basicSetup,
        // tabSize.of(EditorState.tabSize.of(8)),
        keymap.of(defaultKeymap),
        keymap.of([indentWithTab]),

        javascript(),
      ],
      doc: Text.of(props.code),
    });
    // EditorState.lineSeparator = lineSeparator;

    editorView = new EditorView({
      state: editorState,
      parent: editorRef,
    });

    editorView.contentDOM.addEventListener("onchange", () => {
      console.log("inptiu");
      console.log(
        "editorView.contentDOM.innerText",
        editorView.contentDOM.innerText
      );
      // actions.setCoding(true)
    });
    editorView.contentDOM.addEventListener("blur", () => {
      // actions.setCoding(false)

      // str = "whatever your string is";
      let reg = /\n\n\n/;
      // str.replace(reg, "\n\n");

      // console.log("blur", editorView.contentDOM.innerText.replace(reg, "\n"));
      console.log(editorView.state.doc.toJSON());
      props.setCode?.(editorView.state.doc.toJSON());
    });

    resizeObserver.observe(editorRef);
    setWidth(editorRef.offsetWidth);
  });

  createEffect(() => {
    console.log("props.code", props.code);
    // editorView.state.doc
    // editorView.state.doc.
    // editorView.contentDOM.innerText = props.code.join("\n") ?? "hallo";
  });

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setWidth(entry.contentRect.width);
    }
  });

  return (
    <div class={`overflow-auto h-full ${props.containerClass}`}>
      <div
        onmousedown={(e) => e.stopPropagation()}
        class={`flex-1 overflow-auto cursor-text ${props.class}`}
        ref={editorRef!}
      />
    </div>
  );
};
