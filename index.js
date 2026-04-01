const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, AttachmentBuilder 
} = require('discord.js');
const axios = require('axios');
const AdmZip = require('adm-zip');
const tar = require('tar-stream');
const { Readable } = require('stream');

// --- 1. BASE DE DATOS INTEGRADA ---
const DATABASE = {
    BUNDLES: {
        "com.opa334.TrollStore": "TrollStore (Sideload)",
        "com.opa334.trolldecrypt": "TrollDecrypt",
        "com.opa334.trollfools": "TrollFools (Inyector)",
        "xyz.willy.Zebra": "Zebra (Jailbreak)",
        "com.cydia.Cydia": "Cydia (Jailbreak)",
        "com.rileytestut.AltStore": "AltStore",
        "com.esign.ios": "ESign (Instalador/Cheat)",
        "com.iosgods.iosgods": "iOSGods App",
        "com.gbox.pubg": "GBox (Cheat)",
        "com.tigisoftware.Filza": "Filza (File Manager Root)",
        "com.monite.proxyff": "ProxyFF (Cheat FF)",
        "com.shadowrocket.Shadowrocket": "Shadowrocket (Proxy)",
        "com.nssurge.inc.surge-ios": "Surge (Proxy)",
        "com.opa334.dopamine": "Dopamine (Jailbreak)",
        "org.coolstar.sileo": "Sileo (Jailbreak)"
    },
    INFRA: {
        "46.202.145.85": "Fatality Cheats Server",
        "fatalitycheats.xyz": "Fatality Domain",
        "anubisw.online": "Anubis FF Cheat",
        "version.ffmax.purplevioleto.com": "PurpleVioleto Server",
        "version.ggwhitehawk.com": "White Hawk Server"
    },
    WORDS: ["proxy", "cheat", "hack", "bypass", "mitm", "inject", "spoof", "exploit", "payload", "tunnel"],
    VPS: ["hostinger", "digitalocean", "vultr", "hetzner", "ovh", "linode", "akamai", "contabo", "aws", "googlecloud", "azure"],
    EXT: [".sys", ".plist", ".tar", ".log", ".txt", ".zip"]
};

// --- 2. CONFIGURACIÓN ---
const CATEGORY_ID = '1488840757484982353';
const ROLE_ANALISTA_1 = '1488841621649883176';
const ROLE_ANALISTA_2 = '1211760228673257524';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel]
});

client.once('ready', () => {
    console.log(`✅ Scanner La Vagancia v4.0 Online: ${client.user.tag}`);
});

// --- 3. LÓGICA PRINCIPAL ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // COMANDO !ticketss
    if (message.content === '!ticketss') {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Panel de Auditoría - La Vagancia')
            .setDescription('Presiona el botón de abajo para abrir un ticket de revisión.\n\n**Soporta:** .ZIP, .TAR, .SYS, .LOG, .PLIST')
            .setColor(0x2b2d31);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Auditoría').setStyle(ButtonStyle.Primary).setEmoji('🔍')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }

    // ESCÁNER (Solo Analistas)
    const attachment = message.attachments.first();
    if (attachment) {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const fileName = attachment.name.toLowerCase();
        if (DATABASE.EXT.some(ext => fileName.endsWith(ext))) {
            const statusMsg = await message.reply("📥 **Descargando archivo...**");
            
            try {
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                let detections = [];

                // ANALIZAR ZIP
                if (fileName.endsWith('.zip')) {
                    const zip = new AdmZip(buffer);
                    const entries = zip.getEntries();
                    const total = entries.length;

                    for (let i = 0; i < total; i++) {
                        const entry = entries[i];
                        if (i % 15 === 0 || i === total - 1) { // Feedback cada 15 archivos
                            const percent = Math.floor((i / total) * 100);
                            const barra = "🟩".repeat(percent / 10) + "⬛".repeat(10 - (percent / 10));
                            await statusMsg.edit(`🔍 **Analizando ZIP...**\n${barra} **${percent}%**\n📄 Archivo: \`${entry.entryName.split('/').pop()}\``);
                        }
                        if (!entry.isDirectory) {
                            runScanner(entry.getData().toString('utf8'), entry.entryName, detections);
                        }
                    }
                    finalizeReport(statusMsg, detections, message.author, fileName);

                } else if (fileName.endsWith('.tar')) {
                    // ANALIZAR TAR
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
                    extract.on('finish', () => finalizeReport(statusMsg, detections, message.author, fileName));
                } else {
                    // ARCHIVO SUELTO
                    runScanner(buffer.toString('utf-8'), fileName, detections);
                    finalizeReport(statusMsg, detections, message.author, fileName);
                }
            } catch (e) {
                console.error(e);
                statusMsg.edit("❌ **Error:** El archivo es demasiado pesado para Railway o está corrupto.");
            }
        }
    }
});

