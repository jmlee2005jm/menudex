"use client";

import { useId } from "react";

export function RatingField({
  name,
  value,
  onChange,
  error,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const numericValue = Number(value);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-1" aria-label="별점">
        {[1, 2, 3, 4, 5].map((star) => {
          const leftValue = star - 0.5;
          const rightValue = star;
          const fill =
            numericValue >= rightValue
              ? "full"
              : numericValue >= leftValue
                ? "half"
                : "empty";

          return (
            <span key={star} className="relative inline-grid h-10 w-10 place-items-center">
              <StarIcon className="h-8 w-8 text-yellow-400" fillPercent={0} />
              {fill !== "empty" ? (
                <StarIcon
                  className="absolute h-8 w-8 text-yellow-400"
                  fillPercent={fill === "half" ? 50 : 100}
                />
              ) : null}
              <button
                type="button"
                aria-label={`${leftValue}점`}
                className="absolute left-0 top-0 h-10 w-1/2"
                onClick={() => onChange(String(leftValue))}
              />
              <button
                type="button"
                aria-label={`${rightValue}점`}
                className="absolute right-0 top-0 h-10 w-1/2"
                onClick={() => onChange(String(rightValue))}
              />
            </span>
          );
        })}
      </div>
      <p className="mt-1 text-sm text-ink/60">
        {value ? `${value} / 5` : "별점 없음"}
      </p>
      {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export function RatingDisplay({ value }: { value: number | null }) {
  if (!value) {
    return <span className="text-sm text-ink/60">별점 없음</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercent = value >= star ? 100 : value >= star - 0.5 ? 50 : 0;

        return (
          <StarIcon
            key={star}
            className="h-4 w-4 text-yellow-400"
            fillPercent={fillPercent}
          />
        );
      })}
      <span className="sr-only">{value} / 5</span>
    </span>
  );
}

function StarIcon({
  className,
  fillPercent,
}: {
  className?: string;
  fillPercent: number;
}) {
  const fillId = `star-fill-${useId().replaceAll(":", "")}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <clipPath id={fillId}>
          <rect x="0" y="0" width={`${fillPercent}%`} height="100%" />
        </clipPath>
      </defs>
      <path d="m12 2.8 2.86 5.8 6.4.93-4.63 4.51 1.09 6.37L12 17.4l-5.72 3.01 1.09-6.37-4.63-4.51 6.4-.93L12 2.8Z" />
      {fillPercent > 0 ? (
        <path
          clipPath={`url(#${fillId})`}
          fill="currentColor"
          stroke="currentColor"
          d="m12 2.8 2.86 5.8 6.4.93-4.63 4.51 1.09 6.37L12 17.4l-5.72 3.01 1.09-6.37-4.63-4.51 6.4-.93L12 2.8Z"
        />
      ) : null}
    </svg>
  );
}
