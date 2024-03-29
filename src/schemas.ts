import mongoose, {Schema} from "mongoose";

export const userSchema = new Schema({
    discId: String,
    server: String,
    wordCounts: {type: Map, of: String},
});

export const User = mongoose.model('User',userSchema);

export const serverSchema = new Schema({
    discId: String,
    trackedWords: [{word: String, emojis: Array}],
    cronJobs: [{
        name: String,
        channelId: String,
        cronJob: String,
        message: String,
        job: String,
        searchTerms: {type: Array, default: ['anime']},
        frequency: {type: Number, default: 15}}],
    annoyedUsers: [{
        discId: String,
        gifs: Array,
        emojis: Array,
    }],
    deafenChannel: String,
    deafenUsers: [String],

});

export const Server = mongoose.model('Server',serverSchema);