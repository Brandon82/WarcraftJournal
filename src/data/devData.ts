/**
 * Developer-mode reference data — mirrors the override/blacklist constants in
 * scripts/fetch-data.ts. Update both files when curating NPC/spell lists.
 */

export interface DevNpcOverride {
  id: number;
  name: string;
  classification: number; // 1=elite, 2=rare-elite, 3=boss, 4=rare
  spells?: { id: number; name: string; schools: number }[];
  additionalSpells?: { id: number; name: string; schools: number }[];
}

// Mirrors ZONE_NPC_OVERRIDES in scripts/fetch-data.ts — keyed by instance ID
export const ZONE_NPC_OVERRIDES: Record<number, DevNpcOverride[]> = {
  // Windrunner Spire
  1299: [
    { id: 232119, name: 'Swiftshot Archer', classification: 1, spells: [
      { id: 1216419, name: 'Shoot', schools: 1 },
      { id: 1216454, name: 'Arrow Rain', schools: 1 },
    ] },
    { id: 232447, name: 'Spectral Axethrower', classification: 1, spells: [
      { id: 1217094, name: 'Throw Axe', schools: 1 },
    ] },
    { id: 232232, name: 'Zealous Reaver', classification: 1, spells: [
      { id: 473640, name: 'Fierce Slash', schools: 1 },
    ] },
    { id: 232171, name: 'Ardent Cutthroat', classification: 1, spells: [
      { id: 473794, name: 'Poison Blades', schools: 8 },
      { id: 473868, name: 'Shadowrive', schools: 1 },
    ] },
    { id: 232116, name: 'Windrunner Soldier', classification: 1, spells: [
      { id: 1216462, name: 'Precise Cut', schools: 1 },
    ] },
    { id: 232173, name: 'Fervent Apothecary', classification: 1, spells: [
      { id: 473647, name: 'Phial Toss', schools: 8 },
    ] },
    { id: 232070, name: 'Restless Steward', classification: 1, spells: [
      { id: 1216135, name: 'Spirit Bolt', schools: 32 },
      { id: 1216298, name: 'Soul Torment', schools: 32 },
    ] },
    { id: 258868, name: 'Haunting Grunt', classification: 1, spells: [
      { id: 467815, name: 'Intercepting Charge', schools: 1 },
    ] },
    { id: 232121, name: 'Phalanx Breaker', classification: 1, spells: [
      { id: 471648, name: 'Break Ranks', schools: 1 },
      { id: 471643, name: 'Interrupting Screech', schools: 1 },
    ] },
    { id: 232283, name: 'Loyal Worg', classification: 1, spells: [
      { id: 1253739, name: 'Shred Flesh', schools: 1 },
    ] },
    { id: 232067, name: 'Creeping Spindleweb', classification: 1, spells: [
      { id: 1216834, name: 'Acidic Demise', schools: 8 },
      { id: 1216822, name: 'Poison Spray', schools: 8 },
    ] },
    { id: 232147, name: 'Lingering Marauder', classification: 1, spells: [
      { id: 1216643, name: 'Gore Whirl', schools: 1 },
    ] },
    { id: 238049, name: 'Scouting Trapper', classification: 1, spells: [
      { id: 1219224, name: 'Freezing Trap', schools: 16 },
    ] },
    { id: 234061, name: 'Phantasmal Mystic', classification: 1, spells: [
      { id: 1216592, name: 'Chain Lightning', schools: 8 },
      { id: 1216459, name: 'Ephemeral Bloodlust', schools: 1 },
    ] },
    { id: 232063, name: 'Apex Lynx', classification: 1, spells: [
      { id: 1216985, name: 'Puncturing Bite', schools: 1 },
      { id: 1217010, name: 'Ferocious Pounce', schools: 1 },
    ] },
    { id: 232176, name: 'Flesh Behemoth', classification: 1, spells: [
      { id: 473776, name: 'Fetid Spew', schools: 8 },
      { id: 1277799, name: 'Brutal Chop', schools: 1 },
    ] },
    { id: 236894, name: 'Bloated Lasher', classification: 1, spells: [
      { id: 1216819, name: 'Fungal Bolt', schools: 8 },
      { id: 1216963, name: 'Spore Dispersal', schools: 8 },
    ] },
    { id: 232113, name: 'Spellguard Magus', classification: 1, spells: [
      { id: 1216250, name: 'Arcane Salvo', schools: 64 },
      { id: 1253683, name: "Spellguard's Protection", schools: 64 },
    ] },
    { id: 232175, name: 'Devoted Woebringer', classification: 1, spells: [
      { id: 473657, name: 'Shadow Bolt', schools: 32 },
      { id: 473668, name: 'Pulsing Shriek', schools: 32 },
    ] },
    { id: 232056, name: 'Territorial Dragonhawk', classification: 1, spells: [
      { id: 1216848, name: 'Fire Spit', schools: 4 },
      { id: 1216860, name: 'Bolstering Flames', schools: 4 },
    ] },
  ],
  // Nexus-point Xenas
  1316: [
    { id: 241539, name: 'Kasreth', classification: 3, spells: [
      { id: 1250553, name: 'Arcane Zap', schools: 64 },
      { id: 1251626, name: 'Leyline Array', schools: 64 },
      { id: 1251772, name: 'Reflux Charge', schools: 64 },
      { id: 1257509, name: 'Corespark Detonation', schools: 64 },
      { id: 1264048, name: 'Flux Collapse', schools: 1 },
    ] },
    { id: 241644, name: 'Corewright Arcanist', classification: 1, spells: [
      { id: 1250553, name: 'Arcane Zap', schools: 64 },
      { id: 1249815, name: 'Transference', schools: 64 },
      { id: 1285445, name: 'Arcane Explosion', schools: 64 },
    ] },
    { id: 241642, name: 'Lingering Image', classification: 1 },
    { id: 248502, name: 'Null Sentinel', classification: 1, spells: [
      { id: 1252414, name: 'Nullwark Blast', schools: 1 },
      { id: 1252406, name: 'Dreadbellow', schools: 32 },
    ] },
    { id: 254932, name: 'Radiant Swarm', classification: 1 },
    { id: 241647, name: 'Flux Engineer', classification: 1 },
    { id: 241660, name: 'Duskfright Herald', classification: 1, spells: [
      { id: 1252062, name: 'Entropic Leech', schools: 32 },
      { id: 1252076, name: 'Dark Beckoning', schools: 1 },
    ] },
    { id: 241645, name: 'Hollowsoul Scrounger', classification: 1, spells: [
      { id: 1227020, name: 'Dimensional Shred', schools: 32 },
      { id: 1252204, name: 'Leech Veil', schools: 1 },
    ] },
    { id: 248706, name: 'Cursed Voidcaller', classification: 1, spells: [
      { id: 1281636, name: 'Creeping Void', schools: 32 },
    ] },
    { id: 254926, name: 'Lightwrought', classification: 1 },
    { id: 248373, name: 'Circuit Seer', classification: 1 },
    { id: 248708, name: 'Nexus Adept', classification: 1 },
    { id: 252825, name: 'Mana Battery', classification: 1, spells: [
      { id: 1257126, name: 'Corespark Overload', schools: 64 },
    ] },
    { id: 248769, name: 'Smudge', classification: 1, spells: [
      { id: 1257268, name: 'Forfeit Essence', schools: 1 },
    ] },
  ],
  // Pit of Saron
  278: [
    { id: 36476, name: 'Ick', classification: 1, additionalSpells: [
      { id: 1264453, name: 'Lumbering Fixation', schools: 1 },
    ] },
  ],
  // Magister's Terrace
  1300: [
    { id: 231861, name: 'Arcanotron Custos', classification: 3 },
    { id: 232369, name: 'Arcane Magister', classification: 1, spells: [
      { id: 468962, name: 'Arcane Bolt', schools: 64 },
      { id: 468966, name: 'Polymorph', schools: 64 },
      { id: 1245046, name: 'Blink', schools: 1 },
    ] },
    { id: 234089, name: 'Animated Codex', classification: 1, spells: [
      { id: 1244985, name: 'Arcane Volley', schools: 64 },
    ] },
  ],
  // Algeth'ar Academy
  1201: [
    { id: 196798, name: 'Corrupted Manafiend', classification: 1, spells: [
      { id: 388863, name: 'Mana Void', schools: 64 },
      { id: 388862, name: 'Surge', schools: 64 },
    ] },
    { id: 197904, name: 'Spellbound Battleaxe', classification: 1 },
  ],
  // Maisara Caverns
  1315: [
    { id: 249002, name: 'Warding Mask', classification: 1, spells: [
      { id: 1257328, name: 'Sear', schools: 4 },
    ] },
    { id: 248678, name: 'Hulking Juggernaut', classification: 1, spells: [
      { id: 1256047, name: 'Deafening Roar', schools: 1 },
      { id: 1256059, name: 'Rending Gore', schools: 1 },
    ] },
    { id: 253701, name: "Death's Grasp", classification: 1, spells: [
      { id: 1259794, name: 'Ritual Sacrifice', schools: 32 },
    ] },
    // Override existing Rokh'zal (254233) to add Invoke Shadow from second Rokh'zal NPC (253683)
    { id: 254233, name: "Rokh'zal", classification: 1, spells: [
      { id: 1259777, name: 'Umbral Vortex', schools: 32 },
      { id: 1262241, name: 'Invoke Shadow', schools: 32 },
    ] },
  ],
};

