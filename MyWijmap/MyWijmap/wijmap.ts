/// <reference path="External/Declarations/jquery.d.ts">
/// <reference path="External/Declarations/jquery.ui.d.ts" />
/**
* 主控件
*/
module Wijmap {
    //定义常量
    var defMinZoom = 1,
        defMaxZoom = 20,
        wijmapCss: string = "",
        containerCss: string = "wijmaps-container",
        layerContainerCss: string = "wijmaps-layer-container",
        vectorLayerCss:string = "wijmaps-vector-layer",
        toolsCss = {
            panCss: "wijmaps-pan",
            iconCss: "wijmaps-icon",
            iconArrowLeft: "wijmaps-icon-left",
            iconArrowRight: "wijmaps-icon-right",
            iconArrowUp: "wijmaps-icon-up",
            iconArrowDown: "wijmaps-icon-down",
            panpointCss: "wijmaps-panpoint",
            zoomCss: "wijmaps-zoomer"
        };

    export class wijmap {

        public options: wijmaps_options;

        private _on: any;
        private element: JQuery;
        private _container: JQuery;
        private _imageContainer: JQuery;
        private _vectorLayer: JQuery;
        private _toolContainer: JQuery;
        private _panPanel: JQuery;
        private _panPoint: JQuery;
        private _zoomPanel: JQuery;
        private _zoomSlider: JQuery;
        private _isZooming: boolean;
        private _isPanning: boolean;
        private _isToolPanning: boolean;
        private _minZoom: number;
        private _maxZoom: number;
        private _targetZoomTimer: number;
        private _targetCenterTimer: number;
        private _panningStartPosition: IPoint;
        private _innerSource: ITileSource;
        private drawMaps: DrawMaps;
        private _panCenter: IPoint;

        private _create() {
            var self = this, o = this.options;

            self._setInnerSource();

            self._createMaps();

            if (o.showTools)
                self._createTools();

            self._setEventHandler();
        }

        //创建Maps
        private _createMaps() {
            var self = this, options = this.options;
            self.drawMaps = new DrawMaps();
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
        }

        //创建图层
        private _createLayer() {
            var self = this, o = self.options;
            self._container = $("<div class=\"" + containerCss + "\"></div>").appendTo(self.element);

            self._imageContainer = $("<div class=\"" + layerContainerCss + "\"></div>").appendTo(self._container);
            if (self._innerSource)
                self._createTiles(self._imageContainer);
            self._vectorLayer = $("<div class=\"" + vectorLayerCss + "\"></div>").appendTo(self._container);
            //self._createVectorLayer(self._vectorLayer);
        }

        private _createVectorLayer(container:JQuery)
        {
            var e = this.element;
            container.wijmapvectorlayer({layerPosition:new Point(e.offset().left,e.offset().top)});
        }


        private _createTiles(container: JQuery) {
            var self = this;
            self.drawMaps._createTilesByCenter(container, self._innerSource, self.options, self.element);
        }

        private _setEventHandler() {
            var self = this, e = self.element, o = self.options;
            var offsetX: number, offsetY: number;
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
                    self._panningStartPosition = new Point(event.pageX, event.pageY);
                    $(document).disableSelection();
                },
                "dblclick": function (event, data) {
                    var position = new Point(event.pageX, event.pageY);
                    self._zoomIn(position);
                },
                "mousewheel": function (event, data) {
                    var position = new Point(event.pageX, event.pageY);
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
                        self._panningStartPosition = new Point(event.pageX, event.pageY);
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
        }
        private _keyDown(event) {
            var key = event.keyCode, offsetX = 0, offsetY = 0, panSpeed = 5;
            switch (key) {
                case KeyValue.LEFT:
                    offsetX = panSpeed;
                    break;
                case KeyValue.RIGHT:
                    offsetX = -panSpeed;
                    break;
                case KeyValue.UP:
                    offsetY = +panSpeed;
                    break;
                case KeyValue.DOWN:
                    offsetY = -panSpeed;
                    break;
                default:
                    return false;
            }
            if (offsetX !== 0 || offsetY !== 0)
                this.drawMaps._panningAllTiles(offsetX, offsetY);
            return true;
        }

        private _keyPress(event) {
            var self = this, key = event.keyCode, newTargetZoom = self.options.targetZoom;
            switch (key) {
                case KeyValue.PLUS:
                    newTargetZoom++;
                    break;
                case KeyValue.MINUS:
                    newTargetZoom--;
                    break;
                default:
                    return false;
            }
            self._setTargetZoom(newTargetZoom);
            return true;
        }


        //放大
        private _zoomIn(position: IPoint) {
            var self = this, o = self.options,
                newZoom = Math.min(Math.round(o.targetZoom + 1), self._maxZoom);

            //未修改（已最大）则停止
            if (o.zoom !== newZoom) {
                self._setTargetZoom(newZoom, position);
            }
        }

