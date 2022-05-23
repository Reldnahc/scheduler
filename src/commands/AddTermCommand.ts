import {Command} from "./Command";
import {getServerByMessage, restartCronJob} from "../index";

export class AddTermCommand extends Command {
    static aliases: string[] = ['at', 'addterm', 'term', "add"];

    async execute() {
        let server = await getServerByMessage(this.message);

        for (const job of server.cronJobs) {
            if (job.name == this.args[1]) {
                for (let i = 2; i < this.args.length; i++) {
                    job.searchTerms.push(this.args[i]);
                }
                server.save();
                if (this.message.guild) {
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
            content: "aliases: at, addterm, term, add \n" +
                "%addterm <cronjob name> <terms...>"
        });
    }

    async validateArgs(): Promise<boolean> {
        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }

}