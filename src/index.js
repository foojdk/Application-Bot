const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, WebhookClient } = require('discord.js');
const { clientId, token, reviewChannelId, roleId, webhookId, webhookToken } = require('./config.json');

const commands = [
  {
    name: 'apply',
    description: 'Start ansøgningen.',
  }
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
  );
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
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'apply') {
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
    for (const question of questions) {
      const questionEmbed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setDescription(question);
      await dmChannel.send({ embeds: [questionEmbed] });
      
      const filter = m => m.author.id === interaction.user.id;
      const collected = await dmChannel.awaitMessages({ filter, max: 1 });
      responses.push(collected.first().content);
    }
    
    await interaction.editReply({ content: 'Vi har modtaget din besked - Du vil modtage svar herinde!', ephemeral: true });
    sendApplicationResult(interaction.user, responses, questions);
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
    filter: (reaction, user) => reaction.emoji.name === '✅' && !user.bot
  });

  collector.on('collect', async (reaction, user) => {
    const member = await reaction.message.guild.members.fetch(user.id);
    const role = await reaction.message.guild.roles.fetch(roleId);
    await member.roles.add(role);
    
    const approvalEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('Godkendelse til samtale')
      .setDescription('Du er blevet godkendt til samtale!');
    await member.send({ embeds: [approvalEmbed] });

  });
}

client.login(token);
