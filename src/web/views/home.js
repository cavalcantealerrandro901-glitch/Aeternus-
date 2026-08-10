module.exports = (user, botUser, inviteUrl, supportUrl) => {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aeternus - Bot do Discord</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-white min-h-screen flex flex-col justify-between p-6">
        <header class="flex justify-between items-center max-w-4xl mx-auto w-full">
            <h1 class="text-2xl font-bold text-sky-400">${botUser?.username || 'Aeternus'}</h1>
            ${user ? `<a href="/dashboard" class="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-lg font-medium">Dashboard</a>` 
                   : `<a href="/login" class="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-lg font-medium">Login com Discord</a>`}
        </header>

        <main class="text-center max-w-2xl mx-auto my-12">
            <h2 class="text-4xl font-extrabold mb-4">Gerencie o seu servidor com facilidade</h2>
            <p class="text-slate-400 mb-8">Bot completo com painel web para tickets, moderação e muito mais.</p>
            <div class="flex justify-center gap-4">
                <a href="${inviteUrl}" target="_blank" class="bg-sky-500 hover:bg-sky-600 px-6 py-3 rounded-lg font-semibold">Adicionar ao Discord</a>
                <a href="${supportUrl}" target="_blank" class="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-lg font-semibold border border-slate-700">Servidor de Suporte</a>
            </div>
        </main>

        <footer class="text-center text-slate-500 text-sm">
            &copy; ${new Date().getFullYear()} Aeternus. Todos os direitos reservados.
        </footer>
    </body>
    </html>
    `;
};
