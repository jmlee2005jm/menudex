"use client";

import {
  ClipboardEvent,
  ChangeEvent,
  PointerEvent,
  useRef,
  useState,
} from "react";

const cropViewportSize = 192;

export function PasteImageInput({
  name,
  onFile,
  accept = "image/*",
  compact = false,
  preview = false,
  currentPreviewUrl,
  cropSquare = false,
}: {
  name: string;
  onFile?: (file: File) => void;
  accept?: string;
  compact?: boolean;
  preview?: boolean;
  currentPreviewUrl?: string;
  cropSquare?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cropSource, setCropSource] = useState<{ file: File; url: string } | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [dragStart, setDragStart] = useState<{
    pointerX: number;
    pointerY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      await acceptFile(file);
    }
  }

  async function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    const file = item?.getAsFile();

    if (!file) {
      return;
    }

    const namedFile = new File([file], file.name || `pasted-image-${Date.now()}.png`, {
      type: file.type || "image/png",
    });

    await acceptFile(namedFile);
  }

  async function acceptFile(file: File) {
    if (cropSquare) {
      setCropSource((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }

        return { file, url: URL.createObjectURL(file) };
      });
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setNaturalSize(null);
      setFileName("");
      return;
    }

    commitFile(file);
  }

  function commitFile(file: File) {
    const transfer = new DataTransfer();
    transfer.items.add(file);

    if (inputRef.current) {
      inputRef.current.files = transfer.files;
    }

    setFileName(file.name);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return preview ? URL.createObjectURL(file) : "";
    });
    onFile?.(file);
  }

  async function applyCrop() {
    if (!cropSource || !cropImageRef.current) {
      return;
    }

    setProcessing(true);
    const croppedFile = await cropVisibleSquare(
      cropSource.file,
      cropImageRef.current,
      cropZoom,
      cropOffset,
    );
    commitFile(croppedFile);
    URL.revokeObjectURL(cropSource.url);
    setCropSource(null);
    setNaturalSize(null);
    setProcessing(false);
  }

  function cancelCrop() {
    if (cropSource) {
      URL.revokeObjectURL(cropSource.url);
    }

    setCropSource(null);
    setNaturalSize(null);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y,
    });
  }

  function dragCrop(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart) {
      return;
    }

    event.preventDefault();
    setCropOffset(
      constrainOffset(
        {
          x: dragStart.offsetX + event.clientX - dragStart.pointerX,
          y: dragStart.offsetY + event.clientY - dragStart.pointerY,
        },
        cropZoom,
        naturalSize,
      ),
    );
  }

  const renderedImageSize = naturalSize
    ? getRenderedImageSize(naturalSize, cropZoom)
    : null;

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      className={`border border-dashed border-line bg-white p-3 outline-none focus:border-leaf ${
        compact ? "grid gap-2" : "grid gap-3"
      }`}
    >
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
        className="min-h-10 justify-self-start bg-ink px-3 text-sm font-medium text-white"
      >
        파일 선택
      </button>
      <p className="text-sm text-ink/55">
        파일을 선택하거나 이미지를 붙여넣기 하세요.
      </p>
      {processing ? <p className="text-sm text-ink/60">아이콘 크기로 자르는 중...</p> : null}
      {cropSource ? (
        <div className="grid gap-3">
          <div
            className="relative h-48 w-48 touch-none overflow-hidden border border-line bg-paper"
            onPointerDown={startDrag}
            onPointerMove={dragCrop}
            onPointerUp={() => setDragStart(null)}
            onPointerCancel={() => setDragStart(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={cropImageRef}
              src={cropSource.url}
              alt="아이콘 자르기"
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              draggable={false}
              onLoad={(event) => {
                setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              style={{
                width: renderedImageSize ? `${renderedImageSize.width}px` : "100%",
                height: renderedImageSize ? `${renderedImageSize.height}px` : "100%",
                transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
              }}
            />
          </div>
          <label className="grid gap-1 text-sm text-ink/65">
            확대
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={cropZoom}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setCropZoom(nextZoom);
                setCropOffset((current) => constrainOffset(current, nextZoom, naturalSize));
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyCrop}
              disabled={processing}
              className="min-h-10 bg-ink px-3 text-sm font-medium text-white disabled:bg-ink/35"
            >
              자르기 적용
            </button>
            <button
              type="button"
              onClick={cancelCrop}
              className="min-h-10 border border-line bg-white px-3 text-sm font-medium text-ink"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
      {preview && (previewUrl || currentPreviewUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl || currentPreviewUrl}
          alt="선택한 이미지 미리보기"
          className="h-20 w-20 border border-line bg-white object-contain"
        />
      ) : null}
      {fileName ? <p className="text-sm text-ink/70">선택됨: {fileName}</p> : null}
    </div>
  );
}

async function cropVisibleSquare(
  file: File,
  image: HTMLImageElement,
  zoom: number,
  offset: { x: number; y: number },
) {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const scale = Math.max(cropViewportSize / naturalWidth, cropViewportSize / naturalHeight) * zoom;
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const renderedLeft = (cropViewportSize - renderedWidth) / 2 + offset.x;
  const renderedTop = (cropViewportSize - renderedHeight) / 2 + offset.y;
  const sourceX = clampSource(-renderedLeft / scale, 0, naturalWidth);
  const sourceY = clampSource(-renderedTop / scale, 0, naturalHeight);
  const sourceSize = Math.min(
    cropViewportSize / scale,
    naturalWidth - sourceX,
    naturalHeight - sourceY,
  );
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.92),
  );

  if (!blob) {
    return file;
  }

  return new File([blob], replaceExtension(file.name, "png"), { type: "image/png" });
}

function clampSource(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function replaceExtension(name: string, extension: string) {
  return name.includes(".")
    ? name.replace(/\.[^.]+$/, `.${extension}`)
    : `${name}.${extension}`;
}

function getRenderedImageSize(
  naturalSize: { width: number; height: number },
  zoom: number,
) {
  const scale =
    Math.max(cropViewportSize / naturalSize.width, cropViewportSize / naturalSize.height) *
    zoom;

  return {
    width: naturalSize.width * scale,
    height: naturalSize.height * scale,
  };
}

function constrainOffset(
  offset: { x: number; y: number },
  zoom: number,
  naturalSize: { width: number; height: number } | null,
) {
  if (!naturalSize) {
    return offset;
  }

  const rendered = getRenderedImageSize(naturalSize, zoom);
  const maxX = Math.max(0, (rendered.width - cropViewportSize) / 2);
  const maxY = Math.max(0, (rendered.height - cropViewportSize) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}
