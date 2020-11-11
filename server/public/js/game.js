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
        self.add_card_to_zone('zone1', '1', 'cards','joker','back');
        self.add_card_to_zone('zone2', '2', 'cards','clubs5','back');
        // let card = new Card(this, 400,300, 'cards','joker','back','1');
        // this.all_cards.set('1', card);
        // this.add.existing(card); 
        // card = new Card(this, 600,300, 'cards','clubs5','back','2');
        // this.all_cards.set('2', card);
        // this.add.existing(card); 
        //this.all_cards.add(new Card(this, 600,300, 'cards','clubs5','back','2'), true);        

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
                self.add_card_to_zone(dropZone.zone_id, gameObject.card_id);
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
            }
        });   
        
        
        // socket io update from server on game status
        
        this.socket.on('cardMoved', function (card_id, src_zone_id, dst_zone_id, dst_pos_in_zone) {
            
            self.add_card_to_zone(dst_zone_id, card_id).pos_in_zone = dst_pos_in_zone;
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

    add_card_to_zone(zone_id, card_id, texture, frame, frame_face_down){
        let card;
        const zone = this.all_zones.get(zone_id);
        if (!this.all_cards.has(card_id)) {
            card = new Card(this, zone.x,zone.y, texture, frame, frame_face_down, card_id);
            this.all_cards.set(card_id, card);
            this.add.existing(card);             
        } else {
            card = this.all_cards.get(card_id);
            card.x = zone.x;
            card.y = zone.y;            
        }
        card.angle = zone.angle;
        card.zone_id = zone_id;
        card.pos_in_zone = 0;
        return card;
    }

    add_zone(zone_id, x, y, width, height, fillColor){
        const zone = new CardZone(this, x, y, width, height, fillColor, zone_id);
        this.all_zones.set(zone_id, zone);
        this.add.existing(zone);  
        return zone; 
    }


}