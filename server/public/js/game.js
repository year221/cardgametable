import Phaser from './phaser.js';
import CardZone from './zone.js';
import Card from './cards.js';
export default class Game extends Phaser.Scene
{
    /** @type {Phaser.GameObjects.Zone} */
    all_zones={}
    all_cards
    // perhaps use dictionary for faster search for both. 

	constructor()
	{
		super('game')
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
        this.all_cards = this.add.group({
            classType: Card
        })        
        this.all_zones['zone1'] = new CardZone(this, 400,300,300,200, 0x333333, 'zone1');
        this.add.existing(this.all_zones['zone1']);        
        this.all_zones['zone2'] = new CardZone(this, 400,600,300,200, 0x333333, 'zone2');
        this.add.existing(this.all_zones['zone2']);        
        //this.all_zones.add(new CardZone(this, 400,300,300,200, 0x333333, 'zone1'), true);        
        //this.all_zones.add(new CardZone(this, 400,600,300,200, 0x333333, 'zone2'), true);     
        this.all_cards.add(new Card(this, 400,300, 'cards',null,0), true);        

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
                self.socket.emit('cardMoved', gameObject.card_id,  gameObject.zone_id, dropZone.zone_id);          
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
    }
}