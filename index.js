require("dotenv").config();
const express = require("express");
const app = express();
const fs = require("fs");
app.get("/", (req, res) => {
  res.send("i am awake");
});
app.listen(process.env.PORT || 3000, () => {
  console.log("express app is listenting");
});
const Discord = require("discord.js");
const discordClient = new Discord.Client();
const mysql = require("mysql");
//const ytdl = require("ytdl-core-discord");
const ytdl = require("ytdl-core");
const stringSimilarity = require("string-similarity");
const connection = mysql.createPool(
  process.env.CLEARDB_DATABASE_URL
);

const dumpString = fs.readFileSync("quizby.sql").toString();
//console.log(dumpString);
connection.query(dumpString, (err, res) => {
  if (err) {
    console.log("DUMP ERROR", err);
  }
  discordClient.login(process.env.BOT_TOKEN);
  const prefix = process.env.PREFIX || "quizby ";
  
  discordClient.on("message", async (msg) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith(prefix)) return;
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
        } else {
          msg.channel.send(`Created playlist ${playlistName}!`);
          console.log("dodao!");
        }
      });
    }
    if (command == "list") {
      let statement = "SELECT * from playlist";
      console.log(args[0]);
      let page = parseInt(args[0]);
      console.log("PAGE KAD JE ARGUMENT USER: ", page);
      let searchedUser;
      if (isNaN(page) && args.length > 0) {
        searchedUser = args[0].replace("!", "");
        statement = `SELECT * from playlist WHERE created_by = "${args[0].replace(
          "!",
          ""
        )}"`;
        page = parseInt(args[1]);
        console.log("PAGE pre ISNAN: ", page);
      }
      console.log("PAGE POSLE ISNAN: ", page);
      if (!page) {
        // let errorMsg = "You need to provide a page number as an argument!";
        // msg.channel.send(errorMsg);
        // return;
        console.log("PROSAO");
        page = 1;
      }
      let replyMsg = "All available playlists: \n\n";
      connection.query(statement, async (err, res) => {
        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
        let numEmoji = 0;
        const itemsPerPage = 5;
        let allPlaylists = [];
        if (!res.length) {
          let errorMsg = `User ${searchedUser} doesn't have any playlists!`;
          msg.channel.send(errorMsg);
          return;
        }
        res.forEach((row) => {
          //console.log(row.name);
          allPlaylists.push(row);
        });
        const numPages = Math.ceil(allPlaylists.length / itemsPerPage);
        if (page > numPages || page <= 0) {
          let errorMsg = `There's only **${numPages}** pages available, please provide a valid page number!`;
          msg.channel.send(errorMsg);
          return;
        }
        for (let i = (page - 1) * itemsPerPage; i < itemsPerPage * page; i++) {
          let index = i;
          if (!allPlaylists[index]) break;
          replyMsg += `${emojis[numEmoji]} **${allPlaylists[index].name}** (ID: **${allPlaylists[index].id}**) added by ${allPlaylists[index].created_by} \n\n`;
          numEmoji++;
        }
        replyMsg += `Page ${page}/${numPages}\n`;
        const embed = new Discord.MessageEmbed()
          .setTitle("All Playlists")
          .setColor(0xff0000)
          .setDescription(replyMsg);
        msg.channel.send(embed).then(async (sent) => {
          for (let i = 0; i < numEmoji; i++) await sent.react(emojis[i]);
          const filter = (reaction, user) => {
            return user.id === msg.author.id;
          };
          const reactionCollector = sent.createReactionCollector(filter);
          reactionCollector.on("collect", async (reaction, user) => {
            let voiceChannel = msg.member.voice.channel;
            // initQuiz(
            //   msg,
            //   voiceChannel,
            //   allPlaylists[
            //     emojis.indexOf(reaction.emoji.name) + (page - 1) * itemsPerPage
            //   ].id
            // );
            getAllSongsInPlaylist(
              allPlaylists[
                emojis.indexOf(reaction.emoji.name) + (page - 1) * itemsPerPage
              ].id,
              (res) => {
                initQuiz(msg, voiceChannel, res);
              }
            );
            msg.channel.send(
              `You selected: ${
                allPlaylists[
                  emojis.indexOf(reaction.emoji.name) + (page - 1) * itemsPerPage
                ].name
              }`
            );
            // play(allPlaylists[
            //      emojis.indexOf(reaction.emoji.name) + (page - 1) * itemsPerPage
            //    ].id);
            reactionCollector.stop();
          });
        });
      });
      //connection.end();
    }
    if (command == "add") {
      // add song to playlist at given timestamp
      let playlistToAdd = args[0];
      let songUrl = args[1];
      let timestamp = parseInt(args[2]);
      const basicDetails =  await  ytdl.getBasicInfo(songUrl);
      const title = basicDetails.videoDetails.title;
      let [artist, songName] = title.split(" - ");
      artist = artist.toLowerCase();
      [artist] = artist.split("feat.");
      [artist] = artist.split("ft.");
      artist = artist.replace(/ *\([^)]*\) */g, "");
      songName = songName.toLowerCase();
      [songName] = songName.split("feat.");
      [songName] = songName.split("ft.");
      songName = songName.replace(/ *\([^)]*\) */g, "");
      // Check if song already exists in the song table
      let songId;
      const getSongId = `SELECT id from song where url="${songUrl}" or ( name="${songName}" and artist="${artist}" )`;
      connection.query(getSongId, (err, res) => {
        if (!err && res.length > 0) {
          console.log("song already exists!");
          console.log(res);
          songId = res[0].id;
          console.log("SONG ID WHEN GOTTEN: ", songId);
          let playlistId;
          let getPlaylistIdStmt = `SELECT id from playlist where id="${playlistToAdd}" or name="${playlistToAdd}"`;
          connection.query(getPlaylistIdStmt, (err, res) => {
            console.log(res);
            playlistId = res[0].id;
            let insertIntoSongsInPlaylistStmt = `INSERT INTO song_in_playlist (timestamp, id_song, id_playlist) VALUES (${timestamp}, "${songId}", "${playlistId}")`;
            connection.query(insertIntoSongsInPlaylistStmt, (err, res) => {
              if (err) {
                console.log("error in db");
                console.log(err);
              } else {
                console.log("inserted");
              }
            });
          });
        } else {
          let playlistId;
          let getPlaylistIdStmt = `SELECT id from playlist where id="${playlistToAdd}" or name="${playlistToAdd}"`;
          connection.query(getPlaylistIdStmt, (err, res) => {
            console.log(res);
            playlistId = res[0].id;
            let insertIntoSongStmt = `INSERT INTO song (name, artist, url, added_by) VALUES ("${songName}", "${artist}", "${songUrl}", "${msg.member}")`;
            console.log("SONG ID: ", songId);
            if (!songId) {
              connection.query(insertIntoSongStmt, (err, res, fields) => {
                if (err) console.log(err);
                else console.log(res.insertId);
                songId = res.insertId;
                let insertIntoSongsInPlaylistStmt = `INSERT INTO song_in_playlist (timestamp, id_song, id_playlist) VALUES (${timestamp}, "${songId}", "${playlistId}")`;
                connection.query(insertIntoSongsInPlaylistStmt, (err, res) => {
                  if (err) {
                    console.log("error in db");
                    console.log(err);
                  } else {
                    console.log("inserted");
                  }
                });
              });
            }
          });
        }
      });
    }
    if (command == "random") {
      let randomPlaylistStmt = `SELECT * FROM song s, song_in_playlist sp WHERE s.id = sp.id_song ORDER BY RAND() LIMIT 15`;
      connection.query(randomPlaylistStmt, (err, res) => {
        if (err) {
          console.log("ERROR KOD RANDOMA:  ", err);
        } else {
          let voiceChannel = msg.member.voice.channel;
          initQuiz(msg, voiceChannel, res);
        }
      });
    }
  });
  
  let quizQueue;
  let leaderboard = {};
  let quizEnded = false;
  
  // async function initQuiz(msg, channel, playlist) {
  //   quizEnded = false;
  //   getAllSongsInPlaylist(playlist, async (res) => {
  //     quizQueue = res;
  //     const connection = await channel.join();
  //     const dispatcher = connection.play("countdown.mp3");
  //     msg.channel.members.forEach((member) => {
  //       if (member.user.bot) return;
  //       leaderboard[member] = 0;
  //     });
  //     console.log("LEADERBOARD: ", leaderboard);
  //     setTimeout(() => startQuiz(msg, channel, quizQueue, connection, null), 21 * 1000);
  //   });
  //   // dispatcher.on("finished", () => {
  //   //   console.log("GOTOVO ODBROJAVANJE WOO");
  //   // });
  // }
  
 
  

