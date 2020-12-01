import Phaser from './phaser.js';
import {CardZone, calculate_circular_zone_xy} from './zone.js';
import {PokerCard, Card} from './cards.js';
import {TextButton} from './textbutton.js';

export default class Game extends Phaser.Scene
{
    //player_id='0';
    n_active_player;
    all_zones;
    all_cards;
    ui_elements;
    zone_linked_update;
    cards_in_zones;
    event_buffer;
    last_event_index;


    input_text;
    // temporary card holdlers to deal to multiple ard select and drag.
    activated_cards;    
    to_be_deactivate_upon_pointer_up;

    // multi selection
    on_multiple_selection;  
    selection_box;
    new_selected_cards;

    dragging_cache_param={
        starting_depth:500,
        step_x:0,
        step_y:0,
        offset_x:0,
        offset_y:0,
    }
    
    score_map = {
        'C5': 5, 'D5': 5, 'S5':5, 'H5':5,
        'C10': 10, 'D10': 10, 'S10':10, 'H10':10,
        'CK': 10, 'DK': 10, 'SK':10, 'HK':10,
    }
	constructor()
	{
        super('Game')
        this.all_zones = new Map();
        this.all_cards = new Map();
        this.cards_in_zones = new Map();
        this.ui_elements = new Map();
        this.event_buffer = new Map();
        this.last_event_index=-1;
        //this.primary_card = null;        
        this.on_multiple_selection=false;
        //this.zone_id_of_activated_cards=null;
        this.to_be_deactivate_upon_pointer_up=[];
        this.tint_color_for_activated_card = 0xa0a0ff;
        this.previous_empty_click=false;
        this.socket = window.Client.socket;
        this.zone_linked_update = new Map();

        
        
    }
    preload()
    {
        this.load.atlas('cards', 'assets/cards.png', 'assets/cards.json');
        this.load.json('layout', 'assets/games/seekingfriends.json');
        //this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);           
        if (this.plugins.get('rexinputtextplugin', false)===null){
            this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);               
        }            
    }
    create()
    {
        console.log("run scene creation for game")
        var self = this;
        
        this.activated_cards = this.add.group();
        this.new_selected_cards =this.add.group();
        //this.to_be_deactivate_upon_pointer_up = this.add.group();
        // configuration
        this.input.dragDistanceThreshold=5;
        this.selection_box = this.add.rectangle(0, 0, 0, 0, 0x1d7196, 0.4);
        //this.selection_box.strokeColor = 0xffffff;
        //this.selection_box.isStroked=true;
        //this.selection_box.isFilled=false;
        // sample card and zone placement 
        const card_width=140;
        const card_height=190;

        const flip_button = this.add.text(400,265, 'FLIP Selected Card', {color:'#0f0', backgroundColor: '#666', fontSize:'12px'});
        flip_button.setInteractive();
        flip_button.on('pointerdown', function(){
            const all_activated_cards = self.activated_cards.getChildren();
            all_activated_cards.forEach(card=>{card.flip_face();card.set_activated(false);});   
            //self.flip_cards(all_activated_cards);   
            //all_activated_cards.forEach(card=> {card.set_activated(false);});
            const card_ids=all_activated_cards.map(card => card.card_id);            
            self.last_event_index ++;
            self.event_buffer.set(self.last_event_index, {'name':'cardFlipped', 'parameters':[card_ids]});                                                
            self.socket.emit('cardFlipped', self.last_event_index, card_ids);                                            
            self.activated_cards.clear();               
        });

        const deselect_button = this.add.text(300,265, 'Deselect', {color:'#0f0', backgroundColor: '#666', fontSize:'12px'});
        deselect_button.setInteractive();
        deselect_button.on('pointerdown', function(){
            const all_activated_cards = self.activated_cards.getChildren();
            all_activated_cards.forEach(card=>{card.set_activated(false)});                
            self.activated_cards.clear();  
            while (self.to_be_deactivate_upon_pointer_up.length>0){
                self.to_be_deactivate_upon_pointer_up.pop();     
            }                            
        });       

                

        if (Math.floor(Client.player_id)>=0){
            const flip_all_button = this.add.text(100,265, 'FLIP ALL', {color:'#0f0', backgroundColor: '#666', fontSize:'12px'});
            flip_all_button.setInteractive();
            flip_all_button.on('pointerdown', function(){
                const zone_id = 'Hand_'+ Client.player_id;
                const card_ids = self.cards_in_zones.get(zone_id);
                self.flip_cards_by_id(card_ids);                        
                self.last_event_index ++;
                self.event_buffer.set(self.last_event_index, {'name':'cardFlipped', 'parameters':[card_ids]});                                                
                self.socket.emit('cardFlipped', self.last_event_index, card_ids);        
            });       

            const sort_button = this.add.text(0, 265, 'SORT', {color:'#0f0', backgroundColor: '#666', fontSize:'12px' });
            sort_button.setData('sort_key_array', [
                'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'CJ', 'CQ', 'CK', 'CA',
                'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'DJ', 'DQ', 'DK', 'DA',
                'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'SJ', 'SQ', 'SK', 'SA',
                'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'HJ', 'HQ', 'HK', 'HA',
                'J1', 'J2'                        
            ]);
            sort_button.setInteractive();
            sort_button.on('pointerdown', function(pointer){            
                //self.sort_cards_in_zone('Hand_'+ Client.player_id);
                const zone_id = 'Hand_'+ Client.player_id;

                const card_ids = self.cards_in_zones.get(zone_id);
                const sorted_card_ids = self.sort_cards(card_ids, this.getData('sort_key_array'));

                //this.cards_in_zones.set(zone_id, sorted_card_ids);
                
                self.move_cards(zone_id, zone_id, sorted_card_ids);
                //this.update_cards_in_zone(zone_id);
                self.last_event_index ++;
                self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[zone_id, zone_id, sorted_card_ids]});                                                
                self.socket.emit('cardMoved',  self.last_event_index, zone_id, zone_id, sorted_card_ids,  null);  
            });
        }

        this.input.on('dragstart', function (pointer, gameObject) {
            // cache starting depth so that we could return it to its depth
            //gameObject._drag_start_depth = gameObject.depth;            
            
            const rotation = gameObject.rotation;
            const zone_of_object = self.all_zones.get(gameObject.zone_id);
            const all_activated_cards = self.activated_cards.getChildren();
            const scaleX= gameObject.scaleX;
            const scaleY = gameObject.scaleY;            
            for (let card of all_activated_cards){
                card.rotation = rotation;
                card.setScale(scaleX, scaleY);
            }  
            //self.children.bringToTop(all_activated_cards[0]);              
            const index_pos_primary_card = all_activated_cards.indexOf(gameObject);

            //console.log('scaleX', 'scaleY', scaleX, scaleY);
            const _sinR=Math.sin(rotation);
            const _cosR=Math.cos(rotation);            
            self.dragging_cache_param.step_x = zone_of_object.card_step_x*_cosR;// + zone_of_object.card_step_y*_sinR;
            self.dragging_cache_param.step_y = -zone_of_object.card_step_x*_sinR;// + zone_of_object.card_step_y*_cosR;            
            self.dragging_cache_param.offset_x = -index_pos_primary_card*self.dragging_cache_param.step_x;
            self.dragging_cache_param.offset_y = -index_pos_primary_card*self.dragging_cache_param.step_y;                
            self.activated_cards
            .setDepth(self.dragging_cache_param.starting_depth, 1)            
            .setXY(gameObject.x+self.dragging_cache_param.offset_x,
                gameObject.y+self.dragging_cache_param.offset_y,
                self.dragging_cache_param.step_x,
                self.dragging_cache_param.step_y);                

            //.rotate(self.cameras.main.rotation);
        });

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {            
            //gameObject.x = dragX;
            //gameObject.y = dragY;
            self.activated_cards.setXY(dragX+self.dragging_cache_param.offset_x,
                dragY+self.dragging_cache_param.offset_y,
                self.dragging_cache_param.step_x,
                self.dragging_cache_param.step_y);
        });            

        this.input.on('dragenter', function (pointer, gameObject, dropZone) {
            dropZone.highlight_dropzone(true);
        });               

        this.input.on('dragleave', function (pointer, gameObject, dropZone) {
            dropZone.highlight_dropzone(false);     
        });         

        this.input.on('drop', function (pointer, gameObject, dropZone) {
            dropZone.highlight_dropzone(false); 
            //gameObject.clearTint();            
            if (gameObject instanceof Card && (dropZone instanceof CardZone || dropZone instanceof Card)){
                //const src_zone_id = gameObject.zone_id;
                //const dst_zone_id = dropZone.zone_id;
                //if (dropZone instanceof CardZone)
                const dst_zone_id = dropZone.zone_id;
                let insertion_location = null
                if (dropZone instanceof Card){
                    insertion_location = self.cards_in_zones.get(dropZone.zone_id).indexOf(dropZone.card_id)+1;                    
                }

                const all_activated_cards = self.activated_cards.getChildren();
                for (let card of all_activated_cards){
                    card.clearTint();
                }                
                let src_zone_id = all_activated_cards[0].zone_id;
                let card_ids = [];
                for (let card of all_activated_cards){                    
                    if (card.zone_id == src_zone_id){                        
                        card_ids.push(card.card_id);                        
                    } else {                        
                        self.move_cards(src_zone_id, dst_zone_id, card_ids, insertion_location);
                        self.last_event_index ++;
                        self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[src_zone_id, dst_zone_id, card_ids, insertion_location]});                                                
                        self.socket.emit('cardMoved',  self.last_event_index, src_zone_id, dst_zone_id, card_ids,  insertion_location);                                
                        card_ids = [card.card_id];
                        src_zone_id  = card.zone_id;
                    }
                }
                // Move the remaining cards
                if (card_ids.length>0){
                    self.move_cards(src_zone_id, dst_zone_id, card_ids, insertion_location);
                    self.last_event_index ++;
                    self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[src_zone_id, dst_zone_id, card_ids, insertion_location]});                                                
                    self.socket.emit('cardMoved',  self.last_event_index, src_zone_id, dst_zone_id, card_ids,  insertion_location);                        
                }

                self.activated_cards.clear();
                while (self.to_be_deactivate_upon_pointer_up.length>0){
                    self.to_be_deactivate_upon_pointer_up.pop();     
                }              
                
            }

        });          

        this.input.on('dragend', function (pointer, gameObject, dropped) {            
            if (!dropped)
            {
                const all_activated_cards = self.activated_cards.getChildren();
                for (let card of all_activated_cards){
                    //card.clearTint();
                    card.set_activated(false);
                }
                const zone_ids = new Set(all_activated_cards.map(card => card.zone_id));
                for (let zone_id of zone_ids){
                    self.update_cards_in_zone(zone_id);
                  }
                self.activated_cards.clear();                
            }
        });   

        // Activate cards
        this.input.on('pointerdown', function(pointer, gameObjects){  
            console.log('pointerdown', pointer, gameObjects);
            //self.mouse_moved=false;
            if (pointer.rightButtonDown()){
                if ((gameObjects.length>=1) && (gameObjects[0] instanceof Card)){
                    self.activated_cards.add(gameObjects[0]);
                    //gameObjects[0].setTint(self.tint_color_for_activated_card);                                    
                    gameObjects[0].set_activated(true);
                }
                const all_activated_cards = self.activated_cards.getChildren();
                //self.flip_cards(all_activated_cards);
                all_activated_cards.forEach(card=>{card.flip_face();card.set_activated(false);});   
                //all_activated_cards.forEach(card=> {card.set_activated(false);});
                const card_ids=all_activated_cards.map(card => card.card_id);            
                self.last_event_index ++;
                self.event_buffer.set(self.last_event_index, {'name':'cardFlipped', 'parameters':[card_ids]});                                                
                self.socket.emit('cardFlipped', self.last_event_index, card_ids); 
                //self.flip_cards(self.activated_cards.getChildren());
                self.activated_cards.clear();
            } else {        
                console.log('pointer', pointer.x, pointer.y)                                 
                if (gameObjects.length>=1){
                    
                    if (gameObjects[0] instanceof Card){
                        const card = gameObjects[0];
                        if (self.activated_cards.contains(card)){
                            self.to_be_deactivate_upon_pointer_up.push(card);
                        } else {
                            self.activated_cards.add(card);
                            card.set_activated(true);

                        }
                    } else if (gameObjects[0] instanceof CardZone){
                        console.log('multiselection start')
                        self.on_multiple_selection = true;
                        self.selection_box.x = pointer.worldX
                        self.selection_box.y = pointer.worldY 
                        //self.previous_activated_cards.addMultiple(self.activated_cards.getChildren());
                        self.children.bringToTop(self.selection_box);
                    }
                } else {
                    self.on_multiple_selection = true;    
                    console.log('multiselection start') 
                    self.selection_box.x = pointer.worldX
                    self.selection_box.y = pointer.worldY   
                    self.children.bringToTop(self.selection_box);

                }
            }           
        });

        this.input.on('pointerup', function(pointer){  
            self.on_multiple_selection = false;
            self.new_selected_cards.clear();
            self.selection_box.width = 0
            self.selection_box.height = 0               
            while (self.to_be_deactivate_upon_pointer_up.length>0){                
                let card = self.to_be_deactivate_upon_pointer_up.pop();                    
                card.set_activated(false);
                self.activated_cards.remove(card);             
            }                   
        });

        this.input.on('pointerupoutside', function(pointer){  
            self.on_multiple_selection = false;
            self.new_selected_cards.clear();
            self.selection_box.width = 0
            self.selection_box.height = 0               
            while (self.to_be_deactivate_upon_pointer_up.length>0){                
                let card = self.to_be_deactivate_upon_pointer_up.pop();                    
                card.set_activated(false);
                self.activated_cards.remove(card);             
            }                   
        });        

        this.input.on('pointermove', function(pointer){
            if ((pointer.isDown) && (self.on_multiple_selection))
            {                
                console.log('selection_box_change', self.selection_box.width, self.selection_box.height)
                const dx = pointer.x - pointer.prevPosition.x
                const dy = pointer.y - pointer.prevPosition.y

                self.selection_box.width += dx
                self.selection_box.height += dy

                const selectionRect = new Phaser.Geom.Rectangle(
                    self.selection_box.x,
                    self.selection_box.y,
                    self.selection_box.width,
                    self.selection_box.height
                )            
                        // check if width or height is negative
                // and then adjust
                if (selectionRect.width < 0)
                {
                    selectionRect.x += selectionRect.width
                    selectionRect.width *= -1
                }
                if (selectionRect.height < 0)
                {
                    selectionRect.y += selectionRect.height
                    selectionRect.height *= -1
                }     


                //const selected = this.list.filter(card=>selectionRect.ContainsPoint(card.getTopLeft()));
                for (let [card_id, card] of self.all_cards){
                    if (Phaser.Geom.Rectangle.ContainsPoint(selectionRect, card.getTopLeft())) {
                        if (!self.activated_cards.contains(card)){
                            // this is new
                            self.new_selected_cards.add(card);
                            self.activated_cards.add(card);
                            card.set_activated(true);                            
                        }
                    } else {
                        if (self.new_selected_cards.contains(card)){
                            // this is selected this time
                            self.activated_cards.remove(card);
                            self.new_selected_cards.remove(card);
                            card.set_activated(false);
                        }
                    }
                }                    
            }
        });
        this.input.on('gameobjectdown', function(pointer, gameObject){
            if (gameObject instanceof TextButton){
                gameObject.highlight(1);                
                const button_param = gameObject.params;
                console.log('button_clicked', button_param);
                if (button_param.event_name ==='generateCard'){
                    //const n_decks=1;
                    const n_decks = Math.round(button_param.num_card_textbox.text);
                    self.last_event_index ++;            
                    self.event_buffer.set(self.last_event_index, {'name':'generateCard', 'parameters':[button_param.target_zone, n_decks]});                        
                    self.socket.emit('generateCard', self.last_event_index, button_param.target_zone, n_decks, true);                         
                } else if (button_param.event_name ==='resetGame'){
                    self.socket.emit('resetGame');    
                } else if (button_param.event_name ==='exitToGameRoom'){
                    self.socket.emit('exitToGameRoom');                        
                } else if (button_param.event_name ==='moveCards'){
                    for (let cfg of button_param.move_card_cfg){                                 
                        let card_ids = [];
                        if (cfg.type =='all'){
                            card_ids = Array.from(self.cards_in_zones.get(cfg.src_zone_id));

                        } else if (cfg.type=='fixed'){
                            card_ids = self.cards_in_zones.get(cfg.src_zone_id).slice(-Math.floor(cfg.num_of_card));                            
                        } else if (cfg.type=='ui'){
                            const num_of_cards = Math.round(cfg.textbox.text);              
                            //card_ids = Array.from(self.cards_in_zones.get(cfg.src_zone_id).slice(-num_of_cards));                            
                            card_ids = self.cards_in_zones.get(cfg.src_zone_id).slice(-num_of_cards);                            
                        }                        
                        self.move_cards(cfg.src_zone_id, cfg.dst_zone_id, card_ids);
                        self.last_event_index ++;
                        self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[cfg.src_zone_id, cfg.dst_zone_id, card_ids]});                                                
                        self.socket.emit('cardMoved',  self.last_event_index, cfg.src_zone_id, cfg.dst_zone_id, card_ids,  null);                                
                    }                    
                }
            } 
        });


        this.input.on('gameobjectup', function(pointer, gameObject){
            if (gameObject instanceof TextButton){
                gameObject.highlight(0);                    
            } 
        });        

        // this.input.on('gameobjectover', function(pointer, gameObject){
        //     //self.mouse_moved=true;
        //     if (self.on_multiple_selection && (gameObject instanceof Card)){                
        //         if (self.activated_cards.contains(gameObject)){
        //         } else {
        //             self.activated_cards.add(gameObject);                    
        //             gameObject.set_activated(true);
        //         }                
        //     }
        // });

        this.socket.on('resetLayout', function (server_layout_cfg, n_active_player, player_info) {
            if ((n_active_player!==undefined) && (n_active_player!==null)){
                self.n_active_player = n_active_player;
            }
            self.clear_all_zones_and_buttons();
            const layout_cfg = self.cache.json.get('layout')
            self.layout_zones_and_buttons(layout_cfg, player_info);
            //self.main_camera(layout_cfg);
            self.cameras.main.centerOn(layout_cfg.default_camera.x, layout_cfg.default_camera.y);                 
        });           
        
        this.socket.on('gameStateSync', function (last_events, cards_in_zones, cards_status) {            
            if (cards_in_zones != null){
                self.sync_card_in_zones(cards_in_zones);
            }
            if (cards_status != null){
                self.sync_card_status(cards_status);
            }
            if (last_events.hasOwnProperty(Client.player_id)){
                self.apply_and_update_event_buffer(last_events[Client.player_id]);
            }
            //this.player_id = player_id;            
        });       
        this.socket.on('setGameToInitialStage', function(){
            self.clear_all_cards();
            self.clear_all_events();
        });
        this.socket.on('returnToGameRoom', function(){
            console.log('received return To Game Room Message');
            self.clear_all_cards();
            self.clear_all_events();
            self.clear_all_zones_and_buttons();
            self.socket.removeAllListeners();
            self.scene.start('GameRoom');
        });      

        this.socket.on('uiElementTextSync', function(element_name, text){
            if (self.ui_elements.has(element_name)){
                const element = self.ui_elements.get(element_name).setText(text);;
            }
        });
            
        this.socket.emit('requestLayout');
        this.socket.emit('requestGameSync');
        this.socket.emit('getMyPlayerName');
        console.log("creation done");        
    }        
    
    // set zone and button layouts
    clear_all_zones_and_buttons(){
        for (let [zone_id, zone] of this.all_zones){
            zone.destroy();
        }
        this.all_zones.clear();
        this.cards_in_zones.clear();
        for (let [element_name, element] of this.ui_elements){
            element.destroy();
        }
        this.ui_elements.clear();        
        this.zone_linked_update.clear();      
    }
    
    add_zone_grp(zone_grp){
        if (zone_grp.type=='one_zone_per_player'){
                
            let zone_xy = calculate_circular_zone_xy(
                zone_grp.starting_x, zone_grp.starting_y,
                zone_grp.step_x, zone_grp.step_y, this.n_active_player,
                zone_grp.n_row
                );
            let position_offset = Math.floor(Client.player_id);
            if (position_offset<0){
                position_offset = 0;
            }

            for (let player_id = 0; player_id<this.n_active_player; player_id++){
               let xy_pos = zone_xy[((player_id-position_offset)%this.n_active_player+this.n_active_player)%this.n_active_player];
               let zone_id = zone_grp.name + '_' + String(player_id);
               let local_display = zone_grp.local_display_other_player
               if (String(player_id)==Client.player_id){
                local_display = zone_grp.local_display_current_player
               }
               if (!this.all_zones.has(zone_id)){
                  this.add_zone(zone_id, xy_pos.x, xy_pos.y,
                    zone_grp.width, zone_grp.height, 
                    zone_grp.fillColor, 
                    zone_grp.boundary_width, zone_grp.boundary_height, 
                    zone_grp.card_step_x, zone_grp.card_step_y, 
                    zone_grp.card_scale, local_display)
               }
            }
        } else if (zone_grp.type=='public'){
            this.add_zone(zone_grp.name,
                zone_grp.x, zone_grp.y,
                zone_grp.width, zone_grp.height, 
                zone_grp.fillColor, 
                zone_grp.boundary_width, zone_grp.boundary_height, 
                zone_grp.card_step_x, zone_grp.card_step_y, 
                zone_grp.card_scale, 
                zone_grp.local_display)                
        }        
    }
    layout_zones_and_buttons(layout_cfg, player_info){
        var self=this;
        // layout zones
        for (let zone_grp of layout_cfg['zones']){
            this.add_zone_grp(zone_grp);
        }
        // layout buttons
        for (let ui_element of layout_cfg['ui_elements']){            
            if (ui_element.type=='deck_generator'){
                //let deck_generator_grp = {}
                //this.ui_elements.set(ui_element.name, deck_generator_grp);
                //deck_generator_grp['target_zone']=ui_element.target_zone;

                this.ui_elements.set(ui_element.name+'_text', this.add.text(
                    ui_element.x+ui_element.label.offset_x,
                    ui_element.y+ui_element.label.offset_y, 
                    ui_element.label.text,
                    {fontSize:'12px'}));
                // deck_generator_grp['elements']=[];
                // deck_generator_grp['elements'].push(this.add.text(
                //     ui_element.x+ui_element.label.offset_x,
                //     ui_element.y+ui_element.label.offset_y, 
                //     ui_element.label.text,
                //     {fontSize:'12px'}));

                const num_deck_selector = this.add.rexInputText(
                    ui_element.x+ui_element.input.offset_x,
                    ui_element.y+ui_element.input.offset_y,                    
                    40, 20,
                    {
                    type: 'number',
                    text: ui_element.input.default,
                    fontSize: '12px',
                    }
                );
                num_deck_selector.name = ui_element.name+'_numdeckinput';
                this.ui_elements.set(num_deck_selector.name, num_deck_selector);
                num_deck_selector.on('textchange', function(inputText){ 
                    this.socket.emit('uiElementTextSync', inputText.name, inputText.text);
                }, this);                
                //deck_generator_grp['elements'].push(num_deck_selector);
                

                const generate_button = this.add.existing(new TextButton(
                    this, ui_element.x, ui_element.y, ui_element.generate_button_label,
                    {color:'#0f0', backgroundColor: '#666',fontSize:'12px' }                    
                ));
                generate_button.name =  ui_element.name+'_button';
                this.ui_elements.set(generate_button.name, generate_button);
                //deck_generator_grp['elements'].push(generate_button);
                generate_button.params['event_name']='generateCard';                
                generate_button.params['target_zone']=ui_element.target_zone;
                generate_button.params['num_card_textbox']=num_deck_selector;
                generate_button.setInteractive();
            } else if (ui_element.type=='simple_event'){
                
                //let element_grp = {elements:[]}
                //this.ui_elements.set(ui_element.name, element_grp);
                const button = this.add.existing(new TextButton(
                    this, ui_element.x, ui_element.y, ui_element.button_label,
                    {color:'#0f0', backgroundColor: '#666',fontSize:'12px' }                        
                ));  
                button.name =  ui_element.name;    
                this.ui_elements.set(button.name, button);
                //element_grp['elements'].push(button);                
                button.params['event_name']=ui_element.event_name;
                //'resetGame';     
                button.setInteractive();
            } else if (ui_element.type=='deal_cards') {
                //let element_grp = {elements:[]}
                //this.ui_elements.set(ui_element.name, element_grp);
                const button = this.add.existing(new TextButton(
                    this, ui_element.x, ui_element.y, ui_element.button_label,
                    {color:'#0f0', backgroundColor: '#666',fontSize:'12px' }                    
                ));        
                button.name =  ui_element.name + '_button';    
                this.ui_elements.set(button.name, button);                
                //element_grp['elements'].push(button)     
                button.params['event_name']='moveCards'; 
                button.params['move_card_cfg'] = [];  
                button.setInteractive();
                let cfg_count = 0;
                for (let cfg of ui_element.move_card_cfg){                    
                    if (cfg.type=='ui'){        


                        //element_grp['elements'].push(
                        const text_label = this.add.text(ui_element.x+cfg.label.offset_x,
                                ui_element.y+cfg.label.offset_y,
                                cfg.label.text, {fontSize:'12px'});
                        text_label.name =  ui_element.name + '_'+ String(cfg_count) + '_label';    
                        this.ui_elements.set(text_label.name, text_label);                          
                        const num_selector = this.add.rexInputText(
                            ui_element.x+cfg.input.offset_x,
                            ui_element.y+cfg.input.offset_y,
                            40, 20,
                            {
                            type: 'number',
                            text: String(cfg.input.default),
                            fontSize: '12px',
                            }
                        );
                        num_selector.name = ui_element.name + '_'+ String(cfg_count) +'_numselect';
                        this.ui_elements.set(num_selector.name, num_selector);      
                        num_selector.on('textchange', function(inputText){ 
                            this.socket.emit('uiElementTextSync', inputText.name, inputText.text);
                            }, this);                                                                        
                        //element_grp['elements'].push(num_selector);                           
                        if (cfg.dst_zone_type == 'zone_group'){
                            const dst_zone_ids = this.find_zone_group(cfg.dst_zone_group_name);
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
                    }
                    cfg_count ++;
                }
                
            }
        }

        // TODO: THis will be moved to other place. Manually add name        
        let player_id_to_name = {}
        for (let player of player_info){
            player_id_to_name[player.player_id]=player.player_name;
        }        
        for (let [zone_id, zone] of this.all_zones){            
            if (zone_id.split('_')[0]=='Trash'){
                this.add.text(zone.x-30, zone.y+40, player_id_to_name[zone_id.split('_')[1]],{fontSize:'12px'});
            }
        }

        // Manually Add Clear button. TODO This will be moved to other place.                 
        for (let [zone_id, zone] of this.all_zones){            
            if (zone_id.split('_')[0]=='Trash'){
                let zone_player_id = zone_id.split('_')[1];
                //let element_grp = {elements:[]}
                
                const button = this.add.existing(new TextButton(
                    this, zone.x-10, zone.y-60, 'CLEAR',
                    {color:'#0f0', backgroundColor: '#666',fontSize:'12px' }                    
                ));        
                button.name = 'clear_'+zone_player_id;
                this.ui_elements.set('clear_'+zone_player_id, button);                                
                //element_grp['elements'].push(button)     
                button.params['event_name']='moveCards'; 
                button.params['move_card_cfg'] = [
                    {
                        type: 'all',
                        src_zone_id: 'Show_' + zone_player_id,
                        dst_zone_id: 'Trash_' + zone_player_id,
                    },
                ];  
                button.setInteractive();                                
            }
        }        
        // white board
        const whiteboard = this.add.rexInputText(
            -550,
            380,
            90, 201.5,
            {
            type: 'textarea',
            text: "WhiteBoard",
            fontSize: '10px',
            border: 2,    
            borderColor: '#888888',
            }
        ); 

        whiteboard.name =  'whiteboard';
        this.ui_elements.set(whiteboard.name, whiteboard);
        whiteboard.on('textchange', function(inputText){ 
            this.socket.emit('uiElementTextSync', inputText.name, inputText.text);
        }, this);  

        // text update
        for (let [zone_id, zone] of this.all_zones){            
            if (zone_id.split('_')[0]=='Score'){
                let zone_player_id = zone_id.split('_')[1];
                //let element_grp = {elements:[]}
                
                const textscore = this.add.text(zone.x+120, zone.y+20, '0',{fontSize:'12px'});                                
                this.zone_linked_update.set(zone_id, 'scorecard_'+zone_player_id);
                //element_grp.elements.push(textscore); 
                textscore.name = 'scorecard_'+zone_player_id;
                this.ui_elements.set(textscore.name, textscore);
            } else if (zone_id.split('_')[0]=='Hand'){
                let zone_player_id = zone_id.split('_')[1];
                if (zone_player_id == String(Client.player_id)){
                    //let element_grp = {elements:[]}
                    //this.ui_elements.set('countcard_'+zone_player_id, element_grp);
                    const textscore = this.add.text(zone.x-400, zone.y-110, '0',{fontSize:'12px'});                                                    
                    //element_grp.elements.push(textscore); 
                    textscore.name = 'countcard_'+zone_player_id;
                    this.ui_elements.set(textscore.name, textscore);                                       
                    this.zone_linked_update.set(zone_id, textscore.name);
                }                    
            } else if (zone_id=='SharedScore'){                
                //let element_grp = {elements:[]}
                //this.ui_elements.set('scorecard_SharedScore', element_grp);
                const textscore = this.add.text(zone.x+220, zone.y+20, '0',{fontSize:'12px'});                                
                //this.zone_linked_update.set(zone_id, 'scorecard_SharedScore');
                //element_grp.elements.push(textscore); 
                textscore.name = 'scorecard_SharedScore';
                this.ui_elements.set(textscore.name, textscore);                                       
                this.zone_linked_update.set(zone_id, textscore.name);
            } else if (zone_id =='CardDealer'){
                //let element_grp = {elements:[]}
                //this.ui_elements.set('countcard_CardDealer', element_grp);
                const textscore = this.add.text(zone.x, zone.y+40, '0',{fontSize:'12px'});                                
                //this.zone_linked_update.set(zone_id, 'countcard_CardDealer');
                //element_grp.elements.push(textscore);      
                textscore.name = 'countcard_CardDealer';
                this.ui_elements.set(textscore.name, textscore);                                       
                this.zone_linked_update.set(zone_id, textscore.name);                             
            } else if (zone_id =='Hidden'){
                //let element_grp = {elements:[]}
                //this.ui_elements.set('countcard_Hidden', element_grp);
                const textscore = this.add.text(zone.x-100, zone.y+40, '0',{fontSize:'12px'});                                
                // this.zone_linked_update.set(zone_id, 'countcard_Hidden');
                // element_grp.elements.push(textscore);  
                //element_grp.elements.push(textscore);      
                textscore.name = 'countcard_Hidden';
                this.ui_elements.set(textscore.name, textscore);                                       
                this.zone_linked_update.set(zone_id, textscore.name);                                    
            }
        }          
        
    }

    find_zone_group(group_name){  
        const all_zones_ids = Array(...this.all_zones.keys());
        return all_zones_ids.filter(zone_id => zone_id.split('_')[0]===group_name);        
    }
    clear_all_cards(){
        this.on_multiple_selection=false;
        this.activated_cards.clear();
        while (this.to_be_deactivate_upon_pointer_up.length>0){
            this.to_be_deactivate_upon_pointer_up.pop();     
        }   
        for (let [card_id, card] of this.all_cards){
            this    .all_cards.delete(card_id);
            card.destroy();// remove from pahser        
        }

        for (let zone_id of this.cards_in_zones.keys()){
            this.cards_in_zones.set(zone_id, []);
        }        
    }

    clear_all_events(){
        this.event_buffer.clear();
        this.last_event_index=-1;
    }

    sync_card_in_zones(new_cards_in_zones)
    {
        let removed_card_ids_of_changed_zones=[];
        let added_card_ids_of_changed_zones=[];
        for (const [zone_id, cards_in_zone] of this.cards_in_zones) {
            let new_cards_in_zone = new_cards_in_zones[zone_id];
            if (new_cards_in_zone===undefined){
                new_cards_in_zone = [];
            }
            if (!(cards_in_zone.length === new_cards_in_zone.length && cards_in_zone.every((val, index) => val === new_cards_in_zone[index]))){
                // update cards
                removed_card_ids_of_changed_zones = removed_card_ids_of_changed_zones.concat(cards_in_zone.filter(card_id => !new_cards_in_zone.includes(card_id)));
               
                added_card_ids_of_changed_zones = added_card_ids_of_changed_zones.concat(new_cards_in_zone.filter(card_id => !cards_in_zone.includes(card_id)));
                this.cards_in_zones.set(zone_id, new_cards_in_zone);
                this.update_cards_in_zone(zone_id); 
            }
        }

        const cards_ids_to_be_destroyed = removed_card_ids_of_changed_zones.filter(card_id => !added_card_ids_of_changed_zones.includes(card_id));

        for (const card_id of cards_ids_to_be_destroyed){
            let card = this.all_cards.get(card_id);
            this.all_cards.delete(card_id);
            card.destroy();// remove from pahser            
        }                  
    }

    // synchronize all card status : which side is up or down
    sync_card_status(cards_status){
        for (const [card_id, card] of this.all_cards){
            card.face_up = cards_status[card_id];
        }
    }    

    apply_and_update_event_buffer(last_event_index_applied)
    {
        // update event buffer
        // remove event in the buffer that have been recognized by the server as applied        
        const min_event_index = Math.min(...this.event_buffer.keys());        
        for (let i=min_event_index; i<=last_event_index_applied;i++){
            this.event_buffer.delete(i);
        }        
        for (let i=last_event_index_applied+1; i<=this.last_event_index;i++){            
            const event = this.event_buffer.get(i);
            if (!(event === undefined)){            
                if (event.name==='cardMoved'){
                    this.move_cards(...event.parameters);
                } else if (event.name==='cardFlipped'){
                    this.flip_cards_by_id(...event.parameters);
                }
            }
        }
    }

    get_scores_from_card_ids(card_ids){
        let score = 0;
        for (let card_id of card_ids){
            const card_score = this.score_map[card_id.split('_')[0]];
            if (card_score!==undefined){
                score += card_score;
            }
        }
        return score;
    }
    // flip face of cards
    flip_cards_by_id(card_ids)
    {
        for (let card_id of card_ids){
            this.all_cards.get(card_id).flip_face();
        }           
    }

    //flip_cards(card_array){
    //    card_array.forEach(card=>{card.flip_face();});             
    //}


    remove_cards(zone_id, card_ids, squeeze_cards_in_zone)
    {
        // Remove cards from card zone. 
        // squeeze_cards_in_zone: whether update card position for those in the zone
        if (squeeze_cards_in_zone === undefined) {squeeze_cards_in_zone=true;}
        const cards_in_zone = this.cards_in_zones.get(zone_id);        
        //let card_index = card_ids.length - 1;
        
        let min_index = cards_in_zone.length;
        let card_removed = [];
        const card_length = card_ids.length;
        for (let card_index=0; card_index<card_length;card_index++)
        {                
            let card_id = card_ids[card_index];
            const index = cards_in_zone.indexOf(card_id);
            
            if (index !== -1)
            {
                Phaser.Utils.Array.SpliceOne(cards_in_zone, index);
                if (index<min_index){
                    min_index=index;
                }
                this.all_cards.get(card_id).zone_id = null; // unassign zone id.
                card_removed.push(card_id);
            }            
        }      
        if (squeeze_cards_in_zone)
        {
            // squeeze cards
            this.update_cards_in_zone(zone_id, min_index); 
        }
        return card_removed;
    }
    add_cards(zone_id, card_ids, insertion_location)
    {
        const cards_in_zone = this.cards_in_zones.get(zone_id);

        if ((insertion_location === undefined) || (insertion_location===null)) { insertion_location = cards_in_zone.length; }
        if (insertion_location > cards_in_zone.length) {insertion_location=cards_in_zone.length; }
        Phaser.Utils.Array.AddAt(cards_in_zone, card_ids, insertion_location);
        this.update_cards_in_zone(zone_id, insertion_location);             

    }
    move_cards(src_zone_id, dst_zone_id, card_ids, insertion_location)
    {
        // event to move card from one zone to another          
        const card_id_removed = this.remove_cards(src_zone_id, card_ids, true);         
        this.add_cards(dst_zone_id, card_id_removed, insertion_location);          
    }

    update_cards_in_zone(zone_id, starting_pos, end_pos){        
        const zone = this.all_zones.get(zone_id);
        const cards_in_zone = this.cards_in_zones.get(zone_id);
        if (starting_pos=== undefined) {starting_pos=0;}
        if (end_pos === undefined) {end_pos = cards_in_zone.length;}
        for (let i = starting_pos; i<end_pos; i++)
        {
            
            let card = this.all_cards.get(cards_in_zone[i]); 
            if (card===undefined){
                card = this.generate_new_card(cards_in_zone[i])//, new_cards_status.get(cards_in_zone[i]));                                
            }
            const new_pos = zone.calculate_xy_from_pos(i);  
            card.set_local_display(zone.local_display); 
            card.setPosition(new_pos.x, new_pos.y);            
            card.setDepth(i+1);
            card.zone_id=zone_id;
            card.angle = zone.angle;            
            card.setScale(zone.card_scale)
        }
        // update scores
        if (this.zone_linked_update.has(zone_id)){
            const ui_name = this.zone_linked_update.get(zone_id);
            if (ui_name.split('_')[0]=='scorecard'){
                const score_text = this.ui_elements.get(ui_name);
                score_text.text=String(this.get_scores_from_card_ids(cards_in_zone));
            } else if (ui_name.split('_')[0]=='countcard'){
                const score_text = this.ui_elements.get(ui_name);
                score_text.text=String(cards_in_zone.length);
            }
        }
    }

    generate_new_card(card_id, face_up){
        // if ((face_up===undefined) || (face_up===null)){
        //     face_up = true;
        // }
        const card = new PokerCard(this, 0, 0, 'cards', card_id);
        card.face_up = face_up;
        //if (face_up===false) {card.face_up = face_up;}
        this.add.existing(card);
        this.all_cards.set(card_id, card);
        //this.add_cards(dst_zone_id, [card_id], insertion_location);  
        return card;       
    }
    
    add_zone(zone_id, x, y, width, height, fillColor, boundary_width, boundary_height, card_step_x, card_step_y, card_scale, local_display){
        const zone = new CardZone(this, x, y, width, height, fillColor, zone_id, boundary_width, boundary_height, card_step_x, card_step_y, card_scale, local_display);
        this.all_zones.set(zone_id, zone);           
        this.add.existing(zone);  
        this.cards_in_zones.set(zone_id, []);
        return zone; 
    }

    sort_cards(card_ids, sort_key_array){
        const sorted_card_ids = Array.from(card_ids);        
        sorted_card_ids.sort((a,b)=>sort_key_array.indexOf(a.split('_')[0])-sort_key_array.indexOf(b.split('_')[0]));     
        return sorted_card_ids  ;      
    }
}