import React, { useEffect, useRef, useState } from "react";

interface DrawLine {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

interface ReaderCanvasProps {
  currentSlideIndex: number;
  tool: "none" | "laser" | "pen";
  color: string;
  drawings: Record<number, DrawLine[]>;
  setDrawings: React.Dispatch<React.SetStateAction<Record<number, DrawLine[]>>>;
}

export default function ReaderCanvas({
  currentSlideIndex,
  tool,
  color,
  drawings,
  setDrawings
}: ReaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Track actual pixel canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const isDrawingRef = useRef(false);
  const currentLineRef = useRef<Array<{ x: number; y: number }>>([]);
  
  // Realtime temporary laser trail coordinates and mouse cursor tracker
  const laserTrailRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const isHoveredRef = useRef(false);

  // ResizeObserver for tracking the layout dimensions perfectly without fixed screens bounds
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 100),
        height: Math.max(height, 100)
      });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Synchronize layout sizing inside canvas object attributes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
    }
  }, [dimensions]);

  // Render loop using requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      // Clear background safely
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // 1. Draw saved pen markings for the active slide index
      const activeMarkings = drawings[currentSlideIndex] || [];
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      activeMarkings.forEach((line) => {
        if (line.points.length < 1) return;
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.stroke();
      });

      // 2. Draw active in-progress pen stroke
      if (tool === "pen" && isDrawingRef.current && currentLineRef.current.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.moveTo(currentLineRef.current[0].x, currentLineRef.current[0].y);
        for (let i = 1; i < currentLineRef.current.length; i++) {
          ctx.lineTo(currentLineRef.current[i].x, currentLineRef.current[i].y);
        }
        ctx.stroke();
      }

      // 3. Draw high-fidelity tapering laser trails
      const now = Date.now();
      // Retain trails for 550ms for a snappy and realistic responsive feel
      laserTrailRef.current = laserTrailRef.current.filter((p) => now - p.time < 550);

      const trail = laserTrailRef.current;
      if (trail.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Pass 1: Outer glow trail (thicker, semi-transparent)
        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const ageRatio = (now - p2.time) / 550;
          const alpha = Math.max(0, 1 - ageRatio);

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.45 * alpha;
          ctx.lineWidth = 10 * alpha;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Pass 2: Inner core trail (thinner, brighter)
        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const ageRatio = (now - p2.time) / 550;
          const alpha = Math.max(0, 1 - ageRatio);

          ctx.beginPath();
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = 0.9 * alpha;
          ctx.lineWidth = 3.5 * alpha;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. Draw OneNote style circular glowing laser head
      if (tool === "laser" && mousePosRef.current && isHoveredRef.current) {
        const { x, y } = mousePosRef.current;
        
        ctx.save();
        // Ring 1: Soft outer halo
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.fill();

        // Ring 2: Vibrant inner glow
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.fill();

        // Inner Core: White focal point
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [dimensions, currentSlideIndex, drawings, tool, color]);

  // Collect drawing inputs from events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "none") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture the pointer to trace moves cleanly even if they slip outside the canvas boundaries
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore capture errors on older engines
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pen") {
      isDrawingRef.current = true;
      currentLineRef.current = [{ x, y }];
    } else if (tool === "laser") {
      laserTrailRef.current.push({ x, y, time: Date.now() });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePosRef.current = { x, y };

    if (tool === "pen" && isDrawingRef.current) {
      currentLineRef.current.push({ x, y });
    } else if (tool === "laser") {
      laserTrailRef.current.push({ x, y, time: Date.now() });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
    }

    if (tool === "pen" && isDrawingRef.current && currentLineRef.current.length > 0) {
      const newLine: DrawLine = {
        points: [...currentLineRef.current],
        color,
        width: 4
      };

      setDrawings((prev) => ({
        ...prev,
        [currentSlideIndex]: [...(prev[currentSlideIndex] || []), newLine]
      }));

      isDrawingRef.current = false;
      currentLineRef.current = [];
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isHoveredRef.current = false;
    handlePointerUp(e);
  };

  const handlePointerEnter = () => {
    isHoveredRef.current = true;
  };

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onPointerEnter={handlePointerEnter}
        className={`w-full h-full block touch-none ${
          tool !== "none" ? "pointer-events-auto cursor-none" : "pointer-events-none cursor-default"
        }`}
      />
    </div>
  );
}
