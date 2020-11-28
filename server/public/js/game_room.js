import Phaser from './phaser.js';
import {CardZone, calculate_circular_zone_xy} from './zone.js';
import {PokerCard, Card} from './cards.js';
import {TextButton} from './textbutton.js';

//import InputText from 'phaser3-rex-plugins/plugins/inputtext.js';  
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';
export default class GameRoom extends Phaser.Scene
{
    // The purpose of this object is to make connection to the server and get player id information. ANd also start game
	constructor()
	{
        super('GameRoom')    
        this.socket = window.Client.socket;            
    }       
    preload()
    {        
        this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);               
    }   
    create()
    {
        console.log('run game room creation');
        var self = this;
        const x = -100;
        const y = 0;
        this.cameras.main.centerOn(0,0);
        const name_label = this.add.text(x,y, 'Your Name', {fontSize:'12px'});
        this.name_input = this.add.rexInputText(
            x+150,
            y+5, 
            100, 20,
            {
            type: 'text',
            text: "Anonymous",
            fontSize: '12px',
            }
        );
        this.name_input.on('textchange', function(inputText){ 
            self.socket.emit('updatePlayerName', self.name_input.text);  
        });
        this.game_info = this.add.text(x, y+40, 'Game Status:', {fontSize: '12px'});
        this.player_info = this.add.text(x, y+60, 'Player Information', {fontSize: '12px'});

        this.join_game = this.add.text(x,y+20, 'Join Game', {fontSize:'12px', backgroundColor: '#666'});               
        this.join_game.on('pointerdown', function(){                                             
            self.socket.emit('joinGame');                                   
        })
                
        this.observe_game = this.add.text(x+100,y+20, 'Observe', {fontSize:'12px', backgroundColor: '#666'});        
        this.observe_game.on('pointerdown', function(){                                             
            self.socket.emit('observeGame');                                   
        })        
        this.start_game = this.add.text(x+200,y+20, 'Start Game', {fontSize:'12px', backgroundColor: '#666'});      
        this.start_game.on('pointerdown', function(){                                            
            self.socket.emit('startGame');                                   
        })         
        this.join_game.visible=false;
        this.observe_game.visible=false;
        this.start_game.visible=false;        

        

        this.socket.on('returnGameStatus', function(game_status, player_info){
            console.log('returnGameStatus', game_status, player_info);
            if (game_status == 'Waiting'){
                console.log('show elements')
                self.start_game.visible=true;
                self.start_game.setInteractive();
                self.join_game.visible=true;
                self.join_game.setInteractive();
                //self.observe_game.visible=true;
                //self.observe_game.setInteractive();
            } else if (game_status == 'InGame'){
                self.start_game.visible=false;
                self.join_game.visible=true;
                self.join_game.setInteractive();
                //self.observe_game.visible=true;
                //self.observe_game.setInteractive();
            }            
            self.display_player_info(player_info);
        });

        
        this.socket.on('playerInfo', function(player_info){
            self.display_player_info(player_info);
        });

        this.socket.on('startGameFromGameRoom', function(){
            console.log('startGame');
            console.log('our_player_id',Client.player_id);
            self.socket.removeAllListeners();
            self.scene.start('Game');
        });

        // if other players exit the game and return to game room update this one
        this.socket.on('returnToGameRoom', function(){            
            self.socket.emit('requestGameStatus');
            self.socket.emit('updatePlayerName', self.name_input.text);  
        });

        this.socket.emit('requestGameStatus');
        this.socket.emit('updatePlayerName', this.name_input.text);  
    }  
    
    display_player_info(player_info){
        const content = ['Player Information', ''];
        for (let player of player_info){
            //if (player.player_id <=-1){
            //    content.push(player.player_name+  " Observer");
            //} else {
            content.push(player.player_name+ '  '+ player.player_type);
            //}
        }           
        this.player_info.setText(content);
    }
}