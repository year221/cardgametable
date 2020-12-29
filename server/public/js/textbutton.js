import Phaser from './phaser.js';

export class TextButton extends Phaser.GameObjects.Text
{
    params={};
    constructor(scene, x, y, text, style){
        if ((style===undefined) || (style===null)){
            style = {color:'#eee',
            backgroundColor: '#0275d8',//''#666',  
            padding: {x:3,y:3},
            fontSize:'12px'}                  
        }
        super(scene, x, y, text, style);
    }

    // highlight(value){
    //     switch (value)
    //     if (value==1){
    //         this.setBackgroundColor('#025aa5');
    //         //this.setTint(0x888888);
    //     } else if (value==0){
    //         this.setBackgroundColor('#0275d8');
    //         //this.clearTint();
    //     }
    // }    

    add_listener_to_scene(){
        this.on('pointerover', function(pointer, localX, localY, event){               
            this.setBackgroundColor('#025aa5'); 
        });  
        this.on('pointerout', function(pointer, localX, localY, event){               
            this.setBackgroundColor('#0275d8');
        });  
        this.on('pointerdown', function(pointer, localX, localY, event){                  
            this.setBackgroundColor('#014682'); 
        });       
        this.on('pointerup', function(pointer, localX, localY, event){                  
            this.setBackgroundColor('#025aa5'); 
        });                         
        this.setInteractive({ useHandCursor: true });
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
        super.add_listener_to_scene();
        this.on('pointerdown', function(pointer, localX, localY, event){            
            const sorted_card_ids = sort_cards(this.scene.cards_in_zones.get(this.target_zone_id), this.sort_key_array);            
            //sorted_card_ids.sort((a,b)=>sort_key_array.indexOf(a.split('_')[0])-sort_key_array.indexOf(b.split('_')[0]));     
            this.scene.action_move_cards(this.target_zone_id, this.target_zone_id, sorted_card_ids, null);
            event.stopPropagation()
        });        
        //this.setInteractive();        
    }    
}

export class FlipButton extends TextButton
{
    flip_type;
    target_zone_id;
    constructor(scene, button_cfg){
        super(scene,button_cfg['x'], button_cfg['y'], button_cfg['text'], button_cfg['style'])    
        switch (button_cfg['flip_type']){
            case undefined:
                this.flip_type = null;
                break;
            case 'FlipSide':
                this.flip_type = null;
                break;
            case 'FaceUp':
                this.flip_type = true;
                break;
            case 'FaceDown':
                this.flip_type = false;
                break;
        }                
        this.name = button_cfg['name']
        this.target_zone_id = button_cfg['zone_id']            
    }

    add_listener_to_scene(){
        super.add_listener_to_scene();
        this.on('pointerdown', function(pointer, localX, localY, event){            
            this.scene.action_flip_cards_in_a_zone(this.target_zone_id, this.flip_type);
            event.stopPropagation()
        });        
        //this.setInteractive();        
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
        super.add_listener_to_scene();
        this.on('pointerdown', function(pointer, localX, localY, event){ 

            let card_ids = Array.from(this.scene.cards_in_zones.get(this.src_zone_id));
            if (this.n_card_to_move !=undefined){
                card_ids = card_ids.slice(-Math.floor(this.n_card_to_move));   
            }            
            this.scene.action_move_cards(this.src_zone_id, this.dst_zone_id, card_ids, this.target_position);
            event.stopPropagation()
        });        
        //this.setInteractive();        
    }    
}




export class ScoreText extends Phaser.GameObjects.Text
{    
    target_zone_id;
    score_type;
    score_map;
    constructor(scene, button_cfg){
        super(scene,button_cfg['x'], button_cfg['y'], button_cfg['text'], button_cfg['style'])            
        this.name = button_cfg['name']
        this.button_text = button_cfg['text']
        this.target_zone_id = button_cfg['zone_id']            
        this.score_type = button_cfg['score_type']            
        this.score_map = button_cfg['score_map']        
    }

    update_score(card_ids){
        let score = 0;
        if (this.score_type == 'count'){
            score=card_ids.length
        } else {
            for (let card_id of card_ids){
                const card_score = this.score_map[card_id.split('_')[0]];
                if (card_score!==undefined){
                    score += card_score;
                }
            }            
        }
        return score
                
    }    
    add_listener_to_scene(){
        const zone = this.scene.all_zones.get(this.target_zone_id);
        this.text=this.button_text + String(this.update_score(zone.data.get('card_ids')));
        zone.on('changedata-card_ids', function(parent, value, previousValue){            
            console.log('data card_ids changed');
            this.text=this.button_text + String(this.update_score(value));
        }, this);   
        zone.on('setdata-card_ids', function(parent, value, previousValue){            
            console.log('data card_ids set');
            this.text=this.button_text + String(this.update_score(value));
        }, this);                         
    }    
}

