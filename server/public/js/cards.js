import Phaser from './phaser.js'

export default class Card extends Phaser.GameObjects.Sprite
{
    card_id;
    zone_id;

    constructor(scene, x, y, texture, frame, card_id, zone_id) {
        console.log(frame)  
        super(scene, x, y, texture, frame);
        this.setInteractive();        
        this.card_id = card_id;
        this.zone_id = zone_id;
        scene.input.setDraggable(this);
    }
}