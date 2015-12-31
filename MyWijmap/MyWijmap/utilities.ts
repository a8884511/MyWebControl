

module Wijmap {
    export enum KeyValue { LEFT= 37, UP= 38, RIGHT= 39, DOWN= 40, PLUS= 45, MINUS=43 }


    export class Utilities {
        //获得zoom下的最大右边界值
        public static getMaxBlockX(zoom: number): number {
            return Math.round(Math.pow(2, zoom)) - 1;
        }

        //获得zoom下的最大下边界值
        public static getMaxBlockY(zoom: number): number {
            return Math.round(Math.pow(2, zoom)) - 1;
        }

        //判断奇偶性 true 为偶， false 为奇
        public static getParity(num: number): boolean {
            if ((num % 2) === 0)
                return true;
            return false;
        }
    }
}
