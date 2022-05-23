import {Command} from "./Command";
import {deleteCronJob} from "../index";

export class CronDeleteCommand extends Command {
    static aliases: string[] = ['cd', 'crondelete', 'delete',"del"];

    async execute() {
        await deleteCronJob(this.message, this.args);
    }

    async usage() {
        await this.message.reply({
            content: "aliases: cd, crondelete, delete, del \n" +
                "%crondelete <cronjob name>"
        });
    }

    async validateArgs(): Promise<boolean> {
        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }
}