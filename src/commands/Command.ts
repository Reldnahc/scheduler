import DiscordJS, {Message} from "discord.js";

export abstract class Command {
    client: DiscordJS.Client;
    message: Message;
    args: Array<string>;
    constructor(client: DiscordJS.Client,message: Message,args: Array<string>) {
        this.client = client;
        this.message = message;
        this.args=args;
    }
    abstract execute(): void;
    abstract usage(): void;
    abstract validateArgs():Promise<boolean>;
    abstract validatePermissions():boolean;
}





