import DiscordJS, {Intents, TextChannel} from 'discord.js'
import dotenv from 'dotenv'
import {AxiosResponse} from "axios";

const cron = require('cron');
const axios = require('axios').default;

dotenv.config()

let server: DiscordJS.Guild;
let tenorKey = process.env.TOKEN;

let searchTerms = ['anime','anime_girl','anime_cute','Haikyu!!','mha','one_piece',
    'mob_psycho','chainsaw_man','one_punch_man','re_zero','rem','ram_re_zero','emilia',
    'rukia_kuchiki','hoseki_no_kuni','naruto','zero_two','anime_girl','demon_slayer',
    'anime_dance','gto','quintessential_quintuplets'];

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

function randomMeme(){
    let roll = getRandomInt(15);
    if (roll == 0){
        let searchTerm = searchTerms[getRandomInt(searchTerms.length)];
        axios.get('https://g.tenor.com/v1/search?q='+ searchTerm +'&key=' + tenorKey + '&limit=25').then((res: AxiosResponse<any>) => {
            (client.channels.cache.get('968678344449204264') as TextChannel ).send(res.data.results[getRandomInt(res.data.results.length)].url);
        }).catch((error: any) => {
            console.error(error);
        });
    }
}


function lockRolls (){
    server.channels.fetch('963486768802435106')
        .then(channel =>{
            if(channel != null){
                (channel as TextChannel).send("Rolls will be locked until 6:00AM CST");
                channel.permissionOverwrites.edit(server.roles.everyone.id,
                    {
                        SEND_MESSAGES: false,
                    }
                )}});
}

function unlockRolls (){
    server.channels.fetch('963486768802435106')
        .then(channel =>{
            if(channel != null){
                (channel as TextChannel).send("Rolls is now unlocked until 12:00AM CST");
                channel.permissionOverwrites.edit(server.roles.everyone.id,
                    {
                        SEND_MESSAGES: true,
                    }
                )}});
}

client.on('ready', () =>{
    console.log('Scheduler is online!');
    client.guilds.fetch('963486233009483896').then(guild => server = guild);
    let scheduledLock = new cron.CronJob('0 0 * * *', lockRolls);
    let scheduledUnlock = new cron.CronJob('0 06 * * *', unlockRolls);
    let scheduledRandomMemes =  new cron.CronJob('* * * * *', randomMeme)
    scheduledLock.start();
    scheduledUnlock.start();
    scheduledRandomMemes.start();
});

client.on('message', message => {
    if(message.channelId == '968678344449204264' && (message.author.id == '973378217786368070' || message.author.id == '973378394131669032')){
        let roll = getRandomInt(10);
        if (roll == 0){
            axios.get('https://g.tenor.com/v1/search?q=anime_ratio&key=SZD8UMDWW0TT&limit=50').then((res: AxiosResponse<any>) => {
                message.reply({
                    content: res.data.results[getRandomInt(res.data.results.length)].url,
                });
            }).catch((error: any) => {
                console.error(error);
            });
        }
    }

    if(message.content.match(/(^|\W)mid($|\W)/i)){
        if(message.author.id == '411701506912550924'){
            message.react('👀');
            /*message.reply({
                content: "I thought you were taking this out of your vocabulary.",
            });*/
        }
        message.react('👎');
    }
    if(message.content.match(/(^|\W)nasb($|\W)/i)){
        message.react('✝');
        message.react('📖');
        message.react('🕊️');
    }
    if(message.content.match(/(^|\W)lincoln($|\W)/i)){
        message.react('🦆');
        message.react('💤');
        message.react('🛌');
    }
    if(message.content.match(/(^|\W)zim($|\W)/i)){
       let num = getRandomInt(2)
        switch (num){
            case 0:
                message.react('🆙');
                break;
            case 1:
                message.react('⬇');
                break;
        }
    }

    message.mentions.users.forEach(function (user){
        if(user.id == '162791920265986048' || user.id == '204608193429635072'){
            message.react('🐶');
            message.react('🐱');
            message.react('🐷');
            message.react('🐮');
            message.react('🐻');
        }
    });

});

function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}

client.login(process.env.TOKEN);