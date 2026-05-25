"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import type {
  MenuAnnotationCoordinates,
  MenuAnnotationRow,
  MenuPhotoRow,
} from "@/lib/supabase/types";
import { clearCachedJson } from "@/lib/client-cache";

type DraftRect = MenuAnnotationCoordinates | null;

export function MenuPhotoAnnotator({
  restaurantId,
  photo,
  onDeletePhoto,
  currentProfileId,
  onAnnotationsChange,
}: {
  restaurantId: string;
  photo: MenuPhotoRow;
  onDeletePhoto: (photoId: string) => void;
  currentProfileId?: string;
  onAnnotationsChange?: (annotations: MenuAnnotationRow[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [annotations, setAnnotations] = useState<MenuAnnotationRow[]>(
    photo.menu_annotations ?? [],
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftRect>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [highlightSaving, setHighlightSaving] = useState(false);
  const [error, setError] = useState("");

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      ),
    [annotations],
  );

  function beginHighlight(event: PointerEvent<HTMLDivElement>) {
    if (!adding || !photo.signedUrl) {
      return;
    }

    event.preventDefault();
    const point = getNormalizedPoint(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setError("");
    setDragStart(point);
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function updateHighlight(event: PointerEvent<HTMLDivElement>) {
    if (!adding || !dragStart) {
      return;
    }

    event.preventDefault();
    const point = getNormalizedPoint(event);

    if (!point) {
      return;
    }

    setDraft(normalizeRect(dragStart, point));
  }

  function finishHighlight(event: PointerEvent<HTMLDivElement>) {
    if (!adding || !dragStart || !draft) {
      return;
    }

    event.preventDefault();
    setDragStart(null);

    if (draft.width < 0.005 || draft.height < 0.005) {
      setDraft(null);
    }
  }

  async function confirmHighlight() {
    if (!draft || highlightSaving) {
      return;
    }

    setError("");
    setHighlightSaving(true);
    const response = await fetch(
      `/api/restaurants/${restaurantId}/menu-photos/${photo.id}/annotations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coordinates: draft }),
      },
    );
    const data = (await response.json()) as {
      annotation?: MenuAnnotationRow;
      error?: string;
    };

    if (!response.ok || !data.annotation) {
      setError(data.error ?? "하이라이트를 저장하지 못했습니다.");
      setDraft(null);
      setHighlightSaving(false);
      return;
    }

    setAnnotations((current) => {
      const next = [...current, data.annotation!];
      onAnnotationsChange?.(next);
      return next;
    });
    clearCachedJson(`/api/restaurants/${restaurantId}`);
    setDraft(null);
    setAdding(false);
    setHighlightSaving(false);
  }

  function cancelHighlight() {
    setDraft(null);
    setDragStart(null);
    setAdding(false);
    setError("");
  }

  async function deleteAnnotation(annotationId: string) {
    if (!window.confirm("이 하이라이트를 지울까요?")) {
      return;
    }

    const response = await fetch(
      `/api/restaurants/${restaurantId}/menu-photos/${photo.id}/annotations`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ annotationId }),
      },
    );
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "하이라이트를 삭제하지 못했습니다.");
      return;
    }

    setAnnotations((current) => {
      const next = current.filter((annotation) => annotation.id !== annotationId);
      onAnnotationsChange?.(next);
      return next;
    });
    clearCachedJson(`/api/restaurants/${restaurantId}`);
  }

  function getNormalizedPoint(event: PointerEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  return (
    <div className="border border-line bg-white/70 p-3">
      {photo.signedUrl ? (
        <div
          ref={containerRef}
          className={`relative w-full bg-white ${
            adding ? "cursor-crosshair select-none" : ""
          }`}
          style={{ touchAction: adding ? "none" : "pan-y" }}
          onPointerDown={beginHighlight}
          onPointerMove={updateHighlight}
          onPointerUp={finishHighlight}
          onPointerCancel={() => setDragStart(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.signedUrl}
            alt="메뉴 사진"
            className="h-auto w-full object-contain"
            draggable={false}
          />
          {sortedAnnotations.map((annotation) => (
            <button
              key={annotation.id}
              type="button"
              aria-label="하이라이트 삭제"
              title="하이라이트 삭제"
              onClick={(event) => {
                event.stopPropagation();
                deleteAnnotation(annotation.id);
              }}
              className="absolute border border-yellow-500/70 bg-yellow-300/45"
              style={rectStyle(annotation.coordinates)}
            />
          ))}
          {draft ? (
            <div
              className="absolute border border-yellow-500/80 bg-yellow-300/45"
              style={rectStyle(draft)}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid min-h-60 place-items-center bg-white text-sm text-ink/60">
          사진을 불러올 수 없습니다.
        </div>
      )}

      {photo.taken_at ? (
        <p className="mt-2 text-sm text-ink/60">촬영일: {photo.taken_at.slice(0, 10)}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {adding ? (
          <>
            <button
              type="button"
              onClick={confirmHighlight}
              disabled={!draft || highlightSaving}
              className="min-h-11 bg-leaf px-4 text-sm font-semibold text-white disabled:bg-leaf/35"
            >
              {highlightSaving ? "저장 중..." : draft ? "하이라이트 저장" : "영역 선택 후 저장"}
            </button>
            <button
              type="button"
              onClick={cancelHighlight}
              disabled={highlightSaving}
              className="min-h-11 border border-line bg-white px-3 text-sm font-medium text-ink disabled:text-ink/35"
            >
              선택 취소
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setDraft(null);
              setDragStart(null);
              setError("");
            }}
            className="min-h-10 border border-line bg-white px-3 text-sm font-medium text-ink"
          >
            하이라이트 추가
          </button>
        )}
        {photo.owner_profile_id === currentProfileId ? (
          <button
            type="button"
            onClick={() => onDeletePhoto(photo.id)}
            className="min-h-10 border border-red-200 bg-white px-3 text-sm font-medium text-red-700"
          >
            사진 삭제
          </button>
        ) : null}
      </div>

      {adding ? (
        <p className="mt-2 text-sm text-ink/60">
          메뉴 위를 드래그해서 먹은 항목을 노란색으로 표시하세요. 저장된 표시를 누르면
          삭제할 수 있습니다.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export function MenuPhotoCard({
  restaurantId,
  photo,
  onDeletePhoto,
  currentProfileId,
}: {
  restaurantId: string;
  photo: MenuPhotoRow;
  onDeletePhoto: (photoId: string) => void;
  currentProfileId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [annotations, setAnnotations] = useState<MenuAnnotationRow[]>(
    photo.menu_annotations ?? [],
  );
  const photoWithAnnotations = { ...photo, menu_annotations: annotations };
  const highlightCount = annotations.length;

  if (open) {
    return (
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-10 justify-self-start border border-line bg-white px-3 text-sm font-medium text-ink"
        >
          사진 접기
        </button>
        <MenuPhotoAnnotator
          restaurantId={restaurantId}
          photo={photoWithAnnotations}
          onDeletePhoto={onDeletePhoto}
          currentProfileId={currentProfileId}
          onAnnotationsChange={setAnnotations}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-3 border border-line bg-white/70 p-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-24 w-24 shrink-0 overflow-hidden border border-line bg-white"
      >
        {photo.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.signedUrl}
            alt="메뉴 사진"
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="grid h-full place-items-center text-xs text-ink/50">사진</span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium">메뉴 사진</p>
        <p className="mt-1 text-sm text-ink/60">
          {photo.taken_at ? `촬영일 ${photo.taken_at.slice(0, 10)} · ` : ""}
          하이라이트 {highlightCount}개
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-10 border border-line bg-white px-3 text-sm font-medium text-ink"
          >
            크게 보기
          </button>
          {photo.owner_profile_id === currentProfileId ? (
            <button
              type="button"
              onClick={() => onDeletePhoto(photo.id)}
              className="min-h-10 border border-red-200 bg-white px-3 text-sm font-medium text-red-700"
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function normalizeRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function rectStyle(rect: MenuAnnotationCoordinates) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
