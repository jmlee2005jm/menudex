export type Point = { x: number; y: number };

export type ScanCorners = {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
};

export type CropViewport = {
  width: number;
  height: number;
  outputWidth: number;
  outputHeight: number;
};

export type FitMode = "cover" | "contain";

export async function cropVisibleImage(
  file: File,
  image: HTMLImageElement,
  zoom: number,
  offset: Point,
  viewport: CropViewport,
  fitMode: FitMode,
) {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const scale = getCropScale(
    { width: naturalWidth, height: naturalHeight },
    viewport,
    zoom,
    fitMode,
  );
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const renderedLeft = (viewport.width - renderedWidth) / 2 + offset.x;
  const renderedTop = (viewport.height - renderedHeight) / 2 + offset.y;
  const visibleLeft = Math.max(0, renderedLeft);
  const visibleTop = Math.max(0, renderedTop);
  const visibleRight = Math.min(viewport.width, renderedLeft + renderedWidth);
  const visibleBottom = Math.min(viewport.height, renderedTop + renderedHeight);
  const visibleWidth = Math.max(1, visibleRight - visibleLeft);
  const visibleHeight = Math.max(1, visibleBottom - visibleTop);
  const sourceX = clampSource((visibleLeft - renderedLeft) / scale, 0, naturalWidth);
  const sourceY = clampSource((visibleTop - renderedTop) / scale, 0, naturalHeight);
  const sourceWidth = Math.min(visibleWidth / scale, naturalWidth - sourceX);
  const sourceHeight = Math.min(visibleHeight / scale, naturalHeight - sourceY);
  const destinationX = ((visibleLeft - renderedLeft) / renderedWidth) * viewport.outputWidth;
  const destinationY = ((visibleTop - renderedTop) / renderedHeight) * viewport.outputHeight;
  const destinationWidth = (visibleWidth / renderedWidth) * viewport.outputWidth;
  const destinationHeight = (visibleHeight / renderedHeight) * viewport.outputHeight;
  const canvas = document.createElement("canvas");
  canvas.width = viewport.outputWidth;
  canvas.height = viewport.outputHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, viewport.outputWidth, viewport.outputHeight);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.92),
  );

  if (!blob) {
    return file;
  }

  return new File([blob], replaceExtension(file.name, "png"), { type: "image/png" });
}

export async function cropScannedRectangle(
  file: File,
  image: HTMLImageElement,
  corners: ScanCorners,
  imageBounds: { left: number; top: number; width: number; height: number },
) {
  const sourceCorners = {
    topLeft: viewportPointToSource(corners.topLeft, imageBounds, image),
    topRight: viewportPointToSource(corners.topRight, imageBounds, image),
    bottomRight: viewportPointToSource(corners.bottomRight, imageBounds, image),
    bottomLeft: viewportPointToSource(corners.bottomLeft, imageBounds, image),
  };
  const outputSize = getScanOutputSize(sourceCorners);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawPerspectiveCorrectedImage(context, image, sourceCorners, outputSize);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );

  if (!blob) {
    return file;
  }

  return new File([blob], replaceExtension(file.name, "jpg"), { type: "image/jpeg" });
}

export function getRenderedImageSize(
  naturalSize: { width: number; height: number },
  zoom: number,
  viewport: { width: number; height: number },
  fitMode: FitMode,
) {
  const scale = getCropScale(naturalSize, viewport, zoom, fitMode);

  return {
    width: naturalSize.width * scale,
    height: naturalSize.height * scale,
  };
}

export function getRenderedImageBounds(
  naturalSize: { width: number; height: number },
  viewport: { width: number; height: number },
  zoom: number,
  fitMode: FitMode,
  offset: Point,
) {
  const rendered = getRenderedImageSize(naturalSize, zoom, viewport, fitMode);

  return {
    left: (viewport.width - rendered.width) / 2 + offset.x,
    top: (viewport.height - rendered.height) / 2 + offset.y,
    width: rendered.width,
    height: rendered.height,
  };
}

