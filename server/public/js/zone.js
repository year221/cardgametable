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
    constructor(scene, x, y, width, height, fillColor, zone_id, boundary_width, boundary_height) {
        super(scene, x, y, width, height, fillColor);
        this.zone_id = zone_id;
        this.setInteractive();
        this.input.dropZone = true;     
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

    // unlink_cards(card_id_arr){
    //     // unlink this card from the zone. Note that this does NOT remove the card from display.
    //     card_id_arr.forEach(function(card_id){
    //         this.cards.delete(card_id);            
    //     }
    // }

    // get_max_pos(){
    //     // loop through cards and record their position
    //     if (this.cards.size==0){
    //         return -1
    //     } else {
    //         return Math.max(...this.cards.values());
    //     }        
    // }

    // squeeze_cards(all_cards){
    //     if (this.max_pos+1!=this.cards.size){

    //     }
    // }
    // add_cards(card_id_arr, all_cards){
    //     let new_pos = this.get_max_pos();
    //     card_id_arr.forEach(function(card_id){
    //         new_pos ++;
    //         this.cards.set(card_id, new_pos);
    //         new_xy = this.calculate_xy_from_pos(new_pos);
    //         all_cards.get(card_id).set_zone_id(this.zone_id).setPosition(new_xy.x, new_xy.y).setRotation(this.rotation).setDepth(new_pos+1);
    //     }        
    // }        
}