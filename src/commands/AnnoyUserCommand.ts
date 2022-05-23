import {Command} from "./Command";
import GraphemeSplitter from "grapheme-splitter";
import {getServerByMessage} from "../index";

export class AnnoyUserCommand extends Command {
    static aliases: string[] = ['annoy'];
    regex_emoji = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/u;
    emojis = new Array<string>();
    gifs = new Array<string>();
    user: string = "";

    async execute() {
        let server = await getServerByMessage(this.message);
        let user: any = {discId: this.user,emojis: this.emojis, gifs: this.gifs };
        server.annoyedUsers.push(user);
        server.save();
        await this.message.react("👍");
    }

    async usage() {
        await this.message.reply({
            content: "aliases: annoy \n" +
                "%annoy <emojis use \"\" if there are more than 1> <gifs...>"
        });
    }

    async validateArgs(): Promise<boolean> {
        if (this.args.length < 4) {
            console.log("not enough args");
            return false;
        }

        await this.client.users.fetch(this.args[1]).then(r => {
            this.user = r.id;
        }).catch(err => {
            console.error(err);
        });
        if(this.user == ""){
            return false;
        }
        const splitter = new GraphemeSplitter();
        this.emojis = splitter.splitGraphemes(this.args[2]);
        this.emojis.forEach(emoji => {
            if (!this.regex_emoji.test(emoji)) {
                return false;
            }
        });

        for (let i = 3; i < this.args.length; i++) {
            this.gifs.push(this.args[i])
        }

        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }
}