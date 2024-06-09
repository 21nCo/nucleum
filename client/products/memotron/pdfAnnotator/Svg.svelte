<script lang="ts">
  export let rectangles: any[];

  let minX = Math.min(...rectangles.map((r) => r.x1));
  let minY = Math.min(...rectangles.map((r) => r.y1));
  let maxX = Math.max(...rectangles.map((r) => r.x2));
  let maxY = Math.max(...rectangles.map((r) => r.y2));

  let points = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
  console.log("points", points);
</script>

<svg viewBox="0 0 {rectangles[0].width} {rectangles[0].height}">
  <polygon
    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
    stroke="black"
    fill="yellow"
  />
</svg>
