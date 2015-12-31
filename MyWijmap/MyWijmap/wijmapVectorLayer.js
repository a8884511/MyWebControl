/// <reference path="External/Declarations/raphael.d.ts">
var Wijmap;
(function (Wijmap) {
    var wijmapVector = (function () {
        function wijmapVector() {
        }
        wijmapVector.prototype._create = function () {
            var self = this, o = self.options;
            var paper = Raphael(0, 0, 2000, 2000);
            $.each(o.geograpic, function (index, data) {
                //将经纬度转化为像素
                var viewCenter = Wijmap.CoordConverter.logicToView(Wijmap.CoordConverter.geographicToLogic(new Wijmap.Point(data.lon, o.center.y)), o.zoom);
            });
        };

        wijmapVector.prototype._destory = function () {
        };

        wijmapVector.prototype._setOption = function () {
        };
        return wijmapVector;
    })();
    Wijmap.wijmapVector = wijmapVector;

    var wijmapVector_options = (function () {
        function wijmapVector_options() {
            this.geograpic = [{ lon: 0 }];
            this.center = new Wijmap.Point(0, 0);
            this.layerPosition = new Wijmap.Point(0, 0);
            this.zoom = 1;
        }
        return wijmapVector_options;
    })();
    Wijmap.wijmapVector_options = wijmapVector_options;

    var myWijmapVector = new wijmapVector();
    myWijmapVector.options = new wijmapVector_options();

    $.widget("Wijmap.wijmapvectorlayer", myWijmapVector);
})(Wijmap || (Wijmap = {}));
//# sourceMappingURL=wijmapVectorLayer.js.map
