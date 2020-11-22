import Phaser from './phaser.js';
import {CardZone, calculate_circular_zone_xy} from './zone.js';
import {PokerCard, Card} from './cards.js';
//import InputText from 'phaser3-rex-plugins/plugins/inputtext.js';  
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';
export default class Game extends Phaser.Scene
{
    /** @type {Phaser.GameObjects.Zone} */
    player_id='0';
    all_zones;
    all_cards;
    cards_in_zones;
    event_buffer;
    last_event_index;


    input_text;
    // temporary card holdlers to deal to multiple ard select and drag.
    activated_cards;    
    to_be_deactivate_upon_pointer_up;
    on_multiple_selection;    
    layout_cfg={
        card_delta_x: 30,
        card_delta_y: 0,
    }
    dragging_cache_param={
        starting_depth:500,
        step_x:0,
        step_y:0,
        offset_x:0,
        offset_y:0,
    }
    layout_cfg={};

	constructor()
	{
        super('game')
        this.all_zones = new Map();
        this.all_cards = new Map();
        this.cards_in_zones = new Map();
        this.event_buffer = new Map();
        this.last_event_index=-1;
        //this.primary_card = null;        
        this.on_multiple_selection=false;
        //this.zone_id_of_activated_cards=null;
        this.to_be_deactivate_upon_pointer_up=[];
        this.tint_color_for_activated_card = 0xa0a0ff;
        this.previous_empty_click=false;
        
    }
    preload()
    {
        this.load.atlas('cards', 'assets/cards.png', 'assets/cards.json');
        this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);           
    
    }
    create()
    {
        var self = this;
        this.socket = io();//'http://localhost:8081');     
        this.socket.on('connect', function () {
            console.log('Connected!');
        });    
        
        this.activated_cards = this.add.group();
        //this.to_be_deactivate_upon_pointer_up = this.add.group();
        // configuration
        this.input.dragDistanceThreshold=5;
 
        // sample card and zone placement 
        const card_width=140;
        const card_height=190;



        //this.layout_zones_and_buttons(layout_cfg);
        //this.add_zone('zone1', 400,600,300,210, 0x333333, 45, 57.5,15,30,0.5, 0);
        //this.add_zone('zone2', 700,400,300,210, 0x333333, 45, 57.5,15,30,1, 0);
        //this.all_zones.get('zone2').set_zone_angle(90);
        //this.add_zone('zone3', 400,200,300,210, 0x333333, 45, 57.5,15,30,0.5, 0);
        //this.all_zones.get('zone3').set_zone_angle(180); 
        this.cameras.main.centerOn(0,0);
        //this.cameras.main.startFollow(this.all_zones.get('zone_0'));
        //this.cameras.main.setAngle(this.all_zones.get('zone2').angle);
        // const camera_view_type = Math.random(); 
        
        // if (camera_view_type>=0.5){
            
        //     this.cameras.main.centerOn(this.all_zones.get('zone2').x, this.all_zones.get('zone2').y);
        //     this.cameras.main.setAngle(this.all_zones.get('zone2').angle);
        //     //this.cameras.main.startFollow(this.all_zones.get('zone2'));
        //     console.log('zone2 camera');
        //     this.all_zones.get('zone3').set_local_display(1);               
        // } else {
        //     this.cameras.main.centerOn(this.all_zones.get('zone1').x, this.all_zones.get('zone1').y);
        //     this.cameras.main.setAngle(this.all_zones.get('zone1').angle);
        //     //this.cameras.main.startFollow(this.all_zones.get('zone1'));
        //     console.log('zone1 camera');
        // }
        // console.log("camera rotation",this.cameras.main.rotation);
        //this.cameras.main.setZoom(1);
        const _sinR=Math.sin(this.cameras.main.rotation);
        const _cosR=Math.cos(this.cameras.main.rotation);       
        this.layout_cfg.dragging_card_group_delta_x = this.layout_cfg.card_delta_x*_cosR + this.layout_cfg.card_delta_y*_sinR;
        this.layout_cfg.dragging_card_group_delta_y = -this.layout_cfg.card_delta_x*_sinR + this.layout_cfg.card_delta_y*_cosR;         
        //self.add_new_card('zone1', undefined, 'J1');
        //self.add_new_card('zone1', undefined, 'J2');
        //self.add_new_card('zone2', undefined, 'C5');
        //self.add_new_card('zone2', undefined, 'C6');

        //const flip_button_xy = this.cameras.main.c;//getWorldPoint(this.cameras.main.width/2,this.cameras.main.height/2);
        //console.log(flip_button_xy);
        //console.log(this.cameras.main.centerX, this.cameras.main.centerY);
        const flip_button = this.add.text(0,0, 'FLIP', {color:'#0f0', backgroundColor: '#666' });
        flip_button.setInteractive();
        flip_button.on('pointerdown', function(){
            const all_activated_cards = self.activated_cards.getChildren();   
            const card_ids=all_activated_cards.map(card => card.card_id);
            self.flip_cards(card_ids);            
            for (let card of all_activated_cards){
                card.clearTint();
            }                  
            self.activated_cards.clear();                
            self.last_event_index ++;
            self.event_buffer.set(self.last_event_index, {'name':'cardFlipped', 'parameters':[card_ids]});                                                
            self.socket.emit('cardFlipped', self.last_event_index, card_ids);                       
            // for (let card of all_activated_cards){
            //     card.flip_face();
            // }                  
        })

        const reset_button = this.add.text(0, 50, 'RESET', {color:'#0f0', backgroundColor: '#666' });
        reset_button.setInteractive();
        reset_button.on('pointerdown', function(){                                               
            self.socket.emit('resetGame');                       
            // for (let card of all_activated_cards){
            //     card.flip_face();
            // }                  
        })        

        this.add.text(- 120 , -100, '#Decks');
        const inputText = this.add.rexInputText(-60, -100, 40, 40, {
            type: 'number',
            text: '4',
            fontSize: '12px',
        })
        inputText.rotate3d.set(0,0,1,-this.cameras.main.rotation/Math.PI*180);
        this.input_text = inputText;
        
        const generate_button = this.add.text(0, -100, 'GENERATE CARD', {color:'#0f0', backgroundColor: '#666' });
        generate_button.setInteractive();
        generate_button.on('pointerdown', function(){
            //self.flip_cards(card_ids);
            console.log('text', self.input_text.text);
            const n_decks = Math.round(self.input_text.text);
            self.last_event_index ++;            
            self.event_buffer.set(self.last_event_index, {'name':'generateCard', 'parameters':[1]});    
            //self.event_buffer.set(self.last_event_index, {'name':'cardFlipped', 'parameters':[card_ids]});                                                
            self.socket.emit('generateCard', self.last_event_index, 'zone_0', n_decks, true);                       
            // for (let card of all_activated_cards){
            //     card.flip_face();
            // }                  
        });  
        // Above will be replaced by event
        // TODO: Replace above with synchronization from server.

        this.input.on('dragstart', function (pointer, gameObject) {
            // cache starting depth so that we could return it to its depth
            //gameObject._drag_start_depth = gameObject.depth;            
            
            const rotation = gameObject.rotation;
            const all_activated_cards = self.activated_cards.getChildren();
            for (let card of all_activated_cards){
                card.rotation = rotation;
            }  
            //self.children.bringToTop(all_activated_cards[0]);              
            const index_pos_primary_card = all_activated_cards.indexOf(gameObject);

            console.log('index_pos_primary_card',index_pos_primary_card);
            const _sinR=Math.sin(rotation);
            const _cosR=Math.cos(rotation);            
            self.dragging_cache_param.step_x = self.layout_cfg.card_delta_x*_cosR + self.layout_cfg.card_delta_y*_sinR;
            self.dragging_cache_param.step_y = -self.layout_cfg.card_delta_x*_sinR + self.layout_cfg.card_delta_y*_cosR;            
            self.dragging_cache_param.offset_x = -index_pos_primary_card*self.dragging_cache_param.step_x;
            self.dragging_cache_param.offset_y = -index_pos_primary_card*self.dragging_cache_param.step_y;                
            self.activated_cards
            .setDepth(self.dragging_cache_param.starting_depth, 1)            
            .setXY(gameObject.x+self.dragging_cache_param.offset_x,
                gameObject.y+self.dragging_cache_param.offset_y,
                self.dragging_cache_param.step_x,
                self.dragging_cache_param.step_y);
                //.setXY(gameObject.x,gameObject.y,self.layout_cfg.dragging_card_group_delta_x,self.layout_cfg.dragging_card_group_delta_y);

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
            dropZone.highlight(true);
        });               

        this.input.on('dragleave', function (pointer, gameObject, dropZone) {
            dropZone.highlight(false);     
        });         

        this.input.on('drop', function (pointer, gameObject, dropZone) {
            dropZone.highlight(false); 
            //gameObject.clearTint();
            console.log('drop');
            if (gameObject instanceof Card && dropZone instanceof CardZone){
                //const src_zone_id = gameObject.zone_id;
                const dst_zone_id = dropZone.zone_id;
                const all_activated_cards = self.activated_cards.getChildren();
                for (let card of all_activated_cards){
                    card.clearTint();
                }                
                let src_zone_id = all_activated_cards[0].zone_id;
                let card_ids = [];
                for (let card of all_activated_cards){
                    console.log('-',card.card_id);
                    if (card.zone_id == src_zone_id){                        
                        card_ids.push(card.card_id);
                        console.log('zones', card.zone_id, src_zone_id, card_ids);
                    } else {
                        console.log('Moving', card_ids);
                        self.move_cards(src_zone_id, dst_zone_id, card_ids);
                        self.last_event_index ++;
                        self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[src_zone_id, dst_zone_id, card_ids]});                                                
                        self.socket.emit('cardMoved',  self.last_event_index, src_zone_id, dst_zone_id, card_ids,  null);                                
                        card_ids = [card.card_id];
                        src_zone_id  = card.zone_id;
                    }
                }
                if (card_ids.length>0){
                    self.move_cards(src_zone_id, dst_zone_id, card_ids);
                    self.last_event_index ++;
                    self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[src_zone_id, dst_zone_id, card_ids]});                                                
                    self.socket.emit('cardMoved',  self.last_event_index, src_zone_id, dst_zone_id, card_ids,  null);                        
                }

                self.activated_cards.clear();
                while (self.to_be_deactivate_upon_pointer_up.length>0){
                    self.to_be_deactivate_upon_pointer_up.pop();     
                }           
                // self.move_cards(src_zone_id, dst_zone_id, [gameObject.card_id]);
                // self.last_event_index ++;
                // self.event_buffer.set(self.last_event_index, {'name':'cardMoved', 'parameters':[src_zone_id, dst_zone_id, [gameObject.card_id]]});                                                
                // self.socket.emit('cardMoved',  self.last_event_index, src_zone_id, dst_zone_id, [gameObject.card_id],  null);        
                
            }

        });          

        this.input.on('dragend', function (pointer, gameObject, dropped) {            
            if (!dropped)
            {
                //gameObject.x = gameObject.input.dragStartX;
                //gameObject.y = gameObject.input.dragStartY;
                //gameObject.depth = gameObject._drag_start_depth; /// recover it depth
                const all_activated_cards = self.activated_cards.getChildren();
                for (let card of all_activated_cards){
                    card.clearTint();
                }
                const zone_ids = new Set(all_activated_cards.map(card => card.zone_id));
                for (let zone_id of zone_ids){
                    self.update_cards_in_zone(zone_id);
                  }
                self.activated_cards.clear();
                //self.update_cards_in_zone(gameObject.zone_id);
            }
        });   

        // Activate cards
        this.input.on('pointerdown', function(pointer, gameObjects){  
            //self.mouse_moved=false;
            if (gameObjects.length>=1){
                
                if (gameObjects[0] instanceof Card){
                    //self.primary_card = gameObjects[0].card_id;      
                    const card = gameObjects[0];
                    if (self.activated_cards.contains(card)){
                    //if (self.activated_cards.includes(card.card_id)){
                        self.to_be_deactivate_upon_pointer_up.push(card);
                    } else {
                        self.activated_cards.add(card);
                        card.setTint(self.tint_color_for_activated_card);
                    }
                } else if (gameObjects[0] instanceof CardZone){
                    self.on_multiple_selection = true;
                }
            } else {
                self.on_multiple_selection = true;                
            }           
        });

        this.input.on('pointerup', function(pointer){  
            self.on_multiple_selection = false;
            // if (!self.mouse_moved){
            //     if (self.previous_empty_click){
            //         // clear all selected cards'
            //         const all_activated_cards = self.activated_cards.getChildren();
            //         for (let card of all_activated_cards){
            //             card.clearTint();
            //         }                  
            //         self.activated_cards.clear();     
            //     } else {
            //         self.previous_empty_click=true;
            //     }
            // } else {self.previous_empty_click=false};
            while (self.to_be_deactivate_upon_pointer_up.length>0){
                const card = self.to_be_deactivate_upon_pointer_up.pop();
                card.clearTint();
                self.activated_cards.remove(card);

                // const index = self.activated_cards.indexOf(card_id);
                // if (index>=0){
                //     self.all_cards.get(card_id).clearTint();
                    
                // }                
            }       
            
        });

        this.input.on('gameobjectover', function(pointer, gameObject){
            //self.mouse_moved=true;
            if (self.on_multiple_selection && (gameObject instanceof Card)){                
                if (self.activated_cards.contains(gameObject)){
                //if (self.activated_cards.includes(card.card_id)){
                    //self.activated_cards.remove(gameObject);
                    //gameObject.clearTint();
                } else {
                    self.activated_cards.add(gameObject);
                    gameObject.setTint(self.tint_color_for_activated_card);
                }                
            }
        });
        // socket io update from server on game status
        
        // this.socket.on('cardMoved', function (src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone) {
        //     self.move_cards(src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone);        
        // });

        this.socket.on('playerIDAssigned', function (player_id) {
            console.log('received player ID', player_id);
            self.player_id = player_id;            
        });    

        this.socket.on('resetLayout', function (layout_cfg) {
            self.layout_zones_and_buttons(layout_cfg);
            self.cameras.main.centerOn(layout_cfg.default_camera.x, layout_cfg.default_camera.y);   
        });           
        
        this.socket.on('gameStateSync', function (last_events, cards_in_zones, cards_status) {
            console.log('received gamesStateSync', last_events, cards_in_zones, cards_status);
            if (cards_in_zones != null){
                self.sync_card_in_zones(cards_in_zones);
            }
            if (cards_status != null){
                self.sync_card_status(cards_status);
            }
            if (last_events.hasOwnProperty(self.player_id)){
                self.apply_and_update_event_buffer(last_events[self.player_id]);
            }
            //this.player_id = player_id;            
        });       
        this.socket.on('setGameToInitialStage', function(){
            self.clear_all_cards();
            self.clear_all_events();
        });
    }        
    
    // set zone and button layouts
    clear_all_zones(){
        for (let [zone_id, zone] of this.all_zones){
            zone.destroy();
        }
        this.all_zones.clear();
        this.cards_in_zones.clear();
    }
    
    layout_zones_and_buttons(layout_cfg){
        for (let zone_grp of layout_cfg['zones']){
            if (zone_grp.type=='one_zone_per_player'){
                
                let zone_xy = calculate_circular_zone_xy(
                    zone_grp.starting_x, zone_grp.starting_y,
                    zone_grp.step_x, zone_grp.step_y, layout_cfg.n_players,
                    zone_grp.n_row
                    );
                for (let player_id = 0; player_id<layout_cfg.n_players; player_id++){
                   let xy_pos = zone_xy[((player_id-Math.floor(this.player_id))%layout_cfg.n_players+layout_cfg.n_players)%layout_cfg.n_players];
                   let zone_id = zone_grp.name + '_' + String(player_id);
                   let local_display = zone_grp.local_display_other_player
                   if (String(player_id)==this.player_id){
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
        this.event_buffer.clear;
        this.last_event_index=-1;
    }
    // synchronize all cards in the zones 

    sync_card_in_zones(new_cards_in_zones)
    {
        let removed_card_ids_of_changed_zones=[];
        let added_card_ids_of_changed_zones=[];
        for (const [zone_id, cards_in_zone] of this.cards_in_zones) {
            const new_cards_in_zone = new_cards_in_zones[zone_id];
            
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
            let card = self.all_cards.get(card_id);
            self.all_cards.delete(card_id);
            card.destroy();// remove from pahser            
        }        

        // remove those "moved away" cards from the activated cards
        //const to_be_removed_active_cards = self.activated_cards.getChildren().filter(card=> removed_card_ids_of_changed_zones.includes(card.card_id));
        //for (let card of to_be_removed_active_cards){
        //    self.activated_cards.remove(card);
        //}                
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
        console.log('last index', last_event_index_applied);

        const min_event_index = Math.min(...this.event_buffer.keys());        
        for (let i=min_event_index; i<=last_event_index_applied;i++){
            this.event_buffer.delete(i);
        }
        console.log('after change', this.event_buffer)        
        for (let i=last_event_index_applied+1; i<=this.last_event_index;i++){            
            const event = this.event_buffer.get(i);
            if (!(event === undefined)){            
                if (event.name==='cardMoved'){
                    this.move_cards(...event.parameters);
                } else if (event.name==='cardFlipped'){
                    this.flip_cards(...event.parameters);
                }
            }
        }
    }

    // flip face of cards
    flip_cards(card_ids)
    {
        for (let card_id of card_ids){
            this.all_cards.get(card_id).flip_face();
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
}