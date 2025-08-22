// src/dnd/portal.tsx
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export function useDraggableInPortal() {
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.pointerEvents = "none";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    portalRef.current = el;
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return function wrap(render: any) {
    return (provided: any, snapshot: any, rubric: any) => {
      const child = render(provided, snapshot, rubric);
      if (snapshot.isDragging && portalRef.current) {
        return ReactDOM.createPortal(child, portalRef.current);
      }
      return child;
    };
  };
}
