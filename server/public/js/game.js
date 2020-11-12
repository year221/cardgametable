import Phaser from './phaser.js';
import CardZone from './zone.js';
import Card from './cards.js';
export default class Game extends Phaser.Scene
{
    /** @type {Phaser.GameObjects.Zone} */
    all_zones;
    all_cards;
    activated_cards;
    dragged_cards;
    // perhaps use dictionary for faster search for both. 

	constructor()
	{
        super('game')
        this.all_zones = new Map();
        this.all_cards = new Map();
    }
    preload()
    {
        this.load.atlas('cards', 'assets/cards.png', 'assets/cards.json');
    }
    create()
    {
        var self = this;
        this.socket = io('http://localhost:8081');     
        this.socket.on('connect', function () {
            console.log('Connected!');
        });           




        //const frames = this.textures.get('cards').getFrameNames();
        
        //this.all_zones = this.add.group({
		//	classType: CardZone
        //})
        //this.all_cards = this.add.group({
        //    classType: Card
        //})   
        this.add_zone('zone1', 400,400,300,200, 0x333333);
        this.add_zone('zone2', 700,200,300,200, 0x333333);
        this.all_zones.get('zone2').angle = 90;

        const camera_view_type = Math.random(); 
        if (camera_view_type>=0.5){
            this.cameras.main.startFollow(this.all_zones.get('zone2'));
            this.cameras.main.setAngle(this.all_zones.get('zone2').angle);
            console.log('zone2 camera');
        } else {
            this.cameras.main.startFollow(this.all_zones.get('zone1'));
            this.cameras.main.setAngle(this.all_zones.get('zone1').angle);
            console.log('zone1 camera');
        }
        
        // let zone = new CardZone(this, 400,300,300,200, 0x333333, 'zone1');
        // this.all_zones.set('zone1', zone);        
        // this.add.existing(zone);        
        // zone = new CardZone(this, 300,600,300,200, 0x333333, 'zone2');
        // this.all_zones.set('zone2', zone);
        // this.add.existing(zone);        
        //this.all_zones.add(new CardZone(this, 400,300,300,200, 0x333333, 'zone1'), true);        
        //this.all_zones.add(new CardZone(this, 400,600,300,200, 0x333333, 'zone2'), true);  
        self.add_card_to_zone('zone1', null, 'J', 'cards','joker','back');
        self.add_card_to_zone('zone2', null, 'C', 'cards','clubs5','back');
        // let card = new Card(this, 400,300, 'cards','joker','back','1');
        // this.all_cards.set('1', card);
        // this.add.existing(card); 
        // card = new Card(this, 600,300, 'cards','clubs5','back','2');
        // this.all_cards.set('2', card);
        // this.add.existing(card); 
        //this.all_cards.add(new Card(this, 600,300, 'cards','clubs5','back','2'), true);        
        this.input.on('dragstart', function (pointer, gameObject) {
            // cache starting depth so that we could return it to its depth
            gameObject._drag_start_depth = gameObject.depth;            
            self.children.bringToTop(gameObject);
        })
        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {            
            // console.log('pointer-Y', pointer.x, pointer.y);
            // console.log('pointer-Y-camera', pointer.worldX, pointer.worldY);
            // console.log('dragX-Y', dragX, dragY);
            gameObject.x = dragX;
            gameObject.y = dragY;
          });            
        this.input.on('dragenter', function (pointer, gameObject, dropZone) {
            //console.log(`GameObject x is ${gameObject.x}`);
            //dropZone.setTint(0xffff33);
            dropZone.isStroked=true;                 
        });               
        this.input.on('dragleave', function (pointer, gameObject, dropZone) {
            //dropZone.clearTint();    
            dropZone.isStroked=false; 
      
        });         
        this.input.on('drop', function (pointer, gameObject, dropZone) {
                        
            gameObject.clearTint();

            if (gameObject instanceof Card && dropZone instanceof CardZone){
                self.socket.emit('cardMoved', gameObject.card_id,  gameObject.zone_id, dropZone.zone_id, gameObject.pos_in_zone);          
                
                self.add_card_to_zone(dropZone.zone_id, null, gameObject.card_id);
                // gameObject.x = dropZone.x;
                // gameObject.y = dropZone.y;                  
                // gameObject.pos_in_zone=0;
                
                // gameObject.zone_id = dropZone.zone_id;
            }
            //let prev_zone_id = gameObject.zone_id;                           
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
        
        this.socket.on('cardMoved', function (card_id, src_zone_id, dst_zone_id, dst_pos_in_zone) {
            //const last_pos = self.rearrange_card_in_zone_calculate_last_pos(dst_zone_id);            
            self.add_card_to_zone(dst_zone_id, dst_pos_in_zone, card_id).setDepth(dst_pos_in_zone+1);
            // const card = self.all_cards.get(card_id);
            // if (card.zone_id == src_zone_id){
            //     card.zone_id = dst_zone_id;
            //     card.pos_in_zone = dst_pos_in_zone;
            //     const zone = self.all_zones.get(dst_zone_id);
            //     card.x = zone.x;
            //     card.y = zone.y;
            // }   
            //card.pos_in_zone = dst_pos_in_zone;
        });
    }        

    add_card_to_zone(zone_id, pos_in_zone, card_id, texture, frame, frame_face_down){
        let card;
        const zone = this.all_zones.get(zone_id);
        if (pos_in_zone==null){
            const last_card = this.rearrange_card_in_zone_calculate_last_pos(zone_id);
            console.log(last_card,card_id);
            if (last_card.last_card_id == card_id){
                pos_in_zone = last_card.last_pos;
            } else {
                pos_in_zone = last_card.last_pos+1;
            }
        }

        const new_pos = zone.calculate_xy_from_pos(pos_in_zone);       

        if (!this.all_cards.has(card_id)) {
            card = new Card(this, new_pos.x, new_pos.y,
                texture, frame, frame_face_down, card_id);
            this.all_cards.set(card_id, card);
            this.add.existing(card);             
        } else {
            card = this.all_cards.get(card_id);

            card.setPosition(new_pos.x, new_pos.y);            
        }
        card.angle = zone.angle;
        card.zone_id = zone_id;
        card.pos_in_zone = pos_in_zone;
        card.depth = pos_in_zone+1;
        return card;
    }

    add_zone(zone_id, x, y, width, height, fillColor){
        const zone = new CardZone(this, x, y, width, height, fillColor, zone_id);
        this.all_zones.set(zone_id, zone);
        this.add.existing(zone);  
        return zone; 
    }

    // this function collect all cards in a zone and calculate their desired depth
    rearrange_card_in_zone_calculate_last_pos(zone_id,reset_depth_position){
        const card_in_zone = new Map();
        // loop through cards and record their position
        let max_pos = -1;
        //let card_id_at_max_pos = null;
        for (const [card_id, card] of this.all_cards.entries()) {
            if (card.zone_id == zone_id){
                card_in_zone.set(card.pos_in_zone, card_id);
                console.log(card_id, card.pos_in_zone, max_pos);
                if (card.pos_in_zone > max_pos)
                    max_pos = card.pos_in_zone;
                    //card_id_at_max_pos = card_id;
                    console.log('*',max_pos, card_in_zone.get(max_pos));
            }            
        }    
        // now loop through collected
        if ((reset_depth_position === undefined) || (reset_depth_position === null)){
            console.log('xx');
            return {last_pos:max_pos, last_card_id:card_in_zone.get(max_pos)};
            
        } else {
            let c_pos = -1;
            for (let pos = 0; pos <= max_pos; pos++) {
                if (card_in_zone.has(pos)){                
                    c_pos ++;
                    const card = this.all_cards.get(card_in_zone.get(pos)).setDepth(c_pos+1);
                    if (c_pos!= card.pos_in_zone){
                        card.set_pos_in_zone(c_pos);      
                        const new_pos = this.all_zones.get('zone_id').calculate_xy_from_pos(c_pos);              
                        card.setPosition(new_pos.x, new_pos.y); 
                    }                                       
                }
            }   
            return {last_pos:c_pos, last_card_id: card_in_zone.get(max_pos)};
        }
    }
}