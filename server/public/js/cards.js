import Phaser from './phaser.js'

export default class Card extends Phaser.GameObjects.Sprite
{
    card_id;
    zone_id;
    pos_in_zone;
    _frame_down;
    _frame_up;
    _face_up;        

    constructor(scene, x, y, texture, frame, frame_face_down, card_id) {
        console.log(frame)  
        super(scene, x, y, texture, frame);
        this.card_id = card_id;        
        this._frame_down=frame_face_down;
        this._frame_up = frame;
        this._face_up = true;        
        this.setInteractive();        
        scene.input.setDraggable(this);               
    }

    get face_up(){
        return this._face_up;
    }

    set face_up(new_face_up_value){
        this._face_up = new_face_up_value;
        if (this._face_up){
            this.setFrame(this._frame_up)
        } else {
            this.setFrame(this._frame_down)
        }
    }

    get_card_status(){
        return {
            zone_id:this.zone_id,
            pos_in_zone:this.pos_in_zone,            
            face_up: this._face_up
        }
    }
}