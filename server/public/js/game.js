import Phaser from './phaser.js';
import CardZone from './zone.js';

export default class Game extends Phaser.Scene
{
    /** @type {Phaser.GameObjects.Zone} */
    cardzones
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
        const frames = this.textures.get('cards').getFrameNames();
        const zone = new CardZone(this, 400,300,300,200, 0x333333);        
        zone.zone_id="zone1";
        this.add.existing(zone);        
        const zone2 = new CardZone(this, 400,600,300,200, 0x333333);        
        zone2.zone_id="zone2";
        this.add.existing(zone2);        
        const image = this.add.image(100, 100, 'cards', Phaser.Math.RND.pick(frames)).setInteractive();
        this.input.setDraggable(image);


        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {            
            gameObject.x = dragX;
            gameObject.y = dragY;
          });            
        this.input.on('dragenter', function (pointer, gameObject, dropZone) {
            console.log(`GameObject x is ${gameObject.x}`);
            gameObject.setTint(0xffff33);
            
      
        });          
        zone.on('pointerover', function () {
            console.log(`over the zone`)            
    
        });        
        this.input.on('dragleave', function (pointer, gameObject, dropZone) {
            gameObject.clearTint();     
      
        });         
        this.input.on('drop', function (pointer, gameObject, dropZone) {
            gameObject.clearTint();
            gameObject.x = dropZone.x;
            gameObject.y = dropZone.y;  
            self.socket.emit('cardMoved', gameObject, dropZone.zone_id);          
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