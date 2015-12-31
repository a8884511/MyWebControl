/// <reference path="External/Declarations/jquery.d.ts">
/// <reference path="utilities.ts" />
/// <reference path="converter.ts" />
var Wijmap;
(function (Wijmap) {
    var Tile = (function () {
        function Tile(point, blockX, blockY, zoom, src) {
            //默认tileWidth等于256
            this.tileWidth = 256;
            //默认tileHeight等于256
            this.tileHeight = 256;
            this.blockX = blockX;
            this.blockY = blockY;
            this.zoom = zoom;
            if (src)
                this.src = src;
            this.position = new Point(point);
            if (typeof (point.x) === "number" && typeof (point.y) === "number") {
                this.tile = $("<img class=\"wijmaps-tile\" style=\"" + "width:" + this.tileWidth + "px; height:" + this.tileHeight + "px\" src=\"" + src + "\" >");
            }
        }
        //移动
        Tile.prototype.panning = function (offsetX, offsetY) {
            this.position.panning(offsetX, offsetY);
            this.tile.offset({ left: this.position.x, top: this.position.y });
        };

        Tile.prototype.scare = function (scare) {
            this.tileHeight *= scare;
            this.tileWidth *= scare;

            this.tile.css("width", this.tileWidth);
            this.tile.css("height", this.tileHeight);
        };

        //此处zoom只代表原始zoom，intermediateZoom代表将要变成的zoom，以center的中心
        Tile.prototype.zoomChange = function (origalZoom, targetZoom, center) {
            var scare = Math.pow(2, (targetZoom - origalZoom));
            this.panning((center.x - this.position.x) * (1 - scare), (center.y - this.position.y) * (1 - scare));
            this.zoom = targetZoom;
            this.scare(scare);
        };
        return Tile;
    })();
    Wijmap.Tile = Tile;

    var Direction;
    (function (Direction) {
        Direction[Direction["Left"] = 0] = "Left";
        Direction[Direction["Right"] = 1] = "Right";
        Direction[Direction["Top"] = 2] = "Top";
        Direction[Direction["Bottom"] = 3] = "Bottom";
    })(Direction || (Direction = {}));

    

    /**
    * Point
    */
    var Point = (function () {
        function Point(xOrPoint, y) {
            if (typeof (xOrPoint) === "number") {
                this.x = xOrPoint;
                this.y = y;
            } else {
                var point = xOrPoint;
                this.x = point.x;
                this.y = point.y;
            }
        }
        Point.prototype.panning = function (offsetX, offsetY) {
            this.x += offsetX;
            this.y += offsetY;
        };

        Point.prototype.zoomChangeNewPosition = function (origalZoom, targetZoom, center) {
            var scare = Math.pow(2, (targetZoom - origalZoom));
            return new Point((center.x - this.x) * (1 - scare) + this.x, (center.y - this.y) * (1 - scare) + this.y);
        };
        return Point;
    })();
    Wijmap.Point = Point;

    var DrawMaps = (function () {
        function DrawMaps() {
            this.layerHeight = 475;
            this.layerWidth = 756;
            this.tileItemCollection = [];
            this.apexItemCollection = [];
            this.oldTileItemCollection = [];
            this.zoom = 1;
            this._isZooming = false;
        }
        DrawMaps.prototype._createTilesByCenter = function (container, tileSource, options, element) {
            var self = this;
            self.zoom = options.zoom, self.tileSource = tileSource, self.container = container, self.element = element;
            var baseTile = self._getCenterTile(options);
            self.tileItemCollection.push(baseTile);
            self.apexItemCollection[0] = self.apexItemCollection[1] = baseTile;
            self._renderTile(baseTile);
            self._renderTiles(self.tileItemCollection, self.apexItemCollection);
        };

        DrawMaps.prototype._renderTile = function (tileItem) {
            tileItem.tile.appendTo(this.container);
            tileItem.tile.offset({ left: tileItem.position.x, top: tileItem.position.y });
            tileItem.tile.hide();
            tileItem.tile[0].onload = function () {
                tileItem.tile.fadeIn(1000);
            };
        };

        DrawMaps.prototype._getCenterTile = function (options) {
            var self = this;

            var baseTile = Wijmap.CoordConverter.geographicToViewCenter(options.center, self.element, self.zoom);
            var url = self.tileSource.getUrl(baseTile.zoom, baseTile.blockX, baseTile.blockY);
            baseTile.tile.attr({ "src": url });

            return baseTile;
        };

        /*
        *  panning all the tiles
        */
        DrawMaps.prototype._panningAllTiles = function (offsetX, offsetY) {
            var self = this;

            if (offsetX === 0 && offsetY === 0)
                return;

            $.each(self.tileItemCollection, function (index, tileItem) {
                tileItem.panning(offsetX, offsetY);
            });
            $.each(self.oldTileItemCollection, function (index, tileItem) {
                tileItem.panning(offsetX, offsetY);
            });

            if (self._ifNeedAddTiles)
                self._renderTiles(self.tileItemCollection, self.apexItemCollection);

            if (self._ifNeedRemoveTiles)
                self._removePanningTiles(self.tileItemCollection, self.apexItemCollection);
        };

        DrawMaps.prototype._renderTiles = function (tileItemCollection, apexItemCollection) {
            var self = this;
            var left = apexItemCollection[0].position.x, blockLeft = apexItemCollection[0].blockX;
            var top = apexItemCollection[0].position.y, blockTop = apexItemCollection[0].blockY;
            var right = apexItemCollection[1].position.x, blockRight = apexItemCollection[1].blockX;
            var bottom = apexItemCollection[1].position.y, blockBottom = apexItemCollection[1].blockY;

            if (self._ifNeedAddLeft(left) && blockLeft > 0)
                self._addLeftTiles();
            if (self._ifNeedAddRight(right) && blockRight < Wijmap.Utilities.getMaxBlockX(self.zoom))
                self._addRightTiles();

            if (self._ifNeedAddTop(top) && blockTop > 0)
                self._addTopTiles();
            if (self._ifNeedAddBottom(bottom) && blockBottom < Wijmap.Utilities.getMaxBlockY(self.zoom))
                self._addBottomTiles();
        };

        DrawMaps.prototype._removePanningTiles = function (tileItemCollection, apexItemCollection) {
            var self = this, zoom = apexItemCollection[0].zoom;
            var left = apexItemCollection[0].position.x, blockLeft = apexItemCollection[0].blockX;
            var top = apexItemCollection[0].position.y, blockTop = apexItemCollection[0].blockY;
            var right = apexItemCollection[1].position.x, blockRight = apexItemCollection[1].blockX;
            var bottom = apexItemCollection[1].position.y, blockBottom = apexItemCollection[1].blockY;

            if (self._ifNeedRemoveLeft(left) && blockLeft !== Wijmap.Utilities.getMaxBlockX(zoom))
                self._removeDirectionTiles(blockLeft, blockTop, 0 /* Left */);

            if (self._ifNeedRemoveTop(top) && blockTop !== Wijmap.Utilities.getMaxBlockY(zoom))
                self._removeDirectionTiles(blockLeft, blockTop, 2 /* Top */);

            if (self._ifNeedRemoveRight(right) && blockRight !== 0)
                self._removeDirectionTiles(blockRight, blockBottom, 1 /* Right */);

            if (self._ifNeedRemoveBottom(bottom) && blockBottom !== 0)
                self._removeDirectionTiles(blockRight, blockBottom, 3 /* Bottom */);
        };

        DrawMaps.prototype._removeDirectionTiles = function (blockX, blockY, direction) {
            var self = this;
            var logicX, logicY;
            switch (direction) {
                case 0 /* Left */:
                    logicX = blockX + 1;
                    logicY = blockY;
                    break;
                case 2 /* Top */:
                    logicX = blockX;
                    logicY = blockY + 1;
                    break;
                case 1 /* Right */:
                    logicX = blockX - 1;
                    logicY = blockY;
                    break;
                case 3 /* Bottom */:
                    logicX = blockX;
                    logicY = blockY - 1;
                    break;
            }

            self.tileItemCollection = $.grep(self.tileItemCollection, function (tileItem, index) {
                if (tileItem.blockX == logicX && tileItem.blockY == logicY) {
                    if (direction == 0 /* Left */ || direction == 2 /* Top */)
                        self.apexItemCollection[0] = tileItem;
                    else
                        self.apexItemCollection[1] = tileItem;
                }

                if (tileItem.blockX === blockX && (direction === 0 /* Left */ || direction === 1 /* Right */)) {
                    tileItem.tile.remove();
                    return false;
                } else if (tileItem.blockY === blockY && (direction === 3 /* Bottom */ || direction === 2 /* Top */)) {
                    tileItem.tile.remove();
                    return false;
                }
                return true;
            });
        };

        DrawMaps.prototype._addLeftTiles = function () {
            var self = this;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1], zoom = self.zoom;
            var logicNoChange, logicStart, logicEnd, left, top;
            var blockX = apexLeftTop.blockX, blockY = apexLeftTop.blockY;
            logicNoChange = blockX - 1;
            logicStart = blockY;
            logicEnd = apexRightBottom.blockY;
            left = apexLeftTop.position.x;

            while (self._ifNeedAddLeft(left) && logicNoChange >= 0) {
                left -= apexLeftTop.tileWidth;
                top = apexLeftTop.position.y;
                for (var tempLogic = logicStart; tempLogic <= logicEnd; tempLogic++, top += apexLeftTop.tileHeight) {
                    var tile = new Tile(new Point(left, top), logicNoChange, tempLogic, zoom, self.tileSource.getUrl(zoom, logicNoChange, tempLogic));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == logicNoChange && tile.blockY == blockY)
                        self.apexItemCollection[0] = tile;
                }
                logicNoChange--;
            }
        };

        DrawMaps.prototype._addRightTiles = function () {
            var self = this, left, top;
            ;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1], zoom = self.zoom, blockX = apexRightBottom.blockX, blockY = apexRightBottom.blockY, logicNoChange = blockX + 1, logicStart = blockY, logicEnd = apexLeftTop.blockY;
            left = apexRightBottom.position.x;

            while (self._ifNeedAddRight(left) && logicNoChange <= Wijmap.Utilities.getMaxBlockX(self.zoom)) {
                left += apexRightBottom.tileWidth;
                top = apexRightBottom.position.y;
                for (var tempLogic = logicStart; tempLogic >= logicEnd; tempLogic--, top -= apexRightBottom.tileHeight) {
                    var tile = new Tile(new Point(left, top), logicNoChange, tempLogic, zoom, self.tileSource.getUrl(zoom, logicNoChange, tempLogic));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == logicNoChange && tile.blockY == blockY)
                        self.apexItemCollection[1] = tile;
                }
                logicNoChange++;
            }
        };

        DrawMaps.prototype._addTopTiles = function () {
            var self = this;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1], zoom = self.zoom;
            var logicNoChange, logicStart, logicEnd, left, top;
            var blockX = apexLeftTop.blockX, blockY = apexLeftTop.blockY;

            logicNoChange = blockY - 1;
            logicStart = blockX;
            logicEnd = apexRightBottom.blockX;
            top = apexLeftTop.position.y;
            while (self._ifNeedAddTop(top) && logicNoChange >= 0) {
                top -= apexLeftTop.tileHeight;
                left = apexLeftTop.position.x;
                for (var tempLogic = logicStart; tempLogic <= logicEnd; tempLogic++, left += apexLeftTop.tileWidth) {
                    var tile = new Tile(new Point(left, top), tempLogic, logicNoChange, zoom, self.tileSource.getUrl(zoom, tempLogic, logicNoChange));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == blockX && (tile.blockY == logicNoChange))
                        self.apexItemCollection[0] = tile;
                }
                logicNoChange--;
            }
        };

        DrawMaps.prototype._addBottomTiles = function () {
            var self = this;
            var apexLeftTop = self.apexItemCollection[0], apexRightBottom = self.apexItemCollection[1], zoom = self.zoom;
            var logicNoChange, logicStart, logicEnd, left, top;
            var blockX = apexRightBottom.blockX, blockY = apexRightBottom.blockY;
            logicNoChange = apexRightBottom.blockY + 1;
            logicStart = apexRightBottom.blockX;
            logicEnd = apexLeftTop.blockX;
            top = apexRightBottom.position.y;
            while (self._ifNeedAddBottom(top) && logicNoChange <= Wijmap.Utilities.getMaxBlockY(zoom)) {
                top += apexRightBottom.tileHeight;
                left = apexRightBottom.position.x;
                for (var tempLogic = logicStart; tempLogic >= logicEnd; tempLogic--, left -= apexRightBottom.tileWidth) {
                    var tile = new Tile(new Point(left, top), tempLogic, logicNoChange, zoom, self.tileSource.getUrl(zoom, tempLogic, logicNoChange));
                    self._renderTile(tile);
                    self.tileItemCollection.push(tile);
                    if (tile.blockX == blockX && (tile.blockY == logicNoChange))
                        self.apexItemCollection[1] = tile;
                }
                logicNoChange++;
            }
        };

        DrawMaps.prototype._getApexItemColletion = function (tileItems) {
            var apexItems = [];
            var border;
            var minX, maxX, minY, maxY;
            $.each(tileItems, function (index, tileItem) {
                if (minX == null) {
                    minX = tileItem.blockX;
                    maxX = tileItem.blockX;
                    minY = tileItem.blockY;
                    maxY = tileItem.blockY;
                } else {
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
        };

        DrawMaps.prototype._getTileByPosition = function (position) {
            var self = this;
            var tileCollection, tile;
            tileCollection = self.tileItemCollection;
            $.each(tileCollection, function (index, tileItem) {
                tileItem.tile.css("z-index", -100);
                if (tileItem.position.x <= position.x && (tileItem.position.x + tileItem.tileWidth) > position.x && tileItem.position.y <= position.y && (tileItem.position.y + tileItem.tileHeight) > position.y)
                    tile = tileItem;
            });
            return tile;
        };

        DrawMaps.prototype._intermediateZoomTiles = function (position, intermediateZoom, zoomInOrOut) {
            var self = this, baseTile;

            $.each(self.tileItemCollection, function (index, tileItem) {
                tileItem.zoomChange(tileItem.zoom, intermediateZoom, position);
            });

            if (Math.round(intermediateZoom) === intermediateZoom) {
                var centerTile = this._getTileByPosition(position);

                $.extend(self.oldTileItemCollection, self.tileItemCollection);
                self.tileItemCollection.length = 0;
                self._createZoomedTiles(self._getNewZoomTile(centerTile, zoomInOrOut, intermediateZoom, position));

                self._emptyOldTilesCollection(self.oldTileItemCollection);
            }
        };

        DrawMaps.prototype._emptyOldTilesCollection = function (oldtileItemCollection) {
            oldtileItemCollection = $.grep(oldtileItemCollection, function (tileItem, index) {
                tileItem.tile.remove();
                return false;
            });
        };

        DrawMaps.prototype._getNewZoomTile = function (centerTile, zoomInOrOut, intermediateZoom, position) {
            var baseTile, self = this, blockX = centerTile.blockX, blockY = centerTile.blockY, integerOriginalZoom = self.zoom, integerTargetZoom = intermediateZoom, tileLengthSide = 256, newCenterPosition = new Point(centerTile.position.zoomChangeNewPosition(centerTile.zoom, integerOriginalZoom, position));

            if (newCenterPosition !== null) {
                if (zoomInOrOut) {
                    //in
                    newCenterPosition = newCenterPosition.zoomChangeNewPosition(integerOriginalZoom, integerTargetZoom, position);
                    blockX = blockX * Math.round(Math.pow(2, integerTargetZoom - integerOriginalZoom));
                    blockY = blockY * Math.round(Math.pow(2, integerTargetZoom - integerOriginalZoom));
                } else {
                    while (integerOriginalZoom !== integerTargetZoom) {
                        newCenterPosition = newCenterPosition.zoomChangeNewPosition(integerOriginalZoom, integerOriginalZoom - 1, position);
                        if (Wijmap.Utilities.getParity(blockX))
                            blockX /= 2;
                        else {
                            blockX = (blockX - 1) / 2;
                            newCenterPosition.panning(-tileLengthSide / 2, 0);
                        }
                        if (Wijmap.Utilities.getParity(blockY))
                            blockY /= 2;
                        else {
                            blockY = (blockY - 1) / 2;
                            newCenterPosition.panning(0, -tileLengthSide / 2);
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
        };

        DrawMaps.prototype._createZoomedTiles = function (baseTile) {
            var self = this;
            self.tileItemCollection.push(baseTile);
            self.apexItemCollection = self._getApexItemColletion(self.tileItemCollection);

            self._renderTiles(self.tileItemCollection, self.apexItemCollection);
        };

        DrawMaps.prototype._ifNeedAddTiles = function (apexItemCollection) {
            if (this._ifNeedAddLeft(apexItemCollection[0].position.x) || this._ifNeedAddTop(apexItemCollection[0].position.y) || this._ifNeedAddRight(apexItemCollection[1].position.x) || this._ifNeedAddBottom(apexItemCollection[1].position.y))
                return true;

            return false;
        };

        DrawMaps.prototype._ifNeedAddLeft = function (left) {
            if (left > this.element.offset().left + 0)
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedAddTop = function (top) {
            if (top > this.element.offset().top + 0)
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedAddBottom = function (bottom) {
            if (bottom < (this.element.offset().top + this.layerHeight - this.tileSource.tileHeight))
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedAddRight = function (right) {
            if (right < (this.element.offset().left + this.layerWidth - this.tileSource.tileWidth))
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedRemoveTiles = function (apexItemCollection) {
            if (this._ifNeedRemoveLeft(apexItemCollection[0].position.x) || this._ifNeedRemoveTop(apexItemCollection[0].position.y) || this._ifNeedRemoveRight(apexItemCollection[1].position.x) || this._ifNeedRemoveBottom(apexItemCollection[1].position.y))
                return true;

            return false;
        };

        DrawMaps.prototype._ifNeedRemoveBottom = function (bottom) {
            if (bottom > this.element.offset().top + this.layerHeight + 15)
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedRemoveRight = function (right) {
            if (right > this.element.offset().left + this.layerWidth + 15)
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedRemoveTop = function (top) {
            if (top < (this.element.offset().top - this.tileSource.tileHeight - 15))
                return true;
            else
                return false;
        };

        DrawMaps.prototype._ifNeedRemoveLeft = function (left) {
            if (left < this.element.offset().left - this.tileSource.tileWidth - 15)
                return true;
            else
                return false;
        };
        return DrawMaps;
    })();
    Wijmap.DrawMaps = DrawMaps;
})(Wijmap || (Wijmap = {}));
//# sourceMappingURL=drawing.js.map
