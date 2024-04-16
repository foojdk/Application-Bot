const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, WebhookClient, PermissionFlagsBits } = require('discord.js');
const { clientId, token, reviewChannelId, roleId, webhookId, webhookToken } = require('./config.json');

const commands = [
  {
    name: 'apply',
    description: 'Start ansøgningen.',
  }
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
    );
  } catch (error) {
    console.error(error);
  }
})();

const webhook = new WebhookClient({ id: webhookId, token: webhookToken });
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.once('ready', () => {
  console.log('Botten er startet');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() || interaction.commandName !== 'apply') return;
  await interaction.deferReply({ ephemeral: true });
  const dmChannel = await interaction.user.createDM();
  const questions = [
    'Indtast dit Discord navn:',
    'Skriv din IRL alder:',
    'Hvad hedder din RP karakter?:',
    'Beskriv din RP karakter.',
    'Hvad har du af RP erfaring? (Andre servere, andre spil mm.)',
    'Hvad er Roleplay for dig?',
    'Opstil dig eget Roleplay scenarie. (Brug din fantasi)',
  ];
  
  const responses = [];
  try {
    for (const question of questions) {
      const questionEmbed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('Whitelist ansøgning')
        .setDescription(question);
      await dmChannel.send({ embeds: [questionEmbed] });
      
      const filter = m => m.author.id === interaction.user.id;
      const collected = await dmChannel.awaitMessages({ filter, max: 1 });
      responses.push(collected.first().content);
    }
    
    await interaction.editReply({ content: 'Vi har modtaget din besked - Du vil modtage svar herinde!', ephemeral: true });
    sendApplicationResult(interaction.user, responses, questions);
  } catch (error) {
    console.error('Fejl i ansøgnings processen:', error);
    interaction.editReply({ content: 'Der opstod en fejl under behandlingen af din ansøgning.', ephemeral: true });
  }
});

async function sendApplicationResult(user, responses, questions) {
  const reviewChannel = await client.channels.fetch(reviewChannelId);
  const resultsEmbed = new EmbedBuilder()
    .setTitle(`Ansøgning sendt af ${user.tag} (${user.id})`)
    .setColor(0x00AE86);

  questions.forEach((question, index) => {
    resultsEmbed.addFields({ name: `Spørgsmål ${index + 1}: ${question}`, value: `Svar: ${responses[index]}`, inline: false });
  });

  const sentMessage = await reviewChannel.send({ embeds: [resultsEmbed] });
  await sentMessage.react('✅');
  await sentMessage.react('❌');

  const collector = sentMessage.createReactionCollector({
    filter: (reaction, user) => !user.bot && (reaction.emoji.name === '✅' || reaction.emoji.name === '❌')
  });

  collector.on('collect', async (reaction, user) => {
    const member = await reaction.message.guild.members.fetch(user.id);
    if (reaction.emoji.name === '✅') {
      const role = await reaction.message.guild.roles.fetch(roleId);
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        const approvalEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('Godkendelse til samtale')
          .setDescription(`Du er blevet godkendt til samtale! En admin vil kontakte dig snart. Godkendt af: ${user.tag}`);
        await member.send({ embeds: [approvalEmbed] });
        
        // Opdater beskeden til at sige den er accepteret
        await reaction.message.edit({ content: `Ansøgning accepteret af ${user.tag}`, embeds: [reaction.message.embeds[0]] });
        // Fjern alle reaktioner
        await reaction.message.reactions.removeAll();
      } else {
        const alreadyWhitelistedEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('Allerede Whitelistet')
          .setDescription(`${member.user.tag} (${member.id}) har allerede den nødvendige rolle.`);
        await reaction.message.channel.send({ embeds: [alreadyWhitelistedEmbed] });
        
        // Fjern alle reaktioner
        await reaction.message.reactions.removeAll();
      }
    } else if (reaction.emoji.name === '❌') {
      const rejectionEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Ansøgning Afvist')
        .setDescription(`Din ansøgning er blevet afvist. Afvist af: ${user.tag}`);
      await member.send({ embeds: [rejectionEmbed] });
  
      // Opdater beskeden til at vise hvem der har afvist.
      await reaction.message.edit({ content: `Ansøgning afvist af ${user.tag}`, embeds: [reaction.message.embeds[0]] });
      // Fjerner alle reaktioner
      await reaction.message.reactions.removeAll();
    }
  });

}

client.login(token);
