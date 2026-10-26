import React, { useRef, useState } from "react";

import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { useAction } from "./actions.tsx";
import { useComponentState } from "./state.tsx";

// A diagram the user draws in the page and an agent edits as JSON:
//
//   <Diagram id="..." />
//
// Its state is { height, shapes }. The drawing is 800 units wide and `height`
// units tall, and the shapes are drawn in order. Colours are any CSS colour,
// "none", or a theme token such as "var(--foreground)". An agent can also run
// the actions add, update, remove, reorder, select, setHeight and svg with
// `rx action`.

// ---------------------------------------------------------------------------
// The drawing format

type Style = {
  stroke: string;
  strokeWidth: number;
  dash: boolean;
  text?: string;
  fontSize: number;
  textColor: string;
};

// x and y are the top left corner.
type Box = Style & {
  id: string;
  type: "rect" | "ellipse" | "diamond";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  radius: number;
};

// A line runs from (x1, y1) to (x2, y2). If `from` or `to` names a box, that
// end is attached to the box's outline instead.
type Line = Style & {
  id: string;
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  from?: string;
  to?: string;
  arrow: "none" | "end" | "both";
};

type Shape = Box | Line;
type Drawing = { height: number; shapes: Shape[] };
type Point = { x: number; y: number };

const WIDTH = 800;
const EMPTY: Drawing = { height: 400, shapes: [] };
const BOX_TYPES: Box["type"][] = ["rect", "ellipse", "diamond"];
const ARROWS: Line["arrow"][] = ["none", "end", "both"];
const FOREGROUND = "var(--foreground)";
const BACKGROUND = "var(--background)";
const SWATCHES = [
  "none",
  FOREGROUND,
  BACKGROUND,
  "#94a3b8",
  "#ef4444",
  "#f59e0b",
  "#fde68a",
  "#22c55e",
  "#bbf7d0",
  "#3b82f6",
  "#bfdbfe",
  "#a855f7",
];

const STYLE: Style = { stroke: FOREGROUND, strokeWidth: 1.5, dash: false, fontSize: 13, textColor: FOREGROUND };

function makeShape(props: Partial<Shape> & { type: Shape["type"] }, id: string): Shape {
  if (props.type === "line") {
    return { ...STYLE, x1: 300, y1: 230, x2: 500, y2: 230, arrow: "end", ...props, id } as Line;
  }
  return {
    ...STYLE,
    x: 340,
    y: 200,
    w: 120,
    h: 60,
    fill: BACKGROUND,
    radius: props.type === "rect" ? 6 : 0,
    ...props,
    id,
  } as Box;
}

function nextId(shapes: Shape[]) {
  let n = shapes.length + 1;
  while (shapes.some((shape) => shape.id === "s" + n)) n++;
  return "s" + n;
}

// ---------------------------------------------------------------------------
// Geometry

function centre(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

// Where a line from the centre of a box towards a point leaves its outline.
function outline(box: Box, toward: Point): Point {
  const c = centre(box);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;

  const hw = box.w / 2;
  const hh = box.h / 2;
  let t: number;
  if (box.type === "ellipse") t = 1 / Math.hypot(dx / hw, dy / hh);
  else if (box.type === "diamond") t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
  else t = Math.min(hw / Math.abs(dx), hh / Math.abs(dy));
  return { x: c.x + dx * t, y: c.y + dy * t };
}

function lineEnds(line: Line, shapes: Shape[]): [Point, Point] {
  const find = (id?: string) => shapes.find((s): s is Box => s.id === id && s.type !== "line");
  const from = find(line.from);
  const to = find(line.to);
  const a = from ? centre(from) : { x: line.x1, y: line.y1 };
  const b = to ? centre(to) : { x: line.x2, y: line.y2 };
  return [from ? outline(from, b) : a, to ? outline(to, a) : b];
}

// ---------------------------------------------------------------------------
// Drawing shapes

function ShapeText({ x, y, shape }: { x: number; y: number; shape: Shape }) {
  if (!shape.text) return null;
  const halo = shape.type === "line";
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={shape.textColor}
      fontSize={shape.fontSize}
      stroke={halo ? BACKGROUND : undefined}
      strokeWidth={halo ? 4 : undefined}
      style={halo ? { paintOrder: "stroke" } : undefined}
    >
      {shape.text}
    </text>
  );
}

