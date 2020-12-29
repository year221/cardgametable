import Phaser from './phaser.js'
import Game from './game.js'
import GameRoom from './game_room.js'
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';

export default new Phaser.Game({
	parent: 'rex-text-input',
	type: Phaser.AUTO,
	width: 1400,
	height: 780,
	disableContextMenu: true,
    dom: {
        createContainer: true
    },	
    //pixelArt: true,
    //antialias: false,
    resolution: window.devicePixelRatio,
    // plugins: {
    //     scene: [
    //         { key: 'rexinputtextplugin', url: 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', start: true }            
    //     ]
    // },    
	scene: [GameRoom, Game],
})
console.log("finished");