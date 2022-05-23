import {Command} from "./Command";
import {getServerByMessage} from "../index";

export class CronListCommand extends Command{
    static aliases: string[] = ['cl','cronlist','list'];

    async execute() {
        let server = await getServerByMessage(this.message);
        let msg = "";

        for (let i = 0; i < server.cronJobs.length; i++) {
            msg += i + 1 + ":\n";
            msg += "    Name: " + server.cronJobs[i].name + "\n";
            msg += "    Channel ID: " + server.cronJobs[i].channelId + "\n";
            msg += "    Cron: " + server.cronJobs[i].cronJob + "\n";
            msg += "    Message: " + server.cronJobs[i].message + "\n";
            msg += "    Job: " + server.cronJobs[i].job + "\n";
            if (server.cronJobs[i].job == 'postgif') {
                msg += "    Frequency: " + server.cronJobs[i].frequency + "\n";
                msg += "    Search terms: ";
                for (const term of server.cronJobs[i].searchTerms) {
                    msg += term + ", ";
                }
                msg += "\n";
            }
        }

        if (server.cronJobs.length == 0) {
            msg = "No cron jobs.";
        }
        await this.message.reply({content: msg});
    }

    async usage() {
        await this.message.reply({
            content: "aliases: cronlist, cl, list \n" +
                "%cronlist"
        });
    }

    async validateArgs(): Promise<boolean> {
        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }

}