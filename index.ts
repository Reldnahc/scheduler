import DiscordJS, {FetchGuildOptions, Guild, Intents, Message, TextChannel} from 'discord.js'
import dotenv from 'dotenv'
import {AxiosResponse} from "axios";
import mongoose from "mongoose";
import {Server, User} from "./schemas";
import GraphemeSplitter from "grapheme-splitter";
import cron from 'cron-validate';
const cronReq = require('cron');
const _ = require('lodash');
const axios = require('axios').default;

dotenv.config()

const uri = process.env.DB;
let tenorKey = process.env.TOKEN;
let cronMap = new Map<string, any>();

/*let searchTerms = ['anime', 'anime_girl', 'anime_cute', 'Haikyu!!', 'mha', 'one_piece',
    'mob_psycho', 'chainsaw_man', 'one_punch_man', 're_zero', 'rem', 'ram_re_zero', 'emilia',
    'rukia_kuchiki', 'hoseki_no_kuni', 'naruto', 'zero_two', 'anime_girl', 'demon_slayer',
    'anime_dance', 'gto_anime', 'quintessential_quintuplets','dragon_ball','guilty_gear'];*/

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const cronjobs = ['lock','unlock','postgif'];

client.on('ready', async () => {
    if(uri) await mongoose.connect(uri.toString()); else throw new Error('no db uri');
    await setupCronJobs();
    console.log('Scheduler is online!');
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
    let regex = /"([^"]*)"|(\S+)/g;
    let args = (content.match(regex) || []).map(m => m.replace(regex, '$1$2'));
    switch (args[0]){
        case "trackword":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await registerTrackWord(message, args);
            break;
        case "cron":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            if(args.length == 1){
                await message.reply({content: "%cron <job> <discord channel id> <message> <cron job>"});
                break;
            }
            await registerCronJob(message, args);
            break;
        case "wordcount":
            await dumpWordCount(message);
            break;
        case "cronlist":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await dumpCronList(message);
            break;
        case "crondelete":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await deleteCronJob(message, args);
            break;
        case "addterm":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await addSearchTerm(message, args);
            break;
        case "removeterm":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await removeSearchTerm(message, args);
            break;
        case "editfrequency":
            if(!message.member?.permissions.has("ADMINISTRATOR")) return;
            await editFrequency(message, args);
            break;
        default:
            console.log("unknown command: %"+args[0]);
    }
});

async function restartCronJob(job: any, guildId: string) {
    cronMap.get(job.name).stop();
    cronMap.delete(job.name);
    let guild;
    client.guilds.cache.forEach(server=>{
        if(server.id == guildId)
            guild = server;
    });
    // @ts-ignore
    await setupCronJob(job, guild);
}

async function editFrequency(message: Message<boolean>, args: any[]) {
    let server = await getServerByMessage(message);

    for(const job of server.cronJobs){
        if(job.name == args[1]){
            if(parseInt(args[2])){
                job.frequency = parseInt(args[2]);
            }else{
                await message.reply({content: "frequency must be an integer"});
                return;
            }
            server.save();
            if(message.guild){
                await restartCronJob(job, message.guild.id);
                await message.react('👍');
            }
            return;
        }
    }
    await message.reply({content: "no job with this name"});

}

