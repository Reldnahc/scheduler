import {Command} from "./Command";
import {parseInt} from "lodash";
import {getServerByMessage, restartCronJob} from "../index";

export class EditFrequencyCommand extends Command {
    static aliases: string[] = ['ef', 'editfrequency'];

    async execute() {
        let server = await getServerByMessage(this.message);

        for (const job of server.cronJobs) {
            if (job.name == this.args[1]) {

                job.frequency = parseInt(this.args[2]);

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

    usage(): void {
    }

    validateArgs(): boolean {
        if(!parseInt(this.args[2])) return false;
        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }
}