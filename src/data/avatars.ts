import { AvatarOption } from '../types/game';

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'leo',
    name: 'Leo "Thunderfoot" Vance',
    callsign: 'Apex Tracker',
    quote: '"I can hear a T-Rex footprint from 2 miles away!"',
    age: 13,
    specialty: 'Speed Tracker & Grapple Lasso',
    primaryColor: '#f97316', // Bright Orange
    secondaryColor: '#ea580c',
    gear: 'Electro-Lasso & High-Traction Boots',
    badge: '🦁 Thunder Badge',
    hairStyle: 'spiky',
    skinTone: '#fcd34d'
  },
  {
    id: 'maya',
    name: 'Maya "Raptor-Eye" Chen',
    callsign: 'Cyber Paleontologist',
    quote: '"Their agility is 10x faster, but my tech is 100x smarter!"',
    age: 12,
    specialty: 'Dino-Scan HUD & Sonic Snare',
    primaryColor: '#06b6d4', // Cyan
    secondaryColor: '#0891b2',
    gear: 'Holo-Visor & Pulse Net Launcher',
    badge: '🦅 Falcon Crest',
    hairStyle: 'ponytail',
    skinTone: '#fed7aa'
  },
  {
    id: 'jax',
    name: 'Jax "Volcano" Stone',
    callsign: 'Daredevil Climber',
    quote: '"If it roars, I run towards it, not away!"',
    age: 14,
    specialty: 'High-Impact Tether & Stun Net',
    primaryColor: '#ef4444', // Crimson Red
    secondaryColor: '#b91c1c',
    gear: 'Magma-Proof Armor & Power Winch',
    badge: '🌋 Magma Shield',
    hairStyle: 'messy',
    skinTone: '#e2e8f0'
  },
  {
    id: 'zara',
    name: 'Zara "Echo" Brooks',
    callsign: 'Dino Whisperer',
    quote: '"Every roar has a rhythm. Listen and you can tame them all."',
    age: 13,
    specialty: 'Bio-Acoustic Lure & Stealth Net',
    primaryColor: '#10b981', // Emerald
    secondaryColor: '#059669',
    gear: 'Sound-Mimic Flute & Camo Poncho',
    badge: '🌿 Fern Master',
    hairStyle: 'braids',
    skinTone: '#b45309'
  },
  {
    id: 'kai',
    name: 'Kai "Mach-1" Tanaka',
    callsign: 'Sky Scout',
    quote: '"Catch me if you can, Pterodactyls!"',
    age: 11,
    specialty: 'Acrobatic Dash & Dual Bolas',
    primaryColor: '#eab308', // Solar Yellow
    secondaryColor: '#ca8a04',
    gear: 'Jet-Glider Harness & Solar Tracker',
    badge: '⚡ Lightning Star',
    hairStyle: 'cap',
    skinTone: '#ffedd5'
  },
  {
    id: 'nyx',
    name: 'Nyx "Shadow-Claw" Rivera',
    callsign: 'Night Stalker',
    quote: '"The shadows in the jungle are my best hiding spots."',
    age: 14,
    specialty: 'Stun Bolas & Radar Berries',
    primaryColor: '#8b5cf6', // Violet
    secondaryColor: '#6d28d9',
    gear: 'Prism Cloak & Tactical Goggles',
    badge: '🌙 Eclipse Sigil',
    hairStyle: 'visor',
    skinTone: '#fbcfe8'
  }
];

export const PLAYER_SLOT_COLORS: Record<number, { primary: string; glow: string; name: string }> = {
  1: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', name: 'Player 1 (Orange)' },
  2: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', name: 'Player 2 (Cyan)' },
  3: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', name: 'Player 3 (Emerald)' },
  4: { primary: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)', name: 'Player 4 (Pink)' }
};
