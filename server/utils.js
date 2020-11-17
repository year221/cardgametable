const remove_items = function(array, items)
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
};

module.exports.remove_items = remove_items;