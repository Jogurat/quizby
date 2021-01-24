require("dotenv").config();
const Discord = require("discord.js");
const discordClient = new Discord.Client();
const mysql = require("mysql");
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "pera1998",
    database: "quizby"
});
connection.connect();
discordClient.login(process.env.BOT_TOKEN);
const prefix = process.env.PREFIX || "elegiggle ";

discordClient.on("message", async (msg) => {
    if (msg.author.bot) return;
    if(!msg.content.startsWith(prefix)) return;
    const commandBody = msg.content.slice(prefix.length);
    const args = commandBody.split(" ");
    const command = args.shift().toLowerCase();
    if (command == "create-playlist") {
        let playlistName = args[0];
        let createdBy = msg.member;
        let statement = `INSERT INTO playlist (name, created_by) VALUES ("${playlistName}", "${createdBy}")`;
        connection.query(statement, (err, res) => {
            if (err) {
                console.log("doslo je do greske u bazi");
                console.log(err);
            } else
            console.log("dodao!");
        });
    }
    if (command == "list") {
        let statement = "SELECT * from playlist";
        const page = parseInt(args[0]);
        let replyMsg = "All available playlists: \n";
        connection.query(statement, async (err, res) => {
            const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
            let numEmoji = 0;
            const itemsPerPage = 5;
            let allPlaylists = [];
            res.forEach(row => {
                //console.log(row.name);
                allPlaylists.push(row);
            });
            const numPages = Math.ceil(allPlaylists.length / itemsPerPage);
            for (let i = (page - 1) * itemsPerPage ; i < itemsPerPage * page ; i++) {
                let index = i;
                if (!allPlaylists[index]) break;
                replyMsg += `${emojis[numEmoji]} ${allPlaylists[index].name} added by ${allPlaylists[index].created_by} \n`;
                numEmoji++;
            }
            replyMsg += `Page ${page}/${numPages}\n`;
            const embed = new Discord.MessageEmbed()
                .setTitle("All Playlists")
                .setColor(0xff0000)
                .setDescription(replyMsg)
            msg.channel.send(embed).then(async sent => {
            for (let i = 0; i < numEmoji; i++) await sent.react(emojis[i]);
            const reactionCollector = new Discord.ReactionCollector(sent);
            reactionCollector.on("collect", (reaction, user) => {
                // if (reaction.emoji == "⏩") 
                //     console.log("go forwards")
            })
        });
        

        });
        //connection.end();
    }
})
