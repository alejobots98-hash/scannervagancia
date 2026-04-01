const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const tar = require('tar-stream');
const { Readable } = require('stream');

// Importamos la base de datos completa de database.js
const { 
    BLACKLIST_BUNDLES, 
    CHEAT_INFRA,
    SUSPICIOUS_TLDS,
    VPS_KEYWORDS,
    SUSPICIOUS_WORDS,
    WHITELIST,
    ALLOWED_EXTENSIONS 
} = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// TOKEN DE TU BOT (Mantenlo en secreto)
const TOKEN = 'TU_TOKEN_AQUI';

client.once('ready', () => {
    console.log(`✅ Scanner La Vagancia v2.0 online: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const attachment = message.attachments.first();
    if (!attachment) return;

    const fileName = attachment.name.toLowerCase();
    const isSupported = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (isSupported) {
        const statusMsg = await message.reply("📡 **Iniciando Auditoría de Seguridad...** Analizando paquetes y firmas.");
        
        try {
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            let detections = new Set(); 

            if (fileName.endsWith('.tar')) {
                const extract = tar.extract();
                
                extract.on('entry', (header, stream, next) => {
                    let content = '';
                    stream.on('data', chunk => content += chunk);
                    stream.on('end', () => {
                        // Escanea cada archivo dentro del .tar
                        runScanner(content, header.name, detections);
                        next();
                    });
                    stream.resume();
                });

                const bufferStream = Readable.from(buffer);
                bufferStream.pipe(extract);

                extract.on('finish', () => {
                    generateFinalReport(statusMsg, detections, message.author, fileName);
                });

            } else {
                // Escaneo directo para .sys, .plist, .log
                const content = buffer.toString('utf-8');
                runScanner(content, fileName, detections);
                generateFinalReport(statusMsg, detections, message.author, fileName);
            }

        } catch (error) {
            console.error("Error en el escaneo:", error);
            statusMsg.edit("❌ **Error crítico:** No se pudo procesar el archivo.");
        }
    }
});

/**
 * Lógica de detección cruzada con toda la base de datos
 */
function runScanner(text, sourceName, detections) {
    const textLower = text.toLowerCase();

    // 1. Detección de Apps/Bundles (Jailbreak, Sideload, Proxies)
    for (const [id, desc] of Object.entries(BLACKLIST_BUNDLES)) {
        if (text.includes(id)) {
            // Verificar que no esté en la Whitelist (ej. Discord)
            if (!WHITELIST.BUNDLES.includes(id)) {
                detections.add(`🚫 **${desc}** (\`${id}\`)`);
            }
        }
    }

    // 2. Detección de Infraestructura de Cheats (IPs, Dominios específicos)
    for (const [key, desc] of Object.entries(CHEAT_INFRA)) {
        if (text.includes(key)) {
            detections.add(`🌐 **Cheat Infra:** ${desc} (\`${key}\`)`);
        }
    }

    // 3. Detección por TLDs Sospechosos (.xyz, .tk, .monster, etc)
    SUSPICIOUS_TLDS.forEach(tld => {
        if (textLower.includes(tld)) {
            detections.add(`🔗 **Dominio de riesgo:** \`${tld}\``);
        }
    });

    // 4. Detección de Hosting/VPS (Keywords)
    VPS_KEYWORDS.forEach(vps => {
        if (textLower.includes(vps)) {
            detections.add(`🏢 **Conexión a VPS detectada:** \`${vps}\``);
        }
    });

    // 5. Palabras clave sospechosas (Bypass, Inject, etc)
    SUSPICIOUS_WORDS.forEach(word => {
        if (textLower.includes(word.toLowerCase())) {
            detections.add(`⚠️ **Rastro de palabra clave:** "${word}"`);
        }
    });
}

/**
 * Genera el reporte visual en Discord
 */
function generateFinalReport(msg, detections, user, fileName) {
    const embed = new EmbedBuilder()
        .setTitle('🔍 Resultado de Auditoría - La Vagancia')
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: 'Scanner Anti-Hacks iOS' });

    if (detections.size > 0) {
        // Limitar la cantidad de detecciones mostradas para no romper el Embed
        const list = Array.from(detections).slice(0, 10).join('\n');
        
        embed.setColor(0xFF4444) // Rojo fuerte
             .setDescription(`🚨 **ALERTA DE SEGURIDAD**\nEl usuario **${user.username}** envió un archivo (\`${fileName}\`) con firmas sospechosas.`)
             .addFields({ name: 'Detecciones encontradas:', value: list || 'Múltiples rastros detectados.' });
        
        msg.edit({ content: `⚠️ **Posible infractor detectado:** ${user}`, embeds: [embed] });
    } else {
        embed.setColor(0x00FF44) // Verde flúor
             .setDescription(`✅ **VERIFICACIÓN EXITOSA**\nNo se encontraron rastros de inyectores, proxies o infraestructura de hacks en el archivo de **${user.username}**.`);
        
        msg.edit({ content: null, embeds: [embed] });
    }
}

client.login(TOKEN);