async function initQuiz(msg, channel, playlist) {
  quizEnded = false;
  quizQueue = playlist;
  const connection = await channel.join();
  const dispatcher = connection.play("countdown.mp3");
  channel.members.forEach((member) => {
    if (member.user.bot) return;
    leaderboard[member] = 0;
  });
  console.log("LEADERBOARD: ", leaderboard);
  setTimeout(
    () => startQuiz(msg, channel, quizQueue, connection, null),
    21 * 1000
  );
}


async function startQuiz(msg, channel, queue, connection, dispatcher) {
  console.log(queue);
  if (quizEnded) return;
  if (queue.length == 0) {
    quizEnded = true;
    msg.channel.send("Gotov kviz :)");
    dispatcher.destroy();
    let resultMsg = "";
    let resultArr = [];
    Object.keys(leaderboard).forEach((key) => {
      resultArr.push([key, leaderboard[key]]);
    });
    resultArr.sort((a, b) => b[1] - a[1]);
    resultArr.forEach((member, index) => {
      let medal;
      switch (index) {
        case 0:
          medal = "🥇";
          break;
        case 1:
          medal = "🥈";
          break;
        case 2:
          medal = "🥉";
          break;
        default:
          medal = `${index + 1}.`;
      }
      resultMsg += `${medal} ${member[0]} : ${member[1]} pt \n`;
    });
    const endResult = new Discord.MessageEmbed()
      .setTitle("Quiz results")
      .setColor(0xff0000)
      .setDescription(resultMsg);
    msg.channel.send(endResult);
    return;
  }
  let artistGuessed = false;
  let songGuessed = false;
  //let readStream = fs.createReadStream(ytdl(queue[0].url));
  // dispatcher = connection.play(/*await*/ ytdl(queue[0].url), { type: "opus", seek: queue[0].timestamp });
  dispatcher = connection.play(ytdl(queue[0].url), { seek: queue[0].timestamp });
  //let readStream = fs.createReadStream(await ytdl(queue[0].url));
  //console.log(await ytdl(queue[0].url));
  const filter = (m) => true;
  const collector = msg.channel.createMessageCollector(filter, {
    time: 60 * 1000,
  });
  collector.on("collect", (m) => {
    const msgContent = m.content.toLowerCase();
    if (m.author.id === discordClient.user.id) return;
    if (
      !artistGuessed &&
      stringSimilarity.compareTwoStrings(msgContent, queue[0].artist) >= 0.5
    ) {
      artistGuessed = true;
      leaderboard[m.author]++;
      m.react("✅");
    } else if (
      !songGuessed &&
      stringSimilarity.compareTwoStrings(msgContent, queue[0].name) >= 0.5
    ) {
      songGuessed = true;
      m.react("✅");
      leaderboard[m.author]++;
    } else {
      m.react("❌");
    }
    if (artistGuessed && songGuessed) {
      collector.stop();
      msg.channel.send(`The song was: ${queue[0].artist} - ${queue[0].name}`);
      queue.shift();
      startQuiz(msg, channel, queue, connection, dispatcher);
    }
  });
  setTimeout(() => {
    if (!quizEnded && (!artistGuessed || !songGuessed)) {
      msg.channel.send(
        `Nobody got it 😢 \nThe song was: ${queue[0].artist} - ${queue[0].name}`
      );
      queue.shift();
      startQuiz(msg, channel, queue, connection, dispatcher);
    }
  }, 60 * 1000);
}

function getAllSongsInPlaylist(playlistId, fn) {
  let sql = `SELECT s.id, s.name, s.artist, s.url, sp.timestamp
  FROM song s, playlist p, song_in_playlist sp
  WHERE s.id = sp.id_song and p.id = sp.id_playlist and p.id = "${playlistId}"
  ORDER BY RAND()
   `;
  connection.query(sql, (err, res) => {
    if (!err) {
      console.log("hiya");
      fn(res);
    }
  });
}
  
})