function Arrowhead({ tip, tail, line }: { tip: Point; tail: Point; line: Line }) {
  const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
  const size = 6 + line.strokeWidth * 2;
  const corner = (turn: number) =>
    `${tip.x - size * Math.cos(angle + turn)},${tip.y - size * Math.sin(angle + turn)}`;
  return <polygon points={`${tip.x},${tip.y} ${corner(0.45)} ${corner(-0.45)}`} fill={line.stroke} />;
}

function BoxShape({ box }: { box: Box }) {
  const { x, y, w, h } = box;
  const paint = {
    fill: box.fill,
    stroke: box.stroke,
    strokeWidth: box.strokeWidth,
    strokeDasharray: box.dash ? "6 4" : undefined,
  };

  let body: React.ReactNode;
  if (box.type === "ellipse") body = <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...paint} />;
  else if (box.type === "diamond") {
    const points = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
    body = <polygon points={points} {...paint} />;
  } else body = <rect x={x} y={y} width={w} height={h} rx={box.radius} {...paint} />;

  return (
    <>
      {/* An invisible copy that catches clicks even when the box has no fill. */}
      <rect x={x} y={y} width={w} height={h} fill="transparent" data-overlay />
      {body}
      <ShapeText x={x + w / 2} y={y + h / 2} shape={box} />
    </>
  );
}

function LineShape({ line, shapes }: { line: Line; shapes: Shape[] }) {
  const [start, end] = lineEnds(line, shapes);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length === 0) return null;

  // Stop the stroke short of an arrow tip so its end does not poke out.
  const inset = (6 + line.strokeWidth * 2) * 0.8;
  const pull = (p: Point, toward: Point) => ({
    x: p.x + ((toward.x - p.x) / length) * inset,
    y: p.y + ((toward.y - p.y) / length) * inset,
  });
  const a = line.arrow === "both" ? pull(start, end) : start;
  const b = line.arrow !== "none" ? pull(end, start) : end;

  return (
    <>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth={12} data-overlay />
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={line.stroke}
        strokeWidth={line.strokeWidth}
        strokeDasharray={line.dash ? "6 4" : undefined}
      />
      {line.arrow !== "none" && <Arrowhead tip={end} tail={start} line={line} />}
      {line.arrow === "both" && <Arrowhead tip={start} tail={end} line={line} />}
      <ShapeText x={(start.x + end.x) / 2} y={(start.y + end.y) / 2} shape={line} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Inspector

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-5 text-muted-foreground">{label}</span>
      <Input
        type="number"
        className="h-7 px-1.5"
        value={value}
        onChange={(event) => {
          const n = Number(event.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </label>
  );
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <Button key={option} size="xs" variant={option === value ? "default" : "outline"} onClick={() => onChange(option)}>
          {option}
        </Button>
      ))}
    </div>
  );
}

