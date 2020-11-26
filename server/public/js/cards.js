import Phaser from './phaser.js'

export class Card extends Phaser.GameObjects.Sprite
{
    card_id;
    zone_id;
    _frame_down;
    _frame_up;
    _face_up;
    _local_display;      
    //_drag_start_depth;        

    constructor(scene, x, y, texture, frame, frame_face_down, card_id) {
        //console.log(frame)  
        super(scene, x, y, texture, frame);
        this.card_id = card_id;        
        this._frame_down=frame_face_down;
        this._frame_up = frame;
        this._face_up = true;        
        this.zone_id = null;
        this.set_local_display(0);
        //this.setInteractive();        
        //scene.input.setDraggable(this);               
    }

    get face_up(){
        return this._face_up;
    }

    set face_up(new_face_up_value){
        if (this.face_up !== new_face_up_value){
            this._face_up = new_face_up_value;
            this.update_frame();
        }
    }

    update_frame(){
        if ((this._face_up) && this._local_display==0){
            this.setFrame(this._frame_up)
        } else {
            this.setFrame(this._frame_down)
        }        
    }

    flip_face(){
        this.face_up = !this.face_up;
    }

    set_zone_id(zone_id){
        this.zone_id=zone_id;
        return this;
    }

    set_local_display(value){
        // set card to be invisible and not manipulatible. 
        this._local_display = value;
        if (value==0){
            //this.active=true;
            this.setInteractive();
            this.scene.input.setDraggable(this);                     
            this.visible=true;
            this.update_frame();
        } else if (value==2){
            //if (!(this.scene.input ===undefined)){
            if (this.input!==null){                
            //    this.scene.input.setDraggable(this, false);         
                this.scene.input.disable(this);
            }
            this.visible=false;
            //this.active=false;  
            //this.update_frame();          
        } else if (value==1){
            //if (!(this.scene.input ===undefined)){
            if (this.input!==null){                
            //    this.scene.input.setDraggable(this, false);         
                this.scene.input.disable(this);
            }
            this.visible=true;
            //this.active=true;  
            this.setFrame(this._frame_down);      
        }
    }
}


function card_id_to_frame(card_id){    
    return card_id.split('_')[0];
}


export class PokerCard extends Card{
    constructor(scene, x, y, texture, card_id) {         
        const frame = card_id_to_frame(card_id);              
        super(scene, x, y, texture, card_id_to_frame(card_id), 'back', card_id);              
    }
}