        //缩小
        private _zoomOut(position: IPoint) {
            var self = this, o = self.options,
                newZoom = Math.max(Math.round(o.targetZoom - 1), self._minZoom);

            //极限即停止
            if (o.zoom !== newZoom) {
                self._setTargetZoom(newZoom, position);
            }
        }

        private _setTargetZoom(targetZoom: number, position?: IPoint) {
            var self = this, o = self.options, intermediateZoom: number;
            //true为zoomIn false 为zoomOut
            var zoomInOrOut: boolean;
            if (targetZoom > self._maxZoom) targetZoom = self._maxZoom;
            if (targetZoom < self._minZoom) targetZoom = self._minZoom;

            if (position == null)
                position = new Point(self.element.offset().left + 756 / 2, self.element.offset().top + 475 / 2);

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
                self._targetZoomTimer = setInterval(() => {
                    if (self._isZooming) {
                        if (Math.abs(o.zoom - o.targetZoom) < 0.001) {
                            intermediateZoom = o.targetZoom;
                            self._isZooming = false;
                            clearInterval(self._targetZoomTimer);
                        }
                        else {
                            intermediateZoom = o.targetZoom * o.targetZoomSpeed + o.zoom * (1 - o.targetZoomSpeed);
                        }

                        self._setZoomInternal(intermediateZoom, position, zoomInOrOut);
                    }
                }, 20);
            }
        }

        private _setZoomInternal(intermediateZoom: number, position: IPoint, zoomInOrOut: boolean) {
            var self = this, o = self.options;
            console.log("设置新的zoom,为%f", intermediateZoom);
            o.zoom = intermediateZoom;
            self._updateLayer();
            //创建中间状态包括最终的所有Tiles
            self.drawMaps._intermediateZoomTiles(position, intermediateZoom, zoomInOrOut);
        }

        private _updateLayer() {
            var self = this, o = self.options;
            //改变tool上的zoom
            self._toolContainer.wijmaptools({ "zoom": o.targetZoom });
        }

        //创建工具栏
        private _createTools() {
            var self = this, o = self.options;
            self._toolContainer = $("<div></div>").appendTo(self._container);
            self._toolContainer.wijmaptools({
                "center": new Point(o.center.x, o.center.y), "zoom": o.zoom, "minZoom": self._minZoom, "maxZoom": self._maxZoom,
                "drawMaps": self.drawMaps
            });
            self._toolContainer.on("wijmaptoolstargetzoomchanged", function (event, data) {
                if (data["targetZoom"] !== o.targetZoom)
                    self._setTargetZoom(data["targetZoom"]);
            });
        }

        private _panning(offsetX: number, offsetY: number) {
            this.drawMaps._panningAllTiles(offsetX, offsetY);
        }

        //设置内部资源（选择地图类型和基本参数）
        private _setInnerSource() {
            var self = this, options = self.options;
            switch (options.source) {
                case "bingMapsRoadSource":
                    self._innerSource = MapSource.bingMapsRoadSource;
                    break;
                case "bingMapsAerialSource":
                    self._innerSource = MapSource.bingMapsAerialSource;
                    break;
                case "bingMapsHybridSource":
                    self._innerSource = MapSource.bingMapsHybridSource;
                    break;
                default:
                    self._innerSource = MapSource.bingMapsRoadSource;
                    break;
            }
        }

        private _destroyTools() {
            //清除tools工具栏

        }

        private _setShowTools(showTools: boolean) {
            var self = this;
            if (showTools) {
                self._createTools();
            }
            else {
                self._destroyTools();
            }
        }

        private _setOption(key: string, value: any) {
            var self = this, o = this.options;
            if (o[key] !== value) {
                switch (key) {
                    case "targetZoom":
                        self._setTargetZoom(value);
                    case "showTools":
                        self._setShowTools(value);
                }
            }
        }

        public getElement() {
            return this;
        }

    }





    export class wijmaps_options {

        //地图类型
        source: any = "bingMapsRoadSource";


        //地图中心,默认（0，0）
        center: IPoint = new Point(0, 0);


        //初始比例为1
        zoom: number = 1;

        //展示工具栏
        showTools: boolean = true;

        //目标比例
        targetZoom: number;

        //目标比例转变速度
        targetZoomSpeed: number = 0.3;

        //目标中心
        targetCenter: IPoint;

        //转变为目标中心速度
        targetCenterSpeed: number = 0.3;
    }

    var myWijmap = new wijmap();
    myWijmap.options = new wijmaps_options();

    $.widget("Wijmap.wijmaps", myWijmap);
}

interface JQuery {
    wijmapvectorlayer: any;
    wijmaptools: any;
}