export class PlayerName extends Phaser.GameObjects.Text
{    
    leading_text
    player_id
    constructor(scene, button_cfg){
        super(scene,button_cfg['x'], button_cfg['y'], button_cfg['text'], button_cfg['style'])            
        this.leading_text = button_cfg['text'];
        this.name = button_cfg['name']        
        this.player_id = parseInt(button_cfg['player_id']);
    }

    extract_player_name(player_info){
        if (player_info===undefined){
            return '';
        } else {
            const player_names = player_info.filter(player=>parseInt(player.player_id)==this.player_id)
                
            if (player_names.length==0){         
                return 'Disconnected'                       
            } else {
                return player_names[0].player_name;            
            }       
        }             
    }    
    add_listener_to_scene(){        
        this.text=this.leading_text + this.extract_player_name(this.scene.registry.get('playerinfo'));
        this.scene.registry.events.on('changedata-playerinfo', function(parent, value, previousValue){            
            console.log('player name changed');
            this.text=this.leading_text + this.extract_player_name(value);
        }, this);   
        this.scene.registry.events.on('setdata-playerinfo', function(parent, value, previousValue){            
            console.log('data card_ids set');
            this.text=this.leading_text + this.extract_player_name(value);            
        }, this);                     
    }    
}

export class SimpleEventButton extends TextButton
{    
    event_handler;
    constructor(scene, button_cfg, event_handler){
        super(scene,button_cfg['x'], button_cfg['y'], button_cfg['text'], button_cfg['style'])            
        this.name = button_cfg['name']
        this.event_handler=event_handler;//.bind(scene);        
    }

    add_listener_to_scene(){
        super.add_listener_to_scene();
        this.on('pointerdown', function(pointer, localX, localY, event){ 
            this.event_handler();
            event.stopPropagation()
        });        
        //this.setInteractive();        
    }    
}

