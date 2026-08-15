const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('<h1>Aeternus Bot Online</h1><p>O painel de monitoramento está ativo!</p>');
});

app.listen(port, () => {
    console.log(`Servidor web rodando na porta ${port}`);
});
