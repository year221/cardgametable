//const remove_items = function(array, items)
export function remove_items(array, items)
{
    const item_removed = [];
    const item_length = items.length;
    for (let i=0; i<item_length;i++)
    {
        const element = items[i];
        const index = array.indexOf(element);

        if (index !== -1)
        {
            array.splice(index,1);
            item_removed.push(element);
        }
    }
    return item_removed;
}

//const shuffle = function(array) {
export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
      [array[i], array[j]] = [array[j], array[i]];
    }
}

// module.exports.remove_items = remove_items;
// module.exports.shuffle = shuffle;
