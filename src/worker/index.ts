import * as ComLink from "comlink";

const Api = {
  process: (
    buffer: SharedArrayBuffer,
    width: number,
    callback: string,
    from?: number,
    to?: number
  ) => {
    const cb = eval(callback);
    const target = new Uint8ClampedArray(buffer);
    const src = target.slice();
    for (let i = from || 0; i < (to || target.length); i++) {
      target[i] = cb(i, src, width);
    }
  },
  convolve: ({
    buffer,
    width,
    height,
    kernel,
    start,
    end,
  }: {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    kernel: number[][];
    start: number;
    end: number;
  }) => {
    const target = new Uint8ClampedArray(buffer);
    const src = target.slice();

    const offset = Math.round(kernel.length / 2) - 1;

    let totalWeights = 0;
    kernel.forEach((row) =>
      row.forEach((weight) => (totalWeights += Math.abs(weight)))
    );

    for (let index = start; index <= end; index++) {
      const x = index % (width * 4);
      const y = Math.floor(index / (width * 4));
      let average = 0;
      kernel.forEach((row, i) =>
        row.forEach((weight, j) => {
          // prettier-ignore
          const index = 
            x + (i - offset) * 4 + 
            (y + j - offset) * width * 4;
          const value = src[index];
          if (value) average += (weight * value) / totalWeights;
        })
      );
      if (index % 4 !== 3) target[index] = average;
    }
    return true;
  },
};

ComLink.expose(Api);

export type { Api };
