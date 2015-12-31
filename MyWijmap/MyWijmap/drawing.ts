/// <reference path="External/Declarations/jquery.d.ts">
/// <reference path="utilities.ts" />
/// <reference path="converter.ts" />

module Wijmap {

    export interface ITile {

        tileWidth: number;

        tileHeight: number;

        blockX: number;

        blockY: number;

        zoom: number;

        tile: JQuery;

        position: IPoint;
    }


    export class Tile implements ITile {

        //默认tileWidth等于256
        tileWidth: number = 256;

        //默认tileHeight等于256
        tileHeight: number = 256;

        blockX: number;

        blockY: number;

        zoom: number;

        src: string;

        tile: JQuery;

        //tile所处屏幕中位置
        position: IPoint;

        constructor(point: IPoint, blockX: number, blockY: number, zoom: number, src?: string) {
            this.blockX = blockX;
            this.blockY = blockY;
            this.zoom = zoom;
            if (src)
                this.src = src;
            this.position = new Point(point);
            if (typeof (point.x) === "number" && typeof (point.y) === "number") {
                this.tile = $("<img class=\"wijmaps-tile\" style=\""
                    + "width:" + this.tileWidth + "px; height:" + this.tileHeight + "px\" src=\"" + src + "\" >");
            }
        }

        //移动
        public panning(offsetX: number, offsetY: number): void {
            this.position.panning(offsetX, offsetY);
            this.tile.offset({ left: this.position.x, top: this.position.y });
        }

        private scare(scare: number): void {
            this.tileHeight *= scare;
            this.tileWidth *= scare;

            this.tile.css("width", this.tileWidth);
            this.tile.css("height", this.tileHeight);
        }

        //此处zoom只代表原始zoom，intermediateZoom代表将要变成的zoom，以center的中心
        public zoomChange(origalZoom: number, targetZoom: number, center: IPoint) {
            var scare = Math.pow(2, (targetZoom - origalZoom));
            this.panning((center.x - this.position.x) * (1 - scare), (center.y - this.position.y) * (1 - scare));
            this.zoom = targetZoom;
            this.scare(scare);
        }
    }

    enum Direction {
        Left,
        Right,
        Top,
        Bottom
    }


    /**
    * Point Interface
    */
    export interface IPoint {

        x: number;

        y: number;

        panning(offsetX: number, offsetY: number);
        zoomChangeNewPosition(zoom: number, intermediateZoom: number, center: IPoint): IPoint;
    }


    /**
    * Point
    */
    export class Point implements IPoint {

        x: number;

        y: number;

        constructor(x: number, y: number);
        constructor(point: IPoint);
        constructor(xOrPoint: any, y?: number) {
            if (typeof (xOrPoint) === "number") {
                this.x = <number>xOrPoint;
                this.y = y;
            }
            else {
                var point = <IPoint>xOrPoint;
                this.x = point.x;
                this.y = point.y;
            }
        }


        public panning(offsetX: number, offsetY: number) {
            this.x += offsetX;
            this.y += offsetY;
        }

        public zoomChangeNewPosition(origalZoom: number, targetZoom: number, center: IPoint): IPoint {
            var scare = Math.pow(2, (targetZoom - origalZoom));
            return new Point((center.x - this.x) * (1 - scare) + this.x, (center.y - this.y) * (1 - scare) + this.y);
        }
    }



    export interface Border {
        minBlockX: number;

        maxBlockX: number;

        minBlockY: number;

        maxBlockY: number;
    }

    export class DrawMaps {
        tileItemCollection: Array<Tile>;
        oldTileItemCollection: Array<Tile>;
        apexItemCollection: Array<Tile>;
        layerHeight: number;
        layerWidth: number;
        container: JQuery;
        tileSource: ITileSource;
        zoom: number;
        _isZooming: boolean;
        element: JQuery;


        constructor() {
            this.layerHeight = 475;
            this.layerWidth = 756;
            this.tileItemCollection = [];
            this.apexItemCollection = [];
            this.oldTileItemCollection = [];
            this.zoom = 1;
            this._isZooming = false;
        }

