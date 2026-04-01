const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const yauzl = require('yauzl');
const tar = require('tar-stream');
const { Readable } = require('stream');

// --- 1. BASE DE DATOS COMPLETA ---
const DATABASE = {
    BUNDLES: {
        "com.opa334.TrollStore": "TrollStore (Sideload Permanente)",
        "com.opa334.trolldecrypt": "TrollDecrypt",
        "com.opa334.trollfools": "TrollFools (Inyector)",
        "xyz.willy.Zebra": "Zebra (Jailbreak)",
        "com.cydia.Cydia": "Cydia (Jailbreak)",
        "com.rileytestut.AltStore": "AltStore",
        "com.esign.ios": "ESign (Instalador/Cheat)",
        "com.tigisoftware.Filza": "Filza (File Manager Root)",
        "com.monite.proxyff": "ProxyFF (Cheat Free Fire)",
        "com.shadowrocket.Shadowrocket": "Shadowrocket (Proxy)",
        "com.nssurge.inc.surge-ios": "Surge (Proxy)",
        "com.opa334.dopamine": "Dopamine (Jailbreak)",
        "org.coolstar.sileo": "Sileo (Jailbreak)"
    },
    INFRA: {
        "46.202.145.85": "Fatality Cheats Server",
        "fatalitycheats.xyz": "Fatality Domain",
        "version.ffmax.purplevioleto.com": "PurpleVioleto Server",
        "version.ggwhitehawk.com": "White Hawk Server"
    },
    WORDS: ["proxy", "cheat", "hack", "bypass", "mitm", "inject", "spoof", "exploit", "payload", "tunnel"],
    VPS: ["hostinger", "digitalocean", "vultr", "hetzner", "ovh", "linode", "aws", "googlecloud", "azure"],
    EXT: [".sys", ".plist", ".tar", ".log", ".txt", ".zip"]
};

const CATEGORY_ID = '1488840757484982353';
const ROLE_ANALISTA_1 = '1488841621649883176';
const ROLE_ANALISTA_2 = '1211760228673257524';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel]
});

client.once('ready', () => console.log(`✅ Scanner La Vagancia v4.5 (High-RAM) listo.`));

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // COMANDO !ticketss
    if (message.content === '!ticketss') {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;
        const embed = new EmbedBuilder().setTitle('🛡️ Auditoría La Vagancia').setDescription('Presiona abajo para iniciar el escaneo avanzado de Sysdiagnose.').setColor(0x2b2d31);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Auditoría').setStyle(ButtonStyle.Primary));
        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }

    // ESCÁNER PARA ANALISTAS
    const attachment = message.attachments.first();
    if (attachment) {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const fileName = attachment.name.toLowerCase();
        if (DATABASE.EXT.some(ext => fileName.endsWith(ext))) {
            const statusMsg = await message.reply("⏳ **Iniciando descarga y procesamiento de archivo pesado...**");
            
            try {
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                let detections = [];

                if (fileName.endsWith('.zip')) {
                    // ESCANEO SEGURO DE ZIP (STREAMING)
                    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
                        if (err) throw err;
                        let count = 0;
                        const total = zipfile.entryCount;

                        zipfile.readEntry();
                        zipfile.on("entry", (entry) => {
                            count++;
                            if (count % 100 === 0 || count === total) {
                                const percent = Math.floor((count / total) * 100);
                                const barra = "🟩".repeat(percent / 10) + "⬛".repeat(10 - (percent / 10));
                                statusMsg.edit(`🔍 **Analizando archivos internos...**\n${barra} **${percent}%** (${count}/${total})\n📄 Actual: \`${entry.fileName.split('/').pop()}\``).catch(() => {});
                            }

                            if (/\/$/.test(entry.fileName)) {
                                zipfile.readEntry();
                            } else {
                                zipfile.openReadStream(entry, (err, readStream) => {
                                    if (err) { zipfile.readEntry(); return; }
                                    let content = "";
                                    readStream.on("data", chunk => { if (content.length < 500000) content += chunk; }); // Limite de lectura por archivo interno
                                    readStream.on("end", () => {
                                        runScanner(content, entry.fileName, detections);
                                        zipfile.readEntry();
                                    });
                                });
                            }
                        });

                        zipfile.on("end", () => finalizeReport(statusMsg, detections, message.author, fileName));
                    });

                } else {
                    // TAR O ARCHIVOS SUELTOS
                    runScanner(buffer.toString('utf8'), fileName, detections);
                    finalizeReport(statusMsg, detections, message.author, fileName);
                }
            } catch (e) {
                console.error(e);
                statusMsg.edit("❌ **Error Crítico:** Memoria insuficiente o archivo corrupto.");
            }
        }
    }
});

function runScanner(text, fileName, detections) {
    const t = text.toLowerCase();
    for (const [id, desc] of Object.entries(DATABASE.BUNDLES)) {
        if (text.includes(id)) detections.push({ type: '📦 APP', desc, detail: id, file: fileName });
    }
    for (const [key, desc] of Object.entries(DATABASE.INFRA)) {
        if (text.includes(key)) detections.push({ type: '🌐 INFRA', desc, detail: key, file: fileName });
    }
    DATABASE.WORDS.forEach(w => {
        if (t.includes(w)) detections.push({ type: '⚠️ RASTRO', desc: 'Keyword', detail: w, file: fileName });
    });
}

async function finalizeReport(msg, detections, user, mainFile) {
    const isClean = detections.length === 0;
    const color = isClean ? "#00ff44" : "#ff4444";
    
    let rows = detections.slice(0, 50).map(d => `<tr><td>${d.type}</td><td>${d.desc}</td><td><code>${d.detail}</code></td><td>${d.file}</td></tr>`).join('');
    const html = `<html><head><style>body{font-family:sans-serif;background:#111;color:#fff;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #333;text-align:left}th{background:#222;color:${color}}</style></head>
    <body><h1>REPORTE: ${isClean ? 'LIMPIO' : 'SOSPECHOSO'}</h1><p>Archivo: ${mainFile} | Analista: ${user.username}</p><table><thead><tr><th>Tipo</th><th>Desc</th><th>Dato</th><th>Archivo Interno</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

    const attachment = new AttachmentBuilder(Buffer.from(html), { name: `Reporte_${user.username}.html` });
    const embed = new EmbedBuilder()
        .setTitle('📊 Auditoría Sysdiagnose Finalizada')
        .setColor(isClean ? 0x00FF00 : 0xFF0000)
        .setDescription(isClean ? "✅ El usuario pasó la auditoría." : `🚨 Se detectaron **${detections.length}** posibles hacks. Revisa el HTML.`);

    await msg.edit({ content: null, embeds: [embed], files: [attachment] });
}

client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    if (i.customId === 'abrir_ticket') {
        const ch = await i.guild.channels.create({
            name: `auditoria-${i.user.username}`, type: ChannelType.GuildText, parent: CATEGORY_ID,
            permissionOverwrites: [{ id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }, { id: ROLE_ANALISTA_1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }, { id: ROLE_ANALISTA_2, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }]
        });
        await i.reply({ content: `Ticket: ${ch}`, ephemeral: true });
        await ch.send({ content: `Sube tu ZIP pesado aquí. **Analizando rastro forense...**`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar').setStyle(ButtonStyle.Danger))] });
    }
    if (i.customId === 'cerrar_ticket') {
        if (!i.member.roles.cache.has(ROLE_ANALISTA_1) && !i.member.roles.cache.has(ROLE_ANALISTA_2)) return;
        await i.channel.delete().catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);