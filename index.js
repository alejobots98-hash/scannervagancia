const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials 
} = require('discord.js');
const axios = require('axios');
const tar = require('tar-stream');
const { Readable } = require('stream');

// --- 1. BASE DE DATOS INTEGRADA (TODOS TUS PERFILES) ---
const DATABASE = {
    BUNDLES: {
        "com.opa334.TrollStore": "TrollStore — Sideload permanente",
        "com.opa334.TrollStoreHelper": "TrollStoreHelper",
        "com.opa334.trolldecrypt": "TrollDecrypt — decifrar IPAs",
        "com.opa334.trollfools": "TrollFools — injetor de tweaks",
        "xyz.willy.Zebra": "Zebra — package manager JB",
        "com.cydia.Cydia": "Cydia — package manager JB",
        "com.rileytestut.AltStore": "AltStore — sideload",
        "com.altstore.altstoreclassic": "AltStore Classic — sideload",
        "com.sideloadly.sideloadly": "Sideloadly — sideload",
        "com.esign.ios": "ESign — sideload/IPA installer",
        "com.esign.esign": "ESign (alt) — sideload",
        "com.iosgods.iosgods": "iOSGods — cheat app store",
        "com.gbox.pubg": "GBox — cheat mod pubg/ff",
        "com.tigisoftware.Filza": "Filza — file manager root",
        "com.tigisoftware.FilzaFree": "Filza Free — file manager root",
        "app.ish.iSH": "iSH — shell Linux no iOS",
        "com.septudio.SSHClientLite": "SSH Client Lite — shell remoto",
        "live.cclerc.geranium": "Geranium — tweak manager JB",
        "com.apple.dt.Xcode": "Xcode — IDE Apple (sospechoso)",
        "com.apple.Preferences.Developer": "Preferencias de Desenvolvedor (activas)",
        "com.apple.developer": "Perfil de desenvolvedor Apple",
        "com.shpion.cleaner": "Spion Cleaner — limpieza de rastros",
        "com.ifunbox.ifunbox": "iFunBox — administrador de archivos",
        "com.limneos.adprivacy": "AdPrivacy — bloqueo/manipulación de red",
        "com.jjcm.nomoread": "NoMoreAd — bloqueo de red (MITM)",
        "com.touchingapp.potatsolite": "PotatsoLite — proxy iOS (mitm cheat)",
        "com.touchingapp.potatso": "Potatso — proxy iOS",
        "com.monite.proxyff": "ProxyFF — proxy iOS (cheat confirmado)",
        "com.nssurge.inc.surge-ios": "Surge — proxy/MITM iOS",
        "com.luo.quantumultx": "Quantumult X — proxy iOS",
        "com.shadowrocket.Shadowrocket": "Shadowrocket — proxy iOS",
        "com.opa334.dopamine": "Dopamine — Jailbreak",
        "org.coolstar.sileo": "Sileo — package manager JB",
        "com.electrateam.unc0ver": "unc0ver — Jailbreak",
        "xyz.palera1n.palera1n": "palera1n — Jailbreak"
    },
    INFRA: {
        "46.202.145.85": "Fatality Cheats — Servidor",
        "fatalitycheats.xyz": "Fatality Cheats — Dominio",
        "anubisw.online": "Anubis Cheat — FF",
        "api.baontq.xyz": "API Cheat — FF",
        "version.ffmax.purplevioleto.com": "PurpleVioleto FF MAX",
        "version.ggwhitehawk.com": "White Hawk Cheat",
        "loginbp.ggpolarbear.com": "Polar Bear Cheat",
        "sacnetwork.ggblueshark.com": "Blue Shark Cheat",
        "sacevent.ggblueshark.com": "Blue Shark Event"
    },
    WORDS: ["proxy", "cheat", "hack", "bypass", "mitm", "inject", "spoof", "crack", "exploit", "payload", "tunnel", "vpn", "socks"],
    TLDS: [".site", ".store", ".netlify.app", ".xyz", ".pw", ".top", ".click", ".win", ".download", ".icu", ".monster", ".lol", ".gq", ".tk"],
    VPS: ["hostinger", "digitalocean", "vultr", "hetzner", "ovh", "linode", "akamai", "contabo", "ionos", "godaddy", "aws", "googlecloud", "azure", "choopa", "sharktech", "quadranet", "path.net", "leaseweb", "multacom"],
    EXT: [".sys", ".plist", ".tar", ".log", ".txt"]
};

// --- 2. CONFIGURACIÓN DE IDS Y CLIENTE ---
const CATEGORY_ID = '1488840757484982353';
const ROLE_ANALISTA_1 = '1488841621649883176';
const ROLE_ANALISTA_2 = '1211760228673257524';
const TOKEN = process.env.DISCORD_TOKEN || 'TU_TOKEN_AQUI';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`✅ Scanner La Vagancia v3.0 listo como ${client.user.tag}`);
});

