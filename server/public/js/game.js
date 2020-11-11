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
        let zone = new CardZone(this, 400,300,300,200, 0x333333, 'zone1');
        this.all_zones.set('zone1', zone);        
        this.add.existing(zone);        
        zone = new CardZone(this, 400,600,300,200, 0x333333, 'zone2');
        this.all_zones.set('zone2', zone);
        this.add.existing(zone);        
        //this.all_zones.add(new CardZone(this, 400,300,300,200, 0x333333, 'zone1'), true);        
        //this.all_zones.add(new CardZone(this, 400,600,300,200, 0x333333, 'zone2'), true);     
        let card = new Card(this, 400,300, 'cards','joker','back','1');
        this.all_cards.set('1', card);
        this.add.existing(card); 
        card = new Card(this, 600,300, 'cards','clubs5','back','2');
        this.all_cards.set('2', card);
        this.add.existing(card); 
        //this.all_cards.add(new Card(this, 600,300, 'cards','clubs5','back','2'), true);        

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {            
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

            gameObject.x = dropZone.x;
            gameObject.y = dropZone.y;  
            if (gameObject instanceof Card && dropZone instanceof CardZone){
                gameObject.pos_in_zone=0;
                self.socket.emit('cardMoved', gameObject.card_id,  gameObject.zone_id, dropZone.zone_id, gameObject.pos_in_zone);          
                gameObject.zone_id = dropZone.zone_id;
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
            const card = self.all_cards.get(card_id);
            if (card.zone_id == src_zone_id){
                card.zone_id = dst_zone_id;
                card.dst_pos_in_zone = dst_pos_in_zone;
                const zone = self.all_zones.get(dst_zone_id);
                card.x = zone.x;
                card.y = zone.y;
            }            
        });
    }        

}