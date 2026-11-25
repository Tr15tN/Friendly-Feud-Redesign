import { tvLayout } from "@/lib/tv/layout";
import { ReactNode, useEffect, useState } from "react";

interface TvCanvasProps {
  children: ReactNode;
  /** The host's "TV size" setting, in percent. */
  displayScale?: number | null;
  /** Background that must reach every edge of the screen, even when the content is made smaller. */
  backgroundClassName?: string;
}

/**
 * Full-screen stage for the TV picture. Children are laid out on a 1080-pixel-tall canvas that is scaled to the real
 * screen (see tvLayout), so inside it `cqw` / `cqh` mean "percent of the usable picture" and rem / px behave as on a 1080p TV.
 * The host can shrink the content towards the middle if the TV cuts off the edges of the picture.
 */
export default function TvCanvas({ children, displayScale, backgroundClassName = "" }: TvCanvasProps) {
  const [screen, setScreen] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const update = () => setScreen({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const layout = tvLayout(screen.width, screen.height, displayScale);

  return (
    <div
      id="tvCanvas"
      data-scale={layout.base}
      data-percent={layout.percent}
      className={`fixed left-0 top-0 overflow-hidden ${backgroundClassName}`}
      style={{
        width: layout.width,
        height: layout.height,
        transform: `scale(${layout.base})`,
        transformOrigin: "0 0",
      }}
    >
      <div id="tvSafeArea" className="absolute" style={{ inset: `${layout.insetPercent}%`, containerType: "size" }}>
        {children}
      </div>
    </div>
  );
}
