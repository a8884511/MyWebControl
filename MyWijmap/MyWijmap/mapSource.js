//<reference path="External/Declarations/jquery-1.11.1.min.js">
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
//地图资源，包括块接口和实现，地图分类
var Wijmap;
(function (Wijmap) {
    

    //实现tile资源
    var BingMapSource = (function () {
        function BingMapSource() {
            this.tileHeight = 256;
            this.tileWidth = 256;
            this.minZoom = 1;
            this.maxZoom = 20;
            this._uriFormat = "";
            this._subdomains = ["0", "1", "2", "3", "4", "5", "6", "7"];
        }
        BingMapSource.prototype.getUrl = function (zoom, x, y) {
            var self = this, subdomain = self._subdomains[(y * Math.pow(2, zoom) + x) % self._subdomains.length];
            return self._uriFormat.replace("{subdomain}", subdomain).replace("{quadkey}", self._getQuadkey(zoom, x, y));
        };

        // see http://msdn.microsoft.com/en-us/library/bb545006.aspx or http://www.cadmaps.com/gisblog/?p=7
        // for an explanation of how the quad tree tiles are codified
        BingMapSource.prototype._getQuadkey = function (zoom, x, y) {
            var quadkey = "", quadCode = [0, 2, 1, 3];
            for (var i = zoom; i > 0; --i)
                quadkey += quadCode[((x >> (i - 1) << 1) & 2) | ((y >> (i - 1)) & 1)];
            return quadkey;
        };
        return BingMapSource;
    })();
    Wijmap.BingMapSource = BingMapSource;

    /**
    * @ignore
    * The built-in tile source which gets the tile from bing maps with road style.
    */
    var BingMapsRoadSource = (function (_super) {
        __extends(BingMapsRoadSource, _super);
        function BingMapsRoadSource() {
            _super.apply(this, arguments);
            //"http://t{subdomain}.tiles.ditu.live.com/tiles/r{quadkey}.png?g=41";
            this._uriFormat = "http://ecn.t{subdomain}.tiles.virtualearth.net/tiles/r{quadkey}.jpeg?g=2889&mkt=en-US&shading=hill";
        }
        return BingMapsRoadSource;
    })(BingMapSource);
    Wijmap.BingMapsRoadSource = BingMapsRoadSource;

    /**
    * @ignore
    * The built-in tile source which gets the tile from bing maps with aerial style.
    */
    var BingMapsAerialSource = (function (_super) {
        __extends(BingMapsAerialSource, _super);
        function BingMapsAerialSource() {
            _super.apply(this, arguments);
            this._uriFormat = "http://ecn.t{subdomain}.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=2889&mkt=en-US&shading=hill";
        }
        return BingMapsAerialSource;
    })(BingMapSource);
    Wijmap.BingMapsAerialSource = BingMapsAerialSource;

    /**
    * @ignore
    * The built-in tile source which gets the tile from bing maps with hybrid style.
    */
    var BingMapsHybridSource = (function (_super) {
        __extends(BingMapsHybridSource, _super);
        function BingMapsHybridSource() {
            _super.apply(this, arguments);
            this._uriFormat = "http://ecn.t{subdomain}.tiles.virtualearth.net/tiles/h{quadkey}.jpeg?g=2889&mkt=en-US&shading=hill";
        }
        return BingMapsHybridSource;
    })(BingMapSource);
    Wijmap.BingMapsHybridSource = BingMapsHybridSource;

    var MapSource = (function () {
        function MapSource() {
        }
        MapSource.bingMapsRoadSource = new BingMapsRoadSource();

        MapSource.bingMapsAerialSource = new BingMapsAerialSource();

        MapSource.bingMapsHybridSource = new BingMapsHybridSource();
        return MapSource;
    })();
    Wijmap.MapSource = MapSource;
})(Wijmap || (Wijmap = {}));
//# sourceMappingURL=mapSource.js.map
