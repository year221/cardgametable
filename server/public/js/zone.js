import Phaser from './phaser.js'

export default class CardZone extends Phaser.GameObjects.Rectangle
{
    zone_id = "ab";
    constructor(scene, x, y, width, height, fillColor, fillAlpha) {
        super(scene, x, y, width, height, fillColor, fillAlpha);
        this.setInteractive();
        this.input.dropZone = true;
    }
}