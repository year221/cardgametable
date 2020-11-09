import Phaser from './phaser.js'

export default class CardZone extends Phaser.GameObjects.Rectangle
{
    zone_id;
    constructor(scene, x, y, width, height, fillColor, zone_id) {
        super(scene, x, y, width, height, fillColor);
        this.zone_id = zone_id;
        this.setInteractive();
        this.input.dropZone = true;
    }
}