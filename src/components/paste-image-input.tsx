"use client";

import {
  ClipboardEvent,
  ChangeEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  constrainOffset,
  cropScannedRectangle,
  cropVisibleImage,
  getRenderedImageBounds,
  getRenderedImageSize,
  type ScanCorners,
} from "@/lib/image-crop";

const cropViewportSizes = {
  square: { width: 192, height: 192, outputWidth: 512, outputHeight: 512 },
  menu: { width: 320, height: 220, outputWidth: 1200, outputHeight: 825 },
};

export function PasteImageInput({
  name,
  onFile,
  accept = "image/*",
  compact = false,
  preview = false,
  currentPreviewUrl,
  cropSquare = false,
  cropMenuPhoto = false,
}: {
  name: string;
  onFile?: (file: File) => void;
  accept?: string;
  compact?: boolean;
  preview?: boolean;
  currentPreviewUrl?: string;
  cropSquare?: boolean;
  cropMenuPhoto?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const previewUrlRef = useRef("");
  const originalCropSourceRef = useRef<{
    file: File;
    url: string;
  } | null>(null);
  const [originalCropSource, setOriginalCropSource] = useState<{
    file: File;
    url: string;
  } | null>(null);
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
  const [cornerDrag, setCornerDrag] = useState<keyof ScanCorners | null>(null);
  const [scanCorners, setScanCorners] = useState<ScanCorners | null>(null);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    originalCropSourceRef.current = originalCropSource;
  }, [originalCropSource]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      if (originalCropSourceRef.current) {
        URL.revokeObjectURL(originalCropSourceRef.current.url);
      }
    },
    [],
  );

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
    if (cropSquare || cropMenuPhoto) {
      const next = { file, url: URL.createObjectURL(file) };
      setOriginalCropSource((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }

        return next;
      });
      setCropSource(next);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setNaturalSize(null);
      setScanCorners(null);
      setFileName("");
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return "";
      });
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
    const croppedFile =
      cropMenuPhoto && scanCorners && naturalSize
        ? await cropScannedRectangle(
            cropSource.file,
            cropImageRef.current,
            scanCorners,
            getRenderedImageBounds(naturalSize, cropViewportSizes.menu, 1, "contain", {
              x: 0,
              y: 0,
            }),
          )
        : await cropVisibleImage(
            cropSource.file,
            cropImageRef.current,
            cropZoom,
            cropOffset,
            cropSquare ? cropViewportSizes.square : cropViewportSizes.menu,
            cropSquare ? "cover" : "contain",
          );
    commitFile(croppedFile);
    setCropSource(null);
    setNaturalSize(null);
    setScanCorners(null);
    setProcessing(false);
  }

  function cancelCrop() {
    if (!fileName && originalCropSource) {
      URL.revokeObjectURL(originalCropSource.url);
      setOriginalCropSource(null);
    }

    setCropSource(null);
    setNaturalSize(null);
    setScanCorners(null);
  }

  function reopenCrop() {
    if (!originalCropSource) {
      return;
    }

    setCropSource(originalCropSource);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setNaturalSize(null);
    setScanCorners(null);
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
        cropSquare ? cropViewportSizes.square : cropViewportSizes.menu,
        cropSquare ? "cover" : "contain",
      ),
    );
  }

  function startCornerDrag(event: PointerEvent<HTMLButtonElement>, corner: keyof ScanCorners) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setCornerDrag(corner);
  }

  function dragScanCorner(event: PointerEvent<HTMLDivElement>) {
    if (!cornerDrag || !scanCorners) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPoint = {
      x: Math.min(cropViewportSizes.menu.width, Math.max(0, event.clientX - rect.left)),
      y: Math.min(cropViewportSizes.menu.height, Math.max(0, event.clientY - rect.top)),
    };

    setScanCorners((current) =>
      current ? { ...current, [cornerDrag]: nextPoint } : current,
    );
  }

  const renderedImageSize = naturalSize
    ? getRenderedImageSize(
        naturalSize,
        cropZoom,
        cropSquare ? cropViewportSizes.square : cropViewportSizes.menu,
        cropSquare ? "cover" : "contain",
      )
    : null;
  const cropViewport = cropSquare ? cropViewportSizes.square : cropViewportSizes.menu;
  const useScanCrop = cropMenuPhoto && cropSource;

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
      {processing ? <p className="text-sm text-ink/60">사진을 자르는 중...</p> : null}
      {cropSource ? (
        <div className="grid gap-3">
          <div
            className="relative touch-none overflow-hidden border border-line bg-paper"
            onPointerDown={useScanCrop ? undefined : startDrag}
            onPointerMove={useScanCrop ? dragScanCorner : dragCrop}
            onPointerUp={() => {
              setDragStart(null);
              setCornerDrag(null);
            }}
            onPointerCancel={() => {
              setDragStart(null);
              setCornerDrag(null);
            }}
            style={{ width: cropViewport.width, height: cropViewport.height }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={cropImageRef}
              src={cropSource.url}
              alt={cropMenuPhoto ? "메뉴 사진 자르기" : "아이콘 자르기"}
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              draggable={false}
              onLoad={(event) => {
                const nextNaturalSize = {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                };
                setNaturalSize(nextNaturalSize);

                if (cropMenuPhoto) {
                  const bounds = getRenderedImageBounds(
                    nextNaturalSize,
                    cropViewportSizes.menu,
                    1,
                    "contain",
                    { x: 0, y: 0 },
                  );
                  setScanCorners({
                    topLeft: { x: bounds.left, y: bounds.top },
                    topRight: { x: bounds.left + bounds.width, y: bounds.top },
                    bottomRight: {
                      x: bounds.left + bounds.width,
                      y: bounds.top + bounds.height,
                    },
                    bottomLeft: { x: bounds.left, y: bounds.top + bounds.height },
                  });
                }
              }}
              style={{
                width: renderedImageSize ? `${renderedImageSize.width}px` : "100%",
                height: renderedImageSize ? `${renderedImageSize.height}px` : "100%",
                transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
              }}
            />
            {useScanCrop && scanCorners ? (
              <>
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <polygon
                    points={[
                      scanCorners.topLeft,
                      scanCorners.topRight,
                      scanCorners.bottomRight,
                      scanCorners.bottomLeft,
                    ]
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                    fill="rgba(250, 204, 21, 0.16)"
                    stroke="rgb(234, 179, 8)"
                    strokeWidth="2"
                  />
                </svg>
                {Object.entries(scanCorners).map(([corner, point]) => (
                  <button
                    key={corner}
                    type="button"
                    aria-label="자르기 꼭짓점"
                    onPointerDown={(event) =>
                      startCornerDrag(event, corner as keyof ScanCorners)
                    }
                    className="absolute h-7 w-7 rounded-full border-2 border-yellow-500 bg-white shadow"
                    style={{
                      left: point.x,
                      top: point.y,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ))}
              </>
            ) : null}
          </div>
          {useScanCrop ? (
            <p className="text-sm text-ink/60">
              네 모서리를 메뉴판 끝에 맞추면 직사각형으로 보정해서 저장합니다.
            </p>
          ) : (
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
                  setCropOffset((current) =>
                    constrainOffset(
                      current,
                      nextZoom,
                      naturalSize,
                      cropViewport,
                      cropSquare ? "cover" : "contain",
                    ),
                  );
                }}
              />
            </label>
          )}
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
      {fileName ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-ink/70">선택됨: {fileName}</p>
          {originalCropSource ? (
            <button
              type="button"
              onClick={reopenCrop}
              className="min-h-9 border border-line bg-white px-2 text-sm font-medium text-ink"
            >
              다시 자르기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
