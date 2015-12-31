/// <reference path="External/Declarations/raphael.d.ts">

module Wijmap {

    interface lontitude
    {
        lon: number;
    }



    export class wijmapVector {
        public options: wijmapVector_options;



        private _create() {
            var self = this, o = self.options;
            var paper = Raphael(0, 0, 2000, 2000);
            $.each(o.geograpic, function (index, data: lontitude) {
                //将经纬度转化为像素
                var viewCenter = CoordConverter.logicToView(CoordConverter.geographicToLogic(new Point(data.lon, o.center.y)), o.zoom);
            });
        }

        private _destory() { }

        private _setOption() { }
    }


    export class wijmapVector_options {
        geograpic: Array<Object> = [{ lon: 0 }];

        center: IPoint = new Point(0, 0);

        layerPosition: IPoint = new Point(0, 0);

        zoom: number = 1;
    }


    var myWijmapVector = new wijmapVector();
    myWijmapVector.options = new wijmapVector_options();

    $.widget("Wijmap.wijmapvectorlayer", myWijmapVector);
} 