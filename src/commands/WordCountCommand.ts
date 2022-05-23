import {Command} from "./Command";
import {User} from "../schemas";

export class WordCountCommand extends Command{
    static aliases: string[] = ['wc','wordcount'];

    async execute(){
        let users = await User.find({server: this.message.guildId});
        let msg = "-Tracked Word Counts-\n";

        for (const user of users) {
            let discUser = this.client.users.cache.get(user.discId);
            if (discUser) {
                msg += discUser.username + "- ";
            } else {
                msg += "unknown user- "
            }
            for (const trackedWord of user.wordCounts) {
                msg += trackedWord[0] + ": " + trackedWord[1] + "  ";
            }
            msg += "\n"
        }
        this.message.channel.send(msg);
    }

    async usage() {
        await this.message.reply({
            content: "aliases: wc, wordcount\n" + "%wordcount"
        });
    }

    async validateArgs(): Promise<boolean> {
        return true;
    }

    validatePermissions(): boolean {
        return true;
    }


}
