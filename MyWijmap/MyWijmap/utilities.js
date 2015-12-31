var Wijmap;
(function (Wijmap) {
    (function (KeyValue) {
        KeyValue[KeyValue["LEFT"] = 37] = "LEFT";
        KeyValue[KeyValue["UP"] = 38] = "UP";
        KeyValue[KeyValue["RIGHT"] = 39] = "RIGHT";
        KeyValue[KeyValue["DOWN"] = 40] = "DOWN";
        KeyValue[KeyValue["PLUS"] = 45] = "PLUS";
        KeyValue[KeyValue["MINUS"] = 43] = "MINUS";
    })(Wijmap.KeyValue || (Wijmap.KeyValue = {}));
    var KeyValue = Wijmap.KeyValue;

    var Utilities = (function () {
        function Utilities() {
        }
        //获得zoom下的最大右边界值
        Utilities.getMaxBlockX = function (zoom) {
            return Math.round(Math.pow(2, zoom)) - 1;
        };

        //获得zoom下的最大下边界值
        Utilities.getMaxBlockY = function (zoom) {
            return Math.round(Math.pow(2, zoom)) - 1;
        };

        //判断奇偶性 true 为偶， false 为奇
        Utilities.getParity = function (num) {
            if ((num % 2) === 0)
                return true;
            return false;
        };
        return Utilities;
    })();
    Wijmap.Utilities = Utilities;
})(Wijmap || (Wijmap = {}));
//# sourceMappingURL=utilities.js.map
