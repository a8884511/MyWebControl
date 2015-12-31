//<reference path="External/Declarations/jquery-1.11.1.min.js">

//地图资源，包括块接口和实现，地图分类
module Wijmap {


    //定义tile资源的接口
    export interface ITileSource {
        tileHeight: number;

        tileWidth: number;

        minZoom: number;

        maxZoom: number;

        getUrl(zoom: number, x: number, y: number): string;
    }

    //实现tile资源
    export class BingMapSource implements ITileSource {
        public tileHeight: number = 256;

        public tileWidth: number = 256;

        minZoom: number = 1;

        maxZoom: number = 20;

        _uriFormat: string = "";

        _subdomains: string[] = ["0", "1", "2", "3", "4", "5", "6", "7"];

        getUrl(zoom: number, x: number, y: number): string {
            var self = this, subdomain = self._subdomains[(y * Math.pow(2, zoom) + x) % self._subdomains.length];
            return self._uriFormat.replace("{subdomain}", subdomain).replace("{quadkey}",
                self._getQuadkey(zoom, x, y));
        }

        // see http://msdn.microsoft.com/en-us/library/bb545006.aspx or http://www.cadmaps.com/gisblog/?p=7
        // for an explanation of how the quad tree tiles are codified
        private _getQuadkey(zoom: number, x: number, y: number): string {
            var quadkey = "", quadCode = [0, 2, 1, 3];
            for (var i = zoom; i > 0; --i)
                quadkey += quadCode[((x >> (i - 1) << 1) & 2) | ((y >> (i - 1)) & 1)];
            return quadkey;
        }

    }

    /**
    * @ignore
    * The built-in tile source which gets the tile from bing maps with road style.
    */
    export class BingMapsRoadSource extends BingMapSource {
        //"http://t{subdomain}.tiles.ditu.live.com/tiles/r{quadkey}.png?g=41";
        _uriFormat: string = "http://ecn.t{subdomain}.tiles.virtualearth.net/tiles/r{quadkey}.jpeg?g=2889&mkt=en-US&shading=hill";
    }

    /**
    * @ignore
    * The built-in tile source which gets the tile from bing maps with aerial style.
    */
    export class BingMapsAerialSource extends BingMapSource {
        _uriFormat: string = "http://ecn.t{subdomain}.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=2889&mkt=en-US&shading=hill";
    }

    /**
    * @ignore
    * The built-in tile source which gets the tile from bing maps with hybrid style.
    */
    export class BingMapsHybridSource extends BingMapSource {
        _uriFormat: string = "http://ecn.t{subdomain}.tiles.virtualearth.net/tiles/h{quadkey}.jpeg?g=2889&mkt=en-US&shading=hill";
    }

    export class MapSource {
        /**
        * Bing maps with road style.
        */
        public static bingMapsRoadSource = new BingMapsRoadSource();
        /**
        * Bing maps with aerial style.
        */
        public static bingMapsAerialSource = new BingMapsAerialSource();
        /**
        * Bing maps with hybrid style.
        */
        public static bingMapsHybridSource = new BingMapsHybridSource();

    }
} 