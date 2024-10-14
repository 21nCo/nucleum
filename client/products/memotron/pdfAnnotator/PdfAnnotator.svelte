<script lang="ts">
  import PdfViewer from "./PdfViewer.svelte";

  import {
    AnnotationType,
    type Coords,
    type LTWH,
    type LTWHP,
    type ScaledPosition
  } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.type";
  import {
    asElement,
    embedAnnotationsandDownload,
    getBoundingRect,
    getBoundingRectSE,
    getClientRects,
    getPagesFromRange,
    isHTMLElement,
    PdfHandler,
    viewportToScaled
  } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.utils";
  import { debouncer } from "$lib/client/utils/utils";
  import { onMount } from "svelte";
  import TextHiglighter from "./TextHiglighter.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import InlineToolBar from "./toolbar/InlineToolBar.svelte";
  import Comment from "./comment/Comment.svelte";
  import InlineEditToolBar from "./toolbar/InlineEditToolBar.svelte";
  import CommentEditor from "./comment/CommentEditor.svelte";
  import ToolBar from "./toolbar/ToolBar.svelte";
  import { FindState } from "pdfjs-dist/web/pdf_viewer.mjs";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import type { IHighlighter } from "../common/highlighters/highlight.type";
  import { highlightStore } from "../common/highlighters/highlight.store";

  export let url: string;
  export let node: any;
  export let annots: any[];
  const pdfPersistence = new PdfHandler(node.id);
  /**
   * varibales for drawing shapes adding shapes or click annotations
   */
  let containerBoundingRect: DOMRect | null = null;
  let container: HTMLElement;
  let start: Coords | null, locked: boolean, end: Coords | null;
  let startPageNumber: number | undefined;
  let currentPageNumber: number | undefined;
  let viewerContainerElement: HTMLElement;
  let i = 0;
  const mouseUpHandler = (event: any) =>
    handleMouseUp(event, viewerContainerElement);
  let shapeVisible = false;

  /**
   * render variables
   */
  let scale: number = 1;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.3;
  let scrollTop = 0;
  let pageNumber = 1;
  let totalPages = 1;
  let annotationMode: AnnotationType = AnnotationType.NONE;
  enum SpreadModes { //init display modes.
    "NONE",
    "ODD",
    "EVEN"
  }
  let display_mode = "";
  let _spread_mode = SpreadModes.NONE;
  if (display_mode in SpreadModes) {
    _spread_mode = SpreadModes[display_mode as "NONE" | "ODD" | "EVEN"];
  }

  /**
   * search variables
   */
  let searchText = "";
  let searchCaseSensitive = false;
  let searchHighlightAll = true;
  let searchParams: any;
  $: searchParams = {
    query: searchText,
    caseSensitive: searchCaseSensitive,
    entireWord: false,
    highlightAll: searchHighlightAll,
    findPrevious: false
  };

  /**
   * annotations variables
   */
  let inlineToolBarVisible = false;
  let isInlineEditBarVisible = false;
  let commentEditorVisible = false;
  let popupStyle = "";
  let removeAllRanges: any;
  let pdfViewer: any;
  let annotation: any = {};
  let annotClickedId = "";
  let annotClickedColor = "";
  let annotCickedType = "";
  let selectedColor = $highlightStore.highlighters[0].id;
  let annotClickedComment = "";
  let clickBoundingRect: LTWH | null;
  $: if (pdfViewer) {
    pdfViewer.eventBus.on("textlayerrendered", renderHighlightLayers);
  }
  let pdfDocument: any;

  let mainRects: any = [];

  /**
   * To convert top left height widht to coordinates and height & width of the page.
   * No actual scalling happens here.
   */
  function viewportPositionToScaled({
    pageNumber,
    boundingRect,
    rects
  }: any): ScaledPosition {
    let viewport = pdfViewer?.getPageView(pageNumber - 1)?.viewport;
    //disable afterbug fix
    let DPR = window.devicePixelRatio;
    console.log(
      "viewportPositionToScaled",
      viewport,
      "DPR ",
      DPR,
      "Window viewport ",
      window.visualViewport
    );
    // viewport *= DPR;
    // console.log("viewportPositionToScaled after dpr *", viewport);

    return {
      boundingRect: viewportToScaled(boundingRect, viewport),
      rects: (rects || []).map((rect: any) =>
        rect.map((rec: any) => viewportToScaled(rec, viewport))
      ),
      pageNumber
    };
  }

  /**
   * to disabe the inline toolbar, editor and comment editor when the user clicks outside or presses escape key
   */
  function falseAll() {
    inlineToolBarVisible = false;
    isInlineEditBarVisible = false;
    commentEditorVisible = false;
  }

  /**
   * To get the rect of the user selected text and display the corresponding popup next to selection and finally have the required values to add the annotation to the store.
   */
  function selectionChangeHandler() {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range: Range | null =
      selection?.rangeCount || 0 > 0 ? selection?.getRangeAt(0) : null;
    if (selection.isCollapsed) {
      return;
    }
    if (!range) return;
    // console.log("selectionChangeHandler");
    const pages = getPagesFromRange(range);
    // console.log("pages", pages);
    if (!pages || pages.length === 0) {
      return;
    }
    const rects = getClientRects(range, pages, scale);
    if (rects.length === 0) {
      return;
    }
    const selectedText = selection.toString();
    // console.log("Selected text range:", range);
    const rect = range.getBoundingClientRect();
    const top = rect.bottom; //+ scrollTop - 200;
    // const left = rect.right - 80;
    const left = rect.left;

    const boundingRect = getBoundingRect(rects[pages[0].number - 1]); //TODO-add boundingRect to each page for now adding for start page alone
    const viewportPosition: any = {
      boundingRect,
      rects,
      pageNumber: pages[0].number
    };
    annotation = viewportPositionToScaled(viewportPosition);
    annotation.selectedText = selectedText;
    removeAllRanges = () => {
      selection.removeAllRanges();
    };
    falseAll();
    annotClickedComment = "";
    popupStyle = `position: fixed; top: ${top}px; left: ${left}px;z-index: 2000;`;
    if (annotationMode !== AnnotationType.NONE) {
      if (
        annotationMode === AnnotationType.COMMENT ||
        annotationMode === AnnotationType.TASK
      ) {
        commentEditorVisible = true;
      } else {
        annotate({ detail: annotationMode });
      }
    } else inlineToolBarVisible = true;
  }

  const debouncedSelectionHandler = debouncer(selectionChangeHandler, 500);

  /**
   * To add the annotation to the store and eventually persisting.
   * @param event
   * @param editorValues
   */
  async function annotate(event: any, editorValues: any = {}) {
    // console.log("annotating as", event.detail, comment);
    annotation.annotType = event.detail;
    if (
      event.detail === AnnotationType.COMMENT ||
      event.detail === AnnotationType.TASK
    ) {
      annotation.comment = editorValues.comment;
      if (event.detail.DueDate) annotation.DueDate = editorValues.DueDate;
    }
    annotation.color = selectedColor;
    annotation.date = new Date().toLocaleDateString("en-CA");
    await pdfPersistence.saveClip(annotation);
    renderHighlightLayers();
    if (removeAllRanges) removeAllRanges();
    annotation = {};
  }

  /**
   * To handle the click event on the annotation, the function is invoked when the user clicks on the annotation.
   * gets the annotation id and the color of the annotation and the type of the annotation.
   * gets the comment if the annotation is of type comment or task.
   * calculates the top and left position of the popup based on the annotation position.
   * sets the inline editor visible to true.
   * Using class instead of id since we need to get the annoation irrespective of which line of the annotation was clicked.
   * @param id
   */
  function handleAnnotClick(id: string) {
    // let element = document.getElementById(id);
    let elements = document.getElementsByClassName(id);
    let element = elements[0];
    annotClickedId = id;
    annotClickedColor = element?.dataset?.highlighter || "";
    annotCickedType = element?.dataset?.annottype || "";
    if (
      annotCickedType == AnnotationType.COMMENT ||
      annotCickedType == AnnotationType.TASK
    )
      annotClickedComment = element?.dataset?.comment || "";
    let rect = element?.getBoundingClientRect();
    let top = rect?.top || 0;
    let left = rect?.left;
    // top += Number(scrollTop);
    commentEditorVisible = false;
    inlineToolBarVisible = false;
    isInlineEditBarVisible = false;
    popupStyle = `position: fixed; top: ${top}px; left: ${left}px;z-index: 1000;`;
    isInlineEditBarVisible = true;
  }

  /**
   * To render all the annotations for a given page over the pdf viewer.
   * Removing existing highlight layer and creating a new one if exsits instead of changing innerhtml is, to fix functionality issues such as click events not working on annoatations.
   * @param pageNumber
   */
  async function findOrCreateHighlightLayer(page: number) {
    const { textLayer } = pdfViewer.getPageView(page - 1) || {};
    if (!textLayer) {
      return "LayerCannotBeCreated";
    }
    annots = await pdfPersistence.fetchAllClips(url);

    mainRects = annots?.filter(
      (highlight) =>
        (highlight.rects && highlight.rects[page - 1] != undefined) ||
        (highlight.rect && highlight.pageNumber == page)
    );
    if (!mainRects) return;
    let highlightsContainer = textLayer.div.querySelector(
      ".Pdf-Highlighter-Container"
    );

    if (highlightsContainer) textLayer.div.removeChild(highlightsContainer);
    highlightsContainer = document.createElement("div");
    highlightsContainer.classList.add("Pdf-Highlighter-Container");
    highlightsContainer.style =
      "-webkit-user-select: none;-moz-user-select: none;-ms-user-select: none;user-select: none;";
    textLayer.div.appendChild(highlightsContainer);

    mainRects?.forEach((highlight: any) => {
      let modifiedRects;
      let modifiedRect;
      if (highlight.rects)
        modifiedRects = highlight?.rects[page - 1]?.map((rect: any) => {
          let modifiedRect: any = scaleValues(rect);
          return modifiedRect;
        });
      else if (highlight.rect) {
        modifiedRect = scaleValues(highlight.rect);
      }
      if (
        highlight.annotType == AnnotationType.COMMENT ||
        highlight.annotType == AnnotationType.TASK
      ) {
        new Comment({
          target: highlightsContainer,
          props: {
            rects: modifiedRects,
            rect: modifiedRect,
            annotType: highlight.annotType,
            id: highlight.id,
            highlighter: highlight.color,
            comment: highlight.comment,
            pageRectTop: highlight?.rect?.pageRectTop,
            showIcon:
              (highlight.rects && highlight.rects[page - 2] == undefined) ||
              highlight.rect
          }
        }).$on("click", (event) => handleAnnotClick(event.detail));
      } else if (highlight.annotType == "SHAPE") {
        //TODO: Implement Shape rednder from storage
      } else {
        new TextHiglighter({
          target: highlightsContainer,
          props: {
            rects: modifiedRects,
            annotType: highlight.annotType,
            id: highlight.id,
            highlighter: highlight.color
          }
        }).$on("click", (event) => handleAnnotClick(event.detail));
      }
    });
    mainRects = [];
    return "LayerCreated";
  }

  /**
   * To scroll to the annotation, the function is invoked when the user clicks on the annotation in the traces panel.
   * The function scrolls to the page,then to the annotation and the annotation is highlighted for 2 seconds.
   * @param id
   * @param pageNumber
   */
  export function scrollToAnnot(id: string, pageNumber: Number) {
    pdfViewer.scrollPageIntoView({
      pageNumber: pageNumber
    });
    handleScroll("");
    setTimeout(() => {
      const annotItems = document.querySelectorAll("." + id);
      const top =
        (annotItems[0]?.offsetTop || 0) +
        (viewerContainerElement?.scrollTop || 0) -
        100;
      viewerContainerElement?.scrollTo({
        top: top,
        left: 0,
        behavior: "smooth"
      });
      annotItems.forEach((item) => {
        let style = window.getComputedStyle(item);
        let bgColor = style.backgroundColor;
        let opacity = style.opacity;
        item.style.backgroundColor = "hotpink";
        item.style.opacity = "0.6";
        setTimeout(() => {
          item.style.backgroundColor = bgColor;
          item.style.opacity = opacity;
        }, 2000);
      });
    }, 500);
  }

  /**
   * To render the highlight layers, the function is invoked whenever a new annotation is added or deleted or when the pdf is loaded or new pdf page is rendered in the background.
   */
  function renderHighlightLayers() {
    // pdfDocument.getPage(1).then((page) => {
    //   page.getAnnotations().then((annotations) => {
    //     console.log("checking pdfjs ", annotations);
    //   });
    // });
    scale = pdfViewer.currentScale;
    totalPages = pdfViewer.pagesCount;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      // if (!pageNumbers.includes(pageNumber)) {
      //   pageNumbers.push(pageNumber);
      //   console.log(pageNumber, "LayerYetToBeCreated");
      // } else {
      //   console.log(pageNumber, "LayerAlreadyExists Checking if Missed");
      // }
      findOrCreateHighlightLayer(pageNumber);
      // scrollToAnnot("annotlu2h0zhv4zuu6", 13);
      // flag = true;
    }
  }

  /**
   * To scale the values of the annotation based on the current scale of the pdf viewer since the scale when annotation was created might be different from the current scale.
   */
  function scaleValues({ x1, y1, x2, y2, height, width }: any) {
    x1 *= scale;
    y1 *= scale;
    x2 *= scale;
    y2 *= scale;
    height *= scale;
    width *= scale;
    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      height: height,
      width: width
    };
  }
  /**
   * To handle the deletion of the annotation, the function is invoked when the user deletes a specific annotation.
   */
  async function handleAnnotDelete(e?: any, id?: string) {
    let deleteAnnot;
    if (id) deleteAnnot = id;
    else deleteAnnot = annotClickedId;
    await pdfPersistence.deleteClip(deleteAnnot);
    annotClickedComment = "";
    renderHighlightLayers();
    isInlineEditBarVisible = false;
  }

  /**
   * To handle the color change of the annotation, the function is invoked when the user changes the color of the annotation.
   * @param highlighter
   */
  async function handleColorChange(highlighter: IHighlighter) {
    await pdfPersistence.updateClip(annotClickedId, { color: highlighter.id });
    selectedColor = highlighter.id;
    renderHighlightLayers();
    isInlineEditBarVisible = false;
  }

  /**
   * To handle the update of the comment, the function is invoked when the user updates the comment in the comment editor.
   * @param comment
   */
  async function handleUpdateComment(comment: string) {
    await pdfPersistence.updateClip(annotClickedId, { comment: comment });
    annotClickedComment = "";
    renderHighlightLayers();
  }

  /**
   * To handle the inline toolbar, the function is invoked when the user selects a text, the inline toolbar is shown, comment editor is shown.
   * TO quickly close or escape out of the current action.
   * @param event
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      falseAll();
      annotClickedComment = "";
      annotation = {};
      if (removeAllRanges) removeAllRanges();
    }
  }

  /**
   * To handle the search functionality, the searchParams object is used to pass the search query and other search related parameters to the findcontroller of pdfjs library.
   * The commented code might help later to modify scroll into view behaviour.
   */
  function onSearch() {
    searchParams.findPrevious = false;
    // searchParams.query = searchText;
    pdfViewer.eventBus.dispatch("find", {
      source: "searchFunctionality",
      type: "find",
      ...searchParams
    });

    // pdfViewer.eventBus.on("updatefindmatchescount", function (data) {
    //   console.log("Matches found:", data.matchesCount);
    // });
    // // pdfViewer.eventBus.on("updatefindcontrolstate", function (data) {
    // //   console.log("Search state updated:", data.state);
    // // });

    pdfViewer.eventBus.on("updatefindcontrolstate", function (data) {
      if (data.state === FindState.FOUND || data.state === FindState.WRAPPED) {
        // console.log(
        //   "element selected",
        //   document.getElementsByClassName("highlight selected")[0]
        // );
        // pdfViewer.findController.scrollMatchIntoView({
        //   // element: document.getElementById(`match-${data.currentMatchIndex}`),
        //   element: document.getElementsByClassName("highlight selected")[0],
        //   pageIndex: data.currentPageIndex
        // });
        const element =
          document.getElementsByClassName("highlight selected")[0];
        let top = element?.scrollTop;
        // console.log("scrolltop element ", top, element?.clientTop);
        if (element) {
          viewerContainerElement.scrollTo({
            top: top,
            left: 0,
            behavior: "smooth"
          });
          // console.log("element present", element);

          // element?.scrollIntoView({
          //   behavior: "smooth",
          //   block: "start",
          //   inline: "nearest"
          // });
        }
      }
    });

    // pdfViewer.eventBus.on("updatetextlayermatches", function (data) {
    //   // Assuming there is a function that handles the rendering updates
    //   // updateTextLayerHighlights(data.pageIndex);
    //   // console.log("updatetextlayermatches", data);
    // });
    // pdfViewer.eventBus.on("searchResultSelected", (event) => {
    //   console.log("searchResultSelected");
    //   pdfViewer.findController.scrollMatchIntoView({
    //     element: document.getElementById(`match-${event.matchIndex}`), // Ensure your matches have identifiable elements
    //     selectedLeft: 0, // Customize as necessary
    //     pageIndex: event.pageIndex,
    //     matchIndex: event.matchIndex
    //   });
    // });

    // pdfViewer.eventBus.on("selectedMatchChanged", (event) => {
    //   console.log("selectedMatchChanged");
    //   // const element = document.querySelector(
    //   //   `#match-${event.pageIndex}-${event.matchIndex}`
    //   // );
    //   const element = document.getElementsByClassName("highlight selected")[0];
    //   if (element) {
    //     // pdfViewer.findController.scrollMatchIntoView({
    //     //   element: element,
    //     //   selectedLeft: element.offsetLeft,
    //     //   pageIndex: event.pageIndex,
    //     //   matchIndex: event.matchIndex
    //     // });
    //     element?.scrollIntoView({
    //       behavior: "smooth",
    //       block: "end",
    //       inline: "nearest"
    //     });
    //   }
    // });
  }

  /**
   * To find the next occurence of the search text
   */
  function findNext() {
    searchParams.findPrevious = false;
    pdfViewer.eventBus.dispatch("find", {
      source: "searchFunctionality",
      type: "again",
      ...searchParams
    });
  }
  /**
   * To find the previous occurence of the search text
   */
  function findPrevious() {
    searchParams.findPrevious = true;
    pdfViewer.eventBus.dispatch("find", {
      source: "searchFunctionality",
      type: "again",
      ...searchParams
    });
  }

  /**
   * To handle events provided by pdfjs library itself, for now used for zooming later rotation can also be added here.
   * @param option
   */
  function handleRenderOptions(option: string) {
    if (option === "ZOOMIN") {
      if (scale <= MAX_SCALE) {
        scale = scale + 0.1;
        pdfViewer.currentScale = scale;
      }
    } else if (option === "ZOOMOUT") {
      if (scale >= MIN_SCALE) {
        scale = scale - 0.1;
        pdfViewer.currentScale = scale;
      }
    }
  }

  /**
   * To get the current page number and the scroll top value whenever a scroll event happens
   */
  function handleScroll(event: any) {
    pageNumber = pdfViewer.currentPageNumber;
    scrollTop = event?.target?.scrollTop || scrollTop;
  }
  /**
   * To get the coordinates of the mousedown or mouseup relative to the pdf viewer container used for drawing shapes
   */
  const containerCoords = (pageX: number, pageY: number) => {
    if (!containerBoundingRect && container) {
      containerBoundingRect = container.getBoundingClientRect();
    }
    return {
      x: pageX - (containerBoundingRect?.left || 0) + container.scrollLeft,
      y: Math.abs(
        pageY -
          (containerBoundingRect?.top || 0) -
          container.scrollTop -
          window.scrollY
      )
    };
  };

  /**
   * The function is used to draw the shape, the box which you see responsively getting expanded or reduced based on mouse movement for area selection is based on this mousemove event listener's callback function.
   */
  function handleMouseMove(event: MouseEvent) {
    // console.log("mousemove in MouseSelection.tsx");
    let target = event.target as HTMLElement;
    while (target && !target.classList.contains("page")) {
      target = target.parentElement as HTMLElement;
    }
    if (target) {
      currentPageNumber = Number(target.dataset.pageNumber);
    }
    if (!start || locked || currentPageNumber !== startPageNumber) {
      return;
    }

    // end = containerCoords(event.pageX, event.pageY);
    // console.log("mouse move", end);
    end = { x: event.pageX, y: event.pageY };
    clickBoundingRect = getBoundingRectSE(start, end);
    if (annotationMode === AnnotationType.SHAPE) shapeVisible = true;
  }

  /**
   * Provides the starting coordinates for the mouseEvent and also add's event listners for mousemove and mouseup.
   * Disables the text selection if annotation mode is shape
   * @param event
   * @param viewerContainerElement
   */
  function handleMouseDown(
    event: MouseEvent,
    viewerContainerElement: HTMLElement
  ) {
    i++;
    falseAll();
    annotClickedComment = "";
    console.log("handleMouseDown", i);
    if (
      event.button == 2 ||
      (annotationMode !== AnnotationType.COMMENT &&
        annotationMode !== AnnotationType.TASK &&
        annotationMode !== AnnotationType.SHAPE)
    )
      return;

    viewerContainerElement?.addEventListener("mousemove", handleMouseMove);
    viewerContainerElement?.addEventListener("mouseup", mouseUpHandler);
    let target = event.target as HTMLElement;
    while (target && !target.classList.contains("page")) {
      target = target.parentElement as HTMLElement;
    }
    if (target) {
      startPageNumber = Number(target.dataset.pageNumber);
      // console.log("Found ancestor with class 'page':", target.dataset.pageNumber);
    } else {
      // console.log("No ancestor with class 'page' found");
    }
    container = viewerContainerElement;
    const startTarget = asElement(event.target);

    if (!isHTMLElement(startTarget)) {
      return;
    }

    // start = containerCoords(event.pageX, event.pageY);
    // console.log("mouse down", start);
    start = { x: event.pageX, y: event.pageY };
    end = null;
    locked = false;
    if (annotationMode === AnnotationType.SHAPE) {
      shapeVisible = true;
      viewerContainerElement.classList.add("disable-select");
      // console.log("shapeVisible mouseDown", shapeVisible);
    }
  }

  /**
   * the function is invoked only when an annotation mode is selected, the function after providing the ending coordinates, calculates the rect using both start and end and if the start and end is on the same place then the annotation icon needs to be placed else it's an indication for shape since mouse event position values are in respect to the window and not to the pdf And the function inturn calls the handleMouseEvent if mouse move didn't happen.
   * The function also removes the event listeners for mousemove and mouseup else would cause issues with next mouse down event.
   * @param event
   * @param viewerContainerElement
   */
  function handleMouseUp(
    event: MouseEvent,
    viewerContainerElement: HTMLElement
  ) {
    console.log("handleMouseup", i);
    viewerContainerElement.removeEventListener("mousemove", handleMouseMove);
    viewerContainerElement?.removeEventListener("mouseup", mouseUpHandler);

    let target = event.target as HTMLElement;
    const node = asElement(target.closest(".page"));
    const endPageNumber = Number(asElement(node)?.dataset?.pageNumber);
    if (!node || !isHTMLElement(node)) {
      return null;
    }
    let pageRect = node.getBoundingClientRect();

    if (!start || startPageNumber !== endPageNumber) {
      return;
    }
    // console.log("mouseup in MouseSelection.tsx", event.pageX, event.pageY);
    // end = containerCoords(event.pageX, event.pageY);
    end = { x: event.pageX, y: event.pageY };
    if (annotationMode === AnnotationType.SHAPE) {
      shapeVisible = false;
      viewerContainerElement.classList.remove("disable-select"); //should be called only for shapes
      // console.log("shapeVisible", shapeVisible);
    }
    // console.log({ start, end, locked });
    const clientRect = getBoundingRectSE(start, end);
    const highlightedRect = {
      top: clientRect.top / scale - pageRect.top / scale, //+ page.node.scrollTop - pageRect.top,
      left: clientRect.left / scale - pageRect.left / scale, //+ page.node.scrollLeft - pageRect.left,
      width: clientRect.width / scale,
      height: clientRect.height / scale,
      pageNumber: endPageNumber
    } as LTWHP;

    let width = highlightedRect.width;
    let height = highlightedRect.height;
    const viewport = pdfViewer?.getPageView(pageNumber - 1)?.viewport;
    let convertedRect: any = viewportToScaled(highlightedRect, viewport);
    console.log("convertedRect", convertedRect);
    convertedRect.pageRectTop = pageRect.top / scale;
    start = null;
    end = null;
    locked = true;
    if (height == 0 && width == 0)
      handleMouseEvent(convertedRect, endPageNumber!, pageRect.top / scale);
    clickBoundingRect = null;
  }

  /**
   * once mousevent cycle is comeplete, this function is invoked to handle the on spot annotation by positioning the commment editor or task editor popup
   */
  function handleMouseEvent(
    boundingRect: any,
    pageNumber: number,
    pageRectTop: number
  ) {
    annotCickedType = "";
    annotation.rect = boundingRect;
    annotation.pageNumber = pageNumber;
    // console.log("handleMouseUp annotation", i, annotation);
    // popupStyle = `position: absolute; top: ${boundingRect.y1 + scrollTop + pageRectTop}px; left: ${boundingRect.x1}px;z-index: 1000;`;
    popupStyle = `position: fixed; top: ${boundingRect.y1 + pageRectTop}px; left: ${boundingRect.x1}px;z-index: 1000;`;
    if (
      annotationMode === AnnotationType.COMMENT ||
      annotationMode === AnnotationType.TASK
    )
      commentEditorVisible = true;
  }

  /**
   * To delete all the annotations and render the highlight layers
   */
  function deleleAllAnnotations() {
    $userPreferences.annotations = [];
    renderHighlightLayers();
  }

  /**
   * Getting viewerContainer that is the parent of the pdf viewer to listen to scroll events and get scroll properties later on.
   * Adding event listeners for selection change, keydown, mousedown and scroll
   * selection change for enabling the inline toolbar
   * keydown for escape key to close the inline toolbar
   * mousedown for on spot annotations(Task and Comment)
   */
  onMount(async () => {
    annots = await pdfPersistence.fetchAllClips();
    viewerContainerElement = document.getElementById("viewerContainer")!;
    document.addEventListener("selectionchange", debouncedSelectionHandler);
    document.addEventListener("keydown", handleKeyDown);
    viewerContainerElement?.addEventListener("mousedown", (event) =>
      handleMouseDown(event, viewerContainerElement)
    );
    viewerContainerElement?.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener(
        "selectionchange",
        debouncedSelectionHandler
      );
      document.removeEventListener("keydown", handleKeyDown);
      viewerContainerElement?.addEventListener("mousedown", (event) =>
        handleMouseDown(event, viewerContainerElement)
      );
      viewerContainerElement?.removeEventListener("scroll", handleScroll);
    };
  });
