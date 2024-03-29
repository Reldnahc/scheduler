import DiscordJS, {Message} from "discord.js";
import {TrackWordCommand} from "./TrackWordCommand";
import {Command} from "./Command";
import {CronCommand} from "./CronCommand";
import {WordCountCommand} from "./WordCountCommand";
import {CronListCommand} from "./CronListCommand";
import {CronDeleteCommand} from "./CronDeleteCommand";
import {AddTermCommand} from "./AddTermCommand";
import {RemoveTermCommand} from "./RemoveTermCommand";
import {EditFrequencyCommand} from "./EditFrequencyCommand";
import {PostGifCommand} from "./PostGifCommand";
import {AnnoyUserCommand} from "./AnnoyUserCommand";
import {KwoutCommand} from "./kwoutCommand";

export class CommandManager{//todo make singleton
    client: DiscordJS.Client;
    constructor(client: DiscordJS.Client) {
        this.client = client;
    }

    async runCommand(message: Message, args: Array<string>) {
        switch (true) {
            case TrackWordCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new TrackWordCommand(this.client, message, args));
                break;
            case CronCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new CronCommand(this.client, message, args));
                break;
            case WordCountCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new WordCountCommand(this.client, message, args));
                break;
            case CronListCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new CronListCommand(this.client, message, args));
                break;
            case CronDeleteCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new CronDeleteCommand(this.client, message, args));
                break;
            case AddTermCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new AddTermCommand(this.client, message, args));
                break;
            case RemoveTermCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new RemoveTermCommand(this.client, message, args));
                break;
            case EditFrequencyCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new EditFrequencyCommand(this.client, message, args));
                break;
            case PostGifCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new PostGifCommand(this.client, message, args));
                break;
            case AnnoyUserCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new AnnoyUserCommand(this.client, message, args));
                break;
            case KwoutCommand.aliases.includes(args[0]):
                await this.validateAndRunCommand(new KwoutCommand(this.client, message, args));
                break;
            default:
                console.log("unknown command: %" + args[0]);
        }
    }

    private async validateAndRunCommand(command: Command) {
        let valid = await command.validateArgs();
        if (!command.validatePermissions()) {
            await command.message.reply({content: "You dont have permission to use this command"});
        } else if (!valid) {
            command.usage();
        } else {
            command.execute()
        }
    }
}
