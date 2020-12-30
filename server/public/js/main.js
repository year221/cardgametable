import Phaser from './phaser.js'
import Game from './game.js'
import GameRoom from './game_room.js'
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';

export default new Phaser.Game({
	parent: 'gamediv',
	type: Phaser.AUTO,

	disableContextMenu: true,
    dom: {
        createContainer: true
    },	
    scale: {
        parent: 'gamediv',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        mode: Phaser.Scale.FIT,
        width: 600,
        height: 800
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