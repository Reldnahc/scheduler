import DiscordJS, {TextChannel} from 'discord.js'
import {AxiosResponse, default as axios} from "axios";

export abstract class Task {
    client: DiscordJS.Client;
    job: { searchTerms: any; frequency: number; message: string; job: string; channelId: string; cronJob: string; name: string }; //todo make this an object. mongoose schema?
    guildId: string;
    constructor(client: DiscordJS.Client, job: { searchTerms: any; frequency: number; message: string; job: string; channelId: string; cronJob: string; name: string }, guildId: string) {
        this.client = client;
        this.job = job;
        this.guildId = guildId;
    }

    abstract execute(): void;
}

export class ChannelTask extends Task{
    options:any;

    constructor(client: DiscordJS.Client, job: { searchTerms: any; frequency: number; message: string; job: string; channelId: string; cronJob: string; name: string }, guildId: string, options: any) {
       super(client,job,guildId);
        this.options = options;
    }

    execute(): void {
        executeChannelTask(this.client,this.job,this.guildId, this.options);
    }

}
export class PostGifTask extends Task{
    execute(): void {
        executePostGifTask(this.client,this.job);
    }
}

export class TaskFactory{//todo make singleton
    client: DiscordJS.Client;
    constructor(client: DiscordJS.Client) {
        this.client = client;
    }

    createTask(job: { searchTerms: any; frequency: number; message: string; job: string; channelId: string; cronJob: string; name: string }, guildId: string): Task|null{
        let task = null;
        switch(job.job){
            case "lock":
                task = new ChannelTask(this.client , job, guildId, {SEND_MESSAGES: false});
                break;
            case "unlock":
                task = new ChannelTask(this.client , job, guildId, {SEND_MESSAGES: true});
                break;
            case "show":
                task = new ChannelTask(this.client , job, guildId, {VIEW_CHANNEL: true});
                break;
            case "hide":
                task = new ChannelTask(this.client , job, guildId, {VIEW_CHANNEL: false});
                break;
            case "postgif":
                task = new PostGifTask(this.client , job, guildId);
                break;
        }
        return task;
    }
}

function executeChannelTask(client: DiscordJS.Client, job: { searchTerms?: any; frequency?: number; message: any; job: any; channelId: any; cronJob: any; name: any; }, guildId: string, options: { SEND_MESSAGES: boolean; }){
    client.guilds.fetch(guildId)
        .then((guild: any) => guild.channels.fetch(job.channelId)
            .then((channel: any)=> {
                if (channel != null) {
                    if(job.message != "none"){
                        (channel as TextChannel).send(job.message);
                    }
                    channel.permissionOverwrites.edit(guild.roles.everyone.id, options)
                        .catch((err: any) => {
                            (channel as TextChannel).send(err);
                        });
                    console.info(new Date().toTimeString() + "Cron job complete. \nname: " + job.name +
                        "\njob: " + job.job + "\nchannel: " + job.channelId + "\nguild: "+ guildId +"\ncron: " + job.cronJob);
                }
            })).catch((err: any) => console.log(err));
}


function executePostGifTask(client: DiscordJS.Client, job: { searchTerms: any; frequency: number; message: any; job: any; channelId: any; cronJob: any; name: any; }){
    let roll = Math.floor(Math.random() * job.frequency);
    if(roll == 0){
        let searchTerm = job.searchTerms[Math.floor(Math.random() * job.searchTerms.length)];
        axios.get('https://g.tenor.com/v1/search?q=' + searchTerm + '&key=' + process.env.TENOR + '&limit=25').then((res: AxiosResponse) => {
            let img = res.data.results[Math.floor(Math.random() * res.data.results.length)].url;
            let channel = (client.channels.cache.get(job.channelId) as TextChannel);
            channel.send(img)
                .then((img) => {
                    console.info(new Date().toTimeString() + ' posted: ' + img.toString() + " in channel: " + channel.id + "(" + channel.name + ") in server: " + channel.guildId + "(" + channel.guild.name + ")");
                });
        }).catch((error: any) => {
            console.error(error);
        });
    }
}
