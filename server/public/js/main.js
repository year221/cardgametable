import Phaser from './phaser.js'
import Game from './game.js'
//import InputTextPlugin from './lib/rexinputtextplugin.min.js';

export default new Phaser.Game({
	parent: 'rex-text-input',
	type: Phaser.AUTO,
	width: 1400,
	height: 780,
    dom: {
        createContainer: true
    },	
	scene: Game,
})
console.log("finished");