// --- 3. COMANDOS Y SCANNER ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Comando para crear el Panel de Tickets
    if (message.content === '!ticketss') {
        if (!message.member.roles.cache.has(ROLE_ANALISTA_1) && !message.member.roles.cache.has(ROLE_ANALISTA_2)) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Auditoría La Vagancia')
            .setDescription('Presiona el botón para abrir un ticket de revisión.\n\n**Aguarde a que un analista lo atienda.**')
            .setColor(0x2b2d31)
            .setFooter({ text: 'Protección Anti-Cheat iOS' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Auditoría').setStyle(ButtonStyle.Primary).setEmoji('🔍')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }

    // Lógica del Scanner (Solo se activa si un ANALISTA sube el archivo)
    const attachment = message.attachments.first();
    if (attachment) {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const fileName = attachment.name.toLowerCase();
        if (DATABASE.EXT.some(ext => fileName.endsWith(ext))) {
            const statusMsg = await message.reply("📡 **Escaneando archivos en busca de inyecciones...**");
            
            try {
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                let detections = new Set();

                if (fileName.endsWith('.tar')) {
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
                    const s = new Readable();
                    s.push(buffer); s.push(null); s.pipe(extract);
                    extract.on('finish', () => finalizeReport(statusMsg, detections, message.author, fileName));
                } else {
                    runScanner(buffer.toString('utf-8'), fileName, detections);
                    finalizeReport(statusMsg, detections, message.author, fileName);
                }
            } catch (e) { 
                console.error(e);
                statusMsg.edit("❌ Error técnico al procesar el archivo."); 
            }
        }
    }
});

// --- 4. INTERACCIONES DE TICKETS ---
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

        await i.reply({ content: `✅ Ticket de auditoría abierto: ${ch}`, ephemeral: true });

        const embedTicket = new EmbedBuilder()
            .setTitle('📂 Auditoría Iniciada')
            .setDescription(`Bienvenido ${i.user}.\n\nPor favor, sube tu archivo para que el analista lo procese.\n\n**Solo los analistas pueden ejecutar el escaneo.**`)
            .setColor(0x00FF44);

        const rowClose = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Auditoría').setStyle(ButtonStyle.Danger)
        );

        await ch.send({ embeds: [embedTicket], components: [rowClose] });
    }

    if (i.customId === 'cerrar_ticket') {
        const esAnalista = i.member.roles.cache.has(ROLE_ANALISTA_1) || i.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return i.reply({ content: "❌ Solo un Analista puede cerrar este ticket.", ephemeral: true });
        
        await i.reply("🔒 Cerrando y limpiando datos en 5 segundos...");
        setTimeout(() => i.channel.delete(), 5000);
    }
});

// --- 5. FUNCIÓN DE ESCANEO PROFUNDO ---
function runScanner(text, source, detections) {
    const t = text.toLowerCase();

    // Buscar Bundles de Hacks/Jailbreak
    for (const [id, desc] of Object.entries(DATABASE.BUNDLES)) {
        if (text.includes(id)) detections.add(`🚫 **${desc}** (\`${id}\`)`);
    }
    // Buscar Infraestructura (IPs/Dominios)
    for (const [key, desc] of Object.entries(DATABASE.INFRA)) {
        if (text.includes(key)) detections.add(`🌐 **Infra:** ${desc}`);
    }
    // Buscar Palabras Clave
    DATABASE.WORDS.forEach(w => { if (t.includes(w)) detections.add(`⚠️ **Rastro:** "${w}"`); });
    // Buscar TLDs Riesgosos
    DATABASE.TLDS.forEach(tld => { if (t.includes(tld)) detections.add(`🔗 **Dominio:** ${tld}`); });
    // Buscar VPS/Hosting
    DATABASE.VPS.forEach(vps => { if (t.includes(vps)) detections.add(`🏢 **VPS detectada:** ${vps}`); });
}

// --- 6. REPORTE FINAL ---
function finalizeReport(msg, detections, user, fileName) {
    const embed = new EmbedBuilder()
        .setTitle('📊 Reporte Forense La Vagancia')
        .setTimestamp()
        .setFooter({ text: `Analista: ${user.username} | Archivo: ${fileName}` });

    if (detections.size > 0) {
        embed.setColor(0xFF0000)
             .setDescription(`🚨 **RESULTADO: SOSPECHOSO**\nSe han encontrado las siguientes coincidencias:`)
             .addFields({ name: 'Detecciones:', value: Array.from(detections).slice(0, 15).join('\n') });
    } else {
        embed.setColor(0x00FF00)
             .setDescription(`✅ **RESULTADO: LIMPIO**\nNo se hallaron rastros de herramientas de inyección ni proxies conocidos.`);
    }
    msg.edit({ content: null, embeds: [embed] });
}

client.login(TOKEN);