const superagent = require("superagent");
const post = async (guild, next, wiggle) => {
	await superagent.post(`https://www.carbonitex.net/discord/data/botdata.php`)
		.send({
			key: siteKey,
			servercount: guild.shard.guildCount, // eslint-disable-line camelcase
			shardcount: guild.shard.client.options.maxShards, // eslint-disable-line camelcase
			shardid: guild.shard.id // eslint-disable-line camelcase
		})
		.catch(err => { }); // eslint-disable-line

	return next();
};

let siteKey;
module.exports = ({ key }) => {
	siteKey = key;
	return post;
};