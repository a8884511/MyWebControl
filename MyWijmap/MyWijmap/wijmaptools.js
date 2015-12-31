/// <reference path="External/Declarations/jquery.d.ts">
/// <reference path="External/Declarations/jquery.ui.d.ts" />
/**
* 工具栏
*/
var Wijmap;
(function (Wijmap) {
    var toolsLayerCss = "wijmaps-toolslayer", defSpeed = 0.5, defMinPixels = 20, defMaxPixels = 158, toolsCss = {
        panCss: "wijmaps-pan",
        iconCss: "wijmaps-icon",
        iconArrowLeft: "wijmaps-icon-left",
        iconArrowRight: "wijmaps-icon-right",
        iconArrowUp: "wijmaps-icon-up",
        iconArrowDown: "wijmaps-icon-down",
        panpointCss: "wijmaps-panpoint",
        zoomCss: "wijmaps-zoomer",
        scaleCss: "wijmaps-scaler",
        scaleLableCss: "wijmaps-scaler-label",
        scaleValueCss: "wijmaps-scaler-value"
    };

    var wijmaptools = (function () {
        function wijmaptools() {
        }
        wijmaptools.prototype._create = function () {
            var self = this;
            self.element.addClass(toolsLayerCss);
            self._on(self.element, {
                "dblclick": function (event, data) {
                    event.stopPropagation();
                }
            });

            self._isPanning = false;
            self._isZooming = false;

            self._createPanPanel();
            self._createZoomPanel();
            // self._createScarePanel();
        };

        wijmaptools.prototype._createPanPanel = function () {
            var self = this, o = self.options, e = self.element;

            self._panPanel = $("<div class=\"" + toolsCss.panCss + "\"></div>").appendTo(e);
            self._panCenter = new Wijmap.Point(self._panPanel.offset().left + 25, self._panPanel.offset().top + 25);

            self._panPoint = $("<div class=\"" + toolsCss.panpointCss + "\"></div>").hide().appendTo(self._panPanel);

            var leftArrow = $("<div class=\"" + toolsCss.iconCss + " " + toolsCss.iconArrowLeft + "\"></div>"), rightArrow = $("<div class=\"" + toolsCss.iconCss + " " + toolsCss.iconArrowRight + "\"></div>"), upArrow = $("<div class=\"" + toolsCss.iconCss + " " + toolsCss.iconArrowUp + "\"></div>"), downArrow = $("<div class=\"" + toolsCss.iconCss + " " + toolsCss.iconArrowDown + "\"></div>");

            self._panPanel.append(leftArrow, rightArrow, upArrow, downArrow);

            self._on(self._panPanel, {
                "dragstart": function (event, data) {
                    event.preventDefault();
                },
                "selectstart": function (event, data) {
                    event.preventDefault();
                },
                "mousedown": function (event, data) {
                    self._isPanning = true;
                    var point = new Wijmap.Point(event.pageX, event.pageY);
                    self._panPoint.show();
                    self._startPanning(point);
                    $(document).disableSelection();

                    event.stopPropagation();
                }
            });
            self._on($(document), {
                "mouseup": function (event, data) {
                    self._isPanning = false;

                    self._stopPanning();
                    $(document).enableSelection();
                },
                "mousemove": function (event, data) {
                    if (self._isPanning) {
                        var point = new Wijmap.Point(event.pageX, event.pageY);
                        self._startPanning(point);
                    }
                }
            });
        };

        wijmaptools.prototype._startPanning = function (pointCenter) {
            var self = this, o = self.options, offsetX = self._panCenter.x - pointCenter.x, offsetY = self._panCenter.y - pointCenter.y, panningSpeedX = offsetX * defSpeed, panningSpeedY = offsetY * defSpeed;

            var length = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
            if (length > 25) {
                var scare = length / 25;

                self._panPoint.offset({ top: self._panCenter.y - 4.5 - offsetY / scare, left: self._panCenter.x - 4.5 - offsetX / scare });
            } else
                self._panPoint.offset({ top: pointCenter.y - 4.5, left: pointCenter.x - 4.5 });
            clearInterval(self._panningTimer);

            self._panningTimer = setInterval(function () {
                self._panning(panningSpeedX, panningSpeedY);
            }, 20);
        };

        wijmaptools.prototype._stopPanning = function () {
            clearInterval(this._panningTimer);
            this._panPoint.hide();
        };

        wijmaptools.prototype._panning = function (offsetX, offsetY) {
            this.options.drawMaps._panningAllTiles(offsetX, offsetY);
        };

        wijmaptools.prototype._createZoomPanel = function () {
            var self = this, o = self.options, e = self.element;
            self._zoomSlider = $("<div></div>").css("height", "100%").css("font-size", "13px");
            self._zoomPanel = $("<div class=\"" + toolsCss.zoomCss + "\"></div>").append(self._zoomSlider);
            self._zoomPanel.appendTo(e);
            self._zoomSlider.slider({ orientation: "vertical", range: false, min: o.minZoom, max: o.maxZoom, step: 1, value: o.zoom, values: null });

            self._on(self._zoomSlider, {
                "slidechange": function (event, data) {
                    self._trigger("targetZoomChanged", null, { "targetZoom": data.value });
                }
            });

            self._on(self._zoomPanel, {
                "mousedown": function (event, data) {
                    event.stopPropagation();
                }
            });
        };

        wijmaptools.prototype._createScarePanel = function () {
            var self = this, o = self.options, e = self.element;
            self._scalePanel = $("<div class=\"" + toolsCss.scaleCss + "\"></div>").appendTo(e);
            self._on(self._scalePanel, {
                "mousedown": function (event, data) {
                    event.stopPropagation();
                },
                "dblclick": function (event, data) {
                    event.stopPropagation();
                }
            });

            self._metersLabel = $("<span class=\"" + toolsCss.scaleLableCss + "\"></span>");
            self._milesLabel = $("<span class=\"" + toolsCss.scaleLableCss + "\"></span>");
            self._metersValue = $("<span class=\"" + toolsCss.scaleValueCss + "\"></span>");
            self._milesValue = $("<span class=\"" + toolsCss.scaleValueCss + "\"></span>");

            self._scalePanel.append(self._metersLabel, self._metersValue, $("<br />"), self._milesLabel, self._milesValue);
            self._updateScalePanel();
        };

        wijmaptools.prototype._updateScalePanel = function () {
            var self = this;
            self._updateScale(self._metersValue, self._metersLabel, 1, 1000, "km", "m");
            self._updateScale(self._milesValue, self._milesLabel, 3.2808399, 5280, "mi", "ft");
        };

        wijmaptools.prototype._updateScale = function (scale, label, meterToUnit, largeToSmall, largeUnit, unit) {
        };

        wijmaptools.prototype._setCenter = function (center) {
        };

        wijmaptools.prototype._setZoom = function (zoom) {
            var self = this, o = self.options;
            o.zoom = zoom;
            self._zoomSlider.slider({ value: o.zoom });
        };

        wijmaptools.prototype._setOption = function (key, value) {
            var self = this, o = this.options;
            if (o[key] !== value) {
                switch (key) {
                    case 'center':
                        self._setCenter(value);
                        return;
                    case 'zoom':
                        self._setZoom(value);
                        return;
                }
            }
        };

        wijmaptools.prototype.destory = function () {
        };
        return wijmaptools;
    })();
    Wijmap.wijmaptools = wijmaptools;

    var wijtoolslayer_options = (function () {
        function wijtoolslayer_options() {
        }
        return wijtoolslayer_options;
    })();
    Wijmap.wijtoolslayer_options = wijtoolslayer_options;
    var myWijmapTools = new wijmaptools();
    myWijmapTools.options = new wijtoolslayer_options();

    $.widget("Wijmap.wijmaptools", myWijmapTools);
})(Wijmap || (Wijmap = {}));
//# sourceMappingURL=wijmaptools.js.map
