import Phaser from './phaser.js';
import {CardZone, calculate_circular_zone_xy} from './zone.js';
import {PokerCard, Card} from './cards.js';
import {TextButton, SortButton,FlipButton, MoveCardButton, SimpleEventButton, ScoreText, PlayerName, addInputText, addNewDeck, addNewDealer} from './textbutton.js';

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
    allow_selection_across_zone;

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
        this.on_multiple_selection=false;        
        this.to_be_deactivate_upon_pointer_up=[];
        this.tint_color_for_activated_card = 0xa0a0ff;
        this.previous_empty_click=false;
        this.socket = window.Client.socket;
        this.zone_linked_update = new Map();
        this.allow_selection_across_zone = false;

        
        
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
        this.scale.setGameSize(1400, 800);   
        // this.scale.scaleMode = Phaser.Scale.ScaleModes.FIT;
        // this.scale.displaySize.setAspectMode(this.scale.scaleMode)
        // this.scale.getParentBounds();

        // //  Only set the parent bounds if the parent has an actual size
        // if (this.scale.parentSize.width > 0 && this.scale.parentSize.height > 0)
        // {
        //     this.scale.displaySize.setParent(this.scale.parentSize);
        // }

        // this.scale.refresh();        
        
        
        
        
        this.activated_cards = this.add.group();
        this.new_selected_cards =this.add.group();
        // configuration
        this.input.dragDistanceThreshold=5;
        this.selection_box = this.add.rectangle(0, 0, 0, 0, 0x1d7196, 0.4);

        // regular buttons
        // const flip_button = this.add.text(400,485, 'FLIP Selected Card', {color:'#0f0', backgroundColor: '#666', fontSize:'12px'});
        // flip_button.setInteractive();
        // flip_button.on('pointerdown', this.action_flip_selected_cards, this);

        // const deselect_button = this.add.text(300,485, 'Deselect', {color:'#0f0', backgroundColor: '#666', fontSize:'12px'});
        // deselect_button.setInteractive();
        // deselect_button.on('pointerdown', this.action_deselect, this);                
   

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
        });

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {            
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
            if (gameObject instanceof Card && (dropZone instanceof CardZone || dropZone instanceof Card)){
                const dst_zone_id = dropZone.zone_id;
                let insertion_location = null
                if (dropZone instanceof Card){
                    insertion_location = self.cards_in_zones.get(dropZone.zone_id).indexOf(dropZone.card_id)+1;                    
                }

                const all_activated_cards = self.activated_cards.getChildren();
                for (let card of all_activated_cards){
                    card.set_activated(false);
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
            if (pointer.rightButtonDown()){
                // Flip cards
                if ((gameObjects.length>=1) && (gameObjects[0] instanceof Card)){
                    self.activated_cards.add(gameObjects[0]);
                    //gameObjects[0].setTint(self.tint_color_for_activated_card);                                    
                    gameObjects[0].set_activated(true);
                }
                this.action_flip_selected_cards();
            } else {        
                //console.log('pointer', pointer.x, pointer.y)                                 
                if (gameObjects.length>=1){
                    
                    if (gameObjects[0] instanceof Card){
                        const card = gameObjects[0];
                        if (self.activated_cards.contains(card)){
                            self.to_be_deactivate_upon_pointer_up.push(card);
                        } else {
                            self.add_card_to_activated(card);
                            //self.activated_cards.add(card);
                            //card.set_activated(true);

                        }
                    } else if (gameObjects[0] instanceof CardZone){
                        //console.log('multiselection start')
                        
                        self.on_multiple_selection = true;
                        self.selection_box.x = pointer.worldX
                        self.selection_box.y = pointer.worldY 
                        //self.previous_activated_cards.addMultiple(self.activated_cards.getChildren());
                        self.children.bringToTop(self.selection_box);

                        // if do not allow selection across multiple zones, starting a new zone will deselect existing ones
                        if (!self.allow_selection_across_zone){
                            if (self.is_zone_id_different_from_activated(gameObjects[0].zone_id)){
                                self.action_deselect();
                            }
                        }
                        
                    }
                } else {
                    self.on_multiple_selection = true;    
                    //console.log('multiselection start') 
                    self.selection_box.x = pointer.worldX
                    self.selection_box.y = pointer.worldY   
                    self.children.bringToTop(self.selection_box);

                }
            }           
        }, this);

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
                for (let [zone_id, cards_in_zone] of self.cards_in_zones){
                    if (self.all_zones.get(zone_id).visible==true){
                        for (let card_id of cards_in_zone){
                        //for (let [card_id, card] of self.all_cards){
                            let card = self.all_cards.get(card_id);
                            if (Phaser.Geom.Rectangle.ContainsPoint(selectionRect, card.getTopLeft())) {                                
                                if (!self.activated_cards.contains(card)){                               
                                    // this is new
                                    self.new_selected_cards.add(card);
                                    //self.activated_cards.add(card);
                                    //card.set_activated(true);                            
                                    self.add_card_to_activated(card);
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
                }
            }
        });     

        this.socket.on('resetLayout', function (server_layout_cfg, n_active_player, player_info) {
            if ((n_active_player!==undefined) && (n_active_player!==null)){
                self.n_active_player = n_active_player;
            }
            self.clear_all_zones_and_buttons();
            const layout_cfg = self.cache.json.get('layout')
            self.registry.set('playerinfo', player_info);
            self.layout_zones_and_buttons(layout_cfg)//, player_info);            
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
        });       
        this.socket.on('setGameToInitialStage', function(){
            self.clear_all_events();
            self.clear_all_cards();            
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
        this.socket.emit('requestUIElementTextCache');
        this.socket.on('playerInfo', function(player_info){
            self.registry.set('playerinfo', player_info);
        });        
        console.log("creation done");        
    }        
    
    is_zone_id_different_from_activated(zone_id){        
        if (this.activated_cards.children.size>=1){                        
            return zone_id!=this.activated_cards.getChildren()[0].zone_id                
        } else {
            return false;
        }
               
    }
    add_card_to_activated(card){
        if (!this.allow_selection_across_zone){
            if (this.is_zone_id_different_from_activated(card.zone_id)){
                this.action_deselect();
            }
        }                
        this.activated_cards.add(card);
        card.set_activated(true);
    }
    /**
     * event to flip cards by its id
     * @param  {Array of [int, boolean]} [[card_id, face_up]]     
     */
    event_cardFlipped(card_id_and_faces) 
    {
        for (let [card_id, card_face] of card_id_and_faces){
            this.all_cards.get(card_id).face_up = card_face;
        }     
    }

    action_new_game_round(){
        this.socket.emit('resetGame');    
    }

    action_exit_to_room(){ 
        this.socket.emit('exitToGameRoom');
    }    

    /**
     * flip cards     
     * @param  {boolean} if true, flip to face up. If false, face down. If null or undefined, flip the face of cards.     
     */
    action_flip_cards(cards, flip_up){        
        

        if ((flip_up===undefined) || (flip_up===null)){
            cards.forEach(card=>{card.flip_face()});
        } else {
            cards.forEach(card=>{card.face_up=flip_up});

        }
        const card_id_faces = cards.map(card=>[card.card_id, card.face_up]);        
        this.last_event_index ++;        
        console.log(card_id_faces);
        this.event_buffer.set(this.last_event_index, {'name':'cardFlipped', 'parameters':[card_id_faces]});                                                
        this.socket.emit('cardFlipped', this.last_event_index, card_id_faces);        
    }

    action_flip_cards_in_a_zone(zone_id, flip_up){
        const cards = this.cards_in_zones.get(zone_id).map(card_id=>this.all_cards.get(card_id));
        this.action_flip_cards(cards, flip_up);
    }
    /**
     * flip selected cards
     * @param  {boolean} if true, flip to face up. If false, face down. If null or undefined, flip the face of cards.     
     */
    action_flip_selected_cards(flip_up){
        const all_activated_cards = this.activated_cards.getChildren();
        this.action_flip_cards(all_activated_cards, flip_up);       
        all_activated_cards.forEach(card=>{card.set_activated(false);});
        this.activated_cards.clear();   
    }

    /**
     * deselect selected cards     
     */
    action_deselect(){
        const all_activated_cards = this.activated_cards.getChildren();
        all_activated_cards.forEach(card=>{card.set_activated(false)});                
        this.activated_cards.clear();  
        while (this.to_be_deactivate_upon_pointer_up.length>0){
            this.to_be_deactivate_upon_pointer_up.pop();     
        }  
    }

    sort_cards(card_ids, sort_key_array){
        const sorted_card_ids = Array.from(card_ids);        
        sorted_card_ids.sort((a,b)=>sort_key_array.indexOf(a.split('_')[0])-sort_key_array.indexOf(b.split('_')[0]));     
        return sorted_card_ids;      
    }

    action_sort_cards(zone_id, sort_key_array){
        //self.sort_cards_in_zone('Hand_'+ Client.player_id);        
        const card_ids = this.cards_in_zones.get(zone_id);
        const sorted_card_ids = this.sort_cards(card_ids, sort_key_array);                
        this.move_cards(zone_id, zone_id, sorted_card_ids);
        //this.update_cards_in_zone(zone_id);
        this.last_event_index ++;
        this.event_buffer.set(this.last_event_index, {'name':'cardMoved', 'parameters':[zone_id, zone_id, sorted_card_ids, null]});                                                
        this.socket.emit('cardMoved',  this.last_event_index, zone_id, zone_id, sorted_card_ids,  null);  
            
    }



    action_move_cards(src_zone_id, dst_zone_id, card_ids, insertion_location){
        this.move_cards(src_zone_id, dst_zone_id, card_ids, insertion_location);
        //this.update_cards_in_zone(zone_id);
        this.last_event_index ++;
        this.event_buffer.set(this.last_event_index, {'name':'cardMoved', 'parameters':[src_zone_id, dst_zone_id, card_ids, insertion_location]});                                                
        this.socket.emit('cardMoved',  this.last_event_index, src_zone_id, dst_zone_id, card_ids, insertion_location);  
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
        } else if (zone_grp.type=='single'){
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
    
    add_element_grp(grp_cfg){
        switch (grp_cfg.group_type) {
            case 'per_zone_group':
                // expand element into per zone
                const zone_ids = Array.from(this.all_zones.keys()).filter(zone_id=>zone_id.split('_')[0]==grp_cfg['zone_group'])
                for (let zone_id of zone_ids){
                    const zone = this.all_zones.get(zone_id);
                    let zone_player_id = (zone_id.split('_').length>=1)?(zone_id.split('_')[1]):'';                    
                    let element_json = JSON.stringify(grp_cfg)
                    element_json = element_json.replace(/\{PLAYERID\}/g, zone_player_id).replace(/\{ZONEID\}/g, zone_id).replace(/\{NACTIVEPLAYER\}/g, String(this.n_active_player));                        
                    let element_cfg = JSON.parse(element_json);
                    element_cfg.name = element_cfg.name + '_' + zone_id;
                    if (grp_cfg['position_type']=='relative_to_zone'){
                        element_cfg['x'] = zone.x + element_cfg['offset_x'];
                        element_cfg['y'] = zone.y + element_cfg['offset_y'];                                                  
                    }
                    if (zone.local_display==0){
                        this.add_single_ui_element(element_cfg);
                    }                    
                }                
                break;
            case 'standalone':
                let element_json = JSON.stringify(grp_cfg)
                element_json = element_json.replace(/\{NACTIVEPLAYER\}/g, String(this.n_active_player));              
                this.add_single_ui_element(JSON.parse(element_json));
                break;
        }
    }
    add_single_ui_element(element_cfg){
        switch(element_cfg.type){
            case 'DeckGenerator':
                addNewDeck(this, element_cfg);                  
                break;
            case 'DealCards':
                addNewDealer(this, element_cfg);
                break; 
            case 'MoveCardButton':
                const button = this.add.existing(
                    new MoveCardButton(this,
                        element_cfg));
                button.add_listener_to_scene();
                this.ui_elements.set(button.name, button);              
                break;
            case 'SortButton':
                const sort_button = this.add.existing(
                    new SortButton(this,
                        element_cfg));
                sort_button.add_listener_to_scene();
                this.ui_elements.set(sort_button.name, sort_button);              
                break;    
            case 'FlipButton':
                const flip_button = this.add.existing(
                    new FlipButton(this,
                        element_cfg));
                flip_button.add_listener_to_scene();
                this.ui_elements.set(flip_button.name, flip_button);              
                break;                                           
            case 'ScoreText':
                const test_score = this.add.existing(
                    new ScoreText(this,
                        element_cfg));                
                test_score.add_listener_to_scene();
                this.ui_elements.set(test_score.name, test_score); 
                break;
            case 'PlayerName':
                const ui_element = this.add.existing(
                    new PlayerName(this,
                        element_cfg));                
                ui_element.add_listener_to_scene();
                this.ui_elements.set(ui_element.name, ui_element); 
                break;                    
            case 'InputText':
                addInputText(this, element_cfg);
                break; 
            case 'SimpleEvent':
                let event_handler = null;
                switch (element_cfg.event_name) {
                    case 'exitToGameRoom':
                        event_handler = this.action_exit_to_room.bind(this);
                        break;
                    case 'NewGameRound':
                        event_handler = this.action_new_game_round.bind(this);
                        break;
                    case 'FlipSelected':
                        event_handler = this.action_flip_selected_cards.bind(this);
                        break;
                    case 'Deselect':
                        event_handler = this.action_deselect.bind(this);
                        break;
                }             
                const event_button = this.add.existing(
                    new SimpleEventButton(this,
                        element_cfg, event_handler));                
                event_button.add_listener_to_scene();
                this.ui_elements.set(event_button.name, event_button);                 
                break;
        }
    }
    
    layout_zones_and_buttons(layout_cfg){
        var self=this;
        // layout zones
        for (let zone_grp of layout_cfg['zones']){
            this.add_zone_grp(zone_grp);
        }        
        // layout buttons
        for (let ui_element_grp of layout_cfg['ui_elements']){
            this.add_element_grp(ui_element_grp);
        }   
    }

    find_zone_group(group_name){  
        const all_zones_ids = Array(...this.all_zones.keys());
        return all_zones_ids.filter(zone_id => zone_id.split('_')[0]===group_name);        
    }

    clear_selection_related_elements(){
        this.activated_cards.clear();
        this.on_multiple_selection = false;
        this.new_selected_cards.clear();
        this.selection_box.width = 0
        this.selection_box.height = 0 

        while (this.to_be_deactivate_upon_pointer_up.length>0){
            this.to_be_deactivate_upon_pointer_up.pop();     
        } 
    }
    clear_all_cards(){        
        this.clear_selection_related_elements();
        for (let [card_id, card] of this.all_cards){
            this.all_cards.delete(card_id);
            card.destroy();// remove from pahser        
        }

        for (let [zone_id, cards_in_zone]of this.cards_in_zones){
            cards_in_zone.splice(0, cards_in_zone.length);
            this.all_zones.get(zone_id).setData('card_ids', [])  ;            
            //this.cards_in_zones.set(zone_id, []);
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
                this.all_zones.get(zone_id).setData('card_ids', new_cards_in_zone); // use this to trigger update events
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
                    this.event_cardFlipped(...event.parameters);
                }
            }
        }
        // sync if sever event index is ahead
        if (last_event_index_applied > this.last_event_index){
            this.last_event_index = last_event_index_applied;
        }
    }

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
        this.all_zones.get(zone_id).setData('card_ids', Array.from(cards_in_zone));// use this to trigger update events
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
        this.all_zones.get(zone_id).setData('card_ids', Array.from(cards_in_zone));// use this to trigger update events
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
        const card = new PokerCard(this, 0, 0, 'cards', card_id);
        card.face_up = face_up;        
        this.add.existing(card);
        this.all_cards.set(card_id, card);
        return card;       
    }
    
    add_zone(zone_id, x, y, width, height, fillColor, boundary_width, boundary_height, card_step_x, card_step_y, card_scale, local_display){
        const zone = new CardZone(this, x, y, width, height, fillColor, zone_id, boundary_width, boundary_height, card_step_x, card_step_y, card_scale, local_display);
        this.all_zones.set(zone_id, zone);           
        this.add.existing(zone);  
        this.cards_in_zones.set(zone_id, []);
        return zone; 
    }


}