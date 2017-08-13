// Trick Heroku into keeping the app running.
const http = require('http');
const https = require('https');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('okay');
}).listen(process.env.PORT || 5000);
setInterval(() => { https.request("https://meirl-bot.herokuapp.com", () => { }); }, 5 * 60 * 1000);
// Real logic
const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const bot_token = process.env.SLACK_BOT_TOKEN || '';
let rtm = new RtmClient(bot_token);
let channels = [];
let random = undefined;
let username = undefined;
// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    channels = rtmStartData.channels.filter(c => c.is_member);
    console.log(channels);
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
    username = `<@${rtmStartData.self.id}>`;
});
// you need to wait for the client to fully connect before you can send messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
    for (const channel of channels) {
        if (channel.is_member) {
            if (!channel.is_general) {
                setTimeout(() => {
                    rtm.sendMessage("me🚀irl", channel.id);
                }, 10000);
            }
            if (channel.name == "2random4random") {
                random = channel;
            }
        }
    }
    setTimeout(makeSpammyPost, 10000);
});
let lastMessageResponse = undefined;
let currentGoal = 2;
let currentTally = 0;
async function makeSpammyPost() {
    console.log(`random: ${random}`);
    lastMessageResponse = rtm.sendMessage(`IF THIS POST GETS ${currentGoal} REACTIONS I WILL POST IT AGAIN BUT DOUBLE THE NUMBER!`, random.id);
}
rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    let text = message.text;
    if (!text)
        return;
    let me_irlRegex = /me(.?|:.+:)irl/g;
    if (text.includes(username)) {
        rtm.sendMessage('/u/waterguy12 is gonna love this one!', message.channel);
    }
    else if (text.includes(';-;')) {
        rtm.sendMessage('Me too thanks.', message.channel);
    }
    else if (me_irlRegex.test(text)) {
        rtm.sendMessage(`${text.match(me_irlRegex)[0]} machine broke.`, message.channel);
    }
    console.log(message);
});
rtm.on(RTM_EVENTS.REACTION_ADDED, async function (reaction) {
    let lastMessage = await lastMessageResponse;
    console.log(reaction);
    console.log(lastMessage.ts);
    if (lastMessage != undefined &&
        reaction.item.ts != undefined &&
        reaction.item.ts == lastMessage.ts) {
        currentTally++;
        console.log(`tally: ${currentTally}`);
        console.log(`goal: ${currentGoal}`);
        if (currentTally == currentGoal) {
            currentGoal *= 2;
            currentTally = 0;
            makeSpammyPost();
        }
    }
});
rtm.on(RTM_EVENTS.REACTION_REMOVED, async function (reaction) {
    let lastMessage = await lastMessageResponse;
    console.log(reaction);
    if (lastMessage != undefined &&
        reaction.item.ts != undefined &&
        reaction.item.ts == lastMessage.ts) {
        currentTally--;
    }
});
rtm.start();