        public _createTilesByCenter(container: JQuery, tileSource: ITileSource, options: wijmaps_options, element: JQuery) {
            var self = this;
            self.zoom = options.zoom, self.tileSource = tileSource, self.container = container, self.element = element;
            var baseTile = self._getCenterTile(options);
            self.tileItemCollection.push(baseTile); self.apexItemCollection[0] = self.apexItemCollection[1] = baseTile;
            self._renderTile(baseTile);
            self._renderTiles(self.tileItemCollection, self.apexItemCollection);
        }

        private _renderTile(tileItem: Tile) {
            tileItem.tile.appendTo(this.container);
            tileItem.tile.offset({ left: tileItem.position.x, top: tileItem.position.y });
            tileItem.tile.hide();
            tileItem.tile[0].onload = function () {
                    tileItem.tile.fadeIn(1000);
            };
        }

        private _getCenterTile(options: wijmaps_options): Tile {
            var self = this;

            var baseTile = CoordConverter.geographicToViewCenter(options.center, self.element, self.zoom);
            var url = self.tileSource.getUrl(baseTile.zoom, baseTile.blockX, baseTile.blockY);
            baseTile.tile.attr({ "src": url });

            return baseTile;
        }

        /*
        *  panning all the tiles
        */
        public _panningAllTiles(offsetX: number, offsetY: number) {
            var self = this;

            if (offsetX === 0 && offsetY === 0)
                return;

            $.each(self.tileItemCollection, (index, tileItem: Tile) => {
                tileItem.panning(offsetX, offsetY);
            });
            $.each(self.oldTileItemCollection, (index, tileItem: Tile) => {
                tileItem.panning(offsetX, offsetY);
            });

            if (self._ifNeedAddTiles)
                self._renderTiles(self.tileItemCollection, self.apexItemCollection);

            if (self._ifNeedRemoveTiles)
                self._removePanningTiles(self.tileItemCollection, self.apexItemCollection);
        }

        private _renderTiles(tileItemCollection: Array<Tile>, apexItemCollection: Array<Tile>) {
            var self = this;
            var left: number = apexItemCollection[0].position.x, blockLeft = apexItemCollection[0].blockX;
            var top: number = apexItemCollection[0].position.y, blockTop = apexItemCollection[0].blockY;
            var right: number = apexItemCollection[1].position.x, blockRight = apexItemCollection[1].blockX;
            var bottom: number = apexItemCollection[1].position.y, blockBottom = apexItemCollection[1].blockY;



            if (self._ifNeedAddLeft(left) && blockLeft > 0)
                self._addLeftTiles();
            if (self._ifNeedAddRight(right) && blockRight < Utilities.getMaxBlockX(self.zoom))
                self._addRightTiles();

            if (self._ifNeedAddTop(top) && blockTop > 0)
                self._addTopTiles();
            if (self._ifNeedAddBottom(bottom) && blockBottom < Utilities.getMaxBlockY(self.zoom))
                self._addBottomTiles();
        }


        private _removePanningTiles(tileItemCollection: Array<Tile>, apexItemCollection: Array<Tile>) {
            var self = this, zoom = apexItemCollection[0].zoom;
            var left: number = apexItemCollection[0].position.x, blockLeft = apexItemCollection[0].blockX;
            var top: number = apexItemCollection[0].position.y, blockTop = apexItemCollection[0].blockY;
            var right: number = apexItemCollection[1].position.x, blockRight = apexItemCollection[1].blockX;
            var bottom: number = apexItemCollection[1].position.y, blockBottom = apexItemCollection[1].blockY;

            if (self._ifNeedRemoveLeft(left) && blockLeft !== Utilities.getMaxBlockX(zoom))
                self._removeDirectionTiles(blockLeft, blockTop, Direction.Left);

            if (self._ifNeedRemoveTop(top) && blockTop !== Utilities.getMaxBlockY(zoom))
                self._removeDirectionTiles(blockLeft, blockTop, Direction.Top);

            if (self._ifNeedRemoveRight(right) && blockRight !== 0)
                self._removeDirectionTiles(blockRight, blockBottom, Direction.Right);

            if (self._ifNeedRemoveBottom(bottom) && blockBottom !== 0)
                self._removeDirectionTiles(blockRight, blockBottom, Direction.Bottom);
        }

