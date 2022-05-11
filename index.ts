import DiscordJS, {Intents, Message, TextChannel} from 'discord.js'
import dotenv from 'dotenv'
import {AxiosResponse} from "axios";
import mongoose from "mongoose";
import {Server, User} from "./schemas";
import GraphemeSplitter from "grapheme-splitter";
const cron = require('cron');
const axios = require('axios').default;
const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config()

// @ts-ignore
const uri = process.env.DB.toString();
let server: DiscordJS.Guild;
let tenorKey = process.env.TOKEN;

let trackedWords = [];
let searchTerms = ['anime', 'anime_girl', 'anime_cute', 'Haikyu!!', 'mha', 'one_piece',
    'mob_psycho', 'chainsaw_man', 'one_punch_man', 're_zero', 'rem', 'ram_re_zero', 'emilia',
    'rukia_kuchiki', 'hoseki_no_kuni', 'naruto', 'zero_two', 'anime_girl', 'demon_slayer',
    'anime_dance', 'gto_anime', 'quintessential_quintuplets','dragon_ball','guilty_gear'];

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

function randomMeme() {
    let roll = getRandomInt(15);
    if (roll == 0) {
        let searchTerm = searchTerms[getRandomInt(searchTerms.length)];
        axios.get('https://g.tenor.com/v1/search?q=' + searchTerm + '&key=' + tenorKey + '&limit=25').then((res: AxiosResponse<any>) => {
            let img = res.data.results[getRandomInt(res.data.results.length)].url;
            if (process.env.ANIMEGIF) {
                (client.channels.cache.get(process.env.ANIMEGIF) as TextChannel).send(img)
                    .then((img) => {
                        console.log('posted: ' + img.toString());
                    });
            } else {
                console.log('no ANIME GIF env set')
            }
        }).catch((error: any) => {
            console.error(error);
        });
    }
}

function lockRolls() {
    if (process.env.ROLLS) {
        server.channels.fetch(process.env.ROLLS)
            .then(channel => {
                if (channel != null) {
                    (channel as TextChannel).send("Rolls will be locked until 6:00AM CST");
                    channel.permissionOverwrites.edit(server.roles.everyone.id,
                        {
                            SEND_MESSAGES: false,
                        }
                    ).then(() => console.log('Rolls locked'))
                }
            });
    } else {
        console.log('no rolls env set')
    }
}

function unlockRolls() {
    if (process.env.ROLLS) {
        server.channels.fetch(process.env.ROLLS)
            .then(channel => {
                if (channel != null) {
                    (channel as TextChannel).send("Rolls is now unlocked until 12:00AM CST");
                    channel.permissionOverwrites.edit(server.roles.everyone.id,
                        {
                            SEND_MESSAGES: true,
                        }
                    ).then(() => console.log('Rolls unlocked'))
                }
            });
    } else {
        console.log('no rolls env set')
    }
}

client.on('ready', async () => {
    console.log('Scheduler is online!');
    if (process.env.SERVER) {
        client.guilds.fetch(process.env.SERVER).then(guild => server = guild);
    }
    let scheduledLock = new cron.CronJob('0 0 * * *', lockRolls);
    let scheduledUnlock = new cron.CronJob('0 06 * * *', unlockRolls);
    let scheduledRandomMemes = new cron.CronJob('* * * * *', randomMeme)
    scheduledLock.start();
    scheduledUnlock.start();
    scheduledRandomMemes.start();
    await mongoose.connect(uri);
    //loop through db of severs
});



client.on('message',  async message => {
    if(message.author.bot) return;
    let server = await Server.findOne({discId: message.guildId});
    if(server){
        for (const trackedWord of server.trackedWords) {
            await trackWord(trackedWord.word, message, trackedWord.emojis);
        }
    }
    //commands below
    if (message.content.charAt(0) != '%') return;
    let content = message.content.slice(1);
    let args = content.split(' ');
    switch (args[0]){
        case "trackword":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await registerTrackWord(message, args);
            break;
        case "wordcount":
            await dumpWordCount(message, args);
            break;
        default:
            console.log("unknown command: %"+args[0]);
    }

});

async function dumpWordCount(message: Message<boolean>, args: string[]) {
   let users =  await User.find({server: message.guildId});
   let msg = "-Tracked Word Counts-\n";

   for (const user of users){
       let discUser = client.users.cache.get(user.discId);
       if(discUser){
           msg += discUser.username + "- ";
       }else{
           msg += "unknown user- "
       }
       for (const trackedWord of user.wordCounts){
           msg += trackedWord[0] + ": " + trackedWord[1] + "  ";
       }
       msg += "\n"
   }
   message.channel.send(msg);
}

async function registerTrackWord(message: Message<boolean>, args: string[]) {
    if (args.length != 3){
        message.reply({
            content: "invalid number of arguments"
        });
        console.log('invalid number of args');
        return;
    }
    const splitter = new GraphemeSplitter();
    let emojis = splitter.splitGraphemes(args[2]);
    const regex_emoji = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/u;
    emojis.forEach(emoji=>{
        if(!regex_emoji.test(emoji)){
            message.reply({
                content: "invalid emoji"
            });
            return;
        }
    });
    let server = await Server.findOne({discId: message.guildId});
    if (server == null) {
        server = new Server({discId: message.guildId});
    }
    let trackedWord: {word: String, emojis: Array<any>} = {word: args[1],emojis: emojis};
    server.trackedWords.push(trackedWord);
    server.save();
    message.react("👍");
}

async function trackWord(word: string, message: Message<boolean>, emojis: string[], random: boolean = false) {
    const regex = new RegExp("(^|\\W)" + word + "($|\\W)", 'gi');
    if (message.content.match(regex)) {
        if(!random){
            emojis.forEach((emoji) => {
                message.react(emoji);
            });
        }else{
            message.react(emojis[getRandomInt(emojis.length)]);
        }

        let user = await User.findOne({discId: message.author.id, server: message.guildId});
        if (user == null) {
            user = new User({discId: message.author.id, server: message.guildId, wordCounts: new Map()})
        }
        let count = user.wordCounts.get(word);
        if (count == undefined) {
            count = 0;
        }
        let regex2 = new RegExp(word,'ig');
        user.wordCounts.set(word, parseInt(count) + (message.content.match(regex2) || []).length);
        console.log(user.wordCounts);
        user.save()
    }
}

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}

client.login(process.env.TOKEN);