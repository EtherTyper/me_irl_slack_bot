// Trick Heroku into keeping the app running.
const http = require('http')

require('http').createServer((req, res) => { res.end(); }).listen(process.env.PORT || 5000);
setInterval(() => { http.request("https://meirl-bot.herokuapp.com", null) }, 5 * 60 * 1000)

const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const bot_token: string = process.env.SLACK_BOT_TOKEN || '';

let rtm = new RtmClient(bot_token);

type Channel = {is_member: boolean, is_general: boolean, id: string, name: string};

let channels: Channel[] = [];
let random: Channel | undefined = undefined;
let username: string | undefined = undefined;

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

let lastMessageResponse: Promise<{ts: string}> = undefined;
let currentGoal = 2;
let currentTally = 0;

async function makeSpammyPost() {
    console.log(`random: ${random}`);
    lastMessageResponse = rtm.sendMessage(`IF THIS POST GETS ${currentGoal} REACTIONS I WILL POST IT AGAIN BUT DOUBLE THE NUMBER!`, random.id);
}

rtm.on(RTM_EVENTS.MESSAGE, function (message: {text: string, channel: string}) {
    let text = message.text;
    if (!text) return;

    let me_irlRegex = /me(.?|:.+:)irl/g;

    if (text.includes(username)) {
        rtm.sendMessage('/u/waterguy12 is gonna love this one!', message.channel);
    } else if (text.includes(';-;')) {
        rtm.sendMessage('Me too thanks.', message.channel);
    } else if (me_irlRegex.test(text)) {
        rtm.sendMessage(`${text.match(me_irlRegex)[0]} machine broke.`, message.channel);
    }

    console.log(message);
})

type Reaction = {item?: {ts: string}};

rtm.on(RTM_EVENTS.REACTION_ADDED, async function (reaction: Reaction) {
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
})

rtm.on(RTM_EVENTS.REACTION_REMOVED, async function (reaction: Reaction) {
    let lastMessage = await lastMessageResponse;

    console.log(reaction);
    if (lastMessage != undefined && 
        reaction.item.ts != undefined &&
        reaction.item.ts == lastMessage.ts) {
            currentTally--;
        }
})

rtm.start();
