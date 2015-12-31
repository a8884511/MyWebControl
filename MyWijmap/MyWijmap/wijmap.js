/// <reference path="External/Declarations/jquery.d.ts">
/// <reference path="External/Declarations/jquery.ui.d.ts" />
/**
* 主控件
*/
var Wijmap;
(function (Wijmap) {
    //定义常量
    var defMinZoom = 1, defMaxZoom = 20, wijmapCss = "", containerCss = "wijmaps-container", layerContainerCss = "wijmaps-layer-container", vectorLayerCss = "wijmaps-vector-layer", toolsCss = {
        panCss: "wijmaps-pan",
        iconCss: "wijmaps-icon",
        iconArrowLeft: "wijmaps-icon-left",
        iconArrowRight: "wijmaps-icon-right",
        iconArrowUp: "wijmaps-icon-up",
        iconArrowDown: "wijmaps-icon-down",
        panpointCss: "wijmaps-panpoint",
        zoomCss: "wijmaps-zoomer"
    };

    var wijmap = (function () {
        function wijmap() {
        }
        wijmap.prototype._create = function () {
            var self = this, o = this.options;

            self._setInnerSource();

            self._createMaps();

            if (o.showTools)
                self._createTools();

            self._setEventHandler();
        };

        //创建Maps
        wijmap.prototype._createMaps = function () {
            var self = this, options = this.options;
            self.drawMaps = new Wijmap.DrawMaps();
            self._isPanning = false;
            self._isZooming = false;

            self._minZoom = defMinZoom;
            self._maxZoom = defMaxZoom;

            //min,max zoom取innersource中值，但不能超出define值大小
            if (self._innerSource) {
                if (defMinZoom < self._innerSource.minZoom)
                    self._minZoom = self._innerSource.minZoom;
                if (defMaxZoom > self._innerSource.maxZoom)
                    self._maxZoom = self._innerSource.maxZoom;
            }

            if (options.targetZoom === undefined)
                options.targetZoom = options.zoom;

            self._createLayer();
        };

        //创建图层
        wijmap.prototype._createLayer = function () {
            var self = this, o = self.options;
            self._container = $("<div class=\"" + containerCss + "\"></div>").appendTo(self.element);

            self._imageContainer = $("<div class=\"" + layerContainerCss + "\"></div>").appendTo(self._container);
            if (self._innerSource)
                self._createTiles(self._imageContainer);
            self._vectorLayer = $("<div class=\"" + vectorLayerCss + "\"></div>").appendTo(self._container);
            //self._createVectorLayer(self._vectorLayer);
        };

        wijmap.prototype._createVectorLayer = function (container) {
            var e = this.element;
            container.wijmapvectorlayer({ layerPosition: new Wijmap.Point(e.offset().left, e.offset().top) });
        };

        wijmap.prototype._createTiles = function (container) {
            var self = this;
            self.drawMaps._createTilesByCenter(container, self._innerSource, self.options, self.element);
        };

        wijmap.prototype._setEventHandler = function () {
            var self = this, e = self.element, o = self.options;
            var offsetX, offsetY;
            self._on(e, {
                "dragstart": function (event, data) {
                    //prevent image being dragged in firefox.
                    event.preventDefault();
                },
                "selectstart": function (event, data) {
                    //prevent image is selected in ie.
                    event.preventDefault();
                },
                "mousedown": function (event, data) {
                    //if (self.drawMaps.apexItemCollection)
                    self._isPanning = true;
                    self._panningStartPosition = new Wijmap.Point(event.pageX, event.pageY);
                    $(document).disableSelection();
                },
                "dblclick": function (event, data) {
                    var position = new Wijmap.Point(event.pageX, event.pageY);
                    self._zoomIn(position);
                },
                "mousewheel": function (event, data) {
                    var position = new Wijmap.Point(event.pageX, event.pageY);
                    if (data > 0)
                        self._zoomIn(position);
                    else
                        self._zoomOut(position);
                },
                "keydown": function (event, data) {
                    if (self._keyDown(event))
                        event.preventDefault();
                },
                "keypress": function (event, data) {
                    if (self._keyPress(event))
                        event.preventDefault();
                }
            });
            self._on($(document), {
                "mousemove": function (event, data) {
                    if (self._isPanning) {
                        offsetX = event.pageX - self._panningStartPosition.x;
                        offsetY = event.pageY - self._panningStartPosition.y;
                        self._panningStartPosition = new Wijmap.Point(event.pageX, event.pageY);
                        if (offsetX === 0 && offsetY === 0)
                            return;
                        self._panning(offsetX, offsetY);
                    }
                },
                "mouseup": function (event, data) {
                    self._isPanning = false;
                    $(document).enableSelection();
                }
            });
        };
        wijmap.prototype._keyDown = function (event) {
            var key = event.keyCode, offsetX = 0, offsetY = 0, panSpeed = 5;
            switch (key) {
                case 37 /* LEFT */:
                    offsetX = panSpeed;
                    break;
                case 39 /* RIGHT */:
                    offsetX = -panSpeed;
                    break;
                case 38 /* UP */:
                    offsetY = +panSpeed;
                    break;
                case 40 /* DOWN */:
                    offsetY = -panSpeed;
                    break;
                default:
                    return false;
            }
            if (offsetX !== 0 || offsetY !== 0)
                this.drawMaps._panningAllTiles(offsetX, offsetY);
            return true;
        };

        wijmap.prototype._keyPress = function (event) {
            var self = this, key = event.keyCode, newTargetZoom = self.options.targetZoom;
            switch (key) {
                case 45 /* PLUS */:
                    newTargetZoom++;
                    break;
                case 43 /* MINUS */:
                    newTargetZoom--;
                    break;
                default:
                    return false;
            }
            self._setTargetZoom(newTargetZoom);
            return true;
        };

        //放大
        wijmap.prototype._zoomIn = function (position) {
            var self = this, o = self.options, newZoom = Math.min(Math.round(o.targetZoom + 1), self._maxZoom);

            //未修改（已最大）则停止
            if (o.zoom !== newZoom) {
                self._setTargetZoom(newZoom, position);
            }
        };

        //缩小
        wijmap.prototype._zoomOut = function (position) {
            var self = this, o = self.options, newZoom = Math.max(Math.round(o.targetZoom - 1), self._minZoom);

            //极限即停止
            if (o.zoom !== newZoom) {
                self._setTargetZoom(newZoom, position);
            }
        };

        wijmap.prototype._setTargetZoom = function (targetZoom, position) {
            var self = this, o = self.options, intermediateZoom;

            //true为zoomIn false 为zoomOut
            var zoomInOrOut;
            if (targetZoom > self._maxZoom)
                targetZoom = self._maxZoom;
            if (targetZoom < self._minZoom)
                targetZoom = self._minZoom;

            if (position == null)
                position = new Wijmap.Point(self.element.offset().left + 756 / 2, self.element.offset().top + 475 / 2);

            if (targetZoom !== o.targetZoom) {
                var originalZoom = o.zoom;

                //true in out false
                if (targetZoom > originalZoom)
                    zoomInOrOut = true;
                else
                    zoomInOrOut = false;

                o.targetZoom = targetZoom;
                self._isZooming = true;
                clearInterval(self._targetZoomTimer);
                self._targetZoomTimer = setInterval(function () {
                    if (self._isZooming) {
                        if (Math.abs(o.zoom - o.targetZoom) < 0.001) {
                            intermediateZoom = o.targetZoom;
                            self._isZooming = false;
                            clearInterval(self._targetZoomTimer);
                        } else {
                            intermediateZoom = o.targetZoom * o.targetZoomSpeed + o.zoom * (1 - o.targetZoomSpeed);
                        }

                        self._setZoomInternal(intermediateZoom, position, zoomInOrOut);
                    }
                }, 20);
            }
        };

        wijmap.prototype._setZoomInternal = function (intermediateZoom, position, zoomInOrOut) {
            var self = this, o = self.options;
            console.log("设置新的zoom,为%f", intermediateZoom);
            o.zoom = intermediateZoom;
            self._updateLayer();

            //创建中间状态包括最终的所有Tiles
            self.drawMaps._intermediateZoomTiles(position, intermediateZoom, zoomInOrOut);
        };

        wijmap.prototype._updateLayer = function () {
            var self = this, o = self.options;

            //改变tool上的zoom
            self._toolContainer.wijmaptools({ "zoom": o.targetZoom });
        };

        //创建工具栏
        wijmap.prototype._createTools = function () {
            var self = this, o = self.options;
            self._toolContainer = $("<div></div>").appendTo(self._container);
            self._toolContainer.wijmaptools({
                "center": new Wijmap.Point(o.center.x, o.center.y), "zoom": o.zoom, "minZoom": self._minZoom, "maxZoom": self._maxZoom,
                "drawMaps": self.drawMaps
            });
            self._toolContainer.on("wijmaptoolstargetzoomchanged", function (event, data) {
                if (data["targetZoom"] !== o.targetZoom)
                    self._setTargetZoom(data["targetZoom"]);
            });
        };

        wijmap.prototype._panning = function (offsetX, offsetY) {
            this.drawMaps._panningAllTiles(offsetX, offsetY);
        };

        //设置内部资源（选择地图类型和基本参数）
        wijmap.prototype._setInnerSource = function () {
            var self = this, options = self.options;
            switch (options.source) {
                case "bingMapsRoadSource":
                    self._innerSource = Wijmap.MapSource.bingMapsRoadSource;
                    break;
                case "bingMapsAerialSource":
                    self._innerSource = Wijmap.MapSource.bingMapsAerialSource;
                    break;
                case "bingMapsHybridSource":
                    self._innerSource = Wijmap.MapSource.bingMapsHybridSource;
                    break;
                default:
                    self._innerSource = Wijmap.MapSource.bingMapsRoadSource;
                    break;
            }
        };

        wijmap.prototype._destroyTools = function () {
            //清除tools工具栏
        };

        wijmap.prototype._setShowTools = function (showTools) {
            var self = this;
            if (showTools) {
                self._createTools();
            } else {
                self._destroyTools();
            }
        };

        wijmap.prototype._setOption = function (key, value) {
            var self = this, o = this.options;
            if (o[key] !== value) {
                switch (key) {
                    case "targetZoom":
                        self._setTargetZoom(value);
                    case "showTools":
                        self._setShowTools(value);
                }
            }
        };

        wijmap.prototype.getElement = function () {
            return this;
        };
        return wijmap;
    })();
    Wijmap.wijmap = wijmap;

    var wijmaps_options = (function () {
        function wijmaps_options() {
            //地图类型
            this.source = "bingMapsRoadSource";
            //地图中心,默认（0，0）
            this.center = new Wijmap.Point(0, 0);
            //初始比例为1
            this.zoom = 1;
            //展示工具栏
            this.showTools = true;
            //目标比例转变速度
            this.targetZoomSpeed = 0.3;
            //转变为目标中心速度
            this.targetCenterSpeed = 0.3;
        }
        return wijmaps_options;
    })();
    Wijmap.wijmaps_options = wijmaps_options;

    var myWijmap = new wijmap();
    myWijmap.options = new wijmaps_options();

    $.widget("Wijmap.wijmaps", myWijmap);
})(Wijmap || (Wijmap = {}));
//# sourceMappingURL=wijmap.js.map
