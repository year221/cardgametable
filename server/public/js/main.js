import Phaser from './phaser.js'
import Game from './game.js'

export default new Phaser.Game({
	type: Phaser.AUTO,
	width: 1024,
	height: 768,
	scene: Game,
})
console.log("finished")