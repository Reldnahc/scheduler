import {Command} from "./Command";
import {getServerByMessage, restartCronJob} from "../index";
import _ from "lodash";

export class RemoveTermCommand extends Command {
    static aliases: string[] = ['rt', 'removeterm'];

    async execute() {
        let server = await getServerByMessage(this.message);

        for(const job of server.cronJobs){
            if(job.name == this.args[1]){
                for(let i = 2; i < this.args.length; i++){
                    job.searchTerms=_.reject(job.searchTerms, (el: any) =>{ return this.args.includes(el)});
                }
                server.save();
                if(this.message.guild){
                    await restartCronJob(job, this.message.guild.id);
                    await this.message.react('👍');
                }
                return;
            }
        }
        await this.message.reply({content: "no job with this name"});
    }

    async usage() {
        await this.message.reply({
            content: "aliases: rt, removeterm \n" +
                "%removeterm <cronjob name> <terms...>"
        });
    }

    validateArgs(): boolean {
        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }

}