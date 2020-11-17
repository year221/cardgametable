import Phaser from './phaser.js';
import CardZone from './zone.js';
import Card from './cards.js';
export default class Game extends Phaser.Scene
{
    /** @type {Phaser.GameObjects.Zone} */
    player_id;
    all_zones;
    all_cards;
    cards_in_zones;
    event_buffer;
    last_event_id;


    activated_cards;
    dragged_cards;
    
    // perhaps use dictionary for faster search for both. 
	constructor()
	{
        super('game')
        this.all_zones = new Map();
        this.all_cards = new Map();
        this.cards_in_zones = new Map();
    }
    preload()
    {
        this.load.atlas('cards', 'assets/cards.png', 'assets/cards.json');
    }
    create()
    {
        var self = this;
        this.socket = io();//'http://localhost:8081');     
        this.socket.on('connect', function () {
            console.log('Connected!');
        });           
 
        // sample card and zone placement
        const card_width=140;
        const card_height=190;
        this.add_zone('zone1', 400,600,300,210, 0x333333, 80, 105);
        this.add_zone('zone2', 700,400,300,210, 0x333333, 80, 105);
        this.all_zones.get('zone2').set_zone_angle(90);
        this.add_zone('zone3', 400,200,300,210, 0x333333, 80, 105);
        this.all_zones.get('zone3').set_zone_angle(180);          

        const camera_view_type = Math.random(); 
        if (camera_view_type>=0.5){
            this.cameras.main.startFollow(this.all_zones.get('zone2'));
            this.cameras.main.setAngle(this.all_zones.get('zone2').angle);
            console.log('zone2 camera');
            this.all_zones.get('zone3').set_local_display(false);               
        } else {
            this.cameras.main.startFollow(this.all_zones.get('zone1'));
            this.cameras.main.setAngle(this.all_zones.get('zone1').angle);
            console.log('zone1 camera');
        }

        self.add_new_card('zone1', undefined, 'J', 'cards','joker','back');
        self.add_new_card('zone2', undefined, 'C5', 'cards','clubs5','back');
        self.add_new_card('zone2', undefined, 'C6', 'cards','clubs6','back');

        this.input.on('dragstart', function (pointer, gameObject) {
            // cache starting depth so that we could return it to its depth
            gameObject._drag_start_depth = gameObject.depth;            
            self.children.bringToTop(gameObject);
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {            
            gameObject.x = dragX;
            gameObject.y = dragY;
        });            

        this.input.on('dragenter', function (pointer, gameObject, dropZone) {
            dropZone.highlight(true);
        });               

        this.input.on('dragleave', function (pointer, gameObject, dropZone) {
            dropZone.highlight(false);     
        });         

        this.input.on('drop', function (pointer, gameObject, dropZone) {
            dropZone.highlight(false); 
            gameObject.clearTint();

            if (gameObject instanceof Card && dropZone instanceof CardZone){
                self.socket.emit('cardMoved',  gameObject.zone_id, dropZone.zone_id, [gameObject.card_id],  null);                          
                self.move_cards(gameObject.zone_id, dropZone.zone_id, [gameObject.card_id]);
            }

        });          

        this.input.on('dragend', function (pointer, gameObject, dropped) {            
            if (!dropped)
            {
                gameObject.x = gameObject.input.dragStartX;
                gameObject.y = gameObject.input.dragStartY;
                gameObject.depth = gameObject._drag_start_depth; /// recover it depth
            }
        });   
        
        
        // socket io update from server on game status
        
        this.socket.on('cardMoved', function (src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone) {
            self.move_cards(src_zone_id, dst_zone_id, card_ids, dst_pos_in_zone);        
        });

        this.socket.on('playerIDAssigned', function (player_id) {
            console.log('received player ID', player_id);
            this.player_id = player_id;            
        });        
    }        

    remove_cards(zone_id, card_ids, squeeze_cards_in_zone)
    {
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
            const card = this.all_cards.get(cards_in_zone[i]);            
            const new_pos = zone.calculate_xy_from_pos(i);   
            card.setPosition(new_pos.x, new_pos.y).setDepth(i+1);
            card.zone_id=zone_id;
            card.angle = zone.angle;
            card.set_local_display(zone.local_display);
        }         
    }

    add_new_card(dst_zone_id, insertion_location, card_id, texture, frame, frame_face_down){

        const card = new Card(this, 0, 0, texture, frame, frame_face_down, card_id);        
        this.add.existing(card);
        this.all_cards.set(card_id, card);
        this.add_cards(dst_zone_id, [card_id], insertion_location); 

        // if (insertion_location === undefined) {
        //     insertion_location = this.cards_in_zones.get(dst_zone_id).length;
        // }
        // // add to cards in zone array
        
        // Phaser.Utils.Array.AddAt(this.cards_in_zones.get(dst_zone_id), card_id, insertion_location);
        

        // const dst_zone = this.all_zones.get(dst_zone_id);
        // add_cards(dst_zone_id, card_ids, insertion_location)
        // const new_pos = dst_zone.calculate_xy_from_pos(insertion_location);   
        // const card = new Card(this, new_pos.x, new_pos.y,
        //     texture, frame, frame_face_down, card_id).setDepth(insertion_location+1);                  
        // card.zone_id=dst_zone_id;
        // card.angle = dst_zone.angle;
        
        // console.log("add new cards");
    }

    add_zone(zone_id, x, y, width, height, fillColor, boundary_width, boundary_height){
        const zone = new CardZone(this, x, y, width, height, fillColor, zone_id, boundary_width, boundary_height);
        this.all_zones.set(zone_id, zone);           
        this.add.existing(zone);  
        this.cards_in_zones.set(zone_id, []);
        return zone; 
    }
}