import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableSummaryProps {
  text: string;
  clampLines?: 2 | 3 | 4;
  className?: string;
  textClassName?: string;
  buttonClassName?: string;
}

export const ExpandableSummary: React.FC<ExpandableSummaryProps> = ({
  text,
  clampLines = 3,
  className = '',
  textClassName = '',
  buttonClassName = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  const hasLongText = text.trim().length > (clampLines === 2 ? 120 : 180);

  useEffect(() => {
    setIsExpanded(false);
  }, [text]);

  useEffect(() => {
    const el = paragraphRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!isExpanded) {
        setNeedsExpansion(el.scrollHeight > el.clientHeight + 2 || hasLongText);
      }
    };

    checkOverflow();
    const rafId = requestAnimationFrame(checkOverflow);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(el);
      return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }

    return () => cancelAnimationFrame(rafId);
  }, [text, isExpanded, clampLines, hasLongText]);

  const clampClass =
    clampLines === 2
      ? 'line-clamp-2'
      : clampLines === 4
        ? 'line-clamp-4'
        : 'line-clamp-3';

  return (
    <div className={className}>
      <p
        ref={paragraphRef}
        className={`${textClassName} ${!isExpanded ? clampClass : ''}`}
      >
        {text}
      </p>
      {(needsExpansion || hasLongText || isExpanded) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer transition ${buttonClassName}`}
        >
          {isExpanded ? (
            <>
              <span>Réduire le résumé</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Lire le résumé complet</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
