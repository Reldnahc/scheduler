import mongoose, {Schema} from "mongoose";

export const userSchema = new Schema({
    discId: String,
    server: String,
    wordCounts: {type: Map, of: String},
});

export const User = mongoose.model('User',userSchema);

export const serverSchema = new Schema({
    discId: String,
    trackedWords: [{word: String, emojis: Array}]
});

export const Server = mongoose.model('Server',serverSchema);