// --- 4. SISTEMA DE TICKETS ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;

    if (i.customId === 'abrir_ticket') {
        const ch = await i.guild.channels.create({
            name: `auditoria-${i.user.username}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: ROLE_ANALISTA_1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: ROLE_ANALISTA_2, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
            ],
        });
        await i.reply({ content: `✅ Ticket: ${ch}`, ephemeral: true });
        await ch.send({ 
            content: `Hola ${i.user}, sube tu archivo (.zip, .tar o .sys). **Los analistas lo procesarán.**`,
            components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Auditoría').setStyle(ButtonStyle.Danger))]
        });
    }

    if (i.customId === 'cerrar_ticket') {
        const esAnalista = i.member.roles.cache.has(ROLE_ANALISTA_1) || i.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return i.reply({ content: "❌ Solo un Analista cierra tickets.", ephemeral: true });
        await i.reply("🔒 Cerrando...");
        setTimeout(() => i.channel.delete().catch(() => {}), 3000);
    }
});

// --- 5. MOTOR DE BÚSQUEDA ---
function runScanner(text, fileName, detections) {
    const t = text.toLowerCase();
    for (const [id, desc] of Object.entries(DATABASE.BUNDLES)) {
        if (text.includes(id)) detections.push({ type: '📦 APP/BUNDLE', desc, detail: id, file: fileName });
    }
    for (const [key, desc] of Object.entries(DATABASE.INFRA)) {
        if (text.includes(key)) detections.push({ type: '🌐 INFRAESTRUCTURA', desc, detail: key, file: fileName });
    }
    DATABASE.WORDS.forEach(w => {
        if (t.includes(w)) detections.push({ type: '⚠️ KEYWORD', desc: 'Rastro sospechoso', detail: w, file: fileName });
    });
    DATABASE.VPS.forEach(vps => {
        if (t.includes(vps)) detections.push({ type: '🏢 VPS/HOST', desc: 'Hosting detectado', detail: vps, file: fileName });
    });
}

// --- 6. GENERADOR DE HTML ---
async function finalizeReport(msg, detections, user, mainFile) {
    const isClean = detections.length === 0;
    const color = isClean ? "#00ff44" : "#ff4444";
    const status = isClean ? "LIMPIO" : "SOSPECHOSO";

    let rows = detections.map(d => `
        <tr>
            <td>${d.type}</td>
            <td>${d.desc}</td>
            <td class="code">${d.detail}</td>
            <td>${d.file}</td>
        </tr>`).join('');

    const html = `
    <html><head><style>
        body{font-family:sans-serif;background:#111;color:#fff;padding:20px}
        .header{border-left:5px solid ${color};padding-left:15px;margin-bottom:20px}
        h1{color:${color}}
        table{width:100%;border-collapse:collapse;background:#222}
        th,td{padding:12px;text-align:left;border-bottom:1px solid #333}
        th{background:#333;color:${color}}
        .code{color:#ffca28;font-family:monospace;background:#000;padding:2px 4px}
    </style></head><body>
        <div class="header"><h1>REPORTE LA VAGANCIA: ${status}</h1><p>Archivo: ${mainFile} | Analista: ${user.username}</p></div>
        ${isClean ? `<h2 style="color:#00ff44">✅ No se encontraron amenazas.</h2>` : `
        <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Dato Detectado</th><th>Archivo Interno</th></tr></thead>
        <tbody>${rows}</tbody></table>`}
    </body></html>`;

    const attachment = new AttachmentBuilder(Buffer.from(html), { name: `Reporte_${user.username}.html` });
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Auditoría Finalizada')
        .setColor(isClean ? 0x00FF00 : 0xFF0000)
        .setDescription(isClean ? "✅ El usuario está limpio." : `🚨 Se detectaron **${detections.length}** rastros de hacks. Descarga el reporte adjunto.`);

    await msg.edit({ content: null, embeds: [embed], files: [attachment] });
}

client.login(process.env.DISCORD_TOKEN);