import {Command} from "./Command";
import  {TextChannel} from "discord.js";
import {AxiosResponse, default as axios} from "axios";

export class PostGifCommand extends Command {
    static aliases: string[] = ['pg', 'gif', 'postgif'];

    execute(): void {
        if (!this.args[2]){
            this.args[2] = '1';
        }
        let limit = 25;
        if(this.args[2] == '1'){
            limit = 1;
        }
        axios.get('https://g.tenor.com/v1/search?q=' + this.args[1] + '&key=' + process.env.TENOR + '&limit=' + limit).then((res: AxiosResponse) => {
            let randomInts = [];
            while(randomInts.length < parseInt(this.args[2])) {
                let r = Math.floor(Math.random() * res.data.results.length);
                if (randomInts.indexOf(r) === -1) randomInts.push(r);
            }
            let imgs = [];
            for(const int of randomInts){
                imgs.push(res.data.results[int].url)
            }
            let channel = (this.client.channels.cache.get(this.message.channelId) as TextChannel);
            let msg = "";
            for (const img of imgs) {
                msg += img+"\n";
            }
            channel.send(msg)
                .then((img) => {
                    console.info(new Date().toTimeString() + ' posted: \n' + img.toString() + "\n in channel: " + channel.id + "(" + channel.name + ") in server: " + channel.guildId + "(" + channel.guild.name + ")");
                });
        });
    }

    async usage() {
        await this.message.reply({
            content: "aliases: pg, gif, postgif \n" +
                "%postgif <search term> <number of gifs 1-15>"
        });
    }

    validateArgs(): boolean {
        if(!this.args[1]) return false;
        if(this.args[2]){
            let arg2 = parseInt(this.args[2])
            if(arg2){
                if(arg2 < 1 || arg2 > 15){
                    return false;
                }
            }else{
                return false;
            }
        }
        return true;
    }

    validatePermissions(): boolean {
        return true;
    }

}