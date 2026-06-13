import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

interface PaginationOptions {
  timeout?: number;
  showPageCount?: boolean;
  extraButtons?: ButtonBuilder[];
}

export async function createPagination(
  interaction: ChatInputCommandInteraction,
  pages: EmbedBuilder[],
  options: PaginationOptions = {}
): Promise<void> {
  const { timeout = 120_000, showPageCount = true, extraButtons = [] } = options;

  if (pages.length === 0) {
    await interaction.editReply({ content: 'Aucun résultat.' });
    return;
  }

  if (pages.length === 1) {
    await interaction.editReply({ embeds: [pages[0]] });
    return;
  }

  let currentPage = 0;

  const getRow = (page: number): ActionRowBuilder<ButtonBuilder> => {
    const buttons = [
      new ButtonBuilder()
        .setCustomId('page_first')
        .setLabel('⏮')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('page_prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('page_info')
        .setLabel(showPageCount ? `${page + 1} / ${pages.length}` : '—')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('page_next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === pages.length - 1),
      new ButtonBuilder()
        .setCustomId('page_last')
        .setLabel('⏭')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === pages.length - 1)
    ];
    return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
  };

  const response = await interaction.editReply({
    embeds: [pages[0]],
    components: [getRow(0), ...(extraButtons.length ? [new ActionRowBuilder<ButtonBuilder>().addComponents(extraButtons)] : [])]
  });

  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: timeout
  });

  collector.on('collect', async (i) => {
    await i.deferUpdate();

    switch (i.customId) {
      case 'page_first': currentPage = 0; break;
      case 'page_prev':  currentPage = Math.max(0, currentPage - 1); break;
      case 'page_next':  currentPage = Math.min(pages.length - 1, currentPage + 1); break;
      case 'page_last':  currentPage = pages.length - 1; break;
      default: return;
    }

    await interaction.editReply({
      embeds: [pages[currentPage]],
      components: [getRow(currentPage)]
    });
  });

  collector.on('end', async () => {
    const disabledRow = getRow(currentPage);
    disabledRow.components.forEach(btn => (btn as ButtonBuilder).setDisabled(true));
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}
