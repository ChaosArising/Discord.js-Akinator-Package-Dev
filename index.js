const Discord = require("discord.js");
const { Aki } = require("aki-api");
const fs = require("fs");
const translate = require("./translate");
const games = new Set();
const attemptingGuess = new Set();

/**
    * @param {Discord.Message} message The Message Sent by the User.
    * @param {"af" | "sq" | "am" | "ar" | "hy" | "az" | "eu" | "be" | "bn" | "bs" | "bg" | "ca" | "ceb" | "ny" | "co" | "hr" | "cs" | "da" | "nl" | "en" | "eo" | "et" | "tl" | "fi" | "fr" | "fy" | "gl" | "ka" | "de" | "el" | "gu" | "ht" | "ha" | "haw" | "he" | "iw" | "hi" | "hmn" | "hu" | "is" | "ig" | "id" | "ga" | "it" | "ja" | "jw" | "kn" | "kk" | "km" | "ko" | "ku" | "ky" | "lo" | "la" | "lv" | "lt" | "lb" | "mk" | "mg" | "ms" | "ml" | "mt" | "mi" | "mr" | "mn" | "my" | "ne" | "no" | "ps" | "fa" | "pl" | "pt" | "pa" | "ro" | "ru" | "sm" | "gd" | "sr" | "st" | "sn" | "sd" | "si" | "sk" | "sl" | "so" | "es" | "su" | "sw" | "sv" | "tg" | "ta" | "te" | "th" | "tr" | "uk" | "ur" | "uz" | "vi" | "cy" | "xh" | "yi" | "yo" | "zu"} language (OPTIONAL): The Region/Language Code you want to Use. Defaults to "en".
    * @param {Boolean} useButtons (OPTIONAL): Whether you want to use Buttons instead of Typing your Response to the Question. Defaults to "false".
    * @returns Discord.js Akinator Game
    * @async
    * @example
    * const Discord = require("discord.js");
    * const client = new Discord.Client();
    * const akinator = require("discord.js-akinator");
    * 
    * const PREFIX = "!";
    * 
    * let language = "en";
    * let useButtons = true;
    *
    * client.on("message", async message => {
    *     if(message.content.startsWith(`${PREFIX}akinator`)) {
    *         akinator(message, language, useButtons);
    *         // language will default to "en" if it's not specified!
    *         // useButtons will default to "false" if it's not specified!
    *     }
    * });
    */

