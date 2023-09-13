
export const buildIndex = async (lists: Record<string, unknown>) => {
    const html = await Bun.file(`src/index.html`).text()

    const newContent = html.replace('`<!--LISTS-->`', JSON.stringify(lists));
    await Bun.write('lists/index.html', newContent)
}