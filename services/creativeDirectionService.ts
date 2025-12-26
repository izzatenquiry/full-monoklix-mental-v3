import { type Language } from '../types';

export const styleOptions = [
  "3D Animation",
  "Anime",
  "Cinematic",
  "Claymation",
  "Line Art",
  "Photorealistic",
  "Pixel Art",
  "Random",
  "Realism",
  "Vintage",
  "Watercolor"
];

export const lightingOptions = [
  "Backlight",
  "Dramatic Lighting",
  "Golden Hour",
  "Hard Light",
  "Mixed Light",
  "Natural Light",
  "Neon Light",
  "None",
  "Random",
  "Side Light",
  "Soft Daylight",
  "Studio Light",
  "Warm Lamp Light",
  "Window Backlight"
];

export const cameraOptions = [
  "Close-up",
  "Detail / Macro",
  "Dutch Angle",
  "Flatlay",
  "Full Body",
  "High Angle",
  "Long Shot",
  "Low Angle",
  "Medium Close-up",
  "Medium Shot",
  "Medium / Half Body",
  "None",
  "Overhead Shot",
  "Random",
  "Three-Quarter",
  "Wide Shot"
];

export const compositionOptions = [
  "Asymmetrical",
  "Balanced Composition",
  "Color Contrast",
  "Depth / Layering",
  "Diagonal Composition",
  "Dynamic Tension",
  "Fill the Frame",
  "Foreground Interest",
  "Frame Within a Frame",
  "Golden Cross Composition",
  "Golden Ratio",
  "Golden Spiral",
  "Golden Triangle",
  "Leading Eye",
  "Leading Lines",
  "Minimalist Composition",
  "Monochromatic Composition",
  "Motion Blur",
  "Negative Space",
  "Random",
  "Reflection Composition",
  "Repetition / Pattern",
  "Rule of Odds",
  "Rule of Space",
  "Rule of Thirds",
  "Symmetry",
  "Texture Emphasis",
  "Triangular Composition",
  "Unbalanced Composition",
  "Unbalanced Minimalism",
  "Wide Environmental Composition"
];

export const lensTypeOptions = [
  "50mm Lens",
  "85mm Lens",
  "Fisheye Lens",
  "Macro Lens",
  "Random",
  "Telephoto Lens",
  "Wide-Angle Lens"
];

export const filmSimOptions = [
  "Cinematic Kodachrome",
  "Fujifilm Velvia",
  "Ilford HP5 (B&W)",
  "Kodak Portra 400",
  "Random",
  "Vintage Polaroid"
];

export const effectOptions = [
  "Bokeh Light",
  "Color Smoke",
  "Confetti",
  "Dust Particles",
  "Fire",
  "Fireworks",
  "Floating in Water",
  "Fog / Mist",
  "Glitter",
  "Golden Sparkles",
  "Lens Flare",
  "Light Streaks",
  "Magic Dust",
  "None",
  "Powder Explosion",
  "Random",
  "Rain Drops",
  "Rainbow Light",
  "Snowfall",
  "Sparkler Trail",
  "Sun Rays",
  "Thunder Lightning",
  "Underwater Bubbles",
  "Water Splash",
  "Wind Motion Blur"
];

