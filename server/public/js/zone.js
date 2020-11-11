import Phaser from './phaser.js'

export default class CardZone extends Phaser.GameObjects.Rectangle
{
    zone_id;
    delta_x = 30;
    delta_y = 20;
    constructor(scene, x, y, width, height, fillColor, zone_id) {
        super(scene, x, y, width, height, fillColor);
        this.zone_id = zone_id;
        this.setInteractive();
        this.input.dropZone = true;
    }

    calculate_xy_from_pos(pos_in_zone){        

        var sin_rotation = Math.sin(this.rotation);
        var cos_rotation = Math.cos(this.rotation);

        const x0 = pos_in_zone * this.delta_x;
        const y0 = 0;//pos_in_zone * this.delta_y;        
        //const x1 = x0*cos_rotation + y0*sin_rotation;
        //const y1 = x0*sin_rotation - y0*cos_rotation;
        return {
            x:x0*cos_rotation + y0*sin_rotation+this.x,
            y:-x0*sin_rotation + y0*cos_rotation+this.y,
        }
    }
    
}