const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting Zork Bot with Lavalink...\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
    console.warn('Warning: .env file not found. Copy .env.example to .env and configure it.\n');
}

// Start Lavalink
console.log('Starting Lavalink server...');
const lavalink = spawn('java', ['-jar', 'Lavalink.jar', '--logging.config=file:./logback.xml'], {
    cwd: __dirname,
    stdio: 'pipe'
});

lavalink.stdout.on('data', (data) => {
    process.stdout.write(`[Lavalink] ${data}`);
});

lavalink.stderr.on('data', (data) => {
    process.stderr.write(`[Lavalink Error] ${data}`);
});

// Wait for Lavalink to start, then start bot
setTimeout(() => {
    console.log('\nStarting Discord bot...');
    const bot = spawn('node', ['src/main.js'], {
        cwd: __dirname,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
    });

    bot.stdout.on('data', (data) => {
        process.stdout.write(`[Bot] ${data}`);
    });

    bot.stderr.on('data', (data) => {
        process.stderr.write(`[Bot Error] ${data}`);
    });

    bot.on('close', (code) => {
        console.log(`Bot process exited with code ${code}`);
        lavalink.kill();
        process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        bot.kill();
        lavalink.kill();
        process.exit(0);
    });

}, 10000); // Wait 10 seconds for Lavalink to start

lavalink.on('close', (code) => {
    console.log(`Lavalink process exited with code ${code}`);
    process.exit(code);
});
