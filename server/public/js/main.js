import Phaser from './phaser.js'
import Game from './game.js'
import GameRoom from './game_room.js'
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';

export default new Phaser.Game({
	parent: 'rex-text-input',
	type: Phaser.AUTO,
	width: 1400,
	height: 770,
    dom: {
        createContainer: true
    },	
	scene: [GameRoom, Game],
})
console.log("finished");