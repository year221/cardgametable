import Phaser from './phaser.js';
import {CardZone, calculate_circular_zone_xy} from './zone.js';
import {PokerCard, Card} from './cards.js';
import {TextButton} from './textbutton.js';

//import InputText from 'phaser3-rex-plugins/plugins/inputtext.js';  
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';
export default class GameRoom extends Phaser.Scene
{
    // The purpose of this object is to make connection to the server and get player id information. ANd also start game
    game_layout_file
	constructor()
	{
        super('GameRoom')    
        this.socket = window.Client.socket;        
    }       
    preload()
    {        
        if (this.plugins.get('rexinputtextplugin', false)===null){
            this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);               
        }
    }   
    create()
    {        
        var self = this;
        const x = -200;
        const y = -200;
        //this.sys.scale.scaleMode  = Phaser.Scale.NONE;
        this.scale.setGameSize(600, 800);

        //this.scale.resize();
        this.cameras.main.centerOn(0,0);//.setZoom(1.5);

        const name_label = this.add.text(x,y, 'Your Name', {fontSize:'20px'});
        this.name_input = this.add.rexInputText(
            x+220,
            y+8, 
            200, 25,
            {
            type: 'text',
            text: "Anonymous",
            fontSize: '20px',
            border: 1,    
            borderColor: '#888888',
            }
        );
        this.name_input.on('textchange', function(inputText){ 
            self.socket.emit('updatePlayerName', self.name_input.text);  
        });
        this.game_info = this.add.text(x, y+60, 'Game Status:', {fontSize: '20px'});
        this.player_info = this.add.text(x, y+80, 'Player Information', {fontSize: '20px'});

        this.join_game = this.add.text(x,y+30, 'Join Game', {fontSize:'20px', backgroundColor: '#666'});               
        this.join_game.on('pointerdown', function(){                                             
            self.socket.emit('joinGame');                                   
        })
                
        this.observe_game = this.add.text(x+140,y+30, 'Observe', {fontSize:'20px', backgroundColor: '#666'});        
        this.observe_game.on('pointerdown', function(){                                             
            self.socket.emit('observeGame');                                   
        })        
        this.start_game = this.add.text(x+280,y+30, 'Start Game', {fontSize:'20px', backgroundColor: '#666'});      
        this.start_game.on('pointerdown', function(){                                            
            self.socket.emit('startGame');                                   
        })         
        this.join_game.visible=false;
        this.observe_game.visible=false;
        this.start_game.visible=false;        

        const form = `
        <select name="layout" style="font-size: 12px; background-color: black; color: white; width: 200px"> Select Layout 
         <option value="English-Desktop">English-Desktop</option> 
         <option value="Chinese-Desktop">Chinese-Desktop</option> 
        </select>
        `;
        this.add.text(x,y+40, 'Select Game Layout ->', {fontSize:'12px'}); 
        var layout_select = this.add.dom().createFromHTML(form);
        this.game_layout_file = 'English-Desktop';
        layout_select.setPosition(x+250,y+47.5);
        layout_select.addListener('change');
  
        layout_select.on('change', function (event) {                     
            self.game_layout_file = event.target.value;
            console.log(event.target.value);
        });        

        this.socket.on('returnGameStatus', this.on_updateGameStatus.bind(this));       
        this.socket.on('playerInfo', this.display_player_info.bind(this));
        this.socket.on('startGameFromGameRoom', this.transition_to_game_scene.bind(this));
        this.socket.on('returnPlayerName', this.on_returnPlayerName.bind(this));
        this.socket.on('playerIDAssigned', function (player_id) {            
            Client.player_id = player_id;            
        });            

        this.socket.emit('requestGameStatus');
        this.socket.emit('getMyPlayerName');        
        
    }  

    on_updateGameStatus(game_status, player_info, can_be_joined){            
        if (game_status == 'Waiting'){                
            this.start_game.visible=true;
            this.start_game.setInteractive();
            this.join_game.visible=true;
            this.join_game.setInteractive();
            this.observe_game.visible=true;
            this.observe_game.setInteractive();
        } else if (game_status == 'InGame'){
            this.start_game.visible=false;
            // CHeck if can join
            if ((can_be_joined!==null) && (can_be_joined)){
                this.join_game.visible=true;
                this.join_game.setInteractive();
            } else {
                this.join_game.visible=false;                    
            }
            this.observe_game.visible=true;
            this.observe_game.setInteractive();
        }            
        this.display_game_info(game_status);
        this.display_player_info(player_info);
    }

    transition_to_game_scene(){
        this.socket.removeAllListeners();        
        this.scene.start('Game', {game_layout_file:this.game_layout_file});        
    }

    on_returnPlayerName(player_name){
        if (player_name ===null){
            this.socket.emit('updatePlayerName', this.name_input.text);  
        } else {
            this.name_input.setText(player_name);
        }        
    }
    
    display_game_info(game_status){
        
        if (game_status == 'Waiting'){
            this.game_info.setText('Game Status: Waiting for players to join');            
        } else if (game_status == 'InGame'){
            this.game_info.setText('Game Status: Game in play.');                        
        } 

    }
    display_player_info(player_info){
        const content = ['Player Information: '];
        for (let player of player_info){            
            if (player.player_name!==null){
                content.push('  ' + player.player_name+ '  '+ player.player_type);
            }            
        }           
        this.player_info.setText(content);
    }
}