function ColourPicker({ value, onChange }: { value: string; onChange: (colour: string) => void }) {
  const noneBackground =
    "linear-gradient(to top right, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {SWATCHES.map((colour) => (
        <button
          key={colour}
          title={colour}
          className={
            "size-5 rounded border border-border " +
            (colour === value ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-background" : "")
          }
          style={{ background: colour === "none" ? noneBackground : colour }}
          onClick={() => onChange(colour)}
        />
      ))}
      <input
        type="color"
        title="Any colour"
        className="size-5 cursor-pointer"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Inspector({
  shape,
  update,
  reorder,
}: {
  shape: Shape;
  update: (change: Partial<Shape>) => void;
  reorder: (where: "front" | "back") => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-muted-foreground">
        {shape.id} · {shape.type}
      </span>

      {shape.type !== "line" && (
        <Choice options={BOX_TYPES} value={shape.type} onChange={(type) => update({ type })} />
      )}

      <Row label="Text">
        <Input className="h-7" value={shape.text ?? ""} onChange={(event) => update({ text: event.target.value })} />
      </Row>

      {shape.type === "line" ? (
        shape.from || shape.to ? (
          <Row label="Attached">
            <span className="font-mono">
              {shape.from ?? "point"} → {shape.to ?? "point"}
            </span>
          </Row>
        ) : (
          <Row label="Ends">
            <div className="grid grid-cols-2 gap-1">
              <NumberField label="x1" value={shape.x1} onChange={(x1) => update({ x1 })} />
              <NumberField label="y1" value={shape.y1} onChange={(y1) => update({ y1 })} />
              <NumberField label="x2" value={shape.x2} onChange={(x2) => update({ x2 })} />
              <NumberField label="y2" value={shape.y2} onChange={(y2) => update({ y2 })} />
            </div>
          </Row>
        )
      ) : (
        <Row label="Position and size">
          <div className="grid grid-cols-2 gap-1">
            <NumberField label="x" value={shape.x} onChange={(x) => update({ x })} />
            <NumberField label="y" value={shape.y} onChange={(y) => update({ y })} />
            <NumberField label="w" value={shape.w} onChange={(w) => update({ w })} />
            <NumberField label="h" value={shape.h} onChange={(h) => update({ h })} />
          </div>
        </Row>
      )}

      {shape.type !== "line" && (
        <Row label="Fill">
          <ColourPicker value={shape.fill} onChange={(fill) => update({ fill })} />
        </Row>
      )}

      <Row label="Stroke">
        <ColourPicker value={shape.stroke} onChange={(stroke) => update({ stroke })} />
        <div className="flex items-center gap-2">
          <div className="w-20">
            <NumberField label="w" value={shape.strokeWidth} onChange={(strokeWidth) => update({ strokeWidth })} />
          </div>
          <Choice
            options={["solid", "dashed"] as const}
            value={shape.dash ? "dashed" : "solid"}
            onChange={(style) => update({ dash: style === "dashed" })}
          />
        </div>
      </Row>

      {shape.type === "line" && (
        <Row label="Arrow">
          <Choice options={ARROWS} value={shape.arrow} onChange={(arrow) => update({ arrow })} />
        </Row>
      )}

      {shape.type === "rect" && (
        <Row label="Corner radius">
          <div className="w-20">
            <NumberField label="r" value={shape.radius} onChange={(radius) => update({ radius })} />
          </div>
        </Row>
      )}

      <Row label="Text colour and size">
        <ColourPicker value={shape.textColor} onChange={(textColor) => update({ textColor })} />
        <div className="w-20">
          <NumberField label="pt" value={shape.fontSize} onChange={(fontSize) => update({ fontSize })} />
        </div>
      </Row>

      <Row label="Order">
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => reorder("front")}>
            To front
          </Button>
          <Button size="xs" variant="outline" onClick={() => reorder("back")}>
            To back
          </Button>
        </div>
      </Row>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The editor

type Drag = { id: string; mode: "move" | "resize" | "start" | "end"; origin: Point; shape: Shape };

function Handle({ at, onPointerDown }: { at: Point; onPointerDown: (event: React.PointerEvent) => void }) {
  return (
    <rect
      x={at.x - 4}
      y={at.y - 4}
      width={8}
      height={8}
      className="cursor-crosshair fill-white stroke-blue-500"
      onPointerDown={onPointerDown}
    />
  );
}

export function Diagram({ id: component }: { id: string }) {
  const [drawing, setDrawing, selectable] = useComponentState<Drawing>(component, EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const stretch = useRef<{ startY: number; startHeight: number } | null>(null);

  // State written by hand may leave fields out, so defaults are filled in here.
  const shapes = drawing.shapes.map((s) => makeShape(s, s.id));
  const height = drawing.height ?? EMPTY.height;
  const shape = shapes.find((s) => s.id === selected);

  const toPoint = (event: React.PointerEvent): Point => {
    const point = new DOMPoint(event.clientX, event.clientY);
    return point.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };

  const checkLinks = (s: Shape) => {
    if (s.type !== "line") return;
    for (const id of [s.from, s.to]) {
      if (id && !shapes.some((other) => other.id === id && other.type !== "line")) {
        throw new Error(`${id} is not a box`);
      }
    }
  };

  // Actions an agent can run with `rx action`. The buttons below use the same ones.

  useAction(component, "svg", () => {
    // A copy that stands on its own: no selection handles, no click targets,
    // and theme tokens replaced with the colours they have right now.
    const copy = svg.current!.cloneNode(true) as SVGSVGElement;
    copy.querySelectorAll("[data-overlay]").forEach((node) => node.remove());
    const theme = getComputedStyle(document.documentElement);
    return copy.outerHTML.replace(/var\((--[\w-]+)\)/g, (_, name) => theme.getPropertyValue(name).trim());
  });

  const add = useAction(component, "add", (props: Partial<Shape> & { type: Shape["type"] }) => {
    if (![...BOX_TYPES, "line"].includes(props?.type)) throw new Error("type must be rect, ellipse, diamond or line");
    const created = makeShape(props, nextId(shapes));
    checkLinks(created);
    setDrawing({ ...drawing, shapes: [...shapes, created] });
    return created.id;
  });

  const update = useAction(component, "update", (id: string, change: Partial<Shape>) => {
    const current = shapes.find((s) => s.id === id);
    if (!current) throw new Error(`no shape ${id}`);
    const changed = { ...current, ...change, id } as Shape;
    checkLinks(changed);
    setDrawing({ ...drawing, shapes: shapes.map((s) => (s.id === id ? changed : s)) });
    return changed;
  });

  const remove = useAction(component, "remove", (id: string) => {
    if (!shapes.some((s) => s.id === id)) throw new Error(`no shape ${id}`);
    // Lines attached to the removed shape go with it.
    setDrawing({
      ...drawing,
      shapes: shapes.filter((s) => s.id !== id && !(s.type === "line" && (s.from === id || s.to === id))),
    });
    setSelected(null);
    return id;
  });

  const reorder = useAction(component, "reorder", (id: string, where: "front" | "back") => {
    const current = shapes.find((s) => s.id === id);
    if (!current) throw new Error(`no shape ${id}`);
    const rest = shapes.filter((s) => s.id !== id);
    setDrawing({ ...drawing, shapes: where === "front" ? [...rest, current] : [current, ...rest] });
    return id;
  });

  // Selects a shape so the user sees it highlighted with its settings open.
  // null clears the selection.
  const select = useAction(component, "select", (shapeId: string | null) => {
    if (shapeId !== null && !shapes.some((s) => s.id === shapeId)) throw new Error(`no shape ${shapeId}`);
    setSelected(shapeId);
    setConnecting(false);
    return shapeId;
  });

  const setHeight = useAction(component, "setHeight", (value: number) => {
    if (typeof value !== "number" || !(value > 0)) throw new Error("height must be a number above 0");
    setDrawing({ ...drawing, height: Math.round(value) });
    return Math.round(value);
  });

  const startDrag = (event: React.PointerEvent, s: Shape, mode: Drag["mode"]) => {
    event.stopPropagation();
    drag.current = { id: s.id, mode, origin: toPoint(event), shape: s };
    svg.current!.setPointerCapture(event.pointerId);
  };

  const pressShape = (event: React.PointerEvent, s: Shape) => {
    if (connecting && shape && shape.type !== "line" && s.type !== "line" && shape.id !== s.id) {
      event.stopPropagation();
      setSelected(add({ type: "line", from: shape.id, to: s.id }));
      setConnecting(false);
      return;
    }
    select(s.id);
    // Attached lines follow their boxes, so they are not dragged on their own.
    if (s.type === "line" && (s.from || s.to)) return event.stopPropagation();
    startDrag(event, s, "move");
  };

  const moveDrag = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toPoint(event);
    const dx = Math.round(p.x - d.origin.x);
    const dy = Math.round(p.y - d.origin.y);
    const s = d.shape;
    const at = { x: Math.round(p.x), y: Math.round(p.y) };

    let change: Partial<Shape>;
    if (s.type === "line") {
      if (d.mode === "start") change = { x1: at.x, y1: at.y, from: undefined };
      else if (d.mode === "end") change = { x2: at.x, y2: at.y, to: undefined };
      else change = { x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
    } else if (d.mode === "resize") {
      change = { w: Math.max(10, s.w + dx), h: Math.max(10, s.h + dy) };
    } else {
      change = { x: s.x + dx, y: s.y + dy };
    }
    update(d.id, change);
  };

  let handles: React.ReactNode = null;
  if (shape?.type === "line") {
    const [start, end] = lineEnds(shape, shapes);
    handles = (
      <>
        <Handle at={start} onPointerDown={(e) => startDrag(e, shape, "start")} />
        <Handle at={end} onPointerDown={(e) => startDrag(e, shape, "end")} />
      </>
    );
  } else if (shape) {
    handles = (
      <>
        <rect
          x={shape.x - 3}
          y={shape.y - 3}
          width={shape.w + 6}
          height={shape.h + 6}
          fill="none"
          className="pointer-events-none stroke-blue-500"
          strokeDasharray="4 3"
        />
        <Handle
          at={{ x: shape.x + shape.w, y: shape.y + shape.h }}
          onPointerDown={(e) => startDrag(e, shape, "resize")}
        />
      </>
    );
  }

  return (
    <div className="my-4 rounded-lg border border-border" {...selectable}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Button size="sm" variant="outline" onClick={() => setSelected(add({ type: "rect" }))}>
          Rectangle
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(add({ type: "ellipse" }))}>
          Ellipse
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(add({ type: "diamond" }))}>
          Diamond
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(add({ type: "line" }))}>
          Line
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setSelected(add({ type: "rect", w: 80, h: 30, fill: "none", stroke: "none", text: "Text" }))
          }
        >
          Text
        </Button>
        <Button
          size="sm"
          variant={connecting ? "default" : "outline"}
          disabled={!shape || shape.type === "line"}
          onClick={() => setConnecting(!connecting)}
        >
          {connecting ? "Click a shape to connect to" : "Connect"}
        </Button>
        <Button size="sm" variant="outline" disabled={!shape} onClick={() => shape && remove(shape.id)}>
          Delete
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => setShowJson(!showJson)}>
          {showJson ? "Hide JSON" : "Show JSON"}
        </Button>
      </div>

      <div className="flex">
        <div className="relative min-w-0 flex-1 bg-muted/30">
          {shapes.length === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Add a shape from the toolbar
            </span>
          )}
          <svg
            ref={svg}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${WIDTH} ${Math.max(50, height)}`}
            fontFamily="IBM Plex Sans, sans-serif"
            className="block w-full select-none"
            onPointerDown={() => select(null)}
            onPointerMove={moveDrag}
            onPointerUp={() => (drag.current = null)}
          >
            {shapes.map((s) => (
              <g
                key={s.id}
                data-shape={s.id}
                className={s.type === "line" ? "cursor-pointer" : "cursor-move"}
                onPointerDown={(e) => pressShape(e, s)}
              >
                {s.type === "line" ? <LineShape line={s} shapes={shapes} /> : <BoxShape box={s} />}
              </g>
            ))}
            <g data-overlay>{handles}</g>
          </svg>

          {/* Dragging the bottom edge changes the drawing's height. */}
          <div
            title="Drag to change the height"
            className="group flex h-2.5 cursor-row-resize items-center justify-center border-t border-border"
            onPointerDown={(event) => {
              stretch.current = { startY: event.clientY, startHeight: height };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!stretch.current) return;
              const unitsPerPixel = WIDTH / svg.current!.clientWidth;
              const moved = (event.clientY - stretch.current.startY) * unitsPerPixel;
              setHeight(Math.max(100, stretch.current.startHeight + moved));
            }}
            onPointerUp={() => (stretch.current = null)}
          >
            <span className="h-1 w-10 rounded-full bg-border group-hover:bg-muted-foreground" />
          </div>
        </div>

        {/* The panel scrolls within the drawing's height rather than stretching it. */}
        <div className="relative w-64 shrink-0 border-l border-border">
          <div className="absolute inset-0 overflow-y-auto p-3 text-xs">
            {shape ? (
              <Inspector
                shape={shape}
                update={(change) => update(shape.id, change)}
                reorder={(where) => reorder(shape.id, where)}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <span className="text-muted-foreground">
                  Click a shape to edit it. Drag to move, and use the corner handle to resize.
                </span>
                <Row label="Drawing height">
                  <div className="w-24">
                    <NumberField
                      label="h"
                      value={height}
                      onChange={(value) => value > 0 && setHeight(value)}
                    />
                  </div>
                </Row>
              </div>
            )}
          </div>
        </div>
      </div>

      {showJson && (
        <pre className="!my-0 max-h-80 overflow-auto rounded-none border-t border-border text-xs">
          {JSON.stringify(drawing, null, 2)}
        </pre>
      )}
    </div>
  );
}

