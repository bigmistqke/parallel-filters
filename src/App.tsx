import createLocalStore from "@solid-primitives/local-store";
import * as ComLink from "comlink";
import {
  Component,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import { CodeMirror } from "./CodeMirror";
import convolution from "./examples/convolution.json";

import "./index.css";
import { type Api } from "./worker";

const buffer = new SharedArrayBuffer(1024);

const getImageDataFromFile = (file: File) =>
  new Promise<ImageData>((resolve) => {
    const img = new Image();
    img.onload = function (e) {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.src = URL.createObjectURL(file);
  });

const createWorker = () =>
  ComLink.wrap<typeof Api>(
    new Worker(new URL("./worker", import.meta.url), {
      type: "module",
    })
  );

const App: Component = () => {
  let canvas: HTMLCanvasElement;

  const [localStore, setLocalStore] = createLocalStore<{
    code: string;
    image: string;
  }>("app");

  const [workerAmount, setWorkerAmount] = createSignal(4);
  const [targetBuffer, setTargetBuffer] = createSignal<SharedArrayBuffer>();

  const [srcImageData, setSrcImageData] = createSignal<ImageData>();
  const [targetImageData, setTargetImageData] = createSignal<ImageData>();

  const [stats, setStats] = createSignal<number>();

  const [canvasMode, setCanvasMode] = createSignal<"source" | "target">(
    "source"
  );

  const [processState, setProcessState] = createSignal<
    "process" | "processing..." | "processed!"
  >("process");

  const [width, setWidth] = createSignal(0);

  const workers = createMemo<ComLink.Remote<typeof Api>[]>(
    (v) => {
      const delta = workerAmount() - v.length;
      if (delta > 0) {
        const extraWorkers = new Array(delta).fill(0).map(createWorker);
        return [...v, ...extraWorkers];
      }
      return v;
    },
    [createWorker()]
  );

  const process = async () => {
    setProcessState("processing...");
    const sharedArrayBuffer = new SharedArrayBuffer(
      srcImageData()!.data.byteLength
    );
    const sharedView = new Uint8ClampedArray(sharedArrayBuffer);
    sharedView.set(srcImageData()!.data, 0);
    setTargetBuffer(sharedArrayBuffer);

    const b = targetBuffer();
    const width = srcImageData()?.width;

    if (!b || !width) return;

    let start = performance.now();

    await Promise.all(
      new Array(workerAmount())
        .fill(0)
        .map((_, i) =>
          workers()[i].process(
            b,
            width,
            JSON.parse(localStore.code).join("\n") || "",
            Math.floor((i * b.byteLength) / workerAmount()),
            Math.floor(((i + 1) * b.byteLength) / workerAmount())
          )
        )
    );
    const view = new Uint8ClampedArray(b);
    setTargetImageData(new ImageData(view.slice(), width));
    setCanvasMode("target");
    setProcessState("processed!");
    setTimeout(() => {
      setProcessState("process");
    }, 1000);
    setStats(Math.round(performance.now() - start));
  };

  createEffect(() => {
    const imageData =
      canvasMode() === "target" ? targetImageData() : srcImageData();
    if (!imageData) return;
    putImageData(imageData);
  });

  const putImageData = (imageData: ImageData) => {
    const ctx = canvas.getContext("2d")!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
  };

  const imageDataToDataUrl = (imageData: ImageData) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx?.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  };

  const dataUrlToImageData = (dataUrl: string) =>
    new Promise<ImageData>((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      var img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0); // Or at whatever offset you like
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
      };
      img.src = dataUrl;
    });

  const onInputHandler = async (e: InputEvent) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setSrcImageData(await getImageDataFromFile(file));
    // putImageData(imageData()!, targetRef);
    // putImageData(imageData()!, srcRef);

    const sharedArrayBuffer = new SharedArrayBuffer(
      srcImageData()!.data.byteLength
    );
    const sharedView = new Uint8ClampedArray(sharedArrayBuffer);
    sharedView.set(srcImageData()!.data, 0);

    setTargetBuffer(sharedArrayBuffer);
    setCanvasMode("source");
    setLocalStore("image", imageDataToDataUrl(srcImageData()!));
  };

  onMount(async () => {
    if (localStore.image) {
      const data = await dataUrlToImageData(localStore.image);
      setSrcImageData(data);
    }
  });

  var download = function () {
    var link = document.createElement("a");
    link.download = "filename.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div class="flex flex h-full font-mono text-sm">
      <CodeMirror
        class="resize-x border-r-1 overflow-auto h-full outline-none border-black whitespace-nowrap"
        code={localStore.code ? JSON.parse(localStore.code) : convolution}
        setCode={(code) => setLocalStore("code", JSON.stringify(code))}
      />

      <div class="relative flex flex-col flex-1">
        <div class="relative flex-1 flex-col flex items-center justify-center content-center gap-2 overflow-auto">
          <div class="absolute left-0 top-0 z-1 w-full flex gap-2 p-2">
            <div class="p-1 text- border-black border-1 ">
              <label>workers</label>
              <input
                type="number"
                value={workerAmount()}
                class="bg-transparent ml-2 w-8 outline-none"
                onInput={(e) => setWorkerAmount(+e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-1 gap-2 justify-end">
              <button
                class="p-1 text- border-black border-1 hover:bg-neutral-200"
                onClick={process}
              >
                {processState()}
              </button>
              <button
                class="p-1 text- border-black border-1 hover:bg-neutral-200"
                onClick={download}
              >
                download
              </button>
              <label
                for="file-input"
                class="p-1 text- border-black border-1 cursor-pointer hover:bg-neutral-200"
                // onclick={(e) => e.currentTarget.children[0].click()}
              >
                <input
                  id="file-input"
                  hidden
                  type="file"
                  value={1}
                  class="bg-transparent ml-2 w-64"
                  onInput={onInputHandler}
                />
                upload
              </label>
            </div>
          </div>
          <canvas ref={canvas!} />

          <Show when={stats()}>
            <div class="absolute p-1 text- border-black border-1 bg-white left-2 bottom-2">
              {stats()!}ms
            </div>
          </Show>
          <button
            class="absolute p-1 text- border-black border-1 bg-white right-2 bottom-2 hover:bg-neutral-200"
            onClick={() =>
              setCanvasMode((v) => (v === "source" ? "target" : "source"))
            }
          >
            {canvasMode()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
