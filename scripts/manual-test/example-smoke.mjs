// Baseline smoke test — and the template for feature-specific ones.
//
//   SSE_TEST_DIR=<scratchpad> scripts/manual-test/harness.sh run scripts/manual-test/example-smoke.mjs
//
// Checks that the extension loads and its main surfaces work against the
// seeded data: settings drawer, group-row buttons (Possession + Character
// State), Character State discovery, the Narrative Guidance scenario
// dropdown, and a real chat turn reaching the stand-in model. Copy it into
// the scratchpad and adapt it to the change under test; verify through state
// and the logged prompts, and use screenshots for layout only.

import {
    run, openGroup, sendMessage, requests, clearRequests, promptText,
    setReply, revealSetting, shot, closePopup, check, TEST_DIR,
} from './lib.mjs';

await run(async ({ page }) => {
    check('extension settings injected', await page.evaluate(() => !!document.getElementById('saints_silly_settings')));

    // Group rows: Possession radio, then the Character State button.
    await openGroup(page);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#rm_group_members .group_member')].map(m => ({
        name: m.querySelector('.ch_name')?.textContent.trim(),
        icons: [...m.querySelector('.group_member_icon').children].slice(0, 2).map(c => c.className.split(' ')[0]),
    })));
    check('group has members', rows.length > 0, rows.map(r => r.name).join(', '));
    check('every row: Possession radio, then Character State',
        rows.every(r => r.icons[0] === 'possession_radio_wrapper' && r.icons[1] === 'character_state_btn'));

    // Character State: open the first member's pane, variables discovered.
    await page.evaluate(() => document.querySelector('.character_state_btn').click());
    await page.waitForSelector('.cs-modal-body', { timeout: 10000 });
    const labels = await page.evaluate(() => [...document.querySelectorAll('.cs-variable-label')].map(l => l.textContent));
    check('Character State lists the card\'s variables', labels.length > 0, labels.join(', '));
    await shot(page, '.cs-modal-body', 'character-state-pane');
    await closePopup(page, '.cs-modal-body');

    // Narrative Guidance: scenarios found by the chat's tag.
    await page.waitForFunction(() => document.querySelectorAll('#ng_scenario_select option[data-key]').length > 0, null, { timeout: 20000 }).catch(() => {});
    const scenarios = await page.evaluate(() => [...document.querySelectorAll('#ng_scenario_select option[data-key]')].map(o => o.textContent));
    check('NG scenario dropdown lists the seeded scenarios', scenarios.length > 0, `${scenarios.length}: ${scenarios.slice(0, 3).join(', ')}…`);
    await revealSetting(page, '.ng_scenario_section');
    await shot(page, '.ng_scenario_section', 'ng-scenario-section');
    await page.keyboard.press('Escape');

    // A real turn through the stand-in model.
    clearRequests();
    setReply('The fog lifts a little.');
    await sendMessage(page, 'Everyone gets to work.');
    const sent = requests();
    check('the turn reached the stand-in model', sent.length > 0, `${sent.length} request(s)`);
    check('the reply landed in the chat', await page.evaluate(() => SillyTavern.getContext().chat.at(-1)?.mes?.includes('The fog lifts')));
    check('the prompt carried the user message', sent.some(r => promptText(r).includes('Everyone gets to work.')));
    console.log(`screenshots and logs in ${TEST_DIR}`);
});
