import Phaser from './phaser.js';

export class TextButton extends Phaser.GameObjects.Text
{
    params={};
    constructor(scene, x, y, text, style){
        if ((style===undefined) || (style===null)){
            style = {color:'#0f0', backgroundColor: '#666',fontSize:'12px'}                  
        }
        super(scene, x, y, text, style);
    }

    highlight(value){
        if (value==1){
            this.setTint(0x888888);
        } else if (value==0){
            this.clearTint();
        }
    }        
}



function sort_cards(card_ids, sort_key_array){
    const sorted_card_ids = Array.from(card_ids);        
    sorted_card_ids.sort((a,b)=>sort_key_array.indexOf(a.split('_')[0])-sort_key_array.indexOf(b.split('_')[0]));     
    return sorted_card_ids;      
}



export class SortButton extends TextButton
{
    sort_key_array;
    target_zone_id;
    constructor(scene, button_cfg){
        super(scene,button_cfg['x'], button_cfg['y'], button_cfg['text'], button_cfg['style'])    
        this.sort_key_array = button_cfg['sort_key_array']
        this.name = button_cfg['name']
        this.target_zone_id = button_cfg['zone_id']            
    }

    add_listener_to_scene(){
        this.on('pointerdown', function(pointer, localX, localY, event){            
            const sorted_card_ids = sort_cards(this.scene.cards_in_zones.get(this.target_zone_id), this.sort_key_array);            
            //sorted_card_ids.sort((a,b)=>sort_key_array.indexOf(a.split('_')[0])-sort_key_array.indexOf(b.split('_')[0]));     
            this.scene.action_move_cards(this.target_zone_id, this.target_zone_id, sorted_card_ids, null);
            event.stopPropagation()
        });        
        this.setInteractive();        
    }    
}


export class MoveCardButton extends TextButton
{    
    src_zone_id;
    dst_zone_id;
    n_card_to_move;
    target_position;
    constructor(scene, button_cfg){
        super(scene,button_cfg['x'], button_cfg['y'], button_cfg['text'], button_cfg['style'])            
        this.name = button_cfg['name']
        this.src_zone_id = button_cfg['src_zone_id']            
        this.dst_zone_id = button_cfg['dst_zone_id']            
        this.n_card_to_move = button_cfg['n_card_to_move']
        this.target_position = button_cfg['target_position']
    }

    add_listener_to_scene(){
        this.on('pointerdown', function(pointer, localX, localY, event){ 

            let card_ids = Array.from(this.scene.cards_in_zones.get(this.src_zone_id));
            if (this.n_card_to_move !=undefined){
                card_ids = card_ids.slice(-Math.floor(this.n_card_to_move));   
            }            
            this.scene.action_move_cards(this.src_zone_id, this.dst_zone_id, card_ids, this.target_position);
            event.stopPropagation()
        });        
        this.setInteractive();        
    }    
}