export function constrainOffset(
  offset: Point,
  zoom: number,
  naturalSize: { width: number; height: number } | null,
  viewport: { width: number; height: number },
  fitMode: FitMode,
) {
  if (!naturalSize) {
    return offset;
  }

  const rendered = getRenderedImageSize(naturalSize, zoom, viewport, fitMode);
  const maxX = Math.max(0, (rendered.width - viewport.width) / 2);
  const maxY = Math.max(0, (rendered.height - viewport.height) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

function viewportPointToSource(
  point: Point,
  imageBounds: { left: number; top: number; width: number; height: number },
  image: HTMLImageElement,
) {
  return {
    x: clampSource(
      ((point.x - imageBounds.left) / imageBounds.width) * image.naturalWidth,
      0,
      image.naturalWidth,
    ),
    y: clampSource(
      ((point.y - imageBounds.top) / imageBounds.height) * image.naturalHeight,
      0,
      image.naturalHeight,
    ),
  };
}

function getScanOutputSize(corners: ScanCorners) {
  const topWidth = distance(corners.topLeft, corners.topRight);
  const bottomWidth = distance(corners.bottomLeft, corners.bottomRight);
  const leftHeight = distance(corners.topLeft, corners.bottomLeft);
  const rightHeight = distance(corners.topRight, corners.bottomRight);
  const averageWidth = Math.max(1, (topWidth + bottomWidth) / 2);
  const averageHeight = Math.max(1, (leftHeight + rightHeight) / 2);
  const aspectRatio = averageWidth / averageHeight;

  if (aspectRatio >= 1) {
    return {
      width: 1400,
      height: Math.max(600, Math.round(1400 / aspectRatio)),
    };
  }

  return {
    width: Math.max(600, Math.round(1800 * aspectRatio)),
    height: 1800,
  };
}

function drawPerspectiveCorrectedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  corners: ScanCorners,
  outputSize: { width: number; height: number },
) {
  const columns = 36;
  const rows = 36;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const u0 = x / columns;
      const v0 = y / rows;
      const u1 = (x + 1) / columns;
      const v1 = (y + 1) / rows;
      const s00 = interpolateQuad(corners, u0, v0);
      const s10 = interpolateQuad(corners, u1, v0);
      const s11 = interpolateQuad(corners, u1, v1);
      const s01 = interpolateQuad(corners, u0, v1);
      const d00 = { x: u0 * outputSize.width, y: v0 * outputSize.height };
      const d10 = { x: u1 * outputSize.width, y: v0 * outputSize.height };
      const d11 = { x: u1 * outputSize.width, y: v1 * outputSize.height };
      const d01 = { x: u0 * outputSize.width, y: v1 * outputSize.height };

      drawImageTriangle(context, image, s00, s10, s11, d00, d10, d11);
      drawImageTriangle(context, image, s00, s11, s01, d00, d11, d01);
    }
  }
}

function interpolateQuad(corners: ScanCorners, u: number, v: number) {
  return {
    x:
      corners.topLeft.x * (1 - u) * (1 - v) +
      corners.topRight.x * u * (1 - v) +
      corners.bottomRight.x * u * v +
      corners.bottomLeft.x * (1 - u) * v,
    y:
      corners.topLeft.y * (1 - u) * (1 - v) +
      corners.topRight.y * u * (1 - v) +
      corners.bottomRight.y * u * v +
      corners.bottomLeft.y * (1 - u) * v,
  };
}

function drawImageTriangle(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source0: Point,
  source1: Point,
  source2: Point,
  destination0: Point,
  destination1: Point,
  destination2: Point,
) {
  const transform = getTriangleTransform(
    source0,
    source1,
    source2,
    destination0,
    destination1,
    destination2,
  );

  if (!transform) {
    return;
  }

  context.save();
  context.beginPath();
  context.moveTo(destination0.x, destination0.y);
  context.lineTo(destination1.x, destination1.y);
  context.lineTo(destination2.x, destination2.y);
  context.closePath();
  context.clip();
  context.transform(
    transform.a,
    transform.b,
    transform.c,
    transform.d,
    transform.e,
    transform.f,
  );
  context.drawImage(image, 0, 0);
  context.restore();
}

function getTriangleTransform(
  source0: Point,
  source1: Point,
  source2: Point,
  destination0: Point,
  destination1: Point,
  destination2: Point,
) {
  const denominator =
    source0.x * (source1.y - source2.y) +
    source1.x * (source2.y - source0.y) +
    source2.x * (source0.y - source1.y);

  if (Math.abs(denominator) < 0.0001) {
    return null;
  }

  return {
    a:
      (destination0.x * (source1.y - source2.y) +
        destination1.x * (source2.y - source0.y) +
        destination2.x * (source0.y - source1.y)) /
      denominator,
    b:
      (destination0.y * (source1.y - source2.y) +
        destination1.y * (source2.y - source0.y) +
        destination2.y * (source0.y - source1.y)) /
      denominator,
    c:
      (destination0.x * (source2.x - source1.x) +
        destination1.x * (source0.x - source2.x) +
        destination2.x * (source1.x - source0.x)) /
      denominator,
    d:
      (destination0.y * (source2.x - source1.x) +
        destination1.y * (source0.x - source2.x) +
        destination2.y * (source1.x - source0.x)) /
      denominator,
    e:
      (destination0.x * (source1.x * source2.y - source2.x * source1.y) +
        destination1.x * (source2.x * source0.y - source0.x * source2.y) +
        destination2.x * (source0.x * source1.y - source1.x * source0.y)) /
      denominator,
    f:
      (destination0.y * (source1.x * source2.y - source2.x * source1.y) +
        destination1.y * (source2.x * source0.y - source0.x * source2.y) +
        destination2.y * (source0.x * source1.y - source1.x * source0.y)) /
      denominator,
  };
}

function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function clampSource(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function replaceExtension(name: string, extension: string) {
  return name.includes(".")
    ? name.replace(/\.[^.]+$/, `.${extension}`)
    : `${name}.${extension}`;
}

function getCropScale(
  naturalSize: { width: number; height: number },
  viewport: { width: number; height: number },
  zoom: number,
  fitMode: FitMode,
) {
  const baseScale =
    fitMode === "cover"
      ? Math.max(viewport.width / naturalSize.width, viewport.height / naturalSize.height)
      : Math.min(viewport.width / naturalSize.width, viewport.height / naturalSize.height);

  return baseScale * zoom;
}