// Mirrors BLACKLISTED_SPELL_IDS in scripts/fetch-data.ts
// Generic/irrelevant spell IDs excluded from all zone spell results
export const BLACKLISTED_SPELL_IDS: number[] = [209859, 228318, 240443, 288865, 344663];

// Mirrors INSTANCE_BLACKLISTED_SPELL_IDS in scripts/fetch-data.ts — keyed by instance ID
// Per-instance spell IDs excluded in addition to the global list
export const INSTANCE_BLACKLISTED_SPELL_IDS: Record<number, number[]> = {};

// Mirrors IGNORED_NPC_NAMES in scripts/fetch-data.ts
// NPCs that appear in zone data but aren't actual dungeon mobs
export const IGNORED_NPC_NAMES: string[] = [
  'Dreadstalker', 'Wild Imp', "Xal'atath", 'Spiteful Shade',
];

// Mirrors INSTANCE_IGNORED_NPC_NAMES in scripts/fetch-data.ts — keyed by instance ID
// Per-instance NPC names ignored in addition to the global list
export const INSTANCE_IGNORED_NPC_NAMES: Record<number, string[]> = {
  // Algeth'ar Academy: Mage Tower NPCs and NPC not in current dungeon mob list
  1201: ['Raest Magespear', 'Hand from Beyond', 'Ethereal Restorer'],
  // Pit of Saron: friendly/RP NPCs and original WotLK mobs replaced by M+ reworks
  278: [
    'Sindragosa', 'Coliseum Champion',
    'Alliance Slave', 'Horde Slave', 'Freed Alliance Slave', 'Freed Horde Slave',
    'Archmage Koreln', 'Archmage Elandra', 'Dark Ranger Kalira', 'Dark Ranger Loralen',
    'Ymirjar Skycaller', 'Ymirjar Wrathbringer', 'Ymirjar Deathbringer', 'Ymirjar Flamebearer',
    'Fallen Warrior', 'Wrathbone Laborer', 'Wrathbone Coldwraith', 'Disturbed Glacial Revenant',
    'Plagueborn Horror', 'Geist Ambusher', 'Stonespine Gargoyle',
    'Hungering Ghoul', 'Deathwhisper Shadowcaster', 'Deathwhisper Torturer', 'Wrathbone Sorcerer',
  ],
};