        private _removeDirectionTiles(blockX: number, blockY: number, direction: Direction): void {
            var self = this;
            var logicX: number, logicY: number;
            switch (direction) {
                case Direction.Left: logicX = blockX + 1; logicY = blockY; break;
                case Direction.Top: logicX = blockX; logicY = blockY + 1; break;
                case Direction.Right: logicX = blockX - 1; logicY = blockY; break;
                case Direction.Bottom: logicX = blockX; logicY = blockY - 1; break;
            }

            self.tileItemCollection = $.grep(self.tileItemCollection, (tileItem: Tile, index: number) => {
                if (tileItem.blockX == logicX && tileItem.blockY == logicY) {
                    if (direction == Direction.Left || direction == Direction.Top)
                        self.apexItemCollection[0] = tileItem;
                    else
                        self.apexItemCollection[1] = tileItem;
                }

                if (tileItem.blockX === blockX && (direction === Direction.Left || direction === Direction.Right)) {
                    tileItem.tile.remove();
                    return false;
                }
                else if (tileItem.blockY === blockY && (direction === Direction.Bottom || direction === Direction.Top)) {
                    tileItem.tile.remove();
                    return false;
                }
                return true;
            });
        }

        private _addLeftTiles() {
            var self = this;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1],
                zoom = self.zoom;
            var logicNoChange: number, logicStart: number, logicEnd: number, left: number, top: number;
            var blockX = apexLeftTop.blockX, blockY = apexLeftTop.blockY;
            logicNoChange = blockX - 1; logicStart = blockY; logicEnd = apexRightBottom.blockY;
            left = apexLeftTop.position.x;