async function addSearchTerm(message: Message, args: any[]) {
    let server = await getServerByMessage(message);

    for(const job of server.cronJobs){
        if(job.name == args[1]){
            for(let i = 2; i < args.length; i++){
                job.searchTerms.push(args[i]);
            }
            server.save();
            if(message.guild){
                await restartCronJob(job, message.guild.id);
                await message.react('👍');
            }
            return;
        }
    }
    await message.reply({content: "no job with this name"});
}
async function removeSearchTerm(message: Message, args: any[]) {
    let server = await getServerByMessage(message);

    for(const job of server.cronJobs){
        if(job.name == args[1]){
            for(let i = 2; i < args.length; i++){
                job.searchTerms=_.reject(job.searchTerms, function (el: any){ return args.includes(el)});
            }
            server.save();
            if(message.guild){
                await restartCronJob(job, message.guild.id);
                await message.react('👍');
            }
            return;
        }
    }
    await message.reply({content: "no job with this name"});
}
async function registerCronJob(message: Message, args: string[]) {
    if(!cronjobs.includes(args[1])) {
        await message.reply({content: "Unknown cron job."})
        return;
    }
    if(!cron(args[4]).isValid()){
        await message.reply({content: "cron string is invalid"})
        return;
    }
    if(message.guild && !message.guild.channels.fetch(args[2])){
        await message.reply({content: "Unknown channel"})
        return;
    }
    if(!args[5]){
        await message.reply({content: "Job needs a name."})
        return;
    }

    let server = await getServerByMessage(message);
    let job = {job: args[1], channelId: args[2], cronJob: args[4], message: args[3], name: args[5], frequency: 15, searchTerms: ['anime'] };
    server.cronJobs.push(job);
    server.save();
    let guild;
    client.guilds.cache.forEach(server=>{
       if(server.id == message.guildId)
           guild = server;
    });

    // @ts-ignore
    await setupCronJob(job, guild);
}
async function setupCronJob(job: {
    searchTerms: any;
    frequency: number; message: string; job: string; channelId: string; cronJob: string; name: string }, guild: [string, Guild] | (string | FetchGuildOptions)[]){

    function lockUnlockChannel(){
        let sendMsgPerm = true; // unlock
        if (job.job == "lock"){
            sendMsgPerm = false;
        }
        client.guilds.fetch(guild[0])
            .then(guild => guild.channels.fetch(job.channelId)
                .then(channel=> {
                    if (channel != null) {
                        (channel as TextChannel).send(job.message);
                        channel.permissionOverwrites.edit(guild.roles.everyone.id,
                            {
                                SEND_MESSAGES: sendMsgPerm,
                            }
                        )
                    }
                }));
    }

    function postGif(){
        let roll = getRandomInt(job.frequency);
        if(roll == 0){
            let searchTerm = job.searchTerms[getRandomInt(job.searchTerms.length)];
            axios.get('https://g.tenor.com/v1/search?q=' + searchTerm + '&key=' + tenorKey + '&limit=25').then((res: AxiosResponse) => {
                let img = res.data.results[getRandomInt(res.data.results.length)].url;
                (client.channels.cache.get(job.channelId) as TextChannel).send(img)
                    .then((img) => {
                        console.log('posted: ' + img.toString());
                    });
            }).catch((error: any) => {
                console.error(error);
            });
        }
    }

    let scheduledJob;
    switch(job.job){
        case "unlock":
        case "lock":
            scheduledJob = new cronReq.CronJob(job.cronJob,lockUnlockChannel);
            break;
        case "postgif":
            scheduledJob = new cronReq.CronJob(job.cronJob,postGif);
            break;
    }
    scheduledJob.start();
    console.log(cronMap);
    cronMap.set(job.name,scheduledJob);
}

async function setupCronJobs() {
    for (const guild of client.guilds.cache) {
        let server = await Server.findOne({discId: guild[0]});
        for(const job of server.cronJobs){
            await setupCronJob(job, guild);
        }
    }
}

async function deleteCronJob(message: Message, args: any[]) {
    let server = await getServerByMessage(message);
    let name = args[1];
    let job = cronMap.get(name);

    if (job){
        server.cronJobs=_.reject(server.cronJobs, function (el: { name: any; }){ return el.name === name});
        server.save();
        job.stop();
        cronMap.delete(name);
        await message.react('👍');
    }else{
        await message.reply({content: "invalid parameter"})
    }
}

async function dumpWordCount(message: Message) {
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

async function registerTrackWord(message: Message, args: string[]) {
    if (args.length != 3){
        await message.reply({
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
    let server = await getServerByMessage(message);
    let trackedWord: {word: String, emojis: Array<any>} = {word: args[1],emojis: emojis};
    server.trackedWords.push(trackedWord);
    server.save();
    await message.react("👍");
}

async function trackWord(word: string, message: Message, emojis: string[], random: boolean = false) {
    const regex = new RegExp("(^|\\W)" + word + "($|\\W)", 'gi');
    if (message.content.match(regex)) {
        if(!random){
            emojis.forEach((emoji) => {
                message.react(emoji);
            });
        }else{
            await message.react(emojis[getRandomInt(emojis.length)]);
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
        user.save()
    }
}

async function dumpCronList(message: Message) {
    let server = await getServerByMessage(message);
    let msg = "";

    for (let i = 0; i < server.cronJobs.length; i++){
        msg += i+1 + ":\n";
        msg += "    Name: " + server.cronJobs[i].name + "\n";
        msg += "    Channel ID: " + server.cronJobs[i].channelId + "\n";
        msg += "    Cron: " + server.cronJobs[i].cronJob + "\n";
        msg += "    Message: " + server.cronJobs[i].message + "\n";
        msg += "    Job: " + server.cronJobs[i].job + "\n";
        if(server.cronJobs[i].job == 'postgif'){
            msg += "    Frequency: " + server.cronJobs[i].frequency + "\n";
            msg += "    Search terms: ";
            for(const term of server.cronJobs[i].searchTerms){
                msg += term + ", ";
            }
            msg += "\n";
        }
    }

    if(server.cronJobs.length == 0){
        msg = "No cron jobs.";
    }
    await message.reply({content: msg});
}

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}

async function getServerByMessage(message: Message) {
    let server = await Server.findOne({discId: message.guildId});
    if (server == null) {
        server = new Server({discId: message.guildId});
    }
    return server;
}

client.login(process.env.TOKEN).then(r => {console.log(r)});