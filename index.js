const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials 
} = require('discord.js');
const axios = require('axios');
const tar = require('tar-stream');
const { Readable } = require('stream');

// --- 1. BASE DE DATOS COMPLETA ---
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

// --- 2. IDS DEL SERVIDOR ---
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
    console.log(`✅ Scanner La Vagancia online: ${client.user.tag}`);
});

// --- 3. COMANDOS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content === '!ticketss') {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Auditoría La Vagancia')
            .setDescription('Presiona el botón para abrir un ticket de revisión.')
            .setColor(0x2b2d31);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Auditoría').setStyle(ButtonStyle.Primary).setEmoji('🔍')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        if (message.deletable) await message.delete();
    }

    // Scanner
    const attachment = message.attachments.first();
    if (attachment) {
        const esAnalista = message.member.roles.cache.has(ROLE_ANALISTA_1) || message.member.roles.cache.has(ROLE_ANALISTA_2);
        if (!esAnalista) return;

        const fileName = attachment.name.toLowerCase();
        if (DATABASE.EXT.some(ext => fileName.endsWith(ext))) {
            const statusMsg = await message.reply("📡 **Escaneando...**");
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
            } catch (e) { statusMsg.edit("❌ Error al procesar."); }
        }
    }
});

// --- 4. TICKETS ---
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
        await i.reply({ content: `Ticket: ${ch}`, ephemeral: true });
        await ch.send({ content: `Bienvenido ${i.user}, sube los archivos.`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar').setStyle(ButtonStyle.Danger))] });
    }
    if (i.customId === 'cerrar_ticket') {
        if (!i.member.roles.cache.has(ROLE_ANALISTA_1) && !i.member.roles.cache.has(ROLE_ANALISTA_2)) return;
        await i.reply("Cerrando...");
        setTimeout(() => i.channel.delete(), 3000);
    }
});

function runScanner(text, source, detections) {
    const t = text.toLowerCase();
    for (const [id, desc] of Object.entries(DATABASE.BUNDLES)) { if (text.includes(id)) detections.add(`🚫 **${desc}**`); }
    for (const [key, desc] of Object.entries(DATABASE.INFRA)) { if (text.includes(key)) detections.add(`🌐 **Infra:** ${desc}`); }
    DATABASE.WORDS.forEach(w => { if (t.includes(w)) detections.add(`⚠️ **Rastro:** "${w}"`); });
    DATABASE.TLDS.forEach(tld => { if (t.includes(tld)) detections.add(`🔗 **Dominio:** ${tld}`); });
    DATABASE.VPS.forEach(vps => { if (t.includes(vps)) detections.add(`🏢 **VPS:** ${vps}`); });
}

function finalizeReport(msg, detections, user, fileName) {
    const embed = new EmbedBuilder()
        .setTitle('📊 Reporte La Vagancia')
        .setColor(detections.size > 0 ? 0xFF0000 : 0x00FF00)
        .setDescription(detections.size > 0 ? `🚨 **SOSPECHOSO:**\n${Array.from(detections).join('\n')}` : `✅ **LIMPIO**`);
    msg.edit({ content: null, embeds: [embed] });
}

// ESTA LÍNEA ES LA QUE FALLA EN TU IMAGEN
client.login(process.env.DISCORD_TOKEN);