export function addInputText(scene, cfg){        
        const text_cfg = Object.assign(
            {text: cfg['text'],
            type:cfg['input_type']},
            cfg['style'])

        const textinput = scene.add.rexInputText(
            cfg['x'], cfg['y'], cfg['width'], cfg['height'],
            text_cfg);

        textinput.name = cfg['name'];
        scene.ui_elements.set(textinput.name, textinput);
        textinput.on('textchange', function(inputText, e){ 
            this.socket.emit('uiElementTextSync', inputText.name, inputText.text);
        }, scene);  
        return textinput        
}
const shuffle_array_in_place = function(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
  
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
export function addNewDeck(scene, cfg){

    const label_text = scene.add.text(
        cfg.x+cfg.label.offset_x,
        cfg.y+cfg.label.offset_y, 
        cfg.label.text,
        {fontSize:'12px'});
    scene.ui_elements.set(cfg.name+'_label', label_text)

    const num_deck_selector = scene.add.rexInputText(
        cfg.x+cfg.input.offset_x,
        cfg.y+cfg.input.offset_y,                    
        cfg.input.width, cfg.input.height,
        {
        type: 'number',
        text: cfg.input.default,
        fontSize: '12px',
        }
    );
    num_deck_selector.name = cfg.name+'_numdeckinput';
    scene.ui_elements.set(num_deck_selector.name, num_deck_selector);
    num_deck_selector.on('textchange', function(inputText){ 
        this.socket.emit('uiElementTextSync', inputText.name, inputText.text);
    }, scene);                

    const all_card_ids_in_a_deck  = Array.from(cfg['all_card_ids_in_a_deck']);
    const dst_zone_id = cfg['dst_zone_id']
    const shuffle = cfg['shuffle']
    if (shuffle===undefined){
        shuffle = true;
    }
    let generate_card = function(){
        const n_decks = Math.round(num_deck_selector.text);       
        let max_deck_num = Math.max(...Array.from(this.all_cards.keys()).map(card_id=> card_id.split('_')[1]));
        if (max_deck_num<0){max_deck_num=-1;}       
        let card_id_generated = [];

        for (let i=max_deck_num+1; i<=max_deck_num+n_decks; i++){
          const str_i = String(i);        
          card_id_generated=card_id_generated.concat(all_card_ids_in_a_deck.map(card_proto => card_proto+'_'+str_i));                  
        }
        if (shuffle){
            shuffle_array_in_place(card_id_generated); 
        }
        let card_status = {};
        for (const card_id of card_id_generated){
            card_status[card_id] = false;
        }        
        
        this.last_event_index ++;            
        this.event_buffer.set(this.last_event_index, {'name':'addNewCard', 'parameters':[dst_zone_id, card_id_generated, card_status, true]});                        
        this.socket.emit('addNewCard', this.last_event_index, dst_zone_id, card_id_generated, card_status, true);                           
    };

    const generate_button = new SimpleEventButton(
        scene, 
        {
            x: cfg.x,
            y: cfg.y,
            text: cfg.button.text,
            name : cfg.name + '_submitbutton',
        },
        generate_card.bind(scene),
        );  
    scene.add.existing(generate_button);   
    scene.ui_elements.set(generate_button.name, generate_button);          
    generate_button.add_listener_to_scene();
}


export function addNewDealer(scene, group_cfg){

    const button = scene.add.existing(new TextButton(
        scene, group_cfg['x'], group_cfg['y'], group_cfg.button.text, group_cfg.button['style']              
    ));        
    
    button.name = group_cfg.name + '_submitbutton';    
    scene.ui_elements.set(button.name, button);                
    //element_grp['elements'].push(button)         
    button.params['move_card_cfg'] = [];  
    
    let cfg_count = 0;
    for (let cfg of group_cfg.move_card_cfg){                    
        if (cfg.type=='ui'){        

            const text_label = scene.add.text(group_cfg.x+cfg.label.offset_x,
                    group_cfg.y+cfg.label.offset_y,
                    cfg.label.text, {fontSize:'12px'});
            text_label.name =  group_cfg.name + '_g'+ String(cfg_count) + '_label';    
            scene.ui_elements.set(text_label.name, text_label);                          
            const num_selector = scene.add.rexInputText(
                group_cfg.x+cfg.input.offset_x,
                group_cfg.y+cfg.input.offset_y,
                40, 20,
                {
                type: 'number',
                text: String(cfg.input.default),
                fontSize: '12px',
                }
            );
            num_selector.name = group_cfg.name + '_g'+ String(cfg_count) +'_numselect';
            scene.ui_elements.set(num_selector.name, num_selector);      
            num_selector.on('textchange', function(inputText){ 
                scene.socket.emit('uiElementTextSync', inputText.name, inputText.text);
                }, scene);                                                                        
            //element_grp['elements'].push(num_selector);                           
            if (cfg.dst_zone_type == 'zone_group'){
                const dst_zone_ids = scene.find_zone_group(cfg.dst_zone_group_name);
                for (let zone_id of dst_zone_ids){
                    button.params['move_card_cfg'].push(
                        {
                            type: 'ui',
                            src_zone_id: cfg.src_zone_id,
                            dst_zone_id: zone_id,
                            textbox: num_selector,
                        }
                    )
                }
            } else if (cfg.dst_zone_type == 'zone'){
                button.params['move_card_cfg'].push(
                    {
                        type: 'ui',
                        src_zone_id: cfg.src_zone_id,
                        dst_zone_id: cfg.dst_zone_id,
                        textbox: num_selector,
                    }
                )                            
            }
        } else if (cfg.type=='fixed'){
            button.params['move_card_cfg'].push(
                {
                    type: 'fixed',
                    src_zone_id: cfg.src_zone_id,
                    dst_zone_id: cfg.dst_zone_id,
                    textbox: num_selector,
                }
            )            

        }
        cfg_count ++;
    }
    button.add_listener_to_scene();
    
    button.on('pointerdown', function(pointer, localX, localY, event){   
        const button_param = this.params;         
        const scene = this.scene;
        for (let cfg of button_param.move_card_cfg){                                 
            let card_ids = [];
            if (cfg.type == 'all'){
                card_ids = Array.from(scene.cards_in_zones.get(cfg.src_zone_id));

            } else if (cfg.type=='fixed'){
                card_ids = scene.cards_in_zones.get(cfg.src_zone_id).slice(-Math.floor(cfg.num_of_card));                            
            } else if (cfg.type=='ui'){
                const num_of_cards = Math.round(cfg.textbox.text);              
                //card_ids = Array.from(self.cards_in_zones.get(cfg.src_zone_id).slice(-num_of_cards));
                if (num_of_cards<=0){
                    card_ids = [];
                } else {
                    card_ids = scene.cards_in_zones.get(cfg.src_zone_id).slice(-num_of_cards);                            
                }
            }                        
            //console.log('move cards', cfg.dst_zone_id, card_ids);
            //console.log('before move', self.all_zones.get(cfg.dst_zone_id).data.values);
            if (card_ids.length >0){
                scene.move_cards(cfg.src_zone_id, cfg.dst_zone_id, card_ids);
                //console.log('past move', self.all_zones.get(cfg.dst_zone_id).data.values);
                scene.last_event_index ++;
                scene.event_buffer.set(scene.last_event_index, {'name':'cardMoved', 'parameters':[cfg.src_zone_id, cfg.dst_zone_id, card_ids]});                                                
                scene.socket.emit('cardMoved',  scene.last_event_index, cfg.src_zone_id, cfg.dst_zone_id, card_ids,  null);                                
            }
        } 
        event.stopPropagation()
    });          

    
    button.setInteractive();
}                