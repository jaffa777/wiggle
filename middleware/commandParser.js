const commandParser = async (message, next, wiggle) => {
	let prefixes;
	if(wiggle.get("getPrefixes")) prefixes = await wiggle.get("getPrefixes")(message);
	else prefixes = wiggle.get("prefixes") || ["mention"];

	prefixes = prefixes.filter((ele, i, arr) => arr.indexOf(ele) === i);
	if(wiggle.get("escapePrefixes") !== false) {
		prefixes = prefixes.map(regex => regex.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
	}

	if(~prefixes.indexOf("mention")) prefixes[prefixes.indexOf("mention")] = `<@!?${wiggle.erisClient.user.id}>`;
	const prefixRegex = new RegExp(`^(?:${prefixes.join("|")}),?(?:\\s+)?([\\s\\S]+)`, "i");

	message.originalContent = message.content;
	let match = message.content.match(prefixRegex);
	if(!match && message.channel.guild) return next();
	else if(match) [, message.content] = match;

	let command;
	if(!~message.content.indexOf(" ")) {
		command = message.content;
		message.content = "";
	} else {
		command = message.content.substring(0, message.content.indexOf(" "));
		message.content = message.content.substring(message.content.indexOf(" ")).trim();
	}
	command = command.toLowerCase().trim();

	const middlewares = wiggle._middleware.reduce((total, mid) => {
		if(mid.type === "category") {
			const commands = mid.category._middleware.filter(mid2 => ~["command", "subcommand"].indexOf(mid2.type));
			total = total.concat(commands);
		} else if(mid.type === "command") {
			total.push(mid);
		}

		return total;
	}, []);

	command = middlewares.find(mid => mid.name === command ||
		(mid.subCommands && mid.subCommands.aliases && ~mid.subCommands.aliases.indexOf(command)) |
		(mid.command && ~mid.command.aliases.indexOf(command)));

	if(!command) {
		return next();
	} else if(command.type === "subcommand") {
		const { subCommands: subcommand } = command;
		const index = ~message.content.indexOf(" ") ? message.content.indexOf(" ") : message.content.length;
		command = message.content.substring(0, index);

		if(!command.length) {
			command = subcommand._middleware.find(mid => mid.type === "command" && mid.name === subcommand.name);

			if(!command) {
				return message.channel.createMessage(
					message.t("wiggle.subcommands.noSubcommand", { subcommands: [...subcommand.commands.keys()].join(", ") })
				);
			}
		} else {
			const oldContent = message.content;
			message.content = message.content.substring(index).trim();

			command = subcommand._middleware.find(mid => mid.type === "command" &&
				(mid.name === command || ~mid.command.aliases.indexOf(command)));

			if(!command) {
				command = subcommand._middleware.find(mid => mid.type === "command" &&
					mid.name === subcommand.name);

				if(command) message.content = oldContent;
			}

			if(!command) {
				return message.channel.createMessage(
					message.t("wiggle.subcommands.invalidSubCommand", { subcommands: [...subcommand.commands.keys()].join(", ") })
				);
			}
		}
	}

	if(command.command.guildOnly && !message.channel.guild) {
		return message.channel.createMessage(message.t("wiggle.commands.error.guildOnly"));
	}

	if(!command.command.caseSensitive) message.content = message.content.toLowerCase();
	if(command.command.onCooldown(message.author)) {
		return message.channel.createMessage(message.t("wiggle.commands.error.cooldown", {
			seconds: command.command.cooldown.time / 1000,
			times: command.command.cooldown.uses
		}));
	}

	message.command = command.command;
	return next();
};

module.exports = () => ({ middleware: commandParser, priority: 99 });
