import Phaser from './phaser.js';

export class TextButton extends Phaser.GameObjects.Text
{
    params={};
    constructor(scene, x, y, text, style){
        super(scene, x, y, text, style);
    }

    set_zone_angle(angle){
        this.angle = angle;
        this._sinR=Math.sin(this.rotation);
        this._cosR=Math.cos(this.rotation);
        return this;
    }

    highlight(value){
        if (value==0){
            this.setStroke('#0f0')
        } else if (value==1){
            this.setStroke('#066')
        }
    }        
}