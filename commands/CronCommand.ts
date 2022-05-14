import {Command} from "./Command";
import cron from "cron-validate";
import {getServerByMessage, setupCronJob} from "../index";
import {parseInt} from "lodash";
const cronJobs = ['lock','unlock','postgif','hide','show'];

export class CronCommand extends Command{
    static aliases: string[] = ['c','cron'];

    async execute(){
        let searchTerms = [];
        for (let i = 7; i < this.args.length; i++) {
            searchTerms.push(this.args[i]);
        }
        let server = await getServerByMessage(this.message);
        let job = {
            job: this.args[1],
            channelId: this.args[2],
            cronJob: this.args[4],
            message: this.args[3],
            name: this.args[5],
            frequency: parseInt(this.args[6]),
            searchTerms: searchTerms
        };
        server.cronJobs.push(job);
        server.save();

        if (this.message.guildId) {
            setupCronJob(job, this.message.guildId.toString()).then(() => {
                this.message.react('👍')
            });
        } else {
            await this.message.reply('Failed to set up job.');
        }
    }

    async usage(){
        await this.message.reply({
            content: "aliases: cron, c \n" +
                "%cron <task> \n" +
                "%cron <lock/unlock/hide/show> <channel ID> <message> <cron string> <name> \n"+
                "%cron <postgif> <channel ID> <message> <cron string> <name> <frequency> <terms...>"
        });
    }

    validateArgs(): boolean {
        if(this.args.length < 6) return false;
        if(!cronJobs.includes(this.args[1])) return false;
        if(!cron(this.args[4]).isValid()) return false;
        if(this.message.guild && !this.message.guild.channels.fetch(this.args[2])) return false;

        if(this.args[1] == 'postgif'){
            if(this.args.length < 8) return false;
            let args6 = parseInt(this.args[6])
            if (!args6 || args6 <= 0) {
                return false;
            }
        }

        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }

}