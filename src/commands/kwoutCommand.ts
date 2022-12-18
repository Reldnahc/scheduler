import {Command} from "./Command";

import {getServerByMessage, restartCronJob, restartKwoutJob} from "../index";

export class KwoutCommand extends Command {
    static aliases: string[] = ['k'];
    private user: string = "";

    async execute() {
        let server = await getServerByMessage(this.message);

        if(!server.deafenUsers.includes(this.user)){
            server.deafenUsers.push(this.user);
            server.save();
            if (this.message.guild) {
                await restartKwoutJob(this.message.guild);
                await this.message.react('👍');
            }
        }else{
            await this.message.reply('Already kwouted.');
        }
    }

    async usage() {
        await this.message.reply({
            content: "aliases: k \n" +
                "%kwout <discId>"
        });
    }

    async validateArgs(): Promise<boolean> {
        await this.client.users.fetch(this.args[1]).then(r => {
            this.user = r.id;
        }).catch(err => {
            console.error(err);
        });
        return this.user != "";
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }
}