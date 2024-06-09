<script lang="ts">
  import { onMount } from "svelte";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;

  let spacing = 5;
  let cellSize = (canvasWidth - spacing * 3) / 3;

  let offsetX = 0;
  let offsetY = 0;
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;
  let prevWidth = window.innerWidth;
  let prevHeight = window.innerHeight;
  let inputElements: any = [];
  let i = 0;
  function startPanning(event: MouseEvent) {
    isPanning = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function pan(event: MouseEvent) {
    if (!isPanning) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (dx === 0 || dy === 0) {
      console.log("dx,dy", dx, dy);
      return;
    }
    offsetX += dx;
    offsetY += dy;
    lastX = event.clientX;
    lastY = event.clientY;
    drawGrid();
  }

  function stopPanning() {
    isPanning = false;
  }
  onMount(() => {
    canvas = document?.getElementById("gridCanvas") as HTMLCanvasElement;
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    drawGrid();
    canvas.addEventListener("mousedown", startPanning);
    canvas.addEventListener("mousemove", pan);
    canvas.addEventListener("mouseup", stopPanning);
    canvas.addEventListener("mouseleave", stopPanning);
    renderHtmlToCanvas(butMakeItLargerForStackOverflowDemoPurposes);
  });

  // Calculate canvas size

  // Function to draw the grid
  function drawGrid() {
    inputElements = [];
    console.log("drawing grid", ++i, canvasWidth, canvasHeight);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // ctx.clearRect(
    //   0,
    //   0,
    //   (prevWidth > canvasWidth ? prevWidth : canvasWidth) + 1,
    //   (prevWidth > canvasWidth ? prevWidth : canvasWidth) + 1
    // );

    ctx.save();
    //TODO- trasnlate the canvas only when edge have not yet reached if canvas is already at edge  in the pan direction then dont translate just show an border indicating end of canvas
    ctx.translate(offsetX, offsetY);

    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= canvasWidth; x += cellSize + spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasWidth);
      ctx.stroke();
      inputElements.push({ x, y: x, canvasWidth, canvasHeight: canvasWidth });
      // ctx.closePath()
    }
    inputElements = inputElements;
    console.log("inputElements", inputElements);
    // Draw horizontal lines
    for (let y = 0; y <= canvasWidth; y += cellSize + spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
      // ctx.closePath()
    }
    renderHtmlToCanvas(butMakeItLargerForStackOverflowDemoPurposes);
    ctx.restore();
  }

  // Initial draw
  function handleMouseDown(event: MouseEvent) {
    console.log("mouse down", event.clientX, event.clientY);
  }
  window.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      console.log("wheeling", event.deltaY);
      let zoomDirection = Math.sign(event.deltaY);
      //TODO-Zooming should happen in the pointed area
      prevHeight = canvasHeight;
      prevWidth = canvasWidth;
      if (zoomDirection < 0) {
        canvasWidth = canvasWidth + canvasWidth / 4;
        canvasHeight = canvasHeight + canvasHeight / 4;
        // canvasWidth = canvas.width;
        // canvasHeight = canvas.height;
        let temp = canvasWidth;
        // let tempGrossCellSize=canvasWidth/3;
        let tempCellSize = (canvasWidth - spacing * 3) / 3;
        cellSize = tempCellSize;

        // drawGrid();
      } else {
        // Zoom out
        // if (
        //   canvas.width > window.innerWidth ||
        //   canvas.height > window.innerHeight
        // ) {
        canvasWidth = canvasWidth - canvasWidth / 4;
        canvasHeight = canvasHeight - canvasHeight / 4;
        // canvasWidth = canvas.width;
        // canvasHeight = canvas.height;
        let tempCellSize = (canvasWidth - spacing * 3) / 3;
        cellSize = tempCellSize;
        // cellSize -= 200 / 4;
        // spacing -= 5 / 4;
        // }
      }

      // Redraw grid with new size
      drawGrid();
    },
    { passive: false }
  );
  function test() {
    console.log("test");
  }
  const renderThisHtml = `<em>I</em> like <span style="color:white; text-shadow:0 0 2px blue;">cheese</span> 🧀`;

  const butMakeItLargerForStackOverflowDemoPurposes = `<span style="font-size: 30px">${renderThisHtml}</span>`;

  function renderHtmlToCanvas(html: string) {
    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" >
      <div style="display:flex;">
      <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      <button xmlns="http://www.w3.org/1999/xhtml">+</button>
      </div>
      <button xmlns="http://www.w3.org/1999/xhtml">+</button>
      </div>
  </foreignObject>
  </svg>`;

    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgObjectUrl = URL.createObjectURL(svgBlob);

    const tempImg = new Image();
    tempImg.addEventListener("load", function () {
      ctx.drawImage(tempImg, 10, 100);
      URL.revokeObjectURL(svgObjectUrl);
    });

    tempImg.src = svgObjectUrl;
  }
</script>

<canvas
  id="gridCanvas"
  on:mousedown={handleMouseDown}
  style="position:relative;"
>
</canvas>

<!-- {#each inputElements as inputElement (inputElement.x + "," + inputElement.y)}
    <input
      type="text"
      style="position: absolute; left: {inputElement.x +
        offsetX}px; top: {inputElement.y +
        offsetY}px; width: {cellSize}px; height: {cellSize}px;"
    />
  {/each} -->

<style>
  canvas {
    border: 1px solid #000;
    display: block;
    margin: 20px auto;
  }
</style>
