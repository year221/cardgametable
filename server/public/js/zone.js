import Phaser from './phaser.js';

export default class CardZone extends Phaser.GameObjects.Rectangle
{
    zone_id;   
    _sinR;
    _cosR;
    delta_x = 30;
    delta_y = 20;
    boundary_width;
    boundary_height
    local_display = false;
    constructor(scene, x, y, width, height, fillColor, zone_id, boundary_width, boundary_height) {
        super(scene, x, y, width, height, fillColor);
        this.zone_id = zone_id;
        //this.local_display = local_display;
        this.set_local_display(true);
        // if (this.local_display){
        //     this.setInteractive();  
        //     this.input.dropZone = true;     
        // } else {
        //     this.visible = false;
        //     this.active = false;
        // }
        this._sinR=0;
        this._cosR=1;   
        this.boundary_width=boundary_width;
        this.boundary_height=boundary_height;
    }

    set_zone_angle(angle){
        this.angle = angle;
        this._sinR=Math.sin(this.rotation);
        this._cosR=Math.cos(this.rotation);
        return this;
    }
    calculate_xy_from_pos(pos_in_zone, card_width){        

        //var sin_rotation = Math.sin(this.rotation);
        //var cos_rotation = Math.cos(this.rotation);

        const x0 = pos_in_zone * this.delta_x - this.width/2+ this.boundary_width;
        const y0 = -this.height/2+ this.boundary_height;//pos_in_zone * this.delta_y;        
        //const x1 = x0*cos_rotation + y0*sin_rotation;
        //const y1 = x0*sin_rotation - y0*cos_rotation;
        return {
            x:x0*this._cosR + y0*this._sinR+this.x, 
            y:-x0*this._sinR + y0*this._cosR+this.y,
        }
    }

    highlight(value){
        this.isStroked=value;   
    }    

    set_local_display(value){
        // hide zone from local display
        this.local_display=value;
        if (value){
            this.active=true;
            this.setInteractive();
            this.input.dropZone = true; 
            //this.scene.input.setDraggable(this);                     
            this.visible=true;
        } else {
            //this.scene.input.setDraggable(this, false);         
            this.input.dropZone = false; 
            this.scene.input.disable(this);            
            this.visible=false;
            this.active=false;            
        }
    }    
}