</script>

<div class="relative flex flex-col h-full w-full">
  <div
    class="flex items-center justify-between w-full h-14 px-4 gap-8 border-b border-b-brs2"
  >
    <div class="flex gap-6 items-center search-bar flex-1">
      <div class="w-6/10 flex gap-4 items-center">
        <div class="flex items-center w-9/10">
          <TextInput
            placeholder="Search"
            bind:value={searchText}
            on:keydown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            size={Size.sm}
            icon="search"
          />
          <!-- <input
            type="search"
            placeholder="Search"
            bind:value={searchText}
            on:keydown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            class="w-full h-full p-0.5 pl-2 bg-bgs2 text-fgs1 text-sm truncate outline-none"
          /> -->
        </div>
        <!-- <button on:click={onSearch}>Search</button> -->
        <div class="flex gap-2 items-center">
          <Button icon="chevdown" on:click={findNext} />
          <Button icon="chevup" on:click={findPrevious} />
        </div>
      </div>
      <!-- <input type="text" bind:value={searchText} placeholder="Search text" /> -->
      <!-- <label class="text-xs mt-2">
        <input type="checkbox" bind:checked={searchCaseSensitive} /> Case sensitive</label
      >
      <label class="text-xs mt-2"
        ><input type="checkbox" bind:checked={searchHighlightAll} /> Highlight all</label
      > -->
      <div class="flex gap-4 items-center justify-start">
        <SwitchInput
          size={Size.sm}
          label={{
            label: "Case sensitive"
          }}
          bind:checked={searchCaseSensitive}
        />
        <SwitchInput
          size={Size.sm}
          label={{
            label: "Highlight all"
          }}
          bind:checked={searchHighlightAll}
        />
      </div>
    </div>
    <div>
      <Button
        icon="download"
        size={Size.sm}
        label="Download"
        on:click={() =>
          embedAnnotationsandDownload(url, $userPreferences.annotations)}
      />
      <!-- <button
    on:click={deleleAllAnnotations}
    class="material-symbols-rounded mx-2">{@html "&#Xe16c"}</button
    > -->
    </div>
  </div>
  <div class="w-full flex-1">
    <PdfViewer bind:pdfViewer bind:pdfDocument bind:scale {url}
      >{#if shapeVisible}
        <div
          style="position:absolute;top: {clickBoundingRect?.top}px; left: {clickBoundingRect?.left}px; width: {clickBoundingRect?.width}px; height: {clickBoundingRect?.height}px; border: 2px solid red;z-index:1000;pointer-events:none;"
        ></div>{/if}
      {#if inlineToolBarVisible}
        <InlineToolBar
          style={popupStyle}
          bind:selectedColor
          on:annotate={(event) => {
            if (event.detail == AnnotationType.COMMENT)
              commentEditorVisible = true;
            else annotate(event);
            inlineToolBarVisible = false;
          }}
        />
      {/if}
      {#if commentEditorVisible}
        <CommentEditor
          bind:annotationMode
          style={popupStyle}
          on:save={(event) => {
            commentEditorVisible = false;
            let detail = event.detail.dueDate
              ? AnnotationType.TASK
              : AnnotationType.COMMENT;
            annotate({ detail }, event.detail);
          }}
          on:update={(event) => {
            commentEditorVisible = false;
            handleUpdateComment(event.detail);
          }}
          on:cancel={() => {
            commentEditorVisible = false;
          }}
          comment={annotClickedComment}
          editingItemType={annotCickedType}
        />
      {/if}
      {#if isInlineEditBarVisible}
        <InlineEditToolBar
          style={popupStyle}
          bind:selectedColor={annotClickedColor}
          on:delete={handleAnnotDelete}
          on:color={(event) => handleColorChange(event.detail)}
          on:edit={() => {
            commentEditorVisible = true;
            isInlineEditBarVisible = false;
          }}
          editable={annotCickedType == AnnotationType.COMMENT ||
            annotCickedType == AnnotationType.TASK}
        />
      {/if}
    </PdfViewer>
  </div>
  <!-- <TracesPanel
    {annots}
    {handleAnnotDelete}
    on:traceclicked={(event) =>
      scrollToAnnot(event.detail.id, event.detail.pageNumber)}
  /> -->
  <div
    class="absolute bottom-0 left-[18%] w--full m-2 flex gap-2 items-center justify-center"
  >
    <ToolBar
      bind:selectedAnnotationMode={annotationMode}
      bind:selectedColor
      {pageNumber}
      {totalPages}
      on:pageRerender={(event) => handleRenderOptions(event.detail)}
    />
  </div>
</div>
