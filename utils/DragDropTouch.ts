export function DND(DragDropTouch_1: any, ref: any) {
  // "use strict";
  var DataTransfer = (function () {
    function DataTransfer() {
      this._dropEffect = "move";
      this._effectAllowed = "all";
      this._data = {};
    }
    Object.defineProperty(DataTransfer.prototype, "dropEffect", {
      get: function () {
        return this._dropEffect;
      },
      set: function (value) {
        this._dropEffect = value;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(DataTransfer.prototype, "effectAllowed", {
      get: function () {
        return this._effectAllowed;
      },
      set: function (value) {
        this._effectAllowed = value;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(DataTransfer.prototype, "types", {
      get: function () {
        return Object.keys(this._data);
      },
      enumerable: true,
      configurable: true,
    });
    DataTransfer.prototype.clearData = function (type: any) {
      if (type != null) {
        delete this._data[type];
      } else {
        this._data = null;
      }
    };
    DataTransfer.prototype.getData = function (type: any) {
      return this._data[type] || "";
    };
    DataTransfer.prototype.setData = function (type: any, value: any) {
      this._data[type] = value;
    };
    DataTransfer.prototype.setDragImage = function (
      img: any,
      offsetX: any,
      offsetY: any
    ) {
      var ddt = DragDropTouch._instance;
      ddt._imgCustom = img;
      ddt._imgOffset = { x: offsetX, y: offsetY };
    };
    return DataTransfer;
  })();
  DragDropTouch_1.DataTransfer = DataTransfer;
  var DragDropTouch = (function () {
    function DragDropTouch() {
      this._lastClick = 0;
      // enforce singleton pattern
      if (DragDropTouch._instance) {
        throw "DragDropTouch instance already created.";
      }
      var supportsPassive = false;
      document.addEventListener("test", function () {}, {
        get passive() {
          supportsPassive = true;
          return true;
        },
      });
      if ("ontouchstart" in document) {
        var d = ref,
          ts = this._touchstart.bind(this),
          tm = this._touchmove.bind(this),
          te = this._touchend.bind(this),
          opt = supportsPassive ? { passive: false, capture: false } : false;
        d.addEventListener("touchstart", ts, opt);
        d.addEventListener("touchmove", tm, opt);
        d.addEventListener("touchend", te);
        d.addEventListener("touchcancel", te);
      }
    }
    DragDropTouch.getInstance = function () {
      return DragDropTouch._instance;
    };
    DragDropTouch.prototype._touchstart = function (e) {
      var _this = this;
      if (this._shouldHandle(e)) {
        // raise double-click and prevent zooming
        if (Date.now() - this._lastClick < DragDropTouch._DBLCLICK) {
          if (this._dispatchEvent(e, "dblclick", e.target)) {
            if (e.cancelable) {
              e.preventDefault();
            }
            this._reset();
            return;
          }
        }
        // clear all variables
        this._reset();
        // get nearest draggable element
        var src = this._closestDraggable(e.target);
        if (src) {
          // give caller a chance to handle the hover/move events
          if (
            !this._dispatchEvent(e, "mousemove", e.target) &&
            !this._dispatchEvent(e, "mousedown", e.target)
          ) {
            // get ready to start dragging
            this._dragSource = src;
            this._ptDown = this._getPoint(e);
            this._lastTouch = e;
            if (e.cancelable) {
              e.preventDefault();
            }
            // show context menu if the user hasn't started dragging after a while
            setTimeout(function () {
              if (_this._dragSource == src && _this._img == null) {
                if (_this._dispatchEvent(e, "contextmenu", src)) {
                  _this._reset();
                }
              }
            }, DragDropTouch._CTXMENU);
            if (DragDropTouch._ISPRESSHOLDMODE) {
              this._pressHoldInterval = setTimeout(function () {
                _this._isDragEnabled = true;
                _this._touchmove(e);
              }, DragDropTouch._PRESSHOLDAWAIT);
            }
          }
        }
      }
    };
    DragDropTouch.prototype._touchmove = function (e) {
      if (this._shouldCancelPressHoldMove(e)) {
        this._reset();
        return;
      }
      if (this._shouldHandleMove(e) || this._shouldHandlePressHoldMove(e)) {
        // see if target wants to handle move
        var target = this._getTarget(e);
        if (this._dispatchEvent(e, "mousemove", target)) {
          this._lastTouch = e;
          if (e.cancelable) {
            e.preventDefault();
          }
          return;
        }
        // start dragging
        if (this._dragSource && !this._img && this._shouldStartDragging(e)) {
          this._dispatchEvent(e, "dragstart", this._dragSource);
          this._createImage(e);
          this._dispatchEvent(e, "dragenter", target);
        }
        // continue dragging
        if (this._img) {
          this._lastTouch = e;
          if (e.cancelable) {
            e.preventDefault(); // prevent scrolling
          }
          if (target != this._lastTarget) {
            this._dispatchEvent(this._lastTouch, "dragleave", this._lastTarget);
            this._dispatchEvent(e, "dragenter", target);
            this._lastTarget = target;
          }
          this._moveImage(e);
          this._isDropZone = this._dispatchEvent(e, "dragover", target);
        }
      }
    };
    DragDropTouch.prototype._touchend = function (e: any) {
      if (this._shouldHandle(e)) {
        // see if target wants to handle up
        if (this._dispatchEvent(this._lastTouch, "mouseup", e.target)) {
          if (e.cancelable) {
            e.preventDefault();
          }
          return;
        }
        // user clicked the element but didn't drag, so clear the source and simulate a click
        if (!this._img) {
          this._dragSource = null;
          this._dispatchEvent(this._lastTouch, "click", e.target);
          this._lastClick = Date.now();
        }
        // finish dragging
        this._destroyImage();
        if (this._dragSource) {
          if (e.type.indexOf("cancel") < 0 && this._isDropZone) {
            this._dispatchEvent(this._lastTouch, "drop", this._lastTarget);
          }
          this._dispatchEvent(this._lastTouch, "dragend", this._dragSource);
          this._reset();
        }
      }
    };
    // ** utilities
    // ignore events that have been handled or that involve more than one touch
    DragDropTouch.prototype._shouldHandle = function (e: any) {
      return e && !e.defaultPrevented && e.touches && e.touches.length < 2;
    };

    // use regular condition outside of press & hold mode
    DragDropTouch.prototype._shouldHandleMove = function (e: any) {
      return !DragDropTouch._ISPRESSHOLDMODE && this._shouldHandle(e);
    };

    // allow to handle moves that involve many touches for press & hold
    DragDropTouch.prototype._shouldHandlePressHoldMove = function (e: any) {
      return (
        DragDropTouch._ISPRESSHOLDMODE &&
        this._isDragEnabled &&
        e &&
        e.touches &&
        e.touches.length
      );
    };

    // reset data if user drags without pressing & holding
    DragDropTouch.prototype._shouldCancelPressHoldMove = function (e: any) {
      return (
        DragDropTouch._ISPRESSHOLDMODE &&
        !this._isDragEnabled &&
        this._getDelta(e) > DragDropTouch._PRESSHOLDMARGIN
      );
    };

    // start dragging when specified delta is detected
    DragDropTouch.prototype._shouldStartDragging = function (e: any) {
      var delta = this._getDelta(e);
      return (
        delta > DragDropTouch._THRESHOLD ||
        (DragDropTouch._ISPRESSHOLDMODE &&
          delta >= DragDropTouch._PRESSHOLDTHRESHOLD)
      );
    };

    // clear all members
    DragDropTouch.prototype._reset = function () {
      this._destroyImage();
      this._dragSource = null;
      this._lastTouch = null;
      this._lastTarget = null;
      this._ptDown = null;
      this._isDragEnabled = false;
      this._isDropZone = false;
      this._dataTransfer = new DataTransfer();
      clearInterval(this._pressHoldInterval);
    };
    // get point for a touch event
    DragDropTouch.prototype._getPoint = function (e: any, page: any) {
      if (e && e.touches) {
        e = e.touches[0];
      }
      return { x: page ? e.pageX : e.clientX, y: page ? e.pageY : e.clientY };
    };
    // get distance between the current touch event and the first one
    DragDropTouch.prototype._getDelta = function (e: any) {
      if (DragDropTouch._ISPRESSHOLDMODE && !this._ptDown) {
        return 0;
      }
      var p = this._getPoint(e);
      return Math.abs(p.x - this._ptDown.x) + Math.abs(p.y - this._ptDown.y);
    };
    // get the element at a given touch event
    DragDropTouch.prototype._getTarget = function (e: any) {
      var pt = this._getPoint(e),
        el = document.elementFromPoint(pt.x, pt.y);
      while (el && getComputedStyle(el).pointerEvents == "none") {
        el = el.parentElement;
      }
      return el;
    };
    // create drag image from source element
    DragDropTouch.prototype._createImage = function (e: any) {
      // just in case...
      if (this._img) {
        this._destroyImage();
      }
      // create drag image from custom element or drag source
      var src = this._imgCustom || this._dragSource;
      this._img = src.cloneNode(true);
      this._copyStyle(src, this._img);
      this._img.style.top = this._img.style.left = "-9999px";
      // if creating from drag source, apply offset and opacity
      if (!this._imgCustom) {
        var rc = src.getBoundingClientRect(),
          pt = this._getPoint(e);
        this._imgOffset = { x: pt.x - rc.left, y: pt.y - rc.top };
        this._img.style.opacity = DragDropTouch._OPACITY.toString();
      }
      // add image to document
      this._moveImage(e);
      document.body.appendChild(this._img);
    };
    // dispose of drag image element
    DragDropTouch.prototype._destroyImage = function () {
      if (this._img && this._img.parentElement) {
        this._img.parentElement.removeChild(this._img);
      }
      this._img = null;
      this._imgCustom = null;
    };
    // move the drag image element
    DragDropTouch.prototype._moveImage = function (e: any) {
      var _this = this;
      requestAnimationFrame(function () {
        if (_this._img) {
          var pt = _this._getPoint(e, true),
            s = _this._img.style;
          s.position = "absolute";
          s.pointerEvents = "none";
          s.zIndex = "999999";
          s.left = Math.round(pt.x - _this._imgOffset.x) + "px";
          s.top = Math.round(pt.y - _this._imgOffset.y) + "px";
        }
      });
    };
    // copy properties from an object to another
    DragDropTouch.prototype._copyProps = function (
      dst: any,
      src: any,
      props: any
    ) {
      for (var i = 0; i < props.length; i++) {
        var p = props[i];
        dst[p] = src[p];
      }
    };
    DragDropTouch.prototype._copyStyle = function (src: any, dst: any) {
      // remove potentially troublesome attributes
      DragDropTouch._rmvAtts.forEach(function (att: any) {
        dst.removeAttribute(att);
      });
      // copy canvas content
      if (src instanceof HTMLCanvasElement) {
        var cSrc = src,
          cDst = dst;
        cDst.width = cSrc.width;
        cDst.height = cSrc.height;
        cDst.getContext("2d").drawImage(cSrc, 0, 0);
      }
      // copy style (without transitions)
      var cs = getComputedStyle(src);
      for (var i = 0; i < cs.length; i++) {
        var key = cs[i];
        if (key.indexOf("transition") < 0) {
          dst.style[key] = cs[key];
        }
      }
      dst.style.pointerEvents = "none";
      // and repeat for all children
      for (var i = 0; i < src.children.length; i++) {
        this._copyStyle(src.children[i], dst.children[i]);
      }
    };
    DragDropTouch.prototype._dispatchEvent = function (
      e: any,
      type: any,
      target: any
    ) {
      if (e && target) {
        var evt = document.createEvent("Event"),
          t = e.touches ? e.touches[0] : e;
        evt.initEvent(type, true, true);
        evt.button = 0;
        evt.which = evt.buttons = 1;
        this._copyProps(evt, e, DragDropTouch._kbdProps);
        this._copyProps(evt, t, DragDropTouch._ptProps);
        evt.dataTransfer = this._dataTransfer;
        target.dispatchEvent(evt);
        return evt.defaultPrevented;
      }
      return false;
    };
    // gets an element's closest draggable ancestor
    DragDropTouch.prototype._closestDraggable = function (e: any) {
      for (; e; e = e.parentElement) {
        if (e.hasAttribute("draggable") && e.draggable) {
          return e;
        }
      }
      return null;
    };
    return DragDropTouch;
  })();
  /*private*/ DragDropTouch._instance = new DragDropTouch(); // singleton
  // constants
  DragDropTouch._THRESHOLD = 5; // pixels to move before drag starts
  DragDropTouch._OPACITY = 0.5; // drag image opacity
  DragDropTouch._DBLCLICK = 500; // max ms between clicks in a double click
  DragDropTouch._CTXMENU = 900; // ms to hold before raising 'contextmenu' event
  DragDropTouch._ISPRESSHOLDMODE = false; // decides of press & hold mode presence
  DragDropTouch._PRESSHOLDAWAIT = 400; // ms to wait before press & hold is detected
  DragDropTouch._PRESSHOLDMARGIN = 25; // pixels that finger might shiver while pressing
  DragDropTouch._PRESSHOLDTHRESHOLD = 0; // pixels to move before drag starts
  // copy styles/attributes from drag source to drag image element
  DragDropTouch._rmvAtts = "id,class,style,draggable".split(",");
  // synthesize and dispatch an event
  // returns true if the event has been handled (e.preventDefault == true)
  DragDropTouch._kbdProps = "altKey,ctrlKey,metaKey,shiftKey".split(",");
  DragDropTouch._ptProps = "pageX,pageY,clientX,clientY,screenX,screenY".split(
    ","
  );
  DragDropTouch_1.DragDropTouch = DragDropTouch;
}
