import { cn } from "@/lib/utils";

const faces = [
  "[transform:translateZ(4rem)]",
  "[transform:rotateY(180deg)_translateZ(4rem)]",
  "[transform:rotateY(90deg)_translateZ(4rem)]",
  "[transform:rotateY(-90deg)_translateZ(4rem)]",
  "[transform:rotateX(90deg)_translateZ(4rem)]",
  "[transform:rotateX(-90deg)_translateZ(4rem)]",
];

// Placeholder del asset animado/3D definitivo del panel derecho del login.
export function RotatingCube() {
  return (
    <div className="[perspective:800px]" aria-hidden="true">
      <div className="relative size-32 animate-[cube-spin_12s_linear_infinite] [transform-style:preserve-3d] motion-reduce:animate-none">
        {faces.map((face) => (
          <div
            key={face}
            className={cn(
              "absolute inset-0 rounded-lg border border-primary-foreground/40 bg-primary-foreground/15",
              face,
            )}
          />
        ))}
      </div>
    </div>
  );
}
