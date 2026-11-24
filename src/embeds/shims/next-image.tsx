import type { ImgHTMLAttributes } from "react";

/** esbuild shim for next/image — plain img with high fetch priority. */
export default function Image(
  props: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }
) {
  const { priority, fill: _fill, ...rest } = props;
  return <img {...rest} fetchPriority={priority ? "high" : rest.fetchPriority} />;
}
