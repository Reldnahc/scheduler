import DiscordJS, {Intents, Message, TextChannel} from 'discord.js'
import dotenv from 'dotenv'
import mongoose from "mongoose";
import {Server, User} from "./schemas";
import {TaskFactory} from "./task";
import {CommandManager} from "./commands/CommandManager";
import {parseInt} from "lodash";
import {AxiosResponse, default as axios} from "axios";
const cronReq = require('cron');
const _ = require('lodash');

dotenv.config()

const uri = process.env.DB;
let cronMap = new Map<string, any>();
const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});
const taskFactory = new TaskFactory(client);
const commandManager = new CommandManager(client);


client.on('ready', async () => {
    if(uri){
        mongoose.connect(uri.toString())
            .then(()=>{console.log('connected to database')});
    }
    else{
        throw new Error('no db uri');
    }
    await setupCronJobs();
    console.log('Scheduler is online!');
});

client.on('messageCreate',  async message => {
    if(message.author.bot) return;
    let server = await Server.findOne({discId: message.guildId});
    if(server){
        for (const trackedWord of server.trackedWords) {
            await trackWord(trackedWord.word, message, trackedWord.emojis);
        }
        for (const annoyedUser of server.annoyedUsers) {
            await annoyUser(annoyedUser, message);
        }
    }

    if (message.content.charAt(0) == '%'){//commands
        let content = message.content.slice(1);
        let regex = /"([^"]*)"|(\S+)/g;
        let args = (content.match(regex) || []).map(m => m.replace(regex, '$1$2'));
        await commandManager.runCommand(message, args)
    }else{
        let roll = getRandomInt(10000);
        if(roll == 0){
            axios.get('https://g.tenor.com/v1/search?q=' + "anime_ratio" + '&key=' + process.env.TENOR + '&limit=25').then((res: AxiosResponse) => {
                let img = res.data.results[Math.floor(Math.random() * res.data.results.length)].url;
                let channel = (client.channels.cache.get(message.channelId) as TextChannel);
                message.reply({content: img})
                    .then((img) => {
                        console.info(new Date().toTimeString() + ' posted: ' + img.toString() + " in channel: " + channel.id + "(" + channel.name + ") in server: " + channel.guildId + "(" + channel.guild.name + ")");
                    });
            }).catch((error: any) => {
                console.error(error);
            });
        }
    }
});
//todo make cron manager
export async function restartCronJob(job: any, guildId: string) {
    cronMap.get(job.name).stop();
    cronMap.delete(job.name);
    await setupCronJob(job, guildId);
}

export async function setupCronJob(job: { searchTerms: any; frequency: number; message: string; job: string; channelId: string; cronJob: string; name: string }, guildId: string){
    let task = taskFactory.createTask(job,guildId);
    function runTask(){
        task?.execute();
    }
    let cronJob = new cronReq.CronJob(job.cronJob,runTask);

    cronJob.start();
    cronMap.set(job.name,cronJob);
}

async function setupCronJobs() {
    for (const guild of client.guilds.cache) {
        let server = await Server.findOne({discId: guild[0]});
        if(server){
            for(const job of server.cronJobs){
                await setupCronJob(job, guild[0]);
            }
        }
    }
}

//todo refactor this to not need a message to delete a job. should only need the name
export async function deleteCronJob(message: Message, args: any[]) {
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
        await message.reply({content: "aliases: cd, crondelete, delete, del \n" +
                "%crondelete <cronjob name>"});
    }
}

async function annoyUser(annoyedUser: any, message: Message) {
    if(annoyedUser.discId === message.author.id){
        annoyedUser.emojis.forEach((emoji: string) => {
            message.react(emoji).catch(err => {
                    console.error(err);
                }
            );
        });
        if(annoyedUser.gifs.includes('none')){
           return;
        }
        let roll = getRandomInt(100);//todo make this a param?
        if(roll === 0){
            let gif = getRandomInt(annoyedUser.gifs.length)
            message.reply({content: annoyedUser.gifs[gif]}).catch(err => console.log(err));
        }
    }
}

async function trackWord(word: string, message: Message, emojis: string[], random: boolean = false) {
    const regex = new RegExp("(^|\\W)" + word + "($|\\W)", 'gi');
    if (message.content.match(regex)) {

        if(!random){
            emojis.forEach((emoji) => {
                message.react(emoji).catch(err => {
                        console.error(err);
                    }
                );
            });
        }else{
             message.react(emojis[getRandomInt(emojis.length)]).catch(err => {
                console.error(err);
            });
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

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}

export async function getServerByMessage(message: Message) {
    let server = await Server.findOne({discId: message.guildId});
    if (server == null) {
        server = new Server({discId: message.guildId});
    }
    return server;
}

client.login(process.env.TOKEN).then(() => {});

