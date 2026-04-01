const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const tar = require('tar-stream');
const AdmZip = require('adm-zip'); // Librería para ZIPs
const { Readable } = require('stream');

// --- DATABASE COMPLETA ---
const DATABASE = {
    BUNDLES: {
        "com.opa334.TrollStore": "TrollStore (Sideload Permanente)",
        "com.esign.ios": "ESign (Instalador de IPAs/Cheats)",
        "com.monite.proxyff": "ProxyFF (Cheat confirmado Free Fire)",
        "com.tigisoftware.Filza": "Filza (Gestor de Archivos Root)",
        "com.shadowrocket.Shadowrocket": "Shadowrocket (Proxy/MITM)",
        "com.nssurge.inc.surge-ios": "Surge (Proxy Avanzado)",
        "com.opa334.dopamine": "Dopamine (Jailbreak)",
        "org.coolstar.sileo": "Sileo (Package Manager JB)"
    },
    INFRA: {
        "46.202.145.85": "Fatality Cheats Server",
        "fatalitycheats.xyz": "Fatality Cheats Domain",
        "version.ffmax.purplevioleto.com": "PurpleVioleto Server",
        "version.ggwhitehawk.com": "White Hawk Server"
    },
    WORDS: ["proxy", "cheat", "hack", "bypass", "mitm", "inject", "spoof", "exploit", "vpn", "socks"],
    TLDS: [".site", ".xyz", ".pw", ".top", ".monster", ".lol", ".gq", ".tk"],
    VPS: ["hostinger", "digitalocean", "vultr", "hetzner", "ovh", "linode", "aws", "googlecloud", "azure", "sharktech", "path.net"],
    EXT: [".sys", ".plist", ".tar", ".log", ".txt", ".zip"] // Agregado .zip
};

const CATEGORY_ID = '1488840757484982353';
const ROLE_ANALISTA_1 = '1488841621649883176';
const ROLE_ANALISTA_2 = '1211760228673257524';
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel]
});

client.once('ready', () => console.log(`✅ Scanner La Vagancia ZIP-PRO listo.`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content === '!ticketss') {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;
        const embed = new EmbedBuilder().setTitle('🛡️ Auditoría La Vagancia').setDescription('Presiona el botón para iniciar el escaneo de ZIP/TAR.').setColor(0x2b2d31);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Auditoría').setStyle(ButtonStyle.Primary));
        await message.channel.send({ embeds: [embed], components: [row] });
    }

    const attachment = message.attachments.first();
    if (attachment) {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const fileName = attachment.name.toLowerCase();
        if (DATABASE.EXT.some(ext => fileName.endsWith(ext))) {
            const statusMsg = await message.reply("📡 **Procesando archivo... Esto puede tardar segun el peso.**");
            
            try {
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                let detections = [];

                // LÓGICA PARA ARCHIVOS ZIP
                if (fileName.endsWith('.zip')) {
                    const zip = new AdmZip(buffer);
                    const zipEntries = zip.getEntries();

                    zipEntries.forEach((entry) => {
                        if (!entry.isDirectory) {
                            const content = entry.getData().toString('utf8');
                            runScanner(content, entry.entryName, detections);
                        }
                    });
                    finalizeHTMLReport(statusMsg, detections, message.author, fileName);

                } else if (fileName.endsWith('.tar')) {
                    // LÓGICA PARA TAR
                    const extract = tar.extract();
                    extract.on('entry', (header, stream, next) => {
                        let content = '';
                        stream.on('data', c => content += c);
                        stream.on('end', () => {
                            runScanner(content, header.name, detections);
                            next();
                        });
                        stream.resume();
                    });
                    const s = new Readable(); s.push(buffer); s.push(null); s.pipe(extract);
                    extract.on('finish', () => finalizeHTMLReport(statusMsg, detections, message.author, fileName));

                } else {
                    // LÓGICA ARCHIVOS SUELTOS
                    runScanner(buffer.toString('utf-8'), fileName, detections);
                    finalizeHTMLReport(statusMsg, detections, message.author, fileName);
                }
            } catch (e) { 
                console.error(e);
                statusMsg.edit("❌ Error: El archivo es demasiado grande o está corrupto."); 
            }
        }
    }
});

function runScanner(text, fileName, detections) {
    const t = text.toLowerCase();
    for (const [id, desc] of Object.entries(DATABASE.BUNDLES)) {
        if (text.includes(id)) detections.push({ type: '📦 APP HACK', desc, detail: id, file: fileName });
    }
    for (const [key, desc] of Object.entries(DATABASE.INFRA)) {
        if (text.includes(key)) detections.push({ type: '🌐 INFRA', desc, detail: key, file: fileName });
    }
    DATABASE.WORDS.forEach(w => {
        if (t.includes(w)) detections.push({ type: '⚠️ RASTRO', desc: 'Keyword sospechosa', detail: w, file: fileName });
    });
}

async function finalizeHTMLReport(msg, detections, user, mainFile) {
    const isClean = detections.length === 0;
    const color = isClean ? "#00ff44" : "#ff4444";
    const statusText = isClean ? "LIMPIO" : "SOSPECHOSO";

    let rows = detections.map(d => `<tr><td>${d.type}</td><td>${d.desc}</td><td><code>${d.detail}</code></td><td>${d.file}</td></tr>`).join('');

    const htmlContent = `<html><head><style>body{font-family:sans-serif;background:#111;color:#fff;padding:20px}.header{border-left:5px solid ${color};padding:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border:1px solid #333;text-align:left}th{background:#222;color:${color}}code{color:#ffca28}</style></head>
    <body><div class="header"><h1>REPORTE LA VAGANCIA: ${statusText}</h1><p>Archivo: ${mainFile} | Analista: ${user.username}</p></div>
    ${isClean ? "<h2>✅ No se detectaron hacks.</h2>" : `<table><thead><tr><th>Tipo</th><th>Descripción</th><th>Dato</th><th>Archivo Interno</th></tr></thead><tbody>${rows}</tbody></table>`}
    </body></html>`;

    const attachment = new AttachmentBuilder(Buffer.from(htmlContent), { name: `Reporte_${mainFile}.html` });
    const embed = new EmbedBuilder()
        .setTitle('📊 Auditoría de ZIP Finalizada')
        .setDescription(isClean ? "✅ El ZIP está limpio." : `🚨 Se encontraron **${detections.length}** amenazas dentro del ZIP.`)
        .setColor(isClean ? 0x00FF00 : 0xFF0000);

    await msg.edit({ content: null, embeds: [embed], files: [attachment] });
}

// ... Lógica de tickets (abrir/cerrar) igual que antes ...
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    if (i.customId === 'abrir_ticket') {
        const ch = await i.guild.channels.create({
            name: `auditoria-${i.user.username}`, type: ChannelType.GuildText, parent: CATEGORY_ID,
            permissionOverwrites: [{ id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }, { id: ROLE_ANALISTA_1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }, { id: ROLE_ANALISTA_2, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }]
        });
        await i.reply({ content: `Ticket: ${ch}`, ephemeral: true });
        await ch.send({ content: `Sube tu ZIP o TAR aquí.`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar').setStyle(ButtonStyle.Danger))] });
    }
    if (i.customId === 'cerrar_ticket') {
        if (!i.member.roles.cache.has(ROLE_ANALISTA_1) && !i.member.roles.cache.has(ROLE_ANALISTA_2)) return;
        await i.channel.delete();
    }
});

client.login(TOKEN);