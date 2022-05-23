import {Command} from "./Command";
import GraphemeSplitter from "grapheme-splitter";
import {getServerByMessage} from "../index";

export class TrackWordCommand extends Command{
    static aliases: string[] = ['tw','trackword'];
    regex_emoji = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/u;

    async usage(){
        await this.message.reply({content: "aliases: trackword, tw \n" +
                "%trackword <word> <emoji?>"
        });
    };

    async execute(){
        let emojis = [''];
        if(this.args[2]){
            const splitter = new GraphemeSplitter();
            emojis = splitter.splitGraphemes(this.args[2]);
            emojis.forEach(emoji => {
                if (!this.regex_emoji.test(emoji)) {
                    this.message.reply({
                        content: "invalid emoji"
                    });
                    return;
                }
            });
        }

        let server = await getServerByMessage(this.message);
        let trackedWord: { word: String, emojis: Array<any> } = {word: this.args[1], emojis: emojis};
        server.trackedWords.push(trackedWord);
        server.save();
        await this.message.react("👍");
    }

    async validateArgs(): Promise<boolean> {
        if(!this.args[1]) return false;
        if(!this.regex_emoji.test(this.args[2])) return false;//not emoji

        return true;
    }

    validatePermissions(): boolean {
        return !!this.message.member?.permissions.has("ADMINISTRATOR");
    }
}
