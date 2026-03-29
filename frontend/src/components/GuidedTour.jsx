import React, { useEffect, useMemo, useState } from 'react';
import './GuidedTour.css';

const TOOLTIP_WIDTH = 320;
const SPOTLIGHT_PADDING = 10;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const GuidedTour = ({ isOpen, steps = [], onClose }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 100, left: 24 });

  const currentStep = useMemo(() => steps[index] || null, [steps, index]);

  useEffect(() => {
    if (!isOpen) return;
    setIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const recalculate = () => {
      const target = document.querySelector(currentStep.target);
      if (!target) {
        setRect(null);
        setTooltipPos({
          top: clamp(window.innerHeight * 0.25, 80, window.innerHeight - 220),
          left: clamp((window.innerWidth - TOOLTIP_WIDTH) / 2, 16, window.innerWidth - TOOLTIP_WIDTH - 16)
        });
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const paddedRect = {
        top: Math.max(8, targetRect.top - SPOTLIGHT_PADDING),
        left: Math.max(8, targetRect.left - SPOTLIGHT_PADDING),
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2
      };
      setRect(paddedRect);

      const canPlaceBelow = targetRect.bottom + 220 < window.innerHeight;
      const top = canPlaceBelow
        ? paddedRect.top + paddedRect.height + 14
        : Math.max(16, paddedRect.top - 210);
      const left = clamp(
        paddedRect.left + paddedRect.width / 2 - TOOLTIP_WIDTH / 2,
        16,
        window.innerWidth - TOOLTIP_WIDTH - 16
      );
      setTooltipPos({ top, left });
    };

    recalculate();
    window.addEventListener('resize', recalculate);
    window.addEventListener('scroll', recalculate, true);

    return () => {
      window.removeEventListener('resize', recalculate);
      window.removeEventListener('scroll', recalculate, true);
    };
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentStep) return null;

  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div className="guided-tour-root" role="dialog" aria-modal="true" aria-label="Guided product tour">
      <div className="guided-tour-overlay" onClick={() => onClose?.(false)} />

      {rect && (
        <div
          className="guided-tour-spotlight"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }}
        />
      )}

      <div
        className="guided-tour-tooltip"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}
      >
        <p className="guided-tour-step">Step {index + 1} of {steps.length}</p>
        <h3>{currentStep.title}</h3>
        <p>{currentStep.content}</p>

        <div className="guided-tour-actions">
          <button type="button" className="tour-action-muted" onClick={() => onClose?.(false)}>
            Skip
          </button>

          <div className="tour-action-group">
            <button
              type="button"
              className="tour-action-muted"
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              disabled={isFirst}
            >
              Back
            </button>
            
            <button
              type="button"
              className="tour-action-primary"
              onClick={() => {
                if (isLast) {
                  onClose?.(true);
                } else {
                  setIndex((prev) => prev + 1);
                }
              }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;

