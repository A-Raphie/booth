/** Bundled scripts: short, number-heavy (flub-prone) reads for quick sessions. */

export type SampleScript = { id: string; title: string; body: string };

export const SAMPLE_SCRIPTS: SampleScript[] = [
  {
    id: "coldbrew",
    title: "Cold brew concentrate",
    body: `Eighteen hours. That is all this takes.
Coarse grind one cup of your darkest roast.
Add four cups of cold, filtered water.
Stir once, cover it, and walk away.
By morning you have a smooth, low acid concentrate.
Cut it fifty fifty with water or milk over ice.
One batch makes twelve servings for about sixty cents each.
No machine, no heat, no bitterness.
Just the deepest, sweetest cup you have ever made at home.`,
  },
  {
    id: "deepsleep",
    title: "Deep sleep protocol",
    body: `Two hundred milligrams of magnesium glycinate, ninety minutes before bed.
That is the anchor of the protocol.
Next, drop the room to sixty seven degrees Fahrenheit.
Your core temperature has to fall for deep sleep to begin.
Then block every light under ten lux.
Even a clock face can cut your melatonin in half.
Finally, four seven eight breathing for five minutes.
In through the nose for four, hold for seven, out for eight.
Do this for one week and your watch will show the difference.
Deeper slow wave sleep, longer cycles, fewer two a m wake ups.`,
  },
];

/** The deliberately bad take bundled for the deterministic demo. */
export const DEMO_SCRIPT_ID = "coldbrew";
export const DEMO_FLUB_LINES = [3, 7]; // what the bad take gets wrong
