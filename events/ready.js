module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot online! Logado como ${client.user.tag}`);
    },
};
