import Phaser from './phaser.js';

export const ZoneDisplayType = {'visible':0, 'back_only':1, 'non_visible':2}
export class CardZone extends Phaser.GameObjects.Rectangle
{
    zone_id;   
    _sinR;
    _cosR;
    card_scale;
    card_step_x;
    card_step_y;
    max_num_cards_per_row;
    boundary_width;
    boundary_height
    local_display;
    constructor(scene, x, y, width, height, fillColor, zone_id, boundary_width, boundary_height, card_step_x, card_step_y, card_scale, local_display) {
        super(scene, x, y, width, height, fillColor);
        this.zone_id = zone_id;
        //this.local_display = local_display;
        
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
        this.card_step_x=card_step_x;
        this.card_step_y=card_step_y;
        this.card_scale=card_scale;
        
        this.max_num_cards_per_row = Math.floor((this.width- this.boundary_width*2)/this.card_step_x)+1;
        this.setData('card_ids', []);
       
        if (local_display===undefined){
            local_display=0;
        }
        this.set_local_display(local_display);  
    }

    set_zone_angle(angle){
        this.angle = angle;
        this._sinR=Math.sin(this.rotation);
        this._cosR=Math.cos(this.rotation);
        return this;
    }
    calculate_xy_from_pos(pos_in_zone){        

        //var sin_rotation = Math.sin(this.rotation);
        //var cos_rotation = Math.cos(this.rotation);
        
        const x0 = (pos_in_zone%this.max_num_cards_per_row) * this.card_step_x - this.width/2+ this.boundary_width;
        const y0 = Math.floor(pos_in_zone/this.max_num_cards_per_row) * this.card_step_y -this.height/2+ this.boundary_height;//pos_in_zone * this.delta_y;        
        
        //const x1 = x0*cos_rotation + y0*sin_rotation;
        //const y1 = x0*sin_rotation - y0*cos_rotation;
        return {
            x:x0*this._cosR + y0*this._sinR+this.x, 
            y:-x0*this._sinR + y0*this._cosR+this.y,
        }
    }

    highlight_dropzone(value){
        this.isStroked=value;   
    }    

    set_local_display(value){
        // hide zone from local display
        this.local_display=value;
        if (this.local_display==0){
            //this.active=true;
            this.setInteractive();
            this.input.dropZone = true; 
            //this.scene.input.setDraggable(this);                     
            this.visible=true;
        } else if (this.local_display==2){
            //this.scene.input.setDraggable(this, false);         
            //this.input.dropZone = false; 
            if (this.input!==null){
                this.scene.input.disable(this);            
            }
            this.visible=false;
            //this.active=false;            
        } else if (this.local_display==1){
            //this.scene.input.setDraggable(this, false);         
            //this.input.dropZone = false; 
            if (this.input!==null){
                this.scene.input.disable(this);            
            }
            this.visible=true;
            //this.active=true;            
        }
    }    
}

export function calculate_circular_zone_xy(
    starting_x, starting_y, step_x, step_y, n_zones, n_row
    ){
    // calculate card position for a circular arrangement
    if (n_row===undefined){
        n_row=2;
    }
    if (n_row!=2){
        console.error('Currently only support n_row==2');
    } // TODO: update with additional n_row support
    let zone_xy = []
    /* the pattern is as follows:
    1 zone: 1
    2 zones: 1 1
    3 zones: 1 2
    4 zones: 1 3
    5 zones: 3 2
    6 zones: 3 3
    7 zones: 3 4
    8 zones: 5 3
    9 zones: 5 4
    10 zones: 5 5
    11 zones: 5 6
    12 zones: 7 5
    */
    const first_row = Math.ceil (n_zones/4)*2-1;
    const second_row = n_zones - first_row; 
    for (let i =0; i<Math.ceil(first_row/2); i++){
        zone_xy.push({
            'x': starting_x + step_x*i,
            'y': starting_y
        });        
    }
    for (let i = 0; i< second_row; i++){
        zone_xy.push({
            'x': starting_x + (second_row-1)/2 * step_x - step_x*i,
            'y': starting_y + step_y,
        });        
    }
    for (let i = 0; i<Math.floor(first_row/2); i++){
        zone_xy.push({
            'x': starting_x - (first_row-1)/2 * step_x + step_x*i,
            'y': starting_y,
        });
    }
    return zone_xy;
}