export const vibeOptions = [
  "Random",
  "City – Clean Urban",
  "City – Night",
  "City – Parisian Street",
  "City – Tokyo Street",
  "City – Urban & Industrial",
  "Dining – Aesthetic Cafe",
  "Dining – Aesthetic Coffee Shop",
  "Dining – Professional Kitchen",
  "Dining – Speakeasy Bar",
  "Entertainment – Classic Dance Studio",
  "Entertainment – Modern Dance Studio",
  "Entertainment – Rock Concert Stage",
  "Fantasy – Cyberpunk City",
  "Fantasy – Enchanted Forest",
  "Fantasy – Fantasy Throne Room",
  "Fantasy – Futuristic Lab",
  "Fantasy – Outer Space / Sci-Fi",
  "Fantasy – Palace Interior",
  "Gallery – Ancient Library",
  "Gallery – Classic Library",
  "Gallery – Modern Art Gallery",
  "Home – Bathroom / Vanity",
  "Home – Bedroom",
  "Home – Dining Room",
  "Home – Entryway / Laundry",
  "Home – Kitchen",
  "Home – Living Room",
  "Home – Study / Workspace",
  "Hotel – Balinese Villa",
  "Hotel – Luxury Apartment",
  "Hotel – Luxury Hotel Lobby",
  "Hotel – Mediterranean Villa Terrace",
  "Hotel – Scandinavian Interior",
  "Hotel – Snowy Mountain Cabin",
  "Local – Aesthetic Kopitiam",
  "Local – Bamboo House (Kampung Style)",
  "Local – Cameron Highlands Tea Farm",
  "Local – Dataran Merdeka",
  "Local – Heritage Street Melaka",
  "Local – Kampung House",
  "Local – Langkawi Beach",
  "Local – Mamak Stall (Night Vibe)",
  "Local – Pasar Malam",
  "Local – Penang Street Art",
  "Local – Petronas Twin Towers View",
  "Local – Putrajaya Bridge",
  "Local – Rainforest Resort",
  "Local – Rice Field (Sawah Padi)",
  "Local – Street Kopitiam",
  "Local – Subang Airport Hangar",
  "Outdoor – Autumn Park",
  "Outdoor – Beach Party Night",
  "Outdoor – Botanical Greenhouse",
  "Outdoor – Flower Garden",
  "Outdoor – Hot Spring",
  "Outdoor – Ice Rink",
  "Outdoor – Mountain View Deck",
  "Outdoor – Rainforest Trail",
  "Outdoor – Rooftop Bar",
  "Outdoor – Sunset Rooftop",
  "Outdoor – Terraced Rice Paddy",
  "Outdoor – Tropical Beach",
  "Outdoor – Zen Garden",
  "Sports – Basketball Court",
  "Sports – Sports Car Garage",
  "Studio – Clean Pastel",
  "Studio – Color Block",
  "Studio – Gradient Background",
  "Studio – High-Key White",
  "Studio – Light & Shadow",
  "Studio – Low-Key Moody",
  "Studio – Marble Tabletop",
  "Studio – Paper Roll Backdrop",
  "Studio – Premium Texture",
  "Studio – Shadow Play / Hard Light",
  "Studio – Smooth Cream",
  "Studio – Soft Daylight",
  "Studio – Tabletop / Surface",
  "Travel – Cruise Deck",
  "Travel – Yacht Deck",
  "Vintage – Old Building",
  "Vintage – Vintage Train Station",
  "Workspace – Creative Studio",
  "Workspace – Industrial Loft",
  "Workspace – Minimalist Studio",
  "Workspace – Modern Art Gallery",
  "Workspace – Modern Workspace"
];

export const poseOptions = [
  "Casual Standing",
  "Half-Body Turn",
  "Leaning on Wall",
  "Looking at Camera",
  "Looking Away",
  "Professional Model Pose",
  "Random",
  "Sitting on Edge of Chair",
  "Slow Walking"
];

// A type for the state
export interface CreativeDirectionState {
  vibe: string;
  style: string;
  lighting: string;
  camera: string;
  composition: string;
  lensType: string;
  filmSim: string;
  effect: string;
  pose: string;
  creativityLevel: number;
  // FIX: Add aspectRatio to the creative direction state.
  aspectRatio: '1:1' | '9:16' | '16:9';
}

// A function to get the initial state
export const getInitialCreativeDirectionState = (): CreativeDirectionState => ({
  vibe: 'Random',
  style: 'Random',
  lighting: 'Random',
  camera: 'Random',
  composition: 'Random',
  lensType: 'Random',
  filmSim: 'Random',
  effect: 'None',
  pose: 'Random',
  creativityLevel: 5,
  // FIX: Add aspectRatio to the initial state.
  aspectRatio: '9:16',
});