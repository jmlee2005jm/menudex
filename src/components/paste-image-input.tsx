"use client";

import { ClipboardEvent, ChangeEvent, useRef, useState } from "react";

export function PasteImageInput({
  name,
  onFile,
  accept = "image/*",
  compact = false,
  preview = false,
}: {
  name: string;
  onFile?: (file: File) => void;
  accept?: string;
  compact?: boolean;
  preview?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      acceptFile(file);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
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
    const transfer = new DataTransfer();
    transfer.items.add(namedFile);

    if (inputRef.current) {
      inputRef.current.files = transfer.files;
    }

    acceptFile(namedFile);
  }

  function acceptFile(file: File) {
    setFileName(file.name);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return preview ? URL.createObjectURL(file) : "";
    });
    onFile?.(file);
  }

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
        className="block min-h-11 w-full text-base file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
      />
      <p className="text-sm text-ink/55">
        파일을 선택하거나 이미지를 붙여넣기 하세요.
      </p>
      {preview && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="선택한 이미지 미리보기"
          className="h-20 w-20 border border-line bg-white object-contain"
        />
      ) : null}
      {fileName ? <p className="text-sm text-ink/70">선택됨: {fileName}</p> : null}
    </div>
  );
}
