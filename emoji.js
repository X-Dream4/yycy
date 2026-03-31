async function emojiLoad() { return (await dbGet('emojiData')) || { categories: [] }; }
async function emojiSave(data) { await dbSet('emojiData', JSON.parse(JSON.stringify(data))); }