            while (self._ifNeedAddLeft(left) && logicNoChange >= 0) {
                left -= apexLeftTop.tileWidth; top = apexLeftTop.position.y;
                for (var tempLogic = logicStart; tempLogic <= logicEnd; tempLogic++, top += apexLeftTop.tileHeight) {
                    var tile = new Tile(new Point(left, top), logicNoChange, tempLogic, zoom, self.tileSource.getUrl(zoom, logicNoChange, tempLogic));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == logicNoChange && tile.blockY == blockY)
                        self.apexItemCollection[0] = tile;
                }
                logicNoChange--;
            }
        }

        private _addRightTiles() {
            var self = this, left: number, top: number;;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1], zoom = self.zoom,
                blockX = apexRightBottom.blockX, blockY = apexRightBottom.blockY, logicNoChange = blockX + 1,
                logicStart = blockY, logicEnd = apexLeftTop.blockY; left = apexRightBottom.position.x;

            while (self._ifNeedAddRight(left) && logicNoChange <= Utilities.getMaxBlockX(self.zoom)) {
                left += apexRightBottom.tileWidth; top = apexRightBottom.position.y;
                for (var tempLogic = logicStart; tempLogic >= logicEnd; tempLogic--, top -= apexRightBottom.tileHeight) {
                    var tile = new Tile(new Point(left, top), logicNoChange, tempLogic, zoom, self.tileSource.getUrl(zoom, logicNoChange, tempLogic));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == logicNoChange && tile.blockY == blockY)
                        self.apexItemCollection[1] = tile;
                }
                logicNoChange++;
            }
        }

        private _addTopTiles() {
            var self = this;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1],
                zoom = self.zoom;
            var logicNoChange: number, logicStart: number, logicEnd: number, left: number, top: number;
            var blockX = apexLeftTop.blockX, blockY = apexLeftTop.blockY;

            logicNoChange = blockY - 1; logicStart = blockX; logicEnd = apexRightBottom.blockX;
            top = apexLeftTop.position.y;
            while (self._ifNeedAddTop(top) && logicNoChange >= 0) {
                top -= apexLeftTop.tileHeight; left = apexLeftTop.position.x;
                for (var tempLogic = logicStart; tempLogic <= logicEnd; tempLogic++, left += apexLeftTop.tileWidth) {
                    var tile = new Tile(new Point(left, top), tempLogic, logicNoChange, zoom, self.tileSource.getUrl(zoom, tempLogic, logicNoChange));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == blockX && (tile.blockY == logicNoChange))
                        self.apexItemCollection[0] = tile;
                }
                logicNoChange--;
            }
        }

        private _addBottomTiles() {
            var self = this;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1],
                zoom = self.zoom;
            var logicNoChange: number, logicStart: number, logicEnd: number, left: number, top: number;
            var blockX = apexRightBottom.blockX, blockY = apexRightBottom.blockY;
            logicNoChange = apexRightBottom.blockY + 1; logicStart = apexRightBottom.blockX; logicEnd = apexLeftTop.blockX;
            top = apexRightBottom.position.y;
            while (self._ifNeedAddBottom(top) && logicNoChange <= Utilities.getMaxBlockY(zoom)) {
                top += apexRightBottom.tileHeight; left = apexRightBottom.position.x;
                for (var tempLogic = logicStart; tempLogic >= logicEnd; tempLogic--, left -= apexRightBottom.tileWidth) {
                    var tile = new Tile(new Point(left, top), tempLogic, logicNoChange, zoom, self.tileSource.getUrl(zoom, tempLogic, logicNoChange));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == blockX && (tile.blockY == logicNoChange))
                        self.apexItemCollection[1] = tile;
                }
                logicNoChange++;
            }

        }

        private _getApexItemColletion(tileItems: Array<Tile>): Array<Tile> {
            var apexItems: Array<Tile> = [];
            var border: Border;
            var minX: number, maxX: number, minY: number, maxY: number;
            $.each(tileItems, function (index, tileItem) {
                if (minX == null) {
                    minX = tileItem.blockX;
                    maxX = tileItem.blockX;
                    minY = tileItem.blockY;
                    maxY = tileItem.blockY;
                }
                else {
                    if (tileItem.blockX < minX)
                        minX = tileItem.blockX;
                    if (tileItem.blockX > maxX)
                        maxX = tileItem.blockX;

                    if (tileItem.blockY < minY)
                        minY = tileItem.blockY;
                    if (tileItem.blockY > maxY)
                        maxY = tileItem.blockY;
                }
            });

            $.each(tileItems, function (index, tileItem) {
                if (tileItem.blockX == minX && tileItem.blockY == minY)
                    apexItems.push(tileItem);
                if (tileItem.blockX == maxX && tileItem.blockY == maxY)
                    apexItems.push(tileItem);
            });
            return apexItems;
        }

        private _getTileByPosition(position: IPoint): Tile {
            var self = this;
            var tileCollection: Array<Tile>, tile: Tile;
            tileCollection = self.tileItemCollection;
            $.each(tileCollection, (index: number, tileItem: Tile) => {
                tileItem.tile.css("z-index", -100);
                if (tileItem.position.x <= position.x && (tileItem.position.x + tileItem.tileWidth) > position.x &&
                    tileItem.position.y <= position.y && (tileItem.position.y + tileItem.tileHeight) > position.y)
                    tile = tileItem;
            });
            return tile;
        }

        public _intermediateZoomTiles(position: IPoint, intermediateZoom: number, zoomInOrOut: boolean): void {
            var self = this, baseTile: Tile;

            $.each(self.tileItemCollection, (index: number, tileItem: Tile) => {
                tileItem.zoomChange(tileItem.zoom, intermediateZoom, position);
            });

            if (Math.round(intermediateZoom) === intermediateZoom) {
                var centerTile = this._getTileByPosition(position);

                $.extend(self.oldTileItemCollection, self.tileItemCollection);
                self.tileItemCollection.length = 0;
                self._createZoomedTiles(self._getNewZoomTile(centerTile, zoomInOrOut, intermediateZoom, position));

                self._emptyOldTilesCollection(self.oldTileItemCollection);
            }
        }

        private _emptyOldTilesCollection(oldtileItemCollection: Array<Tile>) {
            oldtileItemCollection = $.grep(oldtileItemCollection, (tileItem: Tile, index: number) => {
                tileItem.tile.remove();
                return false;
            });
        }

        private _getNewZoomTile(centerTile: Tile, zoomInOrOut: boolean, intermediateZoom: number, position: IPoint): Tile {
            var baseTile: Tile, self = this, blockX = centerTile.blockX, blockY = centerTile.blockY,
                integerOriginalZoom = self.zoom,
                integerTargetZoom = intermediateZoom,
                tileLengthSide = 256,
                newCenterPosition = new Point(centerTile.position.zoomChangeNewPosition(centerTile.zoom, integerOriginalZoom, position));

            if (newCenterPosition !== null) {
                if (zoomInOrOut) {
                    //in 
                    newCenterPosition = newCenterPosition.zoomChangeNewPosition(integerOriginalZoom, integerTargetZoom, position);
                    blockX = blockX * Math.round(Math.pow(2, integerTargetZoom - integerOriginalZoom));
                    blockY = blockY * Math.round(Math.pow(2, integerTargetZoom - integerOriginalZoom));
                }
                else {
                    //out
                    while (integerOriginalZoom !== integerTargetZoom) {
                        newCenterPosition = newCenterPosition.zoomChangeNewPosition(integerOriginalZoom, integerOriginalZoom - 1, position);
                        if (Utilities.getParity(blockX))
                            blockX /= 2;
                        else {
                            blockX = (blockX - 1) / 2;
                            newCenterPosition.panning(- tileLengthSide / 2, 0);
                        }
                        if (Utilities.getParity(blockY))
                            blockY /= 2;
                        else {
                            blockY = (blockY - 1) / 2;
                            newCenterPosition.panning(0, - tileLengthSide / 2);
                        }
                        integerOriginalZoom--;
                    }
                }
            }
            self.zoom = integerTargetZoom;
            while (newCenterPosition.x <= 0) {
                while (newCenterPosition.y <= 0) {
                    blockY++;
                    newCenterPosition.y += tileLengthSide;
                }
                blockX++;
                newCenterPosition.x += tileLengthSide;
            }


            baseTile = new Tile(newCenterPosition, blockX, blockY, integerTargetZoom, self.tileSource.getUrl(integerTargetZoom, blockX, blockY));
            self._renderTile(baseTile);
            return baseTile;
        }

        private _createZoomedTiles(baseTile: Tile) {
            var self = this;
            self.tileItemCollection.push(baseTile);
            self.apexItemCollection = self._getApexItemColletion(self.tileItemCollection);

            self._renderTiles(self.tileItemCollection, self.apexItemCollection);
        }

        private _ifNeedAddTiles(apexItemCollection: Array<Tile>): boolean {
            if (this._ifNeedAddLeft(apexItemCollection[0].position.x) || this._ifNeedAddTop(apexItemCollection[0].position.y) ||
                this._ifNeedAddRight(apexItemCollection[1].position.x) || this._ifNeedAddBottom(apexItemCollection[1].position.y))
                return true;

            return false;
        }

        private _ifNeedAddLeft(left: number): boolean {
            if (left > this.element.offset().left + 0)
                return true;
            else
                return false;
        }

        private _ifNeedAddTop(top: number): boolean {
            if (top > this.element.offset().top + 0)
                return true;
            else
                return false;
        }

        private _ifNeedAddBottom(bottom: number): boolean {
            if (bottom < (this.element.offset().top + this.layerHeight - this.tileSource.tileHeight))
                return true;
            else
                return false;
        }

        private _ifNeedAddRight(right: number): boolean {
            if (right < (this.element.offset().left + this.layerWidth - this.tileSource.tileWidth))
                return true;
            else
                return false;
        }

        private _ifNeedRemoveTiles(apexItemCollection: Array<Tile>): boolean {
            if (this._ifNeedRemoveLeft(apexItemCollection[0].position.x) || this._ifNeedRemoveTop(apexItemCollection[0].position.y) ||
                this._ifNeedRemoveRight(apexItemCollection[1].position.x) || this._ifNeedRemoveBottom(apexItemCollection[1].position.y))
                return true;

            return false;
        }

        private _ifNeedRemoveBottom(bottom: number): boolean {
            if (bottom > this.element.offset().top + this.layerHeight + 15)
                return true;
            else
                return false;
        }

        private _ifNeedRemoveRight(right: number): boolean {
            if (right > this.element.offset().left + this.layerWidth + 15)
                return true;
            else
                return false;
        }

        private _ifNeedRemoveTop(top: number): boolean {
            if (top < (this.element.offset().top - this.tileSource.tileHeight - 15))
                return true;
            else
                return false;
        }

        private _ifNeedRemoveLeft(left: number): boolean {
            if (left < this.element.offset().left - this.tileSource.tileWidth - 15)
                return true;
            else
                return false;
        }
    }
}