module.exports = async function (message, language, useButtons) {
    try {
        // error handling
        if (!message) return console.log("Error: Message was not Provided.'");
        if (!message.id || !message.channel || !message.channel.id || !message.author) return console.log("Error: Message Provided was Invalid.");
        if (!message.guild) return console.log("Error: Cannot be used in Direct Messages.");
        if (!language) language = "en";
        if (!fs.existsSync(`${__dirname}/translations/${language}.json`)) return console.log(`Error: Language "${language}" Not Found. Example: "en" or "fr" or "es".`);
        if (!useButtons) useButtons = false;

        // defining for easy use
        let usertag = message.author.tag
        let avatar = message.author.displayAvatarURL()

        // check if a game is being hosted by the player
        if (games.has(message.author.id)) {
            let alreadyPlayingEmbed = new Discord.MessageEmbed()
                .setAuthor(usertag, avatar)
                .setTitle(`❌ ${await translate("You're Already Playing!", language)}`)
                .setDescription(`**${await translate("You're already Playing a Game of Akinator. Type `S` or `Stop` to cancel your game.", language)}**`)
                .setColor("RED")

            return message.channel.send({ embeds: [alreadyPlayingEmbed] })
        }

        // adding the player into the game
        games.add(message.author.id)

        let startingEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`${await translate("Starting Game...", language)}`)
            .setDescription(`**${await translate("The game will start in a few seconds...", language)}**`)
            .setColor("RANDOM")

        let startingMessage = await message.channel.send({ embeds: [startingEmbed] })

        // get translation object for the language
        let translations = require(`${__dirname}/translations/${language}.json`);

        // starts the game
        let aki = new Aki("en")
        await aki.start();

        let notFinished = true;
        let stepsSinceLastGuess = 0;
        let hasGuessed = false;

        let noResEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(translations.gameEnded)
            .setDescription(`**${message.author.username}, ${translations.gameEndedDesc}**`)
            .setColor("RANDOM")

        let akiEmbed = new Discord.MessageEmbed()
            .setAuthor(usertag, avatar)
            .setTitle(`${translations.question} ${aki.currentStep + 1}`)
            .setDescription(`**${translations.progress}: 0%\n${await translate(aki.question, language)}**`)
            .addField(translations.pleaseType, `**Y** or **${translations.yes}**\n**N** or **${translations.no}**\n**I** or **IDK**\n**P** or **${translations.probably}**\n**PN** or **${translations.probablyNot}**\n**B** or **${translations.back}**`)
            .setFooter(translations.stopTip)
            .setColor("RANDOM")

        await startingMessage.delete();
        let akiMessage = await message.channel.send({ embeds: [akiEmbed] });

        // if message was deleted, quit the player from the game
        message.client.on("messageDelete", async deletedMessage => {
            if (deletedMessage.id == akiMessage.id) {
                notFinished = false;
                games.delete(message.author.id)
                attemptingGuess.delete(message.guild.id)
                await aki.win()
                return;
            }
        })

        // repeat while the game is not finished
        while (notFinished) {
            if (!notFinished) return;

            stepsSinceLastGuess = stepsSinceLastGuess + 1

            if (((aki.progress >= 95 && (stepsSinceLastGuess >= 10 || hasGuessed == false)) || aki.currentStep >= 78) && (!attemptingGuess.has(message.guild.id))) {
                attemptingGuess.add(message.guild.id)
                await aki.win();

                stepsSinceLastGuess = 0;
                hasGuessed = true;

                let guessEmbed = new Discord.MessageEmbed()
                    .setAuthor(usertag, avatar)
                    .setTitle(`${await translate(`I'm ${Math.round(aki.progress)}% sure your character is...`, language)}`)
                    .setDescription(`**${await translate(aki.answers[0].name, language)}**\n${await translate(aki.answers[0].description, language)}\n\n${translations.isThisYourCharacter} **(Type Y/${translations.yes} or N/${translations.no})**`)
                    .addField(translations.ranking, `**#${aki.answers[0].ranking}**`, true)
                    .addField(translations.noOfQuestions, `**${aki.currentStep}**`, true)
                    .setImage(aki.answers[0].absolute_picture_path)
                    .setColor("RANDOM")
                await akiMessage.edit({ embeds: [guessEmbed] });

                // valid answers if the akinator sends the last question
                const guessFilter = x => {
                    return (x.author.id === message.author.id && ([
                        "y",
                        translations.yes.toLowerCase(),
                        "n",
                        translations.no.toLowerCase(),
                    ].includes(x.content.toLowerCase())));
                }
                await message.channel.awaitMessages({ guessFilter, max: 1, time: 60000 })
                    .then(async responses => {
                        if (!responses.size) {
                            return akiMessage.edit({ embeds: [noResEmbed] });
                        }
                        const guessAnswer = await translate(String(responses.first()).toLowerCase(), language)

                        await responses.first().delete();

                        attemptingGuess.delete(message.guild.id)

                        // if they answered yes
                        if (guessAnswer == "y" || guessAnswer == translations.yes.toLowerCase()) {
                            let finishedGameCorrect = new Discord.MessageEmbed()
                                .setAuthor(usertag, avatar)
                                .setTitle(translations.wellPlayed)
                                .setDescription(`**${message.author.username}, ${translations.guessedRightOneMoreTime}**`)
                                .addField(translations.character, `**${await translate(aki.answers[0].name, lagnuage)}**`, true)
                                .addField(translations.ranking, `**#${aki.answers[0].ranking}**`, true)
                                .addField(translations.noOfQuestions, `**${aki.currentStep}**`, true)
                                .setColor("RANDOM")
                            await akiMessage.edit({ embeds: [finishedGameCorrect] })
                            notFinished = false;
                            games.delete(message.author.id)
                            return;

                            // otherwise
                        } else if (guessAnswer == "n" || guessAnswer == translations.no.toLowerCase()) {
                            if (aki.currentStep >= 78) {
                                let finishedGameDefeated = new Discord.MessageEmbed()
                                    .setAuthor(usertag, avatar)
                                    .setTitle(`Well Played!`)
                                    .setDescription(`**${message.author.username}, ${translations.defeated}**`)
                                    .setColor("RANDOM")
                                await akiMessage.edit({ embeds: [finishedGameDefeated] })
                                notFinished = false;
                                games.delete(message.author.id)
                            } else {
                                aki.progress = 50
                            }
                        }
                    });
            }

            if (!notFinished) return;

            let updatedAkiEmbed = new Discord.MessageEmbed()
                .setAuthor(usertag, avatar)
                .setTitle(`${translations.question} ${aki.currentStep + 1}`)
                .setDescription(`**${translations.progress}: ${Math.round(aki.progress)}%\n${await translate(aki.question, language)}**`)
                .addField(translations.pleaseType, `**Y** or **${translations.yes}**\n**N** or **${translations.no}**\n**I** or **IDK**\n**P** or **${translations.probably}**\n**PN** or **${translations.probablyNot}**\n**B** or **${translations.back}**`)
                .setFooter(translations.stopTip)
                .setColor("RANDOM")
            akiMessage.edit({ embeds: [updatedAkiEmbed] })

            // all valid answers when answering a regular akinator question
            const filter = x => {
                return (x.author.id === message.author.id && ([
                    "y",
                    translations.yes.toLowerCase(),
                    "n",
                    translations.no.toLowerCase(),
                    "i",
                    "idk",
                    translations.dontKnowNoComma.toLowerCase(),
                    translations.dontKnow.toLowerCase(),
                    "p",
                    translations.probably.toLowerCase(),
                    "pn",
                    translations.probablyNot.toLowerCase(),
                    "b",
                    translations.back.toLowerCase(),
                    "s",
                    translations.stop.toLowerCase(),
                ].includes(x.content.toLowerCase())));
            }
            await message.channel.awaitMessages({ filter, max: 1, time: 60000 })
                    .then(async responses => {
                    if (!responses.size) {
                        await aki.win()
                        notFinished = false;
                        games.delete(message.author.id)
                        return akiMessage.edit({ embeds: [noResEmbed] })
                    }
                    const answer = await translate(String(responses.first()).toLowerCase().replace("'", ""), language)
                    // assign points for the possible answers given
                    const answers = {
                        "y": 0,
                        "yes": 0,
                        "n": 1,
                        "no": 1,
                        "i": 2,
                        "idk": 2,
                        "dont know": 2,
                        "don't know": 2,
                        "i": 2,
                        "p": 3,
                        "probably": 3,
                        "pn": 4,
                        "probably not": 4,
                    }

                    let thinkingEmbed = new Discord.MessageEmbed()
                        .setAuthor(usertag, avatar)
                        .setTitle(`${translations.question} ${aki.currentStep + 1}`)
                        .setDescription(`**${translations.progress}: ${Math.round(aki.progress)}%\n${await translate(aki.question, language)}**`)
                        .addField(translations.pleaseType, `**Y** or **${translations.yes}**\n**N** or **${translations.no}**\n**I** or **IDK**\n**P** or **${translations.probably}**\n**PN** or **${translations.probablyNot}**\n**B** or **${translations.back}**`)
                        .setFooter(`🤔`)
                        .setColor("RANDOM")
                    await akiMessage.edit({ embeds: [thinkingEmbed] })

                    await responses.first().delete();

                    if (answer == "b" || answer == translations.back.toLowerCase()) {
                        if (aki.currentStep >= 1) {
                            await aki.back();
                        }

                        // stop the game if the user selected to stop
                    } else if (answer == "s" || answer == translations.stop.toLowerCase()) {
                        games.delete(message.author.id)
                        let stopEmbed = new Discord.MessageEmbed()
                            .setAuthor(usertag, avatar)
                            .setTitle(translations.gameEnded)
                            .setDescription(`**${message.author.username}, ${translations.gameForceEnd}**`)
                            .setColor("RANDOM")
                        await aki.win()
                        await akiMessage.edit({ embeds: [stopEmbed] })
                        notFinished = false;
                    } else {
                        await aki.step(answers[answer]);
                    }

                    if (!notFinished) return;
                });
        }
    } catch (e) {
        // log any errors that come
        attemptingGuess.delete(message.guild.id)
        games.delete(message.guild.id)
        if (e == "DiscordAPIError: Unknown Message") return;
        console.log(`Error: ${e}`)
    }
}
